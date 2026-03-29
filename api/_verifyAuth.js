import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  })
}

export async function verifyAuth(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }
  const token = header.split('Bearer ')[1]
  return admin.auth().verifyIdToken(token)
}
