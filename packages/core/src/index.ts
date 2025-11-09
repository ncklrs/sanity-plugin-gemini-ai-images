import {definePlugin} from 'sanity'
import {createGeminiAssetSource} from './components/GeminiAssetSource'
import type {GeminiPluginConfig} from './types'

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
export type * from './types'

// Export components for advanced usage
export {ImageGeneratorContent} from './components/ImageGeneratorContent'
export {PromptBuilder} from './components/PromptBuilder'
export {PresetTemplates} from './components/PresetTemplates'
export {EditPromptTemplates} from './components/EditPromptTemplates'
export {createGeminiAssetSource} from './components/GeminiAssetSource'

// Export hooks for advanced usage
export {useGeminiGeneration} from './hooks/useGeminiGeneration'
export {useImageUpload} from './hooks/useImageUpload'

// Export utilities
export {uploadImageToSanity} from './lib/sanity-upload'
export {promptTemplates, templateCategories} from './lib/prompt-templates'
export {editPromptTemplates, editTemplateCategories} from './lib/edit-prompt-templates'
