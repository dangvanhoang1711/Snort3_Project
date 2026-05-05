const express = require('express')
const router = express.Router()
const alertsRouter = require('./alerts')
const { handlers } = require('./alerts')
const apiKeyAuth = require('../middleware/auth')
const rateLimit = require('express-rate-limit')
const config = require('../config')

const ingestRateLimiter = rateLimit({
  windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(config.RATE_LIMIT_MAX || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
})

router.use('/logs', alertsRouter)

// Add new stats endpoints for dashboard overview/trend
const { getStats } = require('../models/alerts')
router.get('/stats/overview', async (req, res) => {
  try {
    const db = require('../db').getDb()

    // Tổng cảnh báo (tất cả alerts trong DB)
    const total = await db.get(`SELECT COUNT(*) as c FROM alerts`)

    // Tổng tấn công hôm nay - CHỈ tính drop và alert (2 action chính thức của Snort3)
    const todayAttacks = await db.get(`SELECT COUNT(*) as c FROM alerts WHERE date(created_at)=date('now') AND action = 'drop'`)

    // Tổng alerts hôm nay (bao gồm cả alert - phát hiện nhưng không chặn)
    const todayAlerts = await db.get(`SELECT COUNT(*) as c FROM alerts WHERE date(created_at)=date('now') AND action IN ('drop', 'alert')`)

    // Hôm qua - tấn công
    const yesterdayAttacks = await db.get(`SELECT COUNT(*) as c FROM alerts WHERE date(created_at)=date('now','-1 day') AND action = 'drop'`)

    // IP tấn công hôm nay (unique src_ip có action = drop)
    const bySrc = await db.all(`SELECT src_ip, COUNT(*) as c FROM alerts WHERE date(created_at)=date('now') AND action = 'drop' GROUP BY src_ip ORDER BY c DESC`)

    // Tổng rules Snort3 (giả lập - trong thực tế nên đọc từ snort.conf)
    const totalRules = 15

    // Tính % so với hôm qua (dựa trên attacks thực sự = drop)
    let pct = 0
    if (yesterdayAttacks && yesterdayAttacks.c > 0) {
      pct = Math.round(((todayAttacks.c - yesterdayAttacks.c) / yesterdayAttacks.c) * 100)
    }

    res.json({
      total: total.c,
      today: todayAttacks.c,        // Tổng tấn công bị chặn (drop)
      today_alerts: todayAlerts.c,  // Tổng alerts (drop + alert)
      yesterday: yesterdayAttacks.c,
      percent_change: pct,
      attacker_ips: bySrc.length,
      active_rules: totalRules,
      total_rules: totalRules
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})


// Support POST /api/ingest that accepts the same payload as POST /api/logs
router.post('/ingest', express.text({ type: ['text/*', 'application/octet-stream'], limit: '1mb' }), apiKeyAuth, ingestRateLimiter, (req, res, next) => {
  // reuse the ingestHandler
  handlers.ingestHandler(req, res, next)
})

// Expose /api/stats as well
router.get('/stats', handlers.statsHandler)

// API lấy dữ liệu theo giờ cho Line Chart (24 giờ)
router.get('/stats/hourly', async (req, res) => {
  try {
    const db = require('../db').getDb()
    const results = []
    
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0')
      const row = await db.get(
        `SELECT COUNT(*) as count FROM alerts WHERE timestamp LIKE ?`,
        [`%${hour}:%`]
      )
      results.push({ hour: `${hour}:00`, count: row?.count || 0 })
    }
    
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

module.exports = router
// SSE stream endpoint (fallback if websockets not available)
const realtime = require('../realtime')

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders && res.flushHeaders()

  const onAlert = (data) => {
    try {
      res.write(`event: alert\ndata: ${JSON.stringify(data)}\n\n`)
    } catch (e) {
      // ignore
    }
  }

  realtime.emitter.on('alert:new', onAlert)

  req.on('close', () => {
    realtime.emitter.removeListener('alert:new', onAlert)
  })
})
