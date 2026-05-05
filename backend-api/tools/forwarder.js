#!/usr/bin/env node
/**
 * Robust forwarder: tail -F a snort alert file and batch POST to backend
 * Usage: node forwarder.js /var/log/snort/alert_csv.log http://backend:4000/api/logs YOUR_API_KEY
 */
const { spawn } = require('child_process')
const axios = require('axios')

const file = process.argv[2]
const backend = process.argv[3]
const apiKey = process.argv[4]

if (!file || !backend || !apiKey) {
  console.error('Usage: node forwarder.js <alert_file> <backend_url> <api_key>')
  process.exit(2)
}

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10)
const FLUSH_MS = parseInt(process.env.FLUSH_MS || '2000', 10)
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '5', 10)

let buffer = []
let flushTimer = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_MS)
}

async function flush() {
  if (buffer.length === 0) return
  const payload = buffer.join('\n')
  buffer = []
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await axios.post(backend, payload, {
        headers: { 'Content-Type': 'text/plain', 'x-api-key': apiKey },
        timeout: 10000,
      })
      return
    } catch (err) {
      const backoff = Math.min(30000, 2 ** attempt * 1000)
      console.error(`Forwarder: attempt ${attempt} failed, retrying in ${backoff}ms`, err.message)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  // if we get here, discard payload (optionally rotate to disk)
  console.error('Forwarder: dropping batch after max retries')
}

const t = spawn('tail', ['-F', file], { stdio: ['ignore', 'pipe', 'inherit'] })

t.stdout.setEncoding('utf8')
t.stdout.on('data', (chunk) => {
  const lines = chunk.split('\n').filter(Boolean)
  for (const l of lines) {
    buffer.push(l)
    if (buffer.length >= BATCH_SIZE) flush()
  }
  scheduleFlush()
})

t.on('error', (err) => {
  console.error('Tail process error', err)
  process.exit(1)
})

process.on('SIGINT', async () => {
  console.log('Shutting down forwarder, flushing...')
  await flush()
  process.exit(0)
})
