import {Box, Card, Container, Flex, Heading, Stack} from '@sanity/ui'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import {useGenerationSession} from '../../hooks/useGenerationSession.js'
import type {SanityImageAsset} from '../../types.js'

interface ImageStudioToolProps {
  apiEndpoint?: string
  apiKey?: string
}

export function ImageStudioTool({
  apiEndpoint = '/api/gemini/generate-image',
  apiKey
}: ImageStudioToolProps) {
  const {saveSession} = useGenerationSession()

  const handleImageGenerated = (_asset: SanityImageAsset) => {
    // Asset is uploaded, save session if needed
    saveSession()
  }

  return (
    <Container width={5}>
      <Stack space={4} padding={5}>
        <Flex align="center" justify="space-between">
          <Heading size={3}>AI Image Studio</Heading>
        </Flex>

        <Card padding={0} radius={3} shadow={1}>
          <Box padding={4}>
            <ImageGeneratorContent
              apiEndpoint={apiEndpoint}
              apiKey={apiKey}
              onImageGenerated={handleImageGenerated}
            />
          </Box>
        </Card>
      </Stack>
    </Container>
  )
}
