# MITRE ATT&CK Coverage - Malware Detection Rules

## Overview

This document maps the custom Snort3 malware detection rules to the MITRE ATT&CK framework, demonstrating coverage across multiple tactics and techniques commonly used by adversaries.

**Total Coverage**: 7 MITRE ATT&CK Techniques across 4 Tactics

---

## Coverage Summary

| Tactic | Techniques Covered | Rules |
|--------|-------------------|-------|
| **Initial Access** | 1 | 6 rules |
| **Execution** | 1 | 3 rules |
| **Command and Control** | 1 | 8 rules |
| **Exfiltration** | 2 | 5 rules |
| **Impact** | 1 | 3 rules |
| **Defense Evasion** | 1 | 2 rules |

---

## Detailed Mapping

### TA0001 - Initial Access

#### T1190: Exploit Public-Facing Application

**Description**: Adversaries may attempt to exploit weaknesses in Internet-facing applications to gain initial access.

**Rules Coverage**:
- **SID 1000211**: Shellshock Exploit (CVE-2014-6271)
- **SID 1000212**: SQL Injection Attempt
- **SID 1000213**: Directory Traversal
- **SID 1000214**: Command Injection
- **SID 1000215**: XXE Attack
- **SID 1000216**: Log4Shell Exploit (CVE-2021-44228)

**Detection Method**: Pattern-based (PCRE regex, content matching)

**Demo Script**: `3-shellshock-exploit.sh`

**Real-World Examples**:
- Equifax breach (2017) - Apache Struts vulnerability
- Log4Shell attacks (2021) - Apache Log4j vulnerability
- Shellshock attacks (2014) - Bash CGI exploitation

---

### TA0002 - Execution

#### T1059.004: Command and Scripting Interpreter: Unix Shell

**Description**: Adversaries may abuse Unix shell commands and scripts for execution.

**Rules Coverage**:
- **SID 1000202**: Reverse Shell Command
- **SID 1000203**: Netcat Backdoor
- **SID 1000204**: Python Reverse Shell

**Detection Method**: Pattern-based (content matching, PCRE)

**Demo Script**: `1-eicar-download.sh`

**Real-World Examples**:
- Web shell backdoors
- Post-exploitation frameworks (Metasploit, Empire)
- Compromised SSH keys leading to shell access

---

### TA0011 - Command and Control

#### T1071.001: Application Layer Protocol: Web Protocols

**Description**: Adversaries may communicate using application layer protocols (HTTP/HTTPS) to avoid detection.

**Rules Coverage**:
- **SID 1000206**: Cobalt Strike Beacon
- **SID 1000207**: Suspicious Bot User-Agent
- **SID 1000208**: C2 Check-in Pattern
- **SID 1000209**: C2 Registration Attempt
- **SID 1000210**: Suspicious POST to Root
- **SID 1000222**: C2 Beacon Registration (flowbits stage 1)
- **SID 1000223**: C2 Active Beacon (flowbits stage 2)
- **SID 1000224**: C2 Command Execution (flowbits stage 3)

**Detection Method**: 
- Pattern-based: HTTP User-Agent, URI patterns
- Behavioral: Flowbits stateful tracking, rate-based detection

**Demo Script**: `2-c2-multistage.sh`

**Real-World Examples**:
- Cobalt Strike C2 framework
- APT29 (Cozy Bear) HTTP C2
- Emotet botnet communication
- TrickBot C2 infrastructure

**Advanced Detection**:
- **SID 1000226**: Periodic C2 Beacon Pattern (rate-based)
  - Detects regular heartbeat intervals
  - Threshold: >5 requests in 60 seconds

---

### TA0010 - Exfiltration

#### T1048: Exfiltration Over Alternative Protocol

**Description**: Adversaries may steal data by exfiltrating it over a different protocol than the main C2 channel.

**Rules Coverage**:
- **SID 1000225**: DNS Tunneling High Query Rate
- **SID 1000227**: DNS Query Excessive Length

**Detection Method**: Behavioral (rate-based, protocol anomaly)

**Demo Script**: `5-dns-tunnel.sh`

**Real-World Examples**:
- DNSMessenger malware
- APT32 (OceanLotus) DNS tunneling
- Cobalt Strike DNS beacon
- Iodine DNS tunnel tool

**Technical Details**:
- **SID 1000225**: Detects >10 DNS queries (>150 bytes) in 30 seconds
- **SID 1000227**: Detects single DNS query >200 bytes

---

#### T1071.004: Application Layer Protocol: DNS

**Description**: Adversaries may communicate using DNS protocol to avoid detection.

**Rules Coverage**:
- **SID 1000225**: DNS Tunneling High Query Rate
- **SID 1000227**: DNS Query Excessive Length

**Detection Method**: Behavioral (volume analysis, size anomaly)

**Demo Script**: `5-dns-tunnel.sh`

**Overlap Note**: This technique overlaps with T1048 as DNS can be used for both C2 and exfiltration.

---

### TA0040 - Impact

#### T1486: Data Encrypted for Impact

**Description**: Adversaries may encrypt data on target systems to interrupt availability and demand ransom.

**Rules Coverage**:
- **SID 1000217**: Ransomware Note Detected
- **SID 1000218**: Ransomware File Extension
- **SID 1000219**: Ransomware Payment Instruction

