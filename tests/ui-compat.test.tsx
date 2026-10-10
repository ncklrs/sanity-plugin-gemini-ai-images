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

const state = vi.hoisted(() => ({
  legacy: false,
  props: {} as Record<string, any>,
  push: vi.fn(),
}))
vi.mock('@sanity/ui', () => {
  const component = (name: string) => (props: any) => {
    state.props[name] = props
    return <div>{props.children}</div>
  }
  return {
    Stack: component('Stack'),
    Grid: component('Grid'),
    TabList: component('TabList'),
    Dialog: (props: any) => {
      state.props.Dialog = props
      return <button onClick={props.onClose}>Close generator</button>
    },
    get Popover() {
      return state.legacy ? component('Popover') : undefined
    },
    get useToast() {
      return state.legacy ? () => ({push: state.push}) : undefined
    },
  }
})
afterEach(() => {
  cleanup()
  state.props = {}
  state.push.mockClear()
})

for (const legacy of [true, false]) {
  it(`maps layout and notification APIs for UI ${legacy ? '3' : '4'}`, async () => {
    state.legacy = legacy
    vi.resetModules()
    const {Stack, Grid, TabList, useToast} =
      await import('../packages/core/src/lib/ui-compat')
    render(
      <Stack gap={3}>
        <Grid gridTemplateColumns={[2, 3, 4]} gap={2}>
          <TabList gap={2} />
        </Grid>
      </Stack>,
    )
    expect(state.props.Stack[legacy ? 'space' : 'gap']).toBe(3)
    expect(state.props.Stack[legacy ? 'gap' : 'space']).toBeUndefined()
    expect(
      state.props.Grid[legacy ? 'columns' : 'gridTemplateColumns'],
    ).toEqual([2, 3, 4])
    expect(state.props.TabList[legacy ? 'space' : 'gap']).toBe(2)
    const {result} = renderHook(useToast)
    const notice = {status: 'warning' as const, title: 'Retry upload'}
    act(() => {
      result.current.push(notice)
    })
    if (legacy) expect(state.push).toHaveBeenCalledWith(notice)
    else expect(result.current.notice).toEqual(notice)
  })
}

it('keeps legacy Popover and supplies a closable Dialog on UI 4', async () => {
  for (const legacy of [true, false]) {
    state.legacy = legacy
    vi.resetModules()
    const {GeneratorPopover} =
      await import('../packages/core/src/lib/ui-compat')
    const close = vi.fn()
    render(
      <GeneratorPopover open portal onClose={close} content={<p>Generator</p>}>
        <button>Open</button>
      </GeneratorPopover>,
    )
    if (legacy)
      expect(state.props.Popover).toMatchObject({open: true, portal: true})
    else {
      fireEvent.click(screen.getByText('Close generator'))
      expect(close).toHaveBeenCalledOnce()
    }
    cleanup()
  }
})
