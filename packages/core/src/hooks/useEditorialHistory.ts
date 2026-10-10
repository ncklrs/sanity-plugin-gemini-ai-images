import {useCallback, useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {
  listGenerationRecords,
  deleteGenerationRecord,
  exportGenerationHistory,
  pruneGenerationHistory,
  type GenerationRecord,
} from '../lib/editorial.js'
export function useEditorialHistory(enabled = true) {
  const client = useClient({apiVersion: '2024-01-01'}),
    [records, setRecords] = useState<GenerationRecord[]>([]),
    [error, setError] = useState<string>(),
    [loading, setLoading] = useState(false)
  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setRecords(await listGenerationRecords(client))
      setError(undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'History unavailable')
    } finally {
      setLoading(false)
    }
  }, [client, enabled])
  useEffect(() => {
    void refresh()
  }, [refresh])
  const remove = async (id: string) => {
    try {
      await deleteGenerationRecord(client, id)
      await refresh()
    } catch (e) {
      setError(String(e))
      throw e
    }
  }
  const prune = async (days: number) => {
    try {
      await pruneGenerationHistory(client, days)
      await refresh()
    } catch (e) {
      setError(String(e))
      throw e
    }
  }
  return {
    records,
    loading,
    error,
    refresh,
    remove,
    prune,
    exportJSON: () => exportGenerationHistory(records),
  }
}
