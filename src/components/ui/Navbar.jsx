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
      <nav className="flex items-center justify-between border-b border-violet-100 bg-white px-6 py-3 shadow-sm">
        <Link to="/" className="flex items-center gap-2">
          <img src="/flipus.png" alt="Flipus" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-violet-700"
          >
            Feed
          </Link>
          <Link
            to="/draw"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-violet-700"
          >
            Draw
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to={`/profile/${user.uid}`}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-violet-700"
              >
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-7 w-7 rounded-full ring-2 ring-violet-200"
                  />
                )}
                <span>{user.displayName}</span>
              </Link>
              <button
                onClick={() => signOut(auth)}
                className="text-sm text-gray-400 transition-colors hover:text-gray-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
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
