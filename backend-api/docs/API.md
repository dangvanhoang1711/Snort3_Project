# API Documentation

Base URL: http://<server>:<port>/api

Endpoints:

- GET /api/logs
  - Query: `limit` (default 100), `offset` (default 0)
  - Response: { count, results: [alerts] }

- POST /api/logs
  - Body: JSON { data: "<alert_csv content>" } OR raw text body (text/plain)
  - Requires header: `x-api-key`
  - Response: { processed: <n>, buffered: <n> }

- POST /api/ingest
  - Body: JSON { data: "<alert_csv content>" } OR raw text body (text/plain)
  - Requires header: `x-api-key`
  - Response: { processed: <n>, buffered: <n> }

- GET /api/stats
  - Response: { byType, bySrc, byDst, recent }

- GET /api/stats/overview
  - Response: SOC summary metrics from `alerts_aggregated`

- GET /api/stats/hourly
  - Response: 24 hourly buckets for charting

- GET /api/logs/attack-types
  - Response: array of distinct attack types

- Health: GET /health

Realtime:
- WebSocket (socket.io) at the same origin: emits `alert:new` events with the inserted alert object
- SSE endpoint: GET /api/stream emits Server-Sent Events `event: alert` with JSON data

Notes on CSV format accepted

The backend accepts Snort alert_csv format per line with columns:

timestamp, pkt_num, proto, pkt_gen, pkt_len, dir, src_ap, dst_ap, rule, action

It also accepts the simplified forwarder format:

src_ip, dst_ip, dst_port, attack_type, severity, action, proto, count

Examples and integration: see docs/INTEGRATION.md
