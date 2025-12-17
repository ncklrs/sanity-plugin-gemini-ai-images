# sanity-plugin-gemini-ai-images

Core plugin for AI-powered image generation in Sanity Studio using Google Gemini.

## Installation

```bash
npm install sanity-plugin-gemini-ai-images
```

### Compatibility

| Sanity Version | React Version |
|----------------|---------------|
| v3.x, v4.x     | ^18.0.0       |
| v5.x           | ^19.2.0       |

> **Note:** Sanity v5 requires React 19.2 or later. If using Sanity v3 or v4, React 18.x is supported.

**Note**: This is the core plugin only. You also need an adapter for your backend framework:

- Next.js: `npm install sanity-plugin-gemini-ai-images-nextjs`
- Serverless: `npm install sanity-plugin-gemini-ai-images-serverless`

## Usage

See the [main repository README](https://github.com/ncklrs/sanity-plugin-gemini-ai-images) for complete setup instructions.

### Basic Setup

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

### With Custom API Endpoint

```typescript
geminiAIImages({
  apiEndpoint: '/api/custom/generate-image',
})
```

## Exported Components

### For Advanced Usage

```typescript
import {
  ImageGeneratorContent,
  PromptBuilder,
  PresetTemplates,
  createGeminiAssetSource,
  useGeminiGeneration,
  useImageUpload,
  uploadImageToSanity,
  promptTemplates,
  templateCategories,
} from 'sanity-plugin-gemini-ai-images'
```

## License

MIT © Nick Jensen
