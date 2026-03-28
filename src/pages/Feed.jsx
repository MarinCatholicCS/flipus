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

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Flipbook Feed</h1>
      {flipbooks.length === 0 ? (
        <p className="text-gray-500">No flipbooks yet. Be the first to create one!</p>
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
