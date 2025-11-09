/**
 * Next.js Adapter for Sanity Gemini AI Image Generator
 *
 * This package provides a ready-to-use Next.js API route handler
 * for the Sanity Gemini AI Image Generator plugin.
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
 *    import {POST} from 'sanity-plugin-gemini-ai-images-nextjs/route'
 *    export {POST}
 *
 * 4. Set environment variable:
 *    GEMINI_API_KEY=your_api_key_here
 *
 * That's it! The AI Generator will appear in your Sanity Studio image picker.
 */

export {POST} from './route'
