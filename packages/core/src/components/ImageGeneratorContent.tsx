import {useState, useCallback} from 'react'
import {Stack, TextArea, Select, Button, Card, Flex, Text, Box, Tab, TabList, TabPanel, useToast} from '@sanity/ui'
import {useClient} from 'sanity'
import {useGeminiGeneration} from '../hooks/useGeminiGeneration.js'
import {useImageUpload} from '../hooks/useImageUpload.js'
import {useSeriesGeneration} from '../hooks/useSeriesGeneration.js'
import {useBatchUpload} from '../hooks/useBatchUpload.js'
import {PromptBuilder} from './PromptBuilder.js'
import {PresetTemplates} from './PresetTemplates.js'
import {EditPromptTemplates} from './EditPromptTemplates.js'
import {SeriesConfigPanel} from './series/SeriesConfigPanel.js'
import {VariationTemplates} from './series/VariationTemplates.js'
import {SeriesPreview} from './series/SeriesPreview.js'
import type {GenerationMode, AspectRatio, SanityImageAsset, VariationType, ConsistencyLevel, SeriesImageResult} from '../types.js'

interface ImageGeneratorContentProps {
  mode?: GenerationMode
  existingImage?: any
  onImageGenerated: (asset: SanityImageAsset) => void
  apiEndpoint?: string
  apiKey?: string
}

