/**
 * Unit tests for backup SUPABASE_DB_URL preflight.
 * Synthetic hosts/credentials only — never contacts network services.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  validateSupabaseDbUrl,
  formatPreflightReport,
  formatPreflightErrorMessages,
  classifyPgDumpError,
  formatDumpErrorMessages,
  hasMalformedPercentEncoding,
} from './validate-supabase-db-url.mjs'

const SCRIPT = fileURLToPath(new URL('./validate-supabase-db-url.mjs', import.meta.url))

/** Synthetic only — not real infrastructure. */
const SYNTH_HOST = 'db.example.invalid'
const SYNTH_POOLER = 'aws-0-eu-central-1.pooler.example.invalid'
const SYNTH_USER = 'synth_user'
const SYNTH_DB = 'synth_db'
const SYNTH_PASS = 'synth-pass'

// Synthetic credential/host fragments must never appear in diagnostics.
// Authored docs may mention scheme names (postgres://) without values.
const FORBIDDEN_FRAGMENTS = [
  SYNTH_HOST,
  SYNTH_POOLER,
  SYNTH_USER,
  SYNTH_DB,
  SYNTH_PASS,
  `${SYNTH_USER}:`,
  `@${SYNTH_HOST}`,
]

function assertSafeOutput(text) {
  for (const frag of FORBIDDEN_FRAGMENTS) {
    assert.equal(
      text.includes(frag),
      false,
      `output must not contain fragment ${JSON.stringify(frag)}`,
    )
  }
  // No parsed-component value dumps (booleans use *_present= only).
  assert.equal(/\bhost=/.test(text), false)
  assert.equal(/\buser=/.test(text), false)
  assert.equal(/\bdbname=/.test(text), false)
  assert.equal(/\bpassword=/.test(text), false)
  assert.equal(/\bscheme=/.test(text), false)
  assert.equal(/\bport=/.test(text), false)
}

test('empty / missing URI fails', () => {
  for (const raw of [undefined, null, '', '   ']) {
    const r = validateSupabaseDbUrl(raw)
    assert.equal(r.ok, false)
    assert.equal(r.secret_present, false)
    assert.equal(r.error_code, 'empty')
    assertSafeOutput(formatPreflightReport(r))
    assertSafeOutput(formatPreflightErrorMessages(r).join('\n'))
  }
})

