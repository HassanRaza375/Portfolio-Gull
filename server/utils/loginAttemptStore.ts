// The attempt store backed by the LoginAttempt table. Serverless instances share no memory, so the count lives in the database.
import { useDb } from './db'
import { LOGIN_WINDOW_SECONDS, type AttemptStore } from './login'

const KEEP_SECONDS = 60 * 60

export const loginAttemptStore: AttemptStore = {
  async record(ip) {
    const db = useDb()
    await db.loginAttempt.create({ data: { ip } })
    return db.loginAttempt.count({ where: { ip, createdAt: { gt: new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000) } } })
  },
  async clear(ip) {
    await useDb().loginAttempt.deleteMany({ where: { ip } })
  },
  async prune() {
    await useDb().loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_SECONDS * 1000) } } })
  },
}
