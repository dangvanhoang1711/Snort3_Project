const { initDb } = require('./index')

initDb()
  .then(() => {
    console.log('Migration done')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Migration failed', err)
    process.exit(1)
  })
