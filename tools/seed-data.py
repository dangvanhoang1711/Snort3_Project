#!/usr/bin/env python3
"""
Seed Data Generator - Tạo dữ liệu giả trực tiếp vào SQLite DB
Tạo ~100-150 alerts với nhiều loại tấn công khác nhau
"""

import sqlite3
import random
import time
from datetime import datetime, timedelta

# Đường dẫn DB
import os
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend-data', 'alerts.db')

# Dữ liệu mẫu
ATTACK_TYPES = [
    'Port Scan', 'ICMP Sweep', 'SYN Flood', 'UDP Flood',
    'SQL Injection', 'XSS Attack', 'Directory Traversal', 'Command Injection',
    'C2 Communication', 'Malware Download', 'Suspicious User-Agent',
    'Shellshock Exploit', 'XXE Attack', 'CSRF Attack',
    'Data Exfiltration', 'Base64 Encoded Data', 'Cleartext Credentials',
    'Ransomware Activity', 'Encrypted File Extension', 'Crypto Mining',
    'DNS Tunneling', 'DGA Domain', 'Suspicious DNS Query',
    'Brute Force', 'Password Spray', 'Privilege Escalation'
]

SEVERITIES = ['critical', 'high', 'medium', 'low']
ACTIONS = ['alert', 'drop', 'reject', 'log']
PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS']

SRC_IPS = [
    '192.168.1.100', '192.168.1.101', '192.168.1.102',
    '10.0.0.50', '10.0.0.51', '172.16.0.10',
    '203.0.113.45', '198.51.100.23', '192.0.2.100'
]

DST_IPS = [
    '192.168.1.2', '192.168.1.3', '192.168.1.10',
    '10.0.0.1', '172.16.0.1', '8.8.8.8'
]

PORTS = [22, 23, 80, 443, 3389, 8080, 3306, 5432, 6379, 27017, 9999]

# Burst clusters cố định cho toàn bộ session seed
# Mỗi cluster: (center_hours_ago, weight) — weight cao = nhiều alert hơn
_BURST_CLUSTERS = None
_CLUSTER_WEIGHTS = None

def _init_clusters(hours_ago=48):
    """Tạo 5-8 burst cluster ngẫu nhiên, cách nhau ít nhất 3h, với weight ngẫu nhiên"""
    global _BURST_CLUSTERS, _CLUSTER_WEIGHTS
    if _BURST_CLUSTERS is not None:
        return

    clusters = []
    attempts = 0
    target = random.randint(5, 8)
    while len(clusters) < target and attempts < 500:
        candidate = random.uniform(1.0, hours_ago - 1.0)
        if all(abs(candidate - c) >= 3.0 for c in clusters):
            clusters.append(candidate)
        attempts += 1

    _BURST_CLUSTERS = sorted(clusters)
    # Mỗi cluster có weight khác nhau: 1 cluster "nóng" nhất, còn lại thưa hơn
    _CLUSTER_WEIGHTS = [random.choice([0.3, 0.5, 1.0, 1.5, 2.5, 3.0]) for _ in clusters]

def generate_timestamp(hours_ago=48):
    """Timestamp rời rạc: chọn burst cluster theo weight, jitter ±5 phút"""
    _init_clusters(hours_ago)
    now = datetime.now()

    center_hours = random.choices(_BURST_CLUSTERS, weights=_CLUSTER_WEIGHTS)[0]

    # Jitter nhỏ trong cluster: std dev 2 phút, clamp ±6 phút
    jitter_minutes = random.gauss(0, 2)
    jitter_minutes = max(-6, min(6, jitter_minutes))

    offset_minutes = center_hours * 60 + jitter_minutes
    offset_minutes = max(0, min(hours_ago * 60, offset_minutes))

    return (now - timedelta(minutes=offset_minutes)).strftime('%Y-%m-%d %H:%M:%S')

def generate_timestamp_ms(hours_ago=48):
    """Timestamp milliseconds rời rạc cho aggregated alerts — dùng cùng clusters"""
    _init_clusters(hours_ago)
    now_ms = int(time.time() * 1000)

    center_hours = random.choices(_BURST_CLUSTERS, weights=_CLUSTER_WEIGHTS)[0]
    jitter_minutes = random.gauss(0, 2)
    jitter_minutes = max(-6, min(6, jitter_minutes))

    offset_ms = int((center_hours * 60 + jitter_minutes) * 60 * 1000)
    offset_ms = max(0, min(hours_ago * 3600 * 1000, offset_ms))

    return now_ms - offset_ms

def generate_alert():
    """Tạo 1 alert ngẫu nhiên"""
    attack_type = random.choice(ATTACK_TYPES)
    severity = random.choice(SEVERITIES)
    
    # Severity distribution: critical < high < medium < low
    severity_weights = [0.1, 0.2, 0.4, 0.3]
    severity = random.choices(SEVERITIES, weights=severity_weights)[0]
    
    return {
        'timestamp': generate_timestamp(48),
        'pkt_num': random.randint(1, 100000),
        'proto': random.choice(PROTOCOLS),
        'pkt_gen': 'snort',
        'pkt_len': random.randint(64, 1500),
        'dir': random.choice(['C2S', 'S2C']),
        'src_ip': random.choice(SRC_IPS),
        'src_port': random.randint(1024, 65535),
        'dst_ip': random.choice(DST_IPS),
        'dst_port': random.choice(PORTS),
        'rule_sid': random.randint(1000001, 1000999),
        'rule_msg': f'{attack_type} detected',
        'action': random.choice(ACTIONS),
        'attack_type': attack_type,
        'severity': severity,
        'raw_rule': f'alert tcp any any -> any any (msg:"{attack_type}"; sid:{random.randint(1000001, 1000999)};)'
    }

