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
}

interface ResponseBody {
  imageData?: string
  mimeType?: string
  error?: string
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
    const {prompt, aspectRatio, mode, baseImage} = body

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
          const responseBody: ResponseBody = {
            imageData: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          }
          return new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          })
        }
      }
    }

    return new Response(
      JSON.stringify({error: 'No image generated in response'}),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      }
    )
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
