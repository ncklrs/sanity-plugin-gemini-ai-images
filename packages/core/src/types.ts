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

export interface GeminiPluginConfig {
  /**
   * API endpoint for image generation
   * @default '/api/gemini/generate-image'
   */
  apiEndpoint?: string
}
