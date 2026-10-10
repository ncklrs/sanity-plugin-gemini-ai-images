import {randomUUID, timingSafeEqual} from 'node:crypto'
import {
  normalizeImageRequest,
  RequestError,
} from 'sanity-plugin-gemini-ai-images-contracts'
import {generateImages, prepareRequest} from './generation.js'
import {ProviderError, createProviders} from './providers.js'
import type {EngineOptions, Principal} from './types.js'

export async function readJson(
  request: Request,
  maxBytes = 21_000_000,
): Promise<unknown> {
  const length = request.headers.get('content-length')
  if (length && (!Number.isFinite(Number(length)) || Number(length) > maxBytes))
    throw new RequestError(
      'Request exceeds size limit',
      413,
      'request_too_large',
    )
  const reader = request.body?.getReader()
  if (!reader) throw new RequestError('Request body is required')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const {value, done} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new RequestError(
          'Request exceeds size limit',
          413,
          'request_too_large',
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new RequestError('Invalid JSON request')
  }
}
export function corsHeaders(request: Request, origins: string[] = []) {
  const origin = request.headers.get('origin')
  if (origin && !origins.includes(origin) && !origins.includes('*'))
    throw new RequestError('Origin is not allowed', 403, 'origin_denied')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-API-Key, Idempotency-Key',
  }
  if (origin && (origins.includes(origin) || origins.includes('*'))) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  } else if (origins.includes('*')) headers['Access-Control-Allow-Origin'] = '*'
  return headers
}
export async function authorize(
  request: Request,
  options: EngineOptions,
): Promise<Principal> {
  const principal =
    (await options.authorize?.(request)) ??
    (options.allowUnauthenticated ? {id: 'anonymous'} : null)
  if (!principal || !principal.id || principal.canGenerate === false)
    throw new RequestError('Authentication required', 401, 'unauthorized')
  return principal
}
export function errorResponse(
  error: unknown,
  headers: Record<string, string> = {},
) {
  const known = error instanceof RequestError || error instanceof ProviderError
  return Response.json(
    {
      error: known ? error.message : 'Request failed',
      code: known ? error.code : 'internal_error',
    },
    {status: known ? error.status : 500, headers},
  )
}
export function createGenerationHandler(options: EngineOptions) {
  return async (request: Request): Promise<Response> => {
    let headers: Record<string, string> = {}
    try {
      headers = corsHeaders(request, options.origins)
      if (request.method === 'OPTIONS')
        return new Response(null, {status: 204, headers})
      if (request.method !== 'POST')
        throw new RequestError('Method not allowed', 405, 'method_not_allowed')
      const principal = await authorize(request, options)
      const input = normalizeImageRequest(
        await readJson(request, options.maxBodyBytes),
        options.policy,
      )
      if (input.series?.anchor)
        throw new RequestError(
          'Generated anchors require the durable jobs endpoint',
        )
      const estimate = options.prices?.[input.model]
      if (
        options.maxEstimatedCostUsd !== undefined &&
        (estimate === undefined ||
          estimate * (input.series?.quantity ?? 1) >
            options.maxEstimatedCostUsd)
      )
        throw new RequestError(
          'Request exceeds configured cost estimate limit',
          429,
          'budget_exceeded',
        )
      try {
        await options.budget?.reserve(
          principal.id,
          input.series?.quantity ?? 1,
          randomUUID(),
          (estimate ?? 0) * (input.series?.quantity ?? 1),
        )
      } catch {
        throw new RequestError(
          'Generation budget exceeded',
          429,
          'budget_exceeded',
        )
      }
      const prepared = await prepareRequest(input, options, principal)
      const result = await generateImages(prepared, options, request.signal)
      return Response.json(result, {
        status: 'errors' in result && result.errors?.length ? 207 : 200,
        headers,
      })
    } catch (error) {
      return errorResponse(error, headers)
    }
  }
}
export function apiKeyAuthorizer(key: string | undefined) {
  return async (request: Request): Promise<Principal | null> => {
    const actual = request.headers.get('x-api-key') ?? ''
    if (
      !key ||
      Buffer.byteLength(actual) !== Buffer.byteLength(key) ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(key))
    )
      return null
    return {id: 'shared-key'}
  }
}
export function environmentOptions(): EngineOptions {
  return {
    providers: createProviders({
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      vertex: process.env.GOOGLE_CLOUD_PROJECT
        ? {
            project: process.env.GOOGLE_CLOUD_PROJECT,
            location: process.env.GOOGLE_CLOUD_LOCATION ?? 'global',
          }
        : undefined,
    }),
    authorize: apiKeyAuthorizer(process.env.GEMINI_PLUGIN_API_KEY),
    allowUnauthenticated: process.env.GEMINI_ALLOW_ANONYMOUS === 'true',
    origins: (process.env.GEMINI_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  }
}
