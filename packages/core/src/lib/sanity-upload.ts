import type {SanityClient} from 'sanity'
import type {GenerationMetadata, SanityImageAsset} from '../types.js'

export async function uploadImageToSanity(
  client: SanityClient,
  imageData: string, // Base64
  filename: string,
  metadata?: GenerationMetadata
): Promise<SanityImageAsset> {
  // Convert base64 to blob
  const blob = base64ToBlob(imageData, 'image/png')

  // Upload to Sanity
  const asset = await client.assets.upload('image', blob, {
    filename: `${filename}.png`,
    title: filename,
    description: metadata?.prompt,
  })

  return asset as SanityImageAsset
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64)
  const arrayBuffer = new ArrayBuffer(byteString.length)
  const uint8Array = new Uint8Array(arrayBuffer)

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i)
  }

  return new Blob([arrayBuffer], {type: mimeType})
}
