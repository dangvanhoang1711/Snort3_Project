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

    // Tổng cảnh báo (từ aggregated table - sum of counts)
    const totalAgg = await db.get(`SELECT SUM(count) as c FROM alerts_aggregated`)

    // Tổng tấn công hôm nay (từ aggregated - drop action)
    const todayStart = Math.floor(Date.now() / 86400000) * 86400000
    const todayAttacks = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND action = 'drop'`,
      [todayStart]
    )

    // Tổng alerts hôm nay (drop + alert)
    const todayAlerts = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND action IN ('drop', 'alert')`,
      [todayStart]
    )

    // Hôm qua - tấn công
    const yesterdayStart = todayStart - 86400000
    const yesterdayAttacks = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND last_seen < ? AND action = 'drop'`,
      [yesterdayStart, todayStart]
    )

    // IP tấn công hôm nay (unique src_ip)
    const bySrc = await db.all(
      `SELECT src_ip, SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND action = 'drop' GROUP BY src_ip ORDER BY c DESC`,
      [todayStart]
    )

    // Tổng rules - đếm từ aggregated
    const rulesCount = await db.get(`SELECT COUNT(DISTINCT attack_type) as c FROM alerts_aggregated`)
    const totalRules = rulesCount ? Math.max(rulesCount.c, 8) : 8

    // Tính % so với hôm qua
    const todayCount = todayAttacks?.c || 0
    const yesterdayCount = yesterdayAttacks?.c || 0
    let pct = 0
    if (yesterdayCount > 0) {
      pct = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
    }

    res.json({
      total: totalAgg?.c || 0,
      today: todayCount,
      today_alerts: todayAlerts?.c || 0,
      yesterday: yesterdayCount,
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
