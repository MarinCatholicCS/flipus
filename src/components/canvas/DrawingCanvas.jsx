import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'

const DrawingCanvas = forwardRef(function DrawingCanvas({ tool, color, strokeSize, onHistoryChange }, ref) {
  const canvasRef = useRef(null)
  const cursorRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef(null)
  const history = useRef([])

  const saveSnapshot = useCallback(() => {
    const ctx = canvasRef.current.getContext('2d')
    const snapshot = ctx.getImageData(0, 0, 500, 500)
    history.current.push(snapshot)
    if (history.current.length > 20) {
      history.current.shift()
    }
    onHistoryChange?.(history.current.length > 0)
  }, [onHistoryChange])

  useImperativeHandle(ref, () => ({
    getBlob: () =>
      new Promise((resolve) => {
        const tmp = document.createElement('canvas')
        tmp.width = 500
        tmp.height = 500
        const tmpCtx = tmp.getContext('2d')
        tmpCtx.fillStyle = '#ffffff'
        tmpCtx.fillRect(0, 0, 500, 500)
        tmpCtx.drawImage(canvasRef.current, 0, 0)
        tmp.toBlob(resolve, 'image/png')
      }),
    clear: () => {
      saveSnapshot()
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, 500, 500)
    },
    paintOnionSkin: (imageUrl, opacity = 0.3, offset = { x: 0, y: 0 }) =>
      new Promise((resolve, reject) => {
        saveSnapshot()
        const img = new Image()
        img.onload = () => {
          const ctx = canvasRef.current.getContext('2d')
          const rect = canvasRef.current.getBoundingClientRect()
          const scaleX = rect.width > 0 ? 500 / rect.width : 1
          const scaleY = rect.height > 0 ? 500 / rect.height : 1
          const dx = (offset.x || 0) * scaleX
          const dy = (offset.y || 0) * scaleY
          ctx.save()
          ctx.globalAlpha = opacity
          ctx.drawImage(img, dx, dy, 500, 500)
          ctx.restore()
          resolve()
        }
        img.onerror = reject
        img.src = imageUrl
      }),
    undo: () => {
      if (history.current.length === 0) return
      const snapshot = history.current.pop()
      const ctx = canvasRef.current.getContext('2d')
      ctx.putImageData(snapshot, 0, 0)
      onHistoryChange?.(history.current.length > 0)
    },
    clearHistory: () => {
      history.current = []
      onHistoryChange?.(false)
    },
    reset: (imageUrl) => {
      history.current = []
      onHistoryChange?.(false)
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, 500, 500)
      if (!imageUrl) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => { ctx.drawImage(img, 0, 0, 500, 500); resolve() }
        img.onerror = reject
        img.src = imageUrl
      })
    },
  }), [saveSnapshot, onHistoryChange])

  // Canvas starts transparent — white background is provided by the parent container

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
    saveSnapshot()
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
  }, [tool, color, strokeSize, floodFill, saveSnapshot])

  const updateCursor = useCallback((e) => {
    if (e.touches || !cursorRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const scale = rect.width / 500
    const sizePx = Math.max(strokeSize * scale, 2)
    const el = cursorRef.current
    el.style.display = 'block'
    el.style.left = x + 'px'
    el.style.top = y + 'px'
    el.style.width = sizePx + 'px'
    el.style.height = sizePx + 'px'
    if (tool === 'eraser') {
      el.style.borderColor = '#9ca3af'
      el.style.backgroundColor = 'rgba(255,255,255,0.4)'
    } else {
      el.style.borderColor = color
      el.style.backgroundColor = tool === 'fill' ? 'transparent' : color + '40'
    }
  }, [tool, color, strokeSize])

  const draw = useCallback((e) => {
    e.preventDefault()
    updateCursor(e)
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
  }, [tool, color, strokeSize, updateCursor])

  const stopDrawing = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
  }, [])

  const handleMouseLeave = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
    if (cursorRef.current) cursorRef.current.style.display = 'none'
  }, [])

  return (
    <div
      style={{ position: 'relative', width: '500px', maxWidth: '100%', display: 'block' }}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="touch-none rounded-lg border border-violet-200"
        style={{ width: '500px', maxWidth: '100%', cursor: 'none', display: 'block', position: 'relative', zIndex: 2 }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div
        ref={cursorRef}
        style={{
          display: 'none',
          position: 'absolute',
          borderRadius: '50%',
          border: '1.5px solid black',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
        }}
      />
    </div>
  )
})

export default DrawingCanvas
