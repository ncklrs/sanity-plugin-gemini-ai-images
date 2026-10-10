import {Box, Button, Card, Dialog, Flex} from '@sanity/ui'
import {AIImageIcon, Stack} from '../ui/compat.js'
import {useCallback, useState} from 'react'
import {ImageInput, set, setIfMissing, type ImageInputProps} from 'sanity'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import type {GeneratorSettings, SanityImageAsset} from '../../types.js'

interface ImageObjectInputProps extends ImageInputProps, GeneratorSettings {
  /** Show the "Generate with AI" panel. @default true */
  enableAIGeneration?: boolean
}

/**
 * Custom image input component that adds an "Generate with AI" button
 * to the standard Sanity image input.
 *
 * Usage in schema:
 * ```typescript
 * {
 *   name: 'heroImage',
 *   type: 'image',
 *   components: {
 *     input: (props) => <ImageObjectInput {...props} />
 *   }
 * }
 * ```
 */
export function ImageObjectInput(props: ImageObjectInputProps) {
  const {
    apiEndpoint = '/api/gemini/generate-image',
    apiKey,
    models,
    defaultModel,
    maxSeriesQuantity,
    defaultConsistencyLevel,
    enableAIGeneration = true,
    onChange,
    schemaType,
  } = props
  const [showGenerator, setShowGenerator] = useState(false)

  const handleImageGenerated = useCallback(
    (asset: SanityImageAsset) => {
      // Only replace the asset so hotspot, crop, and custom fields are kept
      onChange([setIfMissing({_type: schemaType.name}), set({_type: 'reference', _ref: asset._id}, ['asset'])])

      // Close the dialog
      setShowGenerator(false)
    },
    [onChange, schemaType.name],
  )

  return (
    <Stack space={3}>
      {/* Standard Sanity Image Input */}
      <ImageInput {...props} />

      {/* AI Generation Button */}
      {enableAIGeneration && (
        <Card padding={3} tone="primary" radius={2}>
          <Flex align="center" justify="space-between">
            <Box flex={1}>
              <Flex align="center" gap={2}>
                <AIImageIcon />
                <Box>
                  <strong>AI Image Generation</strong>
                  <div style={{fontSize: '0.875rem', opacity: 0.8}}>
                    Generate images with Google Gemini
                  </div>
                </Box>
              </Flex>
            </Box>
            <Button
              text="Generate with AI"
              tone="primary"
              onClick={() => setShowGenerator(true)}
            />
          </Flex>
        </Card>
      )}

      {/* AI Generator Dialog */}
      {showGenerator && (
        <Dialog
          header="AI Image Generator"
          id="ai-image-generator-dialog"
          onClose={() => setShowGenerator(false)}
          width={2}
        >
          <Box padding={4}>
            <ImageGeneratorContent
              apiEndpoint={apiEndpoint}
              apiKey={apiKey}
              models={models}
              defaultModel={defaultModel}
              maxSeriesQuantity={maxSeriesQuantity}
              defaultConsistencyLevel={defaultConsistencyLevel}
              onImageGenerated={handleImageGenerated}
            />
          </Box>
        </Dialog>
      )}
    </Stack>
  )
}
