import {GenerateVideosOperation, type GoogleGenAI} from '@google/genai'
import type {VideoRequest} from 'sanity-plugin-gemini-ai-images-contracts'
import type {VideoProvider} from './types.js'
export class VeoProvider implements VideoProvider {
  constructor(
    private client: GoogleGenAI,
    private apiKey?: string,
    private transport: typeof fetch = fetch,
  ) {}
  async start(request: VideoRequest, signal?: AbortSignal) {
    const operation = await this.client.models.generateVideos({
      model: request.model,
      prompt: request.prompt,
      image: request.reference?.data
        ? {
            imageBytes: request.reference.data,
            mimeType: request.reference.mimeType,
          }
        : undefined,
      config: {
        abortSignal: signal,
        numberOfVideos: 1,
        aspectRatio: request.aspectRatio,
        durationSeconds: request.durationSeconds,
        resolution: request.resolution,
      },
    })
    if (!operation.name) throw new Error('Video operation was not returned')
    return operation.name
  }
  async poll(name: string) {
    const operation = new GenerateVideosOperation()
    operation.name = name
    const result = await this.client.operations.getVideosOperation({operation})
    if (!result.done) return {done: false}
    if (result.error) return {done: true, error: 'Video generation failed'}
    const video = result.response?.generatedVideos?.[0]?.video
    if (!video) return {done: true, error: 'No video was returned'}
    if (video.videoBytes)
      return {
        done: true,
        data: Uint8Array.from(Buffer.from(video.videoBytes, 'base64')),
        mimeType: video.mimeType ?? 'video/mp4',
      }
    if (!video.uri) throw new Error('No video URL returned')
    const url = new URL(video.uri)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'generativelanguage.googleapis.com'
    )
      throw new Error('Unsupported provider video URL')
    let current = url
    let response: Response | undefined
    for (let hop = 0; hop < 5; hop++) {
      const host = current.hostname
      if (
        current.protocol !== 'https:' ||
        current.username ||
        current.password ||
        !(
          host === 'generativelanguage.googleapis.com' ||
          host === 'storage.googleapis.com' ||
          host.endsWith('.googleusercontent.com')
        )
      )
        throw new Error('Unsupported provider video URL')
      response = await this.transport(current.toString(), {
        headers:
          host === 'generativelanguage.googleapis.com' && this.apiKey
            ? {'x-goog-api-key': this.apiKey}
            : {},
        redirect: 'manual',
      })
      if (![301, 302, 303, 307, 308].includes(response.status)) break
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) throw new Error('Video redirect is missing a location')
      current = new URL(location, current)
      response = undefined
    }
    if (!response) throw new Error('Video redirect limit exceeded')
    if (!response.ok) throw new Error('Video download failed')
    const chunks: Uint8Array[] = []
    let length = 0
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Video bytes missing')
    try {
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        length += chunk.value.length
        if (length > 100_000_000) {
          await reader.cancel()
          throw new Error('Video exceeds download limit')
        }
        chunks.push(chunk.value)
      }
    } finally {
      reader.releaseLock()
    }
    return {
      done: true,
      data: Uint8Array.from(Buffer.concat(chunks)),
      mimeType: 'video/mp4',
    }
  }
}
