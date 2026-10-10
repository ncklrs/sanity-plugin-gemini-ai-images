import {MediaSurface} from './MediaSurface.js'
import {useEffect, useId, useState} from 'react'
import {useClient} from 'sanity'
import {Card, Text} from '@sanity/ui'
import {Stack} from '../lib/ui-compat.js'
import {
  modelCatalog,
  type ImageModel,
  type Resolution,
  type ReferenceImage,
  type BrandPreset,
} from 'sanity-plugin-gemini-ai-images-contracts'
export interface CreativeSettings {
  resolution: Resolution
  grounding: boolean
  references: ReferenceImage[]
  brandPresetId?: string
}
export function CreativeControls({
  model,
  value,
  onChange,
  disabled = false,
  enableReferences = false,
  enableBrandPresets = false,
}: {
  model: ImageModel
  value: CreativeSettings
  onChange: (settings: CreativeSettings) => void
  disabled?: boolean
  enableReferences?: boolean
  enableBrandPresets?: boolean
}) {
  const client = useClient({apiVersion: '2024-01-01'}),
    id = useId(),
    capability = modelCatalog.find((m) => m.id === model)!
  const [assets, setAssets] = useState<Array<{_id: string; title?: string}>>(
      [],
    ),
    [presets, setPresets] = useState<Array<BrandPreset & {_id: string}>>([]),
    [assetId, setAssetId] = useState(''),
    [error, setError] = useState<string>()
  const [name, setName] = useState(''),
    [instructions, setInstructions] = useState('')
  useEffect(() => {
    let active = true
    if (enableReferences && typeof client.fetch === 'function')
      client
        .fetch(
          '*[_type=="sanity.imageAsset"] | order(_createdAt desc)[0...50]{_id,title}',
        )
        .then((data) => {
          if (active) setAssets(data)
        })
        .catch((e) => {
          if (active) setError(String(e))
        })
    return () => {
      active = false
    }
  }, [client, enableReferences])
  useEffect(() => {
    let active = true
    if (enableBrandPresets && typeof client.fetch === 'function')
      client
        .fetch('*[_type=="aiBrandPreset"] | order(name asc)')
        .then((data) => {
          if (active) setPresets(data)
        })
        .catch((e) => {
          if (active) setError(String(e))
        })
    return () => {
      active = false
    }
  }, [client, enableBrandPresets])
  const savePreset = async () => {
    try {
      const doc = await client.create({
        _id: `ai-brand-${crypto.randomUUID()}`,
        _type: 'aiBrandPreset',
        name,
        instructions,
      })
      setPresets((current) => [...current, doc as any])
      setName('')
      setInstructions('')
    } catch (e) {
      setError(String(e))
    }
  }
  return (
    <MediaSurface>
      <Card padding={3} border radius={2}>
        <Stack gap={3}>
          <label htmlFor={`${id}-resolution`}>Resolution</label>
          <select
            id={`${id}-resolution`}
            disabled={disabled}
            value={value.resolution}
            onChange={(e) =>
              onChange({...value, resolution: e.target.value as Resolution})
            }
          >
            {capability.resolutions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              disabled={disabled || !capability.grounding}
              checked={capability.grounding && value.grounding}
              onChange={(e) =>
                onChange({...value, grounding: e.target.checked})
              }
            />{' '}
            Use Google Search grounding
          </label>
          {enableReferences && (
            <>
              <label htmlFor={`${id}-asset`}>Reference asset</label>
              <select
                id={`${id}-asset`}
                value={assetId}
                disabled={
                  disabled ||
                  value.references.length >= capability.maxReferences
                }
                onChange={(e) => setAssetId(e.target.value)}
              >
                <option value="">Choose from asset library</option>
                {assets.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.title || a._id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={
                  disabled ||
                  !assetId ||
                  value.references.length >= capability.maxReferences
                }
                onClick={() => {
                  onChange({
                    ...value,
                    references: [
                      ...value.references,
                      {assetId, role: 'subject'},
                    ],
                  })
                  setAssetId('')
                }}
              >
                Add reference
              </button>
              {value.references.map((ref, index) => (
                <div key={`${ref.assetId}-${index}`}>
                  <span>
                    {assets.find((a) => a._id === ref.assetId)?.title ||
                      ref.assetId}
                  </span>{' '}
                  <select
                    aria-label={`Reference ${index + 1} role`}
                    disabled={disabled}
                    value={ref.role}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        references: value.references.map((r, i) =>
                          i === index
                            ? {
                                ...r,
                                role: e.target.value as ReferenceImage['role'],
                              }
                            : r,
                        ),
                      })
                    }
                  >
                    {['subject', 'product', 'style', 'character'].map(
                      (role) => (
                        <option key={role}>{role}</option>
                      ),
                    )}
                  </select>{' '}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...value,
                        references: value.references.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    Remove reference {index + 1}
                  </button>
                </div>
              ))}
              <Text size={0} muted>
                Up to {capability.maxReferences} references for this model.
                Reference images guide the result; identity consistency is not
                guaranteed.
              </Text>
            </>
          )}
          {enableBrandPresets && (
            <>
              <label htmlFor={`${id}-brand`}>Brand preset</label>
              <select
                id={`${id}-brand`}
                value={value.brandPresetId ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    brandPresetId: e.target.value || undefined,
                  })
                }
              >
                <option value="">No preset</option>
                {presets.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <details>
                <summary>Save a shared brand preset</summary>
                <label>
                  Preset name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Brand instructions
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={disabled || !name.trim() || !instructions.trim()}
                  onClick={() => void savePreset()}
                >
                  Save brand preset
                </button>
              </details>
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </Stack>
      </Card>
    </MediaSurface>
  )
}
