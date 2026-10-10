import {mediaRequest, type RequestHeaders} from '../lib/request.js'
import {useState, useCallback} from 'react'
import type {ImageConfig, ImageResult} from '../types.js'

/**
 * Hook for generating and editing images using Gemini API
 * Makes server-side requests to the configured API endpoint
 */
export function useGeminiGeneration(
  apiEndpoint: string = '/api/gemini/generate-image',
  apiKey?: string,
  getHeaders?: RequestHeaders,
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateImage = useCallback(
    async (
      prompt: string,
      config?: ImageConfig,
    ): Promise<ImageResult | null> => {
      setLoading(true)
      setError(null)

      try {
        const result = await mediaRequest(
          apiEndpoint,
          {prompt, ...config, mode: 'generate'},
          apiKey,
          getHeaders,
        )
        return result as ImageResult
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate image'
        setError(errorMessage)
        console.error('Image generation failed:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [apiEndpoint, apiKey, getHeaders],
  )

  const editImage = useCallback(
    async (
      baseImage: File | Blob,
      prompt: string,
      config?: ImageConfig,
    ): Promise<ImageResult | null> => {
      setLoading(true)
      setError(null)

      try {
        // Convert image to base64
        const base64Image = await fileToBase64(baseImage)

        const result = await mediaRequest(
          apiEndpoint,
          {
            prompt,
            ...config,
            mode: 'edit',
            baseImage: base64Image,
            baseImageMimeType: baseImage.type,
          },
          apiKey,
          getHeaders,
        )
        return result as ImageResult
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to edit image'
        setError(errorMessage)
        console.error('Image editing failed:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [apiEndpoint, apiKey, getHeaders],
  )

  return {
    generateImage,
    editImage,
    loading,
    error,
  }
}

/**
 * Helper function to convert File/Blob to base64
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      if (!base64) {
        reject(new Error('Failed to read file as base64'))
        return
      }
      // Remove data:image/png;base64, prefix
      const base64Data = base64.split(',')[1]
      if (!base64Data) {
        reject(new Error('Invalid base64 data'))
        return
      }
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
