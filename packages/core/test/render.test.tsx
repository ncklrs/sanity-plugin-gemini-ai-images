import {describe, expect, it, vi} from 'vitest'
import {renderToString} from 'react-dom/server'
import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {ImageGeneratorContent} from '../src/components/ImageGeneratorContent.js'
import {InlineGenerator} from '../src/components/field/InlineGenerator.js'
import {resolveModels} from '../src/lib/models.js'

vi.mock('sanity', () => ({
  useClient: () => ({config: () => ({}), fetch: vi.fn(), assets: {upload: vi.fn()}}),
  set: vi.fn(),
  setIfMissing: vi.fn(),
  ImageInput: () => null,
}))

const theme = buildTheme()

function render(node: React.ReactNode) {
  return renderToString(<ThemeProvider theme={theme}>{node}</ThemeProvider>)
}

describe('Studio UI', () => {
  it('renders the generator with a model picker', () => {
    const html = render(<ImageGeneratorContent onImageGenerated={() => {}} />)
    expect(html).toContain('Nano Banana 2.1')
    expect(html).toContain('Nano Banana Pro')
    expect(html).toContain('Resolution')
    expect(html).toContain('Aspect Ratio')
  })

  it('hides the model picker when one model is configured', () => {
    const html = render(
      <ImageGeneratorContent onImageGenerated={() => {}} models={resolveModels(['gemini-2.5-flash-image'])} />,
    )
    expect(html).not.toContain('>Model<')
    expect(html).not.toContain('Resolution')
  })

  it('renders the inline generator button', () => {
    expect(render(<InlineGenerator onImageGenerated={() => {}} />)).toContain('Generate with AI')
  })
})

describe('resolveModels', () => {
  it('fills in known models and keeps custom ones', () => {
    expect(resolveModels(['gemini-3-pro-image', 'custom'])).toEqual([
      expect.objectContaining({id: 'gemini-3-pro-image', title: 'Nano Banana Pro', imageSizes: ['1K', '2K', '4K']}),
      {id: 'custom', title: 'custom'},
    ])
  })
})
