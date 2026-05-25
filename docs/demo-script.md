# Malware Detection Demo Script (15-20 minutes)

## Pre-Demo Checklist

### On Kali VM (C2 Server)
- [ ] C2 server running: `./setup-c2-server.sh`
- [ ] Server listening on port 8080: `netstat -tuln | grep 8080`
- [ ] Firewall allows port 8080

### On Victim VM (Infected Machine)
- [ ] Demo scripts copied to `~/demo-malware/`
- [ ] Scripts executable: `chmod +x ~/demo-malware/*.sh`
- [ ] Kali reachable: `ping 192.168.1.2`
- [ ] C2 server reachable: `curl http://192.168.1.2:8080`



### On Snort VM
- [ ] Snort3 running in IPS mode: `sudo snort -Q --daq afpacket -i enp0s3:enp0s8 -c /home/minhiw/snort3/lua/snort.lua`
- [ ] Malware detection rules loaded: `cat /etc/snort/rules/test.rules | grep 1000200`
- [ ] Logs writing to shared folder: `ls -lh /home/minhiw/snort-logs/`

### On Windows Host
- [ ] Backend running: `docker ps | grep backend-api`
- [ ] Frontend accessible: Open http://localhost:3000
- [ ] Dashboard showing baseline data

### On Victim VM
- [ ] Demo scripts copied to `~/demo-malware/`
- [ ] Scripts executable: `chmod +x ~/demo-malware/*.sh`
- [ ] Victim reachable: `ping 192.168.2.2`

---

## Demo Flow (Total: 15-20 minutes)

### Introduction (2 minutes)

**Script**:
> "Today I'll demonstrate a Snort3 IPS deployment with custom malware detection rules. The system uses a hybrid approach: 70% pattern-based detection for known signatures, and 30% behavioral detection for advanced threats."

**Show**:
- Network topology diagram
- Frontend dashboard (baseline data from seed script)

**Key Points**:
- 29 custom rules covering 7 MITRE ATT&CK techniques
- Real-time detection with <1 second latency
- Inline IPS mode (drops malicious traffic)

---

### Phase 1: Seed Baseline Data (2 minutes)

**On Victim VM**:
```bash
cd ~/demo-malware
./seed-baseline.sh
```

**Narration**:
> "First, I'm seeding the system with baseline traffic to simulate a realistic environment. This includes normal HTTP requests, port scans, and low-volume malware indicators."

**Show on Frontend**:
- Alert count increasing in real-time
- Mix of severity levels (high/medium/low)
- Various attack types appearing

**Expected Result**: ~80-100 alerts in 2 minutes

---

### Phase 2: Live Attack Demonstrations (12 minutes)

#### Demo 1: Malware Payload Download (2.5 minutes)

**On Victim VM**:
```bash
./1-eicar-download.sh
```

**Narration**:
> "This script simulates a malware infection chain: downloading the EICAR test file, deploying reverse shells, and installing backdoors. Watch the dashboard for multiple high-severity alerts."

**Show on Frontend**:
- Filter by severity: High
- Point out specific alerts:
  - EICAR Test File
  - PE Executable Download
  - Reverse Shell Command
  - Netcat Backdoor
  - Python Reverse Shell

**Technical Highlight**:
- Pattern-based detection (content matching)
- File inspector (magic byte analysis)

**Expected Alerts**: 5 high-severity alerts

---

#### Demo 2: C2 Multi-Stage Beacon (3 minutes)

**On Victim VM**:
```bash
./2-c2-multistage.sh
```

**Narration**:
> "This demonstrates behavioral detection using Snort3's flowbits feature. The bot registers with the C2 server, then sends periodic beacons. Notice how Snort tracks the entire attack lifecycle."

**Show on Frontend**:
- Filter by attack type: "C2"
- Show sequence of alerts:
  1. C2 Beacon Registration (no alert - sets flowbit)
  2. C2 Active Beacon (5 alerts - flowbit triggered)
  3. C2 Command Execution (8 alerts)
  4. Periodic C2 Beacon (1 alert - rate-based)

**Technical Highlight**:
- Stateful detection (flowbits)
- Rate-based detection (threshold)
- Reduces false positives

**Expected Alerts**: 14+ alerts (5 beacons + 8 commands + 1 heartbeat)

---

#### Demo 3: Web Application Exploitation (2.5 minutes)

**On Victim VM**:
```bash
./3-shellshock-exploit.sh
```

**Narration**:
> "Now we're testing exploit detection. This script attempts Shellshock, SQL injection, directory traversal, command injection, XXE, and Log4Shell exploits."

**Show on Frontend**:
- Filter by attack type: "Exploit" or "Injection"
- Point out CVE coverage:
  - CVE-2014-6271 (Shellshock)
  - CVE-2021-44228 (Log4Shell)

**Technical Highlight**:
- PCRE regex for complex patterns
- HTTP header/URI inspection
- Multiple exploit families covered

**Expected Alerts**: 20+ alerts (multiple payloads per exploit type)

