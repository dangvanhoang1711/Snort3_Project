const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const fs = require('fs')
const path = require('path')
const config = require('../config')
const logger = require('../utils/logger')

const DB_DIR = path.dirname(config.DB_PATH)

let db

async function initDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  db = await open({ filename: config.DB_PATH, driver: sqlite3.Database })
  await migrate(db)
  logger.info('Database initialized at ' + config.DB_PATH)
}

async function migrate(dbInstance) {
  // create alerts table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      pkt_num INTEGER,
      proto TEXT,
      pkt_gen TEXT,
      pkt_len INTEGER,
      dir TEXT,
      src_ip TEXT,
      src_port INTEGER,
      dst_ip TEXT,
      dst_port INTEGER,
      rule_sid INTEGER,
      rule_msg TEXT,
      action TEXT,
      attack_type TEXT,
      severity TEXT,
      raw_rule TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Ensure severity column exists (for upgrades)
  const cols = await dbInstance.all(`PRAGMA table_info('alerts');`)
  const hasSeverity = cols.some((c) => c.name === 'severity')
  if (!hasSeverity) {
    try {
      await dbInstance.exec(`ALTER TABLE alerts ADD COLUMN severity TEXT;`)
    } catch (e) {
      // ignore
    }
  }

  // indexes for fast queries
  await dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);`)
  await dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_src_ip ON alerts(src_ip);`)
  await dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_dst_ip ON alerts(dst_ip);`)
  await dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_attack_type ON alerts(attack_type);`)
}

function getDb() {
  if (!db) throw new Error('Database not initialized')
  return db
}

module.exports = { initDb, getDb }
