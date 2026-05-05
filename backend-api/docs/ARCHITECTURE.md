# Architecture Overview

This backend implements a small SIEM-like ingestion pipeline for Snort 3 alerts. It's structured in a layered, modular way for clarity and maintainability.

Layers:

- index.js: application bootstrap, middleware and route mounting
- src/routes: express routers (API surface)
- src/services: parsing and ingestion logic (stateless business logic)
- src/models: database access (CRUD) functions
- src/db: database initialization and migration
- src/utils: logging and helper utilities
- src/middleware: express middleware for error handling

Design principles:

- Single responsibility: each module has a focused purpose
- Small functions: parsing and mapping logic kept testable
- Configuration via .env for environment-specific settings
- Lightweight SQLite DB for demo and academic use; schema includes indexes for common queries
