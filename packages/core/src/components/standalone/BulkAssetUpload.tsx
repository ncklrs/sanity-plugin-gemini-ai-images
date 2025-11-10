import {Box, Button, Card, Checkbox, Flex, Grid, Label, Stack, Text} from '@sanity/ui'
import {useCallback, useState} from 'react'
import type {SeriesImageResult} from '../../types.js'
import {useBatchUpload} from '../../hooks/useBatchUpload.js'

interface BulkAssetUploadProps {
  images: SeriesImageResult[]
  metadata?: {
    basePrompt: string
    variationType: string
  }
  onUploadComplete?: (assetIds: string[]) => void
}

export function BulkAssetUpload({images, metadata, onUploadComplete}: BulkAssetUploadProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(images.map((_, i) => i)),
  )
  const {uploadBatch, uploading, uploadProgress} = useBatchUpload()

  const handleToggleSelection = useCallback((index: number) => {
    setSelectedIndices((current) => {
      const newSet = new Set(current)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIndices(new Set(images.map((_, i) => i)))
  }, [images])

  const handleDeselectAll = useCallback(() => {
    setSelectedIndices(new Set())
  }, [])

  const handleUpload = useCallback(async () => {
    const selected = images.filter((_, i) => selectedIndices.has(i))

    const assets = await uploadBatch(
      selected.map((img) => ({
        imageData: img.imageData,
        mimeType: img.mimeType,
      })),
      selected.map((img) => ({
        prompt: metadata?.basePrompt
          ? `${metadata.basePrompt} - ${img.variation}`
          : img.variation,
        model: 'gemini-2.5-flash-image',
        generationParams: {
          variation: img.variation,
          variationType: metadata?.variationType,
        },
      })),
    )

    if (onUploadComplete) {
      onUploadComplete(assets.map((a) => a._id))
    }
  }, [images, selectedIndices, uploadBatch, metadata, onUploadComplete])

  const selectedCount = selectedIndices.size

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} shadow={1}>
        <Stack space={4}>
          <Flex align="center" justify="space-between">
            <Label size={1} weight="semibold">
              Bulk Upload ({images.length} images)
            </Label>
            <Flex gap={2}>
              <Button
                text="Select All"
                mode="ghost"
                tone="primary"
                onClick={handleSelectAll}
                fontSize={1}
                disabled={selectedCount === images.length}
              />
              <Button
                text="Deselect All"
                mode="ghost"
                onClick={handleDeselectAll}
                fontSize={1}
                disabled={selectedCount === 0}
              />
            </Flex>
          </Flex>

          <Grid columns={[2, 3, 4]} gap={3}>
            {images.map((image, index) => (
              <Card key={index} radius={2} overflow="hidden" tone="transparent">
                <Stack space={2}>
                  <Box
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      overflow: 'hidden',
                      borderRadius: '4px',
                      border: selectedIndices.has(index)
                        ? '2px solid var(--card-border-color)'
                        : '1px solid var(--card-border-color)',
                    }}
                  >
                    <img
                      src={`data:${image.mimeType};base64,${image.imageData}`}
                      alt={`Image ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: selectedIndices.has(index) ? 1 : 0.6,
                      }}
                    />
                    <Box
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 1,
                      }}
                    >
                      <Checkbox
                        checked={selectedIndices.has(index)}
                        onChange={() => handleToggleSelection(index)}
                      />
                    </Box>
                  </Box>
                  <Text size={0} muted style={{fontSize: '11px'}}>
                    {image.variation}
                  </Text>
                </Stack>
              </Card>
            ))}
          </Grid>

          <Flex align="center" justify="space-between" paddingTop={2}>
            <Text size={1} muted>
              Selected: {selectedCount} of {images.length}
            </Text>
            <Button
              text={uploading ? 'Uploading...' : `Upload Selected (${selectedCount})`}
              tone="primary"
              onClick={handleUpload}
              disabled={selectedCount === 0 || uploading}
              loading={uploading}
            />
          </Flex>

          {uploading && (
            <Card padding={3} tone="primary">
              <Text size={1}>
                Uploading {uploadProgress.completed} of {uploadProgress.total} images... (
                {uploadProgress.percentage}%)
              </Text>
            </Card>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
