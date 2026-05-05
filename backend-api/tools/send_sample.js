const fs = require('fs')
const path = require('path')
const http = require('http')

const file = process.argv[2] || path.join(__dirname, '..', 'docs', 'SAMPLE_LOGS.md')
const host = process.argv[3] || 'localhost'
const port = process.argv[4] || 4000

const data = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-5).join('\n')

const options = {
  hostname: host,
  port: port,
  path: '/api/logs',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(data),
  },
}

const req = http.request(options, (res) => {
  let body = ''
  res.on('data', (chunk) => (body += chunk))
  res.on('end', () => console.log('Response:', res.statusCode, body))
})

req.on('error', (e) => console.error('Request error', e))
req.write(data)
req.end()
