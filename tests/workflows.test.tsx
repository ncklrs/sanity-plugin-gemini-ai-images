// @vitest-environment jsdom
import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  renderHook,
  act,
} from '@testing-library/react'
import {afterEach, expect, it, vi} from 'vitest'
import {JobPanel} from '../packages/core/src/components/JobPanel'
import {AssetHistory} from '../packages/core/src/components/AssetHistory'
import {CreativeControls} from '../packages/core/src/components/CreativeControls'
import {useGenerationJob} from '../packages/core/src/hooks/useGenerationJob'
const state = vi.hoisted(() => ({
  fetch: vi.fn(async () => []),
  create: vi.fn(async (doc: any) => doc),
}))
vi.mock('sanity', () => {
  const client = {
    fetch: state.fetch,
    create: state.create,
    config: () => ({projectId: 'p', dataset: 'd'}),
  }
  return {useClient: () => client}
})
vi.mock('@sanity/ui', () => {
  const wrapper = ({children}: any) => <div>{children}</div>
  return {
    Stack: wrapper,
    Card: wrapper,
    Text: wrapper,
    Box: wrapper,
    Grid: wrapper,
    TabList: wrapper,
    Flex: wrapper,
    Select: ({children, ...props}: any) => (
      <select {...props}>{children}</select>
    ),
    Button: ({text, onClick, disabled}: any) => (
      <button onClick={onClick} disabled={disabled}>
        {text}
      </button>
    ),
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})
it('offers only supported resolutions and disables unavailable grounding', () => {
  render(
    <CreativeControls
      model="gemini-2.5-flash-image"
      value={{resolution: '1K', grounding: false, references: []}}
      onChange={() => {}}
    />,
  )
  expect(screen.queryByRole('option', {name: '4K'})).toBeNull()
  expect(
    (screen.getByLabelText('Use Google Search grounding') as HTMLInputElement)
      .disabled,
  ).toBe(true)
})
it('loads Sanity assets with selectable reference roles', async () => {
  state.fetch.mockResolvedValueOnce([{_id: 'image-one', title: 'Product'}])
  const change = vi.fn()
  render(
    <CreativeControls
      model="gemini-3-pro-image"
      value={{resolution: '1K', grounding: false, references: []}}
      onChange={change}
      enableReferences
    />,
  )
  await waitFor(() =>
    expect(screen.getByRole('option', {name: 'Product'})).toBeTruthy(),
  )
  fireEvent.change(screen.getByLabelText('Reference asset'), {
    target: {value: 'image-one'},
  })
  fireEvent.click(screen.getByText('Add reference'))
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({
      references: [{assetId: 'image-one', role: 'subject'}],
    }),
  )
})
it('resumes a durable job after a refresh using an ID without binary storage', async () => {
  localStorage.setItem(
    'sanity-ai-job:p:d:/jobs',
    JSON.stringify({id: 'ai-job-test', key: 'key'}),
  )
  const job = {id: 'ai-job-test', status: 'queued', kind: 'image', items: []}
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(job)),
  )
  const {result} = renderHook(() => useGenerationJob('/jobs'))
  await waitFor(() => expect(result.current.job?.id).toBe('ai-job-test'))
  expect(localStorage.getItem('sanity-ai-job:p:d:/jobs')).not.toContain(
    'imageData',
  )
})
it('sends authentication and the idempotency key when creating jobs', async () => {
  const transport = vi.fn(async () =>
    Response.json({id: 'ai-job-test', status: 'complete', items: []}),
  )
  vi.stubGlobal('fetch', transport)
  const {result} = renderHook(() =>
    useGenerationJob('/jobs', undefined, async () => ({
      Authorization: 'Bearer user-token',
    })),
  )
  await act(async () => {
    await result.current.create({prompt: 'chair'})
  })
  expect(transport.mock.calls[0][1]).toMatchObject({
    headers: {
      Authorization: 'Bearer user-token',
      'Idempotency-Key': expect.any(String),
    },
  })
})

