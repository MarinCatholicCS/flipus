import { useState, useEffect, useRef } from 'react'
import FPSInput from './FPSSlider'

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
      <div className="flex h-[500px] w-[500px] items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-gray-400">
        No frames yet
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={frames[currentIndex]?.url}
        alt={`Frame ${currentIndex + 1}`}
        className="h-[500px] w-[500px] rounded-xl border border-violet-100 bg-white object-contain shadow-sm"
      />
      <div className="flex w-[500px] flex-col gap-2 rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
        {/* Flip slider */}
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={currentIndex}
          onChange={(e) => {
            if (playing) setPlaying(false)
            onSelect(Number(e.target.value))
          }}
          className="w-full accent-violet-600 cursor-grab active:cursor-grabbing"
          style={{ direction: 'ltr' }}
        />
        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <FPSInput value={fps} onChange={setFps} />
          </div>
          <span className="text-xs font-mono text-gray-400">
            {currentIndex + 1} / {frames.length}
          </span>
        </div>
      </div>
    </div>
  )
}
