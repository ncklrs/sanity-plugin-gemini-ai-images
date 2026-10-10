import {expect, it} from 'vitest'
import {createLambdaHandler} from '../packages/engine/src/lambda'
it('bridges Lambda HTTP API base64 bodies, routes and response headers', async () => {
  let received: Request | undefined
  const handler = createLambdaHandler(async (request) => {
    received = request
    return Response.json(
      {body: await request.json()},
      {headers: {'Access-Control-Allow-Origin': 'https://studio.test'}},
    )
  })
  const output = await handler({
    rawPath: '/api/ai/jobs',
    rawQueryString: 'a=1',
    requestContext: {http: {method: 'POST'}},
    headers: {host: 'api.test', 'content-type': 'application/json'},
    body: Buffer.from('{"prompt":"chair"}').toString('base64'),
    isBase64Encoded: true,
  })
  expect(received?.url).toBe('https://api.test/api/ai/jobs?a=1')
  expect(output.statusCode).toBe(200)
  expect(JSON.parse(output.body)).toEqual({body: {prompt: 'chair'}})
  expect(output.headers['access-control-allow-origin']).toBe(
    'https://studio.test',
  )
})
it('bridges REST API preflight without constructing a body for OPTIONS', async () => {
  const handler = createLambdaHandler(
    async (request) =>
      new Response(null, {status: request.method === 'OPTIONS' ? 204 : 400}),
  )
  expect(
    (
      await handler({
        path: '/api/ai',
        httpMethod: 'OPTIONS',
        headers: {host: 'api.test'},
      })
    ).statusCode,
  ).toBe(204)
})