**Detection Method**: Pattern-based (keyword combinations, file extensions)

**Demo Script**: `4-ransomware-note.sh`

**Real-World Examples**:
- WannaCry ransomware (2017)
- NotPetya ransomware (2017)
- REvil/Sodinokibi ransomware
- LockBit ransomware
- Conti ransomware

**Indicators Detected**:
- Keywords: "encrypted", "bitcoin", "decrypt", "payment", "wallet"
- File extensions: `.locked`, `.encrypted`, `.crypto`, `.cerber`, `.locky`

---

### TA0005 - Defense Evasion

#### T1027: Obfuscated Files or Information

**Description**: Adversaries may obfuscate files or information to evade detection.

**Rules Coverage**:
- **SID 1000220**: Base64 Data Exfiltration
- **SID 1000205**: Encoded PowerShell Payload

**Detection Method**: Pattern-based (Base64 regex, PowerShell flags)

**Demo Scripts**: 
- `4-ransomware-note.sh` (Base64 exfiltration)
- `5-dns-tunnel.sh` (Base64 encoding)

**Real-World Examples**:
- PowerShell Empire encoded payloads
- Base64-encoded malware droppers
- Obfuscated JavaScript malware
- Encoded command injection

---

## Additional Coverage

### T1105: Ingress Tool Transfer

**Description**: Adversaries may transfer tools or files to a compromised system.

**Rules Coverage**:
- **SID 1000200**: EICAR Test File
- **SID 1000201**: Metasploit Payload
- **SID 1000202**: Reverse Shell Command
- **SID 1000228**: PE Executable Download

**Detection Method**: 
- Pattern-based: Payload signatures
- Behavioral: File inspector (magic bytes)

**Demo Script**: `1-eicar-download.sh`

**Real-World Examples**:
- Malware droppers
- Post-exploitation tool downloads (Mimikatz, BloodHound)
- Lateral movement tools

---

## Coverage Gaps & Future Enhancements

### Not Currently Covered

**TA0003 - Persistence**
- T1053: Scheduled Task/Job
- T1543: Create or Modify System Process
- **Reason**: Requires host-based detection (not network-based)

**TA0004 - Privilege Escalation**
- T1068: Exploitation for Privilege Escalation
- **Reason**: Occurs locally on compromised host

**TA0006 - Credential Access**
- T1110: Brute Force (SSH brute force already covered by existing rules)
- T1003: OS Credential Dumping
- **Reason**: Credential dumping is host-based

**TA0007 - Discovery**
- T1046: Network Service Scanning (already covered by existing scan rules)
- T1018: Remote System Discovery

**TA0008 - Lateral Movement**
- T1021: Remote Services
- **Potential Addition**: Detect PsExec, WMI, RDP lateral movement

**TA0009 - Collection**
- T1560: Archive Collected Data
- **Potential Addition**: Detect large archive transfers

---

## Recommendations for Extended Coverage

### High Priority Additions

1. **Lateral Movement Detection**
   - SMB/RDP anomalies
   - Pass-the-Hash attacks
   - WMI command execution

2. **Credential Access**
   - Kerberoasting detection
   - NTLM relay attacks
   - LDAP credential harvesting

3. **Persistence Indicators**
   - Suspicious scheduled task creation (if detectable via network)
   - Web shell uploads

### Medium Priority Additions

4. **Discovery Techniques**
   - LDAP enumeration
   - Active Directory reconnaissance

5. **Collection Techniques**
   - Large file transfers
   - Database dumps

---

## MITRE ATT&CK Navigator Layer

To visualize this coverage in MITRE ATT&CK Navigator:

```json
{
  "name": "Snort3 Malware Detection Coverage",
  "versions": {
    "attack": "13",
    "navigator": "4.9.1",
    "layer": "4.4"
  },
  "domain": "enterprise-attack",
  "description": "Coverage of MITRE ATT&CK techniques by custom Snort3 rules",
  "techniques": [
    {"techniqueID": "T1190", "color": "#ff6666", "comment": "6 rules"},
    {"techniqueID": "T1059.004", "color": "#ff6666", "comment": "3 rules"},
    {"techniqueID": "T1071.001", "color": "#ff0000", "comment": "8 rules"},
    {"techniqueID": "T1048", "color": "#ff9999", "comment": "2 rules"},
    {"techniqueID": "T1071.004", "color": "#ff9999", "comment": "2 rules"},
    {"techniqueID": "T1486", "color": "#ff6666", "comment": "3 rules"},
    {"techniqueID": "T1027", "color": "#ffcccc", "comment": "2 rules"},
    {"techniqueID": "T1105", "color": "#ff6666", "comment": "4 rules"}
  ]
}
```

**Color Legend**:
- Dark Red (#ff0000): 8+ rules (comprehensive coverage)
- Red (#ff6666): 3-7 rules (good coverage)
- Light Red (#ff9999): 2 rules (basic coverage)
- Pink (#ffcccc): 1 rule (minimal coverage)

---

## References

- MITRE ATT&CK Framework: https://attack.mitre.org/
- ATT&CK Navigator: https://mitre-attack.github.io/attack-navigator/
- Snort3 Documentation: https://docs.snort.org/
- CVE Database: https://cve.mitre.org/
