const { getDb } = require('../db')

async function getAlerts({ limit = 20, offset = 0, search = '', severity = '', action = '', attackType = '', srcIp = '', dstIp = '' } = {}) {
  const db = getDb()
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0)
  let where = `WHERE 1=1`
  const params = []

  if (search) {
    where += ` AND (src_ip LIKE ? OR dst_ip LIKE ? OR attack_type LIKE ?)`
    const searchPattern = `%${search}%`
    params.push(searchPattern, searchPattern, searchPattern)
  }

  if (severity) {
    where += ` AND severity = ?`
    params.push(severity.toLowerCase())
  }

  if (action) {
    where += ` AND action = ?`
    params.push(action.toLowerCase())
  }

  if (attackType) {
    where += ` AND attack_type LIKE ?`
    params.push(`%${attackType}%`)
  }

  if (srcIp) {
    where += ` AND src_ip = ?`
    params.push(srcIp)
  }

  if (dstIp) {
    where += ` AND dst_ip = ?`
    params.push(dstIp)
  }

  const countQuery = `SELECT COUNT(*) as count FROM alerts_aggregated ${where}`
  const countResult = await db.get(countQuery, params)
  const total = countResult?.count || 0

  const query = `SELECT id, src_ip, dst_ip, dst_port, attack_type, rule_sid, severity, action, proto, count,
    datetime(last_seen/1000, 'unixepoch') as timestamp, first_seen, last_seen
    FROM alerts_aggregated ${where}
    ORDER BY last_seen DESC LIMIT ? OFFSET ?`
  params.push(safeLimit, safeOffset)

  const rows = await db.all(query, params)
  return { results: rows, total, limit: safeLimit, offset: safeOffset }
}

async function getStats() {
  const db = getDb()
  const byType = await db.all(`SELECT attack_type, SUM(count) as count FROM alerts_aggregated GROUP BY attack_type ORDER BY count DESC`)
  const bySeverity = await db.all(`SELECT severity, SUM(count) as count FROM alerts_aggregated WHERE severity IS NOT NULL GROUP BY severity`)
  const bySrc = await db.all(`SELECT src_ip, SUM(count) as count FROM alerts_aggregated GROUP BY src_ip ORDER BY count DESC LIMIT 10`)
  const byDst = await db.all(`SELECT dst_ip, SUM(count) as count FROM alerts_aggregated GROUP BY dst_ip ORDER BY count DESC LIMIT 10`)
  const recent = await db.all(`SELECT attack_type, last_seen FROM alerts_aggregated ORDER BY last_seen DESC LIMIT 100`)
  return { byType, bySeverity, bySrc, byDst, recent }
}

async function getAttackTypes() {
  const db = getDb()
  const types = await db.all(`SELECT DISTINCT attack_type FROM alerts_aggregated WHERE attack_type IS NOT NULL ORDER BY attack_type`)
  return types.map(t => t.attack_type)
}

module.exports = { getAlerts, getStats, getAttackTypes }
