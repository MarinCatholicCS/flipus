export default function FlipbookCard({ flipbook }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-violet-200">
      <h3 className="font-semibold text-gray-900">{flipbook?.title || 'Untitled'}</h3>
      <p className="mt-1 text-xs text-gray-400">by {flipbook?.createdBy ? 'a creator' : 'Anonymous'}</p>
    </div>
  )
}
