const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Uploads a frame PNG blob to Cloudflare R2 via the serverless API.
 * Returns the public URL of the uploaded frame.
 */
export async function uploadFrame(blob, flipbookId, frameIndex) {
  const arrayBuffer = await blob.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

  const res = await fetch(`${API_URL}/api/upload-frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flipbookId, frameIndex, imageBase64: base64 }),
  })

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`)
  }

  const { url } = await res.json()
  return url
}
