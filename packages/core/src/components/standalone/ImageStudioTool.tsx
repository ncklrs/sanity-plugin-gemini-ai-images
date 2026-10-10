import {MediaSurface} from '../MediaSurface.js'
import {useState} from 'react'
import {Stack} from '../../lib/ui-compat.js'
import {Box, Card, Container, Flex, Heading} from '@sanity/ui'
import {ImageGeneratorContent} from '../ImageGeneratorContent.js'
import {VideoStudio} from '../VideoStudio.js'
import {AssetHistory} from '../AssetHistory.js'
import {useEditorialHistory} from '../../hooks/useEditorialHistory.js'
import type {GenerationRecord} from '../../lib/editorial.js'
import type {GeminiPluginConfig} from '../../types.js'
export function ImageStudioTool({
  apiEndpoint = '/api/gemini/generate-image',
  enableHistory = true,
  ...options
}: GeminiPluginConfig) {
  const history = useEditorialHistory(enableHistory),
    [record, setRecord] = useState<GenerationRecord>(),
    [view, setView] = useState<'image' | 'video'>('image')
  const exportHistory = () => {
    const url = URL.createObjectURL(
        new Blob([history.exportJSON()], {type: 'application/json'}),
      ),
      link = document.createElement('a')
    link.href = url
    link.download = 'generation-history.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <MediaSurface>
      <Container width={5}>
        <Stack gap={4} padding={5}>
          <Flex align="center" justify="space-between">
            <Heading size={3}>AI Image Studio</Heading>
          </Flex>
          {options.enableVideo && options.jobsEndpoint && (
            <div>
              <button type="button" onClick={() => setView('image')}>
                Images
              </button>{' '}
              <button type="button" onClick={() => setView('video')}>
                Videos
              </button>
            </div>
          )}
          {view === 'video' && options.jobsEndpoint ? (
            <VideoStudio
              jobsEndpoint={options.jobsEndpoint}
              apiKey={options.apiKey}
              getRequestHeaders={options.getRequestHeaders}
            />
          ) : (
            <Card radius={3} shadow={1}>
              <Box padding={4}>
                <ImageGeneratorContent
                  apiEndpoint={apiEndpoint}
                  enableHistory={enableHistory}
                  {...options}
                  initialRecord={record}
                  onImageGenerated={() => void history.refresh()}
                />
              </Box>
            </Card>
          )}
          {enableHistory && (
            <>
              <AssetHistory
                records={history.records}
                error={history.error}
                onUse={(record) => {
                  setRecord(record)
                  setView('image')
                }}
                onDelete={history.remove}
                onExport={exportHistory}
                onRefresh={history.refresh}
              />
              <details>
                <summary>History retention</summary>
                <button
                  type="button"
                  onClick={() => void history.prune(30).catch(() => {})}
                >
                  Delete history records older than 30 days
                </button>
                <p>Library assets are retained.</p>
              </details>
            </>
          )}
        </Stack>
      </Container>
    </MediaSurface>
  )
}
