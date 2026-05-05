/**
 * Mapping from rule SID to attack type + severity
 * Extend this mapping based on your custom ruleset SIDs.
 */
const SID_MAP = new Map([
  // SIDs defined in project rules
  [1000100, { attack_type: 'ICMP Ping Allowed', severity: 'low' }],
  [1000001, { attack_type: 'SYN Scan', severity: 'medium' }],
  [1000002, { attack_type: 'NULL Scan', severity: 'medium' }],
  [1000003, { attack_type: 'Port Scan', severity: 'medium' }],
  [1000004, { attack_type: 'ICMP Ping', severity: 'low' }],
  [1000005, { attack_type: 'Web Request', severity: 'low' }],
  [1000006, { attack_type: 'SQL Injection', severity: 'high' }],
  [1000007, { attack_type: 'Reverse Shell', severity: 'high' }],
  [1000008, { attack_type: 'Brute Force', severity: 'high' }],
  [1000009, { attack_type: 'XSS Attack', severity: 'medium' }],
  [1000010, { attack_type: 'SSH Access', severity: 'medium' }],
  [1000011, { attack_type: 'RDP Access', severity: 'high' }],
  [1000012, { attack_type: 'SQL Access', severity: 'high' }],
  [1000013, { attack_type: 'SNMP Probe', severity: 'low' }],
  [1000014, { attack_type: 'SMB Access', severity: 'medium' }],
  [1000015, { attack_type: 'FTP Access', severity: 'medium' }],
  [1000016, { attack_type: 'ICMP Flood', severity: 'high' }],
  [1000017, { attack_type: 'HTTP Traffic', severity: 'low' }],
  [1000018, { attack_type: 'NetBIOS Probe', severity: 'low' }],
  [1000019, { attack_type: 'DNS Query', severity: 'low' }],
  [1000020, { attack_type: 'HTTP Response', severity: 'low' }],
  [1000021, { attack_type: 'DNS Traffic', severity: 'low' }],
  [1000022, { attack_type: 'POP3 Access', severity: 'medium' }],
  [1000023, { attack_type: 'SMTP Access', severity: 'medium' }],
  [1000024, { attack_type: 'IMAP Access', severity: 'medium' }],
  [1000025, { attack_type: 'IMAPS Access', severity: 'medium' }],
  [1000026, { attack_type: 'VNC Access', severity: 'high' }],
  [1000027, { attack_type: 'HTTPS Traffic', severity: 'low' }],
  [1000028, { attack_type: 'MySQL Access', severity: 'high' }],
  [1000029, { attack_type: 'Telnet Access', severity: 'high' }],
  [1000030, { attack_type: 'SMB Traffic', severity: 'medium' }],
  [1000031, { attack_type: 'HTTP POST', severity: 'low' }],
  [1000032, { attack_type: 'SMB Null', severity: 'medium' }],
  [1000033, { attack_type: 'SNMP Traffic', severity: 'low' }],
  [1000034, { attack_type: 'SSH Traffic', severity: 'low' }],
  [1000035, { attack_type: 'RDP Traffic', severity: 'medium' }],
  [1000036, { attack_type: 'VNC Traffic', severity: 'medium' }],
  [1000037, { attack_type: 'ICMP Traffic', severity: 'low' }],
  [1000038, { attack_type: 'HTTPS Request', severity: 'low' }],
  [1000039, { attack_type: 'HTTPS Response', severity: 'low' }],
  [1000040, { attack_type: 'HTTP Request', severity: 'low' }],
  [1000041, { attack_type: 'NetBIOS Traffic', severity: 'low' }],
  [1000042, { attack_type: 'FTP Traffic', severity: 'low' }],
  [1000043, { attack_type: 'DNS Traffic', severity: 'low' }],
  [1000044, { attack_type: 'POP3 Traffic', severity: 'low' }],
  [1000045, { attack_type: 'SMTP Traffic', severity: 'low' }],
  [1000046, { attack_type: 'IMAPS Traffic', severity: 'low' }],
  [1000047, { attack_type: 'Allow ICMP', severity: 'low' }],
  [1000048, { attack_type: 'MySQL Traffic', severity: 'low' }],
  [1000049, { attack_type: 'Allowed Port', severity: 'low' }],
  [1000050, { attack_type: 'HTTP Response', severity: 'low' }],
  [1000051, { attack_type: 'Allowed SSH', severity: 'low' }],
  [1000052, { attack_type: 'Allowed RDP', severity: 'low' }],
  [1000053, { attack_type: 'Allowed SNMP', severity: 'low' }],
  [1000054, { attack_type: 'Telnet Traffic', severity: 'medium' }],
  [1000055, { attack_type: 'Allowed ICMP', severity: 'low' }],
  [1000056, { attack_type: 'Allowed HTTP', severity: 'low' }],
  [1000057, { attack_type: 'SMB Allowed', severity: 'low' }],
  [1000058, { attack_type: 'HTTP Allowed', severity: 'low' }],
  [1000059, { attack_type: 'Allowed Web', severity: 'low' }],
  [1000060, { attack_type: 'DNS Allowed', severity: 'low' }],
  [1000061, { attack_type: 'Allowed HTTPS', severity: 'low' }],
  [1000062, { attack_type: 'DNS Query', severity: 'low' }],
  [1000063, { attack_type: 'Allowed Email', severity: 'low' }],
  [1000064, { attack_type: 'Allowed Traffic', severity: 'low' }],
])

function getSidInfo(sid) {
  if (!sid) return { attack_type: 'Không xác định', severity: 'low' }
  if (SID_MAP.has(sid)) return SID_MAP.get(sid)
  // fallback: infer by number ranges
  if (sid >= 2000000 && sid < 3000000) return { attack_type: 'Quét cổng', severity: 'medium' }
  if (sid >= 1000000 && sid < 2000000) return { attack_type: 'Khai thác', severity: 'high' }
  return { attack_type: 'Không xác định', severity: 'low' }
}

function getAttackType(sid) {
  return getSidInfo(sid).attack_type
}

module.exports = { getSidInfo, getAttackType, SID_MAP }
