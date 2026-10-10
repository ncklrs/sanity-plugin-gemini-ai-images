/** Advance one known job as its owner using a fresh server-held user token.
 * Schedule repeated invocations in your host's queue; never put tokens in jobs.
 * Each request does one image generation or one Veo start/poll. */
export async function advanceJob(endpoint: string, id: string, token: string) {
  const response = await fetch(
    `${endpoint.replace(/\/$/, '')}/jobs/${encodeURIComponent(id)}/run`,
    {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`},
    },
  )
  if (!response.ok) throw new Error(`Worker request failed: ${response.status}`)
  const job = (await response.json()) as {status: string}
  return {job, needsAnotherStep: ['queued', 'running'].includes(job.status)}
}
