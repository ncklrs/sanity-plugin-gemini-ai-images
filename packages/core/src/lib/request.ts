export type RequestHeaders = () =>
  Promise<Record<string, string>> | Record<string, string>
export async function requestHeaders(
  apiKey?: string,
  getHeaders?: RequestHeaders,
) {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? {'X-API-Key': apiKey} : {}),
    ...(await getHeaders?.()),
  }
}
export async function mediaRequest(
  url: string,
  body: unknown,
  apiKey?: string,
  getHeaders?: RequestHeaders,
) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: await requestHeaders(apiKey, getHeaders),
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Request failed')
  return data
}
