import {
  normalizeImageRequest,
  modelCatalog,
  RequestError,
  type ImageRequest,
  type ImageOutput,
} from 'sanity-plugin-gemini-ai-images-contracts'
import type {EngineOptions, Principal} from './types.js'
import {ProviderError} from './providers.js'

export async function prepareRequest(
  request: ImageRequest,
  options: EngineOptions,
  principal: Principal,
): Promise<ImageRequest> {
  const references = await Promise.all(
    request.references.map((r) =>
      r.assetId
        ? options.resolveReference
          ? options.resolveReference(r, principal)
          : Promise.reject(
              new RequestError(
                'Asset references require a configured resolver',
              ),
            )
        : r,
    ),
  )
  const preset = request.brandPresetId
    ? options.resolvePreset
      ? await options.resolvePreset(request.brandPresetId, principal)
      : (() => {
          throw new RequestError('Brand presets require a configured resolver')
        })()
    : ''
  const prompt = [options.instructions, preset, request.prompt]
    .filter(Boolean)
    .join('\n')
  normalizeImageRequest(
    {
      ...request,
      prompt,
      references: references.map(({assetId: _assetId, ...r}) => r),
    },
    options.policy,
  )
  return {
    ...request,
    references,
    prompt,
  }
}
export async function generateOne(
  request: ImageRequest,
  options: EngineOptions,
  signal?: AbortSignal,
): Promise<ImageOutput> {
  if (request.prompt.length > 10000)
    throw new RequestError('Combined prompt exceeds the 10000 character limit')
  const providerName = modelCatalog.find(
    (m) => m.id === request.model,
  )!.provider
  const provider = options.providers[providerName]
  if (!provider)
    throw new RequestError(
      'Selected provider is not configured',
      503,
      'provider_unavailable',
    )
  let retry = 0
  for (;;) {
    signal?.throwIfAborted()
    try {
      const output = await provider.generate(request, signal)
      return {...output, estimatedCostUsd: options.prices?.[request.model]}
    } catch (error) {
      if (
        !(error instanceof ProviderError) ||
        !error.retryable ||
        retry >= Math.min(2, options.maxRetries ?? 1)
      )
        throw error
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer)
          reject(signal?.reason ?? new Error('Cancelled'))
        }
        const timer = setTimeout(
          () => {
            signal?.removeEventListener('abort', abort)
            resolve()
          },
          Math.min(5000, 250 * 2 ** retry++),
        )
        signal?.addEventListener('abort', abort, {once: true})
      })
    }
  }
}
export async function generateImages(
  request: ImageRequest,
  options: EngineOptions,
  signal?: AbortSignal,
) {
  if (!request.series) return generateOne(request, options, signal)
  if (request.series.anchor)
    throw new RequestError(
      'Generated anchors require the durable jobs endpoint',
    )
  const {quantity, variations, consistencyPrompt} = request.series
  const images: Array<ImageOutput & {variation: string; index: number}> = []
  const errors: Array<{
    index: number
    variation: string
    error: string
    code: string
  }> = []
  let next = 0
  const workers = Array.from(
    {
      length: Math.min(
        quantity,
        Math.max(1, Math.min(4, options.concurrency ?? 2)),
      ),
    },
    async () => {
      for (;;) {
        const index = next++
        if (index >= quantity) return
        const variation = variations[index]
        try {
          const output = await generateOne(
            {
              ...request,
              series: undefined,
              prompt: [
                request.prompt,
                consistencyPrompt,
                'Create one single image.',
                `Apply only this variation: ${variation}`,
              ]
                .filter(Boolean)
                .join('\n'),
            },
            options,
            signal,
          )
          images.push({...output, variation, index})
        } catch (e) {
          errors.push({
            index,
            variation,
            error: e instanceof Error ? e.message : 'Generation failed',
            code: e instanceof ProviderError ? e.code : 'uncertain',
          })
        }
      }
    },
  )
  await Promise.all(workers)
  images.sort((a, b) => a.index - b.index)
  errors.sort((a, b) => a.index - b.index)
  if (!images.length)
    throw new ProviderError('All image generations failed', 'all_failed', 502)
  return {
    images,
    errors: errors.length ? errors : undefined,
    metadata: {
      basePrompt: request.prompt,
      stylePrompt: consistencyPrompt,
      model: request.model,
      generatedAt: new Date().toISOString(),
      quantity,
      successful: images.length,
      failed: errors.length,
    },
  }
}
