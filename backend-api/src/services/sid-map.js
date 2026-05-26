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
  [1000008, { attack_type: 'MALWARE-CNC C&C Connection Attempt Detected', severity: 'high' }],
  
  // Additional rules - MEDIUM severity
  [1000101, { attack_type: 'ICMP Sweep Detected', severity: 'medium' }],
  [1000102, { attack_type: 'ICMP Flood Detected', severity: 'medium' }],
  [1000103, { attack_type: 'UDP Flood Detected', severity: 'medium' }],
  [1000104, { attack_type: 'DNS Query Anomaly', severity: 'medium' }],
  [1000105, { attack_type: 'ARP Spoofing Detected', severity: 'medium' }],
  [1000106, { attack_type: 'Ping of Death Detected', severity: 'medium' }],
  [1000107, { attack_type: 'SSH Brute Force Attempt Detected', severity: 'medium' }],

  // ==========================================
  // MALWARE DETECTION RULES (SID 1000200-1000228)
  // ==========================================
  
  // A1. Payload Signatures - HIGH
  [1000200, { attack_type: 'EICAR Test File', severity: 'high' }],
  [1000201, { attack_type: 'Metasploit Payload', severity: 'high' }],
  [1000202, { attack_type: 'Reverse Shell Command', severity: 'high' }],
  [1000203, { attack_type: 'Netcat Backdoor', severity: 'high' }],
  [1000204, { attack_type: 'Python Reverse Shell', severity: 'high' }],
  [1000205, { attack_type: 'Encoded PowerShell Payload', severity: 'high' }],

  // A2. C2 Communication - HIGH
  [1000206, { attack_type: 'Cobalt Strike Beacon', severity: 'high' }],
  [1000207, { attack_type: 'Suspicious Bot User-Agent', severity: 'high' }],
  [1000208, { attack_type: 'C2 Check-in Pattern', severity: 'high' }],
  [1000209, { attack_type: 'C2 Registration Attempt', severity: 'high' }],
  [1000210, { attack_type: 'Suspicious POST to Root', severity: 'high' }],

  // A3. Exploit Detection - HIGH (critical mapped to high)
  [1000211, { attack_type: 'Shellshock Exploit', severity: 'high' }],
  [1000212, { attack_type: 'SQL Injection Attempt', severity: 'high' }],
  [1000213, { attack_type: 'Directory Traversal', severity: 'high' }],
  [1000214, { attack_type: 'Command Injection', severity: 'high' }],
  [1000215, { attack_type: 'XXE Attack', severity: 'high' }],
  [1000216, { attack_type: 'Log4Shell Exploit', severity: 'high' }],

  // A4. Ransomware Indicators - HIGH (critical mapped to high)
  [1000217, { attack_type: 'Ransomware Note Detected', severity: 'high' }],
  [1000218, { attack_type: 'Ransomware File Extension', severity: 'high' }],
  [1000219, { attack_type: 'Ransomware Payment Instruction', severity: 'high' }],

  // A5. Data Exfiltration - HIGH
  [1000220, { attack_type: 'Base64 Data Exfiltration', severity: 'high' }],
  [1000221, { attack_type: 'Cleartext Credential Leak', severity: 'high' }],

  // B1. Flowbits Multi-stage - HIGH
  [1000222, { attack_type: 'C2 Beacon Registration', severity: 'high' }],
  [1000223, { attack_type: 'C2 Active Beacon', severity: 'high' }],
  [1000224, { attack_type: 'C2 Command Execution', severity: 'high' }],

  // B2. Detection Filter Rate-based - MEDIUM
  [1000225, { attack_type: 'DNS Tunneling High Rate', severity: 'medium' }],
  [1000226, { attack_type: 'Periodic C2 Beacon', severity: 'medium' }],

  // B4. Protocol Anomaly - MEDIUM
  [1000227, { attack_type: 'DNS Query Excessive Length', severity: 'medium' }],

  // B3. File Inspector - HIGH
  [1000228, { attack_type: 'PE Executable Download', severity: 'high' }],
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
  ['MALWARE-CNC C&C Connection Attempt Detected', 1000008],
  ['ICMP Sweep Detected', 1000101],
  ['ICMP Flood Detected', 1000102],
  ['UDP Flood Detected', 1000103],
  ['DNS Query Anomaly', 1000104],
  ['ARP Spoofing Detected', 1000105],
  ['Ping of Death Detected', 1000106],
  ['SSH Brute Force Attempt Detected', 1000107],
  
  // Malware Detection Rules
  ['EICAR Test File', 1000200],
  ['Metasploit Payload', 1000201],
  ['Reverse Shell Command', 1000202],
  ['Netcat Backdoor', 1000203],
  ['Python Reverse Shell', 1000204],
  ['Encoded PowerShell Payload', 1000205],
  ['Cobalt Strike Beacon', 1000206],
  ['Suspicious Bot User-Agent', 1000207],
  ['C2 Check-in Pattern', 1000208],
  ['C2 Registration Attempt', 1000209],
  ['Suspicious POST to Root', 1000210],
  ['Shellshock Exploit', 1000211],
  ['SQL Injection Attempt', 1000212],
  ['Directory Traversal', 1000213],
  ['Command Injection', 1000214],
  ['XXE Attack', 1000215],
  ['Log4Shell Exploit', 1000216],
  ['Ransomware Note Detected', 1000217],
  ['Ransomware File Extension', 1000218],
  ['Ransomware Payment Instruction', 1000219],
  ['Base64 Data Exfiltration', 1000220],
  ['Cleartext Credential Leak', 1000221],
  ['C2 Beacon Registration', 1000222],
  ['C2 Active Beacon', 1000223],
  ['C2 Command Execution', 1000224],
  ['DNS Tunneling High Rate', 1000225],
  ['Periodic C2 Beacon', 1000226],
  ['DNS Query Excessive Length', 1000227],
  ['PE Executable Download', 1000228],
])

function getSidInfo(sid) {
  if (!sid) return { attack_type: 'Unknown', severity: 'low' }
  if (SID_MAP.has(sid)) return SID_MAP.get(sid)
  return { attack_type: 'Unknown', severity: 'low' }
}

function getSidByAttackType(attack_type) {
  return ATTACK_TYPE_TO_SID.get(attack_type) || null
}

function getAttackType(sid) {
  return getSidInfo(sid).attack_type
}

module.exports = { getSidInfo, getAttackType, getSidByAttackType, SID_MAP }
