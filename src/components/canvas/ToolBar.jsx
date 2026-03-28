const TOOLS = [
  { id: 'pen', label: 'Pen', icon: '✏️' },
  { id: 'eraser', label: 'Eraser', icon: '⬜' },
  { id: 'fill', label: 'Fill', icon: '🪣' },
]

export default function ToolBar({ tool, setTool, color, setColor, strokeSize, setStrokeSize, onClear, showOnionSkin, setShowOnionSkin, hasOnionSkin, onPaintOnionSkin }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {/* Tool buttons */}
      <div className="flex gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              tool === t.id
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Color picker */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-gray-200"
        />
      </label>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Stroke size */}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        Size
        <input
          type="range"
          min={1}
          max={40}
          value={strokeSize}
          onChange={(e) => setStrokeSize(Number(e.target.value))}
          className="w-24"
        />
        <span className="w-5 text-center">{strokeSize}</span>
      </label>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Clear */}
      <button
        onClick={onClear}
        className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
      >
        Clear
      </button>

      {/* Onion skin controls */}
      {hasOnionSkin && (
        <>
          <div className="h-6 w-px bg-gray-300" />
          <button
            onClick={() => setShowOnionSkin((v) => !v)}
            title="Toggle onion skin overlay"
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              showOnionSkin
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            👁 Onion
          </button>
          <button
            onClick={onPaintOnionSkin}
            title="Paint previous frame onto canvas"
            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            🖼 Stamp
          </button>
        </>
      )}
    </div>
  )
}
