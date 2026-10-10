# Full Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver every roadmap area as usable local code with tested contracts and supported Studio 5–6 integration.

**Architecture:** Shared browser-safe contracts, a protected server generation engine, and Sanity revision-controlled job/history storage. Thin platform adapters retain existing routes while adding durable jobs; editor components provide history, gallery insertion, references, brand controls, and a separate video workflow.

**Tech Stack:** TypeScript, React, Sanity UI 3/4, Sanity REST/client APIs, Google GenAI SDK, OpenAI Images REST, Vitest.

**Spec:** docs/superpowers/specs/2026-10-09-full-roadmap.md

## Global Constraints

- Sanity ^5.0.0 || ^6.0.0; UI ^3.0.0 || ^4.0.0; React ^19.2.3.
- Core Node >=20.19 <22 || >=22.12; adapters/server tooling Node >=22.13.
- Preserve existing prompt/model/MIME/series response fields and default image model.
- No paid calls, deployments, publication, or shared branch pushes during implementation.

## Review Focus

- Concurrent requests/worker lease expiry must not silently repeat billed generations.
- Identity/project isolation must apply to reads, mutation, downloads, and idempotency keys.
- Failed persistence after provider success must be reported as uncertain, not automatically retried.
- Cancellation must preserve completed assets and describe provider-side limits.
- Old exported components and synchronous API calls must keep valid schema and response contracts.

### Task 1: Shared contracts and provider capabilities

**Files:** Create packages/contracts/{package.json,tsconfig.json,src/index.ts}; modify core model exports/types; test tests/contracts.test.ts.
**Interfaces:** `ImageRequest`, `ImageOutput`, `ModelCapability`, `modelCatalog`, `validateImageRequest(input, policy)` shared by engine/UI.

- [x] Write parameterized tests rejecting unsupported model/resolution/reference counts, malformed base64, fractional quantities, incomplete variations, invalid reference roles and unsafe size inputs.
- [x] Run `npm test -- --run tests/contracts.test.ts`; expect failure before contracts exist.
- [x] Implement a browser-safe catalog and normalizer, preserving legacy request fields and providing resolution/reference/grounding capabilities. Normalize OpenAI sizes separately from Gemini aspect ratios.
- [x] Run tests and core type-check; export compatible model aliases for existing consumers.

### Task 2: Shared engine and protected platform handlers

**Files:** Create packages/engine/src/{types,providers,generation,http}.ts and manifest/config; modify both adapter entries; test tests/engine.test.ts and existing adapter tests.
**Interfaces:** `ImageProvider.generate(request,signal)`, `createGenerationHandler(options): (Request)=>Promise<Response>`, `Principal`, `Policy`, `BudgetStore.reserve`.

- [x] Test denied authorization, model/quantity/byte budgets, allowed-origin preflight/errors, transient retry, safety errors, bounded concurrency, all platform parity, and actual provider payloads using fake transports.
- [x] Run tests red; implement streamed body limits before parsing, authorization before provider calls, structured errors, bounded concurrency and explicit opt-in anonymous mode.
- [x] Implement Gemini/Vertex/OpenAI payload adapters; expose returned usage/grounding and administrator-priced estimates. Never retry ambiguous network/timeout outcomes or switch models.
- [x] Delegate Next.js/serverless exports to the engine and run both old/new adapter suites.

### Task 3: Sanity storage and durable jobs

**Files:** Create engine/src/{sanity-store,jobs,video}.ts; test tests/jobs.test.ts and tests/sanity-store.test.ts.
**Interfaces:** `JobStore.create/get/update` with compare-and-swap revisions, `JobService.create/step/cancel/retry/get`; `SanityJobStore`, `SanityBudgetStore`.

- [x] Test restart, idempotency conflicts, concurrent claims, expired lease uncertainty, failed-only retry, cancellation, cross-user access, retention, and atomic quota reservations with a deterministic store and fake clock/provider.
- [x] Run red; implement stable project/user/key IDs, persisted item states, one-item HTTP advancement and strict ownership checks. Store image/video binaries in Sanity assets and records in documents.
- [x] Add Veo start/poll operation persistence, authenticated video download/upload and local cancellation; test operation payloads and state transitions with mocked SDK.
- [x] Run task suites; document the external scheduler integration for unattended progression.

### Task 4: Sanity editorial persistence and asset editing

**Files:** Create core/src/lib/{editorial,schema}.ts and hooks/useEditorialHistory.ts; modify generator/field/upload/session/history; test tests/editorial.test.tsx.
**Interfaces:** `resolveReferenceAsset(client,id)`, `createGalleryPatches(assets)`, `saveGenerationRecord`, schema exports and history CRUD/export functions.

- [x] Test WebP/private-asset resolution, stable gallery keys, preservation of existing field values, actual model/source provenance, history scope and deletion semantics.
- [x] Run red; resolve assets through client fetch and optional protected reference endpoint; pass current image into field editing.
- [x] Persist result records/asset IDs and expose project-scoped history, retention, export/delete, and saved prompts. Remove binary localStorage persistence and wire the standalone history view.
- [x] Add editor-reviewed title/description/alt/caption fields, optional suggestions callback, and gallery upload callbacks; run tests.

### Task 5: Creative controls, iteration and jobs UI

**Files:** Create core/src/components/{CreativeControls,JobPanel,VideoStudio}.tsx and hooks/useGenerationJob.ts; modify generator/tool/config; test tests/workflows.test.tsx.
**Interfaces:** capability-derived controls, `BrandPreset`, authenticated request headers callback, durable job client, generation/asset lifecycle callbacks.

- [x] Test disabled unsupported controls, multiple asset references/roles, saved brand presets, refreshed job resume, cancel/retry, history reopening, and variant restore/compare.
- [x] Run red; add accessible unique IDs and labels, reference picker, model-specific settings, configurable field context/instructions, usage/source display, pre-save metadata and prior variant selection.
- [x] Expose optional jobs UI and separate video workflow; reconnect durable jobs by their ID and persist IDs without binaries.
- [x] Run UI tests and real UI consumer checks for Studio 5/6.

### Task 6: Release fixtures, bridges and documentation

**Files:** Add tested Lambda Web Request bridge and fixture examples; update CI, version metadata/changelog, READMEs, roadmap status, and migration docs.
**Interfaces:** published exports/schema registration, Next/Netlify/Lambda handlers and worker path configuration.

- [x] Add Lambda event/response tests, packaged engine/contracts imports, authenticated fixture configuration, and lifecycle tests.
- [x] Run red then implement tested examples and bridge; mark implemented roadmap acceptance items with evidence and remaining live acceptance limits.
- [x] Run full type-check/lint/tests/build/package checks/Studio matrix and production dependency audit. Review security/ownership/crash cases independently before completion.

## Execution ledger

Execution is inline as requested by “Plan and implement full roadmap.” The user selected Sanity documents/assets and OpenAI Images. Preserve existing uncommitted updates. Use a codex branch in the current checkout so approved changes remain present. Do not publish or commit unrelated work. Record task results and decisions in docs/superpowers/plans/2026-10-09-full-roadmap-progress.md.

All local implementation tasks are complete; verification evidence and external acceptance limits are recorded in the execution ledger.
