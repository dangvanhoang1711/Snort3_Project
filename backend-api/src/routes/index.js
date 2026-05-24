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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    // Tổng tất cả events (bao gồm allow + drop - SOC logs everything)
    const totalAgg = await db.get(`SELECT SUM(count) as c FROM alerts_aggregated`)

    // Tổng tấn công hôm nay - CHỈ tính HIGH severity + DROP action (thực sự nguy hiểm)
    const todayAttacks = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND severity = 'high' AND action = 'drop'`,
      [todayStart]
    )

    // Tổng traffic hôm nay (tất cả events)
    const todayTraffic = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ?`,
      [todayStart]
    )

    // Allowed traffic hôm nay
    const todayAllowed = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND action = 'pass'`,
      [todayStart]
    )

    // Blocked traffic hôm nay
    const todayBlocked = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND action = 'drop'`,
      [todayStart]
    )

    // Hôm qua - tấn công
    const yesterdayStart = todayStart - 86400000
    const yesterdayAttacks = await db.get(
      `SELECT SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND last_seen < ? AND severity = 'high' AND action = 'drop'`,
      [yesterdayStart, todayStart]
    )

    // IP tấn công hôm nay (unique IPs với high severity attacks)
    const bySrc = await db.all(
      `SELECT src_ip, SUM(count) as c FROM alerts_aggregated WHERE last_seen >= ? AND severity = 'high' AND action = 'drop' GROUP BY src_ip ORDER BY c DESC`,
      [todayStart]
    )

    // Tổng rules
    const rulesCount = await db.get(`SELECT COUNT(DISTINCT attack_type) as c FROM alerts_aggregated WHERE severity = 'high'`)
    const totalRules = rulesCount ? Math.max(rulesCount.c, 7) : 7

    // Tính % so với hôm qua
    const todayCount = todayAttacks?.c || 0
    const yesterdayCount = yesterdayAttacks?.c || 0
    let pct = 0
    if (yesterdayCount > 0) {
      pct = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
    }

    res.json({
      total: totalAgg?.c || 0,                    // Tổng tất cả events (allow + drop)
      today: todayCount,                          // Tổng attacks (high + drop)
      today_alerts: todayTraffic?.c || 0,         // Tổng traffic hôm nay
      today_allowed: todayAllowed?.c || 0,        // Allowed traffic
      today_blocked: todayBlocked?.c || 0,       // Blocked traffic
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
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0)
    const currentHourStart = currentHour.getTime()
    
    for (let i = 0; i < 24; i++) {
      const hourStart = currentHourStart - (i * 3600000)
      const hourEnd = hourStart + 3600000
      const row = await db.get(
        `SELECT SUM(count) as count FROM alerts_aggregated WHERE last_seen >= ? AND last_seen < ?`,
        [hourStart, hourEnd]
      )
      const hourLabel = new Date(hourStart).getHours().toString().padStart(2, '0')
      results.unshift({ hour: `${hourLabel}:00`, count: row?.count || 0 })
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
