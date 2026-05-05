import { io } from 'socket.io-client'

// Small helper to create a singleton socket connection
let socket = null
export function getSocket() {
  if (socket) return socket
  const BACKEND = process.env.REACT_APP_BACKEND_URL || ''
  socket = BACKEND ? io(BACKEND, { path: '/socket.io', transports: ['websocket', 'polling'] }) : io({ path: '/socket.io', transports: ['websocket', 'polling'] })
  return socket
}

export function closeSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
