# Full roadmap execution ledger

Plan: [implementation plan](2026-10-09-full-roadmap.md). Design: [specification](../specs/2026-10-09-full-roadmap.md).

## Scope decisions

- The user requested planning and implementation in this chat and selected Sanity documents/assets plus OpenAI Images. Implementation proceeded inline without another scope approval.
- Preserve prior approved dependency/model/compatibility work in the existing checkout. Branch: `codex/full-roadmap`. The user subsequently requested a pull request; the completed implementation is committed and pushed for review. No paid requests, deployed resources or npm publication.
- Studio 5 is the minimum, with Studio 6 also supported. UI 3/4 are supported. React minimum is 19.2.3 because Studio 5's current Portable Text dependency requires that patch; a 19.2.2 fixture exposed the upstream peer conflict. The fixtures validate the installed React dependency graph, not just rendering.
- Authoritative state can live in a separate private Sanity dataset through `stateSanity`. A server-only token and editor mutation restrictions are production requirements. Content assets/history/presets remain in the existing content dataset.
- Metadata suggestions are opt-in host callbacks. Durable work advances through mounted Studio requests or an external host worker; no cloud infrastructure is provisioned.

## Completed tasks

| Task | Implementation and verification |
| --- | --- |
| 1. Contracts and capabilities | New browser-safe contracts, Gemini/OpenAI catalogs, image/video validation, legacy request fields and core model aliases. Contract tests reject incompatible capabilities and malformed/oversized requests. |
| 2. Protected engine and adapters | Shared Gemini/Vertex/OpenAI engine, auth callbacks/Sanity identity and role checks, CORS, body limits, explicit 429 retry bounds, safety/uncertainty handling, usage/sources/price ceilings and adapter parity. Provider configuration/payload and HTTP tests pass. |
| 3. Sanity storage and durable jobs | Atomic revision-guarded quotas, project/dataset namespace isolation, job fingerprints, claims/leases, restart, cancel/retry, subject anchors and Veo operation recovery. Tests cover racing reservations/claims, late cancellation, storage failure, ownership and trusted redirects. |
| 4. Editorial persistence | Actual asset resolution, preserved field patches/named types, galleries and partial upload accumulation, shared history CRUD/export/retention, async asset-backed sessions, source/model/settings provenance and editor metadata. Editorial/field/core tests pass. |
| 5. Creative/job/video UI | Capability controls, reference roles, reusable presets, context/instructions, grounding, usage/source display, eight recent variants with restore/compare, continued edits, history restoration, scoped recovery IDs and separate video view. Workflow tests and real-UI browser checks pass. |
| 6. Release support | Typed Next/Netlify/Lambda/Studio/worker examples; tested Lambda bridge; all package exports checked; Studio and Next packed consumer matrices; CI/release publication order; 2.0 migration and changelog. No packages published. |

## Independent review and corrections

Backend and Studio review identified membership authorization, privileged reference access, concurrent quota reservation identity, lost video operations, aggregate reference limits, revoked video permissions, failed-anchor progression, video duration pricing, hidden single-image controls, named schema types, history restoration, session asset reuse, CORS credentials and durable provenance issues. These were corrected and covered by regression tests or explicit permission configuration/documentation. Default stores preserve host resolvers and use fresh user tokens for reference/preset reads. Invalid synchronous anchor requests are rejected before reservation/provider calls.

A failing endpoint-change recovery test exposed retained job state; it now clears when the configured scope changes and ignores stale responses from another scope. The reference UI test mock now uses a stable Sanity client, matching the real hook contract and removing an intermittent test race.

## Verification evidence

- `npm test`: **107 tests passed across 15 files**, including provider configuration, permission, concurrency, cancellation and recovery cases.
- `npm run type-check`, `npm run lint`, `npm run build`: pass.
- `npm run test:packages`: public contracts, engine, core, Next root/route and serverless imports pass.
- `npm run test:examples`: all integration fixtures type-check against built package declarations.
- Packed Studio 5.31.2 / UI 3.5.5: consumer imports, named-image/gallery declarations and real UI server rendering pass. React 19.3 was checked; the minimum React 19.2.3 fixture additionally verifies the peer graph.
- Packed Studio 6.18.0 / UI 4.4.0 / React 19.3: imports, consumer declarations and real UI server rendering pass.
- Packed Next 14.2.35, 15.5.27 and 16.4.0: actual NextRequest route types and authenticated handler responses pass.
- `npm audit --omit=dev`: zero findings in the root production dependency tree. Audit each consuming Studio's dependency graph separately.
- Browser harness with real UI 4 and mocked services: history restores Pro/2K/16:9/grounding; OpenAI removes unsupported settings; metadata/variants/continued editing work in the Single panel; reopening image history leaves Videos; a five-item durable series reaches complete; no captured console errors. Native controls receive scoped Studio styling. Temporary test server/tab were closed afterward.
- `git diff --check`: pass.

## External acceptance and release

Local implementation is complete. Live provider/model access, real private-dataset permissions, server-only state grants, video playback, host timeouts, worker credential refresh and administrator pricing need acceptance in a disposable configured project. No live acceptance or deployment is implied by mock/consumer tests. Follow [migration](../../MIGRATION-V2.md) before release. Keep queued/running/uncertain job records; schedule server-only cleanup of expired budgets and terminal records according to your retention policy.
