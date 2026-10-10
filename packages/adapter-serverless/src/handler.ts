import {ASPECT_RATIOS, DEFAULT_GEMINI_IMAGE_MODEL, GEMINI_IMAGE_MODELS, IMAGE_SIZES, parseList} from './models.js'
import {createGeminiProvider, MissingApiKeyError} from './providers/gemini.js'
import type {GeneratedImage, ImageProvider} from './providers/types.js'

const MAX_PROMPT_LENGTH = 10_000
// ~15MB of decoded image data
const MAX_BASE_IMAGE_LENGTH = 20_000_000
const MAX_SERIES_QUANTITY = 10

export interface ImageHandlerOptions {
  /** Image backend. Defaults to the Gemini provider using `GEMINI_API_KEY` */
  provider?: ImageProvider
  /**
   * Models clients may request. Defaults to `GEMINI_ALLOWED_MODELS` (comma separated)
   * or the built-in Gemini image model list.
   */
  allowedModels?: string[]
  /** Model used when the request does not name one. Defaults to `GEMINI_IMAGE_MODEL` */
  defaultModel?: string
  /**
   * Shared secret clients must send as `X-API-Key`.
   * Defaults to `GEMINI_PLUGIN_API_KEY`. When unset, no key is required.
   */
  apiKey?: string
  /**
   * Value for `Access-Control-Allow-Origin`. Defaults to `GEMINI_CORS_ORIGIN` or `*`.
   * Pass a list to echo back the request origin when it matches.
   */
  corsOrigin?: string | string[]
  /**
   * How many series images to generate at once. Sequential (1) keeps results
   * more consistent and avoids rate limits; raise it to fit tight function timeouts.
   * @default 1
   */
  seriesConcurrency?: number
}

interface RequestBody {
  prompt?: unknown
  model?: unknown
  aspectRatio?: unknown
  imageSize?: unknown
  mode?: unknown
  baseImage?: unknown
  baseImageMimeType?: unknown
  series?: {
    quantity?: unknown
    consistencyPrompt?: unknown
    variations?: unknown
  }
}

interface SeriesImage extends GeneratedImage {
  variation: string
  index: number
}

interface SeriesError {
  index: number
  variation: string
  error: string
}

class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/**
 * Create a Web standard `Request => Response` handler for image generation.
 *
 * Works with Next.js route handlers, Vercel, Netlify, and any runtime with the
 * Fetch API.
 */
export function createImageHandler(options: ImageHandlerOptions = {}) {
  const provider = options.provider ?? createGeminiProvider()

  return async function handleImageRequest(request: Request): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, options.corsOrigin ?? parseList(process.env.GEMINI_CORS_ORIGIN))
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
      })

    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: corsHeaders})
    }
    if (request.method !== 'POST') {
      return json({error: 'Method not allowed'}, 405)
    }

    const expectedKey = options.apiKey ?? process.env.GEMINI_PLUGIN_API_KEY
    if (expectedKey && !safeEqual(request.headers.get('x-api-key') ?? '', expectedKey)) {
      return json({error: 'Invalid or missing API key'}, 401)
    }

    try {
      let body: RequestBody
      try {
        body = (await request.json()) as RequestBody
      } catch {
        throw new RequestError('Request body must be valid JSON')
      }

      const allowedModels =
        options.allowedModels ?? parseList(process.env.GEMINI_ALLOWED_MODELS) ?? [...GEMINI_IMAGE_MODELS]
      const defaultModel = options.defaultModel ?? process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_GEMINI_IMAGE_MODEL
      const input = parseInput(body, allowedModels, defaultModel)

      if (!body.series) {
        const image = await provider.generate(input)
        return json({...image, model: input.model})
      }

      const {quantity, consistencyPrompt, variations} = parseSeries(body.series)
      const concurrency = Math.max(1, Math.floor(options.seriesConcurrency ?? 1))
      const {images, errors} = await generateSeries(
        variations.slice(0, quantity),
        concurrency,
        (variation) =>
          provider.generate({
            ...input,
            prompt: buildSeriesPrompt(input.prompt, consistencyPrompt, variation, Boolean(input.baseImage)),
          }),
      )

      if (images.length === 0) {
        return json({error: 'All image generations failed', details: errors}, 500)
      }

      const metadata = {
        basePrompt: input.prompt,
        stylePrompt: consistencyPrompt,
        model: input.model,
        generatedAt: new Date().toISOString(),
        quantity,
        successful: images.length,
        failed: errors.length,
      }

      if (errors.length > 0) {
        return json({images, metadata, errors, warning: 'Some image generations failed'}, 207)
      }
      return json({images, metadata})
    } catch (error) {
      if (error instanceof RequestError) {
        return json({error: error.message}, error.status)
      }
      if (error instanceof MissingApiKeyError) {
        console.error(error.message)
        return json({error: error.message}, 500)
      }
      console.error('Image generation failed:', error)
      return json({error: error instanceof Error ? error.message : 'Image generation failed'}, 500)
    }
  }
}

