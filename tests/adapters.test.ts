import {beforeEach, describe, expect, it, vi} from 'vitest'

const {generateContent} = vi.hoisted(() => ({generateContent: vi.fn()}))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {generateContent}
  },
}))

const implementations = [
  [
    'Next.js',
    () => import('../packages/adapter-nextjs/src/route').then((m) => m.POST),
  ],
  [
    'serverless',
    () =>
      import('../packages/adapter-serverless/src/index').then((m) => m.handler),
  ],
] as const

describe.each(implementations)('%s generation adapter', (_name, load) => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    vi.stubEnv('GEMINI_PLUGIN_API_KEY', 'test-plugin-key')
    vi.stubEnv('GEMINI_ALLOWED_ORIGINS', '*')
    generateContent.mockReset()
    // Return an image identifying the requested model, exercising actual adapter routing.
    generateContent.mockImplementation(async (request) => ({
      candidates: [
        {
          content: {
            parts: [
              {inlineData: {data: request.model, mimeType: 'image/jpeg'}},
            ],
          },
        },
      ],
    }))
  })

  async function post(body: unknown) {
    const handler = await load()
    return handler(
      new Request('https://example.test/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-plugin-key',
        },
        body: JSON.stringify(body),
      }),
    )
  }

  it('routes a Pro request to the Pro image model', async () => {
    const response = await post({
      prompt: 'A chair',
      model: 'gemini-3-pro-image',
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      imageData: 'gemini-3-pro-image',
      model: 'gemini-3-pro-image',
    })
  })

  it('uses the current efficient model when no model is supplied', async () => {
    const response = await post({prompt: 'A chair'})
    expect(await response.json()).toMatchObject({
      imageData: 'gemini-nano-banana-2.1',
    })
  })

  it('rejects non-image models before generation', async () => {
    const response = await post({
      prompt: 'A chair',
      model: 'gemini-3.1-pro-preview',
    })
    expect(response.status).toBe(400)
  })

  it.each([2.5, null, '3'])(
    'rejects invalid series quantity %s',
    async (quantity) => {
      const response = await post({
        prompt: 'A chair',
        series: {quantity, variations: ['front', 'side', 'back']},
      })
      expect(response.status).toBe(400)
    },
  )

  it('rejects a series with fewer variations than requested', async () => {
    const response = await post({
      prompt: 'A chair',
      series: {quantity: 3, variations: ['front']},
    })
    expect(response.status).toBe(400)
  })

  it('uses the chosen Flash model for every image in a series', async () => {
    const response = await post({
      prompt: 'A chair',
      model: 'gemini-3.1-flash-image',
      series: {quantity: 2, variations: ['front', 'side']},
    })
    const result = await response.json()
    expect(
      result.images.map((image: {imageData: string}) => image.imageData),
    ).toEqual(['gemini-3.1-flash-image', 'gemini-3.1-flash-image'])
    expect(result.metadata.model).toBe('gemini-3.1-flash-image')
  })

  it('preserves JPEG references during editing', async () => {
    generateContent.mockImplementation(async (request) => ({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: request.contents[0].parts[0].inlineData.mimeType,
                  mimeType: 'image/png',
                },
              },
            ],
          },
        },
      ],
    }))
    const response = await post({
      prompt: 'Make it blue',
      mode: 'edit',
      baseImage: 'YQ==',
      baseImageMimeType: 'image/jpeg',
    })
    expect(await response.json()).toMatchObject({imageData: 'image/jpeg'})
  })

  it('rejects editing without a reference image', async () => {
    expect((await post({prompt: 'Make it blue', mode: 'edit'})).status).toBe(
      400,
    )
  })

  it('returns partial failures alongside successful images', async () => {
    generateContent.mockRejectedValueOnce(new Error('Quota exceeded'))
    const response = await post({
      prompt: 'A chair',
      series: {quantity: 2, variations: ['front', 'side']},
    })
    const result = await response.json()
    expect(result.images).toHaveLength(1)
    expect(result.errors).toMatchObject([{index: 0, variation: 'front'}])
    expect(result.metadata.failed).toBe(1)
  })
})

it('permits API-key headers in serverless preflight and includes CORS on errors', async () => {
  const {handler} = await import('../packages/adapter-serverless/src/index')
  const preflight = await handler(
    new Request('https://example.test', {method: 'OPTIONS'}),
  )
  expect(
    preflight.headers.get('Access-Control-Allow-Headers')?.toLowerCase(),
  ).toContain('x-api-key')
  const error = await handler(
    new Request('https://example.test', {
      method: 'POST',
      headers: {'X-API-Key': 'test-plugin-key'},
      body: '{}',
    }),
  )
  expect(error.headers.get('Access-Control-Allow-Origin')).toBe('*')
})
