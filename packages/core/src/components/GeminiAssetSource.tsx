import {Card} from '@sanity/ui'
import {ImageGeneratorContent} from './ImageGeneratorContent.js'
import type {AssetSource, AssetFromSource} from 'sanity'
import type {GeneratorSettings, SanityImageAsset} from '../types.js'

interface GeminiAssetSourceComponentProps extends GeneratorSettings {
  onSelect: (assets: AssetFromSource[]) => void
}

/**
 * Gemini AI Asset Source Component
 *
 * This component is shown when users click the "AI Generator" option
 * in the image picker. It provides the full generation/editing interface.
 */
export function GeminiAssetSourceComponent({
  onSelect,
  ...settings
}: GeminiAssetSourceComponentProps) {
  const handleImageGenerated = (asset: SanityImageAsset) => {
    // Convert to AssetFromSource format that Sanity expects
    const assetFromSource: AssetFromSource = {
      kind: 'assetDocumentId',
      value: asset._id,
    }

    onSelect([assetFromSource])
  }

  return (
    <Card padding={4}>
      <ImageGeneratorContent
        mode="generate"
        existingImage={null}
        onImageGenerated={handleImageGenerated}
        {...settings}
      />
    </Card>
  )
}

/**
 * Create the "AI Generator" asset source.
 *
 * Accepts generator settings, or the legacy `(apiEndpoint, apiKey)` arguments.
 */
export function createGeminiAssetSource(settings?: GeneratorSettings | string, apiKey?: string): AssetSource {
  const resolved: GeneratorSettings =
    typeof settings === 'string' || settings === undefined ? {apiEndpoint: settings, apiKey} : settings

  return {
    name: 'gemini-ai',
    title: 'AI Generator',
    component: (props) => <GeminiAssetSourceComponent {...props} {...resolved} />,
    icon: () => (
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 17L12 22L22 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12L12 17L22 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  }
}
