import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3'

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { keys } = req.body

    if (!Array.isArray(keys) || keys.length === 0 || keys.length > 1000) {
      return res.status(400).json({ error: 'keys must be an array of 1–1000 entries' })
    }

    for (const key of keys) {
      if (!/^frames\/[^/]+\/\d+\.png$/.test(key)) {
        return res.status(400).json({ error: `Invalid key: ${key}` })
      }
    }

    await R2.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      })
    )

    return res.status(200).json({ deleted: keys.length })
  } catch (err) {
    console.error('Delete error:', err)
    return res.status(500).json({ error: 'Delete failed' })
  }
}
