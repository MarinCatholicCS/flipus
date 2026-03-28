import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import AuthModal from './AuthModal'

export default function Navbar() {
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <Link to="/" className="text-xl font-bold">
          Flipus
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/draw" className="text-sm hover:underline">
            Draw
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link to={`/profile/${user.uid}`} className="flex items-center gap-2 text-sm">
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" />
                )}
                <span>{user.displayName}</span>
              </Link>
              <button
                onClick={() => signOut(auth)}
                className="text-sm text-gray-500 hover:underline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-lg bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  )
}
