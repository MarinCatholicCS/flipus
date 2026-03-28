/**
 * Generates N pixel-blended tween frames between a previous frame and a new keyframe.
 * Returns blobs ordered from t=1/(count+1) to t=count/(count+1), ready to upload before the keyframe.
 */
export async function generateTweenBlobs(prevFrameUrl, currentBlob, count) {
  if (count <= 0) return []

  // Load the previous frame image once
  const prevImg = await loadImage(prevFrameUrl)

  // Create an object URL for the current blob and load it once
  const currObjUrl = URL.createObjectURL(currentBlob)
  let currImg
  try {
    currImg = await loadImage(currObjUrl)
  } finally {
    URL.revokeObjectURL(currObjUrl)
  }

  const blobs = []
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1)
    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 500
    const ctx = canvas.getContext('2d')

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 500, 500)

    // Previous frame at (1-t) opacity
    ctx.globalAlpha = 1 - t
    ctx.drawImage(prevImg, 0, 0, 500, 500)

    // Current frame at t opacity
    ctx.globalAlpha = t
    ctx.drawImage(currImg, 0, 0, 500, 500)

    ctx.globalAlpha = 1

    const blob = await canvasToBlob(canvas)
    blobs.push(blob)
  }

  return blobs
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to export canvas to blob'))
    }, 'image/png')
  })
}
