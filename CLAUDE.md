# Flipus

Collaborative online flipbook community where users draw frame-by-frame animations on a 500x500 canvas, stack them into flipbooks, and share them.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS v4
- **Auth & DB:** Firebase (Google sign-in, Firestore)
- **Storage:** Cloudflare R2 (S3-compatible, frame PNGs)
- **Deployment:** Vercel (SPA + serverless API routes)

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build

## Project Structure

```
src/
  components/
    canvas/      — DrawingCanvas, ToolBar, OnionSkin
    player/      — FlipbookPlayer, FPSSlider, FrameStrip
    feed/        — FlipbookCard
    ui/          — Navbar, AuthModal
  pages/         — Feed, FlipbookViewer, DrawPage, Profile
  lib/           — firebase.js, uploadFrame.js
  hooks/         — useAuth, useFlipbook, useFrames
api/
  upload-frame.js — Vercel serverless function for R2 uploads
```

## Conventions

- React components use `.jsx` extension
- Styling via Tailwind utility classes (no CSS modules)
- Firebase config loaded from env vars (`VITE_FIREBASE_*`)
- R2 credentials are server-side only (`R2_*` env vars)
- Firestore structure: `flipbooks/{id}` → `frames` subcollection (ordered by `order` field)
- Frame images uploaded as PNGs to R2 at `frames/{flipbookId}/{frameIndex}.png`
