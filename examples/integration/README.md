# Integration fixtures

Copy these files into your application and adjust imports. The examples are type-checked against the built packages by `npm run test:examples`; they never call live providers during checks.

1. Create a private Sanity state dataset and a server token with read/write rights there. Studio users must not be able to mutate state documents. Content/assets remain in your existing dataset.
2. Set `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN`, `SANITY_AI_STATE_DATASET`, `SANITY_AI_STATE_TOKEN`, `STUDIO_ORIGINS`, and at least one of `GEMINI_API_KEY` / `OPENAI_API_KEY` on the server.
3. Choose the Next.js, Netlify Web Request, or API Gateway Lambda route. All `/jobs/*`, `/reference`, `/capabilities`, and optional `/suggestions` paths must reach the same handler.
4. Call `createAIStudio(projectId,dataset,getRequestHeaders)` with a callback returning `Authorization: Bearer <fresh Sanity user token>` from your authenticated session. Membership and editor role are checked server-side. Cross-origin Studio hosting requires this token transport and an allowed origin.
5. Enable video on both sides explicitly (`ENABLE_VIDEO=true` and Studio `enableVideo:true`). Establish administrator pricing/limits before paid acceptance testing.

The open Studio advances jobs while it is mounted. `worker.ts` demonstrates one scheduled step; an external queue/scheduler must keep invoking it for unattended work. It needs a fresh authorized owner token, acquired through your secure session integration. No background process or cloud scheduler is provisioned by this plugin.

For Vertex image generation replace `geminiApiKey` with `vertex:{project:'your-cloud-project',location:'us-central1'}` and configure Application Default Credentials on the host. Veo currently uses the Gemini API key path.

See [deployment and migration](../../docs/MIGRATION-V2.md) for permissions, recovery, and pricing rules.
