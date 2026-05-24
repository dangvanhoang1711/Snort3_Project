const fs = require('fs')
const path = require('path')
const axios = require('axios')

const CONFIG = {
  LOG_FILE: process.env.SNORT_LOG_FILE || '/app/snort-logs/alert_csv.txt',
  API_URL: process.env.SNORT_API_URL || 'http://localhost:4000/api/ingest',
  POLL_INTERVAL: parseInt(process.env.SNORT_POLL_INTERVAL || '2000', 10),
  BATCH_SIZE: parseInt(process.env.SNORT_BATCH_SIZE || '50', 10),
  MAX_PER_SECOND: parseInt(process.env.SNORT_MAX_PER_SECOND || '20', 10),
  POSITION_FILE: '/app/snort-logs/.forwarder_position',
  MAX_LINE_LENGTH: 4096,
  RETRY_DELAY: 5000,
  MAX_RETRIES: 3
}

const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args)
}

let lastPosition = 0
let fileSize = 0
let lastFileSize = 0
let consecutiveErrors = 0

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function loadPosition() {
  try {
    if (fs.existsSync(CONFIG.POSITION_FILE)) {
      const data = fs.readFileSync(CONFIG.POSITION_FILE, 'utf8').trim()
      const parts = data.split(':')
      lastPosition = parseInt(parts[0] || '0', 10)
      fileSize = parseInt(parts[1] || '0', 10)
      logger.info(`Loaded position: offset=${lastPosition}, fileSize=${fileSize}`)
    }
  } catch (err) {
    logger.warn('Failed to load position, starting from beginning')
    lastPosition = 0
    fileSize = 0
  }
}

function savePosition(offset, fsize) {
  try {
    fs.writeFileSync(CONFIG.POSITION_FILE, `${offset}:${fsize}`, 'utf8')
    lastPosition = offset
    fileSize = fsize
  } catch (err) {
    logger.error('Failed to save position', err.message)
  }
}

async function sendToApi(csvLines) {
  const payload = { data: csvLines.join('\n') }
  
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(CONFIG.API_URL, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || 'dev-api-key-change-in-production'
        },
        timeout: 10000
      })
      consecutiveErrors = 0
      return response.data
    } catch (err) {
      logger.error(`API attempt ${attempt}/${CONFIG.MAX_RETRIES} failed:`, err.message)
      if (attempt < CONFIG.MAX_RETRIES) {
        await sleep(CONFIG.RETRY_DELAY)
      }
    }
  }
  throw new Error('API request failed after retries')
}

function parseNewLines(content, fromPosition) {
  const lines = []
  let currentLine = ''
  let pos = fromPosition
  
  while (pos < content.length) {
    const char = content[pos]
    
    if (char === '\n') {
      if (currentLine.trim()) {
        lines.push(currentLine.trim())
      }
      currentLine = ''
      pos++
      if (lines.length >= CONFIG.BATCH_SIZE) {
        break
      }
    } else if (char === '\r') {
      pos++
    } else {
      if (currentLine.length < CONFIG.MAX_LINE_LENGTH) {
        currentLine += char
      }
      pos++
    }
  }
  
  if (currentLine.trim() && lines.length < CONFIG.BATCH_SIZE) {
    lines.push(currentLine.trim())
  }
  
  return { lines, newPosition: pos }
}

async function processFile() {
  try {
    if (!fs.existsSync(CONFIG.LOG_FILE)) {
      logger.warn(`Log file not found: ${CONFIG.LOG_FILE}`)
      return
    }

    const stats = fs.statSync(CONFIG.LOG_FILE)
    const currentFileSize = stats.size
    
    if (currentFileSize === 0) {
      logger.info('Log file is empty, waiting for data...')
      return
    }
    
    if (currentFileSize < fileSize) {
      logger.info('Log file was rotated/truncated, resetting position...')
      lastPosition = 0
      fileSize = 0
    }
    
    if (currentFileSize === lastPosition) {
      logger.debug('No new data, file unchanged')
      return
    }
    
    const content = fs.readFileSync(CONFIG.LOG_FILE, 'utf8')
    const { lines, newPosition } = parseNewLines(content, lastPosition)
    
    if (lines.length === 0) {
      logger.debug('No new complete lines to process')
      savePosition(newPosition, currentFileSize)
      return
    }
    
    logger.info(`Processing ${lines.length} new lines (file: ${currentFileSize}, pos: ${lastPosition}->${newPosition})`)
    
    const result = await sendToApi(lines)
    logger.info(`Sent to API: ${result.processed || 0} alerts processed, ${result.buffered || 0} buffered`)
    
    savePosition(newPosition, currentFileSize)
    lastFileSize = currentFileSize
    
  } catch (err) {
    consecutiveErrors++
    logger.error('Process error:', err.message)
    
    if (consecutiveErrors >= 5) {
      logger.error('Too many consecutive errors, waiting longer...')
      await sleep(CONFIG.POLL_INTERVAL * 3)
      consecutiveErrors = 0
    }
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║     Snort CSV Forwarder - Starting...            ║
╠══════════════════════════════════════════════════╣
║  Log File: ${CONFIG.LOG_FILE}
║  API URL:  ${CONFIG.API_URL}
║  Interval: ${CONFIG.POLL_INTERVAL}ms
╚══════════════════════════════════════════════════╝
  `)
  
  loadPosition()
  
  setInterval(async () => {
    await processFile()
  }, CONFIG.POLL_INTERVAL)
  
  await processFile()
  
  logger.info('Forwarder running, watching for new alerts...')
}

main().catch(err => {
  logger.error('Fatal error:', err.message)
  process.exit(1)
})
