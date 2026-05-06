const { getDb } = require('./src/db')
require('./src/db/migrate')

const SID_MAP = {
  1000100: { attack_type: 'ICMP Ping Allowed', severity: 'low' },
  1000001: { attack_type: 'SYN Scan Detected', severity: 'high' },
  1000002: { attack_type: 'NULL Scan Detected', severity: 'high' },
  1000003: { attack_type: 'XMAS Scan Detected', severity: 'high' },
  1000004: { attack_type: 'FIN Scan Detected', severity: 'high' },
  1000005: { attack_type: 'Stealth Scan Detected', severity: 'high' },
  1000006: { attack_type: 'SYN Flood Detected', severity: 'high' },
  1000007: { attack_type: 'Port Scan Detected', severity: 'high' },
}

async function migrateAttackTypes() {
  const db = getDb()
  console.log('Migrating attack types...')
  
  let updated = 0
  for (const [sid, info] of Object.entries(SID_MAP)) {
    const result = await db.run(
      'UPDATE alerts SET attack_type = ?, severity = ? WHERE rule_sid = ?',
      [info.attack_type, info.severity.toLowerCase(), parseInt(sid)]
    )
    updated += result.changes
    console.log(`Updated SID ${sid}: ${info.attack_type}`)
  }
  
  console.log(`Total updated: ${updated} rows`)
}

migrateAttackTypes().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })