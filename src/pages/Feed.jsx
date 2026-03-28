import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, increment, serverTimestamp, limit } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import FlipbookCard from '../components/feed/FlipbookCard'
import FlipbookCarousel from '../components/feed/FlipbookCarousel'

export default function Feed() {
  const { user } = useAuth()
  const [likedFlipbooks, setLikedFlipbooks] = useState([])
  const [recentFlipbooks, setRecentFlipbooks] = useState([])
  const [allFlipbooks, setAllFlipbooks] = useState([])
  const [loadingLiked, setLoadingLiked] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [loadingAll, setLoadingAll] = useState(false)
  const [likedIds, setLikedIds] = useState(new Set())
  const [userNames, setUserNames] = useState({})
  const [showAllPosts, setShowAllPosts] = useState(false)

  // Most liked (excludes flipbooks with no likeCount field — never-liked flipbooks)
  useEffect(() => {
    const q = query(collection(db, 'flipbooks'), orderBy('likeCount', 'desc'), limit(10))
    const unsubscribe = onSnapshot(q, (snap) => {
      setLikedFlipbooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoadingLiked(false)
    })
    return unsubscribe
  }, [])

  // Most recent
  useEffect(() => {
    const q = query(collection(db, 'flipbooks'), orderBy('createdAt', 'desc'), limit(10))
    const unsubscribe = onSnapshot(q, (snap) => {
      setRecentFlipbooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoadingRecent(false)
    })
    return unsubscribe
  }, [])

  // All posts — only fetch when user expands the section
  useEffect(() => {
    if (!showAllPosts) return
    setLoadingAll(true)
    const q = query(collection(db, 'flipbooks'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setAllFlipbooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoadingAll(false)
    })
    return unsubscribe
  }, [showAllPosts])

  useEffect(() => {
    if (!user) { setLikedIds(new Set()); return }
    const allIds = [...new Set([
      ...likedFlipbooks.map((f) => f.id),
      ...recentFlipbooks.map((f) => f.id),
      ...allFlipbooks.map((f) => f.id),
    ])]
    if (allIds.length === 0) return
    Promise.all(allIds.map((id) => getDoc(doc(db, 'flipbooks', id, 'likes', user.uid))))
      .then((snaps) => {
        const ids = new Set()
        snaps.forEach((s, i) => { if (s.exists()) ids.add(allIds[i]) })
        setLikedIds(ids)
      })
  }, [likedFlipbooks, recentFlipbooks, allFlipbooks, user])

  // Fetch display names for all unique creator UIDs.
  // Primary source: users/{uid} doc (written on sign-in).
  // Fallback: first frame's authorName (always present on existing flipbooks).
  useEffect(() => {
    const allFlipbookList = [...likedFlipbooks, ...recentFlipbooks, ...allFlipbooks]
    const uids = [...new Set(allFlipbookList.map((f) => f.createdBy).filter(Boolean))]
    const missingUids = uids.filter((uid) => !(uid in userNames))
    if (missingUids.length === 0) return
    Promise.all(missingUids.map((uid) => getDoc(doc(db, 'users', uid))))
      .then(async (snaps) => {
        const names = {}
        const fallbacks = []
        snaps.forEach((s, i) => {
          if (s.exists()) {
            names[missingUids[i]] = s.data().displayName
          } else {
            const flipbook = allFlipbookList.find((f) => f.createdBy === missingUids[i])
            if (flipbook) {
              fallbacks.push(
                getDocs(query(collection(db, 'flipbooks', flipbook.id, 'frames'), orderBy('order'), limit(1)))
                  .then((fSnap) => {
                    names[missingUids[i]] = fSnap.empty ? 'Anonymous' : (fSnap.docs[0].data().authorName || 'Anonymous')
                  })
              )
            } else {
              names[missingUids[i]] = 'Anonymous'
            }
          }
        })
        await Promise.all(fallbacks)
        setUserNames((prev) => ({ ...prev, ...names }))
      })
  }, [likedFlipbooks, recentFlipbooks, allFlipbooks])

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

  const withName = (fb) => ({ ...fb, createdByName: userNames[fb.createdBy] || fb.createdByName || '' })

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-10">
      <div className="flex items-center justify-between">
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

      <FlipbookCarousel
        title="Most Liked"
        flipbooks={likedFlipbooks.map(withName)}
        likedIds={likedIds}
        onLike={handleLike}
        loading={loadingLiked}
      />

      <FlipbookCarousel
        title="Most Recent"
        flipbooks={recentFlipbooks.map(withName)}
        likedIds={likedIds}
        onLike={handleLike}
        loading={loadingRecent}
      />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">All Posts</h2>
          {showAllPosts && (
            <button
              onClick={() => setShowAllPosts(false)}
              className="text-sm text-violet-500 hover:text-violet-700 transition-colors"
            >
              Hide
            </button>
          )}
        </div>
        {!showAllPosts && (
          <button
            onClick={() => setShowAllPosts(true)}
            className="w-full rounded-xl border border-violet-200 bg-violet-50 py-4 text-sm font-medium text-violet-600 transition hover:bg-violet-100"
          >
            Show All Posts
          </button>
        )}
        {showAllPosts && (
          loadingAll ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-violet-100" />
              ))}
            </div>
          ) : allFlipbooks.length === 0 ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-12 text-center">
              <p className="text-gray-500">No flipbooks yet. Be the first to create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allFlipbooks.map((fb) => (
                <Link key={fb.id} to={`/flipbook/${fb.id}`}>
                  <FlipbookCard flipbook={withName(fb)} liked={likedIds.has(fb.id)} onLike={(e) => handleLike(e, fb)} />
                </Link>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  )
}
