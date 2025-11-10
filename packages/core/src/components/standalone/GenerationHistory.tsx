import {Box, Button, Card, Flex, Heading, Stack, Text} from '@sanity/ui'
import type {GenerationSession} from '../../types.js'

interface GenerationHistoryProps {
  sessions: GenerationSession[]
  onLoadSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onClose: () => void
}

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function GenerationHistory({
  sessions,
  onLoadSession,
  onDeleteSession,
  onClose,
}: GenerationHistoryProps) {

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between">
        <Heading size={2}>Generation History</Heading>
        <Button text="Close" mode="ghost" onClick={onClose} />
      </Flex>

      {sessions.length === 0 && (
        <Card padding={4} tone="transparent" border radius={2}>
          <Text size={1} muted align="center">
            No saved sessions yet. Generated images will appear here.
          </Text>
        </Card>
      )}

      <Stack space={3}>
        {sessions.map((session) => (
          <Card key={session.id} padding={4} radius={2} shadow={1}>
            <Stack space={3}>
              <Flex align="center" justify="space-between">
                <Box flex={1}>
                  <Text size={1} weight="semibold">
                    Session {session.id.split('-')[1]?.slice(0, 8) || 'Unknown'}
                  </Text>
                  <Text size={0} muted>
                    {formatDate(session.timestamp)}
                  </Text>
                </Box>
                <Flex gap={2}>
                  <Button
                    text="Load"
                    mode="ghost"
                    tone="primary"
                    onClick={() => onLoadSession(session.id)}
                    fontSize={1}
                  />
                  <Button
                    text="Delete"
                    mode="ghost"
                    tone="critical"
                    onClick={() => onDeleteSession(session.id)}
                    fontSize={1}
                  />
                </Flex>
              </Flex>

              <Flex gap={3}>
                <Box>
                  <Text size={0} muted>
                    Generations
                  </Text>
                  <Text size={1} weight="semibold">
                    {session.results.length}
                  </Text>
                </Box>
                <Box>
                  <Text size={0} muted>
                    Saved Images
                  </Text>
                  <Text size={1} weight="semibold">
                    {session.savedImages.length}
                  </Text>
                </Box>
              </Flex>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}
