import {createImageHandler} from 'sanity-plugin-gemini-ai-images-serverless'

const handler = createImageHandler()

/**
 * Next.js App Router handlers for Gemini AI image generation.
 *
 * Usage in app/api/gemini/generate-image/route.ts:
 *
 *   export {POST, OPTIONS} from 'sanity-plugin-gemini-ai-images-nextjs/route'
 *
 * CORS headers (including `X-API-Key`) are included on every response.
 */
export const POST = (request: Request): Promise<Response> => handler(request)

/** CORS preflight handler */
export const OPTIONS = (request: Request): Promise<Response> => handler(request)
