import type {SanityClient} from 'sanity'
import type {GenerationMetadata, SanityImageAsset} from '../types.js'

export async function uploadImageToSanity(
  client: SanityClient,
  imageData: string, // Base64
  filename: string,
  metadata?: GenerationMetadata,
  mimeType: string = 'image/png',
): Promise<SanityImageAsset> {
  // Convert base64 to blob
  const extensions: Record<string, string> = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'}
  const extension = extensions[mimeType]
  if (!extension) throw new Error('Unsupported generated image MIME type')
  const blob = base64ToBlob(imageData, mimeType)

  // Upload to Sanity
  const asset = await client.assets.upload('image', blob, {
    filename: `${filename}.${extension}`,
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
