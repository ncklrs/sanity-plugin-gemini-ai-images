import {GeneratorPopover} from '../../lib/ui-compat.js'
import {Button, Card} from '@sanity/ui'
import {ImageIcon} from '@sanity/icons/Image'
import {useCallback, useState} from 'react'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import type {SanityImageAsset, GeminiPluginConfig} from '../../types.js'

interface InlineGeneratorProps extends GeminiPluginConfig {
  onImageGenerated: (asset: SanityImageAsset) => void
  apiEndpoint?: string
  buttonText?: string
  buttonMode?: 'default' | 'ghost' | 'bleed'
  buttonTone?: 'default' | 'primary' | 'positive' | 'caution' | 'critical'
}

/**
 * Inline AI image generator that opens in a popover.
 * Useful for compact inline generation UI.
 *
 * Usage:
 * ```typescript
 * <InlineGenerator
 *   onImageGenerated={(asset) => {
 *     // Handle generated asset
 *   }}
 * />
 * ```
 */
export function InlineGenerator({
  onImageGenerated,
  apiEndpoint = '/api/gemini/generate-image',
  buttonText = 'Generate with AI',
  buttonMode = 'default',
  buttonTone = 'primary',
  ...options
}: InlineGeneratorProps) {
  const [open, setOpen] = useState(false)

  const handleImageGenerated = useCallback(
    (asset: SanityImageAsset) => {
      onImageGenerated(asset)
      setOpen(false)
    },
    [onImageGenerated],
  )

  return (
    <GeneratorPopover
      content={
        <Card padding={4} style={{width: '600px', maxWidth: '90vw'}}>
          <ImageGeneratorContent
            apiEndpoint={apiEndpoint}
            {...options}
            onImageGenerated={handleImageGenerated}
          />
        </Card>
      }
      open={open}
      onClose={() => setOpen(false)}
      portal
    >
      <Button
        text={buttonText}
        icon={ImageIcon}
        mode={buttonMode}
        tone={buttonTone}
        onClick={() => setOpen(!open)}
      />
    </GeneratorPopover>
  )
}
