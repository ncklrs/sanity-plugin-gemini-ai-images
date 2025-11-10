import type {ConsistencyLevel} from '../types.js'

export const consistencyPrompts: Record<ConsistencyLevel, string> = {
  strict:
    'CREATE A SINGLE IMAGE (NOT A GRID, COLLAGE, OR MULTIPLE PANELS). STRICT CONSISTENCY REQUIRED: Show the EXACT SAME individual person/product/subject in this single image. If there is a person, it must be the SAME person with the same face, same age, same appearance. If there is a product, it must be the SAME product with identical design, color, and features. DO NOT create different people or different products. DO NOT create a grid or collage showing multiple variations - output ONE single image only. Only the camera angle, lighting, or background should vary as specified. The subject identity must be 100% consistent across all images in the series.',
  moderate:
    'CREATE A SINGLE IMAGE (NOT A GRID, COLLAGE, OR MULTIPLE PANELS). MAINTAIN SUBJECT CONSISTENCY: Keep the SAME MAIN PERSON/PRODUCT/SUBJECT recognizable in this single image. If showing a person, it should be the same individual with consistent features and appearance. If showing a product, it should be the same item with the same core design. DO NOT create a grid or collage - output ONE single image only. Allow natural variation in the specified aspect (angle, background, lighting) but the primary subject must remain clearly identifiable as the same entity.',
  loose:
    'CREATE A SINGLE IMAGE (NOT A GRID, COLLAGE, OR MULTIPLE PANELS). SUBJECT CONTINUITY: Show the SAME GENERAL PERSON/PRODUCT/SUBJECT in this single image with some natural flexibility. The subject should be clearly recognizable as the same type of person or item category. DO NOT create a grid or collage - output ONE single image only. Maintain thematic connection and ensure the viewer can identify this is the same subject across the series, even with creative variation in style and presentation.',
}

export const getConsistencyPrompt = (level: ConsistencyLevel): string => {
  if (!(level in consistencyPrompts)) {
    throw new Error(`Invalid consistency level: ${level}`)
  }
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

  // Add variation (only if non-empty)
  if (variation) {
    parts.push(`Variation: ${variation}`)
  }

  return parts.join('. ')
}