test('unsupported https scheme fails', () => {
  const r = validateSupabaseDbUrl(`https://${SYNTH_USER}:${SYNTH_PASS}@${SYNTH_HOST}/${SYNTH_DB}`)
  assert.equal(r.ok, false)
  assert.equal(r.secret_present, true)
  assert.equal(r.uri_parse_success, true)
  assert.equal(r.scheme_supported, false)
  assert.equal(r.error_code, 'unsupported_scheme')
  const out = `${formatPreflightReport(r)}\n${formatPreflightErrorMessages(r).join('\n')}`
  assertSafeOutput(out)
  assert.match(out, /postgres:\/\/ or postgresql:\/\//)
  assert.match(out, /Keyword\/value libpq conninfo is not supported/)
})

test('bare password/token instead of URI fails', () => {
  const r = validateSupabaseDbUrl(SYNTH_PASS)
  assert.equal(r.ok, false)
  assert.equal(r.error_code, 'not_uri')
  assertSafeOutput(formatPreflightReport(r))
})

test('keyword/value conninfo is rejected as not_uri', () => {
  const r = validateSupabaseDbUrl(
    `host=${SYNTH_HOST} user=${SYNTH_USER} password=${SYNTH_PASS} dbname=${SYNTH_DB}`,
  )
  assert.equal(r.ok, false)
  assert.equal(r.error_code, 'not_uri')
  const msgs = formatPreflightErrorMessages(r).join('\n')
  assert.match(msgs, /Keyword\/value libpq conninfo is not supported/)
  assertSafeOutput(`${formatPreflightReport(r)}\n${msgs}`)
})

test('missing hostname fails', () => {
  // Node's URL parser rejects empty-host URIs as unparseable; either way must not pass.
  const emptyHost = validateSupabaseDbUrl(
    `postgresql://${SYNTH_USER}:${SYNTH_PASS}@/${SYNTH_DB}`,
  )
  assert.equal(emptyHost.ok, false)
  assert.equal(emptyHost.hostname_present, false)
  assert.ok(
    emptyHost.error_code === 'missing_hostname' || emptyHost.error_code === 'unparseable',
  )
  assertSafeOutput(formatPreflightReport(emptyHost))
})

test('missing username fails', () => {
  const r = validateSupabaseDbUrl(`postgresql://:${SYNTH_PASS}@${SYNTH_HOST}:5432/${SYNTH_DB}`)
  assert.equal(r.ok, false)
  assert.equal(r.username_present, false)
  assert.equal(r.error_code, 'missing_username')
  assertSafeOutput(formatPreflightReport(r))
})

test('missing password component fails', () => {
  const r = validateSupabaseDbUrl(`postgresql://${SYNTH_USER}@${SYNTH_HOST}:5432/${SYNTH_DB}`)
  assert.equal(r.ok, false)
  assert.equal(r.password_component_present, false)
  assert.equal(r.error_code, 'missing_password')
  assertSafeOutput(formatPreflightReport(r))
})

test('missing database path fails', () => {
  const r = validateSupabaseDbUrl(`postgresql://${SYNTH_USER}:${SYNTH_PASS}@${SYNTH_HOST}:5432`)
  assert.equal(r.ok, false)
  assert.equal(r.database_path_present, false)
  assert.equal(r.error_code, 'missing_database')
  assertSafeOutput(formatPreflightReport(r))
})

test('valid direct PostgreSQL URI passes structure checks', () => {
  const r = validateSupabaseDbUrl(
    `postgresql://${SYNTH_USER}:${SYNTH_PASS}@${SYNTH_HOST}:5432/${SYNTH_DB}`,
  )
  assert.equal(r.ok, true)
  assert.equal(r.secret_present, true)
  assert.equal(r.uri_parse_success, true)
  assert.equal(r.scheme_supported, true)
  assert.equal(r.hostname_present, true)
  assert.equal(r.username_present, true)
  assert.equal(r.password_component_present, true)
  assert.equal(r.database_path_present, true)
  assert.equal(r.error_code, null)
  assertSafeOutput(formatPreflightReport(r))
})

test('valid pooler URI passes structure checks', () => {
  const r = validateSupabaseDbUrl(
    `postgres://${SYNTH_USER}.projref:${SYNTH_PASS}@${SYNTH_POOLER}:5432/${SYNTH_DB}`,
  )
  assert.equal(r.ok, true)
  assertSafeOutput(formatPreflightReport(r))
})

test('URL-encoded reserved password characters remain valid', () => {
  const encoded = {
    at: '%40',
    colon: '%3A',
    slash: '%2F',
    question: '%3F',
    hash: '%23',
    percent: '%25',
  }
  for (const [label, esc] of Object.entries(encoded)) {
    const r = validateSupabaseDbUrl(
      `postgresql://${SYNTH_USER}:p${esc}ss@${SYNTH_HOST}:5432/${SYNTH_DB}`,
    )
    assert.equal(r.ok, true, `encoded ${label} should pass`)
    assert.equal(r.password_component_present, true)
    assertSafeOutput(formatPreflightReport(r))
  }
})

test('malformed percent escapes are rejected', () => {
  assert.equal(hasMalformedPercentEncoding('p%2'), true)
  assert.equal(hasMalformedPercentEncoding('p%zz'), true)
  assert.equal(hasMalformedPercentEncoding('p%4'), true)
  assert.equal(hasMalformedPercentEncoding('p%40'), false)

  const r = validateSupabaseDbUrl(
    `postgresql://${SYNTH_USER}:p%2@${SYNTH_HOST}:5432/${SYNTH_DB}`,
  )
  assert.equal(r.ok, false)
  assert.equal(r.error_code, 'malformed_percent')
  assertSafeOutput(formatPreflightReport(r))
})

test('malformed URI syntax is rejected', () => {
  const r = validateSupabaseDbUrl('postgresql://:::')
  assert.equal(r.ok, false)
  assert.ok(r.error_code === 'unparseable' || r.error_code === 'malformed_percent' || !r.ok)
  assertSafeOutput(formatPreflightReport(r))
})

test('valid-looking URI with incorrect credentials still passes structure only', () => {
  // Wrong password is still a structurally valid URI; no connection attempt here.
  const r = validateSupabaseDbUrl(
    `postgresql://${SYNTH_USER}:definitely-wrong-password@${SYNTH_HOST}:5432/${SYNTH_DB}`,
  )
  assert.equal(r.ok, true)
  assert.equal(r.password_component_present, true)
  assertSafeOutput(formatPreflightReport(r))
})

test('classifyPgDumpError distinguishes auth vs local socket without echoing input', () => {
  assert.equal(
    classifyPgDumpError(
      'pg_dump: error: connection to server at "db.example.invalid" (127.0.0.1), port 5432 failed: FATAL:  password authentication failed for user "synth_user"',
    ),
    'auth_failed',
  )
  assert.equal(
    classifyPgDumpError(
      'pg_dump: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory\n\tIs the server running locally and accepting connections on that socket?',
    ),
    'local_socket',
  )
  assert.equal(
    classifyPgDumpError('pg_dump: error: connection to server at "x" failed: timeout'),
    'connection_failed',
  )
  assert.equal(classifyPgDumpError('something else'), 'unknown')

  for (const cat of ['auth_failed', 'local_socket', 'connection_failed', 'unknown']) {
    const msgs = formatDumpErrorMessages(cat).join('\n')
    assertSafeOutput(msgs)
    assert.equal(msgs.includes('db.example.invalid'), false)
    assert.equal(msgs.includes('/var/run/postgresql'), false)
  }
})

test('CLI preflight prints booleans only and exits non-zero for bad URI', () => {
  const bad = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, SUPABASE_DB_URL: SYNTH_PASS },
    encoding: 'utf8',
  })
  assert.notEqual(bad.status, 0)
  const combined = `${bad.stdout}\n${bad.stderr}`
  assert.match(combined, /secret_present=true/)
  assert.match(combined, /preflight_ok=false/)
  assertSafeOutput(combined)

  const good = spawnSync(process.execPath, [SCRIPT], {
    env: {
      ...process.env,
      SUPABASE_DB_URL: `postgresql://${SYNTH_USER}:${SYNTH_PASS}@${SYNTH_HOST}:5432/${SYNTH_DB}`,
    },
    encoding: 'utf8',
  })
  assert.equal(good.status, 0)
  assert.match(good.stdout, /preflight_ok=true/)
  assert.match(good.stdout, /does not prove the password is correct/)
  assertSafeOutput(`${good.stdout}\n${good.stderr}`)
})

test('CLI classify-file emits category token only', () => {
  const classified = spawnSync(
    process.execPath,
    [SCRIPT, '--classify-stdin'],
    {
      input:
        'pg_dump: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory',
      encoding: 'utf8',
    },
  )
  assert.equal(classified.status, 0)
  assert.equal(classified.stdout.trim(), 'local_socket')
  assert.equal(classified.stdout.includes('postgresql'), false)
})
