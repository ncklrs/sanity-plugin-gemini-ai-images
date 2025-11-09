import {useState, useCallback} from 'react'
import {useClient} from 'sanity'
import {uploadImageToSanity} from '../lib/sanity-upload.js'
import type {GenerationMetadata, SanityImageAsset} from '../types.js'

export function useImageUpload() {
  const client = useClient({apiVersion: '2024-01-01'})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = useCallback(
    async (
      imageData: string,
      filename: string,
      metadata?: GenerationMetadata
    ): Promise<SanityImageAsset | null> => {
      setUploading(true)
      setError(null)

      try {
        const asset = await uploadImageToSanity(client, imageData, filename, metadata)
        return asset
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload image'
        setError(errorMessage)
        console.error('Image upload failed:', err)
        return null
      } finally {
        setUploading(false)
      }
    },
    [client]
  )

  return {
    uploadImage,
    uploading,
    error,
  }
}
