import {definePlugin} from 'sanity'
import {createElement} from 'react'
import {createGeminiAssetSource} from './components/GeminiAssetSource.js'
import {ImageStudioTool} from './components/standalone/ImageStudioTool.js'
import {AIImageIcon} from './components/ui/compat.js'
import {resolveModels} from './lib/models.js'
import type {GeminiPluginConfig, GeneratorSettings} from './types.js'

/**
 * Gemini AI Image Generator Plugin
 *
 * This plugin adds AI-powered image generation capabilities to the Sanity Studio image picker.
 * When users click on an image field, they'll see "AI Generator" as an option alongside
 * Upload, Unsplash, Media, etc.
 *
 * Features:
 * - Text-to-image generation
 * - Image series generation with congruency
 * - Prompt templates and builder
 * - Multiple aspect ratios
 * - Direct upload to Sanity assets
 * - Optional standalone generation tool
 *
 * Configuration:
 * - apiEndpoint: API endpoint for image generation (default: '/api/gemini/generate-image')
 * - models: Models shown in the model picker (default: all built-in Gemini image models)
 * - defaultModel: Model selected by default (default: 'gemini-nano-banana-2.1')
 * - enableStandaloneTool: Add dedicated image generation tool to Studio (default: false)
 * - maxSeriesQuantity: Maximum images in a series (default: 10)
 * - defaultConsistencyLevel: Default consistency for series (default: 'moderate')
 * - You must implement the backend API route (see adapter packages)
 */
export const geminiAIImages = definePlugin<GeminiPluginConfig | void>((config) => {
  const settings: GeneratorSettings = {
    apiEndpoint: config?.apiEndpoint || '/api/gemini/generate-image',
    apiKey: config?.apiKey,
    models: resolveModels(config?.models),
    defaultModel: config?.defaultModel,
    maxSeriesQuantity: config?.maxSeriesQuantity,
    defaultConsistencyLevel: config?.defaultConsistencyLevel,
  }
  const enableStandaloneTool = config?.enableStandaloneTool ?? false

  return {
    name: 'sanity-plugin-gemini-ai-images',
    form: {
      image: {
        assetSources: (previousAssetSources) => {
          // Add Gemini AI Generator to the list of asset sources
          return [...previousAssetSources, createGeminiAssetSource(settings)]
        },
      },
    },
    tools: (() => {
      if (!enableStandaloneTool) return []

      return [
        {
          name: 'ai-image-studio',
          title: 'AI Image Studio',
          icon: AIImageIcon,
          component: () => createElement(ImageStudioTool, settings),
        },
      ]
    })(),
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
export {GenerationSettings} from './components/GenerationSettings.js'

// Export series components
export {SeriesConfigPanel} from './components/series/SeriesConfigPanel.js'
export {VariationTemplates} from './components/series/VariationTemplates.js'
export {SeriesPreview} from './components/series/SeriesPreview.js'

// Export standalone tool components
export {ImageStudioTool} from './components/standalone/ImageStudioTool.js'
export {GenerationHistory} from './components/standalone/GenerationHistory.js'
export {BulkAssetUpload} from './components/standalone/BulkAssetUpload.js'

// Export field integration components
export {ImageObjectInput} from './components/field/ImageObjectInput.js'
export {InlineGenerator} from './components/field/InlineGenerator.js'

// Export hooks for advanced usage
export {useGeminiGeneration} from './hooks/useGeminiGeneration.js'
export {useImageUpload} from './hooks/useImageUpload.js'
export {useSeriesGeneration} from './hooks/useSeriesGeneration.js'
export {useBatchUpload} from './hooks/useBatchUpload.js'
export {useGenerationSession} from './hooks/useGenerationSession.js'

// Export utilities
export {geminiImageModels, resolveModels, DEFAULT_IMAGE_MODEL} from './lib/models.js'
export {uploadImageToSanity} from './lib/sanity-upload.js'
export {promptTemplates, templateCategories} from './lib/prompt-templates.js'
export {editPromptTemplates, editTemplateCategories} from './lib/edit-prompt-templates.js'
export {variationTemplates, getVariationsByType, getAllVariationTemplates, getVariationTemplate} from './lib/variation-templates.js'
export {consistencyPrompts, getConsistencyPrompt, buildSeriesPrompt} from './lib/consistency-prompts.js'
