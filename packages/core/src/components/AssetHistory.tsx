import {MediaSurface} from './MediaSurface.js'
import {Card, Text} from '@sanity/ui'
import {Stack} from '../lib/ui-compat.js'
import type {GenerationRecord} from '../lib/editorial.js'
export function AssetHistory({
  records,
  onUse,
  onDelete,
  onExport,
  onRefresh,
  error,
}: {
  records: GenerationRecord[]
  onUse: (record: GenerationRecord) => void
  onDelete: (id: string) => Promise<void>
  onExport: () => void
  onRefresh: () => Promise<void>
  error?: string
}) {
  return (
    <MediaSurface>
      <Card border padding={3}>
        <Stack gap={3}>
          <Text weight="semibold">Generation history</Text>
          <div>
            <button type="button" onClick={() => void onRefresh()}>
              Refresh history
            </button>{' '}
            <button type="button" onClick={onExport}>
              Export history
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          {!records.length && <p>No saved generations yet.</p>}
          {records.map((record) => (
            <article key={record._id}>
              {record.assetDocument?.url &&
                (record.assetDocument._type === 'sanity.fileAsset' ? (
                  <video
                    src={record.assetDocument.url}
                    controls
                    preload="metadata"
                    style={{maxWidth: 240}}
                    aria-label={record.prompt}
                  />
                ) : (
                  <img
                    src={record.assetDocument.url}
                    alt={record.alt ?? record.prompt}
                    style={{maxWidth: 160}}
                  />
                ))}
              <p>{record.prompt}</p>
              <p>
                {record.model} · {new Date(record.createdAt).toLocaleString()}
              </p>
              {record.assetDocument?._type === 'sanity.imageAsset' && (
                <button type="button" onClick={() => onUse(record)}>
                  Reopen generation
                </button>
              )}{' '}
              <button
                type="button"
                onClick={() => void onDelete(record._id).catch(() => {})}
              >
                Delete history record
              </button>
            </article>
          ))}
          <Text size={0} muted>
            History is shared through this project and dataset. Deleting a
            record retains its library asset.
          </Text>
        </Stack>
      </Card>
    </MediaSurface>
  )
}
