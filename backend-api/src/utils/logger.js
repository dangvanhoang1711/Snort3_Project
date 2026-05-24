const { createLogger, format, transports } = require('winston')
const fs = require('fs')

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const rest = Object.keys(meta).length ? JSON.stringify(meta) : ''
      return `${timestamp} ${level}: ${message} ${rest}`
    })
  ),
  transports: [new transports.Console()],
})

// Add file transport in production for persistent logs
if (process.env.NODE_ENV === 'production') {
  if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true })
  logger.add(new transports.File({ filename: 'logs/combined.log' }))
}

// morgan stream
logger.stream = {
  write: (message) => {
    logger.info(message.trim())
  },
}

module.exports = logger
