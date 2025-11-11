import {useState, useCallback} from 'react'
import type {SeriesGenerationConfig, SeriesGenerationResult, SeriesImageResult} from '../types.js'
import {buildSeriesPrompt} from '../lib/consistency-prompts.js'

interface UseSeriesGenerationResult {
  generateSeries: (
    basePrompt: string,
    config: SeriesGenerationConfig,
  ) => Promise<SeriesGenerationResult>
  loading: boolean
  progress: number // 0-100
  error: string | null
}

export function useSeriesGeneration(
  apiEndpoint: string,
  apiKey?: string
): UseSeriesGenerationResult {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const generateSeries = useCallback(
    async (
      basePrompt: string,
      config: SeriesGenerationConfig,
    ): Promise<SeriesGenerationResult> => {
      setLoading(true)
      setProgress(0)
      setError(null)

      try {
        const {quantity, variationType, consistencyLevel, baseStylePrompt, variations, aspectRatio, baseImage} =
          config

        if (!variations || variations.length === 0) {
          throw new Error('Variations are required for series generation')
        }

        if (quantity < 2 || quantity > 10) {
          throw new Error('Quantity must be between 2 and 10')
        }

        // Build consistency prompt
        const consistencyPrompt = buildSeriesPrompt(
          basePrompt,
          '',
          consistencyLevel,
          baseStylePrompt,
        ).split('Variation:')[0] // Get just the consistency part

        // Convert base image to base64 if provided
        let baseImageData: string | undefined
        if (baseImage) {
          const reader = new FileReader()
          baseImageData = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string
              // Extract base64 data (remove data:image/...;base64, prefix)
              const base64 = result.split(',')[1]
              resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(baseImage)
          })
        }

        // Make API request with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes

        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }

          if (apiKey) {
            headers['X-API-Key'] = apiKey
          }

          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify({
              prompt: basePrompt,
              aspectRatio,
              baseImage: baseImageData,
              mode: baseImageData ? 'edit' : 'generate',
              series: {
                quantity,
                consistencyPrompt,
                variations: variations.slice(0, quantity),
              },
            }),
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Series generation failed')
          }

          const data = await response.json()

          if (!data.images || data.images.length === 0) {
            throw new Error('No images generated')
          }

          setProgress(100)

          const result: SeriesGenerationResult = {
            images: data.images.map(
              (img: any, index: number): SeriesImageResult => ({
                imageData: img.imageData,
                mimeType: img.mimeType,
                variation: img.variation,
                index: img.index ?? index,
              }),
            ),
            metadata: {
              basePrompt,
              stylePrompt: consistencyPrompt,
              generatedAt: data.metadata?.generatedAt || new Date().toISOString(),
              quantity,
              variationType,
              consistencyLevel,
            },
          }

          return result
        } catch (fetchError) {
          clearTimeout(timeoutId)
          throw fetchError
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Series generation failed'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [apiEndpoint, apiKey],
  )

  return {
    generateSeries,
    loading,
    progress,
    error,
  }
}
