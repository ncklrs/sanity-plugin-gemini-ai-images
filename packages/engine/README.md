# Sanity AI media engine

Node-only provider, authentication, quota and durable-job implementation shared by the Next.js and serverless adapters. Requires Node 22.13+.

Exported factories: `createGenerationHandler`, `createSanityMediaHandlers`, `createSanityAuthorizer`, `apiKeyAuthorizer`, `createLambdaHandler`. Providers: Gemini (API key/Vertex), OpenAI Images, optional Veo. Stores: `SanityJobStore`, `SanityBudgetStore`. Browser contracts live in `sanity-plugin-gemini-ai-images-contracts`.

```ts
import {createSanityMediaHandlers,createSanityAuthorizer} from 'sanity-plugin-gemini-ai-images-engine'
const media=createSanityMediaHandlers({
 sanity:{projectId:'project',dataset:'production',token:process.env.SANITY_API_TOKEN!},
 stateSanity:{projectId:'project',dataset:'ai-state',token:process.env.SANITY_AI_STATE_TOKEN!},
 geminiApiKey:process.env.GEMINI_API_KEY,
 openaiApiKey:process.env.OPENAI_API_KEY,
 authorize:createSanityAuthorizer({projectId:'project',dataset:'production'}),
 origins:['https://your-studio.example'],
 limits:{dailyImages:50,perMinute:10,projectDailyImages:500},
})
export const handle=media.handle
```

All routes require authorization by default. Route `/jobs/*`, `/reference`, `/capabilities` and optional `/suggestions` to this handler. Keep the private state dataset inaccessible to editor mutations; UI schema readOnly does not protect quotas. Reference reads use the user's token or a configured host resolver.

Full contracts and limitations: [repository migration guide](https://github.com/ncklrs/sanity-plugin-gemini-ai-images/blob/main/docs/MIGRATION-V2.md). The engine does not provision a background queue; a mounted Studio or host worker advances one job item per request.
