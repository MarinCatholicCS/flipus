export default function FlipbookCard({ flipbook }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="font-semibold">{flipbook?.title || 'Untitled'}</h3>
    </div>
  )
}
