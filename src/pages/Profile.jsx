import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  collection,
  collectionGroup,
  query,
  where,
  onSnapshot,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import FlipbookCard from '../components/feed/FlipbookCard'

export default function Profile() {
  const { uid } = useParams()
  const { user } = useAuth()
  const [flipbooks, setFlipbooks] = useState([])
  const [frameCount, setFrameCount] = useState(0)
  const [profileName, setProfileName] = useState(null)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = user?.uid === uid

  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, 'flipbooks'), where('createdBy', '==', uid))
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setFlipbooks(docs)
      setLoading(false)
    })
    return unsubscribe
  }, [uid])

  useEffect(() => {
    if (!uid) return
    const q = query(collectionGroup(db, 'frames'), where('authorUid', '==', uid))
    const unsubscribe = onSnapshot(q, (snap) => {
      setFrameCount(snap.size)
      if (snap.size > 0 && !isOwnProfile) {
        const data = snap.docs[0].data()
        setProfileName(data.authorName ?? null)
        setProfilePhoto(data.authorPhoto ?? null)
      }
    })
    return unsubscribe
  }, [uid, isOwnProfile])

  const displayName = isOwnProfile ? user.displayName : profileName
  const photoURL = isOwnProfile ? user?.photoURL : profilePhoto
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const handleDeleteFlipbook = async (flipbookId) => {
    if (!confirm('Delete this flipbook and all its frames?')) return
    const framesSnap = await getDocs(collection(db, 'flipbooks', flipbookId, 'frames'))
    const batch = writeBatch(db)
    framesSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(db, 'flipbooks', flipbookId))
    await batch.commit()
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-5 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-violet-200"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-xl font-bold text-violet-600 ring-2 ring-violet-200">
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayName ?? 'User'}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            <span>
              <span className="font-semibold text-gray-700">{flipbooks.length}</span>{' '}
              flipbook{flipbooks.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-300">·</span>
            <span>
              <span className="font-semibold text-gray-700">{frameCount}</span>{' '}
              frame{frameCount !== 1 ? 's' : ''} contributed
            </span>
          </div>
        </div>
        {isOwnProfile && (
          <div className="ml-auto">
            <Link
              to="/draw"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
            >
              + New Flipbook
            </Link>
          </div>
        )}
      </div>

      {/* Flipbooks grid */}
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : flipbooks.length === 0 ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-12 text-center">
          <p className="text-gray-500">No flipbooks yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flipbooks.map((fb) => (
            <div key={fb.id} className="relative">
              <Link to={`/flipbook/${fb.id}`}>
                <FlipbookCard flipbook={fb} />
              </Link>
              {isOwnProfile && (
                <button
                  onClick={(e) => { e.preventDefault(); handleDeleteFlipbook(fb.id) }}
                  title="Delete flipbook"
                  className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
