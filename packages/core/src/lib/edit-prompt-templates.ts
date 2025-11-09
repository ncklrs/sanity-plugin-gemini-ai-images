import type {PromptTemplate} from '../types'

export const editPromptTemplates: Record<string, PromptTemplate> = {
  changeBackground: {
    name: 'Change Background',
    description: 'Replace the background with a new scene or color',
    prompt: 'Keep the main subject exactly as is, but replace the background with a clean, modern white studio background with soft shadows',
    aspectRatio: '1:1',
    category: 'background',
  },
  outdoorBackground: {
    name: 'Outdoor Setting',
    description: 'Place the product in a natural outdoor environment',
    prompt: 'Keep the main subject exactly as is, but place it in a beautiful outdoor natural setting with greenery and soft natural lighting',
    aspectRatio: '1:1',
    category: 'background',
  },
  luxuryBackground: {
    name: 'Luxury Background',
    description: 'Add an elegant, high-end background',
    prompt: 'Keep the main subject exactly as is, but add a luxurious, elegant background with marble, gold accents, and sophisticated lighting',
    aspectRatio: '1:1',
    category: 'background',
  },
  lifestyleScene: {
    name: 'Lifestyle Scene',
    description: 'Place in a realistic lifestyle context',
    prompt: 'Keep the main subject exactly as is, but place it in a realistic lifestyle scene showing it in use in a modern home setting',
    aspectRatio: '3:2',
    category: 'background',
  },

  addReflection: {
    name: 'Add Reflection',
    description: 'Add a subtle reflection effect',
    prompt: 'Keep the main subject exactly as is, but add a subtle mirror reflection underneath on a glossy surface',
    aspectRatio: '1:1',
    category: 'effects',
  },
  dramaticLighting: {
    name: 'Dramatic Lighting',
    description: 'Enhance with dramatic lighting',
    prompt: 'Keep the main subject exactly as is, but enhance it with dramatic, cinematic lighting with strong shadows and highlights',
    aspectRatio: '1:1',
    category: 'effects',
  },
  goldenHour: {
    name: 'Golden Hour Light',
    description: 'Add warm golden hour lighting',
    prompt: 'Keep the main subject exactly as is, but bathe it in warm, golden hour sunlight with soft glows and long shadows',
    aspectRatio: '16:9',
    category: 'effects',
  },
  waterDrops: {
    name: 'Water Droplets',
    description: 'Add fresh water droplets',
    prompt: 'Keep the main subject exactly as is, but add fresh water droplets on its surface for a refreshing, clean look',
    aspectRatio: '1:1',
    category: 'effects',
  },

  removeBackground: {
    name: 'Remove Background',
    description: 'Isolate subject on transparent/white',
    prompt: 'Keep the main subject exactly as is, but remove the background completely leaving only pure white',
    aspectRatio: '1:1',
    category: 'cleanup',
  },
  cleanupClutter: {
    name: 'Remove Clutter',
    description: 'Clean up background distractions',
    prompt: 'Keep the main subject exactly as is, but remove any clutter, distractions, or unwanted objects from the background',
    aspectRatio: '1:1',
    category: 'cleanup',
  },
  sharpenDetails: {
    name: 'Enhance Details',
    description: 'Sharpen and enhance product details',
    prompt: 'Keep the overall composition but enhance sharpness, clarity, and fine details of the main subject',
    aspectRatio: '1:1',
    category: 'cleanup',
  },

  addContext: {
    name: 'Add Context Items',
    description: 'Add complementary items around product',
    prompt: 'Keep the main subject exactly as is, but add tasteful complementary items around it that enhance the scene without overwhelming',
    aspectRatio: '1:1',
    category: 'creative',
  },
  seasonalTheme: {
    name: 'Seasonal Theme',
    description: 'Add seasonal decorative elements',
    prompt: 'Keep the main subject exactly as is, but add subtle seasonal decorative elements around it (specify: winter, spring, summer, fall)',
    aspectRatio: '1:1',
    category: 'creative',
  },
  colorVariant: {
    name: 'Color Variant',
    description: 'Change the product color',
    prompt: 'Keep the exact same product and composition, but change the main product color to [specify color] while maintaining all other details',
    aspectRatio: '1:1',
    category: 'creative',
  },
  flatLay: {
    name: 'Convert to Flat Lay',
    description: 'Convert to overhead flat lay style',
    prompt: 'Recreate this as a beautiful overhead flat lay arrangement with complementary items artfully arranged around the main subject',
    aspectRatio: '1:1',
    category: 'creative',
  },
}

export const editTemplateCategories = {
  background: 'Backgrounds',
  effects: 'Lighting & Effects',
  cleanup: 'Cleanup & Enhance',
  creative: 'Creative Edits',
}
