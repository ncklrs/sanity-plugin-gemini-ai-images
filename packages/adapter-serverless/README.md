# Serverless adapter

Requires Node 22.13+. Default export accepts a Web `Request` and returns a Web `Response`.

```ts
// Netlify Web Request function; configure its path to cover the chosen route.
import handler from 'sanity-plugin-gemini-ai-images-serverless'
export default handler
```

Set server-only `GEMINI_API_KEY` or `OPENAI_API_KEY`, `GEMINI_PLUGIN_API_KEY`, and comma-separated `GEMINI_ALLOWED_ORIGINS`. Anonymous calls are denied by default. Production Studio should use the exported `createSanityMediaHandlers` with `createSanityAuthorizer` and isolated state permissions.

For API Gateway Lambda events use the tested bridge; the default Web Request handler is not a Lambda event handler:

```ts
import webHandler,{createLambdaHandler} from 'sanity-plugin-gemini-ai-images-serverless'
export const handler=createLambdaHandler(webHandler)
```

The bridge supports v1/v2 HTTP request bodies and v2 response cookies/binary encoding. For full jobs/history/media, use the configured factory and send all base and subroutes to its `handle` function.

See [typed Netlify/Lambda/worker examples](https://github.com/ncklrs/sanity-plugin-gemini-ai-images/tree/main/examples/integration) and [migration/permissions](https://github.com/ncklrs/sanity-plugin-gemini-ai-images/blob/main/docs/MIGRATION-V2.md). Host execution limits must cover one provider call. No scheduler or cloud deployment is provisioned.
