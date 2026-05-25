# Deployment Guide - Malware Detection Rules

## Overview

This guide provides step-by-step instructions for deploying the custom malware detection rules from the Windows development environment to the Snort VM and Kali VM for demonstration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Windows Host (Dev Machine)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Snort3_Project/                                         │  │
│  │  ├── rules/malware-detection.rules      (29 rules)      │  │
│  │  ├── backend-api/src/services/sid-map.js (29 mappings)  │  │
│  │  ├── tools/demo-malware/                (6 scripts)     │  │
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
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Kali VM (Attacker)                         │
│  ~/demo-malware/  ←  Copy scripts from Windows                 │
│  ├── seed-baseline.sh                                          │
│  ├── 1-eicar-download.sh                                       │
│  ├── 2-c2-multistage.sh                                        │
│  ├── 3-shellshock-exploit.sh                                   │
│  ├── 4-ransomware-note.sh                                      │
│  └── 5-dns-tunnel.sh                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Windows Host
- Git Bash or WSL installed
- Docker Desktop running
- VirtualBox with Snort VM and Kali VM
- SCP client (PuTTY/WinSCP or native SSH)

### Snort VM
- Snort3 installed and configured
- SSH server running
- VirtualBox Guest Additions installed (for shared folder)

### Kali VM
- SSH server running
- Network connectivity to Victim VM (192.168.2.2)

---

## Deployment Steps

### Step 1: Deploy Rules to Snort VM

#### Option A: Using SCP (Recommended)

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

# Verify rules were added
tail -50 /etc/snort/rules/test.rules

# Test Snort configuration
sudo snort -c /home/minhiw/snort3/lua/snort.lua -T

# If test passes, restart Snort
sudo pkill snort
sudo snort -Q --daq afpacket -i enp0s3:enp0s8 -c /home/minhiw/snort3/lua/snort.lua -D

# Verify Snort is running
ps aux | grep snort
```

#### Option B: Using Shared Folder

**On Windows**:
```bash
# Copy rules to a shared location
cp rules/malware-detection.rules C:\SharedWithVM\
```

**On Snort VM**:
```bash
# Mount shared folder (if not auto-mounted)
sudo mount -t vboxsf SharedWithVM /mnt/shared

# Copy rules
sudo cat /mnt/shared/malware-detection.rules >> /etc/snort/rules/test.rules

# Continue with verification steps from Option A
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

**Expected Output**:
```
Server running on port 5000
Connected to SQLite database
Watching for new log files in /app/snort-logs
```

---

### Step 3: Deploy Demo Scripts to Kali VM

#### Option A: Using SCP

**On Windows (Git Bash or WSL)**:
```bash
# Copy entire demo-malware directory
scp -r tools/demo-malware/ kali@<kali-vm-ip>:~/

# SSH into Kali VM
ssh kali@<kali-vm-ip>
```

**On Kali VM**:
```bash
# Make scripts executable
chmod +x ~/demo-malware/*.sh

# Verify scripts are present
ls -lh ~/demo-malware/

# Test connectivity to victim
ping -c 3 192.168.2.2

# Test HTTP connectivity
curl -I http://192.168.2.2
```

#### Option B: Using Shared Folder

**On Windows**:
```bash
# Copy to shared location
cp -r tools/demo-malware/ C:\SharedWithKali\
```

**On Kali VM**:
```bash
# Mount and copy
sudo mount -t vboxsf SharedWithKali /mnt/shared
cp -r /mnt/shared/demo-malware ~/
chmod +x ~/demo-malware/*.sh
```

---

### Step 4: Verification & Testing

#### Test 1: Verify Snort is Detecting

**On Kali VM**:
```bash
# Run a simple test
curl http://192.168.2.2/test
```

**On Snort VM**:
```bash
# Check if alert was logged
tail -5 /home/minhiw/snort-logs/alert_csv.txt
```

**On Windows**:
```bash
# Check if alert appears in frontend
# Open http://localhost:3000
# Should see alert within 5 seconds
```

#### Test 2: Run Seed Baseline

**On Kali VM**:
```bash
cd ~/demo-malware
./seed-baseline.sh
```

**Expected Result**: 
- Script completes in ~2 minutes
- Frontend shows ~80-100 new alerts
- Mix of severity levels

#### Test 3: Run Single Demo Script

**On Kali VM**:
```bash
./1-eicar-download.sh
```

**Expected Result**:
- Script shows colored output with stages
- Frontend shows 5+ high-severity alerts
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

# Verify rules file exists
ls -lh /etc/snort/rules/test.rules

