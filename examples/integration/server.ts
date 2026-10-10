// Node-only. Import this module from a server route, never from sanity.config.ts.
import {
  createSanityAuthorizer,
  createSanityMediaHandlers,
} from 'sanity-plugin-gemini-ai-images-engine'
const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Set ${name}`)
  return value
}
const projectId = required('SANITY_PROJECT_ID'),
  dataset = required('SANITY_DATASET')
export const media = createSanityMediaHandlers({
  sanity: {projectId, dataset, token: required('SANITY_API_TOKEN')},
  // This private dataset must be inaccessible to Studio editor mutations.
  stateSanity: {
    projectId,
    dataset: required('SANITY_AI_STATE_DATASET'),
    token: required('SANITY_AI_STATE_TOKEN'),
  },
  geminiApiKey: process.env.GEMINI_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  authorize: createSanityAuthorizer({
    projectId,
    dataset,
    allowVideo: process.env.ENABLE_VIDEO === 'true',
  }),
  enableVideo: process.env.ENABLE_VIDEO === 'true',
  origins: required('STUDIO_ORIGINS')
    .split(',')
    .map((value) => value.trim()),
  limits: {dailyImages: 50, projectDailyImages: 500, perMinute: 10},
  policy: {
    maxQuantity: 6,
    allowedModels: [
      'gemini-3-pro-image',
      'gemini-3.1-flash-image',
      'gpt-image-2.5-sunburst',
      'gpt-image-2.5-flare',
    ],
    allowGrounding: true,
  },
  instructions: 'Follow the editorial brand guide. Do not add watermarks.',
  // Set prices in USD/output (images) or USD/second (video) from your contract.
  // prices: {...}, limits: {..., dailyUsd:10}, maxEstimatedCostUsd:2,
  // Metadata suggestions are opt-in: supply an authenticated server callback.
  // suggestMetadata: async ({assetId,prompt},principal) => ({alt:...,caption:...}),
})
