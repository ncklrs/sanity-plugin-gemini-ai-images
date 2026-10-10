# sanity-plugin-gemini-ai-images-nextjs

Next.js adapter for the Sanity Gemini AI Image Generator plugin.

## Installation

```bash
npm install sanity-plugin-gemini-ai-images sanity-plugin-gemini-ai-images-nextjs
```

## Setup

### 1. Add Plugin to Sanity Config

```typescript
// sanity.config.ts
import {defineConfig} from 'sanity'
import {geminiAIImages} from 'sanity-plugin-gemini-ai-images'

export default defineConfig({
  plugins: [
    geminiAIImages(),
  ],
})
```

### 2. Create API Route

**App Router:**

```typescript
// app/api/gemini/generate-image/route.ts
export {POST, OPTIONS} from 'sanity-plugin-gemini-ai-images-nextjs/route'

// Image generation can take a while. Raise the limit on Vercel.
export const maxDuration = 300
```

Every response includes CORS headers (allowing `Content-Type`, `Authorization`, and `X-API-Key`), and `OPTIONS` answers preflight requests. The default origin is `*`; set `GEMINI_CORS_ORIGIN` to restrict it when your Studio runs on another origin (for example `*.sanity.studio` or `localhost:3333`).

**Custom configuration:**

```typescript
// app/api/gemini/generate-image/route.ts
import {createImageHandler} from 'sanity-plugin-gemini-ai-images-nextjs'

const handler = createImageHandler({
  allowedModels: ['gemini-nano-banana-2.1', 'gemini-3-pro-image'],
  corsOrigin: ['https://your-studio.sanity.studio', 'http://localhost:3333'],
})

export const POST = handler
export const OPTIONS = handler
```

See the [serverless adapter README](../adapter-serverless/README.md) for all options, including custom providers.

**Pages Router:**

```typescript
// pages/api/gemini/generate-image.ts
import type {NextApiRequest, NextApiResponse} from 'next'
import {POST} from 'sanity-plugin-gemini-ai-images-nextjs/route'

export const config = {api: {bodyParser: {sizeLimit: '20mb'}}}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = await POST(
    new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: {
        'content-type': 'application/json',
        'x-api-key': String(req.headers['x-api-key'] ?? ''),
        origin: String(req.headers.origin ?? ''),
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    }),
  )
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.status(response.status).send(await response.text())
}
```

### 3. Set Environment Variables

```bash
# .env.local
GEMINI_API_KEY=your_api_key_here

# Optional
# GEMINI_IMAGE_MODEL=gemini-nano-banana-2.1
# GEMINI_ALLOWED_MODELS=gemini-nano-banana-2.1,gemini-3-pro-image
# GEMINI_PLUGIN_API_KEY=your_secret_api_key_here
# GEMINI_CORS_ORIGIN=https://your-studio.sanity.studio
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**Important**: Do NOT use `NEXT_PUBLIC_` prefix for `GEMINI_API_KEY` - it must remain server-side only

### Optional: API Key Security

For basic API key authentication, you can:

1. **Server-side**: Set `GEMINI_PLUGIN_API_KEY` environment variable
2. **Client-side**: Configure the plugin with your API key

```typescript
// sanity.config.ts
geminiAIImages({
  apiEndpoint: '/api/gemini/generate-image',
  apiKey: process.env.NEXT_PUBLIC_GEMINI_PLUGIN_API_KEY, // Client-side API key
})
```

```bash
# .env.local (server)
GEMINI_PLUGIN_API_KEY=your_secret_server_key

# .env.local (client)
NEXT_PUBLIC_GEMINI_PLUGIN_API_KEY=your_secret_server_key
```

**How it works:**
- If `GEMINI_PLUGIN_API_KEY` is set, the adapter will verify the `X-API-Key` header matches
- If not set, no API key verification is performed (backward compatible)
- The plugin sends the configured `apiKey` as `X-API-Key` header when provided

**Note**: A key configured in the Studio is visible to Studio users, so this is basic protection only. For production, also restrict `GEMINI_CORS_ORIGIN` and `GEMINI_ALLOWED_MODELS`, and add rate limiting.

## That's It!

The "AI Generator" option will now appear in your Sanity Studio image picker.

## Custom API Endpoint

If you use a different route path, configure it in your Sanity config:

```typescript
geminiAIImages({
  apiEndpoint: '/api/custom/generate-image',
})
```

If your Sanity Studio runs on a different port or domain (e.g., Studio on `:3333` and Next.js on `:3003`), use the full URL:

```typescript
geminiAIImages({
  apiEndpoint: 'http://localhost:3003/api/gemini/generate-image',
})
```

## Requirements

- Next.js 14.0.0 or higher (App Router recommended, supports Next.js 14, 15, and 16)
- Node.js 20.0.0 or higher
- Sanity Studio v3 to v6

## Security

Your endpoint spends your Gemini credits. For production:

1. Restrict `GEMINI_CORS_ORIGIN` to your Studio's origin
2. Limit `GEMINI_ALLOWED_MODELS` to the models you want to pay for
3. Set `GEMINI_PLUGIN_API_KEY` and the plugin `apiKey` option
4. Add rate limiting (for example Upstash or Vercel WAF) or your own session check in a custom route

## Troubleshooting

### API Route Not Found

Make sure your route file is at the correct path:
- App Router: `app/api/gemini/generate-image/route.ts`
- Pages Router: `pages/api/gemini/generate-image.ts`

### Environment Variables Not Loading

- Restart your dev server after adding environment variables
- Verify the variables are in `.env.local` (not `.env`)
- Check `GEMINI_API_KEY` doesn't have `NEXT_PUBLIC_` prefix

### CORS Errors

If you see CORS errors in the browser console:
- Ensure you export `OPTIONS` as well as `POST`
- Check `GEMINI_CORS_ORIGIN` includes your Studio's exact origin (scheme, host, and port)
- If Studio and Next.js run on different ports, include both origins

## License

MIT © Nick Jensen
