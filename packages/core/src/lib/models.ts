import type {ImageModelOption} from '../types.js'

/**
 * Gemini image models known to the plugin.
 *
 * Keep in sync with `packages/adapter-serverless/src/models.ts`, which controls
 * what the server accepts.
 */
export const geminiImageModels: ImageModelOption[] = [
  {
    id: 'gemini-nano-banana-2.1',
    title: 'Nano Banana 2.1',
    description: 'Latest fast model. Good default for most images and edits.',
    imageSizes: ['1K', '2K', '4K'],
  },
  {
    id: 'gemini-3-pro-image',
    title: 'Nano Banana Pro',
    description: 'Highest quality, best text rendering. Slower and more expensive.',
    imageSizes: ['1K', '2K', '4K'],
  },
  {
    id: 'gemini-3.1-flash-image',
    title: 'Nano Banana 2',
    description: 'Previous fast model.',
    imageSizes: ['1K', '2K', '4K'],
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    title: 'Nano Banana 2 Lite',
    description: 'Lowest cost and latency.',
  },
  {
    id: 'gemini-2.5-flash-image',
    title: 'Nano Banana (legacy)',
    description: 'Original model, kept for compatibility.',
  },
]

export const DEFAULT_IMAGE_MODEL = 'gemini-nano-banana-2.1'

/**
 * Resolve the `models` plugin option into full model options.
 * Strings matching a known model pick up its title and capabilities.
 */
export function resolveModels(models?: Array<string | ImageModelOption>): ImageModelOption[] {
  if (!models || models.length === 0) return geminiImageModels
  return models.map((model) => {
    if (typeof model !== 'string') return model
    return geminiImageModels.find((known) => known.id === model) ?? {id: model, title: model}
  })
}

/** Pick the configured default, falling back to the first available model */
export function resolveDefaultModel(models: ImageModelOption[], defaultModel?: string): string {
  if (defaultModel && models.some((model) => model.id === defaultModel)) return defaultModel
  if (models.some((model) => model.id === DEFAULT_IMAGE_MODEL)) return DEFAULT_IMAGE_MODEL
  return models[0]?.id ?? DEFAULT_IMAGE_MODEL
}
