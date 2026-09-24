import { execSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const root = path.resolve(__dirname, '../../..')
const db = `attribution_schema_${process.pid}`

function stageForPostgres(files: string[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'attribution-schema-'))
  chmodSync(dir, 0o755)
  for (const file of files) {
    const dest = path.join(dir, path.basename(file))
    copyFileSync(file, dest)
    chmodSync(dest, 0o644)
  }
  return dir
}

function psql(file: string) {
  execSync(`sudo -u postgres psql -d ${db} -v ON_ERROR_STOP=1 -f ${JSON.stringify(file)}`, {
    stdio: 'pipe',
    encoding: 'utf8',
  })
}

describe('marketing attribution schema', () => {
  test('enforces append-only touches, conversion links, and tenant RLS', () => {
    const files = [
      path.join(root, 'server/utils/__tests__/marketing-attribution-schema.fixture.sql'),
      path.join(root, 'migrations/20260923_marketing_touches_conversions.sql'),
      path.join(root, 'migrations/20260923_marketing_conversions_customer_state.sql'),
      path.join(root, 'server/utils/__tests__/marketing-attribution-schema.assertions.sql'),
    ]
    const staged = stageForPostgres(files)
    execSync(`sudo -u postgres dropdb --if-exists ${db}`, { stdio: 'pipe' })
    execSync(`sudo -u postgres createdb ${db}`, { stdio: 'pipe' })
    try {
      for (const file of files) psql(path.join(staged, path.basename(file)))
      expect(true).toBe(true)
    } finally {
      execSync(`sudo -u postgres dropdb --if-exists ${db}`, { stdio: 'pipe' })
      rmSync(staged, { recursive: true, force: true })
    }
  })
})