export function ImageGeneratorContent({
  mode = 'generate',
  existingImage,
  onImageGenerated,
  apiEndpoint = '/api/gemini/generate-image',
  apiKey,
}: ImageGeneratorContentProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'single' | 'series'>('single')
  const [currentMode, setCurrentMode] = useState<GenerationMode>(mode)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [useTemplateBuilder, setUseTemplateBuilder] = useState(false)
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null)
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null)

  // Series generation state
  const [seriesQuantity, setSeriesQuantity] = useState(5)
  const [variationType, setVariationType] = useState<VariationType>('angle')
  const [consistencyLevel, setConsistencyLevel] = useState<ConsistencyLevel>('moderate')
  const [selectedVariations, setSelectedVariations] = useState<string[]>([])
  const [seriesImages, setSeriesImages] = useState<SeriesImageResult[]>([])
  const [seriesBaseImage, setSeriesBaseImage] = useState<File | null>(null)
  const [seriesBaseImagePreview, setSeriesBaseImagePreview] = useState<string | null>(null)
  const [detailedSubjectPrompt, setDetailedSubjectPrompt] = useState('')

  const {generateImage, editImage, loading: generating, error: generationError} = useGeminiGeneration(apiEndpoint, apiKey)
  const {uploadImage, uploading, error: uploadError} = useImageUpload()
  const {generateSeries, loading: generatingSeries, error: seriesError} = useSeriesGeneration(apiEndpoint, apiKey)
  const {uploadBatch, uploading: uploadingBatch, uploadProgress} = useBatchUpload()

  const resetForm = useCallback(() => {
    setPrompt('')
    setPreviewImage(null)
    setBaseImageFile(null)
    setBaseImagePreview(null)
    setCurrentMode('generate')
    setAspectRatio('1:1')
    setUseTemplateBuilder(false)
  }, [])

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

  const handleSeriesImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSeriesBaseImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSeriesBaseImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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
        toast.push({
          status: 'error',
          title: 'Invalid image format',
        })
        return
      }
      const base64Data = base64Parts[1]
      if (!base64Data) {
        console.error('No base64 data found in preview image')
        toast.push({
          status: 'error',
          title: 'No image data found',
        })
        return
      }

      const asset = await uploadImage(base64Data, `gemini-generated-${Date.now()}`, {
        prompt,
        model: 'gemini-2.5-flash-image',
        generationParams: {aspectRatio},
      })

      if (asset) {
        onImageGenerated(asset)
        toast.push({
          status: 'success',
          title: 'Image saved successfully',
          description: 'Your generated image has been added to the asset library',
        })
        // Reset form after successful save
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save image:', error)
      toast.push({
        status: 'error',
        title: 'Failed to save image',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      })
    }
  }

  const handleGenerateSeries = async () => {
    if (selectedVariations.length === 0) {
      toast.push({
        status: 'warning',
        title: 'No variations selected',
        description: 'Please select at least one variation template',
      })
      return
    }

    // Build complete prompt with detailed subject description
    const completePrompt = detailedSubjectPrompt.trim()
      ? `${detailedSubjectPrompt.trim()}. ${prompt.trim()}`
      : prompt.trim()

    if (!completePrompt) {
      toast.push({
        status: 'warning',
        title: 'Missing description',
        description: 'Please provide either a detailed subject description or base context',
      })
      return
    }

    try {
      const result = await generateSeries(completePrompt, {
        quantity: seriesQuantity,
        variationType,
        consistencyLevel,
        variations: selectedVariations,
        aspectRatio,
        baseImage: seriesBaseImage || undefined,
      })

      setSeriesImages(result.images)
      toast.push({
        status: 'success',
        title: 'Series generated',
        description: `${result.images.length} images created successfully`,
      })
    } catch (error) {
      console.error('Series generation failed:', error)
      toast.push({
        status: 'error',
        title: 'Series generation failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      })
    }
  }

  const handleUploadSeries = async (selectedImages: SeriesImageResult[]) => {
    try {
      const assets = await uploadBatch(
        selectedImages.map(img => ({
          imageData: img.imageData,
          mimeType: img.mimeType,
        })),
        selectedImages.map((img, index) => ({
          prompt: `${prompt} - ${img.variation}`,
          model: 'gemini-2.5-flash-image',
          generationParams: {
            aspectRatio,
            seriesIndex: index,
            variation: img.variation,
          },
        })),
      )

      // Return first asset to maintain compatibility with single image workflow
      if (assets.length > 0) {
        onImageGenerated(assets[0])
        toast.push({
          status: 'success',
          title: `${assets.length} image${assets.length > 1 ? 's' : ''} saved successfully`,
          description: 'Your generated images have been added to the asset library',
        })
        // Reset series state
        setSeriesImages([])
        setPrompt('')
        setSelectedVariations([])
      }
    } catch (error) {
      console.error('Failed to upload series:', error)
      toast.push({
        status: 'error',
        title: 'Failed to upload series',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      })
    }
  }

  return (
    <Stack space={4}>
      {/* Single vs Series Tabs */}
      <Card>
        <TabList space={2}>
          <Tab
            aria-controls="single-panel"
            id="single-tab"
            label="Single Image"
            onClick={() => setActiveTab('single')}
            selected={activeTab === 'single'}
          />
          <Tab
            aria-controls="series-panel"
            id="series-tab"
            label="Image Series"
            onClick={() => setActiveTab('series')}
            selected={activeTab === 'series'}
          />
        </TabList>
      </Card>

      {/* Single Image Panel */}
      <TabPanel aria-labelledby="single-tab" id="single-panel" hidden={activeTab !== 'single'}>
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
      </TabPanel>

      {/* Series Generation Panel */}
      <TabPanel aria-labelledby="series-tab" id="series-panel" hidden={activeTab !== 'series'}>
        <Stack space={4}>
          {/* Series Configuration */}
          <SeriesConfigPanel
            quantity={seriesQuantity}
            variationType={variationType}
            consistencyLevel={consistencyLevel}
            onQuantityChange={setSeriesQuantity}
            onVariationTypeChange={setVariationType}
            onConsistencyLevelChange={setConsistencyLevel}
          />

          {/* Reference Image Upload (Optional) */}
          <Card padding={3} border radius={2} tone="primary">
            <Stack space={3}>
              <Flex align="center" justify="space-between">
                <Text size={1} weight="semibold">
                  Reference Image (Recommended)
                </Text>
                <Text size={0} muted>Optional</Text>
              </Flex>
              {seriesBaseImagePreview ? (
                <Stack space={2}>
                  <Box>
                    <img
                      src={seriesBaseImagePreview}
                      alt="Reference image"
                      style={{width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block'}}
                    />
                  </Box>
                  <Button
                    text="Change Reference Image"
                    mode="ghost"
                    onClick={() => {
                      setSeriesBaseImage(null)
                      setSeriesBaseImagePreview(null)
                    }}
                  />
                </Stack>
              ) : (
                <Stack space={2}>
                  <Box>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSeriesImageUpload}
                      style={{display: 'none'}}
                      id="series-base-image-upload"
                    />
                    <label htmlFor="series-base-image-upload">
                      <Button
                        text="Upload Reference Image"
                        tone="primary"
                        mode="ghost"
                        onClick={(e: any) => {
                          e.preventDefault()
                          document.getElementById('series-base-image-upload')?.click()
                        }}
                      />
                    </label>
                  </Box>
                  <Text size={0} muted>
                    Upload an image of the exact subject you want in all variations. This greatly improves consistency.
                  </Text>
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Detailed Subject Description */}
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Detailed Subject Description
            </Text>
            <TextArea
              placeholder="E.g., 'Modern ergonomic office chair with black mesh back, gray fabric seat, adjustable armrests, and chrome five-star base with wheels'"
              value={detailedSubjectPrompt}
              onChange={(e) => setDetailedSubjectPrompt(e.currentTarget.value)}
              rows={3}
            />
            <Text size={0} muted>
              Be VERY specific about your subject. Include materials, colors, unique features, and design details. This helps maintain the same subject across all variations.
            </Text>
          </Stack>

          {/* Base Context/Scene Prompt */}
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Base Context/Scene
            </Text>
            <TextArea
              placeholder="E.g., 'Product photography style, white background, professional lighting'"
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              rows={2}
            />
            <Text size={0} muted>
              Describe the overall scene, style, or context. The variations will modify this while keeping the subject consistent.
            </Text>
          </Stack>

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

          {/* Variation Templates */}
          <VariationTemplates
            variationType={variationType}
            selectedVariations={selectedVariations}
            onVariationsChange={setSelectedVariations}
            quantity={seriesQuantity}
          />

          {/* Errors */}
          {seriesError && (
            <Card tone="critical" padding={3} border radius={2}>
              <Text size={1}>{seriesError}</Text>
            </Card>
          )}

          {/* Generate Button */}
          {seriesImages.length === 0 && (
            <Button
              text="Generate Series"
              tone="primary"
              loading={generatingSeries}
              onClick={handleGenerateSeries}
              disabled={!prompt.trim() || selectedVariations.length === 0 || generatingSeries}
            />
          )}

          {/* Series Preview and Upload */}
          {seriesImages.length > 0 && (
            <>
              <SeriesPreview
                images={seriesImages}
                onUploadSelected={handleUploadSeries}
                uploading={uploadingBatch}
              />
              <Button
                text="Generate New Series"
                mode="ghost"
                onClick={() => setSeriesImages([])}
                disabled={generatingSeries || uploadingBatch}
              />
            </>
          )}

          {uploadingBatch && (
            <Card padding={3} tone="primary">
              <Text size={1}>
                Uploading {uploadProgress.completed} of {uploadProgress.total} images... ({uploadProgress.percentage}%)
              </Text>
            </Card>
          )}
        </Stack>
      </TabPanel>
    </Stack>
  )
}
