import {MediaSurface} from './MediaSurface.js'
import {useId, useState} from 'react'
import {Card, Text} from '@sanity/ui'
import {Stack} from '../lib/ui-compat.js'
import {videoModels} from 'sanity-plugin-gemini-ai-images-contracts'
import {useGenerationJob} from '../hooks/useGenerationJob.js'
import {JobPanel} from './JobPanel.js'
import type {RequestHeaders} from '../lib/request.js'
export function VideoStudio({
  jobsEndpoint,
  apiKey,
  getRequestHeaders,
}: {
  jobsEndpoint: string
  apiKey?: string
  getRequestHeaders?: RequestHeaders
}) {
  const id = useId(),
    [prompt, setPrompt] = useState(''),
    [model, setModel] = useState<string>(videoModels[0]),
    [ratio, setRatio] = useState('16:9'),
    [duration, setDuration] = useState(8),
    [resolution, setResolution] = useState('720p'),
    [reference, setReference] = useState('')
  const job = useGenerationJob(jobsEndpoint, apiKey, getRequestHeaders, 'video')
  return (
    <MediaSurface>
      <Card padding={4}>
        <Stack gap={3}>
          <Text weight="semibold">Video studio</Text>
          <label htmlFor={`${id}-prompt`}>Video prompt</label>
          <textarea
            id={`${id}-prompt`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <label>
            Video model
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {videoModels.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Video aspect ratio
            <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
              <option>16:9</option>
              <option>9:16</option>
            </select>
          </label>
          <label>
            Duration in seconds
            <select
              value={duration}
              disabled={resolution === '1080p'}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[4, 6, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Video resolution
            <select
              value={resolution}
              onChange={(e) => {
                setResolution(e.target.value)
                if (e.target.value === '1080p') setDuration(8)
              }}
            >
              <option>720p</option>
              <option>1080p</option>
            </select>
          </label>
          <label>
            Starting image asset ID (optional)
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!prompt.trim() || job.busy || !!job.job}
            onClick={() =>
              void job.create({
                kind: 'video',
                prompt,
                model,
                aspectRatio: ratio,
                durationSeconds: duration,
                resolution,
                reference: reference
                  ? {assetId: reference, role: 'subject'}
                  : undefined,
              })
            }
          >
            Generate video
          </button>
          {job.job && (
            <JobPanel
              job={job.job}
              error={job.error}
              onRetry={job.retry}
              onCancel={job.cancel}
              onResume={job.step}
              onDismiss={job.dismiss}
            />
          )}
          {job.error && !job.job && (
            <p role="alert">
              {job.error}
              <button type="button" onClick={job.dismiss}>
                Reset video request
              </button>
            </p>
          )}
          <Text size={0} muted>
            Video generation shares the configured generation limits. Submitted
            operations may incur charges even after cancellation.
          </Text>
        </Stack>
      </Card>
    </MediaSurface>
  )
}
