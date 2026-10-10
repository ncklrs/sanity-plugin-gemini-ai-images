import {useState, useCallback} from 'react'
import {useClient} from 'sanity'
import type {SanityImageAsset, GenerationMetadata} from '../types.js'
import {uploadImageToSanity} from '../lib/sanity-upload.js'

interface UploadProgress {
  completed: number
  total: number
  percentage: number
}

interface UseBatchUploadResult {
  uploadBatchWithResults: (
    images: Array<{imageData: string; mimeType: string}>,
    metadata?: GenerationMetadata[],
  ) => Promise<BatchUploadResult>
  uploadBatch: (
    images: Array<{imageData: string; mimeType: string}>,
    metadata?: GenerationMetadata[],
  ) => Promise<SanityImageAsset[]>
  uploading: boolean
  uploadProgress: UploadProgress
  errors: Array<{index: number; error: string}>
}

export interface BatchUploadResult {
  assets: SanityImageAsset[]
  successfulIndices: number[]
  errors: Array<{index: number; error: string}>
}

export function useBatchUpload(): UseBatchUploadResult {
  const client = useClient({apiVersion: '2024-01-01'})
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    completed: 0,
    total: 0,
    percentage: 0,
  })
  const [errors, setErrors] = useState<Array<{index: number; error: string}>>(
    [],
  )

  const uploadBatchWithResults = useCallback(
    async (
      images: Array<{imageData: string; mimeType: string}>,
      metadata?: GenerationMetadata[],
    ): Promise<BatchUploadResult> => {
      setUploading(true)
      setUploadProgress({
        completed: 0,
        total: images.length,
        percentage: 0,
      })
      setErrors([])

      const uploadedAssets: SanityImageAsset[] = []
      const successfulIndices: number[] = []
      const uploadErrors: Array<{index: number; error: string}> = []

      try {
        // Upload images sequentially to avoid overwhelming the API
        for (let i = 0; i < images.length; i++) {
          try {
            const image = images[i]
            const timestamp = Date.now()
            const filename = `gemini-series-${timestamp}-${i + 1}`

            const asset = await uploadImageToSanity(
              client,
              image.imageData,
              filename,
              metadata?.[i],
              image.mimeType,
            )

            uploadedAssets.push(asset)
            successfulIndices.push(i)
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Upload failed'
            uploadErrors.push({
              index: i,
              error: errorMessage,
            })
          } finally {
            setUploadProgress({
              completed: i + 1,
              total: images.length,
              percentage: Math.round(((i + 1) / images.length) * 100),
            })
          }
        }

        if (uploadErrors.length > 0) {
          setErrors(uploadErrors)
        }

        return {assets: uploadedAssets, successfulIndices, errors: uploadErrors}
      } finally {
        setUploading(false)
      }
    },
    [client],
  )

  const uploadBatch = useCallback(
    async (
      images: Array<{imageData: string; mimeType: string}>,
      metadata?: GenerationMetadata[],
    ) => (await uploadBatchWithResults(images, metadata)).assets,
    [uploadBatchWithResults],
  )

  return {
    uploadBatch,
    uploadBatchWithResults,
    uploading,
    uploadProgress,
    errors,
  }
}
