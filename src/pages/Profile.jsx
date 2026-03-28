import { useParams } from 'react-router-dom'

export default function Profile() {
  const { uid } = useParams()

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Profile</h1>
      <p className="text-gray-500">User: {uid}</p>
    </div>
  )
}
