export default function FPSInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-gray-400 font-medium">FPS</label>
      <input
        type="number"
        min={1}
        max={60}
        value={value}
        onChange={(e) => {
          const v = Math.max(1, Math.min(60, Number(e.target.value)))
          if (!isNaN(v)) onChange(v)
        }}
        className="w-12 rounded-md border border-violet-200 px-1.5 py-0.5 text-center text-sm font-mono text-gray-700 focus:border-violet-400 focus:outline-none"
      />
    </div>
  )
}
