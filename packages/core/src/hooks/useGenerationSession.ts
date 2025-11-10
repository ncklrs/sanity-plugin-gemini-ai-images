import {useState, useCallback, useEffect} from 'react'
import type {GenerationSession, SeriesGenerationResult} from '../types.js'

const STORAGE_KEY = 'gemini-generation-sessions'

interface UseGenerationSessionResult {
  session: GenerationSession | null
  sessions: GenerationSession[]
  addToSession: (result: SeriesGenerationResult) => void
  clearSession: () => void
  saveSession: () => void
  loadSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  createNewSession: () => void
}

export function useGenerationSession(): UseGenerationSessionResult {
  const [session, setSession] = useState<GenerationSession | null>(null)
  const [sessions, setSessions] = useState<GenerationSession[]>([])

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedSessions = JSON.parse(stored) as GenerationSession[]
        setSessions(parsedSessions)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save sessions:', error)
    }
  }, [sessions])

  const createNewSession = useCallback(() => {
    const newSession: GenerationSession = {
      id: `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      results: [],
      savedImages: [],
    }
    setSession(newSession)
  }, [])

  const addToSession = useCallback((result: SeriesGenerationResult) => {
    setSession((current) => {
      if (!current) {
        const newSession: GenerationSession = {
          id: `session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          results: [result],
          savedImages: [],
        }
        return newSession
      }

      return {
        ...current,
        results: [...current.results, result],
      }
    })
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
  }, [])

  const saveSession = useCallback(() => {
    if (!session) return

    setSessions((current) => {
      // Check if session already exists
      const existingIndex = current.findIndex((s) => s.id === session.id)

      if (existingIndex >= 0) {
        // Update existing session
        const updated = [...current]
        updated[existingIndex] = session
        return updated
      }

      // Add new session
      return [...current, session]
    })
  }, [session])

  const loadSession = useCallback(
    (sessionId: string) => {
      const foundSession = sessions.find((s) => s.id === sessionId)
      if (foundSession) {
        setSession(foundSession)
      }
    },
    [sessions],
  )

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((current) => current.filter((s) => s.id !== sessionId))
    setSession((current) => (current?.id === sessionId ? null : current))
  }, [])

  return {
    session,
    sessions,
    addToSession,
    clearSession,
    saveSession,
    loadSession,
    deleteSession,
    createNewSession,
  }
}
