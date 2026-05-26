#!/usr/bin/env python3
"""
Seed Data Generator - Enhanced SOC-like realistic data
- Increased HIGH + CRITICAL alerts
- More realistic attack patterns
- SOC-style log behavior simulation
"""

import sqlite3
import random
import time
import os
from datetime import datetime, timedelta

# =========================
# DB PATH
# =========================
DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'backend-data',
    'alerts.db'
)

# =========================
# ATTACK TYPES
# =========================
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
PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS']
ACTIONS = ['alert', 'drop', 'reject']

# =========================
# SEVERITY BIAS (IMPORTANT)
# critical + high dominates
# =========================
SEVERITY_WEIGHTS = [0.28, 0.42, 0.20, 0.10]  # critical, high, medium, low

# =========================
# REALISTIC IPS
# =========================
def random_ip(prefix=None):
    if prefix:
        return f'{prefix}.{random.randint(1, 254)}'
    return f'{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}'


def generate_src_ips():
    count = random.randint(35, 70)
    ips = set()

    internal = ['192.168.1', '192.168.2', '10.0.0', '10.0.1']
    suspicious = [
        '45.33.32', '185.220.101', '91.121.0',
        '198.51.100', '103.21.244', '172.105.0',
        '64.225.0', '139.59.0', '146.70.0'
    ]

    prefixes = internal + suspicious

    while len(ips) < count:
        ips.add(random_ip(random.choice(prefixes)))

    return list(ips)


SRC_IPS = generate_src_ips()

DST_IPS = [
    '192.168.1.2', '192.168.1.3', '192.168.1.10',
    '10.0.0.1', '172.16.0.1', '8.8.8.8'
]

PORTS = [22, 23, 80, 443, 3389, 8080, 3306, 5432, 6379, 27017]


# =========================
# BURST CLUSTERS
# =========================
_BURST_CLUSTERS = None
_CLUSTER_WEIGHTS = None


def _init_clusters(hours_ago=48):
    global _BURST_CLUSTERS, _CLUSTER_WEIGHTS
    if _BURST_CLUSTERS is not None:
        return

    clusters = []
    target = random.randint(6, 10)

    while len(clusters) < target:
        candidate = random.uniform(1, hours_ago - 1)
        if all(abs(candidate - c) > 2.5 for c in clusters):
            clusters.append(candidate)

    _BURST_CLUSTERS = sorted(clusters)

    _CLUSTER_WEIGHTS = [
        random.choice([0.5, 1.0, 1.5, 2.0, 3.0, 4.0])
        for _ in clusters
    ]


# =========================
# TIMESTAMP GENERATION
# =========================
def generate_timestamp(hours_ago=48):
    _init_clusters(hours_ago)
    now = datetime.now()

    center = random.choices(_BURST_CLUSTERS, weights=_CLUSTER_WEIGHTS)[0]

    jitter = max(-6, min(6, random.gauss(0, 2)))
    offset = max(0, min(hours_ago * 60, center * 60 + jitter))

    return (now - timedelta(minutes=offset)).strftime('%Y-%m-%d %H:%M:%S')


def generate_timestamp_ms(hours_ago=48):
    _init_clusters(hours_ago)
    now_ms = int(time.time() * 1000)

    center = random.choices(_BURST_CLUSTERS, weights=_CLUSTER_WEIGHTS)[0]

    jitter = max(-6, min(6, random.gauss(0, 2)))

    offset_ms = int((center * 60 + jitter) * 60 * 1000)
    offset_ms = max(0, min(hours_ago * 3600 * 1000, offset_ms))

    return now_ms - offset_ms


# =========================
# RULE MESSAGE MAP (REALISTIC SOC STYLE)
# =========================
RULE_MSG_MAP = {
    'Port Scan': 'Nmap-style network reconnaissance detected',
    'ICMP Sweep': 'ICMP host discovery activity detected',
    'SYN Flood': 'Possible SYN flood DDoS pattern detected',
    'UDP Flood': 'UDP amplification attack suspected',
    'SQL Injection': 'SQL injection payload detected in HTTP request',
    'XSS Attack': 'Cross-site scripting attempt detected',
    'Directory Traversal': 'Path traversal exploit attempt detected',
    'Command Injection': 'Remote command execution attempt detected',
    'C2 Communication': 'Possible command-and-control beaconing detected',
    'Malware Download': 'Suspicious executable download observed',
    'Brute Force': 'Repeated authentication failures detected',
    'Password Spray': 'Credential spraying attack pattern detected',
    'DNS Tunneling': 'Anomalous DNS tunneling activity detected',
    'DGA Domain': 'Domain generation algorithm behavior detected',
    'Privilege Escalation': 'Unauthorized privilege escalation attempt detected'
}


# =========================
# ALERT GENERATOR
# =========================
def generate_alert():
    attack_type = random.choice(ATTACK_TYPES)

    severity = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS)[0]

    proto = random.choice(PROTOCOLS)

    rule_msg = RULE_MSG_MAP.get(
        attack_type,
        f'{attack_type} activity detected'
    )

    return {
        'timestamp': generate_timestamp(48),
        'pkt_num': random.randint(1, 800000),
        'proto': proto,
        'pkt_gen': 'snort',
        'pkt_len': random.randint(64, 2000),
        'dir': random.choice(['C2S', 'S2C']),

        'src_ip': random.choice(SRC_IPS),
        'src_port': random.randint(1024, 65535),
        'dst_ip': random.choice(DST_IPS),
        'dst_port': random.choice(PORTS),

        'rule_sid': random.randint(1000001, 1000999),
        'rule_msg': rule_msg,
        'action': random.choices(ACTIONS, weights=[0.6, 0.3, 0.1])[0],

        'attack_type': attack_type,
        'severity': severity,

        'raw_rule': f'alert {random.choice(["tcp","udp"])} any any -> any any '
                    f'(msg:"{rule_msg}"; sid:{random.randint(1000001, 1000999)};)'
    }


