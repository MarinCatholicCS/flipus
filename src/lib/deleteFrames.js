const API_URL = import.meta.env.VITE_API_URL || ''

export async function deleteFrames(keys) {
  try {
    const res = await fetch(`${API_URL}/api/delete-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    })
    if (!res.ok) {
      console.error('R2 delete failed:', res.statusText)
    }
  } catch (err) {
    console.error('R2 delete failed:', err)
  }
}
