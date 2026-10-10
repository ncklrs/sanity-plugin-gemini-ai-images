// @vitest-environment jsdom
import React from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import {afterEach, expect, it, vi} from 'vitest'
import {useGeminiGeneration} from '../packages/core/src/hooks/useGeminiGeneration'
import {useSeriesGeneration} from '../packages/core/src/hooks/useSeriesGeneration'
import {uploadImageToSanity} from '../packages/core/src/lib/sanity-upload'
import {useBatchUpload} from '../packages/core/src/hooks/useBatchUpload'

const {uploadAsset} = vi.hoisted(() => ({uploadAsset: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('sends the selected Pro model from the generation hook', async () => {
  let payload: Record<string, unknown> = {}
  vi.stubGlobal('fetch', async (_url: unknown, init: RequestInit) => {
    payload = JSON.parse(String(init.body))
    return Response.json({imageData: 'YQ==', mimeType: 'image/png'})
  })
  const {result} = renderHook(() => useGeminiGeneration())
  await act(async () => {
    await result.current.generateImage('A chair', {
      model: 'gemini-3-pro-image',
    } as never)
  })
  expect(payload.model).toBe('gemini-3-pro-image')
})

it('sends the actual reference MIME type and selected Flash model while editing', async () => {
  let payload: Record<string, unknown> = {}
  vi.stubGlobal('fetch', async (_url: unknown, init: RequestInit) => {
    payload = JSON.parse(String(init.body))
    return Response.json({imageData: 'YQ==', mimeType: 'image/png'})
  })
  const {result} = renderHook(() => useGeminiGeneration())
  await act(async () => {
    await result.current.editImage(
      new File(['a'], 'chair.jpg', {type: 'image/jpeg'}),
      'Make it blue',
      {model: 'gemini-3.1-flash-image'} as never,
    )
  })
  expect(payload).toMatchObject({
    baseImageMimeType: 'image/jpeg',
    model: 'gemini-3.1-flash-image',
  })
})

it('preserves partial series errors and the model in the hook result', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json(
      {
        images: [
          {
            imageData: 'YQ==',
            mimeType: 'image/png',
            variation: 'front',
            index: 0,
          },
        ],
        metadata: {model: 'gemini-3-pro-image'},
        errors: [{index: 1, variation: 'side', error: 'Quota exceeded'}],
      },
      {status: 207},
    ),
  )
  const {result} = renderHook(() => useSeriesGeneration('/generate'))
  let generated: unknown
  await act(async () => {
    generated = await result.current.generateSeries('A chair', {
      quantity: 2,
      variationType: 'angle',
      consistencyLevel: 'moderate',
      variations: ['front', 'side'],
    })
  })
  expect(generated).toMatchObject({
    metadata: {model: 'gemini-3-pro-image'},
    errors: [{index: 1}],
  })
})

it('uploads JPEG outputs with a JPEG content type and extension', async () => {
  let uploaded: Blob | undefined
  let filename: string | undefined
  const client = {
    assets: {
      upload: async (
        _kind: string,
        blob: Blob,
        options: {filename: string},
      ) => {
        uploaded = blob
        filename = options.filename
        return {
          _id: 'image-test',
          _type: 'sanity.imageAsset',
          url: 'https://example.test/chair.jpg',
        }
      },
    },
  }
  await uploadImageToSanity(
    client as never,
    'YQ==',
    'chair',
    undefined,
    'image/jpeg',
  )
  expect(uploaded?.type).toBe('image/jpeg')
  expect(filename).toBe('chair.jpg')
})

// Native controls isolate the plugin's behavior from Sanity UI's browser layout dependencies.
vi.mock('@sanity/ui', () => {
  const wrapper = ({children}: {children: React.ReactNode}) => (
    <div>{children}</div>
  )
  return {
    Box: wrapper,
    Card: wrapper,
    Flex: wrapper,
    Stack: wrapper,
    Text: wrapper,
    Grid: wrapper,
    Label: wrapper,
    TabList: wrapper,
    TabPanel: ({id, hidden, children}: any) => (
      <div data-panel={id} data-hidden={hidden}>
        {children}
      </div>
    ),
    Dialog: wrapper,
    TextInput: ({
      onChange,
      value,
    }: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input value={value} onChange={onChange} />
    ),
    TextArea: ({
      onChange,
      value,
    }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
      <textarea value={value} onChange={onChange} />
    ),
    Select: ({
      children,
      ...props
    }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
      <select {...props}>{children}</select>
    ),
    Button: ({
      text,
      onClick,
      disabled,
    }: {
      text: string
      onClick: () => void
      disabled?: boolean
    }) => (
      <button onClick={onClick} disabled={disabled}>
        {text}
      </button>
    ),
    Tab: ({label, onClick}: {label: string; onClick: () => void}) => (
      <button onClick={onClick}>{label}</button>
    ),
    Checkbox: ({
      checked,
      onChange,
    }: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input type="checkbox" checked={checked} onChange={onChange} />
    ),
    useToast: () => ({push: vi.fn()}),
  }
})
vi.mock('sanity', () => ({
  useClient: () => ({config: () => ({}), assets: {upload: uploadAsset}}),
  ImageInput: () => null,
  setIfMissing: (value: unknown, path: unknown[] = []) => ({
    type: 'setIfMissing',
    path,
    value,
  }),
  set: (value: unknown, path: unknown[] = []) => ({type: 'set', path, value}),
}))

it('reports indexed upload outcomes so failed paid generations can be retried', async () => {
  uploadAsset
    .mockResolvedValueOnce({_id: 'image-first'})
    .mockRejectedValueOnce(new Error('Permission denied'))
  const {result} = renderHook(() => useBatchUpload())
  let outcomes: unknown
  await act(async () => {
    outcomes = await result.current.uploadBatchWithResults([
      {imageData: 'YQ==', mimeType: 'image/png'},
      {imageData: 'Yg==', mimeType: 'image/png'},
    ])
  })
  expect(outcomes).toMatchObject({
    assets: [{_id: 'image-first'}],
    successfulIndices: [0],
    errors: [{index: 1}],
  })
  expect(result.current.uploadProgress).toMatchObject({
    completed: 2,
    total: 2,
    percentage: 100,
  })
})

it('honors configured series maximum and initial consistency', async () => {
  const {ImageGeneratorContent} =
    await import('../packages/core/src/components/ImageGeneratorContent')
  render(
    <ImageGeneratorContent
      maxSeriesQuantity={3}
      defaultConsistencyLevel="strict"
      onImageGenerated={() => {}}
    />,
  )
  expect((screen.getByRole('slider') as HTMLInputElement).max).toBe('3')
  expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('3')
  expect(
    (
      screen.getByDisplayValue(
        'Strict - Minimal variation',
      ) as HTMLSelectElement
    ).value,
  ).toBe('strict')
})

it('adjusts the requested quantity to the four-image Seasonal Themes template', async () => {
  const {ImageGeneratorContent} =
    await import('../packages/core/src/components/ImageGeneratorContent')
  let payload: any
  vi.stubGlobal('fetch', async (_url: unknown, init: RequestInit) => {
    payload = JSON.parse(String(init.body))
    return Response.json({
      images: payload.series.variations.map(
        (variation: string, index: number) => ({
          imageData: 'YQ==',
          mimeType: 'image/png',
          variation,
          index,
        }),
      ),
    })
  })
  const {container} = render(
    <ImageGeneratorContent onImageGenerated={() => {}} />,
  )
  fireEvent.change(screen.getByDisplayValue('Different Angles'), {
    target: {value: 'background'},
  })
  const seasonalCard = screen.getByText('Seasonal Themes').closest('div')!
    .parentElement!.parentElement!.parentElement!
  fireEvent.click(
    Array.from(seasonalCard.querySelectorAll('button')).find(
      (button) => button.textContent === 'Select',
    )!,
  )
  expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('4')
  fireEvent.change(container.querySelectorAll('textarea')[1], {
    target: {value: 'A blue chair'},
  })
  await act(async () => {
    fireEvent.click(screen.getByText('Generate Series'))
  })
  expect(payload.series.quantity).toBe(4)
  expect(payload.series.variations).toHaveLength(4)
})

it('keeps a failed series preview and retries its upload without generating again', async () => {
  const {ImageGeneratorContent} =
    await import('../packages/core/src/components/ImageGeneratorContent')
  const savedAssets: unknown[] = []
  let generationCount = 0
  vi.stubGlobal('fetch', async () => {
    generationCount++
    return Response.json({
      images: [
        {
          imageData: 'YQ==',
          mimeType: 'image/png',
          variation: 'front',
          index: 0,
        },
        {imageData: 'Yg==', mimeType: 'image/png', variation: 'side', index: 1},
      ],
    })
  })
  uploadAsset
    .mockReset()
    .mockResolvedValueOnce({_id: 'image-first'})
    .mockRejectedValueOnce(new Error('Temporary upload failure'))
    .mockResolvedValueOnce({_id: 'image-retried'})
  const {container} = render(
    <ImageGeneratorContent
      maxSeriesQuantity={2}
      onImageGenerated={(asset) => savedAssets.push(asset)}
    />,
  )
  fireEvent.change(container.querySelectorAll('textarea')[0], {
    target: {value: 'A chair'},
  })
  fireEvent.click(screen.getAllByText('Select')[0])
  await act(async () => {
    fireEvent.click(screen.getByText('Generate Series'))
  })
  await act(async () => {
    fireEvent.click(screen.getByText('Upload Selected (2)'))
  })
  expect(
    container.querySelectorAll('img[alt^="Generated image"]'),
  ).toHaveLength(1)
  expect(savedAssets).toHaveLength(0)
  await act(async () => {
    fireEvent.click(screen.getByText('Upload Selected (1)'))
  })
  expect(savedAssets).toMatchObject([{_id: 'image-retried'}])
  expect(generationCount).toBe(1)
})

it('offers a Pro model selector and forwards the selection to generation', async () => {
  const {ImageGeneratorContent} =
    await import('../packages/core/src/components/ImageGeneratorContent')
  let payload: Record<string, unknown> = {}
  vi.stubGlobal('fetch', async (_url: unknown, init: RequestInit) => {
    payload = JSON.parse(String(init.body))
    return Response.json({
      imageData: 'YQ==',
      mimeType: 'image/png',
      model: payload.model,
    })
  })
  render(<ImageGeneratorContent onImageGenerated={() => {}} />)
  fireEvent.change(screen.getByLabelText('Image model'), {
    target: {value: 'gemini-3-pro-image'},
  })
  fireEvent.change(screen.getAllByRole('textbox')[0], {
    target: {value: 'A chair'},
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', {name: 'Generate'}))
  })
  expect(payload.model).toBe('gemini-3-pro-image')
})

it('shows editorial and iteration controls in the single-image panel', async () => {
  const {ImageGeneratorContent} =
    await import('../packages/core/src/components/ImageGeneratorContent')
  vi.stubGlobal('fetch', async () =>
    Response.json({
      imageData: 'YQ==',
      mimeType: 'image/png',
      model: 'gemini-3-pro-image',
    }),
  )
  const {container} = render(
    <ImageGeneratorContent onImageGenerated={() => {}} />,
  )
  fireEvent.change(container.querySelector('textarea')!, {
    target: {value: 'chair'},
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', {name: 'Generate', exact: true}))
  })
  const field = screen.getByLabelText('Alt text')
  expect(field.closest('[data-panel]')?.getAttribute('data-panel')).toContain(
    '-single-panel',
  )
  expect(field.closest('[data-panel]')?.getAttribute('data-hidden')).toBe(
    'false',
  )
  expect(screen.getByText('Continue editing this variant')).toBeTruthy()
})

it('restores supported model and creative settings when reopening history', async () => {
  const {ImageGeneratorContent} =
    await import('../packages/core/src/components/ImageGeneratorContent')
  render(
    <ImageGeneratorContent
      initialRecord={{
        _id: 'ai-generation-previous',
        _type: 'aiGenerationRecord',
        createdAt: '2026-10-09',
        prompt: 'chair',
        model: 'gemini-3-pro-image',
        asset: {_type: 'reference', _ref: 'image-existing'},
        parametersJSON: JSON.stringify({
          aspectRatio: '16:9',
          resolution: '4K',
          grounding: true,
        }),
      }}
      onImageGenerated={() => {}}
    />,
  )
  expect(
    (screen.getByDisplayValue('Gemini 3 Pro Image') as HTMLSelectElement).value,
  ).toBe('gemini-3-pro-image')
  expect((screen.getByLabelText('Resolution') as HTMLSelectElement).value).toBe(
    '4K',
  )
  expect(
    (screen.getByLabelText('Use Google Search grounding') as HTMLInputElement)
      .checked,
  ).toBe(true)
})

it('returns earlier successful gallery assets together with retried uploads', async () => {
  const {ImageGeneratorContent} =
    await import('../packages/core/src/components/ImageGeneratorContent')
  const savedAssets: unknown[] = []
  let generationCount = 0
  vi.stubGlobal('fetch', async () => {
    generationCount++
    return Response.json({
      images: [
        {
          imageData: 'YQ==',
          mimeType: 'image/png',
          variation: 'front',
          index: 0,
        },
        {imageData: 'Yg==', mimeType: 'image/png', variation: 'side', index: 1},
      ],
    })
  })
  uploadAsset
    .mockReset()
    .mockResolvedValueOnce({_id: 'image-first'})
    .mockRejectedValueOnce(new Error('Temporary upload failure'))
    .mockResolvedValueOnce({_id: 'image-retried'})
  const {container} = render(
    <ImageGeneratorContent
      maxSeriesQuantity={2}
      onImageGenerated={() => {}}
      onImagesGenerated={(assets) => savedAssets.push(...assets)}
    />,
  )
  fireEvent.change(container.querySelectorAll('textarea')[0], {
    target: {value: 'A chair'},
  })
  fireEvent.click(screen.getAllByText('Select')[0])
  await act(async () => {
    fireEvent.click(screen.getByText('Generate Series'))
  })
  await act(async () => {
    fireEvent.click(screen.getByText('Upload Selected (2)'))
  })
  expect(
    container.querySelectorAll('img[alt^="Generated image"]'),
  ).toHaveLength(1)
  expect(savedAssets).toHaveLength(0)
  await act(async () => {
    fireEvent.click(screen.getByText('Upload Selected (1)'))
  })
  expect(savedAssets).toMatchObject([
    {_id: 'image-first'},
    {_id: 'image-retried'},
  ])
  expect(generationCount).toBe(1)
})
