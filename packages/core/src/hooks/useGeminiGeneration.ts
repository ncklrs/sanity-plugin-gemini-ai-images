import {useState, useCallback} from 'react'
import {blobToBase64, postGeneration} from '../lib/api.js'
import type {ImageConfig, ImageResult} from '../types.js'

/**
 * Hook for generating and editing images using Gemini API
 * Makes server-side requests to the configured API endpoint
 */
export function useGeminiGeneration(
  apiEndpoint: string = '/api/gemini/generate-image',
  apiKey?: string
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (
      fallbackError: string,
      buildBody: () => Promise<Parameters<typeof postGeneration>[1]>,
    ): Promise<ImageResult | null> => {
      setLoading(true)
      setError(null)
      try {
        return await postGeneration<ImageResult>(apiEndpoint, await buildBody(), {apiKey, fallbackError})
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : fallbackError
        setError(errorMessage)
        console.error(`${fallbackError}:`, err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [apiEndpoint, apiKey]
  )

  const generateImage = useCallback(
    (prompt: string, config?: ImageConfig): Promise<ImageResult | null> =>
      run('Failed to generate image', async () => ({
        prompt,
        model: config?.model,
        aspectRatio: config?.aspectRatio,
        imageSize: config?.imageSize,
        mode: 'generate',
      })),
    [run]
  )

  const editImage = useCallback(
    (baseImage: File | Blob, prompt: string, config?: ImageConfig): Promise<ImageResult | null> =>
      run('Failed to edit image', async () => {
        const {data, mimeType} = await blobToBase64(baseImage)
        return {
          prompt,
          model: config?.model,
          aspectRatio: config?.aspectRatio,
          imageSize: config?.imageSize,
          mode: 'edit',
          baseImage: data,
          baseImageMimeType: mimeType,
        }
      }),
    [run]
  )

  return {
    generateImage,
    editImage,
    loading,
    error,
  }
}
