let io = null
const EventEmitter = require('events')
const emitter = new EventEmitter()
const logger = require('../utils/logger')

function init(server, opts = {}) {
  if (io) return io
  // lazy require to avoid circular deps when importing
  const { Server } = require('socket.io')
  io = new Server(server, opts)

  io.on('connection', (socket) => {
    logger.info('socket connected ' + socket.id)
    socket.on('hello', (msg) => {
      // keep lightweight
      socket.emit('hello', 'welcome')
    })
  })

  return io
}

function emitAlert(alert) {
  if (!io) return
  try {
    logger.info('emit alert:new', { id: alert && alert.id })
    io.emit('alert:new', alert)
    // also emit to internal emitter for SSE
    emitter.emit('alert:new', alert)
  } catch (err) {
    // no-op
    console.error('Realtime emit failed', err)
  }
}

module.exports = { init, emitAlert, emitter }
