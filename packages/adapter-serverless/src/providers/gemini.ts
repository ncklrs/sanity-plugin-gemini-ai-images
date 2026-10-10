import {GoogleGenAI, type GenerateContentResponse, type ImageConfig} from '@google/genai'
import type {GeneratedImage, ImageGenerationRequest, ImageProvider} from './types.js'

// Models without imageSize support reject the field, so only send it where it is accepted
const MODELS_WITHOUT_IMAGE_SIZE = new Set(['gemini-2.5-flash-image'])

export interface GeminiProviderOptions {
  /** Gemini API key. Defaults to `process.env.GEMINI_API_KEY` */
  apiKey?: string
  /** Use an existing client instead of creating one */
  client?: GoogleGenAI
}

export function createGeminiProvider(options: GeminiProviderOptions = {}): ImageProvider {
  let client = options.client

  const getClient = () => {
    if (client) return client
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new MissingApiKeyError('Gemini API not configured: set GEMINI_API_KEY')
    }
    client = new GoogleGenAI({apiKey})
    return client
  }

  return {
    name: 'gemini',
    async generate(request) {
      const response = await getClient().models.generateContent({
        model: request.model,
        contents: [{parts: buildParts(request)}],
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: buildImageConfig(request),
        },
      })
      return extractImage(response)
    },
  }
}

export class MissingApiKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MissingApiKeyError'
  }
}

function buildParts(request: ImageGenerationRequest) {
  if (!request.baseImage) {
    return [{text: request.prompt}]
  }
  return [
    {
      inlineData: {
        mimeType: request.baseImageMimeType || 'image/png',
        data: request.baseImage,
      },
    },
    {text: request.prompt},
  ]
}

function buildImageConfig(request: ImageGenerationRequest): ImageConfig {
  const imageConfig: ImageConfig = {}
  if (request.aspectRatio) {
    imageConfig.aspectRatio = request.aspectRatio
  }
  if (request.imageSize && !MODELS_WITHOUT_IMAGE_SIZE.has(request.model)) {
    imageConfig.imageSize = request.imageSize
  }
  return imageConfig
}

function extractImage(response: GenerateContentResponse): GeneratedImage {
  const parts = response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      }
    }
  }

  const blockReason = response.promptFeedback?.blockReason
  if (blockReason) {
    throw new Error(`Prompt was blocked: ${blockReason}`)
  }
  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`No image generated (finish reason: ${finishReason})`)
  }
  throw new Error('No image generated in response')
}
