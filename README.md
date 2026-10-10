# Sanity AI Images

Gemini and OpenAI image generation for Sanity Studio 5 and 6, with model selection, asset editing, gallery insertion, team history, and resumable generation jobs. Optional Veo video generation has its own Studio view.

## Packages

| Package | Purpose |
| --- | --- |
| `sanity-plugin-gemini-ai-images` | Studio components, asset source, tool, hooks and schemas |
| `sanity-plugin-gemini-ai-images-nextjs` | Next.js routes and server factory exports |
| `sanity-plugin-gemini-ai-images-serverless` | Web Request handlers and Lambda bridge |
| `sanity-plugin-gemini-ai-images-engine` | Providers, authentication, quotas, Sanity jobs and media handlers |
| `sanity-plugin-gemini-ai-images-contracts` | Browser-safe request types, validation and model capabilities |

## Install and configure

```sh
npm install sanity-plugin-gemini-ai-images
# Install ONE backend adapter in your server application:
npm install sanity-plugin-gemini-ai-images-nextjs
# or: npm install sanity-plugin-gemini-ai-images-serverless
```

```tsx
import {defineConfig} from 'sanity'
import {geminiAIImages, aiMediaSchemaTypes} from 'sanity-plugin-gemini-ai-images'

export default defineConfig({
  projectId: 'your-project', dataset: 'production',
  schema: {types: [...aiMediaSchemaTypes, /* your document types */]},
  plugins: [geminiAIImages({
    apiEndpoint: 'https://your-app.example/api/ai',
    jobsEndpoint: 'https://your-app.example/api/ai/jobs',
    referenceEndpoint: 'https://your-app.example/api/ai/reference',
    getRequestHeaders: async () => ({Authorization: `Bearer ${await getSessionSanityToken()}`}),
    defaultModel: 'gemini-3.1-flash-image',
    availableModels: ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gpt-image-2.5-sunburst'],
    enableStandaloneTool: true,
    enableAssetReferences: true,
    enableBrandPresets: true,
    enableHistory: true,
    // enableVideo: true, // Also enable explicitly on the server.
  })],
})
```

`getSessionSanityToken()` represents your application's authenticated token integration. Supply a fresh user token; never put Gemini, OpenAI, or Sanity service tokens in the Studio bundle. Default server handlers deny anonymous generation. See the [typed integration fixtures](examples/integration/README.md) for server setup and Next.js, Netlify, Lambda, Studio field/gallery, and worker examples.

## Features

- Choose Gemini Pro, Flash, Lite, Nano Banana or OpenAI Images. The server independently enforces model/capability limits; there is no automatic paid fallback.
- Generate, edit existing Sanity images, continue editing a preview, restore variants and compare them before saving.
- Select model-specific resolution, reference assets with roles, shared brand presets and optional Google Search grounding.
- Review title, alt text and caption before saving. Supply an optional server metadata-suggestions callback for assisted copy.
- Save PNG/JPEG/WebP with the correct MIME type. Image field patches preserve crop, hotspot and existing custom fields; galleries insert stable keyed items.
- Persist model, settings, source asset IDs, usage, attribution and administrator-priced estimates in Sanity history. Reopen, export or delete records; deleting history retains assets.
- Durable series jobs support generated subject anchors, per-item progress, reload recovery, cancellation and explicit failed/uncertain retries. Provider success followed by storage failure is reported as uncertain.
- OpenAI Images generation/edits and Gemini via API key or Vertex Application Default Credentials share the same engine.
- Veo start/poll/download/upload runs separately, retains operation handles through transfer failures, and uses file assets for video.

A mounted Studio advances durable jobs. Unattended jobs need your host's external worker/queue; this plugin does not provision one. Cancellation stops remaining local work, while an already submitted provider operation may still bill. References improve consistency but do not guarantee identical subjects.

## Support and migration

Studio **5 and 6**, Sanity UI **3 and 4**, React **19.2.3+**. Studio 3/4 support was intentionally dropped. Core requires Node 20.19+ below 22, or 22.12+; adapters require 22.13+; development requires 22.22.2+. Node 24 is recommended.

The 2.0 release changes authentication defaults and session persistence. Read [migration and production permissions](docs/MIGRATION-V2.md), [implementation status and review](docs/REVIEW-AND-ROADMAP.md), and [release notes](CHANGELOG.md). These changes have not been published.

## Development

```sh
npm ci
npm run type-check
npm run lint
npm test
npm run build
npm run test:packages
npm run test:examples
npm run test:compatibility
npm run test:backend-compatibility
npm audit --omit=dev
```

Tests use fake paid-provider transports. Compatibility fixtures install packed packages into real Studio 5/6 consumers. Live provider credentials, deployed timeout behavior, private dataset roles and paid generation still need an acceptance pass in your environment.
