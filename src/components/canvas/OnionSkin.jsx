export default function OnionSkin({ imageUrl, visible, offset = { x: 0, y: 0 } }) {
  if (!imageUrl || !visible) return null

  return (
    <img
      src={imageUrl}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      style={{
        opacity: 0.3,
        zIndex: 1,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
      draggable={false}
    />
  )
}
