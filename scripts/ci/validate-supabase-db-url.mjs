#!/usr/bin/env node
/**
 * Structural preflight for GitHub Actions SUPABASE_DB_URL (backup pipeline).
 *
 * Safety contract:
 * - Never print URI, hostname, username, database name, password, query, or
 *   any secret-derived fragment.
 * - Output is boolean status labels + fixed authored messages only.
 * - Does not mutate the caller's connection string / env value.
 * - URI-only: keyword/value libpq conninfo is not supported.
 * - Structure OK is not proof of auth success or remote reachability.
 */

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** @typedef {'empty' | 'not_uri' | 'malformed_percent' | 'unparseable' | 'unsupported_scheme' | 'missing_hostname' | 'missing_username' | 'missing_password' | 'missing_database' | null} PreflightErrorCode */

/**
 * @typedef {object} PreflightResult
 * @property {boolean} secret_present
 * @property {boolean} uri_parse_success
 * @property {boolean} scheme_supported
 * @property {boolean} hostname_present
 * @property {boolean} username_present
 * @property {boolean} password_component_present
 * @property {boolean} database_path_present
 * @property {boolean} ok
 * @property {PreflightErrorCode} error_code
 */

/** @typedef {'auth_failed' | 'local_socket' | 'connection_failed' | 'unknown'} DumpErrorCategory */

const URI_SCHEME_PREFIX = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//

/**
 * Reject incomplete or non-hex percent-escapes anywhere in the string.
 * Valid escapes are % followed by exactly two hexadecimal digits.
 * @param {string} value
 */
export function hasMalformedPercentEncoding(value) {
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '%') continue
    if (i + 2 >= value.length) return true
    const hex = value.slice(i + 1, i + 3)
    if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return true
    i += 2
  }
  return false
}

/**
 * @param {string | null | undefined} raw
 * @returns {PreflightResult}
 */
export function validateSupabaseDbUrl(raw) {
  /** @type {PreflightResult} */
  const result = {
    secret_present: false,
    uri_parse_success: false,
    scheme_supported: false,
    hostname_present: false,
    username_present: false,
    password_component_present: false,
    database_path_present: false,
    ok: false,
    error_code: null,
  }

  if (raw == null) {
    result.error_code = 'empty'
    return result
  }

  const value = String(raw)
  if (value.trim() === '') {
    result.error_code = 'empty'
    return result
  }

  result.secret_present = true

  // Keyword/value conninfo and bare tokens lack a URI scheme prefix.
  if (!URI_SCHEME_PREFIX.test(value.trim())) {
    result.error_code = 'not_uri'
    return result
  }

  if (hasMalformedPercentEncoding(value)) {
    result.error_code = 'malformed_percent'
    return result
  }

  let url
  try {
    url = new URL(value)
  } catch {
    result.error_code = 'unparseable'
    return result
  }

  result.uri_parse_success = true

  const scheme = url.protocol.replace(/:$/, '').toLowerCase()
  result.scheme_supported = scheme === 'postgres' || scheme === 'postgresql'
  result.hostname_present = Boolean(url.hostname)
  result.username_present = Boolean(url.username)
  // URL API decodes percent-encoding into .password; require a non-empty password.
  result.password_component_present = url.password.length > 0
  const dbName = url.pathname.replace(/^\/+/, '').split('/')[0] || ''
  result.database_path_present = dbName.length > 0

  if (!result.scheme_supported) {
    result.error_code = 'unsupported_scheme'
  } else if (!result.hostname_present) {
    result.error_code = 'missing_hostname'
  } else if (!result.username_present) {
    result.error_code = 'missing_username'
  } else if (!result.password_component_present) {
    result.error_code = 'missing_password'
  } else if (!result.database_path_present) {
    result.error_code = 'missing_database'
  }

  result.ok =
    result.secret_present &&
    result.uri_parse_success &&
    result.scheme_supported &&
    result.hostname_present &&
    result.username_present &&
    result.password_component_present &&
    result.database_path_present

  return result
}

/**
 * Boolean-only report. Never include parsed component values.
 * @param {PreflightResult} result
 */
export function formatPreflightReport(result) {
  const lines = [
    `secret_present=${result.secret_present}`,
    `uri_parse_success=${result.uri_parse_success}`,
    `scheme_supported=${result.scheme_supported}`,
    `hostname_present=${result.hostname_present}`,
    `username_present=${result.username_present}`,
    `password_component_present=${result.password_component_present}`,
    `database_path_present=${result.database_path_present}`,
    `preflight_ok=${result.ok}`,
  ]
  return lines.join('\n')
}

/** Fixed messages — no input echo. */
const ERROR_MESSAGES = {
  empty:
    'GitHub Actions secret SUPABASE_DB_URL is missing or empty.',
  not_uri:
    'SUPABASE_DB_URL must be a valid postgres:// or postgresql:// URI. Keyword/value libpq conninfo is not supported by this preflight.',
  malformed_percent:
    'SUPABASE_DB_URL contains a malformed percent-escape. Use a valid postgres:// or postgresql:// URI with a correctly URL-encoded password.',
  unparseable:
    'SUPABASE_DB_URL is not a parseable URI. SUPABASE_DB_URL must be a valid postgres:// or postgresql:// URI. Keyword/value libpq conninfo is not supported by this preflight.',
  unsupported_scheme:
    'SUPABASE_DB_URL must be a valid postgres:// or postgresql:// URI. Keyword/value libpq conninfo is not supported by this preflight.',
  missing_hostname:
    'SUPABASE_DB_URL is missing a hostname. Provide a full postgres:// or postgresql:// URI.',
  missing_username:
    'SUPABASE_DB_URL is missing a username. Provide a full postgres:// or postgresql:// URI.',
  missing_password:
    'SUPABASE_DB_URL is missing a password component. Provide a full postgres:// or postgresql:// URI with a URL-encoded password.',
  missing_database:
    'SUPABASE_DB_URL is missing a database path. Provide a full postgres:// or postgresql:// URI including the database name path.',
}

