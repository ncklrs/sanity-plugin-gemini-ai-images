# sanity-plugin-gemini-ai-images-serverless

Serverless adapter for the Sanity Gemini AI Image Generator plugin.

Works with Vercel Functions, Netlify Functions, AWS Lambda, and other serverless platforms.

## Installation

```bash
npm install sanity-plugin-gemini-ai-images sanity-plugin-gemini-ai-images-serverless @google/genai
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
      apiEndpoint: '/api/gemini/generate-image', // or your custom path
    }),
  ],
})
```

### 2. Create Serverless Function

**Vercel Functions:**

```typescript
// api/gemini/generate-image.ts
import {handler} from 'sanity-plugin-gemini-ai-images-serverless'

export default handler
```

**Netlify Functions:**

```typescript
// netlify/functions/generate-image.ts
import {handler} from 'sanity-plugin-gemini-ai-images-serverless'

export {handler}
```

**AWS Lambda (with API Gateway):**

```typescript
// lambda/generate-image.ts
import {handler} from 'sanity-plugin-gemini-ai-images-serverless'

export {handler}
```

### 3. Set Environment Variables

**Vercel:**
```bash
# .env or Vercel Dashboard
GEMINI_API_KEY=your_api_key_here
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
```

**Netlify:**
```bash
# netlify.toml or Netlify Dashboard
[build.environment]
  GEMINI_API_KEY = "your_api_key_here"
  SANITY_PROJECT_ID = "your_project_id"
  SANITY_DATASET = "production"
```

**AWS Lambda:**
Set via AWS Console → Lambda → Configuration → Environment variables:
- `GEMINI_API_KEY`: your_api_key_here
- `SANITY_PROJECT_ID`: your_project_id
- `SANITY_DATASET`: production

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**Important**:
- The Sanity project ID and dataset are required for authentication verification
- These should match your Sanity Studio configuration

## Platform-Specific Notes

### Vercel

- Function timeout: Default is 10s, but image generation may take longer
- Increase timeout in `vercel.json`:

```json
{
  "functions": {
    "api/gemini/generate-image.ts": {
      "maxDuration": 60
    }
  }
}
```

### Netlify

- Function timeout: Default is 10s for free tier, 26s for Pro
- For longer timeouts, upgrade to Pro or use background functions
- Configure in `netlify.toml`:

```toml
[functions]
  directory = "netlify/functions"

[[functions."generate-image"]]
  timeout = 26
```

### AWS Lambda

- Default timeout is 3s - increase to at least 60s
- Configure memory to at least 1024MB for better performance
- Enable function URL or use API Gateway

### Cloudflare Workers

Not currently supported due to Workers' runtime limitations. Consider using Cloudflare Pages Functions instead, which support Node.js APIs.

## Custom Endpoint Path

If your function is at a different path, update the Sanity config:

```typescript
geminiAIImages({
  apiEndpoint: '/api/custom/ai-images',
})
```

## Requirements

- Node.js 20.0.0 or higher
- Sanity Studio v4
- Serverless platform that supports Node.js runtime

## Authentication

This adapter automatically verifies that requests come from authenticated Sanity Studio users. The authentication flow works as follows:

1. The core plugin (in Sanity Studio) retrieves the user's token from the Sanity client
2. The token is sent in the `Authorization: Bearer <token>` header with each request
3. The adapter verifies the token against the Sanity API before processing the image generation request

This ensures that only authenticated Sanity Studio users can generate images through your API endpoint.

## Troubleshooting

### Function Timeout

Image generation can take 10-30 seconds. Increase your function timeout:

- Vercel: Use `vercel.json` (see above)
- Netlify: Upgrade to Pro for 26s timeout
- AWS Lambda: Increase in function configuration

### CORS Errors

The handler includes CORS headers by default. If you still see errors, check your platform's CORS configuration.

### Cold Starts

First request may be slow due to cold starts. This is normal for serverless functions.

### Unauthorized Error (401)

If you receive "Unauthorized" errors:
- Ensure you're logged into Sanity Studio
- Verify `SANITY_PROJECT_ID` and `SANITY_DATASET` environment variables are set correctly
- Check that the environment variables match your Sanity Studio configuration
- Make sure your serverless platform has the environment variables configured
- Note: Use `SANITY_PROJECT_ID` (not `NEXT_PUBLIC_SANITY_PROJECT_ID`) in serverless environments

## License

MIT © Nick Jensen
