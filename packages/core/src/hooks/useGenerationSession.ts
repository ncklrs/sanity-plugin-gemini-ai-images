import {useState, useCallback, useEffect} from 'react'
import {useClient} from 'sanity'
import {uploadImageToSanity} from '../lib/sanity-upload.js'
import type {GenerationSession, SeriesGenerationResult} from '../types.js'
/** Legacy session API backed by Sanity documents/assets, never binary localStorage. */
export function useGenerationSession() {
  const client = useClient({apiVersion: '2024-01-01'})
  const [session, setSession] = useState<GenerationSession | null>(null),
    [sessions, setSessions] = useState<GenerationSession[]>([]),
    [error, setError] = useState<string>()
  useEffect(() => {
    let active = true
    client
      .fetch<any[]>(
        '*[_type=="aiGenerationSession"] | order(timestamp desc)[0...50]',
      )
      .then((docs) => {
        if (active)
          setSessions(
            docs.map((d) => ({
              id: d._id,
              timestamp: d.timestamp,
              results: JSON.parse(d.resultsJSON),
              savedImages: d.savedImages ?? [],
            })),
          )
      })
      .catch((e) => {
        if (active) setError(String(e))
      })
    return () => {
      active = false
    }
  }, [client])
  const createNewSession = () =>
    setSession({
      id: `ai-session-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      results: [],
      savedImages: [],
    })
  const addToSession = useCallback(
    (result: SeriesGenerationResult) =>
      setSession((current) => ({
        ...current,
        id: current?.id ?? `ai-session-${crypto.randomUUID()}`,
        timestamp: current?.timestamp ?? new Date().toISOString(),
        results: [...(current?.results ?? []), result],
        savedImages: current?.savedImages ?? [],
      })),
    [],
  )
  const saveSession = async () => {
    if (!session) return
    const results: SeriesGenerationResult[] = [],
      savedImages = [...session.savedImages]
    for (const result of session.results) {
      const images = []
      for (const image of result.images) {
        if (image.imageData) {
          const asset = await uploadImageToSanity(
            client,
            image.imageData,
            `session-${crypto.randomUUID()}`,
            {prompt: result.metadata.basePrompt, model: result.metadata.model},
            image.mimeType,
          )
          images.push({
            ...image,
            imageData: '',
            assetId: asset._id,
            url: asset.url,
          })
          savedImages.push(asset._id)
        } else images.push(image)
      }
      results.push({...result, images})
    }
    const saved = {...session, results, savedImages: [...new Set(savedImages)]}
    await client.createOrReplace({
      _id: saved.id,
      _type: 'aiGenerationSession',
      timestamp: saved.timestamp,
      resultsJSON: JSON.stringify(results),
      savedImages: saved.savedImages,
    })
    setSession(saved)
    setSessions((current) => [
      saved,
      ...current.filter((s) => s.id !== saved.id),
    ])
  }
  const deleteSession = async (id: string) => {
    if (!/^ai-session-[a-zA-Z0-9-]+$/.test(id))
      throw new Error('Invalid session')
    await client.delete(id)
    setSessions((current) => current.filter((s) => s.id !== id))
    setSession((current) => (current?.id === id ? null : current))
  }
  return {
    session,
    sessions,
    error,
    addToSession,
    saveSession,
    deleteSession,
    createNewSession,
    clearSession: () => setSession(null),
    loadSession: (id: string) =>
      setSession(sessions.find((s) => s.id === id) ?? null),
  }
}
