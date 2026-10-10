# Plugin review and implemented roadmap

Reviewed October 9–10, 2026. The requested five roadmap areas now have implementations, regression coverage and deployment examples. The user selected Sanity documents/assets for durable state and OpenAI Images as the second provider. Version 2.0 is prepared locally and remains unpublished.

## Delivered areas

| Area | Delivered behavior | Evidence / operational requirement |
| --- | --- | --- |
| Release readiness and endpoint protection | Updated packages; shared engine/contracts; protected handlers; membership/role checks; origin allowlists; streamed body and capability limits; atomic generation quotas; configurable price guards; Lambda bridge | Provider/HTTP/security/store tests, built imports, typed deployment fixtures. Production needs a private state dataset or restrictive mutation roles. |
| Durable generation workflow | Sanity-backed jobs/assets; fingerprinted idempotency; revision claims; restart/resume; per-item progress; explicit failed/uncertain retries; cancellation; subject anchors; bounded generation concurrency | Job lifecycle/concurrency/lease/cancellation tests. Mounted Studio advances jobs; unattended progression requires the host's queue/scheduler. |
| Sanity editorial integration | Existing/private/WebP asset resolution; field patches; named image types; gallery insertion and partial-upload recovery; shared history/presets/sessions; model/settings/source provenance; metadata review; history reopen/export/delete/retention | Editorial/field/hook tests, typed Studio fixture, real UI browser checks. Metadata suggestions require an optional host callback. History export currently covers the latest 200 records. |
| Creative controls and iteration | Model capability-driven resolutions; reference roles; shared brand presets; context/instructions; optional grounding and attribution; usage/estimates; continued edits; variant restore/compare | Contract/workflow tests and browser checks with real Sanity UI. References guide consistency; identity preservation is not guaranteed. Variant previews retain the latest eight versions in memory. |
| Additional providers and media | Gemini API key/Vertex ADC path; OpenAI Images JSON generation/multipart edits; separate optional Veo start/poll/download/upload view | Fake-provider payload, operation, redirect and recovery tests. Live account model access and output/playback acceptance remain to be checked; Veo currently uses Gemini API keys. |

## Important review corrections

- Studio 5/6 and UI 3/4 compatibility is explicit. A compatibility layer maps changed layout props and notification/dialog behavior. Studio 3/4 was intentionally dropped at the user's direction.
- Model selection reaches generation, editing and series. MIME types survive reference reads, provider responses and asset uploads.
- Editor identity is checked against project membership and editing roles; public dataset readability alone does not authorize generation.
- Private references and presets use the user's token. Host-supplied resolvers are respected across utility, image and video paths.
- Asset-resolved aggregate limits are checked before provider calls. Generic network/provider-server failures are treated as uncertain and are not automatically retried.
- Concurrent same-key requests reserve against immutable fingerprints. Revision guards prevent competing quota reservations from overcommitting limits.
- Failed subject anchors block dependent variations. Late provider results preserve a concurrent cancellation and already saved output.
- Video polling/storage failure preserves the existing operation. Recovery does not start another paid operation; definitive generation failure permits an explicit new retry priced by duration.
- Video redirects are bounded and restricted to trusted HTTPS provider/storage hosts. Gemini credentials are not forwarded to storage hosts.
- Single-image metadata/iteration controls are visible in the Single panel. History reopening restores supported model/settings and switches from Videos to Images.
- Gallery retry returns all successfully uploaded selected assets. Failed previews remain available without regenerating. Named field/gallery image types use their schema names.
- Local session binaries were replaced with asynchronous Sanity document/asset persistence; existing-asset previews and reuse are supported.
- Credentialed CORS echoes an intentionally allowed origin instead of returning a browser-incompatible wildcard.

## Dependency decisions

The refresh includes Google GenAI 2.28, Sanity 6.18, UI 4.4, React 19.3, Next 16.4, icons 5.2, TypeScript 6.0, ESLint 10.12 and Vitest 5.0. TypeScript remains on 6 because the current typescript-eslint range is below 6.1; forcing an incompatible TypeScript 7 upgrade was avoided. Node types track the supported server minimum.

Core peers: Sanity 5/6, UI 3/4 and React 19.2.3+ (matching current Studio 5 / Portable Text patch requirements). Core Node: >=20.19 below 22, or >=22.12. Adapters: >=22.13. Tooling: >=22.22.2; Node 24 recommended. Core/adapters are versioned 2.0.0; new contracts/engine packages start at 1.0.0. Publish order is contracts, engine, core, then adapters.

The root `npm audit --omit=dev` reports zero findings; consuming Studio dependency graphs should be audited separately. Development-only Sanity tooling advisories are tracked separately and should be rechecked before release; they are not silently removed by downgrading the development host.

## Verification

Run the checks listed in the [execution ledger](superpowers/plans/2026-10-09-full-roadmap-progress.md). Tests use fake transports and deterministic stores; no paid provider calls are made. Packed consumers verify public imports, declarations and server rendering with real Studio 5/UI 3 and Studio 6/UI 4. Typed fixtures cover Next.js, Netlify Web Requests, API Gateway Lambda, Studio schemas and external worker calls.

A temporary browser harness with real Sanity UI and mocked services checks history model/settings restoration, OpenAI capability restrictions, single-image metadata, variants/comparison, continued editing, image/video navigation and durable series progress. It is a component browser check, not a deployed Studio permission test.

## Production acceptance remaining

Supply credentials and a disposable dataset to verify real Gemini/OpenAI/Veo access, private asset read rules, state isolation, file upload/playback, host timeouts, scheduler identity refresh and conservative pricing. Deploying infrastructure, publishing npm packages and running paid generation were not part of this local implementation. Follow the [migration guide](MIGRATION-V2.md) before those actions.

For subsequent releases, useful extensions are paginated large-history exports, richer provider billing telemetry, additional video credential paths and automated deployment-specific acceptance fixtures. These are new follow-on work, not omitted items from the implemented roadmap.

## Official provider references

- [Google image generation](https://ai.google.dev/gemini-api/docs/generate-content/image-generation)
- [Google Veo generation](https://ai.google.dev/gemini-api/docs/veo?hl=en)
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [Sanity projects API](https://www.sanity.io/docs/http-reference/projects-api)
