# Next.js adapter

Requires Node 22.13+ and Next.js 14–16. Supports synchronous image routes and the shared Sanity durable media factory.

```ts
// Simple environment-configured image route:
export {POST, OPTIONS} from 'sanity-plugin-gemini-ai-images-nextjs/route'
```

Set server-only `GEMINI_API_KEY` or `OPENAI_API_KEY`, `GEMINI_PLUGIN_API_KEY`, and comma-separated `GEMINI_ALLOWED_ORIGINS`. Missing authentication configuration denies calls. A browser-embedded shared key is not suitable for protecting public Studio deployments.

For production Studio use `createSanityMediaHandlers` and `createSanityAuthorizer`, re-exported by this package. Route `POST`, `GET`, `DELETE`, and `OPTIONS` from `media.handle` in `app/api/ai/[[...path]]/route.ts`; use `runtime='nodejs'`. Configure a private server-only state dataset. A mounted Studio or external worker advances durable jobs.

See [typed fixtures](https://github.com/ncklrs/sanity-plugin-gemini-ai-images/tree/main/examples/integration) and [permissions/migration](https://github.com/ncklrs/sanity-plugin-gemini-ai-images/blob/main/docs/MIGRATION-V2.md). Provider keys and Sanity service tokens must never enter the client bundle. Configure host timeouts for one provider call; jobs do not remove individual request timeout limits.
