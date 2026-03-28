import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import FlipbookCard from './FlipbookCard'

export default function FlipbookCarousel({ title, flipbooks, likedIds, onLike, loading }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows)
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [flipbooks])

  const scroll = (dir) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">{title}</h2>
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-violet-600 transition hover:bg-violet-50"
          >
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-64 h-80 shrink-0 animate-pulse rounded-xl bg-violet-100" />
            ))
          ) : flipbooks.length === 0 ? (
            <div className="w-full rounded-xl border border-violet-100 bg-violet-50 p-6 text-center text-gray-500">
              Nothing here yet.
            </div>
          ) : (
            flipbooks.map((fb) => (
              <div key={fb.id} className="w-64 shrink-0">
                <Link to={`/flipbook/${fb.id}`}>
                  <FlipbookCard
                    flipbook={fb}
                    liked={likedIds.has(fb.id)}
                    onLike={(e) => onLike(e, fb)}
                  />
                </Link>
              </div>
            ))
          )}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-violet-600 transition hover:bg-violet-50"
          >
            ›
          </button>
        )}
      </div>
    </section>
  )
}
