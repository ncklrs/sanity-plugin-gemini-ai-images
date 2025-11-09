import type {PromptTemplate} from '../types.js'

export const promptTemplates: Record<string, PromptTemplate> = {
  productPhotography: {
    name: 'Product Photography',
    description: 'Professional studio product shots with clean backgrounds',
    prompt: (product: string) =>
      `A high-resolution, studio-lit product photograph of a ${product} on a pure white background. The lighting is a three-point softbox setup to eliminate harsh shadows. The camera angle is slightly elevated to showcase the product's features. Ultra-realistic, with sharp focus. Square format.`,
    aspectRatio: '1:1',
    category: 'product',
  },
  heroImage: {
    name: 'Hero Banner',
    description: 'Dramatic hero images perfect for website headers',
    prompt: (subject: string) =>
      `A cinematic, wide-angle hero image featuring ${subject}. Dramatic lighting with soft backlighting creating depth. Professional photography with shallow depth of field. Aspirational and eye-catching. Landscape format.`,
    aspectRatio: '16:9',
    category: 'hero',
  },
  minimalistBackground: {
    name: 'Minimalist Background',
    description: 'Clean backgrounds with negative space for text overlay',
    prompt: (element: string) =>
      `A minimalist composition featuring a ${element} positioned in the corner of the frame. The background is a vast, empty off-white canvas, creating significant negative space for text overlay. Soft, diffused lighting. Square format.`,
    aspectRatio: '1:1',
    category: 'background',
  },
  lifestyleShot: {
    name: 'Lifestyle Photography',
    description: 'Products shown in real-world context and usage',
    prompt: (product: string, context?: string) =>
      `A lifestyle photograph of a ${product} in use${context ? ` in a ${context}` : ''}. Natural lighting, authentic setting, photorealistic. The scene should feel warm and inviting. Focus on the product while showing its practical application.`,
    aspectRatio: '3:2',
    category: 'lifestyle',
  },
  socialMediaGraphic: {
    name: 'Social Media Post',
    description: 'Eye-catching graphics optimized for social sharing',
    prompt: (content: string) =>
      `A bold, attention-grabbing social media graphic featuring ${content}. Vibrant colors, modern design aesthetic. Clean composition with strong visual hierarchy. Perfect for Instagram or Facebook. Square format.`,
    aspectRatio: '1:1',
    category: 'marketing',
  },
  productMockup: {
    name: 'Product Mockup',
    description: 'Professional product mockups for e-commerce',
    prompt: (product: string) =>
      `A professional e-commerce product mockup of a ${product}. Clean, minimalist aesthetic with soft shadows. Presented on a neutral surface with perfect lighting. High-end commercial photography style. Focus on product details and textures.`,
    aspectRatio: '4:5',
    category: 'product',
  },
  storyTelling: {
    name: 'Brand Storytelling',
    description: 'Narrative-driven imagery that tells your brand story',
    prompt: (story: string) =>
      `An evocative, narrative-driven photograph that tells the story of ${story}. Emotional and authentic. Cinematic composition with intentional framing. Warm, natural tones. Should feel genuine and relatable.`,
    aspectRatio: '16:9',
    category: 'lifestyle',
  },
}

export const templateCategories = {
  product: 'Product Photography',
  lifestyle: 'Lifestyle & Context',
  hero: 'Hero & Banners',
  background: 'Backgrounds',
  marketing: 'Marketing Assets',
}
