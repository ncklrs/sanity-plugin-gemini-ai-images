import {
  defineConfig,
  defineType,
  type ObjectInputProps,
  type ImageValue,
  type ArrayOfObjectsInputProps,
} from 'sanity'
import {
  aiMediaSchemaTypes,
  geminiAIImages,
  ImageObjectInput,
  ImageGalleryInput,
  type RequestHeaders,
} from 'sanity-plugin-gemini-ai-images'
/** Supply your session's short-lived Sanity user token via getRequestHeaders.
 * Never embed the Gemini/OpenAI/service token in the Studio bundle. */
export function createAIStudio(
  projectId: string,
  dataset: string,
  getRequestHeaders: RequestHeaders,
) {
  const options = {
    apiEndpoint: '/api/ai',
    jobsEndpoint: '/api/ai/jobs',
    referenceEndpoint: '/api/ai/reference',
    getRequestHeaders,
    enableHistory: true,
    enableAssetReferences: true,
    enableBrandPresets: true,
    defaultModel: 'gemini-3.1-flash-image' as const,
    availableModels: [
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
      'gpt-image-2.5-sunburst',
      'gpt-image-2.5-flare',
    ] as const,
  }
  const config = {...options, availableModels: [...options.availableModels]}
  return defineConfig({
    projectId,
    dataset,
    plugins: [geminiAIImages({...config, enableStandaloneTool: true})],
    schema: {
      types: [
        ...aiMediaSchemaTypes,
        defineType({
          name: 'article',
          type: 'document',
          fields: [
            {name: 'title', type: 'string'},
            {
              name: 'hero',
              type: 'image',
              fields: [
                {name: 'alt', type: 'string'},
                {name: 'caption', type: 'text'},
              ],
              components: {
                input: (props: ObjectInputProps<ImageValue>) => (
                  <ImageObjectInput {...props} {...config} enableAIGeneration />
                ),
              },
            },
            {
              name: 'gallery',
              type: 'array',
              of: [{type: 'image'}],
              components: {
                input: (props: ArrayOfObjectsInputProps) => (
                  <ImageGalleryInput {...props} {...config} />
                ),
              },
            },
          ],
        }),
      ],
    },
  })
}
