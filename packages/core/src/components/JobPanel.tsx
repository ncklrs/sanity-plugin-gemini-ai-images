import {MediaSurface} from './MediaSurface.js'
import {Card, Text} from '@sanity/ui'
import {Stack} from '../lib/ui-compat.js'
import type {JobSnapshot} from '../hooks/useGenerationJob.js'
import type {SanityImageAsset} from '../types.js'
export function JobPanel({
  job,
  error,
  onRetry,
  onCancel,
  onResume,
  onDismiss,
  onSelect,
}: {
  job: JobSnapshot
  error?: string
  onRetry: (indices: number[]) => Promise<void>
  onCancel: () => Promise<void>
  onResume: () => Promise<void>
  onDismiss: () => void
  onSelect?: (assets: SanityImageAsset[]) => void
}) {
  const complete = job.items.filter(
      (i) => i.status === 'complete' && i.index >= 0,
    ),
    failed = job.items.filter((i) => ['failed', 'uncertain'].includes(i.status))
  const action = (task: Promise<void>) => void task.catch(() => {})
  return (
    <MediaSurface>
      <Card border padding={3}>
        <Stack gap={3}>
          <Text weight="semibold">Generation job: {job.status}</Text>
          <progress
            aria-label="Generation progress"
            value={complete.length}
            max={job.items.filter((i) => i.index >= 0).length || 1}
          />
          <p>
            {complete.length} completed. Job ID: <code>{job.id}</code>
          </p>
          {job.items.map((item) => (
            <div key={item.index}>
              <p>
                {item.variation}: {item.status} {item.error}
              </p>
              {item.output &&
                (job.kind === 'video' ? (
                  <video
                    controls
                    src={item.output.url}
                    style={{maxWidth: '100%'}}
                  />
                ) : (
                  <img
                    src={item.output.url}
                    alt={item.variation}
                    style={{maxWidth: 160}}
                  />
                ))}
            </div>
          ))}
          {job.status === 'uncertain' && (
            <p role="alert">
              The provider may have billed an interrupted request. Retrying
              uncertain items may incur another charge.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          {failed.length > 0 && (
            <button
              type="button"
              onClick={() => action(onRetry(failed.map((i) => i.index)))}
            >
              Retry failed or uncertain items
            </button>
          )}
          {['queued', 'running'].includes(job.status) && (
            <button type="button" onClick={() => action(onCancel())}>
              Cancel remaining work
            </button>
          )}
          {error && (
            <button type="button" onClick={() => action(onResume())}>
              Resume job
            </button>
          )}
          {onSelect && complete.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onSelect(
                  complete.map((i) => ({
                    _id: i.output!.assetId,
                    _type: 'sanity.imageAsset',
                    url: i.output!.url,
                  })),
                )
              }
            >
              Use completed images
            </button>
          )}
          <button
            type="button"
            disabled={['queued', 'running'].includes(job.status)}
            onClick={onDismiss}
          >
            Close job
          </button>
          {job.kind === 'video' && (
            <p>
              Cancellation stops local work and polling. A submitted provider
              operation may still finish and incur charges.
            </p>
          )}
        </Stack>
      </Card>
    </MediaSurface>
  )
}
