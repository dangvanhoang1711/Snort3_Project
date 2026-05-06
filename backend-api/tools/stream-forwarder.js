#!/usr/bin/env node
const fs = require('fs')
const readline = require('readline')
const axios = require('axios')
const EventEmitter = require('events')

const CONFIG = {
  API_URL: process.env.SNORT_API_URL || 'http://localhost:4000/api/ingest',
  API_KEY: process.env.API_KEY || 'dev-api-key-change-in-production',
  BATCH_INTERVAL: parseInt(process.env.SNORT_BATCH_INTERVAL || '100', 10),
  MAX_QUEUE_SIZE: parseInt(process.env.SNORT_MAX_QUEUE_SIZE || '10000', 10),
  MAX_BATCH_SIZE: parseInt(process.env.SNORT_MAX_BATCH_SIZE || '500', 10),
  TIME_BUCKET_SECONDS: parseInt(process.env.SNORT_TIME_BUCKET || '60', 10),
  MAX_PER_SECOND: parseInt(process.env.SNORT_MAX_PER_SECOND || '100', 10),
  RETRY_DELAY: parseInt(process.env.SNORT_RETRY_DELAY || '1000', 10),
  MAX_RETRIES: parseInt(process.env.SNORT_MAX_RETRIES || '3', 10),
  BACKPRESSURE_DROP_LOW: process.env.SNORT_DROP_LOW_SEVERITY === 'true',
}

class LogQueue extends EventEmitter {
  constructor() {
    super()
    this.queue = []
    this.dedupMap = new Map()
    this.stats = {
      received: 0,
      deduped: 0,
      queued: 0,
      emitted: 0,
      dropped: 0,
    }
    this.lastFlush = Date.now()
    this.processing = false
    this.backpressure = false
  }

  getFingerprint(alert) {
    const timeBucket = Math.floor(Date.now() / 1000 / CONFIG.TIME_BUCKET_SECONDS) * CONFIG.TIME_BUCKET_SECONDS
    const dstPort = alert.dst_port || '0'
    return `${alert.src_ip}:${alert.dst_ip}:${dst_port}:${alert.attack_type}:${timeBucket}`
  }

  add(alert) {
    this.stats.received++

    const fp = this.getFingerprint(alert)
    
    if (this.dedupMap.has(fp)) {
      const entry = this.dedupMap.get(fp)
      entry.count++
      entry.last_seen = Date.now()
      this.stats.deduped++
      return { status: 'deduped', fp }
    }

    if (this.queue.length >= CONFIG.MAX_QUEUE_SIZE) {
      if (CONFIG.BACKPRESSURE_DROP_LOW && alert.severity === 'low') {
        this.stats.dropped++
        return { status: 'dropped', reason: 'backpressure_low' }
      }
      this.backpressure = true
      this.stats.dropped++
      return { status: 'dropped', reason: 'queue_full' }
    }

    const entry = {
      src_ip: alert.src_ip,
      dst_ip: alert.dst_ip,
      dst_port: alert.dst_port || null,
      attack_type: alert.attack_type,
      severity: alert.severity,
      action: alert.action,
      proto: alert.proto,
      count: 1,
      first_seen: Date.now(),
      last_seen: Date.now(),
      is_new: true,
    }

    this.dedupMap.set(fp, entry)
    this.queue.push(entry)
    this.stats.queued++

    return { status: 'queued', fp }
  }

  getBatch() {
    const now = Date.now()
    const elapsed = now - this.lastFlush

    if (elapsed < CONFIG.BATCH_INTERVAL && this.queue.length < CONFIG.MAX_BATCH_SIZE) {
      return null
    }

    if (this.queue.length === 0) {
      return null
    }

    const batch = this.queue.splice(0, Math.min(this.queue.length, CONFIG.MAX_BATCH_SIZE))
    this.lastFlush = now
    this.backpressure = false

    this.stats.emitted += batch.length

    return batch
  }

  getStats() {
    return {
      ...this.stats,
      queue_size: this.queue.length,
      dedup_size: this.dedupMap.size,
      backpressure: this.backpressure,
    }
  }
}

class StreamForwarder {
  constructor() {
    this.queue = new LogQueue()
    this.running = false
    this.rateLimiter = {
      count: 0,
      windowStart: Date.now(),
    }
  }

  async sendBatch(batch) {
    const payload = { data: batch.map(e => 
      `${e.src_ip},${e.dst_ip},${e.dst_port || ''},${e.attack_type},${e.severity},${e.action},${e.proto},${e.count}`
    ).join('\n') }

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post(CONFIG.API_URL, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.API_KEY,
          },
          timeout: 5000,
        })
        return response.data
      } catch (err) {
        if (attempt < CONFIG.MAX_RETRIES) {
          await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY))
        }
      }
    }
    throw new Error('API request failed after retries')
  }

  checkRateLimit() {
    const now = Date.now()
    if (now - this.rateLimiter.windowStart >= 1000) {
      this.rateLimiter.count = 0
      this.rateLimiter.windowStart = now
    }
    if (this.rateLimiter.count >= CONFIG.MAX_PER_SECOND) {
      return false
    }
    this.rateLimiter.count++
    return true
  }

  async processBatch() {
    if (this.queue.processing) return
    this.queue.processing = true

    try {
      const batch = this.queue.getBatch()
      if (!batch) {
        this.queue.processing = false
        return
      }

      if (!this.checkRateLimit()) {
        this.queue.queue.unshift(...batch)
        this.queue.processing = false
        return
      }

      await this.sendBatch(batch)
    } catch (err) {
      console.error('[ERROR] Batch failed:', err.message)
    } finally {
      this.queue.processing = false
    }
  }

  async processLine(line) {
    if (!line.trim()) return

    const parts = line.split(',')
    if (parts.length < 7) return

    const alert = {
      src_ip: parts[0]?.trim() || 'unknown',
      dst_ip: parts[1]?.trim() || 'unknown',
      dst_port: parts[2]?.trim() || null,
      attack_type: parts[3]?.trim() || 'Unknown',
      severity: parts[4]?.trim() || 'medium',
      action: parts[5]?.trim() || 'alert',
      proto: parts[6]?.trim() || 'TCP',
    }

    if (!alert.src_ip || alert.src_ip === 'unknown') return

    this.queue.add(alert)
  }

  async startStdin() {
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    })

    console.log('[INFO] Listening for Snort alerts on stdin...')

    for await (const line of rl) {
      await this.processLine(line)
    }
  }

  async startFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.error('[ERROR] Log file not found:', filePath)
      process.exit(1)
    }

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    })

    console.log('[INFO] Reading from file:', filePath)

    for await (const line of rl) {
      await this.processLine(line)
    }
  }

  async run() {
    this.running = true

    setInterval(async () => {
      await this.processBatch()
    }, CONFIG.BATCH_INTERVAL)

    setInterval(() => {
      const stats = this.queue.getStats()
      console.log('[STATS]', JSON.stringify(stats))
    }, 10000)

    const mode = process.env.SNORT_MODE || 'stdin'
    
    if (mode === 'file') {
      await this.startFile(process.env.SNORT_LOG_FILE || '/app/snort-logs/alert_csv.txt')
    } else {
      await this.startStdin()
    }
  }
}

const forwarder = new StreamForwarder()
forwarder.run().catch(err => {
  console.error('[FATAL]', err.message)
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('[INFO] Shutting down...')
  process.exit(0)
})