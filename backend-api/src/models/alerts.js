const { getDb } = require('../db')

async function getAlerts({ limit = 20, offset = 0, search = '', severity = '', action = '', attackType = '', srcIp = '', dstIp = '' } = {}) {
  const db = getDb()
  let query = 'SELECT * FROM alerts_aggregated WHERE 1=1'
  const params = []

  if (search) {
    query += ` AND (src_ip LIKE ? OR dst_ip LIKE ? OR attack_type LIKE ?)`
    const searchPattern = `%${search}%`
    params.push(searchPattern, searchPattern, searchPattern)
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

  query += ` ORDER BY last_seen DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const rows = await db.all(query, params)
  return { results: rows, total, limit, offset }
}

async function getStats() {
  const db = getDb()
  const byType = await db.all(`SELECT attack_type, SUM(count) as count FROM alerts_aggregated GROUP BY attack_type ORDER BY count DESC`)
  const bySrc = await db.all(`SELECT src_ip, SUM(count) as count FROM alerts_aggregated GROUP BY src_ip ORDER BY count DESC LIMIT 10`)
  const byDst = await db.all(`SELECT dst_ip, SUM(count) as count FROM alerts_aggregated GROUP BY dst_ip ORDER BY count DESC LIMIT 10`)
  const recent = await db.all(`SELECT attack_type, last_seen FROM alerts_aggregated ORDER BY last_seen DESC LIMIT 100`)
  return { byType, bySrc, byDst, recent }
}

async function getAttackTypes() {
  const db = getDb()
  const types = await db.all(`SELECT DISTINCT attack_type FROM alerts_aggregated WHERE attack_type IS NOT NULL ORDER BY attack_type`)
  return types.map(t => t.attack_type)
}

module.exports = { getAlerts, getStats, getAttackTypes }
