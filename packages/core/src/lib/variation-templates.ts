import type {VariationType} from '../types.js'

export interface VariationTemplate {
  name: string
  description: string
  variations: string[]
  type: VariationType
}

export const variationTemplates: Record<string, VariationTemplate> = {
  productAngles: {
    name: 'Product Angles',
    description: 'Different views of the same product',
    type: 'angle',
    variations: [
      'front view, centered composition',
      '45-degree angle view, slightly elevated perspective',
      'top-down flat lay view, birds eye perspective',
      'side profile view with dramatic shadow',
      'three-quarter view showing depth and dimension',
    ],
  },
  productContexts: {
    name: 'Product Contexts',
    description: 'Same product in different settings',
    type: 'context',
    variations: [
      'on clean white surface, minimal styling',
      'in lifestyle setting with complementary props',
      'in use by person, natural interaction',
      'on rustic wooden surface with natural elements',
      'in modern minimalist environment',
    ],
  },
  heroBackgrounds: {
    name: 'Hero Backgrounds',
    description: 'Varied backgrounds for hero images',
    type: 'background',
    variations: [
      'minimalist gradient background, soft color transition',
      'natural outdoor scene with soft focus',
      'modern urban environment, architectural elements',
      'abstract geometric pattern background',
      'textured surface with depth and dimension',
    ],
  },
  lightingVariations: {
    name: 'Lighting Variations',
    description: 'Different lighting moods',
    type: 'lighting',
    variations: [
      'soft natural light from window, gentle shadows',
      'dramatic studio lighting with strong contrast',
      'golden hour warmth, sunset glow',
      'cool blue tones, morning light',
      'overhead lighting, even illumination',
    ],
  },
  marketingAngles: {
    name: 'Marketing Angles',
    description: 'Different marketing perspectives',
    type: 'context',
    variations: [
      'lifestyle shot showing product benefits',
      'detail close-up highlighting key features',
      'environmental shot showing scale and context',
      'action shot demonstrating usage',
      'comparison shot with complementary items',
    ],
  },
  seasonalThemes: {
    name: 'Seasonal Themes',
    description: 'Same subject across seasons',
    type: 'background',
    variations: [
      'spring theme with fresh blooms and pastels',
      'summer theme with bright sunshine and vibrant colors',
      'autumn theme with warm tones and fallen leaves',
      'winter theme with cool tones and minimalist snow',
    ],
  },
  moodVariations: {
    name: 'Mood Variations',
    description: 'Different emotional tones',
    type: 'lighting',
    variations: [
      'energetic and vibrant, high contrast',
      'calm and serene, soft muted tones',
      'luxurious and premium, rich deep colors',
      'fresh and clean, bright airy feel',
      'warm and inviting, cozy atmosphere',
    ],
  },
  compositionStyles: {
    name: 'Composition Styles',
    description: 'Different compositional approaches',
    type: 'angle',
    variations: [
      'centered symmetrical composition',
      'rule of thirds placement, balanced asymmetry',
      'negative space emphasis, minimal elements',
      'tight crop, detail focus',
      'wide shot with environmental context',
    ],
  },
}

export const getVariationsByType = (type: VariationType): VariationTemplate[] => {
  return Object.values(variationTemplates).filter((template) => template.type === type)
}

export const getAllVariationTemplates = (): VariationTemplate[] => {
  return Object.values(variationTemplates)
}

export const getVariationTemplate = (key: string): VariationTemplate | undefined => {
  return variationTemplates[key]
}
