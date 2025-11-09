import {definePlugin} from 'sanity'
import {createGeminiAssetSource} from './components/GeminiAssetSource.js'
import type {GeminiPluginConfig} from './types.js'

/**
 * Gemini AI Image Generator Plugin
 *
 * This plugin adds AI-powered image generation capabilities to the Sanity Studio image picker.
 * When users click on an image field, they'll see "AI Generator" as an option alongside
 * Upload, Unsplash, Media, etc.
 *
 * Features:
 * - Text-to-image generation
 * - Prompt templates and builder
 * - Multiple aspect ratios
 * - Direct upload to Sanity assets
 *
 * Configuration:
 * - apiEndpoint: API endpoint for image generation (default: '/api/gemini/generate-image')
 * - You must implement the backend API route (see adapter packages)
 */
export const geminiAIImages = definePlugin<GeminiPluginConfig | void>((config) => {
  const apiEndpoint = config?.apiEndpoint || '/api/gemini/generate-image'

  return {
    name: 'sanity-plugin-gemini-ai-images',
    form: {
      image: {
        assetSources: (previousAssetSources) => {
          // Add Gemini AI Generator to the list of asset sources
          return [...previousAssetSources, createGeminiAssetSource(apiEndpoint)]
        },
      },
    },
  }
})

// Export types for users
export type * from './types.js'

// Export components for advanced usage
export {ImageGeneratorContent} from './components/ImageGeneratorContent.js'
export {PromptBuilder} from './components/PromptBuilder.js'
export {PresetTemplates} from './components/PresetTemplates.js'
export {EditPromptTemplates} from './components/EditPromptTemplates.js'
export {createGeminiAssetSource} from './components/GeminiAssetSource.js'

// Export hooks for advanced usage
export {useGeminiGeneration} from './hooks/useGeminiGeneration.js'
export {useImageUpload} from './hooks/useImageUpload.js'

// Export utilities
export {uploadImageToSanity} from './lib/sanity-upload.js'
export {promptTemplates, templateCategories} from './lib/prompt-templates.js'
export {editPromptTemplates, editTemplateCategories} from './lib/edit-prompt-templates.js'
