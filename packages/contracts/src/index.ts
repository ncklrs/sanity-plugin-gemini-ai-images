export type Resolution = '1K' | '2K' | '4K'
export type ReferenceRole = 'subject' | 'style' | 'product' | 'character'
export interface ReferenceImage {
  data?: string
  assetId?: string
  mimeType?: string
  role: ReferenceRole
}
export const modelCatalog = [
  {
    id: 'gemini-nano-banana-2.1',
    label: 'Nano Banana 2.1 — Latest efficient model',
    provider: 'gemini',
    resolutions: ['1K', '2K', '4K'],
    maxReferences: 14,
    grounding: true,
  },
  {
    id: 'gemini-3.1-flash-image',
    label: 'Gemini 3.1 Flash Image',
    provider: 'gemini',
    resolutions: ['1K', '2K', '4K'],
    maxReferences: 14,
    grounding: true,
  },
  {
    id: 'gemini-3-pro-image',
    label: 'Gemini 3 Pro Image',
    provider: 'gemini',
    resolutions: ['1K', '2K', '4K'],
    maxReferences: 14,
    grounding: true,
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: 'Gemini 3.1 Flash Lite Image',
    provider: 'gemini',
    resolutions: ['1K'],
    maxReferences: 1,
    grounding: false,
  },
  {
    id: 'gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image — Legacy',
    provider: 'gemini',
    resolutions: ['1K'],
    maxReferences: 3,
    grounding: false,
  },
  {
    id: 'gpt-image-2.5-sunburst',
    label: 'OpenAI Images — Sunburst',
    provider: 'openai',
    resolutions: ['1K', '2K'],
    maxReferences: 16,
    grounding: false,
  },
  {
    id: 'gpt-image-2.5-flare',
    label: 'OpenAI Images — Flare',
    provider: 'openai',
    resolutions: ['1K', '2K'],
    maxReferences: 16,
    grounding: false,
  },
] as const
export type ImageModel = (typeof modelCatalog)[number]['id']
export const defaultImageModel: ImageModel = 'gemini-nano-banana-2.1'
export const aspectRatios = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
] as const
export interface ImageRequest {
  prompt: string
  model: ImageModel
  aspectRatio: string
  resolution: Resolution
  mode: 'generate' | 'edit'
  references: ReferenceImage[]
  grounding: boolean
  brandPresetId?: string
  series?: {
    quantity: number
    variations: string[]
    consistencyPrompt?: string
    anchor?: boolean
  }
}
export interface ImageOutput {
  imageData: string
  mimeType: string
  model: ImageModel
  usage?: Record<string, unknown>
  sources?: Array<{title: string; url: string}>
  estimatedCostUsd?: number
  providerRequestId?: string
}
export interface AssetOutput {
  assetId: string
  url: string
  mimeType: string
  model: string
  prompt: string
  index: number
  variation: string
  usage?: Record<string, unknown>
  estimatedCostUsd?: number
  sources?: Array<{title: string; url: string}>
}
export interface RequestPolicy {
  allowedModels?: readonly string[]
  maxQuantity?: number
  maxReferences?: number
  maxReferenceBytes?: number
  allowGrounding?: boolean
}
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'invalid_request',
  ) {
    super(message)
  }
}
export function normalizeImageRequest(
  input: unknown,
  policy: RequestPolicy = {},
): ImageRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new RequestError('Request body must be an object')
  const b = input as Record<string, any>
  if (
    typeof b.prompt !== 'string' ||
    !b.prompt.trim() ||
    b.prompt.length > 10000
  )
    throw new RequestError(
      'Prompt must be a non-empty string of at most 10000 characters',
    )
  const model = b.model ?? defaultImageModel
  const capability = modelCatalog.find((c) => c.id === model)
  if (
    !capability ||
    (policy.allowedModels && !policy.allowedModels.includes(model))
  )
    throw new RequestError('Unsupported image model')
  const aspectRatio = b.aspectRatio ?? '1:1',
    resolution = b.resolution ?? '1K'
  if (!(aspectRatios as readonly unknown[]).includes(aspectRatio))
    throw new RequestError('Unsupported aspect ratio')
  if (!(capability.resolutions as readonly unknown[]).includes(resolution))
    throw new RequestError('Unsupported resolution for selected model')
  if (b.mode !== undefined && !['generate', 'edit'].includes(b.mode))
    throw new RequestError('Invalid generation mode')
  if (b.grounding !== undefined && typeof b.grounding !== 'boolean')
    throw new RequestError('Grounding must be boolean')
  if (b.grounding && (!capability.grounding || policy.allowGrounding === false))
    throw new RequestError('Grounding is not available for this model')
  if (b.references !== undefined && !Array.isArray(b.references))
    throw new RequestError('References must be an array')
  const references: ReferenceImage[] = [...(b.references ?? [])]
  if (b.baseImage !== undefined)
    references.unshift({
      data: b.baseImage,
      mimeType: b.baseImageMimeType ?? 'image/png',
      role: 'subject',
    })
  if (
    references.length >
    Math.min(capability.maxReferences, policy.maxReferences ?? 16)
  )
    throw new RequestError('Too many reference images for selected model')
  let bytes = 0
  for (const r of references) {
    if (
      !r ||
      typeof r !== 'object' ||
      !['subject', 'style', 'product', 'character'].includes(r.role)
    )
      throw new RequestError('Unsupported reference role')
    if (r.assetId !== undefined) {
      if (
        typeof r.assetId !== 'string' ||
        !/^image-[a-zA-Z0-9-]+$/.test(r.assetId) ||
        r.data !== undefined
      )
        throw new RequestError('Invalid reference asset')
      continue
    }
    if (
      typeof r.data !== 'string' ||
      !r.data ||
      r.data.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(r.data)
    )
      throw new RequestError('Reference image must be valid base64')
    if (
      ![
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/heic',
        'image/heif',
      ].includes(r.mimeType ?? '')
    )
      throw new RequestError('Unsupported reference image MIME type')
    bytes += r.data.length * 0.75
  }
  if (bytes > (policy.maxReferenceBytes ?? 15_000_000))
    throw new RequestError(
      'References exceed request size limit',
      413,
      'request_too_large',
    )
  if (b.mode === 'edit' && !references.length)
    throw new RequestError('A reference image is required for editing')
  if (
    b.brandPresetId !== undefined &&
    (typeof b.brandPresetId !== 'string' ||
      !/^[-a-zA-Z0-9._]{1,128}$/.test(b.brandPresetId))
  )
    throw new RequestError('Invalid brand preset')
  let series: ImageRequest['series']
  if (b.series !== undefined) {
    const s = b.series
    if (
      !s ||
      !Number.isInteger(s.quantity) ||
      s.quantity < 2 ||
      s.quantity > Math.min(10, policy.maxQuantity ?? 10)
    )
      throw new RequestError(
        'Quantity must be an integer between 2 and ' +
          Math.min(10, policy.maxQuantity ?? 10),
      )
    if (
      !Array.isArray(s.variations) ||
      s.variations.length < s.quantity ||
      s.variations.length > 10 ||
      s.variations.some(
        (v: unknown) => typeof v !== 'string' || !v.trim() || v.length > 2000,
      )
    )
      throw new RequestError('Provide a non-empty variation for each image')
    if (
      s.consistencyPrompt !== undefined &&
      (typeof s.consistencyPrompt !== 'string' ||
        s.consistencyPrompt.length > 10000)
    )
      throw new RequestError('Invalid consistency prompt')
    if (s.anchor !== undefined && typeof s.anchor !== 'boolean')
      throw new RequestError('Anchor must be boolean')
    if (s.anchor && references.length)
      throw new RequestError(
        'Generated anchors are only available for text-only series',
      )
    series = {
      quantity: s.quantity,
      variations: s.variations.slice(0, s.quantity),
      consistencyPrompt: s.consistencyPrompt ?? '',
      anchor: s.anchor ?? false,
    }
  }
  return {
    prompt: b.prompt.trim(),
    model,
    aspectRatio,
    resolution,
    mode: b.mode ?? 'generate',
    references,
    grounding: b.grounding ?? false,
    brandPresetId: b.brandPresetId,
    series,
  }
}
export interface BrandPreset {
  id: string
  name: string
  instructions: string
  negativeInstructions?: string
  model?: ImageModel
  aspectRatio?: string
  resolution?: Resolution
}
export interface VideoRequest {
  prompt: string
  model: string
  aspectRatio: '16:9' | '9:16'
  durationSeconds: 4 | 6 | 8
  resolution: '720p' | '1080p'
  reference?: ReferenceImage
}
export const videoModels = [
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
] as const
export function normalizeVideoRequest(input: unknown): VideoRequest {
  const b = input as any
  if (
    !b ||
    typeof b.prompt !== 'string' ||
    !b.prompt.trim() ||
    b.prompt.length > 10000 ||
    !videoModels.includes(b.model)
  )
    throw new RequestError('Invalid video prompt or model')
  if (
    !['16:9', '9:16'].includes(b.aspectRatio ?? '16:9') ||
    ![4, 6, 8].includes(b.durationSeconds ?? 8) ||
    !['720p', '1080p'].includes(b.resolution ?? '720p')
  )
    throw new RequestError('Unsupported video settings')
  if (b.resolution === '1080p' && (b.durationSeconds ?? 8) !== 8)
    throw new RequestError('1080p video requires 8 seconds')
  if (b.reference)
    normalizeImageRequest({prompt: b.prompt, references: [b.reference]})
  return {
    prompt: b.prompt.trim(),
    model: b.model,
    aspectRatio: b.aspectRatio ?? '16:9',
    durationSeconds: b.durationSeconds ?? 8,
    resolution: b.resolution ?? '720p',
    reference: b.reference,
  }
}
