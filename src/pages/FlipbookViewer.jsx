import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFlipbook } from '../hooks/useFlipbook'
import { useFrames } from '../hooks/useFrames'
import FlipbookPlayer from '../components/player/FlipbookPlayer'
import FrameStrip from '../components/player/FrameStrip'

export default function FlipbookViewer() {
  const { id } = useParams()
  const { flipbook, loading: loadingFlipbook } = useFlipbook(id)
  const { frames, loading: loadingFrames } = useFrames(id)
  const [currentIndex, setCurrentIndex] = useState(0)

  if (loadingFlipbook || loadingFrames) {
    return <div className="p-6 text-gray-500">Loading...</div>
  }

  if (!flipbook) {
    return <div className="p-6 text-gray-500">Flipbook not found.</div>
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex w-full max-w-[500px] items-center justify-between">
        <h1 className="text-2xl font-bold">{flipbook.title || 'Untitled Flipbook'}</h1>
        <Link
          to={`/draw/${id}`}
          className="rounded-lg bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          + Add Frame
        </Link>
      </div>
      <FlipbookPlayer frames={frames} currentIndex={currentIndex} onSelect={setCurrentIndex} />
      <FrameStrip frames={frames} currentIndex={currentIndex} onSelect={setCurrentIndex} />
    </div>
  )
}
