export default function FrameStrip({ frames = [], currentIndex = 0, onSelect, isOwner, onDeleteFrame, thumbnailIndex = 0, onSetThumbnail }) {
  return (
    <div className="flex gap-2 overflow-x-auto p-2">
      {frames.map((frame, i) => (
        <div key={frame.id} className="relative shrink-0 flex flex-col items-center">
          <button
            onClick={() => onSelect(i)}
            className={`block rounded-lg border-2 transition-all ${
              i === currentIndex
                ? 'border-violet-500 shadow-sm shadow-violet-200'
                : 'border-transparent hover:border-violet-200'
            }`}
          >
            <img
              src={frame.url}
              alt={`Frame ${i + 1}`}
              className="h-16 w-16 rounded-md object-contain bg-white"
            />
          </button>
          {i === thumbnailIndex && (
            <span
              className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white"
              title="Current thumbnail"
            >
              ★
            </span>
          )}
          {isOwner && (
            <button
              onClick={() => onDeleteFrame(frame, i)}
              title="Delete frame"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white transition-colors hover:bg-red-600"
            >
              ×
            </button>
          )}
          <div className="flex items-center gap-1 max-w-[64px] mt-0.5">
            {frame.authorPhoto && (
              <img
                src={frame.authorPhoto}
                alt=""
                className="h-4 w-4 rounded-full object-cover shrink-0"
              />
            )}
            <span className="text-[10px] leading-tight truncate text-gray-400">
              {frame.authorName || 'Anonymous'}
            </span>
          </div>
          {isOwner && i !== thumbnailIndex && (
            <button
              onClick={() => onSetThumbnail(i)}
              title="Set as thumbnail"
              className="mt-0.5 text-[9px] text-violet-400 hover:text-violet-700 transition-colors"
            >
              Set cover
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
