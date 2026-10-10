export interface LambdaHttpEvent {
  rawPath?: string
  path?: string
  rawQueryString?: string
  httpMethod?: string
  requestContext?: {http?: {method?: string}}
  headers?: Record<string, string | undefined>
  queryStringParameters?: Record<string, string | undefined>
  cookies?: string[]
  body?: string | null
  isBase64Encoded?: boolean
}
export function createLambdaHandler(
  handler: (request: Request) => Promise<Response>,
) {
  return async (event: LambdaHttpEvent) => {
    const headers = new Headers()
    for (const [key, value] of Object.entries(event.headers ?? {}))
      if (value !== undefined) headers.set(key, value)
    if (event.cookies?.length) headers.set('cookie', event.cookies.join('; '))
    const method =
      event.requestContext?.http?.method ?? event.httpMethod ?? 'GET'
    const protocol =
      headers.get('x-forwarded-proto') === 'http' ? 'http' : 'https'
    const query =
      event.rawQueryString ??
      new URLSearchParams(
        Object.entries(event.queryStringParameters ?? {}).filter(
          (pair): pair is [string, string] => pair[1] !== undefined,
        ),
      ).toString()
    const url = `${protocol}://${headers.get('host') ?? 'localhost'}${event.rawPath ?? event.path ?? '/'}${query ? '?' + query : ''}`
    headers.delete('content-length')
    const body =
      event.body && !['GET', 'HEAD', 'OPTIONS'].includes(method)
        ? event.isBase64Encoded
          ? Buffer.from(event.body, 'base64')
          : event.body
        : undefined
    const response = await handler(new Request(url, {method, headers, body}))
    const contentType = response.headers.get('content-type') ?? '',
      binary =
        !/^(application\/(json|.*\+json)|text\/)/.test(contentType) &&
        response.status !== 204
    const bytes = Buffer.from(await response.arrayBuffer()),
      responseHeaders = Object.fromEntries(response.headers)
    const cookies = response.headers.getSetCookie()
    delete responseHeaders['set-cookie']
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: bytes.toString(binary ? 'base64' : 'utf8'),
      isBase64Encoded: binary,
      ...(cookies.length ? {cookies} : {}),
    }
  }
}
