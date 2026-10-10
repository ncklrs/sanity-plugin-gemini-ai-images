import {expect, it} from 'vitest'
import {
  normalizeImageRequest,
  modelCatalog,
} from '../packages/contracts/src/index'

it('preserves legacy references and defaults', () => {
  expect(
    normalizeImageRequest({
      prompt: 'Edit',
      mode: 'edit',
      baseImage: 'YQ==',
      baseImageMimeType: 'image/jpeg',
    }),
  ).toMatchObject({
    model: 'gemini-nano-banana-2.1',
    references: [{data: 'YQ==', mimeType: 'image/jpeg', role: 'subject'}],
  })
})
it.each([
  {prompt: 'test', model: 'unknown'},
  {prompt: 'test', model: 'gemini-2.5-flash-image', resolution: '4K'},
  {prompt: 'test', model: 'gpt-image-2.5-flare', grounding: true},
  {
    prompt: 'test',
    references: [{data: 'bad!', mimeType: 'image/png', role: 'subject'}],
  },
  {
    prompt: 'test',
    references: [{data: 'YQ==', mimeType: 'image/png', role: 'evil'}],
  },
  {prompt: 'test', series: {quantity: 2.5, variations: ['a', 'b', 'c']}},
  {prompt: 'test', series: {quantity: 3, variations: ['a', 'b']}},
])('rejects unsupported or invalid controls before generation: %j', (input) => {
  expect(() => normalizeImageRequest(input)).toThrow()
})
it('enforces server models and quantity', () => {
  expect(() =>
    normalizeImageRequest(
      {prompt: 'test', model: 'gemini-3-pro-image'},
      {allowedModels: ['gemini-3.1-flash-image']},
    ),
  ).toThrow()
  expect(() =>
    normalizeImageRequest(
      {prompt: 'test', series: {quantity: 3, variations: ['a', 'b', 'c']}},
      {maxQuantity: 2},
    ),
  ).toThrow()
})
it('limits reference count according to model capabilities', () => {
  const ref = {data: 'YQ==', mimeType: 'image/png', role: 'subject'}
  expect(() =>
    normalizeImageRequest({
      prompt: 'test',
      model: 'gemini-3.1-flash-lite-image',
      references: Array(15).fill(ref),
    }),
  ).toThrow()
  expect(
    modelCatalog.find((m) => m.id === 'gemini-3-pro-image')?.resolutions,
  ).toContain('4K')
})
