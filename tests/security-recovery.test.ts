import {expect, it, vi} from 'vitest'
import {corsHeaders} from '../packages/engine/src/http'
import {createSanityAuthorizer} from '../packages/engine/src/auth'
import {SanityJobStore} from '../packages/engine/src/sanity-store'
import {prepareRequest} from '../packages/engine/src/generation'
import {normalizeImageRequest} from '../packages/contracts/src/index'
import {VeoProvider} from '../packages/engine/src/video'
import {GeminiProvider} from '../packages/engine/src/providers'

it('rejects non-members and viewers even when their token can read a public dataset', async () => {
  for (const members of [[], [{id: 'editor', role: 'viewer'}]]) {
    const transport = vi.fn(async (url: string) =>
      Response.json(
        url.includes('/users/me')
          ? {id: 'editor'}
          : url.includes('/projects/')
            ? {members}
            : {result: 1},
      ),
    )
    const authorize = createSanityAuthorizer({
      projectId: 'abc',
      dataset: 'production',
      fetch: transport as never,
    })
    expect(
      await authorize(
        new Request('https://host.test', {
          headers: {Authorization: 'Bearer user-token'},
        }),
      ),
    ).toBeNull()
  }
})
it('carries an editor token only in the request-scoped principal', async () => {
  const transport = vi.fn(async (url: string) =>
    Response.json(
      url.includes('/users/me')
        ? {id: 'editor'}
        : url.includes('/projects/')
          ? {members: [{id: 'editor', roles: [{name: 'editor'}]}]}
          : {result: 1},
    ),
  )
  const authorize = createSanityAuthorizer({
    projectId: 'abc',
    dataset: 'production',
    fetch: transport as never,
  })
  expect(
    await authorize(
      new Request('https://host.test', {
        headers: {Authorization: 'Bearer user-token'},
      }),
    ),
  ).toMatchObject({id: 'editor', sanityToken: 'user-token', canGenerate: true})
})
it('queries and downloads private references with the user token, never the server token', async () => {
  const transport = vi.fn(async (url: string, init: RequestInit) => {
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer user-token',
    )
    return url.includes('/query/')
      ? Response.json({result: null})
      : new Response('a')
  })
  const store = new SanityJobStore({
    projectId: 'abc',
    dataset: 'production',
    token: 'privileged',
    fetch: transport as never,
  })
  await expect(
    store.resolveReference(
      {assetId: 'image-private', role: 'subject'},
      {id: 'editor', sanityToken: 'user-token'},
    ),
  ).rejects.toThrow('not found')
  await expect(
    store.resolveReference(
      {assetId: 'image-private', role: 'subject'},
      {id: 'editor'},
    ),
  ).rejects.toThrow('User-scoped')
  expect(transport).toHaveBeenCalledOnce()
})
it('revalidates aggregate bytes after resolving asset IDs and accepts resolved provenance', async () => {
  const request = normalizeImageRequest({
    prompt: 'test',
    model: 'gemini-3-pro-image',
    references: [
      {assetId: 'image-one', role: 'subject'},
      {assetId: 'image-two', role: 'style'},
    ],
  })
  const options = {
    providers: {},
    resolveReference: async (r: any) => ({
      ...r,
      data: Buffer.alloc(8_000_000).toString('base64'),
      mimeType: 'image/png',
    }),
  }
  await expect(
    prepareRequest(request, options, {id: 'editor'}),
  ).rejects.toThrow(/large|limit|15/i)
  const prepared = await prepareRequest(
    request,
    {
      ...options,
      resolveReference: async (r: any) => ({
        ...r,
        data: 'YQ==',
        mimeType: 'image/png',
      }),
    },
    {id: 'editor'},
  )
  expect(prepared.references[0].assetId).toBe('image-one')
})
it('follows trusted video redirects without forwarding the Gemini key to storage', async () => {
  const getVideosOperation = vi.fn(async () => ({
    done: true,
    response: {
      generatedVideos: [
        {video: {uri: 'https://generativelanguage.googleapis.com/video'}},
      ],
    },
  }))
  const transport = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes('generativelanguage')) {
      expect(new Headers(init.headers).get('x-goog-api-key')).toBe('secret')
      return new Response(null, {
        status: 302,
        headers: {
          location: 'https://storage.googleapis.com/video?signature=opaque',
        },
      })
    }
    expect(new Headers(init.headers).has('x-goog-api-key')).toBe(false)
    return new Response('video')
  })
  const provider = new VeoProvider(
    {operations: {getVideosOperation}} as never,
    'secret',
    transport as never,
  )
  expect((await provider.poll('operation')).data).toEqual(
    new Uint8Array(Buffer.from('video')),
  )
  expect(transport).toHaveBeenCalledTimes(2)
})
it('does not request an untrusted video redirect target', async () => {
  const getVideosOperation = vi.fn(async () => ({
    done: true,
    response: {
      generatedVideos: [
        {video: {uri: 'https://generativelanguage.googleapis.com/video'}},
      ],
    },
  }))
  const transport = vi.fn(
    async () =>
      new Response(null, {
        status: 302,
        headers: {location: 'https://evil.test/video'},
      }),
  )
  await expect(
    new VeoProvider(
      {operations: {getVideosOperation}} as never,
      'secret',
      transport as never,
    ).poll('operation'),
  ).rejects.toThrow('video URL')
  expect(transport).toHaveBeenCalledOnce()
})
it('classifies Gemini transport failures as uncertain and never retries them', async () => {
  const generateContent = vi.fn(async () => {
    throw new Error('socket closed')
  })
  const provider = new GeminiProvider({models: {generateContent}} as never)
  await expect(
    provider.generate(normalizeImageRequest({prompt: 'test'})),
  ).rejects.toMatchObject({code: 'transport_uncertain', retryable: false})
})

it('returns credential-compatible CORS for intentionally allowed wildcard origins', () => {
  const headers = corsHeaders(
    new Request('https://host.test', {
      headers: {Origin: 'https://studio.test'},
    }),
    ['*'],
  )
  expect(headers).toMatchObject({
    'Access-Control-Allow-Origin': 'https://studio.test',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  })
})
