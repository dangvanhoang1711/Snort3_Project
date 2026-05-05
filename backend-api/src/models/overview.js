// lightweight helper for overview computations (optional)
const { getDb } = require('../db')

async function percentChange(today, yesterday) {
  if (!yesterday) return today ? 100 : 0
  return Math.round(((today - yesterday) / yesterday) * 100)
}

module.exports = { percentChange }
