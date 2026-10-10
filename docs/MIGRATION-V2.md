# Version 2 migration and production setup

## Compatibility

Studio 5 is the minimum. Core supports Sanity 5/6, UI 3/4 and React 19.2.3+. Existing component names, synchronous image response fields, model selection and asset callbacks remain. Default model is `gemini-nano-banana-2.1`; use `availableModels` and the server `policy.allowedModels` to expose only provisioned models. Unsupported configurations are rejected rather than silently changing models.

The adapters now share an engine and deny anonymous calls unless `allowUnauthenticated:true` is explicitly configured. Default environment routes require `GEMINI_PLUGIN_API_KEY`. A key embedded in a public Studio is readable by users; production Studio deployments should use session-based authorization, not a public shared key. `createSanityAuthorizer` checks identity, explicit project membership, an allowed editing role, and dataset access using the user's token. Custom roles can be supplied in `allowedRoles`.

## Server configuration

Use `createSanityMediaHandlers` from either adapter or the engine. Configure provider credentials only on the server. Supply `sanity:{projectId,dataset,token}`, `authorize`, an explicit `origins` list, and budget limits. See [complete typed examples](../examples/integration/README.md).

**Protect authoritative state at the API permission layer.** Studio schema `readOnly` is only a UI property. Users must not be able to mutate `aiGenerationJob` or `aiGenerationBudget` documents. Prefer the supported `stateSanity` option pointing at a separate private dataset with a server-only token and no editor mutation grants. Assets, history, presets and sessions remain in the content dataset. Alternatively use Sanity custom roles denying mutation of both state document types. Do not deploy the default same-dataset state arrangement with broad Editor write grants and expect quotas to be tamper-proof.

Fresh Sanity user tokens in request-scoped principals authorize private reference/preset reads, including worker calls. Default references never use the privileged server token on behalf of an ordinary editor. Hosts with finer document rules can provide `resolveReference` and `resolvePreset`; the high-level factory preserves those resolvers. `allowServerReferences:true` is reserved for trusted server-to-server callers. Never enable it for public Studio shared keys. Metadata suggestions also require reference access before the callback runs.

Cross-origin requests include credentials. Allowed origins are echoed with `Access-Control-Allow-Credentials:true`; an intentional wildcard allows every requesting origin and should be limited to authenticated deployments. Default origins are empty. Allow the Studio origin in both your endpoint policy and Sanity CORS settings.

## Routes and durable jobs

Route the base `/api/ai`, `/api/ai/jobs/*`, `/api/ai/reference`, `/api/ai/capabilities`, and optional `/api/ai/suggestions` to the same `handle` function.

| Route | Method | Behavior |
| --- | --- | --- |
| `/api/ai` | POST | Synchronous image generation/edit/series; partial series returns 207 |
| `/api/ai/jobs` | POST | Create image/video job with `Idempotency-Key` |
| `/api/ai/jobs/:id` | GET / DELETE | Owner-scoped inspect / cancel remaining work |
| `/api/ai/jobs/:id/run` | POST | Claim and advance one item or video operation |
| `/api/ai/jobs/:id/retry` | POST | Explicit retry of failed/uncertain indices |
| `/api/ai/reference` | POST | User-authorized reference bytes from an asset ID |
| `/api/ai/capabilities` | GET | Configured/allowed models, video entitlement and configured prices |
| `/api/ai/suggestions` | POST | Optional host-provided metadata assistant |

Jobs use stable owner/key IDs, request fingerprints and Sanity revision guards. Concurrent request reservations are bound to the request fingerprint. Expired claims become uncertain; they are never automatically regenerated. Storage failure after an image provider returns may require another paid call if explicitly retried. Video transfer/persistence recovery reuses its existing operation. Definitive video-generation failure clears the operation and a new retry reserves duration-based cost.

Studio reload persists only a job ID and idempotency key, separately for images/videos and scoped by project/dataset/endpoint. Assets hold binaries. Jobs advance while the Studio is mounted. Use a scheduler or queue to call `/run` as the owner for unattended progression; acquire fresh authorized owner credentials through your host. No scheduler, cloud worker, or deployment is created automatically. Set host execution limits long enough for one provider request; the lease is three minutes. An expired lease blocks automatic paid retries.

## Budgets and pricing

Defaults: 100 generations/user/day, 10/user/minute, 1,000/project/day. Series anchors count as an additional output; rejected or interrupted calls conservatively retain reservations. Reservations across user/minute/project documents use atomic revision guards. They are idempotent per immutable request/retry identity.

Supply `prices` in USD per image output or per video second from your account's pricing agreement. `maxEstimatedCostUsd` rejects unpriced models or over-limit requests; `limits.dailyUsd` enforces accumulated configured estimates. Usage and estimates are informational and are not invoices. Input/grounding/reference costs must be included in your conservative administrator pricing if required. Video and image units share generation-count limits.

## Editorial schema and persistence

Register `aiMediaSchemaTypes` in the content Studio. Use `ImageObjectInput` with `enableAIGeneration` for individual images and `ImageGalleryInput` for arrays. Named reusable image types are supported. If an array contains multiple image member types, supply `imageType` to the gallery input explicitly.

History records contain asset references, prompts, model/settings, sources and metadata. Deletes/retention remove records only; library assets are retained. The Studio exports up to the most recent 200 records; use server-side pagination for larger archives. Brand presets are project documents with reusable instructions and negative instructions.

`useGenerationSession.saveSession()` is now asynchronous and writes Sanity documents/assets. Await it and handle failure. Loaded results contain `assetId`/`url` and an empty `imageData`; exported preview/bulk components support existing-asset reuse. Old binary localStorage sessions are not automatically migrated. Back up any old history before upgrading. The new history UI reads Sanity records.

State budget documents have expiry timestamps; schedule your own server-only cleanup of expired budget documents and terminal job records according to your retention policy. Do not delete queued/running/uncertain jobs automatically. Export or retain editorial history separately.

## Providers and acceptance

Gemini image requests support API keys or `vertex:{project,location}` with Application Default Credentials on the host. OpenAI generation uses JSON and reference edits use multipart Images requests. Model capabilities are shared with the Studio. Veo 3.1 is explicitly enabled and currently uses the Gemini API key path; downloads follow bounded trusted redirects without passing credentials to storage hosts.

Metadata suggestions are opt-in and require a host `suggestMetadata` callback; no additional text model is silently billed. Configure `suggestionsEndpoint` only when that callback exists. Enable video in both the server and Studio and grant `canUseVideo` explicitly.

Before production, verify the configured models, credentials, private reference access, role restrictions, state dataset isolation, real file upload/playback, host timeouts, budget estimates, cancellation, and worker scheduling in a disposable project. Automated checks use mocks and make no paid calls. Publishing and deployment remain separate release actions.
