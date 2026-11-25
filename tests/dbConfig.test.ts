import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { describeDbError, DbConfigError, poolConfig } from '../server/utils/dbConfig'

// Fake values only: no real host, user, password or certificate.
const URL_WITH_SSL = 'postgres://user:p%40ss@db-1.example.aivencloud.com:12345/app?sslmode=require&schema=public'
const CA = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----'

describe('poolConfig', () => {
  it('uses one connection per serverless instance', () => {
    expect(poolConfig(URL_WITH_SSL).max).toBe(1)
  })

  it('trusts the CA, still verifies the host, and strips URL ssl parameters', () => {
    const cfg = poolConfig(URL_WITH_SSL, CA)
    expect(cfg.ssl?.rejectUnauthorized).toBe(true)
    expect(cfg.ssl?.ca).toContain('BEGIN CERTIFICATE')
    expect(cfg.connectionString).not.toContain('sslmode')
  })

  it('rejects a CA that is not a certificate', () => {
    expect(() => poolConfig(URL_WITH_SSL, 'not a certificate')).toThrow(DbConfigError)
  })
})

describe('describeDbError', () => {
  it('removes the URI, host, user and password from the message', () => {
    const err = new Error('connect failed for postgres://user:p%40ss@db-1.example.aivencloud.com:12345/app')
    const line = describeDbError(err, URL_WITH_SSL)
    expect(line).not.toMatch(/p%40ss|p@ss|user|aivencloud/)
  })
})

describe('server folder', () => {
  it('never turns certificate checks off', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'generated') continue
        const p = join(dir, name)
        statSync(p).isDirectory() ? walk(p) : files.push(p)
      }
    }
    walk('server')
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      expect(text, f).not.toMatch(/rejectUnauthorized\s*:\s*false/)
      expect(text, f).not.toMatch(/NODE_TLS_REJECT_UNAUTHORIZED/)
    }
  })
})
