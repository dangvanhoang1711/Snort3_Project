const fs = require('fs')
const path = require('path')
const http = require('http')

const sampleFile = path.join(__dirname, 'snort_sample_data.txt')
const host = process.argv[2] || 'localhost'
const port = process.argv[3] || '4000'
const apiKey = process.env.API_KEY || 'demo-key'

if (!fs.existsSync(sampleFile)) {
  console.error('File not found:', sampleFile)
  process.exit(1)
}

const data = fs.readFileSync(sampleFile, 'utf8')
const lines = data.split('\n').filter(line => line.trim() && !line.startsWith('#'))

console.log(`Sending ${lines.length} sample alerts...`)

const options = {
  hostname: host,
  port: port,
    path: '/api/ingest',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'X-API-Key': apiKey,
    'Content-Length': Buffer.byteLength(data),
  },
}

const req = http.request(options, (res) => {
  let body = ''
  res.on('data', (chunk) => (body += chunk))
  res.on('end', () => {
    console.log('Response:', res.statusCode)
    if (body) console.log(body)
  })
})

req.on('error', (e) => console.error('Request error:', e))
req.write(data)
req.end()
