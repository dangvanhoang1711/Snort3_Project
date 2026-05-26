# Database Schema

Database: SQLite (file path configured via DB_PATH in .env)

Primary table: alerts_aggregated

Columns:
- id INTEGER PRIMARY KEY AUTOINCREMENT
- src_ip TEXT                     -- source IP
- dst_ip TEXT                     -- destination IP
- dst_port INTEGER                -- destination port
- rule_sid INTEGER                -- Snort rule SID
- action TEXT                     -- action (drop / alert / pass)
- attack_type TEXT                -- mapped attack type
- severity TEXT                   -- high / medium / low
- proto TEXT                      -- protocol (TCP/UDP/ICMP)
- count INTEGER DEFAULT 1         -- aggregated packet/event count
- first_seen INTEGER              -- first event timestamp in milliseconds
- last_seen INTEGER               -- latest event timestamp in milliseconds
- created_at TEXT DEFAULT current timestamp

Indexes:
- idx_agg_group ON alerts_aggregated(src_ip, dst_ip, attack_type)
- idx_agg_last_seen ON alerts_aggregated(last_seen)

Aggregation:
- Alerts are grouped by `src_ip + dst_ip + attack_type`.
- Existing groups increment `count` and update `last_seen`.
- New groups are inserted and emitted through Socket.IO as `alert:new`.

Legacy table: alerts

The `alerts` table is still created for older/raw alert compatibility, but the current dashboard and statistics APIs read from `alerts_aggregated`.
