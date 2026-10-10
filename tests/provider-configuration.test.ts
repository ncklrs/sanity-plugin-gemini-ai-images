import {expect, it, vi} from 'vitest'
const sdk = vi.hoisted(() => ({options: [] as any[], generateContent: vi.fn()}))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {generateContent: sdk.generateContent}
    constructor(options: unknown) {
      sdk.options.push(options)
    }
  },
}))
import {createProviders, ProviderError} from '../packages/engine/src/providers'
import {generateOne} from '../packages/engine/src/generation'
import {normalizeImageRequest} from '../packages/contracts/src/index'
it('uses Vertex project/region ADC configuration with the shared image contract', async () => {
  sdk.generateContent.mockResolvedValueOnce({
    candidates: [
      {
        content: {
          parts: [{inlineData: {data: 'YQ==', mimeType: 'image/webp'}}],
        },
      },
    ],
  })
  const providers = createProviders({
    vertex: {project: 'cloud-project', location: 'us-central1'},
  })
  const result = await providers.gemini!.generate(
    normalizeImageRequest({
      prompt: 'chair',
      model: 'gemini-3-pro-image',
      resolution: '2K',
    }),
  )
  expect(sdk.options[0]).toEqual({
    vertexai: true,
    project: 'cloud-project',
    location: 'us-central1',
  })
  expect(sdk.generateContent.mock.calls[0][0]).toMatchObject({
    model: 'gemini-3-pro-image',
    config: {imageConfig: {imageSize: '2K'}},
  })
  expect(result.mimeType).toBe('image/webp')
})
it('retries an explicitly rejected rate-limited call within the configured bound', async () => {
  const generate = vi
    .fn()
    .mockRejectedValueOnce(
      new ProviderError('Rate limited', 'rate_limited', 429, true),
    )
    .mockResolvedValueOnce({
      imageData: 'YQ==',
      mimeType: 'image/png',
      model: 'gemini-3-pro-image',
    })
  const result = await generateOne(
    normalizeImageRequest({prompt: 'chair', model: 'gemini-3-pro-image'}),
    {providers: {gemini: {generate}}, maxRetries: 1},
  )
  expect(result.model).toBe('gemini-3-pro-image')
  expect(generate).toHaveBeenCalledTimes(2)
})
it('reports a Gemini safety block without silently changing models', async () => {
  sdk.generateContent.mockResolvedValueOnce({
    promptFeedback: {blockReason: 'SAFETY'},
  })
  const provider = createProviders({geminiApiKey: 'fixture'}).gemini!
  await expect(
    provider.generate(normalizeImageRequest({prompt: 'chair'})),
  ).rejects.toMatchObject({code: 'safety_block', status: 422})
})
