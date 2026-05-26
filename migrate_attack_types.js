const { initDb, getDb } = require('./backend-api/src/db')
const { SID_MAP } = require('./backend-api/src/services/sid-map')

async function migrateAttackTypes() {
  await initDb()
  const db = getDb()
  let updated = 0

  for (const [sid, info] of SID_MAP.entries()) {
    const result = await db.run(
      'UPDATE alerts SET attack_type = ?, severity = ? WHERE rule_sid = ?',
      [info.attack_type, info.severity.toLowerCase(), sid]
    )
    updated += result.changes
    console.log(`Updated SID ${sid}: ${info.attack_type}`)
  }

  console.log(`Total updated: ${updated} rows`)
}

migrateAttackTypes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
