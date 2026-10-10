// @vitest-environment jsdom
import React from 'react'
import {cleanup, fireEvent, render, screen} from '@testing-library/react'
import {afterEach, expect, it, vi} from 'vitest'
import {ImageObjectInput} from '../packages/core/src/components/field/ImageObjectInput'

afterEach(cleanup)
vi.mock('@sanity/icons/Image', () => ({ImageIcon: () => null}))
vi.mock('@sanity/ui', () => {
  const wrapper = ({children}: {children: React.ReactNode}) => (
    <div>{children}</div>
  )
  return {
    Box: wrapper,
    Card: wrapper,
    Flex: wrapper,
    Stack: wrapper,
    Dialog: wrapper,
    Button: ({
      text,
      onClick,
      disabled,
    }: {
      text: string
      onClick: () => void
      disabled: boolean
    }) => (
      <button onClick={onClick} disabled={disabled}>
        {text}
      </button>
    ),
  }
})
vi.mock('sanity', () => ({
  ImageInput: () => null,
  setIfMissing: (value: unknown, path: unknown[] = []) => ({
    type: 'setIfMissing',
    path,
    value,
  }),
  set: (value: unknown, path: unknown[] = []) => ({type: 'set', path, value}),
}))
vi.mock('../packages/core/src/components/ImageGeneratorContent', () => ({
  ImageGeneratorContent: ({
    onImageGenerated,
  }: {
    onImageGenerated: (asset: {_id: string}) => void
  }) => (
    <button onClick={() => onImageGenerated({_id: 'image-new'})}>
      Save generated image
    </button>
  ),
}))

it('emits asset patches instead of replacing the complete image object', () => {
  let patches: unknown
  render(
    <ImageObjectInput
      {...({
        enableAIGeneration: true,
        renderDefault: () => null,
        onChange: (value: unknown) => {
          patches = value
        },
      } as never)}
    />,
  )
  fireEvent.click(screen.getByText('Generate with AI'))
  fireEvent.click(screen.getByText('Save generated image'))
  expect(patches).toEqual([
    {type: 'setIfMissing', path: [], value: {_type: 'image'}},
    {
      type: 'set',
      path: ['asset'],
      value: {_type: 'reference', _ref: 'image-new'},
    },
  ])
})

it('disables AI field edits when Sanity marks the field read-only', () => {
  render(
    <ImageObjectInput
      {...({
        enableAIGeneration: true,
        renderDefault: () => null,
        readOnly: true,
      } as never)}
    />,
  )
  expect(
    (screen.getByText('Generate with AI') as HTMLButtonElement).disabled,
  ).toBe(true)
})

it('uses the Studio default renderer for the existing image input', () => {
  const renderDefault = vi.fn(() => <span>Default Studio image input</span>)
  const props = {renderDefault, onChange: vi.fn()}
  render(<ImageObjectInput {...(props as never)} />)
  expect(renderDefault).toHaveBeenCalledWith(props)
  expect(screen.getByText('Default Studio image input')).toBeTruthy()
})

it('initializes a named image field without replacing crop or metadata', () => {
  const onChange = vi.fn()
  render(
    <ImageObjectInput
      {...({
        enableAIGeneration: true,
        renderDefault: () => null,
        onChange,
        schemaType: {name: 'heroImage', fields: []},
      } as never)}
    />,
  )
  fireEvent.click(screen.getByText('Generate with AI'))
  fireEvent.click(screen.getByText('Save generated image'))
  expect(onChange.mock.calls[0][0][0].value._type).toBe('heroImage')
  expect(onChange.mock.calls[0][0][1].path).toEqual(['asset'])
})
