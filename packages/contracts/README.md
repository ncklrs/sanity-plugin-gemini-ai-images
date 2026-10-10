# Sanity AI image contracts

Browser-safe TypeScript models and validation shared by the Studio and server engine. Exports model capabilities, image/video request normalizers, request/output types and `RequestError`. No provider SDKs, credentials, or server imports.

`normalizeImageRequest` accepts the legacy prompt/model/aspectRatio/baseImage/series request shape and the extended resolution/reference-role/grounding/brand-preset fields. Server `RequestPolicy` independently restricts models, quantity and grounding. Asset references require a user-authorized server resolver; aggregate byte limits are rechecked after resolution.
