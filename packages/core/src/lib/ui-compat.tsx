import * as UI from '@sanity/ui'
import {useId, useState, type ComponentProps, type ReactNode} from 'react'

// UI 4 moved Popover/toast to subpaths that UI 3 does not export. Avoid
// static subpath imports: they prevent older Studios from loading the plugin.
const LegacyPopover = (Reflect.has(UI, 'Popover') ? Reflect.get(UI, 'Popover') : undefined) as React.ComponentType<any> | undefined
const legacyUseToast = (Reflect.has(UI, 'useToast') ? Reflect.get(UI, 'useToast') : undefined) as (() => {push: (notice: Notice) => unknown}) | undefined
const legacyLayout = Boolean(LegacyPopover)

type GapProps = {gap?: number | number[]}

export function Stack(props: Omit<ComponentProps<typeof UI.Stack>, 'gap' | 'space'> & GapProps) {
  const {gap, ...rest} = props
  const spacing = legacyLayout ? {space: gap} : {gap}
  return <UI.Stack {...({...rest, ...spacing} as ComponentProps<typeof UI.Stack>)} />
}

export function Grid(props: Omit<ComponentProps<typeof UI.Grid>, 'columns' | 'gridTemplateColumns'> & {gridTemplateColumns?: number | number[]}) {
  const {gridTemplateColumns, ...rest} = props
  const columns = legacyLayout ? {columns: gridTemplateColumns} : {gridTemplateColumns}
  return <UI.Grid {...({...rest, ...columns} as ComponentProps<typeof UI.Grid>)} />
}

export function TabList(props: Omit<ComponentProps<typeof UI.TabList>, 'gap' | 'space'> & GapProps) {
  const {gap, ...rest} = props
  const spacing = legacyLayout ? {space: gap} : {gap}
  return <UI.TabList {...({...rest, ...spacing} as ComponentProps<typeof UI.TabList>)} />
}

type Notice = {status: 'success' | 'error' | 'warning'; title: string; description?: string}

function useInlineToast() {
  const [notice, push] = useState<Notice>()
  return {notice, push}
}

function useLegacyToast() {
  // This hook is selected once per module, so hook order cannot change on render.
  const toast = legacyUseToast!()
  return {...toast, notice: undefined}
}

export const useToast = legacyUseToast ? useLegacyToast : useInlineToast

export function GeneratorPopover({children, content, open, portal, onClose}: {
  children: ReactNode; content: ReactNode; open: boolean; portal?: boolean; onClose: () => void
}) {
  const id = useId()
  if (LegacyPopover) return <LegacyPopover content={content} open={open} portal={portal}>{children}</LegacyPopover>
  // Dialog is a shared root export. It gives UI 4 keyboard/focus handling without
  // importing a subpath unavailable to older Studio installations.
  return <>{children}{open && <UI.Dialog id={id} header="AI Image Generator" width={2} onClose={onClose}>{content}</UI.Dialog>}</>
}
