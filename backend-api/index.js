const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const config = require('./src/config')
const logger = require('./src/utils/logger')
const routes = require('./src/routes')
const { initDb } = require('./src/db')
const errorHandler = require('./src/middleware/errorHandler')
const { aggregator } = require('./src/services/aggregator')

const http = require('http')
const realtime = require('./src/realtime')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Logging
app.use(morgan('combined', { stream: logger.stream }))

// Security basics
app.use(cors())
if (config.RATE_LIMIT_WINDOW_MS && config.RATE_LIMIT_MAX) {
  app.use(
    rateLimit({
      windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS, 10),
      max: parseInt(config.RATE_LIMIT_MAX, 10),
    })
  )
}

// Mount API
app.use('/api', routes)

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Error handler (last)
app.use(errorHandler)

const start = async () => {
  try {
    await initDb()
    aggregator.start()
    const server = http.createServer(app)
    // initialize realtime (socket.io)
    realtime.init(server, { cors: { origin: '*' } })
    server.listen(config.PORT, () => {
      logger.info(`Server listening on port ${config.PORT}`)
    })
  } catch (err) {
    logger.error('Failed to start server', err)
    process.exit(1)
  }
}

start()
