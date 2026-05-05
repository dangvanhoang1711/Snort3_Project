const { parse } = require('csv-parse/sync')
const logger = require('../utils/logger')
const sidMap = require('./sid-map')

/**
 * Parse Snort alert_csv content into array of alert objects
 * Snort format: timestamp,pkt_num,proto,pkt_gen,pkt_len,dir,src_ap,dst_ap,rule,action
 * Example: 05/05-18:53:32.544461,12121,TCP,raw,44,C2S,192.168.1.2:55892,192.168.2.2:3404,1:1000001:1,drop
 */
function parseAlertCsv(text) {
  const records = parse(text, { columns: false, trim: true, skip_empty_lines: true })
  const alerts = []

  function normalizeTimestamp(ts) {
    if (!ts) return null
    const s = String(ts).trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s

    const m = s.match(/^(\d{2})\/(\d{2})-(\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/)
    if (m) {
      const year = new Date().getFullYear()
      const month = m[1].padStart(2, '0')
      const day = m[2].padStart(2, '0')
      const time = m[3]
      return `${year}-${month}-${day} ${time}`
    }

    return s
  }

  for (const row of records) {
    if (!Array.isArray(row) || row.length < 10) {
      logger.warn('Skipping malformed CSV row', { row, length: row ? row.length : 0 })
      continue
    }

    const [timestampRaw, pkt_num, proto, pkt_gen, pkt_len, dir, src_ap, dst_ap, rule, action] = row

    const timestamp = normalizeTimestamp(timestampRaw)

    const { ip: src_ip, port: src_port } = splitAddr(src_ap)
    const { ip: dst_ip, port: dst_port } = splitAddr(dst_ap)

    const parsedRule = parseRuleField(rule)
    const sidInfo = sidMap.getSidInfo(parsedRule.sid)
    const attack_type = sidInfo.attack_type
    const severity = sidInfo.severity

    const parsed = {
      timestamp,
      pkt_num: tryParseInt(pkt_num),
      proto: proto ? proto.trim() : null,
      pkt_gen: pkt_gen ? pkt_gen.trim() : null,
      pkt_len: tryParseInt(pkt_len),
      dir: dir ? dir.trim() : null,
      src_ip,
      src_port,
      dst_ip,
      dst_port,
      rule_sid: parsedRule.sid,
      rule_msg: parsedRule.msg,
      action: action ? String(action).trim().toLowerCase() : 'pass',
      attack_type,
      severity,
      raw_rule: rule,
    }

    alerts.push(parsed)
  }

  return alerts
}

function splitAddr(ap) {
  if (!ap) return { ip: null, port: null }
  const s = String(ap).trim()
  
  const m = s.match(/\[(.+)\]:(\d+)/)
  if (m) return { ip: m[1], port: tryParseInt(m[2]) }
  
  const lastColon = s.lastIndexOf(':')
  if (lastColon === -1) return { ip: s, port: null }
  
  const portStr = s.slice(lastColon + 1)
  const ipPart = s.slice(0, lastColon)
  
  if (/^\d+$/.test(portStr) && ipPart.includes('.')) {
    return { ip: ipPart, port: tryParseInt(portStr) }
  }
  
  return { ip: s, port: null }
}

function parseRuleField(field) {
  let sid = null
  if (!field) return { sid: null, msg: null }

  const s = String(field).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return { sid: null, msg: s.slice(1, -1) }
  }

  // Format: 1:1000001:1 -> extract sid = 1000001
  const m = s.match(/^(\d+):(\d+):(\d+)$/)
  if (m) {
    sid = parseInt(m[2], 10)
    return { sid, msg: `SID:${sid}` }
  }

  // Bracketed format: [1:1000001:1]
  const bracketMatch = s.match(/\[(?:\d+:)?(\d+):\d+\]/)
  if (bracketMatch) {
    sid = parseInt(bracketMatch[1], 10)
    const msg = s.replace(/\[\d+:\d+:\d+\]/, '').trim()
    return { sid, msg: msg || `SID:${sid}` }
  }

  // inline sid:1234 or sid=1234
  const sidInline = s.match(/sid\s*[:=]\s*(\d+)/i)
  if (sidInline) {
    sid = parseInt(sidInline[1], 10)
    return { sid, msg: `SID:${sid}` }
  }

  return { sid: null, msg: s }
}

function tryParseInt(v) {
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? null : n
}

module.exports = { parseAlertCsv, parseRuleField }
