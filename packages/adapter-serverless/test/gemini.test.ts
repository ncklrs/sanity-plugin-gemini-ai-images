import {describe, expect, it, vi} from 'vitest'
import type {GoogleGenAI} from '@google/genai'
import {createGeminiProvider, MissingApiKeyError} from '../src/providers/gemini.js'

function mockClient(response: unknown) {
  const generateContent = vi.fn(async () => response)
  return {client: {models: {generateContent}} as unknown as GoogleGenAI, generateContent}
}

const imageResponse = {
  candidates: [{content: {parts: [{text: 'here you go'}, {inlineData: {data: 'aW1n', mimeType: 'image/jpeg'}}]}}],
}

describe('createGeminiProvider', () => {
  it('returns the first inline image', async () => {
    const {client} = mockClient(imageResponse)
    const result = await createGeminiProvider({client}).generate({prompt: 'x', model: 'gemini-3-pro-image'})
    expect(result).toEqual({imageData: 'aW1n', mimeType: 'image/jpeg'})
  })

  it('sends model, aspect ratio, and image size', async () => {
    const {client, generateContent} = mockClient(imageResponse)
    await createGeminiProvider({client}).generate({
      prompt: 'x',
      model: 'gemini-3-pro-image',
      aspectRatio: '16:9',
      imageSize: '2K',
    })
    expect(generateContent).toHaveBeenCalledWith({
      model: 'gemini-3-pro-image',
      contents: [{parts: [{text: 'x'}]}],
      config: {responseModalities: ['IMAGE'], imageConfig: {aspectRatio: '16:9', imageSize: '2K'}},
    })
  })

  it('omits image size for models that do not support it', async () => {
    const {client, generateContent} = mockClient(imageResponse)
    await createGeminiProvider({client}).generate({prompt: 'x', model: 'gemini-2.5-flash-image', imageSize: '2K'})
    expect((generateContent.mock.calls[0] as any)[0].config.imageConfig).toEqual({})
  })

  it('sends the base image before the prompt with its MIME type', async () => {
    const {client, generateContent} = mockClient(imageResponse)
    await createGeminiProvider({client}).generate({
      prompt: 'edit',
      model: 'm',
      baseImage: 'abc',
      baseImageMimeType: 'image/webp',
    })
    expect((generateContent.mock.calls[0] as any)[0].contents[0].parts).toEqual([
      {inlineData: {mimeType: 'image/webp', data: 'abc'}},
      {text: 'edit'},
    ])
  })

  it('explains blocked prompts', async () => {
    const {client} = mockClient({promptFeedback: {blockReason: 'SAFETY'}})
    await expect(createGeminiProvider({client}).generate({prompt: 'x', model: 'm'})).rejects.toThrow(
      'Prompt was blocked: SAFETY',
    )
  })

  it('reports the finish reason when no image is returned', async () => {
    const {client} = mockClient({candidates: [{finishReason: 'IMAGE_SAFETY', content: {parts: []}}]})
    await expect(createGeminiProvider({client}).generate({prompt: 'x', model: 'm'})).rejects.toThrow('IMAGE_SAFETY')
  })

  it('throws MissingApiKeyError without a key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    await expect(createGeminiProvider().generate({prompt: 'x', model: 'm'})).rejects.toBeInstanceOf(
      MissingApiKeyError,
    )
    vi.unstubAllEnvs()
  })
})
