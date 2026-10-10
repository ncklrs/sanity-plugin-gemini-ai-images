import {useState, useCallback} from 'react'
import type {SeriesGenerationConfig, SeriesGenerationResult, SeriesImageResult} from '../types.js'
import {consistencyPrompts} from '../lib/consistency-prompts.js'
import {blobToBase64, postGeneration} from '../lib/api.js'

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
        const {
          quantity,
          variationType,
          consistencyLevel,
          baseStylePrompt,
          variations,
          aspectRatio,
          baseImage,
          model,
          imageSize,
        } = config

        if (!variations || variations.length === 0) {
          throw new Error('Variations are required for series generation')
        }

        if (quantity < 2 || quantity > 10) {
          throw new Error('Quantity must be between 2 and 10')
        }

        // The server combines the base prompt, this consistency guidance, and each variation
        const consistencyPrompt = [
          consistencyPrompts[consistencyLevel],
          baseStylePrompt ? `Style anchor: ${baseStylePrompt}` : '',
        ]
          .filter(Boolean)
          .join('. ')

        const reference = baseImage ? await blobToBase64(baseImage) : undefined

        // Series run sequentially on the server, so allow roughly a minute per image
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), Math.max(120_000, quantity * 60_000))

        try {
          const data = await postGeneration<any>(
            apiEndpoint,
            {
              prompt: basePrompt,
              model,
              aspectRatio,
              imageSize,
              baseImage: reference?.data,
              baseImageMimeType: reference?.mimeType,
              mode: reference ? 'edit' : 'generate',
              series: {
                quantity,
                consistencyPrompt,
                variations: variations.slice(0, quantity),
              },
            },
            {apiKey, signal: controller.signal, fallbackError: 'Series generation failed'},
          )

          clearTimeout(timeoutId)

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
              model: data.metadata?.model ?? model,
            },
          }

          return result
        } catch (fetchError) {
          clearTimeout(timeoutId)
          if (controller.signal.aborted) {
            throw new Error('Series generation timed out. Try fewer images or a faster model.')
          }
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
