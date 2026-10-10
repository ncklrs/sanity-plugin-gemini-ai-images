import {useCallback, useEffect, useRef, useState} from 'react'
import {useClient} from 'sanity'
import {requestHeaders, type RequestHeaders} from '../lib/request.js'
import type {AssetOutput} from 'sanity-plugin-gemini-ai-images-contracts'
export interface JobSnapshot {
  id: string
  status: string
  kind: 'image' | 'video'
  items: Array<{
    index: number
    variation: string
    status: string
    error?: string
    output?: AssetOutput
  }>
}
export function useGenerationJob(
  endpoint?: string,
  apiKey?: string,
  getHeaders?: RequestHeaders,
  kind: 'image' | 'video' = 'image',
) {
  const client = useClient({apiVersion: '2024-01-01'}),
    config = client.config(),
    storageKey = `sanity-ai-job:${config.projectId}:${config.dataset}:${endpoint}${kind === 'video' ? ':video' : ''}`
  const [job, setJob] = useState<JobSnapshot | null>(null),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false)
  const active = useRef(true),
    pending = useRef(false),
    key = useRef<string | undefined>(undefined),
    headersRef = useRef(getHeaders),
    scopeRef = useRef(storageKey)
  headersRef.current = getHeaders
  scopeRef.current = storageKey
  const call = useCallback(
    async (path: string, method: string, body?: unknown, idem?: string) => {
      if (!endpoint) throw new Error('Configure a jobs endpoint')
      const response = await fetch(`${endpoint.replace(/\/$/, '')}${path}`, {
        method,
        credentials: 'include',
        headers: {
          ...(await requestHeaders(apiKey, headersRef.current)),
          ...(idem ? {'Idempotency-Key': idem} : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Job request failed')
      if (active.current && scopeRef.current === storageKey) setJob(data)
      return data as JobSnapshot
    },
    [endpoint, apiKey, storageKey],
  )
  useEffect(() => {
    active.current = true
    key.current = undefined
    pending.current = false
    setJob(null)
    setError(undefined)
    setBusy(false)
    if (endpoint) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
        if (saved?.key) key.current = saved.key
        if (saved?.id) {
          void call(`/${encodeURIComponent(saved.id)}`, 'GET').catch((e) => {
            if (active.current && scopeRef.current === storageKey)
              setError(String(e))
          })
        }
      } catch {
        setError('Unable to restore job ID')
      }
    }
    return () => {
      active.current = false
    }
  }, [call, endpoint, storageKey])
  const step = useCallback(async () => {
    if (!job || pending.current) return
    pending.current = true
    try {
      setError(undefined)
      await call(`/${job.id}/run`, 'POST')
    } catch (e) {
      if (active.current && scopeRef.current === storageKey) setError(String(e))
    } finally {
      pending.current = false
    }
  }, [job?.id, call, storageKey])
  useEffect(() => {
    if (
      !endpoint ||
      !job ||
      !['queued', 'running'].includes(job.status) ||
      error
    )
      return
    const timer = setTimeout(
      () => void step(),
      job.kind === 'video' ? 10000 : 1000,
    )
    return () => clearTimeout(timer)
  }, [endpoint, job, step, error])
  const create = async (body: unknown) => {
    if (!endpoint) return null
    setBusy(true)
    setError(undefined)
    // Keep the key through an ambiguous create failure so retrying creation cannot
    // queue duplicate work. Changing inputs requires dismissing the previous run.
    key.current ??= crypto.randomUUID()
    const idempotencyKey = key.current
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({id: job?.id, key: idempotencyKey}),
      )
    } catch {}
    try {
      const created = await call('', 'POST', body, idempotencyKey)
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({id: created.id, key: idempotencyKey}),
        )
      } catch {
        setError('Job created; save its ID to resume: ' + created.id)
      }
      return created
    } catch (e) {
      if (active.current && scopeRef.current === storageKey) setError(String(e))
      return null
    } finally {
      if (active.current && scopeRef.current === storageKey) setBusy(false)
    }
  }
  const cancel = async () => {
    if (job)
      try {
        await call(`/${job.id}`, 'DELETE')
      } catch (e) {
        setError(String(e))
        throw e
      }
  }
  const retry = async (indices: number[]) => {
    if (job) {
      setError(undefined)
      try {
        await call(`/${job.id}/retry`, 'POST', {indices})
      } catch (e) {
        setError(String(e))
        throw e
      }
    }
  }
  const dismiss = () => {
    setJob(null)
    key.current = undefined
    setError(undefined)
    try {
      localStorage.removeItem(storageKey)
    } catch {}
  }
  return {job, error, busy, create, step, cancel, retry, dismiss}
}
