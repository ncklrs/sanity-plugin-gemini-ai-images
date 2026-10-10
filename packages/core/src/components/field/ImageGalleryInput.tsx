import {useState} from 'react'
import {Button, Dialog, Box} from '@sanity/ui'
import {Stack} from '../../lib/ui-compat.js'
import type {ArrayOfObjectsInputProps} from 'sanity'
import type {GeminiPluginConfig, SanityImageAsset} from '../../types.js'
import {createGalleryPatches} from '../../lib/editorial.js'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
export function ImageGalleryInput(
  props: ArrayOfObjectsInputProps & GeminiPluginConfig & {imageType?: string},
) {
  const [open, setOpen] = useState(false)
  const imageMembers = props.schemaType.of.filter((member) => {
    let type: any = member
    while (type) {
      if (type.name === 'image') return true
      type = type.type
    }
    return false
  })
  const member = props.imageType
    ? imageMembers.find((member) => member.name === props.imageType)
    : imageMembers.length === 1
      ? imageMembers[0]
      : undefined
  const select = (assets: SanityImageAsset[]) => {
    if (props.readOnly || !member) return
    props.onChange(createGalleryPatches(assets, member.name))
    setOpen(false)
  }
  return (
    <Stack gap={3}>
      {props.renderDefault(props)}
      <Button
        text="Generate gallery images"
        disabled={props.readOnly || !member}
        onClick={() => setOpen(true)}
      />
      {!member && (
        <p>
          Select a supported imageType when the array has multiple image
          members.
        </p>
      )}
      {open && (
        <Dialog
          id={`ai-gallery-${props.id}`}
          header="Generate gallery images"
          onClose={() => setOpen(false)}
          width={2}
        >
          <Box padding={4}>
            <ImageGeneratorContent
              {...props}
              onImageGenerated={(asset) => select([asset])}
              onImagesGenerated={select}
            />
          </Box>
        </Dialog>
      )}
    </Stack>
  )
}