def generate_aggregated_alert():
    """Tạo 1 aggregated alert ngẫu nhiên"""
    attack_type = random.choice(ATTACK_TYPES)
    severity_weights = [0.1, 0.2, 0.4, 0.3]
    severity = random.choices(SEVERITIES, weights=severity_weights)[0]
    
    first_seen = generate_timestamp_ms()
    # last_seen là sau first_seen một khoảng ngẫu nhiên (5 phút đến 2 giờ)
    last_seen = first_seen + random.randint(5 * 60 * 1000, 2 * 3600 * 1000)
    now_ms = int(time.time() * 1000)
    if last_seen > now_ms:
        last_seen = now_ms
    
    return {
        'src_ip': random.choice(SRC_IPS),
        'dst_ip': random.choice(DST_IPS),
        'dst_port': random.choice(PORTS),
        'attack_type': attack_type,
        'rule_sid': random.randint(1000001, 1000999),
        'severity': severity,
        'action': random.choice(ACTIONS),
        'proto': random.choice(PROTOCOLS),
        'count': random.randint(1, 50),
        'first_seen': first_seen,
        'last_seen': last_seen
    }

def seed_database(num_alerts=100, num_aggregated=80):
    """Seed database với dữ liệu giả"""
    print("╔════════════════════════════════════════════════════════════╗")
    print("║           SEED DATA GENERATOR - SNORT3 PROJECT            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Xóa dữ liệu cũ (optional)
        print("[*] Clearing old data...")
        cursor.execute("DELETE FROM alerts")
        cursor.execute("DELETE FROM alerts_aggregated")
        conn.commit()
        print("[✓] Old data cleared")
        print()
        
        # Insert alerts
        print(f"[*] Inserting {num_alerts} alerts...")
        for i in range(num_alerts):
            alert = generate_alert()
            cursor.execute("""
                INSERT INTO alerts (
                    timestamp, pkt_num, proto, pkt_gen, pkt_len, dir,
                    src_ip, src_port, dst_ip, dst_port,
                    rule_sid, rule_msg, action, attack_type, severity, raw_rule
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert['timestamp'], alert['pkt_num'], alert['proto'],
                alert['pkt_gen'], alert['pkt_len'], alert['dir'],
                alert['src_ip'], alert['src_port'], alert['dst_ip'], alert['dst_port'],
                alert['rule_sid'], alert['rule_msg'], alert['action'],
                alert['attack_type'], alert['severity'], alert['raw_rule']
            ))
            
            if (i + 1) % 20 == 0:
                print(f"    [{i + 1}/{num_alerts}] alerts inserted...")
        
        conn.commit()
        print(f"[✓] {num_alerts} alerts inserted successfully")
        print()
        
        # Insert aggregated alerts
        print(f"[*] Inserting {num_aggregated} aggregated alerts...")
        for i in range(num_aggregated):
            agg = generate_aggregated_alert()
            cursor.execute("""
                INSERT INTO alerts_aggregated (
                    src_ip, dst_ip, dst_port, attack_type, rule_sid,
                    severity, action, proto, count, first_seen, last_seen
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agg['src_ip'], agg['dst_ip'], agg['dst_port'],
                agg['attack_type'], agg['rule_sid'], agg['severity'],
                agg['action'], agg['proto'], agg['count'],
                agg['first_seen'], agg['last_seen']
            ))
            
            if (i + 1) % 20 == 0:
                print(f"    [{i + 1}/{num_aggregated}] aggregated alerts inserted...")
        
        conn.commit()
        print(f"[✓] {num_aggregated} aggregated alerts inserted successfully")
        print()
        
        # Statistics
        cursor.execute("SELECT COUNT(*) FROM alerts")
        total_alerts = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM alerts_aggregated")
        total_agg = cursor.fetchone()[0]
        
        cursor.execute("SELECT severity, COUNT(*) FROM alerts_aggregated GROUP BY severity")
        severity_stats = cursor.fetchall()
        
        cursor.execute("SELECT attack_type, COUNT(*) FROM alerts_aggregated GROUP BY attack_type ORDER BY COUNT(*) DESC LIMIT 5")
        top_attacks = cursor.fetchall()
        
        conn.close()
        
        # Print summary
        print("╔════════════════════════════════════════════════════════════╗")
        print("║                  SEEDING COMPLETED                         ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print()
        print(f"[✓] Total alerts: {total_alerts}")
        print(f"[✓] Total aggregated alerts: {total_agg}")
        print()
        print("Severity Distribution:")
        for sev, count in severity_stats:
            print(f"    - {sev}: {count}")
        print()
        print("Top 5 Attack Types:")
        for attack, count in top_attacks:
            print(f"    - {attack}: {count}")
        print()
        print("[*] Database ready! Start your backend server to view data.")
        print()
        
    except sqlite3.Error as e:
        print(f"[✗] Database error: {e}")
        return False
    except Exception as e:
        print(f"[✗] Error: {e}")
        return False
    
    return True

if __name__ == '__main__':
    import sys
    
    # Parse arguments
    num_alerts = 100
    num_aggregated = 80
    
    if len(sys.argv) > 1:
        try:
            num_alerts = int(sys.argv[1])
        except ValueError:
            print("Usage: python3 seed-data.py [num_alerts] [num_aggregated]")
            sys.exit(1)
    
    if len(sys.argv) > 2:
        try:
            num_aggregated = int(sys.argv[2])
        except ValueError:
            print("Usage: python3 seed-data.py [num_alerts] [num_aggregated]")
            sys.exit(1)
    
    success = seed_database(num_alerts, num_aggregated)
    sys.exit(0 if success else 1)
