import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useFlipbook(flipbookId) {
  const [flipbook, setFlipbook] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!flipbookId) return

    const unsubscribe = onSnapshot(doc(db, 'flipbooks', flipbookId), (snap) => {
      setFlipbook(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setLoading(false)
    })
    return unsubscribe
  }, [flipbookId])

  return { flipbook, loading }
}
