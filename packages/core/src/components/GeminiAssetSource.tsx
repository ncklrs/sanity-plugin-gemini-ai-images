import {Card} from '@sanity/ui'
import {ImageGeneratorContent} from './ImageGeneratorContent.js'
import type {AssetSource, AssetFromSource} from 'sanity'
import type {SanityImageAsset} from '../types.js'

interface GeminiAssetSourceComponentProps {
  onSelect: (assets: AssetFromSource[]) => void
  apiEndpoint?: string
  apiKey?: string
}

/**
 * Gemini AI Asset Source Component
 *
 * This component is shown when users click the "AI Generator" option
 * in the image picker. It provides the full generation/editing interface.
 */
export function GeminiAssetSourceComponent({
  onSelect,
  apiEndpoint,
  apiKey,
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
        apiEndpoint={apiEndpoint}
        apiKey={apiKey}
      />
    </Card>
  )
}

/**
 * Create asset source with configurable API endpoint and optional API key
 */
export function createGeminiAssetSource(apiEndpoint?: string, apiKey?: string): AssetSource {
  return {
    name: 'gemini-ai',
    title: 'AI Generator',
    component: (props) => <GeminiAssetSourceComponent {...props} apiEndpoint={apiEndpoint} apiKey={apiKey} />,
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
