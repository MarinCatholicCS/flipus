import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, setDoc, collection, onSnapshot, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useFlipbook } from '../hooks/useFlipbook'
import { useFrames } from '../hooks/useFrames'
import FlipbookPlayer from '../components/player/FlipbookPlayer'
import FrameStrip from '../components/player/FrameStrip'
import { deleteFrames } from '../lib/deleteFrames'
import { exportGif } from '../lib/exportGif'

export default function FlipbookViewer() {
  const { id } = useParams()
  const { user } = useAuth()
  const { flipbook, loading: loadingFlipbook } = useFlipbook(id)
  const { frames, loading: loadingFrames } = useFrames(id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [liked, setLiked] = useState(false)
  const [fps, setFps] = useState(4)
  const [gifProgress, setGifProgress] = useState(null)

  useEffect(() => {
    if (!id || !user) return
    return onSnapshot(collection(db, 'flipbooks', id, 'likes'), (snap) => {
      setLiked(snap.docs.some((d) => d.id === user.uid))
    })
  }, [id, user])

  if (loadingFlipbook || loadingFrames) {
    return (
      <div className="flex items-center justify-center p-16 text-gray-400">
        Loading...
      </div>
    )
  }

  if (!flipbook) {
    return (
      <div className="flex items-center justify-center p-16 text-gray-400">
        Flipbook not found.
      </div>
    )
  }

  const isOwner = user && user.uid === flipbook.createdBy

  const handleLike = async () => {
    if (!user) return
    const likeRef = doc(db, 'flipbooks', id, 'likes', user.uid)
    const flipbookRef = doc(db, 'flipbooks', id)
    if (liked) {
      await deleteDoc(likeRef)
      await updateDoc(flipbookRef, { likeCount: increment(-1) })
    } else {
      await setDoc(likeRef, { likedAt: serverTimestamp() })
      await updateDoc(flipbookRef, { likeCount: increment(1) })
    }
  }

  const handleSetThumbnail = async (index) => {
    await updateDoc(doc(db, 'flipbooks', id), { thumbnailIndex: index })
  }

  const handleDeleteFrame = async (frame, index) => {
    if (!confirm(`Delete frame ${index + 1}?`)) return
    await deleteDoc(doc(collection(db, 'flipbooks', id, 'frames'), frame.id))
    if (currentIndex >= frames.length - 1) setCurrentIndex(Math.max(0, frames.length - 2))
    // Best-effort R2 cleanup
    try {
      const key = new URL(frame.url).pathname.slice(1)
      if (key) {
        const token = await user.getIdToken()
        deleteFrames([key], token)
      }
    } catch { /* ignore malformed URLs */ }
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

  const handleDownloadGif = async () => {
    if (frames.length === 0) return
    setGifProgress(0)
    try {
      const blob = await exportGif(frames, fps, setGifProgress)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${flipbook.title || 'flipbook'}.gif`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('GIF export failed:', err)
      alert('Failed to export GIF. Please try again.')
    } finally {
      setGifProgress(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-[600px] flex-col items-center gap-5 px-6 py-8">
      <div className="flex w-full items-center justify-between gap-2">
        {editingTitle ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="flex-1 rounded-lg border border-violet-200 px-3 py-1 text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={saveTitle}
              disabled={savingTitle}
              className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {savingTitle ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEditing}
              className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {flipbook.title || 'Untitled Flipbook'}
            </h1>
            {isOwner && (
              <button
                onClick={startEditing}
                title="Edit title"
                className="rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-700"
              >
                Edit
              </button>
            )}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleLike}
            disabled={!user}
            title={user ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              liked
                ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
                : 'border-gray-200 bg-white text-gray-500 hover:border-rose-200 hover:text-rose-400'
            } disabled:opacity-40`}
          >
            <span>{liked ? '♥' : '♡'}</span>
            <span>{flipbook.likeCount ?? 0}</span>
          </button>
          <button
            onClick={handleDownloadGif}
            disabled={gifProgress !== null || frames.length === 0}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-violet-200 hover:text-violet-600 disabled:opacity-40"
          >
            {gifProgress !== null
              ? `Exporting… ${Math.round(gifProgress * 100)}%`
              : 'Download GIF'}
          </button>
          <Link
            to={`/draw/${id}`}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
          >
            + Add Frame
          </Link>
        </div>
      </div>
      <FlipbookPlayer frames={frames} currentIndex={currentIndex} onSelect={setCurrentIndex} fps={fps} onFpsChange={setFps} />
      <div className="w-full rounded-xl border border-violet-100 bg-white shadow-sm">
        <FrameStrip
          frames={frames}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          isOwner={isOwner}
          onDeleteFrame={handleDeleteFrame}
          thumbnailIndex={flipbook.thumbnailIndex ?? 0}
          onSetThumbnail={handleSetThumbnail}
        />
      </div>
    </div>
  )
}
