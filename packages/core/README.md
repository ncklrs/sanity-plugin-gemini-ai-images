# sanity-plugin-gemini-ai-images

Core plugin for AI-powered image generation in Sanity Studio using Google Gemini.

## Installation

```bash
npm install sanity-plugin-gemini-ai-images
```

### Compatibility

| Sanity Version | @sanity/ui | React Version |
|----------------|------------|---------------|
| v3.x, v4.x     | v2         | ^18.0.0 or ^19.0.0 |
| v5.x           | v3         | ^19.2.0       |
| v6.x           | v4         | ^19.2.2       |

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

### Model Selection

```typescript
geminiAIImages({
  // Models editors can choose from (default: all built-in Gemini image models)
  models: ['gemini-nano-banana-2.1', 'gemini-3-pro-image'],
  // Model selected when the generator opens
  defaultModel: 'gemini-nano-banana-2.1',
})
```

The picker is hidden when only one model is configured. Models that support it also get a 1K/2K/4K resolution picker. Make sure your server allows the same models (`GEMINI_ALLOWED_MODELS`).

## Exported Components

### For Advanced Usage

```typescript
import {
  ImageGeneratorContent,
  PromptBuilder,
  PresetTemplates,
  createGeminiAssetSource,
  GenerationSettings,
  geminiImageModels,
  resolveModels,
  useGeminiGeneration,
  useImageUpload,
  uploadImageToSanity,
  promptTemplates,
  templateCategories,
} from 'sanity-plugin-gemini-ai-images'
```

## License

MIT © Nick Jensen
