# Mini-SOC Backend (Snort 3)

This backend ingests Snort 3 alert_csv logs, parses them, stores into SQLite, and exposes REST APIs for retrieval and statistics.

Quick start:

1. Copy `.env.example` to `.env` and adjust values.
2. Install dependencies: `npm install`
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

API endpoints are documented in docs/API.md

Realtime
--------
This backend supports real-time push via socket.io (emit `alert:new`) and SSE (`GET /api/stream`).

Forwarder
---------
Use `backend-api/tools/forwarder.js` for production-forwarding from the Snort VM (supports batching and retries). See docs/INTEGRATION.md.
