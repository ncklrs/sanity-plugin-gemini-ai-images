import {expect, it, vi} from 'vitest'
import {VeoProvider} from '../packages/engine/src/video'
import {normalizeVideoRequest} from '../packages/contracts/src/index'
it('creates a Veo operation and polls/downloads its result without exposing keys', async () => {
  const generateVideos = vi.fn(async () => ({name: 'operation/123'}))
  const getVideosOperation = vi.fn(async () => ({
    done: true,
    response: {
      generatedVideos: [{video: {videoBytes: 'YQ==', mimeType: 'video/mp4'}}],
    },
  }))
  const p = new VeoProvider(
    {models: {generateVideos}, operations: {getVideosOperation}} as never,
    'key',
  )
  const operation = await p.start(
    normalizeVideoRequest({prompt: 'waves', model: 'veo-3.1-generate-preview'}),
  )
  expect(operation).toBe('operation/123')
  expect(generateVideos.mock.calls[0][0]).toMatchObject({
    config: {durationSeconds: 8, aspectRatio: '16:9'},
  })
  expect(await p.poll(operation)).toMatchObject({
    done: true,
    data: new Uint8Array([97]),
  })
})
it('rejects provider video URLs that could expose credentials to another host', async () => {
  const getVideosOperation = vi.fn(async () => ({
    done: true,
    response: {generatedVideos: [{video: {uri: 'https://evil.test/video'}}]},
  }))
  const p = new VeoProvider({operations: {getVideosOperation}} as never, 'key')
  await expect(p.poll('operation/123')).rejects.toThrow('video URL')
})
