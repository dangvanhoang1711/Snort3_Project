# Deployment Guide - Malware Detection Rules

## Overview

This guide provides step-by-step instructions for deploying the custom malware detection rules with the **NEW ARCHITECTURE** where Victim VM runs malware scripts and Kali VM acts as fake C2 server.

---

## Architecture (UPDATED)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Windows Host (Dev Machine)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Snort3_Project/                                         │  │
│  │  ├── rules/malware-detection.rules      (29 rules)      │  │
│  │  ├── backend-api/src/services/sid-map.js (29 mappings)  │  │
│  │  ├── tools/demo-malware/                (7 scripts)     │  │
│  │  └── docs/                              (4 docs)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Docker Containers                                       │  │
│  │  ├── backend-api  (reads sid-map.js)                    │  │
│  │  └── frontend     (displays alerts)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  C:\snort-logs  ←→  VirtualBox Shared Folder                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Snort VM (Ubuntu)                          │
│  /home/minhiw/snort-logs  ←  VirtualBox Shared Folder          │
│  /etc/snort/rules/test.rules  ←  Append malware-detection.rules│
│  /home/minhiw/snort3/lua/snort.lua  (config)                   │
│                                                                 │
│  Snort3 running: sudo snort -Q --daq afpacket -i enp0s3:enp0s8 │
│  Detects: OUTBOUND traffic from Victim (192.168.2.2)           │
└─────────────────────────────────────────────────────────────────┘
           ↑                                    ↓
┌──────────────────────┐            ┌──────────────────────────┐
│  Kali VM (C2 Server) │            │  Victim VM (Infected)    │
│  192.168.1.2         │  ←─────────│  192.168.2.2             │
│                      │            │                          │
│  Fake C2 Server:     │            │  Run malware scripts:    │
│  - HTTP port 8080    │            │  - 1-eicar-download.sh   │
│  - Receives C2       │            │  - 2-c2-multistage.sh    │
│  - Logs connections  │            │  - 3-shellshock-exploit  │
│                      │            │  - 4-ransomware-note.sh  │
│  setup-c2-server.sh  │            │  - 5-dns-tunnel.sh       │
└──────────────────────┘            └──────────────────────────┘
```

**Key Changes:**
- ✅ Scripts run on **Victim VM** (not Kali)
- ✅ Victim sends traffic to **Kali C2 server**
- ✅ Snort detects **outbound** malware traffic
- ✅ More realistic scenario (victim is compromised)

---

## Prerequisites

### Windows Host
- Git Bash or WSL installed
- Docker Desktop running
- VirtualBox with Snort VM, Kali VM, and Victim VM
- SCP client (PuTTY/WinSCP or native SSH)

### Snort VM
- Snort3 installed and configured
- SSH server running
- VirtualBox Guest Additions installed (for shared folder)

### Kali VM (NEW ROLE: C2 Server)
- SSH server running
- Python3 installed (for fake C2 server)
- Port 8080 available

### Victim VM (NEW ROLE: Infected Machine)
- SSH server running
- Network connectivity to Kali VM (192.168.1.2)
- curl, dig, nc installed

---

## Deployment Steps

### Step 1: Deploy Rules to Snort VM

**IMPORTANT:** Rules now detect **OUTBOUND** traffic from Victim.

**On Windows (Git Bash or WSL)**:
```bash
# Copy rules file to Snort VM
scp rules/malware-detection.rules minhiw@<snort-vm-ip>:/tmp/

# SSH into Snort VM
ssh minhiw@<snort-vm-ip>
```

**On Snort VM**:
```bash
# Backup existing rules
sudo cp /etc/snort/rules/test.rules /etc/snort/rules/test.rules.backup

# Append malware detection rules
sudo cat /tmp/malware-detection.rules >> /etc/snort/rules/test.rules

# Verify rules were added (should see $HOME_NET any -> any any)
tail -50 /etc/snort/rules/test.rules | grep "drop tcp"

# Test Snort configuration
sudo snort -c /home/minhiw/snort3/lua/snort.lua -T

# If test passes, restart Snort
sudo pkill snort
sudo snort -Q --daq afpacket -i enp0s3:enp0s8 -c /home/minhiw/snort3/lua/snort.lua -D

