import {NextResponse} from 'next/server'
import {GoogleGenAI} from '@google/genai'

const geminiApiKey = process.env.GEMINI_API_KEY

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY not configured - AI image generation will not work')
}

/**
 * Next.js API Route Handler for Gemini AI Image Generation
 *
 * Usage in app/api/gemini/generate-image/route.ts:
 *
 * import {POST} from 'sanity-plugin-gemini-ai-images-nextjs/route'
 * export {POST}
 */
async function generateSingleImage(
  client: GoogleGenAI,
  prompt: string,
  aspectRatio?: string,
  mode?: string,
  baseImage?: string,
) {
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

export async function POST(request: Request) {
  if (!geminiApiKey) {
    return NextResponse.json({error: 'Gemini API not configured'}, {status: 500})
  }

  try {
    const body = await request.json()
    const {prompt, aspectRatio, mode, baseImage, series} = body

    if (!prompt) {
      return NextResponse.json({error: 'Prompt is required'}, {status: 400})
    }

    const client = new GoogleGenAI({apiKey: geminiApiKey})

    // Series generation mode
    if (series) {
      const {quantity, consistencyPrompt, variations} = series

      if (!variations || variations.length === 0) {
        return NextResponse.json({error: 'Variations are required for series generation'}, {status: 400})
      }

      if (quantity < 2 || quantity > 10) {
        return NextResponse.json({error: 'Quantity must be between 2 and 10'}, {status: 400})
      }

      const images: Array<{imageData: string; mimeType: string; variation: string; index: number}> = []
      const errors: Array<{index: number; variation: string; error: string}> = []

      // Generate images in parallel
      const promises = variations.slice(0, quantity).map(async (variation: string, index: number) => {
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
        return NextResponse.json(
          {error: 'All image generations failed', details: errors},
          {status: 500}
        )
      }

      return NextResponse.json({
        images,
        metadata: {
          basePrompt: prompt,
          stylePrompt: consistencyPrompt,
          generatedAt: new Date().toISOString(),
          quantity,
          successful: images.length,
          failed: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      })
    }

    // Single image generation (original behavior)
    const result = await generateSingleImage(client, prompt, aspectRatio, mode, baseImage)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Image generation failed:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Image generation failed'},
      {status: 500}
    )
  }
}
