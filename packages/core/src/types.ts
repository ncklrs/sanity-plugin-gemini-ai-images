import type {
  Resolution,
  ReferenceImage,
} from 'sanity-plugin-gemini-ai-images-contracts'
import type {RequestHeaders} from './lib/request.js'
import type {GeminiImageModel} from './lib/image-models.js'
export type {GeminiImageModel} from './lib/image-models.js'

export type AspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'

export interface ImageConfig {
  resolution?: Resolution
  references?: ReferenceImage[]
  grounding?: boolean
  brandPresetId?: string
  model?: GeminiImageModel
  aspectRatio?: AspectRatio
}

export interface ImageResult {
  model?: GeminiImageModel
  usage?: Record<string, unknown>
  sources?: Array<{title: string; url: string}>
  estimatedCostUsd?: number
  providerRequestId?: string
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
  editorial?: {title: string; alt: string; caption: string}
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
  category:
    | 'product'
    | 'lifestyle'
    | 'hero'
    | 'background'
    | 'marketing'
    | 'effects'
    | 'cleanup'
    | 'creative'
}

export type GenerationMode = 'generate' | 'edit'

export interface ImageInputValue {
  _type: 'image'
  asset?: {
    _type: 'reference'
    _ref: string
  }
}

export type VariationType =
  'angle' | 'context' | 'background' | 'lighting' | 'custom'
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
  assetId?: string
  url?: string
  variation: string // The variation prompt used
  index: number // Position in series
}

export interface SeriesGenerationResult {
  errors?: Array<{index: number; variation: string; error: string}>
  images: SeriesImageResult[]
  metadata: {
    model?: GeminiImageModel
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
  /** Dynamic user/session authentication. Never return provider keys. */
  getRequestHeaders?: RequestHeaders
  jobsEndpoint?: string
  referenceEndpoint?: string
  suggestionsEndpoint?: string
  enableHistory?: boolean
  enableAssetReferences?: boolean
  enableBrandPresets?: boolean
  enableVideo?: boolean
  promptInstructions?: string
  documentContext?: Record<string, string>
  onImagesGenerated?: (assets: SanityImageAsset[]) => void
  documentId?: string
  /** Default image generation model. */
  defaultModel?: GeminiImageModel
  /** Models offered in the selector; must contain at least one supported model. */
  availableModels?: GeminiImageModel[]
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
