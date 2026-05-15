import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import fs from 'fs'
import path from 'path'
import { config } from './config.js'
import { handleMiniMaxProxy } from './websocket/minimax-proxy.js'

const LOG_DIR = path.resolve(import.meta.dirname, '../logs')

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const app = express()
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// ── Frontend log receiver ──
app.post('/api/log', express.text({ type: '*/*' }), (req, res) => {
  const lines = req.body
  if (!lines) {
    return res.json({ ok: true })
  }

  try {
    const today = new Date().toISOString().slice(0, 10)
    const logFile = path.join(LOG_DIR, `frontend-${today}.log`)
    fs.appendFileSync(logFile, lines, 'utf8')
  } catch (e) {
    // Ignore write errors
  }

  res.json({ ok: true })
})

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  console.log('[BFF] Client connected')
  handleMiniMaxProxy(ws)
  ws.on('close', () => console.log('[BFF] Client disconnected'))
  ws.on('error', (err) => console.error('[BFF] Client error:', err.message))
})

server.listen(config.port, () => {
  console.log(`[BFF] Server running on http://localhost:${config.port}`)
  console.log(`[BFF] WebSocket proxy ready at ws://localhost:${config.port}/ws`)
})
