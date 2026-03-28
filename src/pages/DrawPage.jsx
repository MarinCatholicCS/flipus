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
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { uploadFrame } from '../lib/uploadFrame'
import { useFrames } from '../hooks/useFrames'
import DrawingCanvas from '../components/canvas/DrawingCanvas'
import ToolBar from '../components/canvas/ToolBar'
import OnionSkin from '../components/canvas/OnionSkin'
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
  // Track all created object URLs so we can revoke them on unmount
  const createdUrlsRef = useRef([])

  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [strokeSize, setStrokeSize] = useState(4)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [error, setError] = useState(null)
  const [showOnionSkin, setShowOnionSkin] = useState(true)
  const [canUndo, setCanUndo] = useState(false)

  // Draft session: array of { blob, previewUrl }
  const [draftFrames, setDraftFrames] = useState([{ blob: null, previewUrl: null }])
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0)

  // Onion source selection: indexes into onionSources
  const [selectedOnionIndex, setSelectedOnionIndex] = useState(-1)

  const { frames: previewFrames } = useFrames(flipbookId)

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // Combined onion sources: published frames + saved previous drafts
  // We compute this fresh every render from current state
  const onionSources = [
    ...previewFrames.map((f) => ({ url: getProxyUrl(f.url), id: f.id })),
    ...draftFrames
      .slice(0, currentDraftIndex)
      .filter((d) => d.previewUrl)
      .map((d) => ({ url: d.previewUrl, id: d.previewUrl })),
  ]

  const onionFrameUrl =
    selectedOnionIndex >= 0 && selectedOnionIndex < onionSources.length
      ? onionSources[selectedOnionIndex].url
      : null

  // Auto-select the last onion source whenever sources become available
  useEffect(() => {
    if (onionSources.length > 0 && selectedOnionIndex === -1) {
      setSelectedOnionIndex(onionSources.length - 1)
    }
  }, [onionSources.length, selectedOnionIndex])

  // Save current canvas to its draft slot; returns the updated frames array
  const saveCurrentDraft = async () => {
    const blob = await canvasRef.current.getBlob()
    const previewUrl = URL.createObjectURL(blob)
    createdUrlsRef.current.push(previewUrl)
    const updated = draftFrames.map((f, i) =>
      i === currentDraftIndex ? { blob, previewUrl } : f
    )
    setDraftFrames(updated)
    return { updatedFrames: updated }
  }

  const computeOnionIndex = (frames, draftIndex) => {
    const sources = [
      ...previewFrames,
      ...frames.slice(0, draftIndex).filter((d) => d.previewUrl),
    ]
    return sources.length > 0 ? sources.length - 1 : -1
  }

  const navigateToDraft = async (newIndex) => {
    if (newIndex === currentDraftIndex) return
    const { updatedFrames } = await saveCurrentDraft()
    setCurrentDraftIndex(newIndex)
    await canvasRef.current.reset(updatedFrames[newIndex]?.previewUrl ?? undefined)
    setSelectedOnionIndex(computeOnionIndex(updatedFrames, newIndex))
  }

  const addNewDraft = async () => {
    const { updatedFrames } = await saveCurrentDraft()
    const newFrames = [...updatedFrames, { blob: null, previewUrl: null }]
    const newIndex = newFrames.length - 1
    setDraftFrames(newFrames)
    setCurrentDraftIndex(newIndex)
    await canvasRef.current.reset()
    setSelectedOnionIndex(computeOnionIndex(updatedFrames, newIndex))
  }

  const deleteDraft = async (indexToDelete) => {
    if (draftFrames.length === 1) return

    const newFrames = draftFrames.filter((_, i) => i !== indexToDelete)
    let newCurrentIndex = currentDraftIndex

    if (indexToDelete === currentDraftIndex) {
      // Deleting the active frame — navigate to adjacent slot
      newCurrentIndex = Math.min(indexToDelete, newFrames.length - 1)
      await canvasRef.current.reset(newFrames[newCurrentIndex]?.previewUrl ?? undefined)
    } else if (indexToDelete < currentDraftIndex) {
      newCurrentIndex = currentDraftIndex - 1
    }

    setDraftFrames(newFrames)
    setCurrentDraftIndex(newCurrentIndex)
    setSelectedOnionIndex(computeOnionIndex(newFrames, newCurrentIndex))
  }

  const handleClear = () => canvasRef.current?.clear()
  const handleUndo = () => canvasRef.current?.undo()

  const handlePaintOnionSkin = () => {
    if (!onionFrameUrl) return
    canvasRef.current?.paintOnionSkin(onionFrameUrl, 1)
  }

  const handleSubmitAll = async () => {
    if (!user) {
      setShowAuth(true)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Capture current canvas as the final version of currentDraftIndex
      const blob = await canvasRef.current.getBlob()
      const finalDrafts = draftFrames.map((f, i) =>
        i === currentDraftIndex ? { ...f, blob } : f
      )

      let targetFlipbookId = flipbookId
      if (!targetFlipbookId) {
        const flipbookRef = doc(collection(db, 'flipbooks'))
        await setDoc(flipbookRef, {
          createdBy: user.uid,
          createdByName: user.displayName || 'Anonymous',
          createdAt: serverTimestamp(),
          title: title.trim() || 'Untitled Flipbook',
        })
        targetFlipbookId = flipbookRef.id
      }

      const framesSnap = await getDocs(
        query(collection(db, 'flipbooks', targetFlipbookId, 'frames'))
      )
      let frameIndex = framesSnap.size

      for (const draft of finalDrafts) {
        if (!draft.blob) continue
        const url = await uploadFrame(draft.blob, targetFlipbookId, frameIndex)
        await addDoc(collection(db, 'flipbooks', targetFlipbookId, 'frames'), {
          url,
          order: frameIndex,
          authorUid: user.uid,
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          createdAt: serverTimestamp(),
        })
        frameIndex++
      }

      navigate(`/flipbook/${targetFlipbookId}`)
    } catch (err) {
      console.error('Submit failed:', err)
      setError('Failed to publish frames. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const draftCount = draftFrames.length

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-5 px-4 py-8">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">
          {flipbookId ? 'Add Frames' : 'New Flipbook'}
        </h1>
        {!flipbookId && (
          <p className="mt-1 text-sm text-gray-500">Draw your frames, then publish when done</p>
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
          hasOnionSkin={onionSources.length > 0}
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
        <OnionSkin imageUrl={onionFrameUrl} visible={showOnionSkin} />
        <DrawingCanvas
          ref={canvasRef}
          tool={tool}
          color={color}
          strokeSize={strokeSize}
          onHistoryChange={setCanUndo}
        />
      </div>

      {/* Draft frame strip */}
      <div className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
        <p className="mb-2 text-xs font-medium text-gray-500">
          Editing frame {currentDraftIndex + 1} of {draftCount}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {draftFrames.map((frame, i) => (
            <div key={i} className="relative shrink-0 group">
              <button
                onClick={() => navigateToDraft(i)}
                className={`overflow-hidden rounded-lg border-2 block transition-all ${
                  currentDraftIndex === i
                    ? 'border-violet-500 ring-2 ring-violet-300'
                    : 'border-transparent hover:border-violet-300'
                }`}
              >
                {frame.previewUrl ? (
                  <img
                    src={frame.previewUrl}
                    alt={`Frame ${i + 1}`}
                    style={{ width: 56, height: 56 }}
                    className="bg-white object-contain"
                  />
                ) : (
                  <div
                    style={{ width: 56, height: 56 }}
                    className="bg-gray-50"
                  />
                )}
                {/* Frame number badge */}
                <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[10px] font-medium leading-none text-white">
                  {i + 1}
                </span>
              </button>
              {/* Delete button */}
              {draftFrames.length > 1 && (
                <button
                  onClick={() => deleteDraft(i)}
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addNewDraft}
            style={{ width: 56, height: 56 }}
            className="shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed border-violet-200 text-lg text-violet-400 transition-all hover:border-violet-400 hover:text-violet-600"
          >
            +
          </button>
        </div>
      </div>

      {/* Onion frame picker */}
      {onionSources.length > 1 && (
        <div className="w-full rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
          <p className="mb-2 text-xs font-medium text-gray-500">Onion frame</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {onionSources.map((src, i) => (
              <div key={src.id ?? i} className="relative shrink-0">
                <button
                  onClick={() => setSelectedOnionIndex(i)}
                  className={`overflow-hidden rounded-lg border-2 block transition-all ${
                    selectedOnionIndex === i
                      ? 'border-violet-500 ring-2 ring-violet-300'
                      : 'border-transparent hover:border-violet-300'
                  }`}
                >
                  <img
                    src={src.url}
                    alt={`Onion source ${i + 1}`}
                    style={{ width: 56, height: 56 }}
                    className="bg-white object-contain"
                  />
                </button>
                <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[10px] font-medium leading-none text-white">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="w-full rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmitAll}
        disabled={submitting}
        className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
      >
        {submitting
          ? 'Publishing...'
          : `Publish ${draftCount} frame${draftCount !== 1 ? 's' : ''}`}
      </button>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
