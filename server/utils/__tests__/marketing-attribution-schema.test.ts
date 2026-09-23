import { execSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const root = path.resolve(__dirname, '../../..')
const db = `attribution_schema_${process.pid}`

function psql(file: string) {
  execSync(`sudo -u postgres psql -d ${db} -v ON_ERROR_STOP=1 -f ${JSON.stringify(file)}`, {
    stdio: 'pipe',
    encoding: 'utf8',
  })
}

describe('marketing attribution schema', () => {
  test('enforces append-only touches, conversion links, and tenant RLS', () => {
    execSync(`sudo -u postgres dropdb --if-exists ${db}`, { stdio: 'pipe' })
    execSync(`sudo -u postgres createdb ${db}`, { stdio: 'pipe' })
    try {
      psql(path.join(root, 'server/utils/__tests__/marketing-attribution-schema.fixture.sql'))
      psql(path.join(root, 'migrations/20260923_marketing_touches_conversions.sql'))
      psql(path.join(root, 'migrations/20260923_marketing_conversions_customer_state.sql'))
      psql(path.join(root, 'server/utils/__tests__/marketing-attribution-schema.assertions.sql'))
      expect(true).toBe(true)
    } finally {
      execSync(`sudo -u postgres dropdb --if-exists ${db}`, { stdio: 'pipe' })
    }
  })
})
