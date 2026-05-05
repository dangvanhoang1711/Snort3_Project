import axios from 'axios'

const base = process.env.REACT_APP_BACKEND_URL || ''
const api = axios.create({ baseURL: base })

export async function getAlerts({ limit = 20, offset = 0, search = '', severity = '', action = '', attackType = '', srcIp = '', dstIp = '' } = {}) {
  let url = `/api/logs?limit=${limit}&offset=${offset}`
  if (search) url += `&search=${encodeURIComponent(search)}`
  if (severity) url += `&severity=${encodeURIComponent(severity)}`
  if (action) url += `&action=${encodeURIComponent(action)}`
  if (attackType) url += `&attackType=${encodeURIComponent(attackType)}`
  if (srcIp) url += `&srcIp=${encodeURIComponent(srcIp)}`
  if (dstIp) url += `&dstIp=${encodeURIComponent(dstIp)}`
  const res = await api.get(url)
  if (res.data && res.data.results) {
    return {
      results: res.data.results,
      total: res.data.total || 0,
      limit: res.data.limit || limit,
      offset: res.data.offset || offset
    }
  }
  return { results: [], total: 0, limit, offset: 0 }
}

export async function getAttackTypes() {
  const res = await api.get('/api/logs/attack-types')
  return res.data || []
}

export async function getOverview() {
  const res = await api.get('/api/stats/overview')
  return res.data || null
}

export async function getStats() {
  const res = await api.get('/api/stats')
  return res.data || {}
}

export async function getHourlyStats() {
  const res = await api.get('/api/stats/hourly')
  return res.data || []
}

export async function ingestAlert(data) {
  const res = await api.post('/api/logs', data, {
    headers: { 'Content-Type': 'text/plain' }
  })
  return res.data
}

export default api
