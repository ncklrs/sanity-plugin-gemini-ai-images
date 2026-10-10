/**
 * Layout and feedback primitives that work across @sanity/ui v2, v3 and v4.
 *
 * @sanity/ui v4 (Sanity Studio v6) replaced `space` with `gap`, `columns` with
 * `gridTemplateColumns`, and moved `useToast`/`Popover` to subpath exports that
 * do not exist in earlier versions. These helpers only rely on APIs present in
 * every supported version (`Flex` with `gap`, `Box`, `Card`, `Text`).
 */
import {Box, Card, Flex, Text, type BoxProps} from '@sanity/ui'
import {useCallback, useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode} from 'react'

// Default Sanity theme space scale, in pixels
const SPACE = [0, 4, 8, 12, 20, 32, 52, 84, 136, 220]

type FlexProps = ComponentProps<typeof Flex>

interface StackProps extends Omit<FlexProps, 'direction' | 'gap'> {
  space?: number
  children?: ReactNode
}

/** Vertical stack with spacing between children */
export function Stack({space = 0, ...props}: StackProps) {
  return <Flex direction="column" gap={space} {...props} />
}

interface GridProps extends Omit<BoxProps, 'display'> {
  /** Number of columns, or a minimum column width in pixels when `minColumnWidth` is set */
  columns?: number
  /** Fill the row with as many columns as fit at this minimum width */
  minColumnWidth?: number
  gap?: number
  style?: CSSProperties
  children?: ReactNode
}

/** CSS grid with even columns */
export function Grid({columns = 1, minColumnWidth, gap = 0, style, ...props}: GridProps) {
  const gridTemplateColumns = minColumnWidth
    ? `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))`
    : `repeat(${columns}, minmax(0, 1fr))`
  return <Box {...props} style={{display: 'grid', gridTemplateColumns, gap: SPACE[gap] ?? gap, ...style}} />
}

/** Horizontal tab list container (replaces `TabList`, whose spacing prop differs between versions) */
export function TabList({space = 2, children}: {space?: number; children: ReactNode}) {
  return (
    <Flex role="tablist" gap={space} wrap="wrap">
      {children}
    </Flex>
  )
}

export type NoticeStatus = 'success' | 'warning' | 'error' | 'info'

export interface Notice {
  status: NoticeStatus
  title: string
  description?: string
}

const NOTICE_TONES = {
  success: 'positive',
  warning: 'caution',
  error: 'critical',
  info: 'primary',
} as const

/**
 * Inline replacement for `useToast`, which moved between @sanity/ui versions.
 * Success and info notices clear themselves after a few seconds.
 */
export function useNotice(timeout = 6000) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clear = useCallback(() => {
    clearTimeout(timer.current)
    setNotice(null)
  }, [])

  const push = useCallback(
    (next: Notice) => {
      clearTimeout(timer.current)
      setNotice(next)
      if (next.status === 'success' || next.status === 'info') {
        timer.current = setTimeout(() => setNotice(null), timeout)
      }
    },
    [timeout],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  return {notice, push, clear}
}

export function NoticeCard({notice}: {notice: Notice | null}) {
  if (!notice) return null
  return (
    <Card tone={NOTICE_TONES[notice.status]} padding={3} border radius={2} role="status">
      <Flex direction="column" gap={2}>
        <Text size={1} weight="semibold">
          {notice.title}
        </Text>
        {notice.description && (
          <Text size={1} muted>
            {notice.description}
          </Text>
        )}
      </Flex>
    </Card>
  )
}

/** Image icon, inlined because @sanity/icons v5 moved icons to per-icon subpaths */
export function AIImageIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M5.5 18.5L10 13l3 3.5 2.5-2.5 4 4.5M5.5 5.5h14v14h-14v-14zm9.5 4a1 1 0 11-2 0 1 1 0 012 0z"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AddIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12.5 5.5v14M5.5 12.5h14" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  )
}
