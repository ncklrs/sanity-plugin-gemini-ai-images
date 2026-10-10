export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'

export type ImageSize = '1K' | '2K' | '4K'

export interface ImageModelOption {
  /** Model ID sent to the API endpoint, for example `gemini-3-pro-image` */
  id: string
  /** Label shown in the model picker */
  title: string
  description?: string
  /** Output sizes the model supports. Omit when the model has a fixed size. */
  imageSizes?: ImageSize[]
}

export interface ImageConfig {
  aspectRatio?: AspectRatio
  /** Model ID. When omitted the server default is used. */
  model?: string
  imageSize?: ImageSize
}

export interface ImageResult {
  imageData: string // Base64 encoded
  mimeType: string
  /** Model that produced the image, when reported by the server */
  model?: string
}

export interface GenerationMetadata {
  prompt?: string
  model?: string
  generationParams?: Record<string, any>
}

export interface SanityImageAsset {
  _id: string
  _type: 'sanity.imageAsset'
  url: string
  metadata?: {
    dimensions?: {
      width: number
      height: number
    }
  }
}

export interface PromptTemplate {
  name: string
  description: string
  prompt: string | ((input: string, context?: string) => string)
  aspectRatio?: AspectRatio
  category: 'product' | 'lifestyle' | 'hero' | 'background' | 'marketing' | 'effects' | 'cleanup' | 'creative'
}

export type GenerationMode = 'generate' | 'edit'

export interface ImageInputValue {
  _type: 'image'
  asset?: {
    _type: 'reference'
    _ref: string
  }
}

export type VariationType = 'angle' | 'context' | 'background' | 'lighting' | 'custom'
export type ConsistencyLevel = 'strict' | 'moderate' | 'loose'

export interface SeriesGenerationConfig extends ImageConfig {
  quantity: number // 2-10 images
  variationType: VariationType
  consistencyLevel: ConsistencyLevel
  baseStylePrompt?: string // Shared style descriptors
  variations?: string[] // Per-image variation prompts
  baseImage?: File | Blob // Reference image for consistency
}

export interface SeriesImageResult extends ImageResult {
  variation: string // The variation prompt used
  index: number // Position in series
}

export interface SeriesGenerationResult {
  images: SeriesImageResult[]
  metadata: {
    basePrompt: string
    stylePrompt: string
    generatedAt: string
    quantity: number
    variationType: VariationType
    consistencyLevel: ConsistencyLevel
    model?: string
  }
}

export interface GenerationSession {
  id: string
  timestamp: string
  results: SeriesGenerationResult[]
  savedImages: string[] // Asset IDs
}

export interface GeminiPluginConfig {
  /**
   * API endpoint for image generation
   * @default '/api/gemini/generate-image'
   */
  apiEndpoint?: string
  /**
   * Optional API key for authenticating requests
   * If provided, will be sent as X-API-Key header with each request
   * @default undefined
   */
  apiKey?: string
  /**
   * Enable standalone image generation tool
   * @default false
   */
  enableStandaloneTool?: boolean
  /**
   * Models shown in the model picker. Accepts model IDs or full options.
   * The picker is hidden when only one model is configured.
   * Make sure your server allows the same models (`GEMINI_ALLOWED_MODELS`).
   * @default all built-in Gemini image models
   */
  models?: Array<string | ImageModelOption>
  /**
   * Model selected when the generator opens
   * @default 'gemini-nano-banana-2.1'
   */
  defaultModel?: string
  /**
   * Maximum number of images in a series (2-10)
   * @default 10
   */
  maxSeriesQuantity?: number
  /**
   * Default consistency level for series generation
   * @default 'moderate'
   */
  defaultConsistencyLevel?: ConsistencyLevel
}

/** Generator settings resolved from the plugin config and passed to UI components */
export interface GeneratorSettings {
  apiEndpoint?: string
  apiKey?: string
  models?: ImageModelOption[]
  defaultModel?: string
  maxSeriesQuantity?: number
  defaultConsistencyLevel?: ConsistencyLevel
}
