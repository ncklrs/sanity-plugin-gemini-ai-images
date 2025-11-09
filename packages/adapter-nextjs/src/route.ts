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
export async function POST(request: Request) {
  if (!geminiApiKey) {
    return NextResponse.json({error: 'Gemini API not configured'}, {status: 500})
  }

  try {
    const body = await request.json()
    const {prompt, aspectRatio, mode, baseImage} = body

    if (!prompt) {
      return NextResponse.json({error: 'Prompt is required'}, {status: 400})
    }

    const client = new GoogleGenAI({apiKey: geminiApiKey})
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
          return NextResponse.json({
            imageData: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          })
        }
      }
    }

    return NextResponse.json({error: 'No image generated in response'}, {status: 500})
  } catch (error) {
    console.error('Image generation failed:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Image generation failed'},
      {status: 500}
    )
  }
}
