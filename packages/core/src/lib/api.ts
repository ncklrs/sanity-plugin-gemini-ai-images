/**
 * Request helpers shared by the generation hooks.
 */

export interface GenerationRequestBody {
  prompt: string
  model?: string
  aspectRatio?: string
  imageSize?: string
  mode: 'generate' | 'edit'
  baseImage?: string
  baseImageMimeType?: string
  series?: {
    quantity: number
    consistencyPrompt: string
    variations: string[]
  }
}

export async function postGeneration<T>(
  apiEndpoint: string,
  body: GenerationRequestBody,
  options: {apiKey?: string; signal?: AbortSignal; fallbackError: string},
): Promise<T> {
  const headers: Record<string, string> = {'Content-Type': 'application/json'}
  if (options.apiKey) {
    headers['X-API-Key'] = options.apiKey
  }

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers,
    signal: options.signal,
    body: JSON.stringify(body),
  })

  // Gateways and timeouts often return HTML, so do not assume JSON
  const text = await response.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // fall through to the status based error below
  }

  if (!response.ok) {
    const message = data?.error || `${options.fallbackError} (HTTP ${response.status})`
    throw new Error(message)
  }
  if (!data) {
    throw new Error(`${options.fallbackError}: empty or invalid response from ${apiEndpoint}`)
  }
  return data as T
}

/** Read a File or Blob as base64 without the data URL prefix */
export function blobToBase64(blob: Blob): Promise<{data: string; mimeType: string}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      const [header, data] = typeof result === 'string' ? result.split(',') : []
      if (!data) {
        reject(new Error('Failed to read image data'))
        return
      }
      const mimeType = blob.type || header.match(/^data:([^;]+)/)?.[1] || 'image/png'
      resolve({data, mimeType})
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image data'))
    reader.readAsDataURL(blob)
  })
}
