import { GIFEncoder, quantize, applyPalette } from 'gifenc'

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function frameUrlToProxyUrl(url) {
  try {
    const path = new URL(url).pathname.slice(1)
    if (/^frames\/[^/]+\/\d+\.png$/.test(path)) {
      return `/api/proxy-frame?key=${encodeURIComponent(path)}`
    }
  } catch { /* ignore */ }
  return url
}

export async function exportGif(frames, fps, onProgress) {
  const size = 500
  const gif = GIFEncoder()
  const delay = Math.round(1000 / fps)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  for (let i = 0; i < frames.length; i++) {
    let img
    try {
      img = await loadImage(frames[i].url)
    } catch {
      img = await loadImage(frameUrlToProxyUrl(frames[i].url))
    }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)

    const imageData = ctx.getImageData(0, 0, size, size)
    const palette = quantize(imageData.data, 256)
    const index = applyPalette(imageData.data, palette)
    gif.writeFrame(index, size, size, { palette, delay })
    onProgress((i + 1) / frames.length)
  }

  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}
