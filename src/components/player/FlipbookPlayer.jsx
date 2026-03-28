import { useState, useEffect, useRef } from 'react'
import FPSSlider from './FPSSlider'

export default function FlipbookPlayer({ frames = [], currentIndex = 0, onSelect }) {
  const [playing, setPlaying] = useState(false)
  const [fps, setFps] = useState(12)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (playing && frames.length > 1) {
      intervalRef.current = setInterval(() => {
        onSelect((prev) => (prev + 1) % frames.length)
      }, 1000 / fps)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, fps, frames.length, onSelect])

  if (frames.length === 0) {
    return (
      <div className="flex h-[500px] w-[500px] items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400">
        No frames yet
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={frames[currentIndex]?.url}
        alt={`Frame ${currentIndex + 1}`}
        className="h-[500px] w-[500px] rounded border border-gray-200 bg-white object-contain"
      />
      <div className="flex items-center gap-4">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-lg bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <FPSSlider value={fps} onChange={setFps} />
        <span className="text-sm text-gray-500">{fps} FPS</span>
      </div>
    </div>
  )
}
