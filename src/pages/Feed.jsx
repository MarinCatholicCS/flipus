import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import FlipbookCard from '../components/feed/FlipbookCard'

export default function Feed() {
  const [flipbooks, setFlipbooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'flipbooks'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setFlipbooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
          <p className="mt-1 text-sm text-gray-500">Explore flipbooks from the community</p>
        </div>
        <Link
          to="/draw"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
        >
          + New Flipbook
        </Link>
      </div>
      {flipbooks.length === 0 ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-12 text-center">
          <p className="text-gray-500">No flipbooks yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flipbooks.map((fb) => (
            <Link key={fb.id} to={`/flipbook/${fb.id}`}>
              <FlipbookCard flipbook={fb} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
