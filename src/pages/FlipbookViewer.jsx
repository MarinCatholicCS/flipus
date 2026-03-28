import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useFlipbook } from '../hooks/useFlipbook'
import { useFrames } from '../hooks/useFrames'
import FlipbookPlayer from '../components/player/FlipbookPlayer'
import FrameStrip from '../components/player/FrameStrip'

export default function FlipbookViewer() {
  const { id } = useParams()
  const { user } = useAuth()
  const { flipbook, loading: loadingFlipbook } = useFlipbook(id)
  const { frames, loading: loadingFrames } = useFrames(id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)

  if (loadingFlipbook || loadingFrames) {
    return <div className="p-6 text-gray-500">Loading...</div>
  }

  if (!flipbook) {
    return <div className="p-6 text-gray-500">Flipbook not found.</div>
  }

  const isOwner = user && user.uid === flipbook.createdBy

  const handleDeleteFrame = async (frame, index) => {
    if (!confirm(`Delete frame ${index + 1}?`)) return
    await deleteDoc(doc(collection(db, 'flipbooks', id, 'frames'), frame.id))
    // Keep currentIndex in bounds after deletion
    if (currentIndex >= frames.length - 1) setCurrentIndex(Math.max(0, frames.length - 2))
  }

  const startEditing = () => {
    setDraftTitle(flipbook.title || '')
    setEditingTitle(true)
  }

  const cancelEditing = () => setEditingTitle(false)

  const saveTitle = async () => {
    const trimmed = draftTitle.trim()
    if (!trimmed || trimmed === flipbook.title) {
      setEditingTitle(false)
      return
    }
    setSavingTitle(true)
    try {
      await updateDoc(doc(db, 'flipbooks', id), { title: trimmed })
    } finally {
      setSavingTitle(false)
      setEditingTitle(false)
    }
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') cancelEditing()
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex w-full max-w-[500px] items-center justify-between gap-2">
        {editingTitle ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={saveTitle}
              disabled={savingTitle}
              className="rounded-lg bg-black px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {savingTitle ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEditing}
              className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{flipbook.title || 'Untitled Flipbook'}</h1>
            {isOwner && (
              <button
                onClick={startEditing}
                title="Edit title"
                className="text-gray-400 hover:text-gray-700"
              >
                ✏️
              </button>
            )}
          </div>
        )}
        <Link
          to={`/draw/${id}`}
          className="shrink-0 rounded-lg bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          + Add Frame
        </Link>
      </div>
      <FlipbookPlayer frames={frames} currentIndex={currentIndex} onSelect={setCurrentIndex} />
      <FrameStrip
        frames={frames}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
        isOwner={isOwner}
        onDeleteFrame={handleDeleteFrame}
      />
    </div>
  )
}
