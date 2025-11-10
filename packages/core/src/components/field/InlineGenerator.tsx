import {Button, Card, Popover} from '@sanity/ui'
import {ImageIcon} from '@sanity/icons'
import {useCallback, useState} from 'react'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import type {SanityImageAsset} from '../../types.js'

interface InlineGeneratorProps {
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
    <Popover
      content={
        <Card padding={4} style={{width: '600px', maxWidth: '90vw'}}>
          <ImageGeneratorContent
            apiEndpoint={apiEndpoint}
            onImageGenerated={handleImageGenerated}
          />
        </Card>
      }
      open={open}
      portal
    >
      <Button
        text={buttonText}
        icon={ImageIcon}
        mode={buttonMode}
        tone={buttonTone}
        onClick={() => setOpen(!open)}
      />
    </Popover>
  )
}
