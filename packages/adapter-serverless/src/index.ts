import {GoogleGenAI} from '@google/genai'

const geminiApiKey = process.env.GEMINI_API_KEY

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY not configured - AI image generation will not work')
}

interface RequestBody {
  prompt: string
  aspectRatio?: string
  mode?: 'generate' | 'edit'
  baseImage?: string
  series?: {
    quantity: number
    consistencyPrompt: string
    variations: string[]
  }
}

interface ImageData {
  imageData: string
  mimeType: string
}

interface SeriesImageData extends ImageData {
  variation: string
  index: number
}

interface ResponseBody {
  imageData?: string
  mimeType?: string
  images?: SeriesImageData[]
  metadata?: {
    basePrompt: string
    stylePrompt: string
    generatedAt: string
    quantity: number
    successful: number
    failed: number
  }
  errors?: Array<{
    index: number
    variation: string
    error: string
  }>
  error?: string
}

async function generateSingleImage(
  client: GoogleGenAI,
  prompt: string,
  aspectRatio?: string,
  mode?: string,
  baseImage?: string,
): Promise<ImageData> {
  const modelName = 'gemini-2.5-flash-image'
  let response

  if (mode === 'edit' && baseImage) {
    // Image editing mode
    response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: baseImage,
              },
            },
            {text: prompt},
          ],
        },
      ],
      config: {
        imageConfig: aspectRatio
          ? {
              aspectRatio,
            }
          : {},
      },
    })
  } else {
    // Text-to-image mode
    response = await client.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [{text: prompt}],
        },
      ],
      config: {
        responseModalities: ['Image'],
        imageConfig: aspectRatio
          ? {
              aspectRatio,
            }
          : {},
      },
    })
  }

  // Extract image from response
  const result: any = response
  if (result.candidates?.[0]?.content?.parts) {
    for (const part of result.candidates[0].content.parts) {
      if (part.inlineData) {
        return {
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        }
      }
    }
  }

  throw new Error('No image generated in response')
}

/**
 * Serverless Function Handler for Gemini AI Image Generation
 *
 * This handler works with various serverless platforms:
 * - Vercel Functions
 * - Netlify Functions
 * - AWS Lambda
 * - Cloudflare Workers (with modifications)
 *
 * Usage in Vercel (api/gemini/generate-image.ts):
 *
 * import {handler} from 'sanity-plugin-gemini-ai-images-serverless'
 * export default handler
 *
 * Usage in Netlify (netlify/functions/generate-image.ts):
 *
 * import {handler} from 'sanity-plugin-gemini-ai-images-serverless'
 * export {handler}
 */
export async function handler(
  request: Request
): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({error: 'Method not allowed'}),
      {
        status: 405,
        headers: {'Content-Type': 'application/json'},
      }
    )
  }

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({error: 'Gemini API not configured'}),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      }
    )
  }

  try {
    const body: RequestBody = await request.json()
    const {prompt, aspectRatio, mode, baseImage, series} = body

    if (!prompt) {
      return new Response(
        JSON.stringify({error: 'Prompt is required'}),
        {
          status: 400,
          headers: {'Content-Type': 'application/json'},
        }
      )
    }

    const client = new GoogleGenAI({apiKey: geminiApiKey})

    // Series generation mode
    if (series) {
      const {quantity, consistencyPrompt, variations} = series

      if (!variations || variations.length === 0) {
        return new Response(
          JSON.stringify({error: 'Variations are required for series generation'}),
          {
            status: 400,
            headers: {'Content-Type': 'application/json'},
          }
        )
      }

      const parsedQuantity = Number(quantity)

      if (!Number.isFinite(parsedQuantity)) {
        return new Response(
          JSON.stringify({error: 'Quantity must be a number between 2 and 10'}),
          {
            status: 400,
            headers: {'Content-Type': 'application/json'},
          }
        )
      }

      if (parsedQuantity < 2 || parsedQuantity > 10) {
        return new Response(
          JSON.stringify({error: 'Quantity must be between 2 and 10'}),
          {
            status: 400,
            headers: {'Content-Type': 'application/json'},
          }
        )
      }

      const images: SeriesImageData[] = []
      const errors: Array<{index: number; variation: string; error: string}> = []

      // Generate images in parallel
      const cappedVariations = variations.slice(0, parsedQuantity)
      const promises = cappedVariations.map(async (variation, index) => {
        try {
          const fullPrompt = `${prompt} ${consistencyPrompt} Variation: ${variation}`
          const result = await generateSingleImage(client, fullPrompt, aspectRatio, mode, baseImage)
          return {
            ...result,
            variation,
            index,
          }
        } catch (error) {
          errors.push({
            index,
            variation,
            error: error instanceof Error ? error.message : 'Generation failed',
          })
          return null
        }
      })

      const results = await Promise.all(promises)

      // Filter out failed generations
      for (const result of results) {
        if (result) {
          images.push(result)
        }
      }

      if (images.length === 0) {
        return new Response(
          JSON.stringify({error: 'All image generations failed', details: errors}),
          {
            status: 500,
            headers: {'Content-Type': 'application/json'},
          }
        )
      }

      const responseBody: ResponseBody = {
        images,
        metadata: {
          basePrompt: prompt,
          stylePrompt: consistencyPrompt,
          generatedAt: new Date().toISOString(),
          quantity: parsedQuantity,
          successful: images.length,
          failed: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      }

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Single image generation (original behavior)
    const result = await generateSingleImage(client, prompt, aspectRatio, mode, baseImage)
    const responseBody: ResponseBody = {
      imageData: result.imageData,
      mimeType: result.mimeType,
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Image generation failed:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Image generation failed',
      }),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      }
    )
  }
}

// Default export for platforms that expect it
export default handler
