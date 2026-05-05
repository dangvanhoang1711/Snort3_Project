const config = require('../config')

function apiKeyAuth(req, res, next) {
  const key = req.header('x-api-key') || req.query.api_key
  if (!config.API_KEY) {
    // no key configured - deny by default for safety
    return res.status(403).json({ error: 'API key not configured on server' })
  }
  if (!key || key !== config.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' })
  }
  return next()
}

module.exports = apiKeyAuth