it('keeps image and video recovery IDs separate', async () => {
  localStorage.setItem(
    'sanity-ai-job:p:d:/jobs',
    JSON.stringify({id: 'image-job', key: 'image-key'}),
  )
  localStorage.setItem(
    'sanity-ai-job:p:d:/jobs:video',
    JSON.stringify({id: 'video-job', key: 'video-key'}),
  )
  const transport = vi.fn(async (url: string) =>
    Response.json({
      id: url.includes('video-job') ? 'video-job' : 'image-job',
      kind: url.includes('video-job') ? 'video' : 'image',
      status: 'complete',
      items: [],
    }),
  )
  vi.stubGlobal('fetch', transport)
  const image = renderHook(() => useGenerationJob('/jobs'))
  const video = renderHook(() =>
    useGenerationJob('/jobs', undefined, undefined, 'video'),
  )
  await waitFor(() => expect(image.result.current.job?.id).toBe('image-job'))
  await waitFor(() => expect(video.result.current.job?.id).toBe('video-job'))
})
it('clears recovery state when the configured endpoint changes', async () => {
  localStorage.setItem(
    'sanity-ai-job:p:d:/first',
    JSON.stringify({id: 'first-job', key: 'first-key'}),
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        id: 'first-job',
        kind: 'image',
        status: 'complete',
        items: [],
      }),
    ),
  )
  const hook = renderHook(({endpoint}) => useGenerationJob(endpoint), {
    initialProps: {endpoint: '/first'},
  })
  await waitFor(() => expect(hook.result.current.job?.id).toBe('first-job'))
  hook.rerender({endpoint: '/second'})
  await waitFor(() => expect(hook.result.current.job).toBeNull())
})

it('routes job retry, cancellation and selection without selecting subject anchors', async () => {
  const output = (assetId: string, index: number) => ({
    assetId,
    index,
    url: 'https://cdn.test/image.png',
    mimeType: 'image/png',
    model: 'gemini-3-pro-image',
    prompt: 'chair',
    variation: 'front',
  })
  const onRetry = vi.fn(async () => {}),
    onCancel = vi.fn(async () => {}),
    onSelect = vi.fn()
  render(
    <JobPanel
      job={{
        id: 'job',
        kind: 'image',
        status: 'queued',
        items: [
          {
            index: -1,
            variation: 'Anchor',
            status: 'complete',
            output: output('image-anchor', -1),
          },
          {
            index: 0,
            variation: 'Front',
            status: 'complete',
            output: output('image-front', 0),
          },
          {index: 1, variation: 'Side', status: 'uncertain'},
        ],
      }}
      onRetry={onRetry}
      onCancel={onCancel}
      onResume={async () => {}}
      onDismiss={() => {}}
      onSelect={onSelect}
    />,
  )
  fireEvent.click(screen.getByText('Retry failed or uncertain items'))
  fireEvent.click(screen.getByText('Cancel remaining work'))
  fireEvent.click(screen.getByText('Use completed images'))
  expect(onRetry).toHaveBeenCalledWith([1])
  expect(onCancel).toHaveBeenCalledOnce()
  expect(onSelect).toHaveBeenCalledWith([
    {
      _id: 'image-front',
      _type: 'sanity.imageAsset',
      url: 'https://cdn.test/image.png',
    },
  ])
})
it('shows video history as a video without an image-reopen action', () => {
  const {container} = render(
    <AssetHistory
      records={[
        {
          _id: 'ai-generation-video',
          _type: 'aiGenerationRecord',
          createdAt: '2026-10-09',
          prompt: 'waves',
          model: 'veo-3.1-generate-preview',
          asset: {_type: 'reference', _ref: 'file-video'},
          assetDocument: {
            _id: 'file-video',
            _type: 'sanity.fileAsset',
            url: 'https://cdn.test/video.mp4',
          },
        },
      ]}
      onUse={() => {}}
      onDelete={async () => {}}
      onExport={() => {}}
      onRefresh={async () => {}}
    />,
  )
  expect(container.querySelector('video')?.getAttribute('src')).toBe(
    'https://cdn.test/video.mp4',
  )
  expect(screen.queryByText('Reopen generation')).toBeNull()
})
it('persists and selects a shared brand preset in Sanity', async () => {
  const change = vi.fn()
  render(
    <CreativeControls
      model="gemini-3-pro-image"
      value={{resolution: '1K', grounding: false, references: []}}
      onChange={change}
      enableBrandPresets
    />,
  )
  fireEvent.change(screen.getByLabelText('Preset name'), {
    target: {value: 'Editorial'},
  })
  fireEvent.change(screen.getByLabelText('Brand instructions'), {
    target: {value: 'Soft light, blue accents'},
  })
  await act(async () => {
    fireEvent.click(screen.getByText('Save brand preset'))
  })
  expect(state.create).toHaveBeenCalledWith(
    expect.objectContaining({
      _type: 'aiBrandPreset',
      name: 'Editorial',
      instructions: 'Soft light, blue accents',
    }),
  )
  const doc = state.create.mock.calls.at(-1)![0]
  fireEvent.change(screen.getByLabelText('Brand preset'), {
    target: {value: doc._id},
  })
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({brandPresetId: doc._id}),
  )
})
