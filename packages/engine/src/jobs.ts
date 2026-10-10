import {createHash, randomUUID} from 'node:crypto'
import {
  normalizeImageRequest,
  normalizeVideoRequest,
  RequestError,
  type ImageRequest,
  type VideoRequest,
} from 'sanity-plugin-gemini-ai-images-contracts'
import {generateOne, prepareRequest} from './generation.js'
import {ProviderError} from './providers.js'
import {authorize, corsHeaders, errorResponse, readJson} from './http.js'
import type {
  EngineOptions,
  GenerationJob,
  JobStore,
  Principal,
  VideoProvider,
  JobItem,
} from './types.js'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const terminal = (job: GenerationJob) =>
  job.status === 'cancelled' ||
  job.status === 'complete' ||
  job.status === 'uncertain'

export class JobService {
  constructor(
    private store: JobStore,
    private options: EngineOptions,
    private video?: VideoProvider,
    private now = () => Date.now(),
  ) {}
  async get(id: string, principal: Principal) {
    if (!/^ai-job-[a-f0-9]{64}$/.test(id))
      throw new RequestError('Job not found', 404)
    const job = await this.store.get(id)
    if (
      !job ||
      job.owner !== principal.id ||
      (job.namespace ?? '') !== (this.options.namespace ?? '')
    )
      throw new RequestError('Job not found', 404)
    return job
  }
  async create(
    input: unknown,
    principal: Principal,
    key: string,
    kind: 'image' | 'video' = 'image',
  ) {
    if (principal.canGenerate === false)
      throw new RequestError('Generation permission required', 403)
    if (!key || key.length > 200)
      throw new RequestError(
        'Provide an Idempotency-Key of at most 200 characters',
      )
    if (kind === 'video' && (!this.video || !principal.canUseVideo))
      throw new RequestError(
        'Video generation is not enabled for this user',
        403,
      )
    let request =
      kind === 'image'
        ? normalizeImageRequest(input, this.options.policy)
        : normalizeVideoRequest(input)
    const fingerprint = hash(JSON.stringify(request)),
      id = `ai-job-${hash((this.options.namespace ?? '') + '\0' + principal.id + '\0' + key)}`
    const existing = await this.store.get(id)
    if (existing) {
      if (
        existing.owner !== principal.id ||
        existing.fingerprint !== fingerprint
      )
        throw new RequestError(
          'Idempotency key was used for a different request',
          409,
          'idempotency_conflict',
        )
      return existing
    }
    const quantity =
      kind === 'image' ? ((request as ImageRequest).series?.quantity ?? 1) : 1
    const estimate = this.options.prices?.[request.model]
    const units =
      quantity +
      (kind === 'image' && (request as ImageRequest).series?.anchor ? 1 : 0)
    const cost =
      (estimate ?? 0) *
      (kind === 'video' ? (request as VideoRequest).durationSeconds : units)
    if (
      this.options.maxEstimatedCostUsd !== undefined &&
      (estimate === undefined || cost > this.options.maxEstimatedCostUsd)
    )
      throw new RequestError(
        'Request exceeds configured cost estimate limit',
        429,
      )
    try {
      await this.options.budget?.reserve(
        principal.id,
        units,
        `${id}-${fingerprint}`,
        cost,
      )
    } catch {
      throw new RequestError(
        'Generation budget exceeded',
        429,
        'budget_exceeded',
      )
    }
    // Keep reference binaries out of the job document. Assets are scoped to the
    // configured dataset; this also allows workers to resume from another host.
    if (kind === 'image') {
      const imageRequest = request as ImageRequest
      const prepared = await prepareRequest(
        imageRequest,
        this.options,
        principal,
      )
      const refs = []
      for (const ref of prepared.references) {
        if (ref.assetId) {
          refs.push({
            assetId: ref.assetId,
            role: ref.role,
            mimeType: ref.mimeType,
          })
          continue
        }
        const asset = await this.store.saveOutput(
          Uint8Array.from(Buffer.from(ref.data!, 'base64')),
          ref.mimeType!,
          {reference: true, owner: principal.id},
        )
        refs.push({
          assetId: asset.assetId,
          role: ref.role,
          mimeType: ref.mimeType,
        })
      }
      request = {...prepared, references: refs, brandPresetId: undefined}
    } else if ((request as VideoRequest).reference?.data) {
      const ref = (request as VideoRequest).reference!
      const asset = await this.store.saveOutput(
        Uint8Array.from(Buffer.from(ref.data!, 'base64')),
        ref.mimeType!,
        {reference: true, owner: principal.id},
      )
      request = {
        ...request,
        reference: {
          assetId: asset.assetId,
          role: ref.role,
          mimeType: ref.mimeType,
        },
      } as VideoRequest
    }
    const items: JobItem[] = Array.from({length: quantity}, (_, index) => ({
      index,
      variation:
        kind === 'image'
          ? ((request as ImageRequest).series?.variations[index] ?? 'single')
          : 'video',
      status: 'pending',
    }))
    if (kind === 'image' && (request as ImageRequest).series?.anchor)
      items.unshift({index: -1, variation: 'Subject anchor', status: 'pending'})
    try {
      return await this.store.create({
        id,
        namespace: this.options.namespace,
        owner: principal.id,
        kind,
        fingerprint,
        request,
        items,
        status: 'queued',
        createdAt: new Date(this.now()).toISOString(),
        updatedAt: new Date(this.now()).toISOString(),
      })
    } catch (error) {
      const prior = await this.store.get(id)
      if (prior?.fingerprint === fingerprint) return prior
      throw error
    }
  }
  async cancel(id: string, principal: Principal) {
    for (let n = 0; n < 5; n++) {
      const job = await this.get(id, principal)
      job.status = 'cancelled'
      try {
        return await this.store.update(job, job.revision)
      } catch {
        if (n === 4) throw new RequestError('Job changed; try again', 409)
      }
    }
    throw new RequestError('Job changed', 409)
  }
  async retry(id: string, principal: Principal, indices: number[]) {
    const job = await this.get(id, principal)
    if (principal.canGenerate === false)
      throw new RequestError('Generation permission required', 403)
    if (job.kind === 'video' && !principal.canUseVideo)
      throw new RequestError('Video permission required', 403)
    if (
      !Array.isArray(indices) ||
      !indices.length ||
      new Set(indices).size !== indices.length ||
      indices.some(
        (i) =>
          !Number.isInteger(i) ||
          !job.items.some(
            (item) =>
              item.index === i && ['failed', 'uncertain'].includes(item.status),
          ),
      )
    )
      throw new RequestError('Select failed or uncertain items to retry')
    if (job.items.some((i) => i.status === 'running'))
      throw new RequestError('Wait for active work before retrying', 409)
    const paidItems = job.items.filter(
      (item) =>
        indices.includes(item.index) &&
        !(job.kind === 'video' && item.operation),
    ).length
    const retryCost =
      (this.options.prices?.[job.request.model] ?? 0) *
      paidItems *
      (job.kind === 'video' ? (job.request as VideoRequest).durationSeconds : 1)
    if (
      this.options.maxEstimatedCostUsd !== undefined &&
      paidItems &&
      (this.options.prices?.[job.request.model] === undefined ||
        retryCost > this.options.maxEstimatedCostUsd)
    )
      throw new RequestError(
        'Request exceeds configured cost estimate limit',
        429,
      )
    try {
      if (paidItems)
        await this.options.budget?.reserve(
          principal.id,
          paidItems,
          `${id}-retry-${job.revision}-${hash(JSON.stringify([...indices].sort((a, b) => a - b)))}`,
          retryCost,
        )
    } catch {
      throw new RequestError('Generation budget exceeded', 429)
    }
    for (const item of job.items)
      if (indices.includes(item.index)) {
        item.status = 'pending'
        delete item.error
        delete item.claim
        delete item.leaseUntil
      }
    job.status = 'queued'
    return this.store.update(job, job.revision)
  }
  async step(
    id: string,
    principal: Principal,
    signal?: AbortSignal,
  ): Promise<GenerationJob> {
    let job = await this.get(id, principal)
    if (job.kind === 'video' && !principal.canUseVideo)
      throw new RequestError('Video permission required', 403)
    if (principal.canGenerate === false)
      throw new RequestError('Generation permission required', 403)
    if (job.kind === 'image')
      normalizeImageRequest(job.request, this.options.policy)
    if (terminal(job)) return job
    const active = job.items.find((item) => item.status === 'running')
    if (active) {
      if ((active.leaseUntil ?? 0) > this.now()) return job
      active.status = 'uncertain'
      active.error =
        'Worker lease expired. Provider billing may have occurred. Explicit retry is required.'
      job.status = 'uncertain'
      try {
        return await this.store.update(job, job.revision)
      } catch {
        return this.get(id, principal)
      }
    }
    const anchor = job.items.find((i) => i.index === -1)
    if (anchor && ['failed', 'uncertain'].includes(anchor.status)) {
      job.status = anchor.status === 'uncertain' ? 'uncertain' : 'partial'
      return this.store.update(job, job.revision)
    }
    const item = job.items.find((i) => i.status === 'pending')
    if (!item) return job
    item.status = 'running'
    item.claim = randomUUID()
    item.leaseUntil = this.now() + 180_000
    job.status = 'running'
    try {
      job = await this.store.update(job, job.revision)
    } catch {
      return this.get(id, principal)
    }
    const claim = item.claim
    let providerReturned = false
    let output: JobItem['output']
    let operation: string | undefined = item.operation
    let error: string | undefined
    let status: JobItem['status'] = 'complete'
    try {
      signal?.throwIfAborted()
      if (job.kind === 'video') {
        const request = job.request as VideoRequest
        if (item.operation) {
          const result = await this.video!.poll(item.operation)
          if (result.error) {
            operation = undefined
            throw new ProviderError(result.error, 'video_failed', 422)
          }
          if (!result.done) {
            status = 'pending'
            operation = item.operation
          } else {
            providerReturned = true
            if (!result.data) throw new Error('Video bytes missing')
            const asset = await this.store.saveOutput(
              result.data,
              result.mimeType ?? 'video/mp4',
              {
                owner: principal.id,
                jobId: id,
                prompt: request.prompt,
                model: request.model,
                sourceAssetIds: request.reference?.assetId
                  ? [request.reference.assetId]
                  : [],
                parameters: {
                  aspectRatio: request.aspectRatio,
                  resolution: request.resolution,
                  durationSeconds: request.durationSeconds,
                  reference: request.reference,
                },
              },
            )
            output = {
              ...asset,
              mimeType: 'video/mp4',
              model: request.model,
              prompt: request.prompt,
              index: 0,
              variation: 'video',
            }
          }
        } else {
          const reference = request.reference
            ? await (
                this.options.resolveReference ??
                this.store.resolveReference.bind(this.store)
              )(request.reference, principal)
            : undefined
          const prepared = normalizeVideoRequest({
            ...request,
            reference: reference
              ? {...reference, assetId: undefined}
              : undefined,
          })
          operation = await this.video!.start(prepared, signal)
          providerReturned = true
          status = 'pending'
        }
      } else {
        const request = job.request as ImageRequest
        const references = await Promise.all(
          request.references.map((r) =>
            (
              this.options.resolveReference ??
              this.store.resolveReference.bind(this.store)
            )(r, principal),
          ),
        )
        if (job.anchor)
          references.unshift(
            await (
              this.options.resolveReference ??
              this.store.resolveReference.bind(this.store)
            )({assetId: job.anchor.assetId, role: 'subject'}, principal),
          )
        const single = {
          ...request,
          references,
          series: undefined,
          prompt:
            item.index === -1
              ? request.prompt
              : [
                  request.prompt,
                  request.series?.consistencyPrompt,
                  'Create one single image.',
                  `Apply only this variation: ${item.variation}`,
                ]
                  .filter(Boolean)
                  .join('\n'),
        }
        const result = await generateOne(
          normalizeImageRequest(
            {
              ...single,
              references: single.references.map(
                ({assetId: _assetId, ...r}) => r,
              ),
            },
            this.options.policy,
          ),
          this.options,
          signal,
        )
        providerReturned = true
        const asset = await this.store.saveOutput(
          Uint8Array.from(Buffer.from(result.imageData, 'base64')),
          result.mimeType,
          {
            owner: principal.id,
            jobId: id,
            index: item.index,
            prompt: single.prompt,
            model: result.model,
            usage: result.usage,
            sources: result.sources,
            providerRequestId: result.providerRequestId,
            sourceAssetIds: [
              ...request.references.flatMap((ref) =>
                ref.assetId ? [ref.assetId] : [],
              ),
              ...(job.anchor ? [job.anchor.assetId] : []),
            ],
            parameters: {
              aspectRatio: request.aspectRatio,
              resolution: request.resolution,
              grounding: request.grounding,
              references: request.references,
              usage: result.usage,
              sources: result.sources,
              estimatedCostUsd: result.estimatedCostUsd,
            },
          },
        )
        output = {
          ...asset,
          mimeType: result.mimeType,
          model: result.model,
          prompt: single.prompt,
          index: item.index,
          variation: item.variation,
          usage: result.usage,
          sources: result.sources,
          estimatedCostUsd: result.estimatedCostUsd,
        }
      }
    } catch (e) {
      error =
        e instanceof ProviderError || e instanceof RequestError
          ? e.message
          : 'Worker interrupted or storage failed. Inspect this job before retrying.'
      status =
        providerReturned ||
        (!(e instanceof ProviderError) && !(e instanceof RequestError)) ||
        (e instanceof ProviderError && e.code === 'transport_uncertain')
          ? 'uncertain'
          : 'failed'
    }
    // Re-read before updating so cancellation made while the provider was working
    // persists, and retain already completed output even if the user cancelled.
    for (let n = 0; n < 5; n++) {
      const current = await this.get(id, principal),
        target = current.items.find((i) => i.index === item.index)!
      if (target.claim !== claim) return current
      Object.assign(target, {status, error, output, operation})
      delete target.leaseUntil
      delete target.claim
      if (item.index === -1 && output) current.anchor = output
      if (current.status !== 'cancelled')
        current.status = current.items.some((i) => i.status === 'uncertain')
          ? 'uncertain'
          : current.items.some((i) => ['pending', 'running'].includes(i.status))
            ? 'queued'
            : current.items.some((i) => i.status === 'failed')
              ? 'partial'
              : 'complete'
      current.updatedAt = new Date(this.now()).toISOString()
      try {
        return await this.store.update(current, current.revision)
      } catch {
        if (n === 4)
          throw new RequestError(
            'Could not persist job result; inspect the job before retrying',
            409,
            'persistence_uncertain',
          )
      }
    }
    throw new RequestError('Job changed', 409)
  }
}
export function createJobHandler(service: JobService, options: EngineOptions) {
  return async (request: Request) => {
    let headers: Record<string, string> = {}
    try {
      headers = corsHeaders(request, options.origins)
      if (request.method === 'OPTIONS')
        return new Response(null, {status: 204, headers})
      const principal = await authorize(request, options),
        parts = new URL(request.url).pathname.split('/').filter(Boolean)
      const marker = parts.lastIndexOf('jobs'),
        id = parts[marker + 1],
        action = parts[marker + 2]
      if (marker < 0) throw new RequestError('Job route not found', 404)
      if (!id && request.method === 'POST') {
        const body = (await readJson(request, options.maxBodyBytes)) as any
        const job = await service.create(
          body,
          principal,
          request.headers.get('idempotency-key') ?? '',
          body.kind === 'video' ? 'video' : 'image',
        )
        return Response.json(job, {status: 202, headers})
      }
      if (id && !action && request.method === 'GET')
        return Response.json(await service.get(id, principal), {headers})
      if (id && !action && request.method === 'DELETE')
        return Response.json(await service.cancel(id, principal), {headers})
      if (id && action === 'run' && request.method === 'POST')
        return Response.json(
          await service.step(id, principal, request.signal),
          {headers},
        )
      if (id && action === 'retry' && request.method === 'POST') {
        const body = (await readJson(request, 1000)) as any
        return Response.json(await service.retry(id, principal, body.indices), {
          headers,
        })
      }
      throw new RequestError('Method or job route not allowed', 405)
    } catch (error) {
      return errorResponse(error, headers)
    }
  }
}
