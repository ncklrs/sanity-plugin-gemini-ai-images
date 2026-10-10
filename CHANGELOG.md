# Changelog

## Unreleased: core 1.5.0, nextjs 1.2.0, serverless 1.2.0

### Added

- **Model selection.** New `models` and `defaultModel` plugin options, a model picker in the generator, and a 1K/2K/4K resolution picker for models that support it. Built-in models: `gemini-nano-banana-2.1` (new default), `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-2.5-flash-image`.
- **Server model allow list.** Requests may name a `model` and `imageSize`. The server only accepts models in `GEMINI_ALLOWED_MODELS` (default: built-in list) and falls back to `GEMINI_IMAGE_MODEL`.
- **`createImageHandler`** in the serverless adapter (re-exported by the Next.js adapter) with options for provider, allowed models, default model, API key, CORS origins, and series concurrency.
- **`ImageProvider` interface** so other backends (fal, OpenAI, ...) can be plugged in later.
- `OPTIONS` export from `sanity-plugin-gemini-ai-images-nextjs/route` for CORS preflight.
- `GEMINI_CORS_ORIGIN` to restrict allowed origins.
- Sanity Studio v6 and `@sanity/ui` v4 support.
- Unit tests for the server handler and Gemini provider, and a CI workflow that type-checks the plugin against Sanity 3, 5, and 6.

### Changed

- Default model is now `gemini-nano-banana-2.1` (was `gemini-2.5-flash-image`). Set `GEMINI_IMAGE_MODEL=gemini-2.5-flash-image` to keep the old behavior.
- Next.js and serverless adapters now share one implementation, so series behavior is identical: images are generated sequentially (configurable) and partial failures return HTTP 207 on both.
- `@google/genai` upgraded from 1.x to 2.x. It is now a regular dependency, so you no longer need to install it yourself.
- The Next.js adapter no longer imports `next/server`; route handlers return standard `Response` objects.
- `InlineGenerator` opens in a dialog instead of a popover.
- `ImageObjectInput` shows the AI panel by default (`enableAIGeneration` now defaults to `true`, matching the documented usage).
- `@sanity/icons` is no longer required.

### Fixed

- Plugin crashed in Sanity Studio v6: `useToast` and `Popover` moved to subpath exports in `@sanity/ui` v4, and `Stack`'s `space` prop was ignored. The plugin now only uses APIs shared by `@sanity/ui` v2, v3, and v4.
- CORS preflight did not allow the `X-API-Key` header, so cross-origin Studios could not use `apiKey`. Error responses also lacked CORS headers.
- API key comparison is now constant time.
- `ImageObjectInput` passed a raw value to `onChange` instead of patches, and overwrote hotspot/crop. It now patches only `asset`.
- `InlineGenerator` and `ImageObjectInput` ignored the `apiKey` option.
- `maxSeriesQuantity` and `defaultConsistencyLevel` options were documented but not applied.
- Series prompts included the base prompt twice.
- Edit mode always sent the base image as PNG; the real MIME type is now sent.
- Uploads were always saved as `.png` regardless of the returned image type.
- Editing an existing Sanity image built its CDN URL by string replacement, which broke for some formats. It now looks up the asset URL.
- Non-JSON error responses (gateway timeouts) surfaced as JSON parse errors.
- Next.js adapter's compiled ESM imported `./route` without an extension.
- Requests are validated (prompt length, aspect ratio, image size, model, base image size and type) before calling Gemini.
- Blocked prompts now report the block or finish reason instead of "No image generated".
