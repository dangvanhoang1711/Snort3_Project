# Database Schema

Database: SQLite (file path configured via DB_PATH in .env)

Table: alerts

Columns:
- id INTEGER PRIMARY KEY AUTOINCREMENT
- timestamp TEXT NOT NULL         -- original timestamp string from Snort CSV
- pkt_num INTEGER                 -- packet number
- proto TEXT                      -- protocol (TCP/UDP/ICMP)
- pkt_gen TEXT                    -- packet generator field
- pkt_len INTEGER                 -- packet length
- dir TEXT                        -- direction
- src_ip TEXT                     -- source IP
- src_port INTEGER                -- source port
- dst_ip TEXT                     -- destination IP
- dst_port INTEGER                -- destination port
- rule_sid INTEGER                -- Snort rule SID
- rule_msg TEXT                   -- rule message
- action TEXT                     -- action (drop / alert / pass)
- attack_type TEXT                -- mapped attack type
- raw_rule TEXT                   -- raw rule field as received
- created_at TEXT DEFAULT current timestamp

Indexes:
- idx_alerts_timestamp ON alerts(timestamp)
- idx_alerts_src_ip ON alerts(src_ip)
- idx_alerts_dst_ip ON alerts(dst_ip)
- idx_alerts_attack_type ON alerts(attack_type)
