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

  // Preview panel state
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

  // Mini-player interval
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

  // Stop playing when panel is collapsed
  useEffect(() => {
    if (!previewOpen) setPreviewPlaying(false)
  }, [previewOpen])

  // Clamp index when frame count changes
  useEffect(() => {
    if (previewFrames.length > 0 && previewIndex >= previewFrames.length) {
      setPreviewIndex(previewFrames.length - 1)
    }
  }, [previewFrames.length, previewIndex])

  const handleClear = () => canvasRef.current?.clear()
  const handleUndo = () => canvasRef.current?.undo()

  const handlePaintOnionSkin = () => {
    if (!lastFrameUrl) return
    const match = lastFrameUrl.match(/(frames\/[^/]+\/\d+\.png)$/)
    const proxyUrl = match ? `/api/proxy-frame?key=${match[1]}` : lastFrameUrl
    canvasRef.current?.paintOnionSkin(proxyUrl, 1)
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

      // Create flipbook if this is a new one
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

      // Count existing frames to get next order index
      const framesSnap = await getDocs(
        query(collection(db, 'flipbooks', targetFlipbookId, 'frames'))
      )
      const frameIndex = framesSnap.size

      // Upload to R2
      const url = await uploadFrame(blob, targetFlipbookId, frameIndex)

      // Save frame metadata to Firestore
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
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold">
        {flipbookId ? 'Add a Frame' : 'New Flipbook'}
      </h1>

      {!flipbookId && (
        <input
          type="text"
          placeholder="Flipbook title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full max-w-[500px] rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      )}

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

      <div className="relative" style={{ width: '500px', maxWidth: '100%' }}>
        <OnionSkin imageUrl={lastFrameUrl} visible={showOnionSkin} />
        <DrawingCanvas
          ref={canvasRef}
          tool={tool}
          color={color}
          strokeSize={strokeSize}
          onHistoryChange={setCanUndo}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-lg bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Frame'}
      </button>

      {flipbookId && previewFrames.length > 0 && (
        <div className="w-full max-w-[500px]">
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span>Preview ({previewFrames.length} frame{previewFrames.length !== 1 ? 's' : ''})</span>
            <span>{previewOpen ? '▲' : '▼'}</span>
          </button>

          {previewOpen && (
            <div className="mt-2 flex flex-col items-center gap-3 rounded-lg border border-gray-200 p-3">
              <img
                src={previewFrames[previewIndex]?.url}
                alt={`Preview frame ${previewIndex + 1}`}
                style={{ width: '160px', height: '160px' }}
                className="rounded border border-gray-200 bg-white object-contain"
              />
              <button
                onClick={() => setPreviewPlaying((p) => !p)}
                className="rounded-lg bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800"
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
