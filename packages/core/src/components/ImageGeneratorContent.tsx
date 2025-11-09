import {useState, useCallback} from 'react'
import {Stack, TextArea, Select, Button, Card, Flex, Text, Box} from '@sanity/ui'
import {useClient} from 'sanity'
import {useGeminiGeneration} from '../hooks/useGeminiGeneration.js'
import {useImageUpload} from '../hooks/useImageUpload.js'
import {PromptBuilder} from './PromptBuilder.js'
import {PresetTemplates} from './PresetTemplates.js'
import {EditPromptTemplates} from './EditPromptTemplates.js'
import type {GenerationMode, AspectRatio, SanityImageAsset} from '../types.js'

interface ImageGeneratorContentProps {
  mode?: GenerationMode
  existingImage?: any
  onImageGenerated: (asset: SanityImageAsset) => void
  apiEndpoint?: string
}

export function ImageGeneratorContent({
  mode = 'generate',
  existingImage,
  onImageGenerated,
  apiEndpoint = '/api/gemini/generate-image',
}: ImageGeneratorContentProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const [currentMode, setCurrentMode] = useState<GenerationMode>(mode)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [useTemplateBuilder, setUseTemplateBuilder] = useState(false)
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null)
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null)

  const {generateImage, editImage, loading: generating, error: generationError} = useGeminiGeneration(apiEndpoint)
  const {uploadImage, uploading, error: uploadError} = useImageUpload()

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setBaseImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBaseImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setCurrentMode('edit')
    }
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    try {
      let result

      if (currentMode === 'edit') {
        // Use uploaded image file or existing image from Sanity
        if (baseImageFile) {
          result = await editImage(baseImageFile, prompt, {aspectRatio})
        } else if (existingImage?.asset) {
          // Fetch existing image blob from Sanity
          const imageUrl = client.config().dataset
            ? `https://cdn.sanity.io/images/${client.config().projectId}/${client.config().dataset}/${existingImage.asset._ref.replace('image-', '').replace('-png', '.png').replace('-jpg', '.jpg')}`
            : ''

          const response = await fetch(imageUrl)
          const blob = await response.blob()

          result = await editImage(blob, prompt, {aspectRatio})
        }
      } else {
        result = await generateImage(prompt, {aspectRatio})
      }

      if (result) {
        // Show preview
        const previewUrl = `data:${result.mimeType};base64,${result.imageData}`
        setPreviewImage(previewUrl)
      }
    } catch (error) {
      console.error('Image generation failed:', error)
    }
  }

  const handleSave = async () => {
    if (!previewImage) return

    try {
      const base64Parts = previewImage.split(',')
      if (base64Parts.length < 2) {
        console.error('Invalid preview image format')
        return
      }
      const base64Data = base64Parts[1]
      if (!base64Data) {
        console.error('No base64 data found in preview image')
        return
      }

      const asset = await uploadImage(base64Data, `gemini-generated-${Date.now()}`, {
        prompt,
        model: 'gemini-2.5-flash-image',
        generationParams: {aspectRatio},
      })

      if (asset) {
        onImageGenerated(asset)
      }
    } catch (error) {
      console.error('Failed to save image:', error)
    }
  }

  return (
    <Stack space={4}>
      {/* Mode Toggle */}
      <Flex gap={2}>
        <Box flex={1}>
          <Button
            text="Generate from Text"
            mode={currentMode === 'generate' ? 'default' : 'ghost'}
            onClick={() => {
              setCurrentMode('generate')
              setBaseImageFile(null)
              setBaseImagePreview(null)
            }}
            style={{width: '100%'}}
          />
        </Box>
        <Box flex={1}>
          <Button
            text="Edit Existing Image"
            mode={currentMode === 'edit' ? 'default' : 'ghost'}
            onClick={() => setCurrentMode('edit')}
            style={{width: '100%'}}
          />
        </Box>
      </Flex>

      {/* Image Upload for Edit Mode */}
      {currentMode === 'edit' && (
        <Card padding={3} border radius={2}>
          <Stack space={3}>
            <Text size={1} weight="semibold">
              Base Image
            </Text>
            {baseImagePreview ? (
              <Stack space={2}>
                <Box>
                  <img
                    src={baseImagePreview}
                    alt="Base image"
                    style={{width: '100%', maxHeight: '300px', objectFit: 'contain', display: 'block'}}
                  />
                </Box>
                <Button
                  text="Change Image"
                  mode="ghost"
                  onClick={() => {
                    setBaseImageFile(null)
                    setBaseImagePreview(null)
                  }}
                />
              </Stack>
            ) : (
              <Stack space={2}>
                <Box>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{display: 'none'}}
                    id="base-image-upload"
                  />
                  <label htmlFor="base-image-upload">
                    <Button
                      text="Upload Image"
                      tone="primary"
                      mode="ghost"
                      onClick={(e: any) => {
                        e.preventDefault()
                        document.getElementById('base-image-upload')?.click()
                      }}
                    />
                  </label>
                </Box>
                <Text size={1} muted>
                  Upload a product photo or any image you want to modify
                </Text>
              </Stack>
            )}
          </Stack>
        </Card>
      )}

      {/* Template Selection */}
      {currentMode === 'generate' ? (
        <PresetTemplates
          onSelectTemplate={(template) => {
            setPrompt(template.prompt)
            if (template.aspectRatio) {
              setAspectRatio(template.aspectRatio)
            }
          }}
        />
      ) : (
        <EditPromptTemplates
          onSelectTemplate={(template) => {
            setPrompt(template.prompt)
            if (template.aspectRatio) {
              setAspectRatio(template.aspectRatio)
            }
          }}
        />
      )}

      {/* Prompt Builder Toggle */}
      <Button
        text={useTemplateBuilder ? 'Use Free Text' : 'Use Prompt Builder'}
        mode="ghost"
        onClick={() => setUseTemplateBuilder(!useTemplateBuilder)}
      />

      {/* Prompt Input */}
      {useTemplateBuilder ? (
        <PromptBuilder onPromptChange={setPrompt} />
      ) : (
        <Stack space={2}>
          <Text size={1} weight="semibold">
            Prompt
          </Text>
          <TextArea
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.currentTarget.value)}
            rows={6}
          />
        </Stack>
      )}

      {/* Aspect Ratio */}
      <Stack space={2}>
        <Text size={1} weight="semibold">
          Aspect Ratio
        </Text>
        <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.currentTarget.value as AspectRatio)}>
          <option value="1:1">Square (1:1)</option>
          <option value="16:9">Landscape (16:9)</option>
          <option value="9:16">Portrait (9:16)</option>
          <option value="4:3">Classic (4:3)</option>
          <option value="3:2">Standard (3:2)</option>
          <option value="2:3">Portrait Standard (2:3)</option>
          <option value="3:4">Portrait Classic (3:4)</option>
          <option value="4:5">Portrait Social (4:5)</option>
          <option value="5:4">Landscape Social (5:4)</option>
          <option value="21:9">Ultrawide (21:9)</option>
        </Select>
      </Stack>

      {/* Errors */}
      {(generationError || uploadError) && (
        <Card tone="critical" padding={3} border radius={2}>
          <Text size={1}>{generationError || uploadError}</Text>
        </Card>
      )}

      {/* Preview */}
      {previewImage && (
        <Card padding={3} border>
          <Box>
            <img
              src={previewImage}
              alt="Generated preview"
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
          </Box>
        </Card>
      )}

      {/* Actions */}
      <Flex gap={2}>
        <Button
          text={previewImage ? 'Regenerate' : currentMode === 'edit' ? 'Edit Image' : 'Generate'}
          tone="primary"
          loading={generating}
          onClick={handleGenerate}
          disabled={
            !prompt.trim() ||
            generating ||
            uploading ||
            (currentMode === 'edit' && !baseImageFile && !existingImage)
          }
        />
        {previewImage && (
          <Button
            text="Use This Image"
            tone="positive"
            loading={uploading}
            onClick={handleSave}
            disabled={generating || uploading}
          />
        )}
      </Flex>
    </Stack>
  )
}
