# Full roadmap design

Build an editorial image and video workflow for Sanity Studio 5–6, using Sanity documents and assets for durable state and OpenAI Images as the second image provider. This expands the saved review roadmap while retaining the existing single-image API and model selector.

## Architecture and decisions

A browser-safe contracts package owns model capabilities and request/result types. A server engine owns provider adapters, protected Web Request handlers, Sanity REST persistence, quota reservations, and resumable jobs. Next.js and serverless packages expose thin factories around the same engine. Browser components use existing Sanity clients for editing, history, provenance, brand presets, and collaborative gallery patches.

Durable jobs advance one outstanding image per authenticated HTTP worker request. No background promise is assumed to survive a serverless invocation. Sanity revision checks claim work and reserve daily generation units atomically. Refreshing/reopening a job resumes it; concurrent polls cannot generate the same item. An expired claim becomes uncertain and needs explicit retry, because providers do not guarantee exactly-once billing across a crash. A host can schedule the same worker endpoint if generation should continue with no browser open.

Authorization is host supplied through an async callback returning a verified user identity and permissions. Default exports require a configured server-side plugin key; anonymous development access requires an explicit option/environment flag. Sanity bearer authorization additionally verifies identity and project/dataset access. An administrator determines project, dataset, allowed models, maximum series size, limits, CORS origins, prices, and references. No browser configuration or shared browser key is treated as per-user permission enforcement.

Generation documents contain asset references rather than base64. Team history and provenance are scoped by the configured Sanity project/dataset and user access. Deleting history deletes records, not shared library assets. Export includes documents and asset URLs. Browser errors preserve expensive previews for retry. Schema helpers define job/history/provenance/preset document types; applications include them explicitly.

Creative controls are capability-aware: resolution, aspect ratio, reference count, reference roles, search grounding, server-controlled brand instructions. Sources and provider usage are returned; optional price configuration produces labelled estimates. Edit iterations retain prior previews and allow compare/restore. Alt-text/caption suggestions are optional server callbacks and require editor review.

Gemini and Vertex use the Google SDK; OpenAI uses its documented Images REST generation/edit contracts. Veo is a separate durable operation workflow with authenticated polling, server download/upload of the provider result, cancellation of local polling/work, and usage budgets. Provider cancellation does not promise refunds or terminate an already accepted provider operation.

## Constraints

- Sanity ^5.0.0 || ^6.0.0; UI ^3.0.0 || ^4.0.0; React ^19.2.3.
- Core Node >=20.19 <22 || >=22.12; adapters/server tooling Node >=22.13.
- Preserve existing prompt/model/MIME/series response fields and default image model.
- Paid calls, live credentials, deployment, package publication, and shared branch pushes are outside local implementation validation.
- No automatic provider/model fallback. Limits are enforced before provider calls.

## Acceptance

Unauthorized/over-budget/oversize/unsupported requests never call providers. Both adapters behave identically. Failed uploads/generations can be retried individually; refresh and concurrent polls do not repeat successful work. History reopens asset references, provenance records actual parameters, galleries use valid patches. Unsupported controls cannot be submitted. Vertex/OpenAI/Veo have transport contract tests, and Studio 5/6 have package/type/render checks. Examples include Next.js, Netlify, Lambda event bridging, schemas, environment, and migration instructions. Live deployment/provider acceptance is clearly distinguished from local tests.
