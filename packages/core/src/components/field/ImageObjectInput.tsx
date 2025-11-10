import {Box, Button, Card, Dialog, Flex, Stack} from '@sanity/ui'
import {ImageIcon} from '@sanity/icons'
import {useCallback, useState} from 'react'
import {ImageInput, type ImageInputProps} from 'sanity'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import type {SanityImageAsset} from '../../types.js'

interface ImageObjectInputProps extends ImageInputProps {
  apiEndpoint?: string
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
  const {apiEndpoint = '/api/gemini/generate-image', enableAIGeneration = false, onChange} = props
  const [showGenerator, setShowGenerator] = useState(false)

  const handleImageGenerated = useCallback(
    (asset: SanityImageAsset) => {
      // Create image value compatible with Sanity image fields
      const imageValue = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: asset._id,
        },
      }

      // Update the field value
      onChange(imageValue as any)

      // Close the dialog
      setShowGenerator(false)
    },
    [onChange],
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
                <ImageIcon />
                <Box>
                  <strong>AI Image Generation</strong>
                  <div style={{fontSize: '0.875rem', opacity: 0.8}}>
                    Generate images using Google Gemini AI
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
              onImageGenerated={handleImageGenerated}
            />
          </Box>
        </Dialog>
      )}
    </Stack>
  )
}
