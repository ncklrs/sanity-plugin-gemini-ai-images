export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'

export interface ImageConfig {
  aspectRatio?: AspectRatio
}

export interface ImageResult {
  imageData: string // Base64 encoded
  mimeType: string
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
   * Maximum number of images in a series
   * @default 10
   */
  maxSeriesQuantity?: number
  /**
   * Default consistency level for series generation
   * @default 'moderate'
   */
  defaultConsistencyLevel?: ConsistencyLevel
}
