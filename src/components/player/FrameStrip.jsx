export default function FrameStrip({ frames = [], currentIndex = 0, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto p-2">
      {frames.map((frame, i) => (
        <button
          key={frame.id}
          onClick={() => onSelect(i)}
          className={`shrink-0 rounded border-2 ${
            i === currentIndex ? 'border-black' : 'border-transparent'
          }`}
        >
          <img
            src={frame.url}
            alt={`Frame ${i + 1}`}
            className="h-16 w-16 object-contain bg-white"
          />
        </button>
      ))}
    </div>
  )
}
