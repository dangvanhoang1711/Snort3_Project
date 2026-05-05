# Backend Folder Structure

backend-api/
- index.js
- package.json
- .env.example
- .gitignore
- README.md
- docs/
  - API.md
  - INTEGRATION.md
  - DB_SCHEMA.md
  - ARCHITECTURE.md
  - SAMPLE_LOGS.md
- src/
  - config.js
  - utils/logger.js
  - db/
    - index.js
    - migrate.js
  - models/alerts.js
  - services/
    - parser.js
    - sid-map.js
    - ingest.js
  - routes/
    - index.js
    - alerts.js
  - middleware/errorHandler.js
