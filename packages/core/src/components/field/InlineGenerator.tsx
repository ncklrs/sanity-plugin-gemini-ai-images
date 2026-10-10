import {Box, Button, Dialog} from '@sanity/ui'
import {useCallback, useState} from 'react'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import {AIImageIcon} from '../ui/compat.js'
import type {GeneratorSettings, SanityImageAsset} from '../../types.js'

interface InlineGeneratorProps extends GeneratorSettings {
  onImageGenerated: (asset: SanityImageAsset) => void
  buttonText?: string
  buttonMode?: 'default' | 'ghost' | 'bleed'
  buttonTone?: 'default' | 'primary' | 'positive' | 'caution' | 'critical'
}

/**
 * Button that opens the AI image generator in a dialog.
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
  buttonText = 'Generate with AI',
  buttonMode = 'default',
  buttonTone = 'primary',
  ...settings
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
    <>
      <Button
        text={buttonText}
        icon={AIImageIcon}
        mode={buttonMode}
        tone={buttonTone}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Dialog header="AI Image Generator" id="ai-inline-generator-dialog" onClose={() => setOpen(false)} width={2}>
          <Box padding={4}>
            <ImageGeneratorContent {...settings} onImageGenerated={handleImageGenerated} />
          </Box>
        </Dialog>
      )}
    </>
  )
}
