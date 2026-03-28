import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { uploadFrame } from '../lib/uploadFrame'
import DrawingCanvas from '../components/canvas/DrawingCanvas'
import ToolBar from '../components/canvas/ToolBar'
import AuthModal from '../components/ui/AuthModal'

export default function DrawPage() {
  const { flipbookId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canvasRef = useRef(null)

  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#000000')
  const [strokeSize, setStrokeSize] = useState(4)
  const [submitting, setSubmitting] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [error, setError] = useState(null)

  const handleClear = () => canvasRef.current?.clear()

  const handleSubmit = async () => {
    if (!user) {
      setShowAuth(true)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const blob = await canvasRef.current.getBlob()

      // Create flipbook if this is a new one
      let targetFlipbookId = flipbookId
      if (!targetFlipbookId) {
        const flipbookRef = doc(collection(db, 'flipbooks'))
        await setDoc(flipbookRef, {
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          title: 'Untitled Flipbook',
        })
        targetFlipbookId = flipbookRef.id
      }

      // Count existing frames to get next order index
      const framesSnap = await getDocs(
        query(collection(db, 'flipbooks', targetFlipbookId, 'frames'))
      )
      const frameIndex = framesSnap.size

      // Upload to R2
      const url = await uploadFrame(blob, targetFlipbookId, frameIndex)

      // Save frame metadata to Firestore
      await addDoc(collection(db, 'flipbooks', targetFlipbookId, 'frames'), {
        url,
        order: frameIndex,
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        createdAt: serverTimestamp(),
      })

      navigate(`/flipbook/${targetFlipbookId}`)
    } catch (err) {
      console.error('Submit failed:', err)
      setError('Failed to submit frame. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold">
        {flipbookId ? 'Add a Frame' : 'New Flipbook'}
      </h1>

      <ToolBar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeSize={strokeSize}
        setStrokeSize={setStrokeSize}
        onClear={handleClear}
      />

      <DrawingCanvas
        ref={canvasRef}
        tool={tool}
        color={color}
        strokeSize={strokeSize}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-lg bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Frame'}
      </button>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}
