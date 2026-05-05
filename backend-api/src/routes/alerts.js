const express = require('express')
const router = express.Router()
const { getAlerts, getStats, getAttackTypes } = require('../models/alerts')
const { ingestCsvPayload } = require('../services/ingest')
const logger = require('../utils/logger')
const apiKeyAuth = require('../middleware/auth')
const rateLimit = require('express-rate-limit')
const config = require('../config')

const ingestRateLimiter = rateLimit({
  windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(config.RATE_LIMIT_MAX || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
})

async function listAlertsHandler(req, res) {
  const limit = parseInt(req.query.limit || '20', 10)
  const offset = parseInt(req.query.offset || '0', 10)
  const search = req.query.search || ''
  const severity = req.query.severity || ''
  const action = req.query.action || ''
  const attackType = req.query.attackType || ''
  const srcIp = req.query.srcIp || ''
  const dstIp = req.query.dstIp || ''

  const result = await getAlerts({ limit, offset, search, severity, action, attackType, srcIp, dstIp })
  res.json({
    count: result.results.length,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    results: result.results
  })
}

// Accept JSON { data: "csv text" } or raw text
async function ingestHandler(req, res) {
  try {
    let payload
    if (req.is('application/json')) payload = req.body
    else payload = { data: req.body }
    const result = await ingestCsvPayload(payload)
    res.status(201).json(result)
  } catch (err) {
    logger.error('Ingest failed', err)
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function statsHandler(req, res) {
  const data = await getStats()
  res.json(data)
}

async function attackTypesHandler(req, res) {
  try {
    const types = await getAttackTypes()
    res.json(types)
  } catch (err) {
    logger.error('Failed to get attack types', err)
    res.status(500).json({ error: err.message })
  }
}

router.get('/', listAlertsHandler)
router.post('/', express.text({ type: ['text/*', 'application/octet-stream'], limit: '1mb' }), apiKeyAuth, ingestRateLimiter, ingestHandler)
router.get('/stats', statsHandler)
router.get('/attack-types', attackTypesHandler)

module.exports = router
module.exports.handlers = { listAlertsHandler, ingestHandler, statsHandler, attackTypesHandler }
