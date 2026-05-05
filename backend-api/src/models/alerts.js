const { getDb } = require('../db')
const realtime = require('../realtime')

async function insertAlert(alert) {
  const db = getDb()
  const result = await db.run(
    `INSERT INTO alerts (timestamp, pkt_num, proto, pkt_gen, pkt_len, dir, src_ip, src_port, dst_ip, dst_port, rule_sid, rule_msg, action, attack_type, severity, raw_rule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      alert.timestamp,
      alert.pkt_num,
      alert.proto,
      alert.pkt_gen,
      alert.pkt_len,
      alert.dir,
      alert.src_ip,
      alert.src_port,
      alert.dst_ip,
      alert.dst_port,
      alert.rule_sid,
      alert.rule_msg,
      alert.action,
      alert.attack_type,
      alert.severity,
      alert.raw_rule,
    ]
  )

  // fetch inserted row
  const id = result.lastID
  const row = await db.get(`SELECT * FROM alerts WHERE id = ?`, [id])

  // broadcast via realtime if available
  try {
    realtime.emitAlert(row)
  } catch (err) {
    // log silently
    console.error('Failed to emit realtime event', err)
  }

  return { id }
}

async function getAlerts({ limit = 20, offset = 0, search = '', severity = '', action = '', attackType = '', srcIp = '', dstIp = '' } = {}) {
  const db = getDb()
  let query = 'SELECT * FROM alerts WHERE 1=1'
  const params = []

  if (search) {
    query += ` AND (src_ip LIKE ? OR dst_ip LIKE ? OR attack_type LIKE ? OR rule_msg LIKE ?)`
    const searchPattern = `%${search}%`
    params.push(searchPattern, searchPattern, searchPattern, searchPattern)
  }

  if (severity) {
    query += ` AND severity = ?`
    params.push(severity.toLowerCase())
  }

  if (action) {
    query += ` AND action = ?`
    params.push(action.toLowerCase())
  }

  if (attackType) {
    query += ` AND attack_type LIKE ?`
    params.push(`%${attackType}%`)
  }

  if (srcIp) {
    query += ` AND src_ip = ?`
    params.push(srcIp)
  }

  if (dstIp) {
    query += ` AND dst_ip = ?`
    params.push(dstIp)
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
  const countResult = await db.get(countQuery, params)
  const total = countResult?.count || 0

  query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const rows = await db.all(query, params)
  return { results: rows, total, limit, offset }
}

async function getStats() {
  const db = getDb()
  const byType = await db.all(`SELECT attack_type, COUNT(*) as count FROM alerts GROUP BY attack_type ORDER BY count DESC`)
  const bySrc = await db.all(`SELECT src_ip, COUNT(*) as count FROM alerts GROUP BY src_ip ORDER BY count DESC LIMIT 10`)
  const byDst = await db.all(`SELECT dst_ip, COUNT(*) as count FROM alerts GROUP BY dst_ip ORDER BY count DESC LIMIT 10`)
  const recent = await db.all(`SELECT timestamp, attack_type FROM alerts ORDER BY timestamp DESC LIMIT 100`)
  return { byType, bySrc, byDst, recent }
}

async function getAttackTypes() {
  const db = getDb()
  const types = await db.all(`SELECT DISTINCT attack_type FROM alerts WHERE attack_type IS NOT NULL ORDER BY attack_type`)
  return types.map(t => t.attack_type)
}

module.exports = { insertAlert, getAlerts, getStats, getAttackTypes }
