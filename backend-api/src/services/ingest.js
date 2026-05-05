const { parseAlertCsv } = require('./parser')
const { insertAlert } = require('../models/alerts')
const logger = require('../utils/logger')
const Joi = require('joi')

const payloadSchema = Joi.object({
  data: Joi.string().required(), // CSV payload as text
})

async function ingestCsvPayload(payload) {
  const { error } = payloadSchema.validate(payload)
  if (error) {
    const e = new Error('Invalid payload: ' + error.message)
    e.status = 400
    throw e
  }

  const alerts = parseAlertCsv(payload.data)
  const results = []
  for (const a of alerts) {
    try {
      const res = await insertAlert(a)
      results.push({ id: res.id, timestamp: a.timestamp })
    } catch (err) {
      logger.error('Failed to insert alert', err)
    }
  }
  return { inserted: results.length, details: results }
}

module.exports = { ingestCsvPayload }
