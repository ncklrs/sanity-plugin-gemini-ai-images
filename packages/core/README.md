# Sanity AI Images Studio plugin

Supports Studio 5/6, UI 3/4 and React 19.2.3+. Generate/edit with selectable Gemini Pro/Flash or OpenAI image models; optionally enable durable jobs and a separate Veo view.

```tsx
import {geminiAIImages,aiMediaSchemaTypes} from 'sanity-plugin-gemini-ai-images'
// Add aiMediaSchemaTypes to schema.types; then:
geminiAIImages({
 apiEndpoint:'https://your-backend.example/api/ai',
 jobsEndpoint:'https://your-backend.example/api/ai/jobs',
 referenceEndpoint:'https://your-backend.example/api/ai/reference',
 getRequestHeaders:async()=>({Authorization:`Bearer ${await getSessionSanityToken()}`}),
 defaultModel:'gemini-3.1-flash-image',
 availableModels:['gemini-3.1-flash-image','gemini-3-pro-image','gpt-image-2.5-sunburst'],
 enableStandaloneTool:true,enableHistory:true,enableAssetReferences:true,enableBrandPresets:true,
})
```

Supply your application's fresh user token in `getRequestHeaders`. Provider/service keys belong only on the server. Configure the server adapter's authorization, origin allowlist and quotas independently.

Exports include `ImageObjectInput` (opt-in `enableAIGeneration`), `ImageGalleryInput` (arrays of image members), `ImageGeneratorContent`, `ImageStudioTool`, creative/job/history components, hooks, schemas and editorial helpers. Individual field patches preserve crop/hotspot/custom fields. Gallery arrays with several image member types require an explicit `imageType`.

History/presets/sessions live in Sanity documents; images/videos live in assets. Register the schema exports for these features. Reopened history restores supported model/creative settings and uses the saved image as a new reference. Session saves are asynchronous; loaded images provide assetId/url rather than persisted base64. Local recovery storage contains only scoped job IDs/keys.

Metadata suggestions require an optional server callback plus `suggestionsEndpoint`. Costs use configured administrator estimates, not guaranteed billing. Durable series use references/optional subject anchors; a mounted Studio advances one item at a time. Unattended runs require your own server worker. Video needs explicit enablement and server entitlement.

Full setup, compatibility and release migration: [repository guide](https://github.com/ncklrs/sanity-plugin-gemini-ai-images), [typed Studio fixture](https://github.com/ncklrs/sanity-plugin-gemini-ai-images/blob/main/examples/integration/studio.tsx), [migration](https://github.com/ncklrs/sanity-plugin-gemini-ai-images/blob/main/docs/MIGRATION-V2.md).
