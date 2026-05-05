const logger = require('../utils/logger')

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', { message: err.message, stack: err.stack })
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal Server Error' })
}

module.exports = errorHandler
