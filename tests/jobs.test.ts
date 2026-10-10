import {expect, it, vi} from 'vitest'
import {ProviderError} from '../packages/engine/src/providers'
import {JobService} from '../packages/engine/src/jobs'
import type {GenerationJob, JobStore} from '../packages/engine/src/types'

function fixture() {
  const docs = new Map<string, GenerationJob>()
  let revision = 0
  const store: JobStore = {
    async create(job) {
      if (docs.has(job.id)) throw new Error('conflict')
      const saved = structuredClone({...job, revision: String(++revision)})
      docs.set(job.id, saved)
      return structuredClone(saved)
    },
    async get(id) {
      return structuredClone(docs.get(id) ?? null)
    },
    async update(job, expected) {
      if (docs.get(job.id)?.revision !== expected) throw new Error('conflict')
      const saved = structuredClone({...job, revision: String(++revision)})
      docs.set(job.id, saved)
      return structuredClone(saved)
    },
    saveOutput: vi.fn(async () => ({
      assetId: 'image-saved',
      url: 'https://cdn.sanity.io/saved.png',
    })),
    resolveReference: async (r) => ({
      ...r,
      data: 'YQ==',
      mimeType: 'image/png',
    }),
  }
  const generate = vi.fn(
    async () =>
      ({
        imageData: 'YQ==',
        mimeType: 'image/png',
        model: 'gemini-3-pro-image',
      }) as const,
  )
  const budget = {reserve: vi.fn(async () => {})}
  const options = {providers: {gemini: {generate}}, budget}
  let now = 1000
  const service = new JobService(store, options, undefined, () => now)
  return {
    service,
    store,
    options,
    docs,
    generate,
    budget,
    setTime: (n: number) => {
      now = n
    },
  }
}
const input = {
  prompt: 'chair',
  model: 'gemini-3-pro-image',
  series: {quantity: 2, variations: ['front', 'side']},
}
const user = {id: 'user'}
it('resumes across service restarts without repeating successful generations', async () => {
  const f = fixture()
  const job = await f.service.create(input, user, 'key')
  await f.service.step(job.id, user)
  const fresh = new JobService(f.store, f.options)
  const complete = await fresh.step(job.id, user)
  expect(complete.status).toBe('complete')
  expect(f.generate).toHaveBeenCalledTimes(2)
  await fresh.step(job.id, user)
  expect(f.generate).toHaveBeenCalledTimes(2)
})
it('deduplicates keys and rejects conflicts/cross-user access', async () => {
  const f = fixture()
  const job = await f.service.create(input, user, 'same')
  expect((await f.service.create(input, user, 'same')).id).toBe(job.id)
  expect(f.budget.reserve).toHaveBeenCalledOnce()
  await expect(
    f.service.create({...input, prompt: 'other'}, user, 'same'),
  ).rejects.toThrow('different request')
  await expect(f.service.get(job.id, {id: 'intruder'})).rejects.toThrow()
})
it('concurrent claims do not repeat billed calls', async () => {
  const f = fixture()
  const job = await f.service.create(input, user, 'key')
  await Promise.all([
    f.service.step(job.id, user),
    f.service.step(job.id, user),
  ])
  expect(f.generate).toHaveBeenCalledTimes(1)
})
it('makes expired claims uncertain rather than automatically repeating them', async () => {
  const f = fixture()
  const job = await f.service.create(input, user, 'key')
  job.items[0] = {
    ...job.items[0],
    status: 'running',
    leaseUntil: 1000,
    claim: 'dead-worker',
  }
  await f.store.update(job, job.revision)
  f.setTime(2000)
  const uncertain = await f.service.step(job.id, user)
  expect(uncertain.items[0].status).toBe('uncertain')
  expect(f.generate).not.toHaveBeenCalled()
})
it('retries failed items only, and preserves results on cancellation', async () => {
  const f = fixture()
  f.generate.mockRejectedValueOnce(
    new ProviderError('quota rejected', 'rate_limited', 429),
  )
  const job = await f.service.create(input, user, 'key')
  await f.service.step(job.id, user)
  await f.service.step(job.id, user)
  const after = await f.service.retry(job.id, user, [0])
  expect(after.items[1].status).toBe('complete')
  await f.service.step(job.id, user)
  expect(f.generate).toHaveBeenCalledTimes(3)
  const cancelled = await f.service.cancel(job.id, user)
  expect(cancelled.items[1].output?.assetId).toBe('image-saved')
})
it('marks successful provider output with failed storage uncertain', async () => {
  const f = fixture()
  vi.mocked(f.store.saveOutput).mockRejectedValueOnce(new Error('storage down'))
  const job = await f.service.create(input, user, 'key')
  expect((await f.service.step(job.id, user)).items[0].status).toBe('uncertain')
  await f.service.step(job.id, user)
  expect(f.generate).toHaveBeenCalledTimes(1)
})
it('binds concurrent reservations to request fingerprints', async () => {
  const f = fixture()
  await Promise.allSettled([
    f.service.create(input, user, 'race'),
    f.service.create(
      {
        ...input,
        prompt: 'different',
        series: {quantity: 3, variations: ['a', 'b', 'c']},
      },
      user,
      'race',
    ),
  ])
  const calls = f.budget.reserve.mock.calls as unknown as Array<
    [string, number, string]
  >
  expect(calls).toHaveLength(2)
  expect(calls[0][2]).not.toBe(calls[1][2])
})
it('does not generate variations when their required anchor failed', async () => {
  const f = fixture()
  f.generate.mockRejectedValueOnce(
    new ProviderError('blocked', 'safety_block', 422),
  )
  const job = await f.service.create(
    {...input, series: {...input.series, anchor: true}},
    user,
    'anchor',
  )
  await f.service.step(job.id, user)
  expect((await f.service.step(job.id, user)).status).toBe('partial')
  expect(f.generate).toHaveBeenCalledOnce()
  await f.service.retry(job.id, user, [-1])
  await f.service.step(job.id, user)
  await f.service.step(job.id, user)
  expect(f.generate).toHaveBeenCalledTimes(3)
  expect(f.generate.mock.calls[2][0].references).toHaveLength(1)
})
it('preserves video operation on transfer failure and retries without another paid start', async () => {
  const f = fixture()
  const video = {
    start: vi.fn(async () => 'operations/paid'),
    poll: vi.fn(async () => ({done: true, data: new Uint8Array([97])})),
  }
  const service = new JobService(
    f.store,
    {...f.options, prices: {'veo-3.1-generate-preview': 0.1}},
    video,
  )
  const viewer = {id: 'user', canUseVideo: true}
  const job = await service.create(
    {prompt: 'waves', model: 'veo-3.1-generate-preview', durationSeconds: 8},
    viewer,
    'video',
    'video',
  )
  await service.step(job.id, viewer)
  vi.mocked(f.store.saveOutput).mockRejectedValueOnce(new Error('storage down'))
  const uncertain = await service.step(job.id, viewer)
  expect(uncertain.items[0]).toMatchObject({
    status: 'uncertain',
    operation: 'operations/paid',
  })
  await service.retry(job.id, viewer, [0])
  await service.step(job.id, viewer)
  expect(video.start).toHaveBeenCalledOnce()
  expect(video.poll).toHaveBeenCalledTimes(2)
  expect(f.budget.reserve).toHaveBeenCalledOnce()
})
it('reserves video retry cost using duration after a definitive generation failure', async () => {
  const f = fixture()
  const video = {
    start: vi.fn(async () => 'operations/paid'),
    poll: vi.fn(async () => ({done: true, error: 'blocked'})),
  }
  const service = new JobService(
      f.store,
      {...f.options, prices: {'veo-3.1-generate-preview': 0.1}},
      video,
    ),
    viewer = {id: 'user', canUseVideo: true}
  const job = await service.create(
    {prompt: 'waves', model: 'veo-3.1-generate-preview', durationSeconds: 8},
    viewer,
    'video',
    'video',
  )
  await service.step(job.id, viewer)
  await service.step(job.id, viewer)
  await service.retry(job.id, viewer, [0])
  expect((f.budget.reserve.mock.calls as any)[1][3]).toBeCloseTo(0.8)
  await expect(service.step(job.id, user)).rejects.toThrow('Video permission')
})
it('retains cancellation and completed output when a provider finishes late', async () => {
  const f = fixture()
  let finish!: (value: any) => void, started!: () => void
  const waiting = new Promise<void>((resolve) => {
    started = resolve
  })
  f.generate.mockImplementationOnce(() => {
    started()
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const job = await f.service.create(input, user, 'cancel-race')
  const running = f.service.step(job.id, user)
  await waiting
  await f.service.cancel(job.id, user)
  finish({
    imageData: 'YQ==',
    mimeType: 'image/png',
    model: 'gemini-3-pro-image',
  })
  const cancelled = await running
  expect(cancelled.status).toBe('cancelled')
  expect(cancelled.items[0].output?.assetId).toBe('image-saved')
  await f.service.step(job.id, user)
  expect(f.generate).toHaveBeenCalledOnce()
})

it('isolates project and dataset namespaces when sharing a state store', async () => {
  const f = fixture(),
    one = new JobService(f.store, {...f.options, namespace: 'project/a'}),
    two = new JobService(f.store, {...f.options, namespace: 'project/b'})
  const a = await one.create(input, user, 'same'),
    b = await two.create(input, user, 'same')
  expect(a.id).not.toBe(b.id)
  await expect(two.get(a.id,user)).rejects.toThrow('Job not found')
})
