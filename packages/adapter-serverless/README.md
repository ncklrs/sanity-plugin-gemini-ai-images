# sanity-plugin-gemini-ai-images-serverless

Serverless adapter for the Sanity Gemini AI Image Generator plugin.

The handler uses the Web standard `Request`/`Response` API, so it runs on Vercel Functions, Netlify Functions (v2), Next.js route handlers, and other Fetch API runtimes. It is also the shared server implementation used by the Next.js adapter.

## Installation

```bash
npm install sanity-plugin-gemini-ai-images sanity-plugin-gemini-ai-images-serverless
```

## Setup

### 1. Add Plugin to Sanity Config

```typescript
// sanity.config.ts
import {defineConfig} from 'sanity'
import {geminiAIImages} from 'sanity-plugin-gemini-ai-images'

export default defineConfig({
  plugins: [
    geminiAIImages({
      apiEndpoint: 'https://your-site.com/api/gemini/generate-image',
    }),
  ],
})
```

### 2. Create the Function

**Vercel Functions:**

```typescript
// api/gemini/generate-image.ts
import {handler} from 'sanity-plugin-gemini-ai-images-serverless'

export default handler
```

**Netlify Functions (v2):**

```typescript
// netlify/functions/generate-image.ts
import {handler} from 'sanity-plugin-gemini-ai-images-serverless'

export default handler

export const config = {path: '/api/gemini/generate-image'}
```

### 3. Set Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_IMAGE_MODEL` | No | Model used when the Studio does not send one (default `gemini-nano-banana-2.1`) |
| `GEMINI_ALLOWED_MODELS` | No | Comma separated models the endpoint accepts. Defaults to all built-in models. |
| `GEMINI_PLUGIN_API_KEY` | No | Shared secret the Studio must send as `X-API-Key` |
| `GEMINI_CORS_ORIGIN` | No | Comma separated allowed origins (default `*`) |

## Custom Handler

Use `createImageHandler` to configure the handler in code instead of environment variables:

```typescript
import {createImageHandler, createGeminiProvider} from 'sanity-plugin-gemini-ai-images-serverless'

export default createImageHandler({
  provider: createGeminiProvider({apiKey: process.env.MY_GEMINI_KEY}),
  allowedModels: ['gemini-nano-banana-2.1', 'gemini-3-pro-image'],
  defaultModel: 'gemini-nano-banana-2.1',
  apiKey: process.env.MY_PLUGIN_SECRET,
  corsOrigin: ['https://your-studio.sanity.studio', 'http://localhost:3333'],
  // Series images are generated one at a time by default for consistency.
  // Raise this if your platform has a short function timeout.
  seriesConcurrency: 1,
})
```

### Custom Providers

The handler talks to image backends through a small `ImageProvider` interface, so other services can be plugged in:

```typescript
import {createImageHandler, type ImageProvider} from 'sanity-plugin-gemini-ai-images-serverless'

const myProvider: ImageProvider = {
  name: 'my-provider',
  async generate({prompt, model, aspectRatio, imageSize, baseImage, baseImageMimeType}) {
    // Call your image API and return base64 image data
    return {imageData: '...', mimeType: 'image/png'}
  },
}

export default createImageHandler({provider: myProvider, allowedModels: ['my-model']})
```

## API

`POST` with a JSON body:

```jsonc
{
  "prompt": "A ceramic mug on a walnut table",
  "model": "gemini-3-pro-image",   // optional, must be allowed
  "aspectRatio": "16:9",           // optional
  "imageSize": "2K",               // optional: 1K, 2K, 4K
  "mode": "edit",                  // "generate" (default) or "edit"
  "baseImage": "<base64>",         // edit mode only
  "baseImageMimeType": "image/jpeg",
  "series": {                      // optional
    "quantity": 4,
    "consistencyPrompt": "Keep the same mug",
    "variations": ["front", "side", "top", "in use"]
  }
}
```

Single image responses return `{imageData, mimeType, model}`. Series responses return `{images, metadata}` with status 200, or 207 with `errors` when some images fail.

## Platform Notes

### Timeouts

Image generation takes 10-30 seconds per image, and series run sequentially by default. Raise your function timeout:

- **Vercel**: set `maxDuration` in `vercel.json` (60s or more, 300s for large series)
- **Netlify**: synchronous functions have a short, plan dependent limit; keep series small or raise `seriesConcurrency`

```json
{
  "functions": {
    "api/gemini/generate-image.ts": {
      "maxDuration": 300
    }
  }
}
```

### Other runtimes

AWS Lambda and Cloudflare Workers do not call the handler with a `Request` directly. Wrap it with your platform's Request/Response adapter, and on Workers pass the key explicitly with `createGeminiProvider({apiKey: env.GEMINI_API_KEY})`.

## Security

The endpoint spends your Gemini credits, so restrict it:

- Set `GEMINI_CORS_ORIGIN` to your Studio's origin
- Limit `GEMINI_ALLOWED_MODELS` to the models you want to pay for
- Set `GEMINI_PLUGIN_API_KEY` (compared in constant time). Any key configured in the Studio is visible to Studio users, so also add rate limiting.

## Requirements

- Node.js 20.0.0 or higher
- Sanity Studio v3 to v6

## License

MIT © Nick Jensen
