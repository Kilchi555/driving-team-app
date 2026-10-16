/**
 * Pins the financial TRUNCATE migration text.
 * Does not connect to a database and does not apply the migration.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'migrations/20261016_financial_truncate_revoke.sql')

const TABLES = [
  'invoices',
  'invoice_items',
  'invoice_payments',
  'payments',
  'product_sales',
  'bank_import_records',
  'student_credits',
  'credit_transactions',
]

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('financial TRUNCATE revoke migration', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  const executable = stripSqlComments(sql)

  it('is a create-only migration and does not force RLS or rewrite policies', () => {
    expect(sql).toContain('Do not apply automatically to production')
    expect(executable).not.toMatch(/FORCE ROW LEVEL SECURITY/i)
    expect(executable).not.toMatch(/ENABLE ROW LEVEL SECURITY/i)
    expect(executable).not.toMatch(/CREATE POLICY/i)
    expect(executable).not.toMatch(/DROP POLICY/i)
    expect(executable).not.toMatch(/ALTER TABLE/i)
    expect(executable).not.toMatch(/\bGRANT\b/i)
  })

  it('revokes only TRUNCATE from anon and authenticated on the financial tables', () => {
    for (const table of TABLES) {
      expect(executable).toMatch(
        new RegExp(`REVOKE TRUNCATE ON TABLE public\\.${table} FROM anon, authenticated`),
      )
    }
    expect(executable).not.toMatch(/REVOKE\s+(ALL|SELECT|INSERT|UPDATE|DELETE|REFERENCES|TRIGGER)/i)
    expect(executable).not.toMatch(/FROM\s+(service_role|postgres|PUBLIC)\b/)
  })

  it('corrects postgres default privileges and gates the supabase_admin default', () => {
    expect(executable).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE TRUNCATE ON TABLES FROM anon, authenticated/,
    )
    expect(executable).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public',
    )
    expect(executable).toContain("pg_has_role(current_user, 'supabase_admin', 'MEMBER')")
    expect(executable).toContain('RAISE NOTICE')
    expect(executable).not.toMatch(/REVOKE\s+[^;]*ON\s+(FUNCTIONS|SEQUENCES|ROUTINES)/i)
  })
})
