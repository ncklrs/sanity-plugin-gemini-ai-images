/**
 * Gemini image models the handler accepts by default.
 *
 * Keep in sync with `packages/core/src/lib/models.ts`, which drives the Studio UI.
 */
export const GEMINI_IMAGE_MODELS = [
  'gemini-nano-banana-2.1',
  'gemini-3-pro-image',
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-lite-image',
  'gemini-2.5-flash-image',
] as const

export const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-nano-banana-2.1'

export const IMAGE_SIZES = ['1K', '2K', '4K'] as const

export const ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
] as const

/**
 * Parse a comma separated env value such as `GEMINI_ALLOWED_MODELS`.
 * Returns undefined for an empty or missing value.
 */
export function parseList(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  const models = value
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)
  return models.length > 0 ? models : undefined
}
