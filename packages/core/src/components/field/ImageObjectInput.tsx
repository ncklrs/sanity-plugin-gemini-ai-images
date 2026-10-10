import {Stack} from '../../lib/ui-compat.js'
import {Box, Button, Card, Dialog, Flex} from '@sanity/ui'
import {ImageIcon} from '@sanity/icons/Image'
import {useCallback, useState, useId} from 'react'
import {set, setIfMissing, type ObjectInputProps, type ImageValue} from 'sanity'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import type {SanityImageAsset, GeminiPluginConfig} from '../../types.js'

interface ImageObjectInputProps
  extends ObjectInputProps<ImageValue>, GeminiPluginConfig {
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
  const {
    apiEndpoint = '/api/gemini/generate-image',
    enableAIGeneration = false,
    onChange,
  } = props
  const dialogId = useId()
  const [showGenerator, setShowGenerator] = useState(false)

  const handleImageGenerated = useCallback(
    (asset: SanityImageAsset) => {
      if (props.readOnly) return
      // Create image value compatible with Sanity image fields
      const imageValue = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: asset._id,
        },
      }

      // Update the field value
      const patches = [
        setIfMissing({_type: props.schemaType?.name ?? 'image'}),
        set(imageValue.asset, ['asset']),
      ]
      for (const name of ['alt', 'caption'] as const)
        if (
          asset.editorial?.[name] &&
          props.schemaType.fields.some((field) => field.name === name)
        )
          patches.push(set(asset.editorial[name], [name]))
      onChange(patches)

      // Close the dialog
      setShowGenerator(false)
    },
    [onChange, props.readOnly, props.schemaType],
  )

  return (
    <Stack gap={3}>
      {/* Standard Sanity Image Input */}
      {props.renderDefault(props)}

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
              disabled={props.readOnly}
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
          id={dialogId}
          onClose={() => setShowGenerator(false)}
          width={2}
        >
          <Box padding={4}>
            <ImageGeneratorContent
              mode={props.value?.asset ? 'edit' : 'generate'}
              existingImage={props.value}
              {...props}
              apiEndpoint={apiEndpoint}
              apiKey={props.apiKey}
              defaultModel={props.defaultModel}
              availableModels={props.availableModels}
              maxSeriesQuantity={props.maxSeriesQuantity}
              defaultConsistencyLevel={props.defaultConsistencyLevel}
              onImageGenerated={handleImageGenerated}
            />
          </Box>
        </Dialog>
      )}
    </Stack>
  )
}
