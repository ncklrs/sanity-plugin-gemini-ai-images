import {afterEach, describe, expect, it, vi} from 'vitest'
import {createImageHandler} from '../src/handler.js'
import type {ImageGenerationRequest, ImageProvider} from '../src/providers/types.js'

function mockProvider(impl?: (request: ImageGenerationRequest) => Promise<{imageData: string; mimeType: string}>) {
  const generate = vi.fn(impl ?? (async () => ({imageData: 'aW1n', mimeType: 'image/png'})))
  const provider: ImageProvider = {name: 'mock', generate}
  return {provider, generate}
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/gemini/generate-image', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...headers},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createImageHandler', () => {
  it('generates a single image with the default model', async () => {
    const {provider, generate} = mockProvider()
    const res = await createImageHandler({provider})(post({prompt: 'a cat', aspectRatio: '16:9'}))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({imageData: 'aW1n', mimeType: 'image/png', model: 'gemini-nano-banana-2.1'})
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({prompt: 'a cat', model: 'gemini-nano-banana-2.1', aspectRatio: '16:9'}),
    )
  })

  it('uses the requested model and image size', async () => {
    const {provider, generate} = mockProvider()
    const res = await createImageHandler({provider})(
      post({prompt: 'a cat', model: 'gemini-3-pro-image', imageSize: '4K'}),
    )

    expect(res.status).toBe(200)
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({model: 'gemini-3-pro-image', imageSize: '4K'}))
  })

  it('rejects models outside the allow list', async () => {
    const {provider, generate} = mockProvider()
    const handler = createImageHandler({provider, allowedModels: ['gemini-3-pro-image']})
    const res = await handler(post({prompt: 'a cat', model: 'gemini-nano-banana-2.1'}))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/not allowed/)
    expect(generate).not.toHaveBeenCalled()
  })

  it('reads model settings from the environment', async () => {
    vi.stubEnv('GEMINI_ALLOWED_MODELS', 'custom-model, other-model')
    vi.stubEnv('GEMINI_IMAGE_MODEL', 'custom-model')
    const {provider, generate} = mockProvider()
    const res = await createImageHandler({provider})(post({prompt: 'a cat'}))

    expect(res.status).toBe(200)
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({model: 'custom-model'}))
  })

  it.each([
    [{}, /Prompt is required/],
    [{prompt: '   '}, /Prompt is required/],
    [{prompt: 'x', aspectRatio: '7:3'}, /aspect ratio/],
    [{prompt: 'x', imageSize: '8K'}, /image size/],
    [{prompt: 'x', model: 42}, /model must be a string/],
    [{prompt: 'x', mode: 'edit', baseImage: 'abc', baseImageMimeType: 'text/html'}, /image type/],
  ])('validates input %j', async (body, message) => {
    const {provider} = mockProvider()
    const res = await createImageHandler({provider})(post(body))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(message)
  })

  it('returns 400 for invalid JSON', async () => {
    const {provider} = mockProvider()
    const res = await createImageHandler({provider})(post('{not json'))
    expect(res.status).toBe(400)
  })

  it('passes the base image and its MIME type for edits', async () => {
    const {provider, generate} = mockProvider()
    await createImageHandler({provider})(
      post({prompt: 'make it blue', mode: 'edit', baseImage: 'abc', baseImageMimeType: 'image/jpeg'}),
    )
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({baseImage: 'abc', baseImageMimeType: 'image/jpeg'}),
    )
  })

  it('ignores the base image in generate mode', async () => {
    const {provider, generate} = mockProvider()
    await createImageHandler({provider})(post({prompt: 'x', mode: 'generate', baseImage: 'abc'}))
    expect(generate.mock.calls[0][0].baseImage).toBeUndefined()
  })

  describe('API key', () => {
    it('requires a matching X-API-Key when configured', async () => {
      const {provider} = mockProvider()
      const handler = createImageHandler({provider, apiKey: 'secret'})

      expect((await handler(post({prompt: 'x'}))).status).toBe(401)
      expect((await handler(post({prompt: 'x'}, {'X-API-Key': 'wrong'}))).status).toBe(401)
      expect((await handler(post({prompt: 'x'}, {'X-API-Key': 'secretx'}))).status).toBe(401)
      expect((await handler(post({prompt: 'x'}, {'X-API-Key': 'secret'}))).status).toBe(200)
    })

    it('reads the key from GEMINI_PLUGIN_API_KEY', async () => {
      vi.stubEnv('GEMINI_PLUGIN_API_KEY', 'env-secret')
      const {provider} = mockProvider()
      const handler = createImageHandler({provider})
      expect((await handler(post({prompt: 'x'}))).status).toBe(401)
      expect((await handler(post({prompt: 'x'}, {'X-API-Key': 'env-secret'}))).status).toBe(200)
    })
  })

  describe('CORS', () => {
    it('answers preflight requests and allows the X-API-Key header', async () => {
      const {provider} = mockProvider()
      const res = await createImageHandler({provider})(
        new Request('https://example.com/api', {method: 'OPTIONS'}),
      )
      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-API-Key')
    })

    it('includes CORS headers on error responses', async () => {
      const {provider} = mockProvider()
      const res = await createImageHandler({provider})(post({}))
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('echoes an allowed origin from the list', async () => {
      const {provider} = mockProvider()
      const handler = createImageHandler({provider, corsOrigin: ['https://a.example', 'https://b.example']})
      const res = await handler(post({prompt: 'x'}, {Origin: 'https://b.example'}))
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://b.example')
      expect(res.headers.get('Vary')).toBe('Origin')

      const other = await handler(post({prompt: 'x'}, {Origin: 'https://evil.example'}))
      expect(other.headers.get('Access-Control-Allow-Origin')).toBe('https://a.example')
    })

    it('rejects other methods', async () => {
      const {provider} = mockProvider()
      const res = await createImageHandler({provider})(new Request('https://example.com/api'))
      expect(res.status).toBe(405)
    })
  })

  describe('series', () => {
    const series = {quantity: 3, consistencyPrompt: 'same subject', variations: ['front', 'side', 'back', 'top']}

    it('generates one image per variation up to quantity, in order', async () => {
      const {provider, generate} = mockProvider()
      const res = await createImageHandler({provider})(post({prompt: 'a chair', series}))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(generate).toHaveBeenCalledTimes(3)
      expect(body.images.map((image: any) => [image.index, image.variation])).toEqual([
        [0, 'front'],
        [1, 'side'],
        [2, 'back'],
      ])
      expect(body.metadata).toMatchObject({quantity: 3, successful: 3, failed: 0, model: 'gemini-nano-banana-2.1'})
      expect(generate.mock.calls[0][0].prompt).toContain('a chair')
      expect(generate.mock.calls[0][0].prompt).toContain('same subject')
      expect(generate.mock.calls[0][0].prompt).toContain('front')
    })

    it('runs sequentially by default and concurrently when configured', async () => {
      let active = 0
      let peak = 0
      const impl = async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((resolve) => setTimeout(resolve, 5))
        active--
        return {imageData: 'x', mimeType: 'image/png'}
      }

      await createImageHandler({provider: mockProvider(impl).provider})(post({prompt: 'x', series}))
      expect(peak).toBe(1)

      peak = 0
      await createImageHandler({provider: mockProvider(impl).provider, seriesConcurrency: 3})(
        post({prompt: 'x', series}),
      )
      expect(peak).toBe(3)
    })

    it('returns 207 with errors on partial failure', async () => {
      const {provider} = mockProvider(async (request) => {
        if (request.prompt.includes('side')) throw new Error('rate limited')
        return {imageData: 'x', mimeType: 'image/png'}
      })
      const res = await createImageHandler({provider})(post({prompt: 'x', series}))
      const body = await res.json()

      expect(res.status).toBe(207)
      expect(body.images).toHaveLength(2)
      expect(body.errors).toEqual([{index: 1, variation: 'side', error: 'rate limited'}])
    })

    it('returns 500 when every image fails', async () => {
      const {provider} = mockProvider(async () => {
        throw new Error('boom')
      })
      const res = await createImageHandler({provider})(post({prompt: 'x', series}))
      expect(res.status).toBe(500)
      expect((await res.json()).details).toHaveLength(3)
    })

    it.each([
      [{...series, quantity: 1}],
      [{...series, quantity: 11}],
      [{...series, quantity: 2.5}],
      [{...series, variations: []}],
    ])('validates %j', async (invalid) => {
      const {provider} = mockProvider()
      const res = await createImageHandler({provider})(post({prompt: 'x', series: invalid}))
      expect(res.status).toBe(400)
    })
  })

  it('returns 500 with the provider error message', async () => {
    const {provider} = mockProvider(async () => {
      throw new Error('quota exceeded')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await createImageHandler({provider})(post({prompt: 'x'}))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('quota exceeded')
  })
})
