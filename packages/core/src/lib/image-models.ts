import {modelCatalog} from 'sanity-plugin-gemini-ai-images-contracts'
export const imageModels = modelCatalog
// Retained export name for source compatibility; now includes OpenAI image models.
export type GeminiImageModel = (typeof modelCatalog)[number]['id']
export {defaultImageModel} from 'sanity-plugin-gemini-ai-images-contracts'
