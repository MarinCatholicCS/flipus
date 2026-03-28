export default function FPSSlider({ value, onChange }) {
  return (
    <input
      type="range"
      min={1}
      max={24}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-28 accent-violet-600"
    />
  )
}
