const path = require('path')
require('dotenv').config()

const get = (name, fallback) => {
  return process.env[name] || fallback
}

module.exports = {
  PORT: get('PORT', 4000),
  NODE_ENV: get('NODE_ENV', 'development'),
  DB_PATH: path.resolve(get('DB_PATH', './data/alerts.db')),
  API_KEY: get('API_KEY', ''),
  RATE_LIMIT_WINDOW_MS: get('RATE_LIMIT_WINDOW_MS', ''),
  RATE_LIMIT_MAX: get('RATE_LIMIT_MAX', ''),
}