# =========================
# AGGREGATED ALERTS
# =========================
def generate_aggregated_alert():
    attack_type = random.choice(ATTACK_TYPES)

    severity = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS)[0]

    first_seen = generate_timestamp_ms()

    duration = random.randint(5 * 60 * 1000, 6 * 3600 * 1000)

    last_seen = min(first_seen + duration, int(time.time() * 1000))

    return {
        'src_ip': random.choice(SRC_IPS),
        'dst_ip': random.choice(DST_IPS),
        'dst_port': random.choice(PORTS),

        'attack_type': attack_type,
        'rule_sid': random.randint(1000001, 1000999),

        'severity': severity,
        'action': random.choices(ACTIONS, weights=[0.6, 0.3, 0.1])[0],
        'proto': random.choice(PROTOCOLS),

        'count': random.randint(5, 150),

        'first_seen': first_seen,
        'last_seen': last_seen
    }


# =========================
# SEED DATABASE
# =========================
def seed_database(num_alerts=120, num_aggregated=90):
    print("╔════════════════════════════════════════════════════════════╗")
    print("║      ENHANCED SEED DATA GENERATOR - SOC SIMULATION        ║")
    print("╚════════════════════════════════════════════════════════════╝\n")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        print("[*] Clearing old data...")
        cursor.execute("DELETE FROM alerts")
        cursor.execute("DELETE FROM alerts_aggregated")
        conn.commit()
        print("[✓] Database cleared\n")

        # =========================
        # INSERT ALERTS
        # =========================
        print(f"[*] Inserting {num_alerts} alerts...")

        for i in range(num_alerts):
            a = generate_alert()

            cursor.execute("""
                INSERT INTO alerts (
                    timestamp, pkt_num, proto, pkt_gen, pkt_len, dir,
                    src_ip, src_port, dst_ip, dst_port,
                    rule_sid, rule_msg, action, attack_type, severity, raw_rule
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                a['timestamp'], a['pkt_num'], a['proto'], a['pkt_gen'],
                a['pkt_len'], a['dir'], a['src_ip'], a['src_port'],
                a['dst_ip'], a['dst_port'], a['rule_sid'], a['rule_msg'],
                a['action'], a['attack_type'], a['severity'], a['raw_rule']
            ))

            if (i + 1) % 25 == 0:
                print(f"    [{i+1}/{num_alerts}] inserted")

        conn.commit()
        print(f"[✓] Alerts inserted: {num_alerts}\n")

        # =========================
        # INSERT AGGREGATED
        # =========================
        print(f"[*] Inserting {num_aggregated} aggregated alerts...")

        for i in range(num_aggregated):
            a = generate_aggregated_alert()

            cursor.execute("""
                INSERT INTO alerts_aggregated (
                    src_ip, dst_ip, dst_port, attack_type, rule_sid,
                    severity, action, proto, count, first_seen, last_seen
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                a['src_ip'], a['dst_ip'], a['dst_port'],
                a['attack_type'], a['rule_sid'], a['severity'],
                a['action'], a['proto'], a['count'],
                a['first_seen'], a['last_seen']
            ))

            if (i + 1) % 25 == 0:
                print(f"    [{i+1}/{num_aggregated}] inserted")

        conn.commit()

        # =========================
        # STATS
        # =========================
        cursor.execute("SELECT COUNT(*) FROM alerts")
        total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM alerts_aggregated")
        total_agg = cursor.fetchone()[0]

        cursor.execute("""
            SELECT severity, COUNT(*) 
            FROM alerts_aggregated 
            GROUP BY severity
        """)
        sev_stats = cursor.fetchall()

        cursor.execute("""
            SELECT attack_type, COUNT(*) 
            FROM alerts_aggregated 
            GROUP BY attack_type 
            ORDER BY COUNT(*) DESC 
            LIMIT 5
        """)
        top = cursor.fetchall()

        conn.close()

        print("\n╔════════════════════════════════════════════════════════════╗")
        print("║                     SEED COMPLETED                         ║")
        print("╚════════════════════════════════════════════════════════════╝\n")

        print(f"Total alerts: {total}")
        print(f"Total aggregated: {total_agg}\n")

        print("Severity distribution:")
        for s, c in sev_stats:
            print(f"  - {s}: {c}")

        print("\nTop attack types:")
        for a, c in top:
            print(f"  - {a}: {c}")

        print("\n[✓] Ready for SOC dashboard visualization 🚀")

        return True

    except Exception as e:
        print(f"[ERROR] {e}")
        return False


# =========================
# CLI
# =========================
if __name__ == '__main__':
    import sys

    num_alerts = 120
    num_aggregated = 90

    if len(sys.argv) > 1:
        num_alerts = int(sys.argv[1])
    if len(sys.argv) > 2:
        num_aggregated = int(sys.argv[2])

    success = seed_database(num_alerts, num_aggregated)
    exit(0 if success else 1)
