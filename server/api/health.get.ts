// Health check: { "database": "up" | "down" }. Returns 503 when the database is down.
// Failures are logged as a short line with the URI, host, user and password removed.
import { dbFailureLine } from '../utils/dbConfig'
import { hasDatabase, useDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (!hasDatabase()) {
    setResponseStatus(event, 503)
    return { database: 'down' }
  }
  try {
    await useDb().$queryRaw`SELECT 1`
    return { database: 'up' }
  } catch (err) {
    console.error(dbFailureLine(err, process.env.DATABASE_URL))
    setResponseStatus(event, 503)
    return { database: 'down' }
  }
})
