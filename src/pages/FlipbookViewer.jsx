import { useParams } from 'react-router-dom'

export default function FlipbookViewer() {
  const { id } = useParams()

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Flipbook {id}</h1>
    </div>
  )
}