# Verify Snort is running
ps aux | grep snort
```

---

### Step 2: Update Backend with New SID Mappings

**On Windows**:
```bash
# Navigate to project directory
cd Snort3_Project

# Verify sid-map.js has new mappings
grep "1000200" backend-api/src/services/sid-map.js

# Rebuild backend container
docker compose down backend-api
docker compose up -d --build backend-api

# Verify backend is running
docker ps | grep backend-api

# Check backend logs
docker logs backend-api --tail 50
```

---

### Step 3: Deploy C2 Server Script to Kali VM

**On Windows (Git Bash or WSL)**:
```bash
# Copy C2 server setup script
scp tools/demo-malware/setup-c2-server.sh kali@<kali-vm-ip>:~/

# SSH into Kali VM
ssh kali@<kali-vm-ip>
```

**On Kali VM**:
```bash
# Make script executable
chmod +x ~/setup-c2-server.sh

# Test script (will start server)
./setup-c2-server.sh

# Press Ctrl+C to stop for now
# You'll start it again during demo
```

---

### Step 4: Deploy Demo Scripts to Victim VM

**On Windows (Git Bash or WSL)**:
```bash
# Copy demo scripts to Victim VM
scp tools/demo-malware/*.sh victim@<victim-vm-ip>:~/demo-malware/

# SSH into Victim VM
ssh victim@<victim-vm-ip>
```

**On Victim VM**:
```bash
# Make scripts executable
chmod +x ~/demo-malware/*.sh

# Verify scripts are present
ls -lh ~/demo-malware/

# Test connectivity to Kali C2 server
ping -c 3 192.168.1.2

# Test HTTP connectivity to C2 (should fail if C2 not running yet)
curl -I http://192.168.1.2:8080
```

---

### Step 5: Verification & Testing

#### Test 1: Start C2 Server on Kali

**On Kali VM**:
```bash
cd ~
./setup-c2-server.sh
```

**Expected Output**:
```
[C2-SERVER] Starting HTTP server on port 8080...
[C2-INFO] Serving HTTP on 0.0.0.0 port 8080
```

Leave this terminal running.

---

#### Test 2: Verify Victim Can Reach C2

**On Victim VM (new terminal)**:
```bash
# Test C2 connectivity
curl http://192.168.1.2:8080/

# Should return: <h1>C2 Server Active</h1>
```

---

#### Test 3: Run Seed Baseline

**On Victim VM**:
```bash
cd ~/demo-malware
./seed-baseline.sh
```

**Expected Result**: 
- Script completes in ~2 minutes
- Frontend shows ~80-100 new alerts
- Kali C2 server logs show incoming connections

**On Kali C2 terminal**:
```
[C2-LOG] "GET /api/check HTTP/1.1" 200 -
[C2-LOG] "POST /api/register HTTP/1.1" 200 -
```

---

#### Test 4: Run Single Demo Script

**On Victim VM**:
```bash
./1-eicar-download.sh
```

**Expected Result**:
- Script shows colored output with stages
- Frontend shows 5+ high-severity alerts
- Kali C2 logs show multiple connections
- Alert types: EICAR, PE Download, Reverse Shell, etc.

---

## Troubleshooting

### Issue: Rules Not Loading

**Symptoms**: Snort fails to start, or no alerts generated

**Solutions**:
```bash
# On Snort VM - Test configuration
sudo snort -c /home/minhiw/snort3/lua/snort.lua -T

# Check for syntax errors
sudo snort -c /home/minhiw/snort3/lua/snort.lua -T 2>&1 | grep -i error

# Verify rules direction (should be $HOME_NET any -> any any)
grep "drop tcp" /etc/snort/rules/test.rules | head -5
```

---

### Issue: C2 Server Not Reachable

**Symptoms**: `curl: (7) Failed to connect` from Victim

**Solutions**:
```bash
# On Kali - Verify C2 server is running
netstat -tuln | grep 8080

# Check firewall
sudo iptables -L -v | grep 8080

# Allow port 8080 if blocked
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT

# On Victim - Verify routing
ping 192.168.1.2
traceroute 192.168.1.2
```

---

### Issue: No Alerts from Victim Traffic

**Symptoms**: Scripts run but no alerts appear

**Solutions**:
```bash
# On Snort VM - Check if traffic is passing through
sudo tcpdump -i enp0s8 host 192.168.2.2 -c 10

# Verify Snort is detecting
tail -f /home/minhiw/snort-logs/alert_csv.txt

# Check rule direction
grep "1000200" /etc/snort/rules/test.rules
# Should show: drop tcp $HOME_NET any -> any any
```

---

### Issue: Scripts Can't Find C2_SERVER Variable

**Symptoms**: `C2_SERVER: command not found`

**Solutions**:
```bash
# On Victim - Verify scripts were updated
head -20 ~/demo-malware/1-eicar-download.sh | grep C2_SERVER

# Should show: C2_SERVER="192.168.1.2"
# If shows VICTIM="192.168.2.2", scripts weren't updated

# Re-copy updated scripts from Windows
```

---

## Demo Execution Flow

### Pre-Demo Setup (5 minutes before)

1. **On Kali VM**: Start C2 server
   ```bash
   ./setup-c2-server.sh
   ```

2. **On Snort VM**: Verify Snort running
   ```bash
   ps aux | grep snort
   ```

3. **On Windows**: Open frontend
   ```
   http://localhost:3000
   ```

4. **On Victim VM**: Open terminal, cd to demo-malware
   ```bash
   cd ~/demo-malware
   ```

---

### Demo Execution (15-20 minutes)

**Phase 1: Seed Baseline (2 min)**
```bash
# On Victim VM
./seed-baseline.sh
```

**Phase 2: Live Demos (12 min)**
```bash
# On Victim VM - run in sequence
./1-eicar-download.sh
./2-c2-multistage.sh
./3-shellshock-exploit.sh
./4-ransomware-note.sh
./5-dns-tunnel.sh
```

**Phase 3: Summary (3 min)**
- Show frontend dashboard
- Show Kali C2 server logs
- Present MITRE ATT&CK coverage

---

## Rollback Procedure

### Rollback Rules on Snort VM

```bash
# Restore backup
sudo cp /etc/snort/rules/test.rules.backup /etc/snort/rules/test.rules

# Restart Snort
sudo pkill snort
sudo snort -Q --daq afpacket -i enp0s3:enp0s8 -c /home/minhiw/snort3/lua/snort.lua -D
```

### Stop C2 Server on Kali

```bash
# Press Ctrl+C in C2 server terminal

# Or kill process
sudo fuser -k 8080/tcp
```

---

## Quick Reference

### File Locations

**Windows**:
- Rules: `Snort3_Project/rules/malware-detection.rules`
- SID Map: `Snort3_Project/backend-api/src/services/sid-map.js`
- Scripts: `Snort3_Project/tools/demo-malware/`

**Snort VM**:
- Rules: `/etc/snort/rules/test.rules`
- Config: `/home/minhiw/snort3/lua/snort.lua`
- Logs: `/home/minhiw/snort-logs/`

**Kali VM**:
- C2 Script: `~/setup-c2-server.sh`

**Victim VM**:
- Demo Scripts: `~/demo-malware/`

---

### Common Commands

**Kali VM (C2 Server)**:
```bash
# Start C2 server
./setup-c2-server.sh

# Check if running
netstat -tuln | grep 8080

# Stop C2 server
# Press Ctrl+C or: sudo fuser -k 8080/tcp
```

**Victim VM (Infected)**:
```bash
# Run all demos
cd ~/demo-malware
for script in [1-5]*.sh; do ./$script; sleep 5; done

# Run specific demo
./1-eicar-download.sh

# Test C2 connectivity
curl http://192.168.1.2:8080/
```

**Snort VM**:
```bash
# Start Snort
sudo snort -Q --daq afpacket -i enp0s3:enp0s8 -c /home/minhiw/snort3/lua/snort.lua -D

# Stop Snort
sudo pkill snort

# View logs
tail -f /home/minhiw/snort-logs/alert_csv.txt
```

**Windows**:
```bash
# Rebuild backend
docker compose up -d --build backend-api

# View logs
docker logs backend-api -f
```

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Verify C2 server is running on Kali
3. Verify Victim can reach Kali (ping, curl)
4. Check Snort logs for detection
5. Review documentation in `docs/` directory
