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

**IMPORTANT: CORS Configuration Required**

Even if Sanity Studio is embedded in your Next.js app, you **must configure CORS headers** on the API route in production. This is because Sanity Studio loads in an iframe and makes cross-origin requests to your API endpoints.

**App Router (Next.js 13+):**

```typescript
// app/api/gemini/generate-image/route.ts
import {POST as BasePOST} from 'sanity-plugin-gemini-ai-images-nextjs/route'
import {NextResponse} from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: Request) {
  const response = await BasePOST(request)

  const headers = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
```

**For Production**: Replace `'*'` in `Access-Control-Allow-Origin` with your specific domain(s) for better security:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

**Pages Router (Next.js 12):**

```typescript
// pages/api/gemini/generate-image.ts
import {POST} from 'sanity-plugin-gemini-ai-images-nextjs/route'

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

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

### 3. Set Environment Variables

```bash
# .env.local
GEMINI_API_KEY=your_api_key_here
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production

# Optional: API Key for securing the endpoint
# GEMINI_PLUGIN_API_KEY=your_secret_api_key_here
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

**Note**: This provides basic protection. For production, see [SECURITY.md](../../SECURITY.md) for more robust approaches including rate limiting, origin checking, and session-based auth.

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
- Sanity Studio v4

## Security

**Important:** Your API endpoint makes requests to Google's Gemini API using your API key, which can incur costs. You should secure this endpoint to prevent unauthorized access.

### Quick Security Setup

For production use, we recommend implementing one or more of these security measures:

1. **Custom API Keys** (Recommended)
   - Generate API keys for your users
   - Require `X-API-Key` header on requests
   - Track usage per key

2. **Origin Checking**
   - Restrict to your domain instead of using `*` in CORS
   - Add IP allowlisting for additional protection

3. **Rate Limiting**
   - Limit requests per user/IP/API key
   - Use services like Upstash or Vercel rate limiting

4. **Session Authentication**
   - Use your existing auth system (NextAuth, etc.)
   - Verify user session before processing

### Complete Security Guide

See [SECURITY.md](../../SECURITY.md) for:
- Detailed implementation examples
- Production-ready code samples
- Comparison of different approaches
- Rate limiting setup
- Complete working examples

### Development vs Production

The examples in this README use `'*'` for CORS to simplify development. **Always replace this with your specific domain(s) in production:**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  // or for multiple domains:
  // 'Access-Control-Allow-Origin': request.headers.get('origin'),
}

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
- Ensure you've added the `OPTIONS` handler
- Verify `Access-Control-Allow-Origin` header is set correctly
- For development, using `'*'` is fine
- For production, use your specific domain(s)
- If Studio and Next.js run on different ports, include both origins

## License

MIT © Nick Jensen
