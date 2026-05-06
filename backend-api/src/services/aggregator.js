const { getDb } = require('../db')
const realtime = require('../realtime')
const logger = require('../utils/logger')
const { getSidByAttackType } = require('./sid-map')

const FLUSH_INTERVAL = 100

class AlertAggregator {
  constructor() {
    this.buffer = []
    this.flushTimer = null
    this.isFlushing = false
    this.stats = {
      received: 0,
      flushed: 0,
      upserted: 0,
      errors: 0
    }
  }

  getKey(entry) {
    return `${entry.src_ip}:${entry.dst_ip}:${entry.attack_type}`
  }

  start() {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL)
    logger.info(`AlertAggregator started with ${FLUSH_INTERVAL}ms flush interval`)
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    return this.flush()
  }

  processAlerts(alerts) {
    for (const alert of alerts) {
      if (!alert.src_ip || !alert.attack_type) continue
      
      const rule_sid = getSidByAttackType(alert.attack_type)
      
      const entry = {
        src_ip: alert.src_ip,
        dst_ip: alert.dst_ip,
        dst_port: alert.dst_port,
        attack_type: alert.attack_type,
        rule_sid: rule_sid,
        severity: alert.severity || 'medium',
        action: alert.action || 'alert',
        proto: alert.proto || 'TCP',
        count: alert.count || 1,
        first_seen: Date.now(),
        last_seen: Date.now(),
      }

      const key = this.getKey(entry)
      const existing = this.buffer.find(b => this.getKey(b) === key)
      if (existing) {
        existing.count += entry.count
        existing.last_seen = entry.last_seen
      } else {
        this.buffer.push(entry)
      }
      this.stats.received++
    }

    return { buffered: this.buffer.length }
  }

  async flush() {
    if (this.isFlushing || this.buffer.length === 0) return

    this.isFlushing = true
    const batch = this.buffer.splice(0, this.buffer.length)

    try {
      const db = getDb()

      for (const entry of batch) {
        const existing = await db.get(
          `SELECT id, count FROM alerts_aggregated 
           WHERE src_ip = ? AND dst_ip = ? AND attack_type = ?`,
          [entry.src_ip, entry.dst_ip, entry.attack_type]
        )

        if (existing) {
          await db.run(
            `UPDATE alerts_aggregated 
             SET count = count + ?, last_seen = ? 
             WHERE id = ?`,
            [entry.count, entry.last_seen, existing.id]
          )
        } else {
          await db.run(
            `INSERT INTO alerts_aggregated 
             (src_ip, dst_ip, dst_port, attack_type, rule_sid, severity, action, proto, count, first_seen, last_seen) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              entry.src_ip, entry.dst_ip, entry.dst_port, entry.attack_type, entry.rule_sid,
              entry.severity, entry.action, entry.proto, entry.count,
              entry.first_seen, entry.last_seen
            ]
          )
          
          try {
            realtime.emitAlert({
              ...entry,
              is_aggregated: true
            })
          } catch (err) {
            logger.error('Failed to emit realtime event', err)
          }
        }
        
        this.stats.upserted++
      }

      this.stats.flushed += batch.length
    } catch (err) {
      logger.error('Failed to flush aggregated alerts', err)
      this.stats.errors++
    } finally {
      this.isFlushing = false
    }
  }

  getStats() {
    return { ...this.stats, buffered: this.buffer.length }
  }
}

const aggregator = new AlertAggregator()

module.exports = { aggregator, AlertAggregator }