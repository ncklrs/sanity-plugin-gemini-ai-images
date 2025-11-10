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

      const parsedQuantity = Number(quantity)

      if (!Number.isFinite(parsedQuantity)) {
        return NextResponse.json({error: 'Quantity must be a number between 2 and 10'}, {status: 400})
      }

      if (parsedQuantity < 2 || parsedQuantity > 10) {
        return NextResponse.json({error: 'Quantity must be between 2 and 10'}, {status: 400})
      }

      const images: Array<{imageData: string; mimeType: string; variation: string; index: number}> = []
      const errors: Array<{index: number; variation: string; error: string}> = []

      // Generate images sequentially when using base image for better consistency
      const generateImage = async (variation: string, index: number) => {
        try {
          // Build highly specific prompt to enforce consistency
          let fullPrompt = ''

          if (baseImage) {
            // When using reference image: emphasize keeping the EXACT same subject
            fullPrompt = [
              'CREATE A SINGLE IMAGE (NOT A GRID OR COLLAGE).',
              'IMPORTANT: Use this reference image as the EXACT subject/person. Do NOT create a different person or subject.',
              'Keep the SAME person/subject/object from the reference image.',
              consistencyPrompt,
              prompt,
              `Apply this specific variation ONLY: ${variation}`,
              'Output: ONE single image showing the same subject with the specified variation applied.'
            ].filter(Boolean).join(' ')
          } else {
            // Text-to-image: be very explicit about consistency
            fullPrompt = [
              'CREATE A SINGLE IMAGE (NOT A GRID OR COLLAGE).',
              prompt,
              consistencyPrompt,
              `Apply ONLY this variation to the subject: ${variation}`,
              'The subject itself must remain IDENTICAL. Only the specified variation aspect should change.',
              'Output: ONE single image.'
            ].filter(Boolean).join(' ')
          }

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
      }

      // Generate sequentially to ensure consistency (especially with reference images)
      const results: any[] = []
      const cappedVariations = variations.slice(0, parsedQuantity)
      for (let i = 0; i < cappedVariations.length; i++) {
        const result = await generateImage(cappedVariations[i], i)
        results.push(result)
        // Small delay between generations to avoid rate limiting
        if (i < cappedVariations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

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

      // Partial success - some images failed
      if (errors.length > 0) {
        return NextResponse.json(
          {
            images,
            metadata: {
              basePrompt: prompt,
              stylePrompt: consistencyPrompt,
              generatedAt: new Date().toISOString(),
              quantity: parsedQuantity,
              successful: images.length,
              failed: errors.length,
            },
            errors,
            warning: 'Some image generations failed',
          },
          {status: 207} // Multi-Status
        )
      }

      // Complete success
      return NextResponse.json({
        images,
        metadata: {
          basePrompt: prompt,
          stylePrompt: consistencyPrompt,
          generatedAt: new Date().toISOString(),
          quantity: parsedQuantity,
          successful: images.length,
          failed: 0,
        },
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
