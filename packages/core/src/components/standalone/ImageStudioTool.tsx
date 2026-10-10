import {Box, Card, Container, Flex, Heading} from '@sanity/ui'
import {Stack} from '../ui/compat.js'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import {useGenerationSession} from '../../hooks/useGenerationSession.js'
import type {GeneratorSettings, SanityImageAsset} from '../../types.js'

export function ImageStudioTool(settings: GeneratorSettings) {
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
              {...settings}
              onImageGenerated={handleImageGenerated}
            />
          </Box>
        </Card>
      </Stack>
    </Container>
  )
}
