import {expect, it, vi} from 'vitest'
import {
  SanityJobStore,
  SanityBudgetStore,
} from '../packages/engine/src/sanity-store'
import {createSanityAuthorizer} from '../packages/engine/src/auth'

it('uses revision-controlled mutation and stores no result binaries in documents', async () => {
  const transport = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/mutate/')) {
      const m = JSON.parse(String(init?.body)).mutations[0]
      return Response.json({
        results: [{document: {...m.patch.set, _id: m.patch.id, _rev: 'new'}}],
      })
    }
    return Response.json({result: null})
  })
  const store = new SanityJobStore({
    projectId: 'project',
    dataset: 'production',
    token: 'secret',
    fetch: transport as never,
  })
  const job = {
    id: 'ai-job-id',
    revision: 'old',
    owner: 'user',
    kind: 'image',
    fingerprint: 'hash',
    createdAt: 'now',
    updatedAt: 'now',
    status: 'queued',
    request: {prompt: 'test'},
    items: [],
  } as never
  await store.update(job, 'old')
  expect(
    JSON.parse(String(transport.mock.calls[0][1]?.body)).mutations[0].patch,
  ).toMatchObject({
    ifRevisionID: 'old',
    set: {requestJSON: '{"prompt":"test"}'},
  })
})
it('prevents reference URLs outside the configured Sanity project', async () => {
  const transport = vi.fn(async () =>
    Response.json({
      result: {url: 'https://evil.test/secret.png', mimeType: 'image/png'},
    }),
  )
  const store = new SanityJobStore({
    projectId: 'project',
    dataset: 'production',
    token: 'secret',
    fetch: transport as never,
  })
  await expect(
    store.resolveReference(
      {assetId: 'image-abcd-1x1-png', role: 'product'},
      {id: 'user', sanityToken: 'user-token'},
    ),
  ).rejects.toThrow('asset URL')
  expect(transport).toHaveBeenCalledOnce()
})
it('does not authorize a user who cannot access the configured dataset', async () => {
  const transport = vi.fn(async (url: string) =>
    url.includes('/users/me')
      ? Response.json({id: 'user'})
      : new Response('', {status: 403}),
  )
  const auth = createSanityAuthorizer({
    projectId: 'project',
    dataset: 'production',
    fetch: transport as never,
  })
  expect(
    await auth(
      new Request('https://host.test', {
        headers: {Authorization: 'Bearer user-token'},
      }),
    ),
  ).toBeNull()
})
it('rejects exhausted budget without mutating its count', async () => {
  const transport = vi.fn(async (url: string) =>
    url.includes('/query/')
      ? Response.json({
          result: {_id: 'budget', _rev: 'rev', count: 100, reservations: []},
        })
      : Response.json({results: []}),
  )
  const budget = new SanityBudgetStore(
    {
      projectId: 'project',
      dataset: 'production',
      token: 'secret',
      fetch: transport as never,
    },
    {dailyImages: 100, perMinute: 1000, projectDailyImages: 1000},
  )
  await expect(budget.reserve('user', 1, 'request')).rejects.toThrow('quota')
  expect(
    transport.mock.calls.filter((c) => String(c[0]).includes('/mutate/')),
  ).toHaveLength(1)
})
it('atomically rejects a competing quota reservation after revision conflict', async () => {
  const docs = new Map<string, any>()
  let revision = 0
  const transport = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/query/')) {
      const id = JSON.parse(new URL(url).searchParams.get('$id')!)
      return Response.json({result: structuredClone(docs.get(id) ?? null)})
    }
    const mutations = JSON.parse(String(init?.body)).mutations
    if (
      mutations.some(
        (m: any) =>
          m.patch && docs.get(m.patch.id)?._rev !== m.patch.ifRevisionID,
      )
    )
      return new Response('', {status: 409})
    for (const m of mutations) {
      if (m.createIfNotExists && !docs.has(m.createIfNotExists._id))
        docs.set(m.createIfNotExists._id, {
          ...m.createIfNotExists,
          _rev: String(++revision),
        })
      if (m.patch)
        docs.set(m.patch.id, {
          ...docs.get(m.patch.id),
          ...m.patch.set,
          _rev: String(++revision),
        })
    }
    return Response.json({results: []})
  })
  const budget = new SanityBudgetStore(
    {
      projectId: 'project',
      dataset: 'state',
      token: 'server',
      fetch: transport as never,
    },
    {dailyImages: 3, perMinute: 3, projectDailyImages: 3},
  )
  const results = await Promise.allSettled([
    budget.reserve('user', 2, 'a'),
    budget.reserve('user', 2, 'b'),
  ])
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  expect([...docs.values()].map((d) => d.count)).toEqual([2, 2, 2])
  const winner = [...docs.values()][0].reservations[0]
  await budget.reserve('user', 2, winner)
  expect([...docs.values()].map((d) => d.count)).toEqual([2, 2, 2])
})
