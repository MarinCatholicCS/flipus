import { useRef, useState, useEffect, useCallback } from 'react'
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
  const [onionOffset, setOnionOffset] = useState({ x: 0, y: 0 })
  const onionDragStart = useRef(null)

  // Draft session: array of { blob, previewUrl }
  const [draftFrames, setDraftFrames] = useState([{ blob: null, previewUrl: null }])
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0)

  // Onion source selection: tracked by frame id (stable across re-renders/Firestore pushes)
  const [selectedOnionId, setSelectedOnionId] = useState(null)

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

  // Derive selected index from id — immune to index shifts from Firestore pushes
  const selectedOnionIndex = selectedOnionId
    ? onionSources.findIndex((s) => s.id === selectedOnionId)
    : -1

  const onionFrameUrl =
    selectedOnionIndex >= 0 ? onionSources[selectedOnionIndex].url : null

  // Auto-select the last onion source whenever sources become available or selection becomes invalid
  useEffect(() => {
    if (onionSources.length > 0 && selectedOnionIndex === -1) {
      setSelectedOnionId(onionSources[onionSources.length - 1].id)
    } else if (onionSources.length === 0 && selectedOnionId !== null) {
      setSelectedOnionId(null)
    }
  }, [onionSources.length, selectedOnionIndex, selectedOnionId])

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

  // Resets the onion selection to the last available source given a frames snapshot and current index.
  // Uses id-based tracking so it stays correct even if previewFrames shifts.
  const resetOnionToLast = (frames, draftIndex) => {
    // Draft frames that precede current index
    const precedingDrafts = frames.slice(0, draftIndex).filter((d) => d.previewUrl)
    if (precedingDrafts.length > 0) {
      setSelectedOnionId(precedingDrafts[precedingDrafts.length - 1].previewUrl)
    } else if (previewFrames.length > 0) {
      setSelectedOnionId(previewFrames[previewFrames.length - 1].id)
    } else {
      setSelectedOnionId(null)
    }
  }

  const navigateToDraft = async (newIndex) => {
    if (newIndex === currentDraftIndex) return
    const { updatedFrames } = await saveCurrentDraft()
    setCurrentDraftIndex(newIndex)
    await canvasRef.current.reset(updatedFrames[newIndex]?.previewUrl ?? undefined)
    resetOnionToLast(updatedFrames, newIndex)
    setOnionOffset({ x: 0, y: 0 })
    if (tool === 'onionMove') setTool('pen')
  }

  const addNewDraft = async () => {
    const { updatedFrames } = await saveCurrentDraft()
    const newFrames = [...updatedFrames, { blob: null, previewUrl: null }]
    const newIndex = newFrames.length - 1
    setDraftFrames(newFrames)
    setCurrentDraftIndex(newIndex)
    await canvasRef.current.reset()
    resetOnionToLast(updatedFrames, newIndex)
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
    resetOnionToLast(newFrames, newCurrentIndex)
  }

  const handleClear = () => canvasRef.current?.clear()
  const handleUndo = () => canvasRef.current?.undo()

  const handlePaintOnionSkin = () => {
    if (!onionFrameUrl) return
    canvasRef.current?.paintOnionSkin(onionFrameUrl, 1, onionOffset)
  }

  const handleOnionDragStart = useCallback((e) => {
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    onionDragStart.current = { clientX, clientY, offsetX: onionOffset.x, offsetY: onionOffset.y }
  }, [onionOffset])

  const handleOnionDragMove = useCallback((e) => {
    if (!onionDragStart.current) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setOnionOffset({
      x: onionDragStart.current.offsetX + (clientX - onionDragStart.current.clientX),
      y: onionDragStart.current.offsetY + (clientY - onionDragStart.current.clientY),
    })
  }, [])

  const handleOnionDragEnd = useCallback(() => {
    onionDragStart.current = null
  }, [])

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
          onResetOnionOffset={() => setOnionOffset({ x: 0, y: 0 })}
        />
      </div>

      <div
        className="relative rounded-xl shadow-md"
        style={{ width: '500px', maxWidth: '100%' }}
      >
        <div className="absolute inset-0 rounded-lg bg-white" style={{ zIndex: 0 }} />
        <OnionSkin imageUrl={onionFrameUrl} visible={showOnionSkin} offset={onionOffset} />
        {tool === 'onionMove' && showOnionSkin && onionFrameUrl && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 3, cursor: 'grab' }}
            onMouseDown={handleOnionDragStart}
            onMouseMove={handleOnionDragMove}
            onMouseUp={handleOnionDragEnd}
            onMouseLeave={handleOnionDragEnd}
            onTouchStart={handleOnionDragStart}
            onTouchMove={handleOnionDragMove}
            onTouchEnd={handleOnionDragEnd}
          />
        )}
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
                  onClick={() => setSelectedOnionId(src.id)}
                  className={`overflow-hidden rounded-lg border-2 block transition-all ${
                    selectedOnionId === src.id
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
