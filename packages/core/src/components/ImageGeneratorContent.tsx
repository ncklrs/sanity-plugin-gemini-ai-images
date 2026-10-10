import {MediaSurface} from './MediaSurface.js'
import {
  modelCatalog,
  type Resolution,
} from 'sanity-plugin-gemini-ai-images-contracts'
import {CreativeControls, type CreativeSettings} from './CreativeControls.js'
import {JobPanel} from './JobPanel.js'
import {useGenerationJob} from '../hooks/useGenerationJob.js'
import {
  resolveReferenceAsset,
  saveGenerationRecord,
  type GenerationRecord,
} from '../lib/editorial.js'
import {mediaRequest} from '../lib/request.js'
import {Stack, TabList} from '../lib/ui-compat.js'
import {useToast} from '../lib/ui-compat.js'
import {imageModels, defaultImageModel} from '../lib/image-models.js'
import {useState, useCallback, useId, useEffect, useRef} from 'react'
import {
  TextArea,
  Select,
  Button,
  Card,
  Flex,
  Text,
  Box,
  Tab,
  TabPanel,
} from '@sanity/ui'
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
import type {
  GenerationMode,
  AspectRatio,
  SanityImageAsset,
  VariationType,
  ConsistencyLevel,
  SeriesImageResult,
  GeminiPluginConfig,
  GenerationMetadata,
  GeminiImageModel,
} from '../types.js'

export interface ImageGeneratorContentProps extends GeminiPluginConfig {
  mode?: GenerationMode
  existingImage?: any
  onImageGenerated: (asset: SanityImageAsset) => void
  apiEndpoint?: string
  apiKey?: string
  initialRecord?: GenerationRecord
}

