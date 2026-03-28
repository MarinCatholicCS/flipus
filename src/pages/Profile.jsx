import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import FlipbookCard from '../components/feed/FlipbookCard'

export default function Profile() {
  const { uid } = useParams()
  const { user } = useAuth()
  const [flipbooks, setFlipbooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(
      collection(db, 'flipbooks'),
      where('createdBy', '==', uid)
    )
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setFlipbooks(docs)
      setLoading(false)
    })
    return unsubscribe
  }, [uid])

  const displayName = user?.uid === uid ? user.displayName : null

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">{displayName ?? 'Profile'}</h1>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : flipbooks.length === 0 ? (
        <p className="text-gray-500">No flipbooks yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
