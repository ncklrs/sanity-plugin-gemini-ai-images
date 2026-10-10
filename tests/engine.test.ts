import {expect, it, vi} from 'vitest'
import {createGenerationHandler} from '../packages/engine/src/http'
import {GeminiProvider, OpenAIProvider} from '../packages/engine/src/providers'
import {normalizeImageRequest} from '../packages/contracts/src/index'

const image = {
  imageData: 'YQ==',
  mimeType: 'image/png',
  model: 'gemini-3-pro-image',
} as const
const provider = () => ({generate: vi.fn(async () => image)})
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://host.test/images', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...headers},
    body: JSON.stringify(body),
  })
it('denies anonymous requests before calling the provider', async () => {
  const p = provider()
  const h = createGenerationHandler({providers: {gemini: p}})
  expect((await h(post({prompt: 'test'}))).status).toBe(401)
  expect(p.generate).not.toHaveBeenCalled()
})
it('denies exhausted quota and unsupported models before calling Gemini', async () => {
  const p = provider()
  const h = createGenerationHandler({
    providers: {gemini: p},
    authorize: async () => ({id: 'editor'}),
    policy: {allowedModels: ['gemini-3-pro-image']},
    budget: {
      reserve: async () => {
        throw new Error('Daily quota exceeded')
      },
    },
  })
  expect((await h(post({prompt: 'test'}))).status).toBe(400)
  expect(
    (await h(post({prompt: 'test', model: 'gemini-3-pro-image'}))).status,
  ).toBe(429)
  expect(p.generate).not.toHaveBeenCalled()
})
it('streams body limits and applies CORS to failure responses', async () => {
  const p = provider()
  const h = createGenerationHandler({
    providers: {gemini: p},
    authorize: async () => ({id: 'editor'}),
    maxBodyBytes: 40,
    origins: ['https://studio.test'],
  })
  const r = await h(
    post({prompt: 'x'.repeat(100)}, {Origin: 'https://studio.test'}),
  )
  expect(r.status).toBe(413)
  expect(r.headers.get('Access-Control-Allow-Origin')).toBe(
    'https://studio.test',
  )
  expect(p.generate).not.toHaveBeenCalled()
  expect(
    (await h(post({prompt: 'test'}, {Origin: 'https://evil.test'}))).status,
  ).toBe(403)
})
it('limits concurrency, preserves partial results and never retries an ambiguous timeout', async () => {
  const p = provider()
  p.generate.mockRejectedValueOnce(new Error('socket disconnected'))
  const h = createGenerationHandler({
    providers: {gemini: p},
    authorize: async () => ({id: 'editor'}),
    concurrency: 1,
  })
  const r = await h(
    post({prompt: 'test', series: {quantity: 3, variations: ['a', 'b', 'c']}}),
  )
  expect(r.status).toBe(207)
  expect((await r.json()).images).toHaveLength(2)
  expect(p.generate).toHaveBeenCalledTimes(3)
})
it('sends references, resolution and grounding to Gemini', async () => {
  const generateContent = vi.fn(async () => ({
    candidates: [
      {content: {parts: [{inlineData: {data: 'YQ==', mimeType: 'image/png'}}]}},
    ],
    usageMetadata: {totalTokenCount: 20},
  }))
  const p = new GeminiProvider({models: {generateContent}} as never)
  await p.generate(
    normalizeImageRequest({
      prompt: 'test',
      model: 'gemini-3-pro-image',
      resolution: '2K',
      grounding: true,
      references: [{data: 'YQ==', mimeType: 'image/jpeg', role: 'product'}],
    }),
  )
  expect(generateContent.mock.calls[0][0]).toMatchObject({
    model: 'gemini-3-pro-image',
    config: {imageConfig: {imageSize: '2K'}, tools: [{googleSearch: {}}]},
  })
})
it('uses OpenAI multipart edits with role-labelled prompt and image bytes', async () => {
  const transport = vi.fn(async () =>
    Response.json({data: [{b64_json: 'YQ=='}], usage: {output_tokens: 10}}),
  )
  const p = new OpenAIProvider('test-key', transport as never)
  const output = await p.generate(
    normalizeImageRequest({
      prompt: 'blue',
      model: 'gpt-image-2.5-sunburst',
      references: [{data: 'YQ==', mimeType: 'image/jpeg', role: 'product'}],
    }),
  )
  expect(transport.mock.calls[0][0]).toContain('/images/edits')
  const init = transport.mock.calls[0][1] as RequestInit
  expect((init.body as FormData).get('model')).toBe('gpt-image-2.5-sunburst')
  expect((init.body as FormData).get('image[]')).toBeInstanceOf(File)
  expect(output).toMatchObject({
    mimeType: 'image/png',
    usage: {output_tokens: 10},
  })
})

it('rejects anchor requests on the synchronous endpoint before reserving or billing', async () => {
  const p = provider(),
    budget = {reserve: vi.fn(async () => {})}
  const h = createGenerationHandler({
    providers: {gemini: p},
    authorize: async () => ({id: 'editor'}),
    budget,
  })
  expect(
    (
      await h(
        post({
          prompt: 'chair',
          series: {quantity: 2, variations: ['a', 'b'], anchor: true},
        }),
      )
    ).status,
  ).toBe(400)
  expect(budget.reserve).not.toHaveBeenCalled()
  expect(p.generate).not.toHaveBeenCalled()
})
it('enforces configured cost ceilings before paid calls or reservations', async () => {
  const p = provider(),
    budget = {reserve: vi.fn(async () => {})}
  const h = createGenerationHandler({
    providers: {gemini: p},
    authorize: async () => ({id: 'editor'}),
    budget,
    prices: {'gemini-3-pro-image': 0.1},
    maxEstimatedCostUsd: 0.2,
  })
  const response = await h(
    post({
      prompt: 'chair',
      model: 'gemini-3-pro-image',
      series: {quantity: 3, variations: ['a', 'b', 'c']},
    }),
  )
  expect(response.status).toBe(429)
  expect(p.generate).not.toHaveBeenCalled()
  expect(budget.reserve).not.toHaveBeenCalled()
})