/**
 * @param {PreflightResult} result
 */
export function formatPreflightErrorMessages(result) {
  if (result.ok || !result.error_code) return []
  const msg = ERROR_MESSAGES[result.error_code]
  return msg ? [msg] : ['SUPABASE_DB_URL failed structure validation.']
}

/**
 * Classify pg_dump stderr without echoing it.
 * Allowlisted categories only.
 * @param {string} stderrText
 * @returns {DumpErrorCategory}
 */
export function classifyPgDumpError(stderrText) {
  const text = String(stderrText || '').toLowerCase()
  if (!text.trim()) return 'unknown'

  if (text.includes('password authentication failed')) {
    return 'auth_failed'
  }

  // Local Unix-socket fallback (value not treated as URI/conninfo by libpq).
  if (
    text.includes('/var/run/postgresql') ||
    text.includes('.s.pgsql.') ||
    text.includes('is the server running locally and accepting')
  ) {
    return 'local_socket'
  }

  if (text.includes('connection to server') && text.includes('failed')) {
    return 'connection_failed'
  }

  return 'unknown'
}

/** Fixed dump-failure messages — never include stderr content. */
export const DUMP_ERROR_MESSAGES = {
  auth_failed: [
    'pg_dump authentication failed for SUPABASE_DB_URL.',
    'Structure preflight passed earlier; this is not a malformed-URI diagnosis.',
    'Likely cause: database password was rotated and GitHub secret SUPABASE_DB_URL was not updated, or the password in the URI is not URL-encoded.',
    'Human action (do not paste secrets into chat):',
    '  1) Supabase Dashboard → Project Settings → Database → confirm/reset DB password',
    '  2) Copy connection URI (direct or Session mode pooler); URL-encode special chars in the password',
    '  3) Update GitHub Actions secret SUPABASE_DB_URL',
    '  4) Re-run workflow_dispatch Daily Database Backup (read-only dump + R2 upload)',
  ],
  local_socket: [
    'pg_dump attempted a local Unix-socket connection instead of a remote host.',
    'This usually means the connection argument was not accepted as a postgres:// or postgresql:// URI (or libpq conninfo).',
    'This preflight only accepts URI form. Update SUPABASE_DB_URL to a full postgres:// or postgresql:// URI. Do not paste the secret into chat/logs.',
  ],
  connection_failed: [
    'pg_dump could not complete a remote database connection.',
    'Structure preflight is not proof of reachability or correct credentials.',
    'Verify network/DNS/TLS and that SUPABASE_DB_URL points at the intended Supabase database URI. Do not paste the secret into chat/logs.',
  ],
  unknown: [
    'pg_dump failed for an unclassified reason.',
    'Structure preflight is not proof of authentication or reachability.',
    'Inspect the workflow run without pasting secrets; update SUPABASE_DB_URL only if the URI/credentials are wrong.',
  ],
}

/**
 * @param {DumpErrorCategory} category
 */
export function formatDumpErrorMessages(category) {
  return DUMP_ERROR_MESSAGES[category] || DUMP_ERROR_MESSAGES.unknown
}

function printLines(lines) {
  for (const line of lines) {
    console.log(line)
  }
}

function runPreflightFromEnv() {
  const raw = process.env.SUPABASE_DB_URL
  const result = validateSupabaseDbUrl(raw)
  printLines(formatPreflightReport(result).split('\n'))
  if (!result.ok) {
    for (const msg of formatPreflightErrorMessages(result)) {
      console.error(`::error::${msg}`)
    }
    console.error(
      'Human action: update GitHub Actions secret SUPABASE_DB_URL to a postgres:// or postgresql:// URI (do not paste the secret into chat/logs).',
    )
    console.error(
      'Note: structure validation does not prove the password is correct or that the remote server is reachable.',
    )
    process.exit(1)
  }
  console.log(
    'Note: structure validation does not prove the password is correct or that the remote server is reachable.',
  )
  process.exit(0)
}

/**
 * @param {string} text
 */
function runClassify(text) {
  const category = classifyPgDumpError(text)
  // Single token only — safe for shell capture.
  process.stdout.write(`${category}\n`)
  process.exit(0)
}

export function isMainModule(metaUrl = import.meta.url) {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return pathToFileURL(entry).href === metaUrl
  } catch {
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--classify-file') {
    const file = args[1]
    if (!file) {
      console.error('::error::classify-file requires a path argument.')
      process.exit(2)
    }
    let text = ''
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      text = ''
    }
    runClassify(text)
    return
  }
  if (args[0] === '--classify-stdin') {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    runClassify(Buffer.concat(chunks).toString('utf8'))
    return
  }
  runPreflightFromEnv()
}

if (isMainModule()) {
  main().catch(() => {
    console.error('::error::validate-supabase-db-url failed unexpectedly.')
    process.exit(2)
  })
}
