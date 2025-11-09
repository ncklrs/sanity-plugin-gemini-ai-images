# sanity-plugin-gemini-ai-images-nextjs

Next.js adapter for the Sanity Gemini AI Image Generator plugin.

## Installation

```bash
npm install sanity-plugin-gemini-ai-images sanity-plugin-gemini-ai-images-nextjs @google/genai
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

**App Router (Next.js 13+):**

```typescript
// app/api/gemini/generate-image/route.ts
import {POST} from 'sanity-plugin-gemini-ai-images-nextjs/route'

export {POST}
```

**Pages Router (Next.js 12):**

```typescript
// pages/api/gemini/generate-image.ts
import {POST} from 'sanity-plugin-gemini-ai-images-nextjs/route'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'})
  }

  const request = new Request(`http://localhost:3000${req.url}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(req.body),
  })

  const response = await POST(request)
  const data = await response.json()

  return res.status(response.status).json(data)
}
```

### 3. Set Environment Variable

```bash
# .env.local
GEMINI_API_KEY=your_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**Important**: Do NOT use `NEXT_PUBLIC_` prefix - the API key must remain server-side only.

## That's It!

The "AI Generator" option will now appear in your Sanity Studio image picker.

## Custom API Endpoint

If you use a different route path, configure it in your Sanity config:

```typescript
geminiAIImages({
  apiEndpoint: '/api/custom/generate-image',
})
```

## Requirements

- Next.js 14.0.0 or higher (App Router recommended)
- Node.js 20.0.0 or higher
- Sanity Studio v4

## Troubleshooting

### API Route Not Found

Make sure your route file is at the correct path:
- App Router: `app/api/gemini/generate-image/route.ts`
- Pages Router: `pages/api/gemini/generate-image.ts`

### Environment Variable Not Loading

- Restart your dev server after adding `GEMINI_API_KEY`
- Verify the key is in `.env.local` (not `.env`)
- Check the key doesn't have `NEXT_PUBLIC_` prefix

## License

MIT © Nick Jensen
