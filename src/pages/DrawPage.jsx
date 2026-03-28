import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  getDocs,
  doc,
  setDoc,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { uploadFrame } from '../lib/uploadFrame'
import { useFrames } from '../hooks/useFrames'
import DrawingCanvas from '../components/canvas/DrawingCanvas'
import ToolBar from '../components/canvas/ToolBar'
import OnionSkin from '../components/canvas/OnionSkin'
import FrameStrip from '../components/player/FrameStrip'
import AuthModal from '../components/ui/AuthModal'

function getProxyUrl(rawUrl) {
  if (!rawUrl) return null
  const match = rawUrl.match(/(frames\/[^/]+\/\d+\.png)$/)
  return match ? `/api/proxy-frame?key=${match[1]}` : rawUrl
}

export default function DrawPage() {
  const { flipbookId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)

  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [strokeSize, setStrokeSize] = useState(4)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [error, setError] = useState(null)
  const [lastFrameUrl, setLastFrameUrl] = useState(null)
  const [showOnionSkin, setShowOnionSkin] = useState(true)
  const [canUndo, setCanUndo] = useState(false)
  const [startFromPrev, setStartFromPrev] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const { frames: previewFrames } = useFrames(flipbookId)

  useEffect(() => {
    if (!flipbookId) return
    getDocs(
      query(
        collection(db, 'flipbooks', flipbookId, 'frames'),
        orderBy('order', 'desc'),
        limit(1)
      )
    ).then((snap) => {
      if (!snap.empty) setLastFrameUrl(snap.docs[0].data().url)
    })
  }, [flipbookId])

  useEffect(() => {
    if (previewPlaying && previewFrames.length > 1) {
      intervalRef.current = setInterval(() => {
        setPreviewIndex((prev) => (prev + 1) % previewFrames.length)
      }, 1000 / 12)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [previewPlaying, previewFrames.length])

  useEffect(() => {
    if (!previewOpen) setPreviewPlaying(false)
  }, [previewOpen])

  useEffect(() => {
    if (previewFrames.length > 0 && previewIndex >= previewFrames.length) {
      setPreviewIndex(previewFrames.length - 1)
    }
  }, [previewFrames.length, previewIndex])

  // Stamp previous frame onto canvas when toggle is turned on
  useEffect(() => {
    if (!startFromPrev || !lastFrameUrl) return
    canvasRef.current?.paintOnionSkin(getProxyUrl(lastFrameUrl), 1)
      .then(() => canvasRef.current?.clearHistory())
      .catch(() => {})
  }, [startFromPrev, lastFrameUrl])

  const handleClear = () => canvasRef.current?.clear()
  const handleUndo = () => canvasRef.current?.undo()

  const handlePaintOnionSkin = () => {
    if (!lastFrameUrl) return
    canvasRef.current?.paintOnionSkin(getProxyUrl(lastFrameUrl), 1)
  }

  const handleSubmit = async () => {
    if (!user) {
      setShowAuth(true)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const blob = await canvasRef.current.getBlob()

      let targetFlipbookId = flipbookId
      if (!targetFlipbookId) {
        const flipbookRef = doc(collection(db, 'flipbooks'))
        await setDoc(flipbookRef, {
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          title: title.trim() || 'Untitled Flipbook',
        })
        targetFlipbookId = flipbookRef.id
      }

      const framesSnap = await getDocs(
        query(collection(db, 'flipbooks', targetFlipbookId, 'frames'))
      )
      const frameIndex = framesSnap.size

      const url = await uploadFrame(blob, targetFlipbookId, frameIndex)

      await addDoc(collection(db, 'flipbooks', targetFlipbookId, 'frames'), {
        url,
        order: frameIndex,
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        createdAt: serverTimestamp(),
      })

      navigate(`/flipbook/${targetFlipbookId}`)
    } catch (err) {
      console.error('Submit failed:', err)
      setError('Failed to submit frame. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-5 px-4 py-8">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">
          {flipbookId ? 'Add a Frame' : 'New Flipbook'}
        </h1>
        {!flipbookId && (
          <p className="mt-1 text-sm text-gray-500">Draw your first frame to get started</p>
        )}
      </div>

      {!flipbookId && (
        <input
          type="text"
          placeholder="Flipbook title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-violet-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      )}

      <div className="w-full">
        <ToolBar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          strokeSize={strokeSize}
          setStrokeSize={setStrokeSize}
          onClear={handleClear}
          onUndo={handleUndo}
          canUndo={canUndo}
          hasOnionSkin={!!lastFrameUrl}
          showOnionSkin={showOnionSkin}
          setShowOnionSkin={setShowOnionSkin}
          onPaintOnionSkin={handlePaintOnionSkin}
        />
      </div>

      <div
        className="relative rounded-xl shadow-md"
        style={{ width: '500px', maxWidth: '100%' }}
      >
        <div className="absolute inset-0 rounded-lg bg-white" style={{ zIndex: 0 }} />
        <OnionSkin imageUrl={getProxyUrl(lastFrameUrl)} visible={showOnionSkin} />
        <DrawingCanvas
          ref={canvasRef}
          tool={tool}
          color={color}
          strokeSize={strokeSize}
          onHistoryChange={setCanUndo}
        />
      </div>

      {/* Start from previous frame toggle */}
      {lastFrameUrl && (
        <div className="flex w-full items-center justify-between rounded-xl border border-violet-100 bg-white px-4 py-2.5 shadow-sm">
          <span className="text-sm text-gray-600">Start from previous frame</span>
          <button
            onClick={() => setStartFromPrev((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              startFromPrev
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
            }`}
          >
            {startFromPrev ? 'On' : 'Off'}
          </button>
        </div>
      )}

      {error && (
        <p className="w-full rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Frame'}
      </button>

      {flipbookId && previewFrames.length > 0 && (
        <div className="w-full">
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-violet-100 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-violet-50"
          >
            <span>Preview ({previewFrames.length} frame{previewFrames.length !== 1 ? 's' : ''})</span>
            <span className="text-gray-400">{previewOpen ? '▲' : '▼'}</span>
          </button>

          {previewOpen && (
            <div className="mt-2 flex flex-col items-center gap-3 rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
              <img
                src={previewFrames[previewIndex]?.url}
                alt={`Preview frame ${previewIndex + 1}`}
                style={{ width: '160px', height: '160px' }}
                className="rounded-lg border border-violet-100 bg-white object-contain shadow-sm"
              />
              <button
                onClick={() => setPreviewPlaying((p) => !p)}
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
              >
                {previewPlaying ? 'Pause' : 'Play'}
              </button>
              <FrameStrip
                frames={previewFrames}
                currentIndex={previewIndex}
                onSelect={(i) => { setPreviewPlaying(false); setPreviewIndex(i) }}
              />
            </div>
          )}
        </div>
      )}

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
