export interface ImageGenerationRequest {
  prompt: string
  model: string
  aspectRatio?: string
  imageSize?: string
  /** Base64 image data (no data URL prefix) to edit or use as a reference */
  baseImage?: string
  baseImageMimeType?: string
}

export interface GeneratedImage {
  imageData: string
  mimeType: string
}

/**
 * An image generation backend.
 *
 * Gemini is the built-in provider. Other backends (fal, OpenAI, ...) can be
 * plugged into `createImageHandler` by implementing this interface.
 */
export interface ImageProvider {
  /** Identifier used in logs and responses, for example `gemini` */
  name: string
  generate(request: ImageGenerationRequest): Promise<GeneratedImage>
}
