import {createImageHandler} from './handler.js'

export {createImageHandler, buildSeriesPrompt, type ImageHandlerOptions} from './handler.js'
export {createGeminiProvider, MissingApiKeyError, type GeminiProviderOptions} from './providers/gemini.js'
export type {ImageProvider, ImageGenerationRequest, GeneratedImage} from './providers/types.js'
export {
  GEMINI_IMAGE_MODELS,
  DEFAULT_GEMINI_IMAGE_MODEL,
  IMAGE_SIZES,
  ASPECT_RATIOS,
} from './models.js'

/**
 * Ready-to-use handler for Gemini AI image generation, configured from environment variables:
 *
 * - `GEMINI_API_KEY` (required): Google Gemini API key
 * - `GEMINI_IMAGE_MODEL`: default model when the Studio does not pick one
 * - `GEMINI_ALLOWED_MODELS`: comma separated models clients may request
 * - `GEMINI_PLUGIN_API_KEY`: shared secret required in the `X-API-Key` header
 * - `GEMINI_CORS_ORIGIN`: comma separated allowed origins (default `*`)
 *
 * Works with any platform that uses Web standard Request/Response:
 *
 * Vercel (api/gemini/generate-image.ts):
 *   import {handler} from 'sanity-plugin-gemini-ai-images-serverless'
 *   export default handler
 *
 * Netlify (netlify/functions/generate-image.ts):
 *   import {handler} from 'sanity-plugin-gemini-ai-images-serverless'
 *   export default handler
 *
 * Use `createImageHandler` for custom providers, model lists, or CORS settings.
 */
export const handler = createImageHandler()

export default handler
