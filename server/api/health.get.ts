// Health check: { "database": "up" | "down" }. Returns 503 when the database is down.
// "up" means the database answers AND the app's tables exist (a connection to the wrong database would otherwise look healthy).
// A reachable database without the tables answers { "database": "up", "tables": "missing" } with 503: run `npx prisma migrate deploy`
// against the database that DATABASE_URL points to. Failures are logged as a short line with the URI, host, user and password removed.
import { dbFailureLine } from '../utils/dbConfig'
import { hasDatabase, useDb } from '../utils/db'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (!hasDatabase()) {
    setResponseStatus(event, 503)
    return { database: 'down' }
  }
  const db = useDb()
  try {
    await db.$queryRaw`SELECT 1`
  } catch (err) {
    console.error(dbFailureLine(err, process.env.DATABASE_URL))
    setResponseStatus(event, 503)
    return { database: 'down' }
  }
  try {
    await db.project.count() // P2021 = the table does not exist in this database
  } catch (err) {
    console.error(`[health] database is reachable but the app's tables are missing or unreadable (${(err as { code?: string })?.code ?? 'unknown'}). DATABASE_URL may point at the wrong database, or the migration has not been applied to it.`)
    setResponseStatus(event, 503)
    return { database: 'up', tables: 'missing' }
  }
  return { database: 'up' }
})
