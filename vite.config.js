import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'

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

function proxyFramePlugin(env) {
  return {
    name: 'proxy-frame',
    configureServer(server) {
      server.middlewares.use('/api/proxy-frame', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const key = url.searchParams.get('key')

        if (!key || !/^frames\/[^/]+\/\d+\.png$/.test(key)) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Invalid key' }))
          return
        }

        const R2 = new S3Client({
          region: 'auto',
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        })

        R2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }))
          .then(async ({ Body }) => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            const chunks = []
            for await (const chunk of Body) chunks.push(chunk)
            res.end(Buffer.concat(chunks))
          })
          .catch((err) => {
            console.error('Proxy error:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Failed to fetch frame' }))
          })
      })
    },
  }
}

function deleteFramePlugin(env) {
  return {
    name: 'delete-frame',
    configureServer(server) {
      server.middlewares.use('/api/delete-frame', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const { keys } = JSON.parse(body)

            if (!Array.isArray(keys) || keys.length === 0 || keys.length > 1000) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'keys must be an array of 1–1000 entries' }))
              return
            }

            for (const key of keys) {
              if (!/^frames\/[^/]+\/\d+\.png$/.test(key)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `Invalid key: ${key}` }))
                return
              }
            }

            const R2 = new S3Client({
              region: 'auto',
              endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
              },
            })

            await R2.send(
              new DeleteObjectsCommand({
                Bucket: env.R2_BUCKET_NAME,
                Delete: { Objects: keys.map((Key) => ({ Key })) },
              })
            )

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ deleted: keys.length }))
          } catch (err) {
            console.error('Delete error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Delete failed' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), apiDevPlugin(env), proxyFramePlugin(env), deleteFramePlugin(env)],
  }
})
