import {Box, Card, Container, Flex, Heading, Stack} from '@sanity/ui'
import {useState} from 'react'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import {GenerationHistory} from './GenerationHistory.js'
import {useGenerationSession} from '../../hooks/useGenerationSession.js'
import type {SanityImageAsset} from '../../types.js'

interface ImageStudioToolProps {
  apiEndpoint?: string
}

export function ImageStudioTool({apiEndpoint = '/api/gemini/generate-image'}: ImageStudioToolProps) {
  const {sessions, saveSession, loadSession, deleteSession} = useGenerationSession()
  const [showHistory, setShowHistory] = useState(false)

  const handleImageGenerated = (_asset: SanityImageAsset) => {
    // Asset is uploaded, save session if needed
    saveSession()
  }

  return (
    <Container width={5}>
      <Stack space={4} paddingY={5}>
        <Flex align="center" justify="space-between">
          <Heading size={3}>AI Image Studio</Heading>
          <Flex gap={2}>
            {/* History toggle removed for simplicity - can be added later */}
          </Flex>
        </Flex>

        <Card padding={0} radius={3} shadow={1}>
          <Box padding={4}>
            {showHistory ? (
              <GenerationHistory
                sessions={sessions}
                onLoadSession={loadSession}
                onDeleteSession={deleteSession}
                onClose={() => setShowHistory(false)}
              />
            ) : (
              <ImageGeneratorContent
                apiEndpoint={apiEndpoint}
                onImageGenerated={handleImageGenerated}
              />
            )}
          </Box>
        </Card>
      </Stack>
    </Container>
  )
}
