# Changelog

## 2.0.0 — unreleased

- Refresh dependencies and Gemini image models; expose Pro/Flash and OpenAI choices across Studio workflows.
- Support Studio 5/6, UI 3/4 and React 19.2.3+. Drop Studio 3/4; document Node minimums.
- Introduce shared contracts/engine packages and protected Next.js/Web Request/Lambda handlers.
- Add Sanity identity/role checks, user-scoped references, body/capability limits, quotas and optional cost guards.
- Add durable image/video jobs, revision-controlled claims, fingerprinted idempotency, explicit recovery and local cancellation.
- Add separate optional Veo workflow, OpenAI Images and Vertex image credentials.
- Add shared history/presets, source/model provenance, metadata review, variant iteration/comparison and gallery inputs.
- Preserve MIME types, read-only fields, named image schemas, crop/hotspot/custom fields and partial upload previews.
- Replace binary localStorage sessions with asynchronous Sanity-backed sessions. Retain only scoped job IDs locally.
- Add regression/permission/recovery tests, packed Studio fixtures, typed deployment examples and CI/release checks.

See [migration](docs/MIGRATION-V2.md) before upgrading. Unpublished; live paid-provider acceptance is still required.
