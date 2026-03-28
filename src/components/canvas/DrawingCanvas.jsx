import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

const DrawingCanvas = forwardRef(function DrawingCanvas({ tool, color, strokeSize }, ref) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef(null)

  useImperativeHandle(ref, () => ({
    getBlob: () =>
      new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png')),
    clear: () => {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, 500, 500)
    },
  }))

  // Fill canvas with white on mount
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 500, 500)
  }, [])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = 500 / rect.width
    const scaleY = 500 / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const floodFill = useCallback((startX, startY, fillColor) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, 500, 500)
    const data = imageData.data

    const toIndex = (x, y) => (y * 500 + x) * 4

    const startIdx = toIndex(Math.floor(startX), Math.floor(startY))
    const targetR = data[startIdx]
    const targetG = data[startIdx + 1]
    const targetB = data[startIdx + 2]
    const targetA = data[startIdx + 3]

    // Parse fill color hex to RGBA
    const hex = fillColor.replace('#', '')
    const fr = parseInt(hex.slice(0, 2), 16)
    const fg = parseInt(hex.slice(2, 4), 16)
    const fb = parseInt(hex.slice(4, 6), 16)

    if (targetR === fr && targetG === fg && targetB === fb && targetA === 255) return

    const stack = [[Math.floor(startX), Math.floor(startY)]]
    const visited = new Uint8Array(500 * 500)

    const matches = (idx) =>
      data[idx] === targetR &&
      data[idx + 1] === targetG &&
      data[idx + 2] === targetB &&
      data[idx + 3] === targetA

    while (stack.length) {
      const [x, y] = stack.pop()
      if (x < 0 || x >= 500 || y < 0 || y >= 500) continue
      const flatIdx = y * 500 + x
      if (visited[flatIdx]) continue
      const idx = flatIdx * 4
      if (!matches(idx)) continue

      visited[flatIdx] = 1
      data[idx] = fr
      data[idx + 1] = fg
      data[idx + 2] = fb
      data[idx + 3] = 255

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }

    ctx.putImageData(imageData, 0, 0)
  }, [])

  const startDrawing = useCallback((e) => {
    e.preventDefault()
    const pos = getPos(e)
    if (tool === 'fill') {
      floodFill(pos.x, pos.y, color)
      return
    }
    isDrawing.current = true
    lastPos.current = pos

    // Draw a dot on click
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, strokeSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.fill()
  }, [tool, color, strokeSize, floodFill])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = strokeSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPos.current = pos
  }, [tool, color, strokeSize])

  const stopDrawing = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      className="cursor-crosshair touch-none border border-gray-300"
      style={{ width: '500px', height: '500px', maxWidth: '100%' }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  )
})

export default DrawingCanvas
