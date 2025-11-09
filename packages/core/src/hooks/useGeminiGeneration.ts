import {useState, useCallback} from 'react'
import type {ImageConfig, ImageResult} from '../types'

/**
 * Hook for generating and editing images using Gemini API
 * Makes server-side requests to the configured API endpoint
 */
export function useGeminiGeneration(apiEndpoint: string = '/api/gemini/generate-image') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateImage = useCallback(
    async (prompt: string, config?: ImageConfig): Promise<ImageResult | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            aspectRatio: config?.aspectRatio,
            mode: 'generate',
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate image')
        }

        const result = await response.json()
        return result as ImageResult
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate image'
        setError(errorMessage)
        console.error('Image generation failed:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [apiEndpoint]
  )

  const editImage = useCallback(
    async (
      baseImage: File | Blob,
      prompt: string,
      config?: ImageConfig
    ): Promise<ImageResult | null> => {
      setLoading(true)
      setError(null)

      try {
        // Convert image to base64
        const base64Image = await fileToBase64(baseImage)

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            aspectRatio: config?.aspectRatio,
            mode: 'edit',
            baseImage: base64Image,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to edit image')
        }

        const result = await response.json()
        return result as ImageResult
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to edit image'
        setError(errorMessage)
        console.error('Image editing failed:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [apiEndpoint]
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
