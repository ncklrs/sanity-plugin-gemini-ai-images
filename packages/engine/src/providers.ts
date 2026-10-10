import {GoogleGenAI} from '@google/genai'
import {
  RequestError,
  type ImageRequest,
  type ImageOutput,
} from 'sanity-plugin-gemini-ai-images-contracts'
import type {ImageProvider} from './types.js'

export class ProviderError extends Error {
  constructor(
    message: string,
    public code = 'provider_error',
    public status = 502,
    public retryable = false,
  ) {
    super(message)
  }
}
export class GeminiProvider implements ImageProvider {
  constructor(private client: GoogleGenAI) {}
  async generate(
    request: ImageRequest,
    signal?: AbortSignal,
  ): Promise<ImageOutput> {
    const parts: any[] = []
    for (const [index, ref] of request.references.entries()) {
      if (!ref.data) throw new RequestError('Unresolved reference asset')
      parts.push(
        {inlineData: {data: ref.data, mimeType: ref.mimeType}},
        {text: `Reference ${index + 1}: ${ref.role}`},
      )
    }
    parts.push({text: request.prompt})
    let response
    try {
      response = await this.client.models.generateContent({
        model: request.model,
        contents: [{parts}],
        config: {
          abortSignal: signal,
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: request.aspectRatio,
            imageSize: request.resolution,
          },
          tools: request.grounding ? [{googleSearch: {}}] : undefined,
        },
      })
    } catch (error) {
      const e = error as any
      throw new ProviderError(
        'Image provider rejected the request',
        e.status === 429
          ? 'rate_limited'
          : !e.status || e.status >= 500
            ? 'transport_uncertain'
            : 'provider_error',
        e.status ?? 502,
        e.status === 429,
      )
    }
    const candidate = response.candidates?.[0]
    if (
      response.promptFeedback?.blockReason ||
      String(candidate?.finishReason ?? '').includes('SAFETY') ||
      String(candidate?.finishReason ?? '').includes('PROHIBITED')
    )
      throw new ProviderError(
        'The provider blocked this image request',
        'safety_block',
        422,
      )
    const image = candidate?.content?.parts?.find(
      (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith('image/'),
    )?.inlineData
    if (!image?.data || !image.mimeType)
      throw new ProviderError('No image returned by provider', 'no_image', 422)
    const sources = (
      candidate?.groundingMetadata?.groundingChunks ?? []
    ).flatMap((c: any) =>
      c.web?.uri ? [{title: c.web.title ?? c.web.uri, url: c.web.uri}] : [],
    )
    return {
      imageData: image.data,
      mimeType: image.mimeType,
      model: request.model,
      usage: response.usageMetadata as Record<string, unknown> | undefined,
      sources,
      providerRequestId: response.responseId,
    }
  }
}
export class OpenAIProvider implements ImageProvider {
  constructor(
    private key: string,
    private transport: typeof fetch = fetch,
  ) {}
  async generate(
    request: ImageRequest,
    signal?: AbortSignal,
  ): Promise<ImageOutput> {
    // Keep sizes conservative and explicit; never translate an arbitrary ratio
    // to a shape the user did not select.
    const [a, b] = request.aspectRatio.split(':').map(Number)
    const edge = request.resolution === '2K' ? 2048 : 1024
    const width = a >= b ? edge : Math.round((edge * a) / b / 16) * 16
    const height = b >= a ? edge : Math.round((edge * b) / a / 16) * 16
    const prompt = request.references.length
      ? `${request.prompt}\n${request.references.map((r, i) => `Reference ${i + 1}: ${r.role}`).join('\n')}`
      : request.prompt
    let body: FormData | string
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.key}`,
    }
    if (request.references.length) {
      const form = new FormData()
      form.set('model', request.model)
      form.set('prompt', prompt)
      form.set('size', `${width}x${height}`)
      form.set('output_format', 'png')
      form.set('n', '1')
      for (const [index, r] of request.references.entries()) {
        if (!r.data) throw new RequestError('Unresolved reference asset')
        const bytes = Uint8Array.from(Buffer.from(r.data, 'base64'))
        form.append(
          'image[]',
          new Blob([bytes], {type: r.mimeType}),
          `reference-${index}.${r.mimeType === 'image/jpeg' ? 'jpg' : r.mimeType === 'image/webp' ? 'webp' : 'png'}`,
        )
      }
      body = form
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify({
        model: request.model,
        prompt,
        size: `${width}x${height}`,
        output_format: 'png',
        n: 1,
      })
    }
    const response = await this.transport(
      `https://api.openai.com/v1/images/${request.references.length ? 'edits' : 'generations'}`,
      {method: 'POST', headers, body, signal},
    )
    const output = (await response.json()) as any
    if (!response.ok)
      throw new ProviderError(
        'Image provider rejected the request',
        output.error?.code ?? 'provider_error',
        response.status,
        response.status === 429,
      )
    if (!output.data?.[0]?.b64_json)
      throw new ProviderError('No image returned by provider', 'no_image', 422)
    return {
      imageData: output.data[0].b64_json,
      mimeType: 'image/png',
      model: request.model,
      usage: output.usage,
      providerRequestId: response.headers.get('x-request-id') ?? undefined,
    }
  }
}
export function createProviders(options: {
  geminiApiKey?: string
  openaiApiKey?: string
  vertex?: {project: string; location: string}
}) {
  const providers: Partial<Record<'gemini' | 'openai', ImageProvider>> = {}
  if (options.vertex)
    providers.gemini = new GeminiProvider(
      new GoogleGenAI({
        vertexai: true,
        project: options.vertex.project,
        location: options.vertex.location,
      }),
    )
  else if (options.geminiApiKey)
    providers.gemini = new GeminiProvider(
      new GoogleGenAI({apiKey: options.geminiApiKey}),
    )
  if (options.openaiApiKey)
    providers.openai = new OpenAIProvider(options.openaiApiKey)
  return providers
}
