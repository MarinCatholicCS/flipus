import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import FlipbookCard from '../components/feed/FlipbookCard'

export default function Feed() {
  const { user } = useAuth()
  const [flipbooks, setFlipbooks] = useState([])
  const [likedIds, setLikedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'flipbooks'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setFlipbooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user || flipbooks.length === 0) { setLikedIds(new Set()); return }
    Promise.all(
      flipbooks.map((fb) => getDoc(doc(db, 'flipbooks', fb.id, 'likes', user.uid)))
    ).then((snaps) => {
      const ids = new Set()
      snaps.forEach((s, i) => { if (s.exists()) ids.add(flipbooks[i].id) })
      setLikedIds(ids)
    })
  }, [flipbooks, user])

  const handleLike = async (e, fb) => {
    e.preventDefault()
    if (!user) return
    const isLiked = likedIds.has(fb.id)
    setLikedIds((prev) => {
      const next = new Set(prev)
      isLiked ? next.delete(fb.id) : next.add(fb.id)
      return next
    })
    const likeRef = doc(db, 'flipbooks', fb.id, 'likes', user.uid)
    const flipbookRef = doc(db, 'flipbooks', fb.id)
    if (isLiked) {
      await deleteDoc(likeRef)
      await updateDoc(flipbookRef, { likeCount: increment(-1) })
    } else {
      await setDoc(likeRef, { likedAt: serverTimestamp() })
      await updateDoc(flipbookRef, { likeCount: increment(1) })
    }
  }

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
              <FlipbookCard flipbook={fb} liked={likedIds.has(fb.id)} onLike={(e) => handleLike(e, fb)} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
