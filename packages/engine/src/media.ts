import {GoogleGenAI} from '@google/genai'
import {
  modelCatalog,
  RequestError,
} from 'sanity-plugin-gemini-ai-images-contracts'
import {
  createGenerationHandler,
  authorize,
  corsHeaders,
  errorResponse,
  readJson,
  apiKeyAuthorizer,
} from './http.js'
import {createProviders} from './providers.js'
import {
  SanityJobStore,
  SanityBudgetStore,
  type SanityStoreOptions,
  type BudgetLimits,
} from './sanity-store.js'
import {JobService, createJobHandler} from './jobs.js'
import {VeoProvider} from './video.js'
import type {EngineOptions, Principal} from './types.js'
export interface SanityMediaOptions extends Omit<EngineOptions, 'providers'> {
  sanity: SanityStoreOptions
  geminiApiKey?: string
  openaiApiKey?: string
  vertex?: {project: string; location: string}
  /** Isolate authoritative jobs and budgets from editor-writable content. */
  stateSanity?: SanityStoreOptions
  limits?: BudgetLimits
  suggestMetadata?: (
    input: {assetId: string; prompt: string},
    principal: Principal,
  ) => Promise<{alt: string; caption: string}>
  enableVideo?: boolean
}
export function createSanityMediaHandlers(config: SanityMediaOptions) {
  const store = new SanityJobStore(config.sanity, config.stateSanity)
  const options: EngineOptions = {
    ...config,
    namespace: `${config.sanity.projectId}/${config.sanity.dataset}`,
    providers: createProviders(config),
    budget:
      config.budget ??
      new SanityBudgetStore(
        config.stateSanity ?? config.sanity,
        config.limits,
        `${config.sanity.projectId}/${config.sanity.dataset}`,
      ),
    resolveReference:
      config.resolveReference ?? ((r, p) => store.resolveReference(r, p)),
    resolvePreset:
      config.resolvePreset ?? ((id, p) => store.resolvePreset(id, p)),
  }
  const video =
    config.enableVideo && config.geminiApiKey
      ? new VeoProvider(
          new GoogleGenAI({apiKey: config.geminiApiKey}),
          config.geminiApiKey,
        )
      : undefined
  const service = new JobService(store, options, video),
    generation = createGenerationHandler(options),
    jobs = createJobHandler(service, options)
  const utility = async (request: Request) => {
    let headers: Record<string, string> = {}
    try {
      headers = corsHeaders(request, options.origins)
      if (request.method === 'OPTIONS')
        return new Response(null, {status: 204, headers})
      const principal = await authorize(request, options),
        path = new URL(request.url).pathname
      if (path.endsWith('/capabilities') && request.method === 'GET')
        return Response.json(
          {
            models: modelCatalog.filter(
              (m) =>
                (!options.policy?.allowedModels ||
                  options.policy.allowedModels.includes(m.id)) &&
                options.providers[m.provider],
            ),
            video: !!video && !!principal.canUseVideo,
            prices: options.prices ?? {},
          },
          {headers},
        )
      if (request.method !== 'POST')
        throw new RequestError('Method not allowed', 405)
      const body = (await readJson(request, 20000)) as any
      if (path.endsWith('/reference'))
        return Response.json(
          await options.resolveReference!(
            {assetId: body.assetId, role: 'subject'},
            principal,
          ),
          {headers},
        )
      if (path.endsWith('/suggestions') && config.suggestMetadata) {
        if (
          typeof body.assetId !== 'string' ||
          !/^image-[a-zA-Z0-9-]+$/.test(body.assetId) ||
          typeof body.prompt !== 'string' ||
          body.prompt.length > 10000
        )
          throw new RequestError('Invalid metadata suggestion request')
        await options.resolveReference!(
          {assetId: body.assetId, role: 'subject'},
          principal,
        )
        return Response.json(await config.suggestMetadata(body, principal), {
          headers,
        })
      }
      throw new RequestError('Route not configured', 404)
    } catch (error) {
      return errorResponse(error, headers)
    }
  }
  const handle = (request: Request) => {
    const path = new URL(request.url).pathname
    return /\/jobs(?:\/|$)/.test(path)
      ? jobs(request)
      : /\/(reference|suggestions|capabilities)$/.test(path)
        ? utility(request)
        : generation(request)
  }
  return {handle, generation, jobs, service, utility}
}
export function createEnvironmentMediaHandler() {
  if (
    !process.env.SANITY_PROJECT_ID ||
    !process.env.SANITY_DATASET ||
    !process.env.SANITY_API_TOKEN
  )
    return undefined
  return createSanityMediaHandlers({
    sanity: {
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET,
      token: process.env.SANITY_API_TOKEN,
    },
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    authorize: apiKeyAuthorizer(process.env.GEMINI_PLUGIN_API_KEY),
    origins: (process.env.GEMINI_ALLOWED_ORIGINS ?? '')
      .split(',')
      .filter(Boolean),
  }).handle
}
