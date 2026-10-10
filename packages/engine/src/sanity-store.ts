import {createHash} from 'node:crypto'
import {
  RequestError,
  type ReferenceImage,
} from 'sanity-plugin-gemini-ai-images-contracts'
import type {BudgetStore, GenerationJob, JobStore, Principal} from './types.js'
export interface SanityStoreOptions {
  projectId: string
  dataset: string
  token: string
  fetch?: typeof fetch
  /** Only enable for trusted server-to-server callers, never public Studio keys. */
  allowServerReferences?: boolean
}
export class SanityRest {
  readonly transport: typeof fetch
  readonly base: string
  constructor(readonly options: SanityStoreOptions) {
    if (
      !/^[a-z0-9]+$/.test(options.projectId) ||
      !/^[-\w]+$/.test(options.dataset) ||
      !options.token
    )
      throw new Error('Configure Sanity project, dataset and a server token')
    this.transport = options.fetch ?? fetch
    this.base = `https://${options.projectId}.api.sanity.io/v2024-01-01`
  }
  async query<T>(
    query: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const url = new URL(`${this.base}/data/query/${this.options.dataset}`)
    url.searchParams.set('query', query)
    url.searchParams.set('perspective', 'raw')
    for (const [key, value] of Object.entries(params))
      url.searchParams.set('$' + key, JSON.stringify(value))
    const response = await this.transport(url.toString(), {
      headers: {Authorization: `Bearer ${this.options.token}`},
    })
    if (!response.ok) throw new Error('Sanity query failed')
    return ((await response.json()) as any).result
  }
  async mutate(mutations: unknown[]): Promise<any[]> {
    const response = await this.transport(
      `${this.base}/data/mutate/${this.options.dataset}?returnDocuments=true&visibility=sync`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({mutations}),
      },
    )
    if (!response.ok)
      throw new RequestError(
        response.status === 409
          ? 'Sanity revision conflict'
          : 'Sanity persistence failed',
        response.status === 409 ? 409 : 502,
        'persistence_failed',
      )
    return ((await response.json()) as any).results ?? []
  }
  async upload(data: Uint8Array, mimeType: string) {
    const kind = mimeType.startsWith('image/') ? 'images' : 'files'
    const response = await this.transport(
      `${this.base}/assets/${kind}/${this.options.dataset}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          'Content-Type': mimeType,
        },
        body: Uint8Array.from(data),
      },
    )
    if (!response.ok) throw new Error('Sanity asset upload failed')
    const asset = ((await response.json()) as any).document
    return {assetId: asset._id as string, url: asset.url as string}
  }
  async reference(reference: ReferenceImage): Promise<ReferenceImage> {
    if (reference.data) return reference
    if (!reference.assetId || !/^image-[a-zA-Z0-9-]+$/.test(reference.assetId))
      throw new RequestError('Invalid image asset')
    const asset = await this.query<{url: string; mimeType: string} | null>(
      '*[_id==$id && _type=="sanity.imageAsset"][0]{url,mimeType}',
      {id: reference.assetId},
    )
    if (!asset) throw new RequestError('Image asset not found', 404)
    const url = new URL(asset.url)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'cdn.sanity.io' ||
      !url.pathname.startsWith(
        `/images/${this.options.projectId}/${this.options.dataset}/`,
      )
    )
      throw new RequestError('Invalid Sanity asset URL')
    const response = await this.transport(url.toString(), {
      headers: {Authorization: `Bearer ${this.options.token}`},
      redirect: 'error',
    })
    if (!response.ok)
      throw new RequestError('Unable to read reference asset', 403)
    if (Number(response.headers.get('content-length') ?? 0) > 15_000_000)
      throw new RequestError('Reference image is too large', 413)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Missing reference bytes')
    const chunks: Uint8Array[] = []
    let bytes = 0
    try {
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.length
        if (bytes > 15_000_000) {
          await reader.cancel()
          throw new RequestError('Reference image is too large', 413)
        }
        chunks.push(chunk.value)
      }
    } finally {
      reader.releaseLock()
    }
    return {
      ...reference,
      data: Buffer.concat(chunks).toString('base64'),
      mimeType: asset.mimeType,
    }
  }
}
const serialize = (job: Omit<GenerationJob, 'revision'>) => ({
  _type: 'aiGenerationJob',
  namespace: job.namespace,
  owner: job.owner,
  kind: job.kind,
  fingerprint: job.fingerprint,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  status: job.status,
  requestJSON: JSON.stringify(job.request),
  itemsJSON: JSON.stringify(job.items),
  anchorJSON: JSON.stringify(job.anchor ?? null),
})
const deserialize = (doc: any): GenerationJob => ({
  id: doc._id,
  revision: doc._rev,
  namespace: doc.namespace,
  owner: doc.owner,
  kind: doc.kind,
  fingerprint: doc.fingerprint,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  status: doc.status,
  request: JSON.parse(doc.requestJSON),
  items: JSON.parse(doc.itemsJSON),
  anchor: JSON.parse(doc.anchorJSON ?? 'null') ?? undefined,
})
export class SanityJobStore implements JobStore {
  readonly rest: SanityRest
  private state: SanityRest
  constructor(options: SanityStoreOptions, stateOptions?: SanityStoreOptions) {
    this.rest = new SanityRest(options)
    this.state = stateOptions ? new SanityRest(stateOptions) : this.rest
  }
  async create(job: Omit<GenerationJob, 'revision'>) {
    const results = await this.state.mutate([
      {create: {_id: job.id, ...serialize(job)}},
    ])
    return deserialize(results[0].document)
  }
  async get(id: string) {
    const doc = await this.state.query<any>(
      '*[_id==$id && _type=="aiGenerationJob"][0]',
      {id},
    )
    return doc ? deserialize(doc) : null
  }
  async update(job: GenerationJob, expectedRevision: string) {
    const results = await this.state.mutate([
      {
        patch: {
          id: job.id,
          ifRevisionID: expectedRevision,
          set: serialize(job),
        },
      },
    ])
    return deserialize(results[0].document)
  }
  async saveOutput(
    data: Uint8Array,
    mimeType: string,
    metadata: Record<string, unknown>,
  ) {
    const asset = await this.rest.upload(data, mimeType)
    if (!metadata.reference) {
      const jobId = String(metadata.jobId ?? 'sync'),
        index = String(metadata.index ?? '0')
      await this.rest.mutate([
        {
          createOrReplace: {
            _id: `ai-generation-${createHash('sha256')
              .update(jobId + index + asset.assetId)
              .digest('hex')}`,
            _type: 'aiGenerationRecord',
            owner: metadata.owner,
            createdAt: new Date().toISOString(),
            prompt: metadata.prompt,
            model: metadata.model,
            asset: {_type: 'reference', _ref: asset.assetId},
            parametersJSON: JSON.stringify(metadata.parameters ?? metadata),
            sourceAssetIds: metadata.sourceAssetIds ?? [],
            jobId,
          },
        },
      ])
    }
    return asset
  }
  async resolveReference(reference: ReferenceImage, principal: Principal) {
    if (reference.data) return reference
    if (principal.sanityToken)
      return new SanityRest({
        ...this.rest.options,
        token: principal.sanityToken,
      }).reference(reference)
    if (this.rest.options.allowServerReferences)
      return this.rest.reference(reference)
    throw new RequestError(
      'User-scoped reference access requires a Sanity user token or a host resolver',
      403,
    )
  }
  async resolvePreset(id: string, principal: Principal) {
    if (!principal.sanityToken && !this.rest.options.allowServerReferences)
      throw new RequestError(
        'User-scoped preset access requires a Sanity user token or a host resolver',
        403,
      )
    const rest = principal.sanityToken
      ? new SanityRest({...this.rest.options, token: principal.sanityToken})
      : this.rest
    const preset = await rest.query<any>(
      '*[_id==$id && _type=="aiBrandPreset"][0]',
      {id},
    )
    if (!preset) throw new RequestError('Brand preset not found', 404)
    return [
      preset.instructions,
      preset.negativeInstructions
        ? `Avoid: ${preset.negativeInstructions}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
}
export interface BudgetLimits {
  dailyImages?: number
  perMinute?: number
  projectDailyImages?: number
  dailyUsd?: number
}
export class SanityBudgetStore implements BudgetStore {
  private rest: SanityRest
  constructor(
    options: SanityStoreOptions,
    private limits: BudgetLimits = {},
    private namespace = '',
  ) {
    this.rest = new SanityRest(options)
  }
  async reserve(
    owner: string,
    units: number,
    key: string,
    estimatedCostUsd = 0,
  ) {
    if (!Number.isInteger(units) || units < 1 || units > 20)
      throw new Error('Invalid reservation')
    const now = new Date(),
      day = now.toISOString().slice(0, 10),
      minute = now.toISOString().slice(0, 16)
    const scopes = [
      {
        scope: `user:${this.namespace}:${owner}:${day}`,
        limit: this.limits.dailyImages ?? 100,
        costLimit: this.limits.dailyUsd,
      },
      {
        scope: `rate:${this.namespace}:${owner}:${minute}`,
        limit: this.limits.perMinute ?? 10,
      },
      {
        scope: `project:${this.namespace}:${day}`,
        limit: this.limits.projectDailyImages ?? 1000,
      },
    ]
    const ids = scopes.map(
      (s) => 'ai-budget-' + createHash('sha256').update(s.scope).digest('hex'),
    )
    await this.rest.mutate(
      ids.map((id, i) => ({
        createIfNotExists: {
          _id: id,
          _type: 'aiGenerationBudget',
          scope: scopes[i].scope,
          count: 0,
          costUsd: 0,
          reservations: [],
          expiresAt: new Date(now.getTime() + 2 * 86400_000).toISOString(),
        },
      })),
    )
    for (let attempt = 0; attempt < 5; attempt++) {
      const docs = await Promise.all(
        ids.map((id) => this.rest.query<any>('*[_id==$id][0]', {id})),
      )
      if (docs.every((d) => d?.reservations?.includes(key))) return
      for (const [index, doc] of docs.entries())
        if (
          !doc ||
          doc.count + units > scopes[index].limit ||
          (scopes[index].costLimit !== undefined &&
            (doc.costUsd ?? 0) + estimatedCostUsd > scopes[index].costLimit!)
        )
          throw new Error('Generation quota exceeded')
      try {
        await this.rest.mutate(
          docs.map((doc) => ({
            patch: {
              id: doc._id,
              ifRevisionID: doc._rev,
              set: {
                count: doc.count + units,
                costUsd: (doc.costUsd ?? 0) + estimatedCostUsd,
                reservations: [...(doc.reservations ?? []), key],
              },
            },
          })),
        )
        return
      } catch (error) {
        if (
          !(error instanceof RequestError) ||
          error.status !== 409 ||
          attempt === 4
        )
          throw error
      }
    }
  }
}
