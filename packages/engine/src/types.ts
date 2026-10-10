import type {
  ImageRequest,
  ImageOutput,
  RequestPolicy,
  ReferenceImage,
  VideoRequest,
  AssetOutput,
} from 'sanity-plugin-gemini-ai-images-contracts'
export interface Principal {
  id: string
  /** Request-scoped user token; never persisted or returned to the Studio. */
  sanityToken?: string
  canGenerate?: boolean
  canUseVideo?: boolean
}
export interface ImageProvider {
  generate(request: ImageRequest, signal?: AbortSignal): Promise<ImageOutput>
}
export interface BudgetStore {
  reserve(
    owner: string,
    units: number,
    key: string,
    estimatedCostUsd?: number,
  ): Promise<void>
}
export interface EngineOptions {
  /** Include project/dataset when several deployments share one job store. */
  namespace?: string
  providers: Partial<Record<'gemini' | 'openai', ImageProvider>>
  authorize?: (request: Request) => Promise<Principal | null>
  allowUnauthenticated?: boolean
  policy?: RequestPolicy
  budget?: BudgetStore
  origins?: string[]
  maxBodyBytes?: number
  concurrency?: number
  maxRetries?: number
  maxEstimatedCostUsd?: number
  instructions?: string
  prices?: Record<string, number>
  resolveReference?: (
    reference: ReferenceImage,
    principal: Principal,
  ) => Promise<ReferenceImage>
  resolvePreset?: (id: string, principal: Principal) => Promise<string>
}
export interface VideoProvider {
  start(request: VideoRequest, signal?: AbortSignal): Promise<string>
  poll(operation: string): Promise<{
    done: boolean
    data?: Uint8Array
    mimeType?: string
    error?: string
  }>
}
export interface JobItem {
  index: number
  variation: string
  status: 'pending' | 'running' | 'complete' | 'failed' | 'uncertain'
  leaseUntil?: number
  claim?: string
  error?: string
  output?: AssetOutput
  operation?: string
}
export interface GenerationJob {
  namespace?: string
  id: string
  revision: string
  owner: string
  kind: 'image' | 'video'
  fingerprint: string
  createdAt: string
  updatedAt: string
  status:
    'queued' | 'running' | 'complete' | 'partial' | 'cancelled' | 'uncertain'
  request: ImageRequest | VideoRequest
  items: JobItem[]
  anchor?: AssetOutput
}
export interface JobStore {
  create(job: Omit<GenerationJob, 'revision'>): Promise<GenerationJob>
  get(id: string): Promise<GenerationJob | null>
  update(job: GenerationJob, expectedRevision: string): Promise<GenerationJob>
  saveOutput(
    data: Uint8Array,
    mimeType: string,
    metadata: Record<string, unknown>,
  ): Promise<{assetId: string; url: string}>
  resolveReference(
    reference: ReferenceImage,
    principal: Principal,
  ): Promise<ReferenceImage>
}
