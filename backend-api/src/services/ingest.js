const { parseAlertCsv } = require('./parser')
const { aggregator } = require('./aggregator')
const logger = require('../utils/logger')
const Joi = require('joi')

const payloadSchema = Joi.object({
  data: Joi.string().required(),
})

async function ingestCsvPayload(payload) {
  const { error } = payloadSchema.validate(payload)
  if (error) {
    const e = new Error('Invalid payload: ' + error.message)
    e.status = 400
    throw e
  }

  const alerts = parseAlertCsv(payload.data)
  const result = aggregator.processAlerts(alerts)

  return {
    processed: alerts.length,
    new_groups: result.newGroups,
    buffered: result.buffered
  }
}

module.exports = { ingestCsvPayload }