---

#### Demo 4: Ransomware Behavior (2 minutes)

**On Victim VM**:
```bash
./4-ransomware-note.sh
```

**Narration**:
> "Ransomware detection focuses on behavioral indicators: encrypted file extensions, ransom notes with bitcoin keywords, and credential harvesting."

**Show on Frontend**:
- Filter by attack type: "Ransomware"
- Show alerts:
  - Ransomware File Extension (multiple)
  - Ransomware Note Detected
  - Ransomware Payment Instruction
  - Base64 Data Exfiltration
  - Cleartext Credential Leak

**Technical Highlight**:
- Keyword proximity matching
- File extension patterns
- Data exfiltration detection

**Expected Alerts**: 15+ alerts

---

#### Demo 5: DNS Tunneling & Exfiltration (2 minutes)

**On Victim VM**:
```bash
./5-dns-tunnel.sh
```

**Narration**:
> "Finally, DNS tunneling for data exfiltration. This uses oversized DNS queries and high query rates to bypass traditional firewalls."

**Show on Frontend**:
- Filter by attack type: "DNS"
- Show alerts:
  - DNS Query Excessive Length (5 alerts)
  - DNS Tunneling High Rate (1 alert)
  - Base64 Data Exfiltration (1 alert)

**Technical Highlight**:
- Protocol anomaly detection
- Rate-based detection
- Covert channel identification

**Expected Alerts**: 7+ alerts

---

### Phase 3: Summary & Q&A (3 minutes)

**Show on Frontend**:
1. **Total Alerts**: ~150-200 alerts generated
2. **Severity Distribution**: Pie chart (High/Medium/Low)
3. **Attack Type Distribution**: Bar chart
4. **Timeline**: Show alert frequency over time

**Key Metrics**:
- Detection rate: 100% (all attacks detected)
- False positive rate: <5% (baseline traffic)
- Average detection latency: <1 second
- System performance impact: <10% CPU

**MITRE ATT&CK Coverage**:
| Technique ID | Technique Name | Rules |
|--------------|----------------|-------|
| T1071.001 | Web Protocols (C2) | 1000206-1000210, 1000222-1000224 |
| T1105 | Ingress Tool Transfer | 1000200-1000202, 1000228 |
| T1190 | Exploit Public-Facing App | 1000211-1000216 |
| T1486 | Data Encrypted for Impact | 1000217-1000219 |
| T1048 | Exfiltration Over Alt Protocol | 1000225, 1000227 |
| T1059.004 | Unix Shell | 1000202-1000204 |
| T1027 | Obfuscated Files/Info | 1000220 |

**Conclusion**:
> "This demo showcased Snort3's capabilities for detecting modern malware using both signature-based and behavioral techniques. The system provides real-time visibility and inline blocking, making it suitable for production SOC environments."

---

## Troubleshooting

### No Alerts Appearing
1. Check Snort is running: `ps aux | grep snort`
2. Check logs are being written: `ls -lh /home/minhiw/snort-logs/`
3. Check backend is reading logs: `docker logs backend-api`
4. Check frontend WebSocket connection: Browser DevTools → Network → WS

### Scripts Fail to Connect
1. Verify victim IP: `ping 192.168.2.2`
2. Check victim services: `nmap -p 22,23,80,3128 192.168.2.2`
3. Check Snort bridge is forwarding: `sudo iptables -L -v`

### Too Many/Too Few Alerts
- Adjust detection_filter thresholds in rules
- Check for duplicate rule includes
- Verify SID map matches rules

---

## Post-Demo Cleanup

### Reset for Next Demo
```bash
# On Windows
docker exec -it backend-api npm run db:reset

# On Snort VM
sudo rm /home/minhiw/snort-logs/*.csv

# On Victim VM
# (no cleanup needed - scripts are stateless)
```

### Save Demo Results
```bash
# Export alerts to CSV
curl http://localhost:5000/api/alerts?limit=1000 > demo-results.json
```

---

## Tips for Effective Presentation

1. **Practice timing**: Run through once before live demo
2. **Have backup**: Screenshots of expected results
3. **Explain as you go**: Don't just run scripts silently
4. **Highlight key features**: Flowbits, rate-based detection, file inspection
5. **Connect to real-world**: Mention actual malware families (Cobalt Strike, ransomware)
6. **Show technical depth**: Briefly explain Snort3 syntax improvements
7. **Engage audience**: Ask if they've encountered similar attacks

---

## Advanced Demo Options

### Option 1: Show Rule Tuning
- Demonstrate adjusting detection_filter threshold
- Show before/after false positive rate

### Option 2: Show Inline Blocking
- Run script, show traffic is dropped
- Verify victim doesn't receive malicious payload

### Option 3: Show Performance Impact
- Monitor Snort CPU/memory before and after
- Show minimal performance degradation

### Option 4: Compare with Snort2
- Show same attack against Snort2 (if available)
- Highlight Snort3 improvements (sticky buffers, flowbits)
