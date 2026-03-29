const TOOLS = [
  { id: 'pen', label: 'Pen' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'fill', label: 'Fill' },
]

export default function ToolBar({ tool, setTool, color, setColor, strokeSize, setStrokeSize, onClear, onUndo, canUndo, showOnionSkin, setShowOnionSkin, hasOnionSkin, onPaintOnionSkin, onResetOnionOffset }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
      {/* Tool buttons */}
      <div className="flex gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              tool === t.id
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-violet-100" />

      {/* Color picker */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded-md border border-violet-200"
        />
      </label>

      <div className="h-5 w-px bg-violet-100" />

      {/* Stroke size */}
      <label className="flex items-center gap-2 text-sm text-gray-600">
        Size
        <input
          type="range"
          min={1}
          max={40}
          value={strokeSize}
          onChange={(e) => setStrokeSize(Number(e.target.value))}
          className="w-24 accent-violet-600"
        />
        <span className="w-5 text-center text-xs font-mono text-gray-500">{strokeSize}</span>
      </label>

      <div className="h-5 w-px bg-violet-100" />

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Undo
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
      >
        Clear
      </button>

      {/* Onion skin controls */}
      {hasOnionSkin && (
        <>
          <div className="h-5 w-px bg-violet-100" />
          <button
            onClick={() => setShowOnionSkin((v) => !v)}
            title="Toggle onion skin overlay"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              showOnionSkin
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
            }`}
          >
            Onion
          </button>
          {showOnionSkin && (
            <>
              <button
                onClick={() => setTool('onionMove')}
                title="Drag onion skin to offset it"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  tool === 'onionMove'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                }`}
              >
                Move
              </button>
              {onResetOnionOffset && (
                <button
                  onClick={onResetOnionOffset}
                  title="Reset onion skin position"
                  className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-all"
                >
                  Reset
                </button>
              )}
            </>
          )}
          <button
            onClick={onPaintOnionSkin}
            title="Stamp previous frame onto canvas"
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-all"
          >
            Stamp
          </button>
        </>
      )}
    </div>
  )
}
