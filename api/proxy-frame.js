import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { key } = req.query

  // Only allow frame paths to prevent this becoming an open proxy
  if (!key || !/^frames\/[^/]+\/\d+\.png$/.test(key)) {
    return res.status(400).json({ error: 'Invalid key' })
  }

  try {
    const { Body, ContentType } = await R2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    )

    res.setHeader('Content-Type', ContentType || 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

    const chunks = []
    for await (const chunk of Body) chunks.push(chunk)
    res.send(Buffer.concat(chunks))
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Failed to fetch frame' })
  }
}
