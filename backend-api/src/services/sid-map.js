/**
 * Mapping from rule SID to attack type + severity
 * Extend this mapping based on your custom ruleset SIDs.
 */
const SID_MAP = new Map([
  // Your custom rules - HIGH severity
  [1000100, { attack_type: 'ICMP Ping Allowed', severity: 'low' }],
  [1000001, { attack_type: 'SYN Scan Detected', severity: 'high' }],
  [1000002, { attack_type: 'NULL Scan Detected', severity: 'high' }],
  [1000003, { attack_type: 'XMAS Scan Detected', severity: 'high' }],
  [1000004, { attack_type: 'FIN Scan Detected', severity: 'high' }],
  [1000005, { attack_type: 'Stealth Scan Detected', severity: 'high' }],
  [1000006, { attack_type: 'SYN Flood Detected', severity: 'high' }],
  [1000007, { attack_type: 'Port Scan Detected', severity: 'high' }],
  
  // Additional rules - MEDIUM severity
  [1000101, { attack_type: 'ICMP Sweep Detected', severity: 'medium' }],
  [1000102, { attack_type: 'ICMP Flood Detected', severity: 'medium' }],
  [1000103, { attack_type: 'UDP Flood Detected', severity: 'medium' }],
  [1000104, { attack_type: 'DNS Query Anomaly', severity: 'medium' }],
  [1000105, { attack_type: 'ARP Spoofing Detected', severity: 'medium' }],
  [1000106, { attack_type: 'Ping of Death Detected', severity: 'medium' }],
])

const ATTACK_TYPE_TO_SID = new Map([
  ['ICMP Ping Allowed', 1000100],
  ['SYN Scan Detected', 1000001],
  ['NULL Scan Detected', 1000002],
  ['XMAS Scan Detected', 1000003],
  ['FIN Scan Detected', 1000004],
  ['Stealth Scan Detected', 1000005],
  ['SYN Flood Detected', 1000006],
  ['Port Scan Detected', 1000007],
  ['ICMP Sweep Detected', 1000101],
  ['ICMP Flood Detected', 1000102],
  ['UDP Flood Detected', 1000103],
  ['DNS Query Anomaly', 1000104],
  ['ARP Spoofing Detected', 1000105],
  ['Ping of Death Detected', 1000106],
])

function getSidInfo(sid) {
  if (!sid) return { attack_type: 'Không xác định', severity: 'low' }
  if (SID_MAP.has(sid)) return SID_MAP.get(sid)
  return { attack_type: 'Không xác định', severity: 'low' }
}

function getSidByAttackType(attack_type) {
  return ATTACK_TYPE_TO_SID.get(attack_type) || null
}

function getAttackType(sid) {
  return getSidInfo(sid).attack_type
}

module.exports = { getSidInfo, getAttackType, getSidByAttackType, SID_MAP }
