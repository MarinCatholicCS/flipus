export default function FrameStrip({ frames = [], currentIndex = 0, onSelect, isOwner, onDeleteFrame }) {
  return (
    <div className="flex gap-2 overflow-x-auto p-2">
      {frames.map((frame, i) => (
        <div key={frame.id} className="relative shrink-0">
          <button
            onClick={() => onSelect(i)}
            className={`block rounded border-2 ${
              i === currentIndex ? 'border-black' : 'border-transparent'
            }`}
          >
            <img
              src={frame.url}
              alt={`Frame ${i + 1}`}
              className="h-16 w-16 object-contain bg-white"
            />
          </button>
          {isOwner && (
            <button
              onClick={() => onDeleteFrame(frame, i)}
              title="Delete frame"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
