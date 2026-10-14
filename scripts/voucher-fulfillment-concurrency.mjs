#!/usr/bin/env node
/**
 * Disposable-Postgres concurrency probe for UNIQUE (payment_id, fulfillment_key).
 *
 * Forbidden: hosted Supabase URLs / SUPABASE_DB_URL / production project refs.
 * Intended for local postgres:17 or CI service containers only.
 *
 * Usage:
 *   VOUCHER_PGHOST=127.0.0.1 VOUCHER_PGPORT=5432 VOUCHER_PGUSER=postgres \
 *   VOUCHER_PGPASSWORD=local VOUCHER_PGDATABASE=voucher_claim \
 *   node scripts/voucher-fulfillment-concurrency.mjs
 */
import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const host = process.env.VOUCHER_PGHOST || '127.0.0.1'
const port = process.env.VOUCHER_PGPORT || '5432'
const user = process.env.VOUCHER_PGUSER || 'postgres'
const password = process.env.VOUCHER_PGPASSWORD || ''
const database = process.env.VOUCHER_PGDATABASE || 'voucher_claim'

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

if (process.env.SUPABASE_DB_URL) fail('SUPABASE_DB_URL must not be set')
if (!['localhost', '127.0.0.1'].includes(host)) fail('host must be localhost/127.0.0.1')
for (const s of ['unyjaetebnaexaflpyoc', 'kssqalisscxkhvorqwgy', 'supabase.co']) {
  if (`${host}${database}`.toLowerCase().includes(s)) fail(`forbidden identity substring: ${s}`)
}

const migrationPath = resolve(process.cwd(), 'migrations/20261014_vouchers_fulfillment_key_unique.sql')
const migrationSql = readFileSync(migrationPath, 'utf8')
const sha = createHash('sha256').update(migrationSql).digest('hex')
console.log(`migration sha256=${sha}`)

function psql(sql, opts = {}) {
  const env = { ...process.env, PGPASSWORD: password }
  const args = ['-h', host, '-p', port, '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-t', '-A']
  if (opts.file) args.push('-f', opts.file)
  else args.push('-c', sql)
  const result = spawnSync('psql', args, { env, encoding: 'utf8' })
  if (result.status !== 0) {
    fail(`psql failed: ${result.stderr || result.stdout}`)
  }
  return (result.stdout || '').trim()
}

// Minimal vouchers table for the unique index under test.
psql(`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text,
  description text,
  amount_rappen integer NOT NULL,
  payment_id uuid,
  tenant_id uuid,
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  fulfillment_key text
);
`)
psql('', { file: migrationPath })

const paymentId = randomUUID()
const tenantId = randomUUID()
const keyA = `custom-voucher:${randomUUID()}`
const keyB = `voucher:${randomUUID()}:line:0`

function insertClaimAsync(code, key) {
  const sql = `
INSERT INTO vouchers (code, name, amount_rappen, payment_id, tenant_id, fulfillment_key, valid_until, is_active)
VALUES ('${code}', 'Gutschein 50', 5000, '${paymentId}', '${tenantId}', '${key}', now() + interval '1 year', true)
RETURNING id;
`
  const env = { ...process.env, PGPASSWORD: password }
  return new Promise((resolvePromise) => {
    const child = spawn('psql', [
      '-h', host, '-p', port, '-U', user, '-d', database,
      '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql,
    ], { env })
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk) => { out += chunk })
    child.stderr.on('data', (chunk) => { err += chunk })
    child.on('close', (status) => {
      resolvePromise({
        ok: status === 0,
        out: out.trim(),
        err: err.trim(),
      })
    })
  })
}

// Fire concurrent duplicate claims for keyA + one distinct keyB with same name/amount.
const settled = await Promise.all([
  insertClaimAsync('CODE-A1', keyA),
  insertClaimAsync('CODE-A2', keyA),
  insertClaimAsync('CODE-A3', keyA),
  insertClaimAsync('CODE-B1', keyB),
])
const wins = settled.filter(r => r.ok)
const losses = settled.filter(r => !r.ok)

const count = Number(psql(`SELECT count(*) FROM vouchers WHERE payment_id = '${paymentId}'`))
const keys = psql(`SELECT fulfillment_key FROM vouchers WHERE payment_id = '${paymentId}' ORDER BY fulfillment_key`)

console.log(JSON.stringify({ wins: wins.length, losses: losses.length, count, keys: keys.split('\n') }, null, 2))

if (count !== 2) fail(`expected exactly 2 rows, got ${count}`)
if (wins.length !== 2) fail(`expected exactly 2 insert wins, got ${wins.length}`)
if (!keys.includes(keyA) || !keys.includes(keyB)) fail('expected both distinct fulfillment keys present')
if (!losses.every(r => /duplicate key|unique constraint|23505/i.test(r.err))) {
  fail(`expected unique violations on losers: ${JSON.stringify(losses)}`)
}

console.log('OK: concurrent duplicate deliveries collapsed; distinct keys both fulfilled')
