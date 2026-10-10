import {Box, Select, Text} from '@sanity/ui'
import {Grid, Stack} from './ui/compat.js'
import type {AspectRatio, ImageModelOption, ImageSize} from '../types.js'

const ASPECT_RATIOS: Array<{value: AspectRatio; label: string}> = [
  {value: '1:1', label: 'Square (1:1)'},
  {value: '16:9', label: 'Landscape (16:9)'},
  {value: '9:16', label: 'Portrait (9:16)'},
  {value: '4:3', label: 'Classic (4:3)'},
  {value: '3:2', label: 'Standard (3:2)'},
  {value: '2:3', label: 'Portrait Standard (2:3)'},
  {value: '3:4', label: 'Portrait Classic (3:4)'},
  {value: '4:5', label: 'Portrait Social (4:5)'},
  {value: '5:4', label: 'Landscape Social (5:4)'},
  {value: '21:9', label: 'Ultrawide (21:9)'},
]

interface GenerationSettingsProps {
  models: ImageModelOption[]
  model: string
  onModelChange: (model: string) => void
  aspectRatio: AspectRatio
  onAspectRatioChange: (aspectRatio: AspectRatio) => void
  imageSize?: ImageSize
  onImageSizeChange: (imageSize: ImageSize | undefined) => void
}

/** Model, aspect ratio, and output size pickers */
export function GenerationSettings({
  models,
  model,
  onModelChange,
  aspectRatio,
  onAspectRatioChange,
  imageSize,
  onImageSizeChange,
}: GenerationSettingsProps) {
  const selectedModel = models.find((option) => option.id === model)
  const imageSizes = selectedModel?.imageSizes ?? []

  return (
    <Stack space={4}>
      {models.length > 1 && (
        <Stack space={2}>
          <Text size={1} weight="semibold">
            Model
          </Text>
          <Select value={model} onChange={(e) => onModelChange(e.currentTarget.value)}>
            {models.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </Select>
          {selectedModel?.description && (
            <Text size={1} muted>
              {selectedModel.description}
            </Text>
          )}
        </Stack>
      )}

      <Grid columns={imageSizes.length > 0 ? 2 : 1} gap={3}>
        <Stack space={2}>
          <Text size={1} weight="semibold">
            Aspect Ratio
          </Text>
          <Select value={aspectRatio} onChange={(e) => onAspectRatioChange(e.currentTarget.value as AspectRatio)}>
            {ASPECT_RATIOS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Stack>

        {imageSizes.length > 0 && (
          <Box>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Resolution
              </Text>
              <Select
                value={imageSize ?? ''}
                onChange={(e) => onImageSizeChange((e.currentTarget.value || undefined) as ImageSize | undefined)}
              >
                <option value="">Default</option>
                {imageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </Stack>
          </Box>
        )}
      </Grid>
    </Stack>
  )
}
