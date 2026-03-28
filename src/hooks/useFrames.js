import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useFrames(flipbookId) {
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!flipbookId) return

    const q = query(
      collection(db, 'flipbooks', flipbookId, 'frames'),
      orderBy('order')
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      setFrames(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return unsubscribe
  }, [flipbookId])

  return { frames, loading }
}
