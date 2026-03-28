import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      if (user) {
        setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || null,
        }, { merge: true })
      }
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
