import { useState } from 'react'

export default function FlipbookCard({ flipbook, liked = false, onLike }) {
  const [imgError, setImgError] = useState(false)
  const resolvedIndex = flipbook.thumbnailIndex ?? 0
  const thumbnailUrl = `/api/proxy-frame?key=frames/${flipbook.id}/${resolvedIndex}.png`

  return (
    <div className="rounded-xl border border-violet-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-violet-200">
      <div className="relative w-full aspect-square rounded-t-xl overflow-hidden bg-violet-50">
        {!imgError ? (
          <img
            src={thumbnailUrl}
            alt={flipbook.title || 'Untitled'}
            onError={() => setImgError(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-violet-200 text-sm">
            No preview
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{flipbook?.title || 'Untitled'}</h3>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-gray-400">by {flipbook?.createdByName || 'Anonymous'}</p>
          <button
            onClick={onLike}
            className={`flex items-center gap-1 text-xs transition-colors ${liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
          >
            <span>{liked ? '♥' : '♡'}</span>
            <span>{flipbook?.likeCount ?? 0}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
