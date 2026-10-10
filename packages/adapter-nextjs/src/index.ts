/**
 * Next.js Adapter for Sanity Gemini AI Image Generator
 *
 * Quick Start:
 *
 * 1. Install both packages:
 *    npm install sanity-plugin-gemini-ai-images sanity-plugin-gemini-ai-images-nextjs
 *
 * 2. Add to sanity.config.ts:
 *    import {geminiAIImages} from 'sanity-plugin-gemini-ai-images'
 *
 *    export default defineConfig({
 *      plugins: [geminiAIImages()]
 *    })
 *
 * 3. Create app/api/gemini/generate-image/route.ts:
 *    export {POST, OPTIONS} from 'sanity-plugin-gemini-ai-images-nextjs/route'
 *
 * 4. Set environment variable:
 *    GEMINI_API_KEY=your_api_key_here
 *
 * For custom models, providers, or CORS settings, build your own handler:
 *    import {createImageHandler} from 'sanity-plugin-gemini-ai-images-nextjs'
 *    const handler = createImageHandler({allowedModels: ['gemini-3-pro-image']})
 *    export const POST = handler
 *    export const OPTIONS = handler
 */

export {POST, OPTIONS} from './route.js'
export {
  createImageHandler,
  createGeminiProvider,
  GEMINI_IMAGE_MODELS,
  DEFAULT_GEMINI_IMAGE_MODEL,
  type ImageHandlerOptions,
  type ImageProvider,
  type ImageGenerationRequest,
  type GeneratedImage,
} from 'sanity-plugin-gemini-ai-images-serverless'
