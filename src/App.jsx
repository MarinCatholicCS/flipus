import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/ui/Navbar'
import Feed from './pages/Feed'
import FlipbookViewer from './pages/FlipbookViewer'
import DrawPage from './pages/DrawPage'
import Profile from './pages/Profile'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-violet-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/flipbook/:id" element={<FlipbookViewer />} />
          <Route path="/draw/:flipbookId?" element={<DrawPage />} />
          <Route path="/profile/:uid" element={<Profile />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
