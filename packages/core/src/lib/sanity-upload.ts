import type {SanityClient} from 'sanity'
import type {GenerationMetadata, SanityImageAsset} from '../types.js'

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function uploadImageToSanity(
  client: SanityClient,
  imageData: string, // Base64
  filename: string,
  metadata?: GenerationMetadata,
  mimeType: string = 'image/png',
): Promise<SanityImageAsset> {
  const blob = base64ToBlob(imageData, mimeType)
  const extension = EXTENSIONS[mimeType] ?? 'png'

  const asset = await client.assets.upload('image', blob, {
    filename: `${filename}.${extension}`,
    title: filename,
    description: metadata?.prompt,
    creditLine: metadata?.model ? `Generated with ${metadata.model}` : undefined,
  })

  return asset as SanityImageAsset
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i)
  }
  return new Blob([bytes], {type: mimeType})
}
