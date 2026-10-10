import {expect, it, vi} from 'vitest'
vi.mock('sanity', () => ({
  setIfMissing: (value: unknown) => ({type: 'setIfMissing', value, path: []}),
  insert: (items: unknown[], position: string, path: unknown[]) => ({
    type: 'insert',
    items,
    position,
    path,
  }),
}))
import {
  createGalleryPatches,
  resolveReferenceAsset,
  saveGenerationRecord,
  listGenerationRecords,
  deleteGenerationRecord,
} from '../packages/core/src/lib/editorial'

it('inserts gallery assets with stable keys and leaves existing values intact', () => {
  const patches = createGalleryPatches([
    {_id: 'image-new', _type: 'sanity.imageAsset', url: 'https://cdn.test/new'},
  ]) as any[]
  expect(patches[0]).toMatchObject({type: 'setIfMissing', value: []})
  expect(patches[1]).toMatchObject({
    type: 'insert',
    position: 'after',
    path: [-1],
    items: [{_type: 'image', asset: {_type: 'reference', _ref: 'image-new'}}],
  })
  expect(patches[1].items[0]._key).toBeTruthy()
})
it('resolves the asset document instead of constructing a format-specific URL', async () => {
  const client = {
    fetch: vi.fn(async () => ({
      _id: 'image-webp',
      url: 'https://cdn.sanity.io/images/p/d/asset.webp',
      mimeType: 'image/webp',
    })),
  }
  expect(
    await resolveReferenceAsset(client as never, 'image-webp'),
  ).toMatchObject({mimeType: 'image/webp'})
  expect(client.fetch).toHaveBeenCalledWith(
    expect.stringContaining('_id==$id'),
    {id: 'image-webp'},
  )
})
it('records the actual model, prompt, source IDs and saved asset reference without base64', async () => {
  const client = {create: vi.fn(async (d) => d)}
  const record = await saveGenerationRecord(client as never, {
    asset: {_id: 'image-new'} as never,
    prompt: 'chair',
    model: 'gemini-3-pro-image',
    sourceAssetIds: ['image-source'],
    parameters: {resolution: '2K'},
  })
  expect(record).toMatchObject({
    _type: 'aiGenerationRecord',
    asset: {_ref: 'image-new'},
    model: 'gemini-3-pro-image',
    sourceAssetIds: ['image-source'],
  })
  expect(JSON.stringify(record)).not.toContain('imageData')
})
it('scopes history through the provided project client and deletes records without deleting assets', async () => {
  const client = {fetch: vi.fn(async () => []), delete: vi.fn(async () => ({}))}
  await listGenerationRecords(client as never)
  await deleteGenerationRecord(client as never, 'ai-generation-record')
  expect(client.fetch.mock.calls[0][0]).toContain('aiGenerationRecord')
  expect(client.delete).toHaveBeenCalledWith('ai-generation-record')
})

it('inserts named image members using their schema type', () => {
  const patches = createGalleryPatches(
    [
      {
        _id: 'image-new',
        _type: 'sanity.imageAsset',
        url: 'https://cdn.test/new',
      },
    ],
    'galleryImage',
  ) as any[]
  expect(patches[1].items[0]._type).toBe('galleryImage')
})