export function ImageGeneratorContent({
  mode = 'generate',
  existingImage,
  onImageGenerated,
  apiEndpoint = '/api/gemini/generate-image',
  apiKey,
  defaultModel = defaultImageModel,
  availableModels,
  maxSeriesQuantity = 10,
  defaultConsistencyLevel = 'moderate',
  getRequestHeaders,
  jobsEndpoint,
  referenceEndpoint,
  suggestionsEndpoint,
  enableHistory = false,
  enableAssetReferences = false,
  enableBrandPresets = false,
  promptInstructions,
  documentContext,
  onImagesGenerated,
  documentId,
  initialRecord,
}: ImageGeneratorContentProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const toast = useToast()
  const instanceId = useId()
  const [creative, setCreative] = useState<CreativeSettings>({
    resolution: '1K',
    grounding: false,
    references: [],
  })
  const [editorial, setEditorial] = useState({title: '', alt: '', caption: ''})
  const [variants, setVariants] = useState<
    Array<{
      id: string
      url: string
      metadata: GenerationMetadata
      mimeType: string
    }>
  >([])
  const [activeVariant, setActiveVariant] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [compare, setCompare] = useState(false)
  const [suggestionAsset, setSuggestionAsset] =
    useState<SanityImageAsset | null>(null)
  const durable = useGenerationJob(jobsEndpoint, apiKey, getRequestHeaders)

  const models = imageModels.filter(
    (item) => !availableModels || availableModels.includes(item.id),
  )
  if (!models.length)
    throw new Error('availableModels must contain a supported image model')
  const [selectedModel, setSelectedModel] = useState<GeminiImageModel>(
    models.some((item) => item.id === defaultModel)
      ? defaultModel
      : models[0].id,
  )
  const model = models.some((item) => item.id === selectedModel)
    ? selectedModel
    : models[0].id
  const capability = modelCatalog.find((m) => m.id === model)!
  const settings = {
    ...creative,
    resolution: capability.resolutions.includes(creative.resolution as never)
      ? creative.resolution
      : (capability.resolutions[0] as Resolution),
    grounding: capability.grounding && creative.grounding,
    references: creative.references.slice(0, capability.maxReferences),
  }
  const composePrompt = (value: string) =>
    [
      promptInstructions,
      ...Object.entries(documentContext ?? {}).map(
        ([key, value]) => `${key}: ${value}`,
      ),
      value,
    ]
      .filter(Boolean)
      .join('\n')
  const maxQuantity = Math.min(10, Math.max(2, Math.floor(maxSeriesQuantity)))
  const [previewMetadata, setPreviewMetadata] = useState<GenerationMetadata>()
  const [seriesMetadata, setSeriesMetadata] = useState<GenerationMetadata>()
  const [previewMimeType, setPreviewMimeType] = useState('image/png')
  const [activeTab, setActiveTab] = useState<'single' | 'series'>('single')
  const [currentMode, setCurrentMode] = useState<GenerationMode>(mode)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [useTemplateBuilder, setUseTemplateBuilder] = useState(false)
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null)
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null)

  // Series generation state
  const [seriesQuantity, setSeriesQuantity] = useState(Math.min(5, maxQuantity))
  const [variationType, setVariationType] = useState<VariationType>('angle')
  const [consistencyLevel, setConsistencyLevel] = useState<ConsistencyLevel>(
    defaultConsistencyLevel,
  )
  const [selectedVariations, setSelectedVariations] = useState<string[]>([])
  const savedSeriesAssets = useRef<SanityImageAsset[]>([])
  const [seriesImages, setSeriesImages] = useState<SeriesImageResult[]>([])
  const [seriesBaseImage, setSeriesBaseImage] = useState<File | null>(null)
  const [seriesBaseImagePreview, setSeriesBaseImagePreview] = useState<
    string | null
  >(null)
  const [detailedSubjectPrompt, setDetailedSubjectPrompt] = useState('')

  const {
    generateImage,
    editImage,
    loading: generating,
    error: generationError,
  } = useGeminiGeneration(apiEndpoint, apiKey, getRequestHeaders)
  const {uploadImage, uploading, error: uploadError} = useImageUpload()
  const {
    generateSeries,
    loading: generatingSeries,
    error: seriesError,
  } = useSeriesGeneration(apiEndpoint, apiKey, getRequestHeaders)
  const {
    uploadBatchWithResults,
    uploading: uploadingBatch,
    uploadProgress,
    errors: batchUploadErrors,
  } = useBatchUpload()

  useEffect(() => {
    if (initialRecord) {
      setPrompt(initialRecord.prompt)
      setEditorial({
        title: initialRecord.title ?? '',
        alt: initialRecord.alt ?? '',
        caption: initialRecord.caption ?? '',
      })
      const savedModel = models.find((item) => item.id === initialRecord.model)
      const selected =
        savedModel ?? models.find((item) => item.id === model) ?? models[0]
      setSelectedModel(selected.id)
      let parameters: Record<string, any> = {}
      try {
        parameters = JSON.parse(initialRecord.parametersJSON ?? '{}')
      } catch {}
      const cap = modelCatalog.find((item) => item.id === selected.id)!
      const savedResolution = parameters.resolution ?? '1K'
      const supported = cap.resolutions.includes(savedResolution as never)
      setAspectRatio(
        [
          '1:1',
          '2:3',
          '3:2',
          '3:4',
          '4:3',
          '4:5',
          '5:4',
          '9:16',
          '16:9',
          '21:9',
        ].includes(parameters.aspectRatio)
          ? parameters.aspectRatio
          : '1:1',
      )
      setCreative({
        resolution: supported ? savedResolution : cap.resolutions[0],
        grounding: cap.grounding && parameters.grounding === true,
        brandPresetId:
          typeof parameters.brandPresetId === 'string'
            ? parameters.brandPresetId
            : undefined,
        references: [{assetId: initialRecord.asset._ref, role: 'subject'}],
      })
      if (!savedModel || !supported || (parameters.grounding && !cap.grounding))
        toast.push({
          status: 'warning',
          title: 'Some saved settings are unavailable',
          description:
            'Review the selected model and creative settings before generating.',
        })
      setPreviewImage(null)
      setSuggestionAsset(null)
      setCurrentMode('generate')
    }
  }, [initialRecord])

  const resetForm = useCallback(() => {
    setPrompt('')
    setPreviewImage(null)
    setBaseImageFile(null)
    setBaseImagePreview(null)
    setCurrentMode('generate')
    setAspectRatio('1:1')
    setUseTemplateBuilder(false)
  }, [])

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [],
  )

  const handleSeriesImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        setSeriesBaseImage(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setSeriesBaseImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    },
    [],
  )

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    try {
      let result

      if (currentMode === 'edit') {
        // Use uploaded image file or existing image from Sanity
        if (baseImageFile) {
          result = await editImage(baseImageFile, composePrompt(prompt), {
            aspectRatio,
            model,
            ...settings,
          })
        } else if (existingImage?.asset) {
          const asset = await resolveReferenceAsset(
            client,
            existingImage.asset._ref,
          )
          let blob: Blob
          if (referenceEndpoint) {
            const reference = await mediaRequest(
              referenceEndpoint,
              {assetId: asset._id},
              apiKey,
              getRequestHeaders,
            )
            blob = new Blob(
              [Uint8Array.from(atob(reference.data), (c) => c.charCodeAt(0))],
              {type: reference.mimeType},
            )
          } else {
            const response = await fetch(asset.url)
            if (!response.ok)
              throw new Error(
                'Private reference requires a configured referenceEndpoint',
              )
            blob = await response.blob()
          }
          result = await editImage(blob, composePrompt(prompt), {
            aspectRatio,
            model,
            ...settings,
          })
        }
      } else {
        result = await generateImage(composePrompt(prompt), {
          aspectRatio,
          model,
          ...settings,
        })
      }

      if (result) {
        // Show preview
        const previewUrl = `data:${result.mimeType};base64,${result.imageData}`
        const variantId = crypto.randomUUID()
        setActiveVariant(variantId)
        setVariants((current) => [
          ...current.slice(-7),
          {
            id: variantId,
            url: previewUrl,
            mimeType: result.mimeType,
            metadata: {
              prompt: composePrompt(prompt),
              model: result.model || model,
              generationParams: {
                aspectRatio,
                ...settings,
                sourceAssetIds: [
                  ...settings.references.flatMap((ref) =>
                    ref.assetId ? [ref.assetId] : [],
                  ),
                  ...(currentMode === 'edit' &&
                  !baseImageFile &&
                  existingImage?.asset
                    ? [existingImage.asset._ref]
                    : []),
                ],
                usage: result.usage,
                sources: result.sources,
                estimatedCostUsd: result.estimatedCostUsd,
              },
            },
          },
        ])
        setSuggestionAsset(null)
        setPreviewImage(previewUrl)
        setPreviewMimeType(result.mimeType)
        setPreviewMetadata({
          prompt: composePrompt(prompt),
          model: result.model || model,
          generationParams: {
            aspectRatio,
            ...settings,
            sourceAssetIds: [
              ...settings.references.flatMap((ref) =>
                ref.assetId ? [ref.assetId] : [],
              ),
              ...(currentMode === 'edit' &&
              !baseImageFile &&
              existingImage?.asset
                ? [existingImage.asset._ref]
                : []),
            ],
            usage: result.usage,
            sources: result.sources,
            estimatedCostUsd: result.estimatedCostUsd,
            providerRequestId: result.providerRequestId,
          },
        })
      }
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Image generation failed',
        description: String(error),
      })
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

      const asset =
        suggestionAsset ??
        (await uploadImage(
          base64Data,
          `gemini-generated-${Date.now()}`,
          previewMetadata,
          previewMimeType,
        ))

      if (asset) {
        if (editorial.title || editorial.caption)
          try {
            await client
              .patch(asset._id)
              .set({
                title: editorial.title || undefined,
                description: editorial.caption || previewMetadata?.prompt,
              })
              .commit()
          } catch (error) {
            toast.push({
              status: 'warning',
              title: 'Image saved; metadata update failed',
              description: String(error),
            })
          }
        if (enableHistory)
          try {
            await saveGenerationRecord(client, {
              asset,
              prompt: previewMetadata?.prompt ?? prompt,
              model: previewMetadata?.model ?? model,
              parameters: previewMetadata?.generationParams,
              sourceAssetIds:
                previewMetadata?.generationParams?.sourceAssetIds ??
                (
                  (previewMetadata?.generationParams?.references ??
                    []) as CreativeSettings['references']
                ).flatMap((r) => (r.assetId ? [r.assetId] : [])),
              ...editorial,
              documentId,
            })
          } catch (error) {
            toast.push({
              status: 'warning',
              title: 'Image saved; history unavailable',
              description: String(error),
            })
          }
        onImageGenerated({...asset, editorial})
        toast.push({
          status: 'success',
          title: 'Image saved successfully',
          description:
            'Your generated image has been added to the asset library',
        })
        // Reset form after successful save
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save image:', error)
      toast.push({
        status: 'error',
        title: 'Failed to save image',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      })
    }
  }

  const handleGenerateSeries = async () => {
    if (durable.job || durable.busy) return
    savedSeriesAssets.current = []
    if (selectedVariations.length < seriesQuantity) {
      toast.push({
        status: 'warning',
        title: 'More variations needed',
        description:
          'Select one variation per requested image or reduce the quantity.',
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
        description:
          'Please provide either a detailed subject description or base context',
      })
      return
    }

    try {
      if (jobsEndpoint) {
        let baseImage: string | undefined
        if (seriesBaseImage)
          baseImage = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result).split(',')[1])
            reader.onerror = () => reject(new Error('Unable to read reference'))
            reader.readAsDataURL(seriesBaseImage)
          })
        await durable.create({
          baseImage,
          baseImageMimeType: seriesBaseImage?.type,
          prompt: composePrompt(completePrompt),
          model,
          aspectRatio,
          ...settings,
          series: {
            quantity: seriesQuantity,
            variations: selectedVariations,
            consistencyPrompt:
              consistencyLevel === 'strict'
                ? 'Preserve the same subject identity and brand details.'
                : 'Keep a consistent visual style.',
            anchor: !settings.references.length && !seriesBaseImage,
          },
        })
        return
      }
      const result = await generateSeries(composePrompt(completePrompt), {
        quantity: seriesQuantity,
        variationType,
        consistencyLevel,
        variations: selectedVariations,
        aspectRatio,
        model,
        ...settings,
        baseImage: seriesBaseImage || undefined,
      })

      setSeriesImages(result.images)
      setSeriesMetadata({
        prompt: completePrompt,
        model: result.metadata.model || model,
        generationParams: {aspectRatio, ...settings},
      })
      toast.push({
        status: result.errors?.length ? 'warning' : 'success',
        title: result.errors?.length
          ? 'Series partially generated'
          : 'Series generated',
        description: `${result.images.length} images created${result.errors?.length ? `; ${result.errors.length} failed: ${result.errors.map((item) => item.error).join('; ')}` : ''}`,
      })
    } catch (error) {
      console.error('Series generation failed:', error)
      toast.push({
        status: 'error',
        title: 'Series generation failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      })
    }
  }

  const handleUploadSeries = async (selectedImages: SeriesImageResult[]) => {
    try {
      const {assets, successfulIndices, errors} = await uploadBatchWithResults(
        selectedImages.map((img) => ({
          imageData: img.imageData,
          mimeType: img.mimeType,
        })),
        selectedImages.map((img) => ({
          prompt: `${seriesMetadata?.prompt || prompt} - ${img.variation}`,
          model: seriesMetadata?.model || model,
          generationParams: {
            ...seriesMetadata?.generationParams,
            seriesIndex: img.index,
            variation: img.variation,
          },
        })),
      )

      if (enableHistory)
        for (const [assetIndex, asset] of assets.entries())
          try {
            const image = selectedImages[successfulIndices[assetIndex]]
            await saveGenerationRecord(client, {
              asset,
              prompt: `${seriesMetadata?.prompt ?? prompt} - ${image.variation}`,
              model: image.model ?? seriesMetadata?.model ?? model,
              parameters: {
                ...seriesMetadata?.generationParams,
                variation: image.variation,
                index: image.index,
                usage: image.usage,
                sources: image.sources,
                estimatedCostUsd: image.estimatedCostUsd,
              },
              documentId,
            })
          } catch (error) {
            toast.push({
              status: 'warning',
              title: 'Images saved; history unavailable',
              description: String(error),
            })
          }
      savedSeriesAssets.current.push(...assets)
      if (errors.length) {
        const saved = new Set(
          successfulIndices.map((index) => selectedImages[index]),
        )
        setSeriesImages((current) =>
          current.filter((image) => !saved.has(image)),
        )
        toast.push({
          status: 'warning',
          title: `${assets.length} images saved; ${errors.length} uploads failed`,
          description: 'Unsaved images remain available. Retry their upload.',
        })
        return
      }

      // Return all selected assets for galleries, while preserving single-field behavior.
      if (assets.length > 0) {
        if (onImagesGenerated) onImagesGenerated(savedSeriesAssets.current)
        else onImageGenerated(assets[0])
        savedSeriesAssets.current = []
        toast.push({
          status: 'success',
          title: `${assets.length} image${assets.length > 1 ? 's' : ''} saved successfully`,
          description:
            'Your generated images have been added to the asset library',
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
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      })
    }
  }

  return (
    <MediaSurface>
      <Stack gap={4}>
        {toast.notice && (
          <Card
            padding={3}
            tone={
              toast.notice.status === 'error'
                ? 'critical'
                : toast.notice.status === 'warning'
                  ? 'caution'
                  : 'positive'
            }
            role="status"
            aria-live="polite"
          >
            <Stack gap={2}>
              <Text weight="semibold">{toast.notice.title}</Text>
              {toast.notice.description && (
                <Text size={1}>{toast.notice.description}</Text>
              )}
            </Stack>
          </Card>
        )}
        <Stack gap={2}>
          <Text size={1} weight="semibold">
            Image model
          </Text>
          <Select
            aria-label="Image model"
            value={model}
            disabled={
              generating || generatingSeries || uploading || uploadingBatch
            }
            onChange={(event) =>
              setSelectedModel(event.currentTarget.value as GeminiImageModel)
            }
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </Stack>
        <CreativeControls
          model={model}
          value={settings}
          onChange={setCreative}
          enableReferences={enableAssetReferences}
          enableBrandPresets={enableBrandPresets}
          disabled={
            generating || generatingSeries || uploading || uploadingBatch
          }
        />
        {durable.job && (
          <JobPanel
            job={durable.job}
            error={durable.error}
            onRetry={durable.retry}
            onCancel={durable.cancel}
            onResume={durable.step}
            onDismiss={durable.dismiss}
            onSelect={(assets) =>
              onImagesGenerated
                ? onImagesGenerated(assets)
                : onImageGenerated(assets[0])
            }
          />
        )}
        {durable.error && !durable.job && (
          <div role="alert">
            {durable.error}
            <button type="button" onClick={durable.dismiss}>
              Reset job request
            </button>
          </div>
        )}
        {/* Single vs Series Tabs */}
        <Card>
          <TabList gap={2}>
            <Tab
              aria-controls={`${instanceId}-single-panel`}
              id={`${instanceId}-single-tab`}
              label="Single Image"
              onClick={() => setActiveTab('single')}
              selected={activeTab === 'single'}
            />
            <Tab
              aria-controls={`${instanceId}-series-panel`}
              id={`${instanceId}-series-tab`}
              label="Image Series"
              onClick={() => setActiveTab('series')}
              selected={activeTab === 'series'}
            />
          </TabList>
        </Card>

        {/* Single Image Panel */}
        <TabPanel
          aria-labelledby={`${instanceId}-single-tab`}
          id={`${instanceId}-single-panel`}
          hidden={activeTab !== 'single'}
        >
          <Stack gap={4}>
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
                <Stack gap={3}>
                  <Text size={1} weight="semibold">
                    Base Image
                  </Text>
                  {baseImagePreview ? (
                    <Stack gap={2}>
                      <Box>
                        <img
                          src={baseImagePreview}
                          alt="Base image"
                          style={{
                            width: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
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
                    <Stack gap={2}>
                      <Box>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{display: 'none'}}
                          id={`${instanceId}-base-image-upload`}
                        />
                        <label htmlFor={`${instanceId}-base-image-upload`}>
                          <Button
                            text="Upload Image"
                            tone="primary"
                            mode="ghost"
                            onClick={(e: any) => {
                              e.preventDefault()
                              document
                                .getElementById('base-image-upload')
                                ?.click()
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
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  Prompt
                </Text>
                <TextArea
                  aria-label="Image prompt"
                  placeholder="Describe the image you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.currentTarget.value)}
                  rows={6}
                />
              </Stack>
            )}

            {/* Aspect Ratio */}
            <Stack gap={2}>
              <Text size={1} weight="semibold">
                Aspect Ratio
              </Text>
              <Select
                aria-label="Image aspect ratio"
                value={aspectRatio}
                onChange={(e) =>
                  setAspectRatio(e.currentTarget.value as AspectRatio)
                }
              >
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

            {previewImage && (
              <Stack gap={2}>
                <label>
                  Image title
                  <input
                    value={editorial.title}
                    onChange={(e) =>
                      setEditorial({...editorial, title: e.target.value})
                    }
                  />
                </label>
                <label>
                  Alt text
                  <input
                    value={editorial.alt}
                    onChange={(e) =>
                      setEditorial({...editorial, alt: e.target.value})
                    }
                  />
                </label>
                <label>
                  Caption
                  <textarea
                    value={editorial.caption}
                    onChange={(e) =>
                      setEditorial({...editorial, caption: e.target.value})
                    }
                  />
                </label>
                {suggestionsEndpoint && (
                  <button
                    type="button"
                    disabled={generating || uploading || suggesting}
                    onClick={async () => {
                      setSuggesting(true)
                      try {
                        const saved =
                          suggestionAsset ??
                          (await uploadImage(
                            previewImage.split(',')[1],
                            `gemini-preview-${Date.now()}`,
                            previewMetadata,
                            previewMimeType,
                          ))
                        if (!saved)
                          throw new Error(
                            'Unable to save preview for suggestions',
                          )
                        setSuggestionAsset(saved)
                        const suggestion = await mediaRequest(
                          suggestionsEndpoint,
                          {assetId: saved._id, prompt},
                          apiKey,
                          getRequestHeaders,
                        )
                        setEditorial({
                          ...editorial,
                          alt: suggestion.alt,
                          caption: suggestion.caption,
                        })
                      } catch (e) {
                        toast.push({
                          status: 'error',
                          title: 'Suggestions unavailable',
                          description: String(e),
                        })
                      } finally {
                        setSuggesting(false)
                      }
                    }}
                  >
                    Suggest alt text and caption (saves preview)
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const blob = await (await fetch(previewImage)).blob()
                    setBaseImageFile(
                      new File([blob], 'previous-variant', {type: blob.type}),
                    )
                    setBaseImagePreview(previewImage)
                    setCurrentMode('edit')
                  }}
                >
                  Continue editing this variant
                </button>
                {variants.length > 1 && (
                  <>
                    <label>
                      Restore variant
                      <select
                        onChange={(e) => {
                          const variant = variants.find(
                            (variant) => variant.id === e.target.value,
                          )!
                          setActiveVariant(variant.id)
                          setSuggestionAsset(null)
                          setPreviewImage(variant.url)
                          setPreviewMimeType(variant.mimeType)
                          setPreviewMetadata(variant.metadata)
                        }}
                        value={activeVariant}
                      >
                        {variants.map((v, index) => (
                          <option key={v.id} value={v.id}>
                            Variant {index + 1} — {v.metadata.model}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={compare}
                        onChange={(e) => setCompare(e.target.checked)}
                      />{' '}
                      Compare variants
                    </label>
                    {compare && (
                      <div
                        style={{display: 'flex', gap: 12, overflowX: 'auto'}}
                      >
                        {variants.map((v, index) => (
                          <img
                            key={index}
                            src={v.url}
                            alt={`Variant ${index + 1}`}
                            style={{maxWidth: 180}}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {previewMetadata?.generationParams?.usage && (
                  <details>
                    <summary>Provider usage</summary>
                    <pre>
                      {JSON.stringify(
                        previewMetadata.generationParams.usage,
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
                {previewMetadata?.generationParams?.estimatedCostUsd !==
                  undefined && (
                  <p>
                    Estimated output cost: $
                    {previewMetadata.generationParams.estimatedCostUsd}. Based
                    on administrator pricing; excludes unpriced inputs.
                  </p>
                )}
                {previewMetadata?.generationParams?.sources?.map(
                  (source: {url: string; title: string}) => (
                    <a
                      key={source.url}
                      href={
                        /^https?:/.test(source.url) ? source.url : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title}
                    </a>
                  ),
                )}
              </Stack>
            )}

            {/* Actions */}
            <Flex gap={2}>
              <Button
                text={
                  previewImage
                    ? 'Regenerate'
                    : currentMode === 'edit'
                      ? 'Edit Image'
                      : 'Generate'
                }
                tone="primary"
                loading={generating}
                onClick={handleGenerate}
                disabled={
                  !prompt.trim() ||
                  generating ||
                  uploading ||
                  suggesting ||
                  (currentMode === 'edit' && !baseImageFile && !existingImage)
                }
              />
              {previewImage && (
                <Button
                  text="Use This Image"
                  tone="positive"
                  loading={uploading}
                  onClick={handleSave}
                  disabled={generating || uploading || suggesting}
                />
              )}
            </Flex>
          </Stack>
        </TabPanel>

        {/* Series Generation Panel */}
        <TabPanel
          aria-labelledby={`${instanceId}-series-tab`}
          id={`${instanceId}-series-panel`}
          hidden={activeTab !== 'series'}
        >
          <Stack gap={4}>
            {/* Series Configuration */}
            <SeriesConfigPanel
              maxQuantity={maxQuantity}
              quantity={seriesQuantity}
              variationType={variationType}
              consistencyLevel={consistencyLevel}
              onQuantityChange={setSeriesQuantity}
              onVariationTypeChange={setVariationType}
              onConsistencyLevelChange={setConsistencyLevel}
            />

            {/* Reference Image Upload (Optional) */}
            <Card padding={3} border radius={2} tone="primary">
              <Stack gap={3}>
                <Flex align="center" justify="space-between">
                  <Text size={1} weight="semibold">
                    Reference Image (Recommended)
                  </Text>
                  <Text size={0} muted>
                    Optional
                  </Text>
                </Flex>
                {seriesBaseImagePreview ? (
                  <Stack gap={2}>
                    <Box>
                      <img
                        src={seriesBaseImagePreview}
                        alt="Reference image"
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'contain',
                          display: 'block',
                        }}
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
                  <Stack gap={2}>
                    <Box>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSeriesImageUpload}
                        style={{display: 'none'}}
                        id={`${instanceId}-series-base-image-upload`}
                      />
                      <label htmlFor={`${instanceId}-series-base-image-upload`}>
                        <Button
                          text="Upload Reference Image"
                          tone="primary"
                          mode="ghost"
                          onClick={(e: any) => {
                            e.preventDefault()
                            document
                              .getElementById('series-base-image-upload')
                              ?.click()
                          }}
                        />
                      </label>
                    </Box>
                    <Text size={0} muted>
                      Upload an image of the exact subject you want in all
                      variations. This greatly improves consistency.
                    </Text>
                  </Stack>
                )}
              </Stack>
            </Card>

            {/* Detailed Subject Description */}
            <Stack gap={2}>
              <Text size={1} weight="semibold">
                Detailed Subject Description
              </Text>
              <TextArea
                placeholder="E.g., 'Modern ergonomic office chair with black mesh back, gray fabric seat, adjustable armrests, and chrome five-star base with wheels'"
                aria-label="Detailed subject description"
                value={detailedSubjectPrompt}
                onChange={(e) =>
                  setDetailedSubjectPrompt(e.currentTarget.value)
                }
                rows={3}
              />
              <Text size={0} muted>
                Be VERY specific about your subject. Include materials, colors,
                unique features, and design details. This helps maintain the
                same subject across all variations.
              </Text>
            </Stack>

            {/* Base Context/Scene Prompt */}
            <Stack gap={2}>
              <Text size={1} weight="semibold">
                Base Context/Scene
              </Text>
              <TextArea
                aria-label="Series context"
                placeholder="E.g., 'Product photography style, white background, professional lighting'"
                value={prompt}
                onChange={(e) => setPrompt(e.currentTarget.value)}
                rows={2}
              />
              <Text size={0} muted>
                Describe the overall scene, style, or context. The variations
                will modify this while keeping the subject consistent.
              </Text>
            </Stack>

            {/* Aspect Ratio */}
            <Stack gap={2}>
              <Text size={1} weight="semibold">
                Aspect Ratio
              </Text>
              <Select
                aria-label="Series aspect ratio"
                value={aspectRatio}
                onChange={(e) =>
                  setAspectRatio(e.currentTarget.value as AspectRatio)
                }
              >
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
              onTemplateQuantityChange={setSeriesQuantity}
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
                disabled={
                  (!prompt.trim() && !detailedSubjectPrompt.trim()) ||
                  selectedVariations.length < seriesQuantity ||
                  generatingSeries ||
                  durable.busy ||
                  !!durable.job
                }
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
                  Uploading {uploadProgress.completed} of {uploadProgress.total}{' '}
                  images... ({uploadProgress.percentage}%)
                </Text>
              </Card>
            )}
            {batchUploadErrors.length > 0 && (
              <Card tone="critical" padding={3}>
                <Text size={1}>
                  {batchUploadErrors.map((item) => item.error).join('; ')}
                </Text>
              </Card>
            )}
          </Stack>
        </TabPanel>
      </Stack>
    </MediaSurface>
  )
}