function parseInput(body: RequestBody, allowedModels: string[], defaultModel: string) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    throw new RequestError('Prompt is required')
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new RequestError(`Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer`)
  }

  const model = optionalString(body.model, 'model') ?? defaultModel
  if (!allowedModels.includes(model)) {
    throw new RequestError(`Model "${model}" is not allowed. Allowed models: ${allowedModels.join(', ')}`)
  }

  const aspectRatio = optionalString(body.aspectRatio, 'aspectRatio')
  if (aspectRatio && !(ASPECT_RATIOS as readonly string[]).includes(aspectRatio)) {
    throw new RequestError(`Unsupported aspect ratio "${aspectRatio}"`)
  }

  const imageSize = optionalString(body.imageSize, 'imageSize')
  if (imageSize && !(IMAGE_SIZES as readonly string[]).includes(imageSize)) {
    throw new RequestError(`Unsupported image size "${imageSize}"`)
  }

  // Older clients send `mode: 'generate'` alongside nothing else; the base image is only used for edits
  const baseImage = body.mode === 'generate' ? undefined : optionalString(body.baseImage, 'baseImage')
  if (baseImage && baseImage.length > MAX_BASE_IMAGE_LENGTH) {
    throw new RequestError('Base image is too large', 413)
  }
  const baseImageMimeType = optionalString(body.baseImageMimeType, 'baseImageMimeType')
  if (baseImageMimeType && !baseImageMimeType.startsWith('image/')) {
    throw new RequestError('baseImageMimeType must be an image type')
  }

  return {prompt, model, aspectRatio, imageSize, baseImage, baseImageMimeType}
}

function parseSeries(series: NonNullable<RequestBody['series']>) {
  const variations = Array.isArray(series.variations)
    ? series.variations.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : []
  if (variations.length === 0) {
    throw new RequestError('Variations are required for series generation')
  }

  const quantity = Number(series.quantity)
  if (!Number.isInteger(quantity) || quantity < 2 || quantity > MAX_SERIES_QUANTITY) {
    throw new RequestError(`Quantity must be a whole number between 2 and ${MAX_SERIES_QUANTITY}`)
  }

  const consistencyPrompt = typeof series.consistencyPrompt === 'string' ? series.consistencyPrompt : ''
  return {quantity, consistencyPrompt, variations}
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new RequestError(`${field} must be a string`)
  }
  return value
}

export function buildSeriesPrompt(
  prompt: string,
  consistencyPrompt: string,
  variation: string,
  hasReferenceImage: boolean,
): string {
  const parts = hasReferenceImage
    ? [
        'CREATE A SINGLE IMAGE (NOT A GRID OR COLLAGE).',
        'IMPORTANT: Use this reference image as the EXACT subject/person. Do NOT create a different person or subject.',
        'Keep the SAME person/subject/object from the reference image.',
        consistencyPrompt,
        prompt,
        `Apply this specific variation ONLY: ${variation}`,
        'Output: ONE single image showing the same subject with the specified variation applied.',
      ]
    : [
        'CREATE A SINGLE IMAGE (NOT A GRID OR COLLAGE).',
        prompt,
        consistencyPrompt,
        `Apply ONLY this variation to the subject: ${variation}`,
        'The subject itself must remain IDENTICAL. Only the specified variation aspect should change.',
        'Output: ONE single image.',
      ]
  return parts.filter(Boolean).join(' ')
}

async function generateSeries(
  variations: string[],
  concurrency: number,
  generate: (variation: string) => Promise<GeneratedImage>,
) {
  const results: Array<SeriesImage | SeriesError> = new Array(variations.length)
  let next = 0

  const worker = async () => {
    while (next < variations.length) {
      const index = next++
      const variation = variations[index]
      try {
        results[index] = {...(await generate(variation)), variation, index}
      } catch (error) {
        results[index] = {index, variation, error: error instanceof Error ? error.message : 'Generation failed'}
      }
    }
  }

  await Promise.all(Array.from({length: Math.min(concurrency, variations.length)}, worker))

  const images: SeriesImage[] = []
  const errors: SeriesError[] = []
  for (const result of results) {
    if ('error' in result) errors.push(result)
    else images.push(result)
  }
  return {images, errors}
}

function buildCorsHeaders(request: Request, corsOrigin: string | string[] | undefined): Record<string, string> {
  let allowOrigin = '*'
  if (typeof corsOrigin === 'string') {
    allowOrigin = corsOrigin
  } else if (Array.isArray(corsOrigin) && corsOrigin.length > 0) {
    const origin = request.headers.get('origin')
    allowOrigin = origin && corsOrigin.includes(origin) ? origin : corsOrigin[0]
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  }
  if (allowOrigin !== '*') {
    headers.Vary = 'Origin'
  }
  return headers
}

/** Constant time string comparison that works in Node, edge, and worker runtimes */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  for (let i = 0; i < right.length; i++) {
    diff |= (left[i] ?? 0) ^ right[i]
  }
  return diff === 0
}
