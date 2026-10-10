import {setIfMissing, insert, type SanityClient} from 'sanity'
import type {SanityImageAsset} from '../types.js'
export interface GenerationRecord {
  _id: string
  _type: 'aiGenerationRecord'
  createdAt: string
  prompt: string
  model: string
  asset: {_type: 'reference'; _ref: string}
  assetDocument?:
    SanityImageAsset | {_id: string; _type: 'sanity.fileAsset'; url: string}
  sourceAssetIds?: string[]
  parametersJSON?: string
  title?: string
  alt?: string
  caption?: string
  documentId?: string
}
export async function resolveReferenceAsset(client: SanityClient, id: string) {
  if (!/^image-[a-zA-Z0-9-]+$/.test(id))
    throw new Error('Invalid image asset reference')
  const asset = await client.fetch<{
    _id: string
    url: string
    mimeType: string
  } | null>('*[_id==$id && _type=="sanity.imageAsset"][0]{_id,url,mimeType}', {
    id,
  })
  if (!asset) throw new Error('Image asset not found or access denied')
  return asset
}
export function createGalleryPatches(
  assets: SanityImageAsset[],
  imageType = 'image',
) {
  return [
    setIfMissing([]),
    insert(
      assets.map((asset) => ({
        _type: imageType,
        _key: crypto.randomUUID(),
        asset: {_type: 'reference', _ref: asset._id},
      })),
      'after',
      [-1],
    ),
  ]
}
export async function saveGenerationRecord(
  client: SanityClient,
  input: {
    asset: SanityImageAsset
    prompt: string
    model: string
    sourceAssetIds?: string[]
    parameters?: Record<string, unknown>
    title?: string
    alt?: string
    caption?: string
    documentId?: string
  },
) {
  const {_id: assetId} = input.asset
  const record = {
    _id: `ai-generation-${crypto.randomUUID()}`,
    _type: 'aiGenerationRecord' as const,
    createdAt: new Date().toISOString(),
    prompt: input.prompt,
    model: input.model,
    sourceAssetIds: input.sourceAssetIds ?? [],
    parametersJSON: JSON.stringify(input.parameters ?? {}),
    title: input.title,
    alt: input.alt,
    caption: input.caption,
    documentId: input.documentId,
    asset: {_type: 'reference' as const, _ref: assetId},
  }
  return client.create(record)
}
export async function listGenerationRecords(
  client: SanityClient,
  limit = 50,
): Promise<GenerationRecord[]> {
  const max = Math.min(200, Math.max(1, Math.floor(limit)))
  return client.fetch(
    `*[_type=="aiGenerationRecord"] | order(createdAt desc)[0...${max}]{...,"assetDocument":asset->{_id,_type,url,metadata}}`,
  )
}
export async function deleteGenerationRecord(client: SanityClient, id: string) {
  if (!/^ai-generation-[a-zA-Z0-9-]+$/.test(id))
    throw new Error('Invalid history record ID')
  return client.delete(id)
}
export async function pruneGenerationHistory(client: SanityClient, days = 30) {
  if (!Number.isFinite(days) || days < 1)
    throw new Error('Retention must be at least one day')
  const before = new Date(Date.now() - days * 86400_000).toISOString()
  const ids = await client.fetch<string[]>(
    '*[_type=="aiGenerationRecord" && createdAt<$before]._id',
    {before},
  )
  for (const id of ids) await deleteGenerationRecord(client, id)
  return ids.length
}
export function exportGenerationHistory(records: GenerationRecord[]) {
  return JSON.stringify(
    {
      format: 'sanity-ai-history-v1',
      exportedAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  )
}
