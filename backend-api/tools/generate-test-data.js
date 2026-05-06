const axios = require('axios')

const ATTACK_TYPES = [
  // HIGH severity
  { attack_type: 'SYN Scan Detected', severity: 'high', action: 'drop', sid: 1000001 },
  { attack_type: 'NULL Scan Detected', severity: 'high', action: 'drop', sid: 1000002 },
  { attack_type: 'XMAS Scan Detected', severity: 'high', action: 'drop', sid: 1000003 },
  { attack_type: 'FIN Scan Detected', severity: 'high', action: 'drop', sid: 1000004 },
  { attack_type: 'Stealth Scan Detected', severity: 'high', action: 'drop', sid: 1000005 },
  { attack_type: 'SYN Flood Detected', severity: 'high', action: 'drop', sid: 1000006 },
  { attack_type: 'Port Scan Detected', severity: 'high', action: 'drop', sid: 1000007 },
  // MEDIUM severity
  { attack_type: 'ICMP Sweep Detected', severity: 'medium', action: 'drop', sid: 1000101 },
  { attack_type: 'ICMP Flood Detected', severity: 'medium', action: 'drop', sid: 1000102 },
  { attack_type: 'UDP Flood Detected', severity: 'medium', action: 'drop', sid: 1000103 },
  { attack_type: 'DNS Query Anomaly', severity: 'medium', action: 'alert', sid: 1000104 },
  { attack_type: 'ARP Spoofing Detected', severity: 'medium', action: 'drop', sid: 1000105 },
  { attack_type: 'Ping of Death Detected', severity: 'medium', action: 'drop', sid: 1000106 },
  // LOW severity
  { attack_type: 'ICMP Ping Allowed', severity: 'low', action: 'allow', sid: 1000100 },
]

const SOURCE_IPS = [
  '192.168.1.10',   // Attacker 1
  '192.168.1.15',   // Attacker 2  
  '10.0.0.50',      // Attacker 3
  '172.16.0.100',   // Attacker 4
  '192.168.1.200',  // Attacker 5
]

const TARGET_IPS = [
  '192.168.2.10',
  '192.168.2.20',
  '192.168.2.30',
  '192.168.2.100',
]

const PROTOS = ['TCP', 'UDP', 'ICMP']

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateAlert() {
  const attack = randomElement(ATTACK_TYPES)
  const srcIp = randomElement(SOURCE_IPS)
  const dstIp = randomElement(TARGET_IPS)
  const proto = randomElement(PROTOS)
  
  // Create raw log format
  const timestamp = `05/06-${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
  
  return `${timestamp},${Math.floor(Math.random() * 10000)},${proto},raw,${Math.floor(Math.random() * 100)},C2S,${srcIp}:${Math.floor(Math.random() * 65535)},${dstIp}:${Math.floor(Math.random() * 65535)},1:${attack.sid}:1,${attack.action}`
}

async function sendBatch(alerts, apiUrl, apiKey) {
  const payload = { data: alerts.join('\n') }
  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      timeout: 5000
    })
    return response.data
  } catch (err) {
    console.error('Error sending:', err.message)
    return null
  }
}

async function main() {
  const apiUrl = process.env.API_URL || 'http://localhost:4000/api/ingest'
  const apiKey = process.env.API_KEY || 'demo-key'
  const totalAlerts = parseInt(process.env.TOTAL_ALERTS || '100', 10)
  const batchSize = parseInt(process.env.BATCH_SIZE || '10', 10)
  const delay = parseInt(process.env.DELAY || '100', 10)

  console.log(`
╔══════════════════════════════════════════════════╗
║     Snort Alert Test Data Generator               ║
╠══════════════════════════════════════════════════╣
║  API URL:    ${apiUrl}
║  Total:      ${totalAlerts} alerts
║  Batch size: ${batchSize}
║  Delay:      ${delay}ms
╚══════════════════════════════════════════════════╝
  `)

  let sent = 0
  let batch = []

  for (let i = 0; i < totalAlerts; i++) {
    batch.push(generateAlert())
    
    if (batch.length >= batchSize || i === totalAlerts - 1) {
      const result = await sendBatch(batch, apiUrl, apiKey)
      sent += batch.length
      console.log(`[${sent}/${totalAlerts}] Sent batch of ${batch.length} alerts`)
      batch = []
      await new Promise(r => setTimeout(r, delay))
    }
  }

  console.log('\n✅ Test data generation complete!')
  console.log(`Total alerts sent: ${sent}`)
}

main()