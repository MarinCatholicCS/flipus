import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

function apiDevPlugin(env) {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use('/api/upload-frame', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const { flipbookId, frameIndex, imageBase64 } = JSON.parse(body)

            const R2 = new S3Client({
              region: 'auto',
              endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
              },
            })

            const buffer = Buffer.from(imageBase64, 'base64')
            const key = `frames/${flipbookId}/${frameIndex}.png`

            await R2.send(
              new PutObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: 'image/png',
              })
            )

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ url: `${env.R2_PUBLIC_URL}/${key}` }))
          } catch (err) {
            console.error('Upload error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Upload failed' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), apiDevPlugin(env)],
  }
})
