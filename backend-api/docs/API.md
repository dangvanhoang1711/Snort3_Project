# API Documentation

Base URL: http://<server>:<port>/api

Endpoints:

- GET /api/logs
  - Query: `limit` (default 100), `offset` (default 0)
  - Response: { count, results: [alerts] }

- POST /api/logs
  - Body: JSON { data: "<alert_csv content>" } OR raw text body (text/plain)
  - Response: { inserted: <n>, details: [ { id, timestamp } ] }

- GET /api/stats
  - Response: { byType, bySrc, byDst, recent }

- Health: GET /health

Realtime:
- WebSocket (socket.io) at the same origin: emits `alert:new` events with the inserted alert object
- SSE endpoint: GET /api/stream emits Server-Sent Events `event: alert` with JSON data

Notes on CSV format accepted

The backend expects Snort alert_csv format per line with columns:

timestamp, pkt_num, proto, pkt_gen, pkt_len, dir, src_ap, dst_ap, rule, action

Examples and integration: see docs/INTEGRATION.md
