import type {ConsistencyLevel} from '../types.js'

export const consistencyPrompts: Record<ConsistencyLevel, string> = {
  strict:
    'Maintain exact same artistic style, color palette, lighting setup, composition rules, and visual treatment across all variations. Only the specified element should change while everything else remains consistent.',
  moderate:
    'Keep consistent aesthetic feel, similar mood, and related color palette while allowing natural variation in composition and minor lighting adjustments. The overall style should be recognizably cohesive.',
  loose:
    'Share general visual theme, style direction, and tonal qualities. Allow creative freedom in execution while maintaining thematic connection.',
}

export const getConsistencyPrompt = (level: ConsistencyLevel): string => {
  return consistencyPrompts[level]
}

export const buildSeriesPrompt = (
  basePrompt: string,
  variation: string,
  consistencyLevel: ConsistencyLevel,
  baseStylePrompt?: string,
): string => {
  const parts: string[] = []

  // Add base prompt
  parts.push(basePrompt)

  // Add consistency instruction
  parts.push(consistencyPrompts[consistencyLevel])

  // Add base style if provided
  if (baseStylePrompt) {
    parts.push(`Style anchor: ${baseStylePrompt}`)
  }

  // Add variation
  parts.push(`Variation: ${variation}`)

  return parts.join(' ')
}
