import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { verifyAuth } from './_verifyAuth.js'

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME
const PUBLIC_URL = process.env.R2_PUBLIC_URL

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await verifyAuth(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { flipbookId, frameIndex, imageBase64 } = req.body

    if (!imageBase64 || imageBase64.length > 2_000_000) {
      return res.status(400).json({ error: 'Payload too large (max ~1.5 MB)' })
    }

    const buffer = Buffer.from(imageBase64, 'base64')
    const key = `frames/${flipbookId}/${frameIndex}.png`

    await R2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
      })
    )

    return res.status(200).json({ url: `${PUBLIC_URL}/${key}` })
  } catch (err) {
    console.error('Upload error:', err)
    return res.status(500).json({ error: 'Upload failed' })
  }
}
