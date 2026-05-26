process.env.TOTAL_ALERTS = process.env.TOTAL_ALERTS || '50'
process.env.BATCH_SIZE = process.env.BATCH_SIZE || '10'
require('./generate-test-data')