# Check if rules were appended
grep "1000200" /etc/snort/rules/test.rules
```

---

### Issue: Backend Not Showing New Alerts

**Symptoms**: Frontend doesn't update, or shows "Unknown" attack types

**Solutions**:
```bash
# On Windows - Check backend logs
docker logs backend-api --tail 100

# Verify sid-map.js was updated
docker exec backend-api cat /app/src/services/sid-map.js | grep 1000200

# Restart backend
docker compose restart backend-api

# Clear browser cache
# Ctrl+Shift+R in browser
```

---

### Issue: Scripts Can't Connect to Victim

**Symptoms**: `curl: (7) Failed to connect` or timeout errors

**Solutions**:
```bash
# On Kali VM - Verify network
ping 192.168.2.2

# Check routing
ip route

# Verify victim services are running
nmap -p 22,23,80,3128 192.168.2.2

# On Victim VM - Check firewall
sudo iptables -L -v

# Check Apache is running
sudo systemctl status apache2
```

---

### Issue: Shared Folder Not Working

**Symptoms**: `/home/minhiw/snort-logs` is empty on Snort VM

**Solutions**:
```bash
# On Snort VM - Check mount
mount | grep vboxsf

# Remount if needed
sudo umount /home/minhiw/snort-logs
sudo mount -t vboxsf snort-logs /home/minhiw/snort-logs

# Verify permissions
ls -ld /home/minhiw/snort-logs

# On Windows - Check VirtualBox settings
# VM Settings → Shared Folders → Verify "snort-logs" exists
# Auto-mount should be enabled
```

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

### Rollback Backend on Windows

```bash
# Revert sid-map.js changes
git checkout backend-api/src/services/sid-map.js

# Rebuild backend
docker compose up -d --build backend-api
```

---

## Performance Tuning

### Snort VM Optimization

```bash
# Increase Snort memory limit (if needed)
# Edit /home/minhiw/snort3/lua/snort.lua
# Add: memory = { cap = 2048 }

# Enable fast pattern matcher
# Add: search_engine = { search_method = 'ac_full' }

# Adjust detection filter thresholds
# Edit rules if too many false positives
```

### Backend Optimization

```bash
# Increase log polling interval (if CPU high)
# Edit backend-api/src/services/forwarder.js
# Change: POLL_INTERVAL = 5000 (to 10000)

# Limit alert retention
# Edit backend-api/src/db/index.js
# Add cleanup job for old alerts
```

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review false positives in frontend
- Adjust detection_filter thresholds if needed
- Check Snort VM disk space: `df -h`

**Monthly**:
- Update Snort3 to latest version
- Review and update rules for new threats
- Backup rules and configuration

**As Needed**:
- Add new rules for emerging threats
- Update SID mappings in backend
- Tune performance based on network load

---

## Security Considerations

### Snort VM
- Keep Snort3 updated
- Restrict SSH access (key-based auth only)
- Monitor Snort logs for anomalies
- Regular security patches

### Kali VM
- Use only for testing/demo
- Isolate from production networks
- Don't run demo scripts against real targets
- Keep tools updated

### Windows Host
- Keep Docker updated
- Use strong passwords for VMs
- Backup project regularly
- Don't expose frontend to internet

---

## Quick Reference

### File Locations

**Windows**:
- Rules: `Snort3_Project/rules/malware-detection.rules`
- SID Map: `Snort3_Project/backend-api/src/services/sid-map.js`
- Scripts: `Snort3_Project/tools/demo-malware/`
- Docs: `Snort3_Project/docs/`

**Snort VM**:
- Rules: `/etc/snort/rules/test.rules`
- Config: `/home/minhiw/snort3/lua/snort.lua`
- Logs: `/home/minhiw/snort-logs/`

**Kali VM**:
- Scripts: `~/demo-malware/`

### Common Commands

**Snort VM**:
```bash
# Start Snort
sudo snort -Q --daq afpacket -i enp0s3:enp0s8 -c /home/minhiw/snort3/lua/snort.lua -D

# Stop Snort
sudo pkill snort

# Test config
sudo snort -c /home/minhiw/snort3/lua/snort.lua -T

# View logs
tail -f /home/minhiw/snort-logs/alert_csv.txt
```

**Windows**:
```bash
# Rebuild backend
docker compose up -d --build backend-api

# View logs
docker logs backend-api -f

# Reset database
docker exec -it backend-api npm run db:reset
```

**Kali VM**:
```bash
# Run all demos
cd ~/demo-malware
for script in *.sh; do ./$script; sleep 5; done

# Run specific demo
./1-eicar-download.sh
```

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs (Snort, backend, frontend)
3. Verify network connectivity
4. Check documentation in `docs/` directory
