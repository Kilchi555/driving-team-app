#!/usr/bin/env node
/**
 * PR #421 Path A — disposable PG17 F1 concurrency harness.
 *
 * Modes:
 *   --mode=preflight     Gate B only (identity, bootstrap assumed applied, dual-PID,
 *                        overlapping TX, advisory observability). Does NOT score 7–10/26A.
 *   --mode=concurrency   Gate C only. Refuses unless PR421_CONCURRENCY_EXECUTION_APPROVED=1.
 *                        Runs tests 7, 8, 9, 10, 26A. Records 26B as NOT RUN — BLOCKED.
 *
 * Forbidden targets: Production unyjaetebnaexaflpyoc, shared staging kssqalisscxkhvorqwgy.
 * Never logs passwords or credential-bearing URLs.
 *
 * Not production-equivalent. Proofs apply only to the disposable schema.
 */

import pg from 'pg'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_EXPECTED_DB,
  assertLiveServerIdentity,
  assertUrlIdentityGate,
} from './f1-identity.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

const F1_REL = 'migrations/20261012_enroll_public_cash_course_with_pending_payment.sql'
const F1_EXPECTED_SHA256 = 'd8d10cd20a4fad2ea744bca5dfc36b1b1333e999f8f867cefeed9ea240291cab'
const EXPECTED_DB = process.env.PR421_F1_PGDATABASE || DEFAULT_EXPECTED_DB
const WAIT_BUDGET_MS = Number(process.env.PR421_WAIT_BUDGET_MS || 10_000)
const POLL_MS = 75
const HARNESS_PROBE_LABEL = 'pr421-harness-advisory-probe-v1'

const MODE = parseMode(process.argv)
const results = []

function parseMode(argv) {
  const raw = argv.find((a) => a.startsWith('--mode='))?.slice('--mode='.length)
    || process.env.PR421_HARNESS_MODE
  if (raw !== 'preflight' && raw !== 'concurrency') {
    console.error('Usage: node scripts/pr421/f1-concurrency.mjs --mode=preflight|concurrency')
    process.exit(2)
  }
  return raw
}

function fail(msg) {
  throw new Error(msg)
}

function redactUrl(url) {
  try {
    const u = new URL(url)
    if (u.password) u.password = '***'
    return `${u.protocol}//${u.username ? u.username + ':***@' : ''}${u.host}${u.pathname}`
  } catch {
    return '[unparseable-url]'
  }
}

function buildDatabaseUrl() {
  if (process.env.PR421_DATABASE_URL) {
    return process.env.PR421_DATABASE_URL
  }
  const host = process.env.PR421_PGHOST || '127.0.0.1'
  const port = process.env.PR421_PGPORT || '5432'
  const user = process.env.PR421_PGUSER || 'postgres'
  const password = process.env.PR421_PGPASSWORD || 'pr421_local_only'
  const database = EXPECTED_DB
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

function identityGate(url, { phase }) {
  try {
    const { host, dbName } = assertUrlIdentityGate(url, {
      phase,
      expectedDb: EXPECTED_DB,
      supabaseDbUrlSet: Boolean(process.env.SUPABASE_DB_URL),
    })
    console.log(`[identity] OK phase=${phase} host=${host} db=${dbName}`)
  } catch (err) {
    fail(err?.message || String(err))
  }
}

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    try { await client.end() } catch { /* ignore */ }
  }
}

async function openClient(url) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  return client
}

async function safeRollback(client) {
  if (!client) return
  try { await client.query('ROLLBACK') } catch { /* ignore */ }
}

async function backendPid(client) {
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid')
  return Number(rows[0].pid)
}

async function f1LockKey(client, tenantId, idemKey) {
  const { rows } = await client.query(
    `SELECT hashtextextended($1::text || ':' || $2::text, 0) AS lock_key`,
    [tenantId, idemKey],
  )
  return rows[0].lock_key // string representation of bigint from pg
}

/** Match advisory bigint key rows in pg_locks (objsubid=1). */
async function advisoryLockRows(client, lockKey) {
  const { rows } = await client.query(
    `SELECT l.pid,
            l.granted,
            l.classid,
            l.objid,
            l.objsubid,
            a.state,
            a.wait_event_type,
            a.wait_event,
            left(a.query, 160) AS query_prefix
       FROM pg_locks l
       JOIN pg_stat_activity a ON a.pid = l.pid
      WHERE l.locktype = 'advisory'
        AND l.objsubid = 1
        AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
        AND (
              (l.classid::bigint << 32)
              | (l.objid::bigint & 4294967295)
            ) = $1::bigint`,
    [lockKey],
  )
  return rows
}

async function waitForAdvisoryWaiter(control, { holderPid, waiterPid, lockKey, budgetMs }) {
  const deadline = Date.now() + budgetMs
  while (Date.now() < deadline) {
    const rows = await advisoryLockRows(control, lockKey)
    const held = rows.some((r) => Number(r.pid) === holderPid && r.granted === true)
    const waiting = rows.some((r) => Number(r.pid) === waiterPid && r.granted === false)
    if (held && waiting) {
      return { ok: true, rows }
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  const finalRows = await advisoryLockRows(control, lockKey)
  return { ok: false, rows: finalRows }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

/** In-process dual start — not sufficient alone for Test 7; OK to overlap claim/enroll starts. */
async function dualOverlapStart(startA, startB) {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const pA = (async () => { await gate; return startA() })()
  const pB = (async () => { await gate; return startB() })()
  await new Promise((r) => setImmediate(r))
  await new Promise((r) => setImmediate(r))
  release()
  return Promise.all([pA, pB])
}

function enrollSql() {
  return `SELECT public.enroll_public_cash_course_with_pending_payment(
    $1::uuid, $2::uuid, $3::uuid, $4::integer, $5::text, $6::uuid, $7::jsonb
  ) AS result`
}

async function callEnroll(client, fx, { userId, idemKey, registration }) {
  const { rows } = await client.query(enrollSql(), [
    userId,
    fx.tenantId,
    fx.courseId,
    fx.amountRappen,
    fx.courseName,
    idemKey,
    JSON.stringify(registration),
  ])
  return rows[0].result
}

function baseRegistration(fx, { userId, email, firstName }) {
  return {
    course_id: fx.courseId,
    tenant_id: fx.tenantId,
    user_id: userId,
    first_name: firstName,
    last_name: 'Fixture',
    email,
    phone: '+41000000000',
    outbox_sari: false,
    outbox_vehicle: false,
  }
}

async function seedFixtures(client) {
  const tenantId = randomUUID()
  const courseId = randomUUID()
  const userA = randomUUID()
  const userB = randomUUID()
  await client.query(
    `INSERT INTO public.tenants (id, name) VALUES ($1, 'pr421-tenant')`,
    [tenantId],
  )
  await client.query(
    `INSERT INTO public.users (id, tenant_id, email) VALUES
       ($1, $3, 'a@pr421.test'),
       ($2, $3, 'b@pr421.test')`,
    [userA, userB, tenantId],
  )
  await client.query(
    `INSERT INTO public.courses (id, tenant_id, name, max_participants)
     VALUES ($1, $2, 'PR421 Course', 100)`,
    [courseId, tenantId],
  )
  return {
    tenantId,
    courseId,
    userA,
    userB,
    amountRappen: 15000,
    courseName: 'PR421 Course',
  }
}

async function cleanupFixtures(client, fx) {
  if (!fx?.tenantId) return
  // Order: F1 child tables → payments/registrations → users/courses → tenant
  await client.query(
    `DELETE FROM public.public_cash_course_enroll_outbox WHERE tenant_id = $1`,
    [fx.tenantId],
  )
  await client.query(
    `DELETE FROM public.public_cash_course_enroll_idempotency WHERE tenant_id = $1`,
    [fx.tenantId],
  )
  await client.query(
    `DELETE FROM public.payments WHERE tenant_id = $1`,
    [fx.tenantId],
  )
  await client.query(
    `DELETE FROM public.course_registrations WHERE tenant_id = $1`,
    [fx.tenantId],
  )
  await client.query(`DELETE FROM public.users WHERE tenant_id = $1`, [fx.tenantId])
  await client.query(`DELETE FROM public.courses WHERE tenant_id = $1`, [fx.tenantId])
  await client.query(`DELETE FROM public.tenants WHERE id = $1`, [fx.tenantId])
}

async function assertNoResidue(client, fx) {
  if (!fx?.tenantId) return
  const checks = [
    ['outbox', `SELECT COUNT(*)::int AS c FROM public.public_cash_course_enroll_outbox WHERE tenant_id = $1`],
    ['idem', `SELECT COUNT(*)::int AS c FROM public.public_cash_course_enroll_idempotency WHERE tenant_id = $1`],
    ['payments', `SELECT COUNT(*)::int AS c FROM public.payments WHERE tenant_id = $1`],
    ['regs', `SELECT COUNT(*)::int AS c FROM public.course_registrations WHERE tenant_id = $1`],
    ['users', `SELECT COUNT(*)::int AS c FROM public.users WHERE tenant_id = $1`],
    ['courses', `SELECT COUNT(*)::int AS c FROM public.courses WHERE tenant_id = $1`],
    ['tenants', `SELECT COUNT(*)::int AS c FROM public.tenants WHERE id = $1`],
  ]
  for (const [name, sql] of checks) {
    const { rows } = await client.query(sql, [fx.tenantId])
    if (rows[0].c !== 0) fail(`residue check failed: ${name}=${rows[0].c}`)
  }
}

function record(id, status, detail = '') {
  results.push({ id, status, detail })
  console.log(`[result] ${id}: ${status}${detail ? ' — ' + detail : ''}`)
}

/**
 * Bounded advisory-lock observability probe (harness-only key).
 * Must pass before Test 7 can be considered executable.
 */
async function probeAdvisoryObservability(url) {
  identityGate(url, { phase: 'advisory-probe' })
  const a = await openClient(url)
  const b = await openClient(url)
  const c = await openClient(url)
  let blocked = null
  try {
    const pidA = await backendPid(a)
    const pidB = await backendPid(b)
    if (pidA === pidB) fail('advisory probe: pidA === pidB')

    const { rows: keyRows } = await c.query(
      `SELECT hashtextextended($1, 0) AS lock_key`,
      [HARNESS_PROBE_LABEL],
    )
    const probeKey = keyRows[0].lock_key

    await a.query('BEGIN')
    await a.query(`SELECT pg_advisory_xact_lock($1::bigint)`, [probeKey])

    const heldBefore = await advisoryLockRows(c, probeKey)
    if (!heldBefore.some((r) => Number(r.pid) === pidA && r.granted === true)) {
      fail('advisory probe: cannot observe granted lock for holder via key reconstruction')
    }

    let bDone = false
    let bError = null
    const bPromise = (async () => {
      try {
        await b.query('BEGIN')
        await b.query(`SELECT pg_advisory_xact_lock($1::bigint)`, [probeKey])
        bDone = true
      } catch (e) {
        bError = e
        await safeRollback(b)
      }
    })()

    const witness = await waitForAdvisoryWaiter(c, {
      holderPid: pidA,
      waiterPid: pidB,
      lockKey: probeKey,
      budgetMs: WAIT_BUDGET_MS,
    })

    if (!witness.ok) {
      await safeRollback(a)
      await safeRollback(b)
      return {
        ok: false,
        reason: 'wait witness unreliable: B never observed as granted=false on reconstructed harness probe key',
        rows: witness.rows,
      }
    }

    await a.query('COMMIT')
    await Promise.race([
      bPromise,
      sleep(WAIT_BUDGET_MS).then(() => { throw new Error('B did not proceed after A commit') }),
    ])
    if (bError) throw bError
    if (!bDone) fail('advisory probe: B did not complete after release')
    await b.query('COMMIT')

    console.log('[preflight] advisory observability probe OK')
    return { ok: true }
  } catch (e) {
    await safeRollback(a)
    await safeRollback(b)
    blocked = e
    return { ok: false, reason: String(e?.message || e) }
  } finally {
    await a.end().catch(() => {})
    await b.end().catch(() => {})
    await c.end().catch(() => {})
  }
}

async function preflightOverlappingTx(url) {
  const a = await openClient(url)
  const b = await openClient(url)
  const c = await openClient(url)
  try {
    const pidA = await backendPid(a)
    const pidB = await backendPid(b)
    if (pidA === pidB) fail('overlapping TX probe: identical PIDs')
    await a.query('BEGIN')
    await b.query('BEGIN')
    const { rows } = await c.query(
      `SELECT pid, state, xact_start IS NOT NULL AS in_xact
         FROM pg_stat_activity
        WHERE pid = ANY($1::int[])`,
      [[pidA, pidB]],
    )
    const ok = rows.filter((r) => r.in_xact).length === 2
    if (!ok) fail('overlapping TX probe: expected two open transactions')
    console.log('[preflight] overlapping TX probe OK', { pidA, pidB })
  } finally {
    await safeRollback(a)
    await safeRollback(b)
    await a.end().catch(() => {})
    await b.end().catch(() => {})
    await c.end().catch(() => {})
  }
}

async function verifyDbIdentityLive(client, phase, connectionHost) {
  // host(inet_server_addr()) strips netmask; NULL means Unix socket (fail closed in assert).
  const { rows } = await client.query(
    `SELECT current_database() AS db, host(inet_server_addr()) AS server_host`,
  )
  try {
    const result = assertLiveServerIdentity({
      connectionHost,
      database: rows[0].db,
      serverHost: rows[0].server_host,
      expectedDb: EXPECTED_DB,
      phase,
    })
    console.log(
      `[identity] live OK phase=${phase} db=${rows[0].db} server=${result.serverHost} topology=${result.topology}`,
    )
  } catch (err) {
    fail(err?.message || String(err))
  }
}

function connectionHostFromUrl(url) {
  return new URL(url).hostname
}

async function runPreflight(url) {
  identityGate(url, { phase: 'preflight-start' })
  await withClient(url, async (client) => {
    await verifyDbIdentityLive(client, 'preflight', connectionHostFromUrl(url))
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS c FROM pg_proc
        WHERE proname = 'enroll_public_cash_course_with_pending_payment'`,
    )
    if (rows[0].c < 1) {
      fail('preflight: F1 enroll RPC missing — bootstrap/apply must run in workflow before harness')
    }
  })
  await preflightOverlappingTx(url)
  const probe = await probeAdvisoryObservability(url)
  if (!probe.ok) {
    record('advisory-observability', 'BLOCKED', probe.reason)
    record('7', 'BLOCKED', 'advisory observability probe failed — Test 7 not executable')
    fail(`preflight advisory probe failed: ${probe.reason}`)
  }
  record('advisory-observability', 'PASS', 'harness-only key wait witness OK')
  identityGate(url, { phase: 'preflight-end' })
  console.log('[preflight] COMPLETE — concurrency scoring not run')
}

async function assertTest7Postconditions(client, fx, key, Ra, Pa) {
  const { rows: idem } = await client.query(
    `SELECT COUNT(*)::int AS c, MIN(registration_id::text) AS reg, MIN(payment_id::text) AS pay
       FROM public.public_cash_course_enroll_idempotency
      WHERE tenant_id = $1 AND idempotency_key = $2`,
    [fx.tenantId, key],
  )
  if (idem[0].c !== 1) fail(`test7: idem count=${idem[0].c}`)
  if (idem[0].reg !== Ra || idem[0].pay !== Pa) fail('test7: idem IDs mismatch')

  const { rows: regs } = await client.query(
    `SELECT COUNT(*)::int AS c FROM public.course_registrations WHERE id = $1 AND tenant_id = $2`,
    [Ra, fx.tenantId],
  )
  if (regs[0].c !== 1) fail('test7: registration count')

  const { rows: pays } = await client.query(
    `SELECT COUNT(*)::int AS c FROM public.payments
      WHERE id = $1 AND tenant_id = $2 AND course_registration_id = $3`,
    [Pa, fx.tenantId, Ra],
  )
  if (pays[0].c !== 1) fail('test7: payment count')

  const { rows: outbox } = await client.query(
    `SELECT COUNT(*)::int AS c FROM public.public_cash_course_enroll_outbox
      WHERE tenant_id = $1
        AND dedupe_key = 'confirmation_email:' || $2::text
        AND event_type = 'confirmation_email'`,
    [fx.tenantId, Ra],
  )
  if (outbox[0].c !== 1) fail(`test7: confirmation outbox count=${outbox[0].c}`)

  const { rows: cashPays } = await client.query(
    `SELECT COUNT(*)::int AS c FROM public.payments
      WHERE tenant_id = $1 AND course_registration_id = $2
        AND (metadata->>'public_cash_course_enroll') = 'true'`,
    [fx.tenantId, Ra],
  )
  if (cashPays[0].c !== 1) fail('test7: duplicate public-cash payments')
}

async function runTest7(url, observabilityOk) {
  identityGate(url, { phase: 'test-7' })
  if (!observabilityOk) {
    record('7', 'BLOCKED', 'advisory observability not OK')
    return
  }

  const a = await openClient(url)
  const b = await openClient(url)
  const c = await openClient(url)
  let fx = null
  try {
    await verifyDbIdentityLive(c, 'test-7', connectionHostFromUrl(url))
    fx = await seedFixtures(c)
    const key = randomUUID()
    const reg = baseRegistration(fx, {
      userId: fx.userA,
      email: 'a@pr421.test',
      firstName: 'Alice',
    })
    const lockKey = await f1LockKey(c, fx.tenantId, key)
    const pidA = await backendPid(a)
    const pidB = await backendPid(b)
    if (pidA === pidB) fail('test7: identical PIDs')

    await a.query('BEGIN')
    await a.query(`SET LOCAL statement_timeout = '15s'`)
    const enrolled = await callEnroll(a, fx, {
      userId: fx.userA,
      idemKey: key,
      registration: reg,
    })
    if (enrolled?.status !== 'enrolled') {
      fail(`test7: expected enrolled, got ${JSON.stringify(enrolled)}`)
    }
    const Ra = enrolled.registration_id
    const Pa = enrolled.payment_id

    const held = await advisoryLockRows(c, lockKey)
    if (!held.some((r) => Number(r.pid) === pidA && r.granted === true)) {
      fail('test7: winner does not hold reconstructed F1 advisory lock after enrolled')
    }

    let bResult = null
    let bError = null
    const bPromise = (async () => {
      try {
        await b.query('BEGIN')
        await b.query(`SET LOCAL statement_timeout = '15s'`)
        bResult = await callEnroll(b, fx, {
          userId: fx.userA,
          idemKey: key,
          registration: reg,
        })
      } catch (e) {
        bError = e
        await safeRollback(b)
      }
    })()

    const witness = await waitForAdvisoryWaiter(c, {
      holderPid: pidA,
      waiterPid: pidB,
      lockKey,
      budgetMs: WAIT_BUDGET_MS,
    })
    if (!witness.ok) {
      await safeRollback(a)
      await safeRollback(b)
      record('7', 'FAIL', 'missing positive wait witness before A commit')
      fail('test7: missing wait witness')
    }

    await a.query('COMMIT')
    await Promise.race([
      bPromise,
      sleep(WAIT_BUDGET_MS).then(() => { throw new Error('test7: B timeout after A commit') }),
    ])
    if (bError) throw bError
    if (bResult?.status !== 'idempotent_replay') {
      fail(`test7: expected idempotent_replay, got ${JSON.stringify(bResult)}`)
    }
    if (bResult.registration_id !== Ra || bResult.payment_id !== Pa) {
      fail('test7: replay IDs do not match winner')
    }
    await b.query('COMMIT')

    await assertTest7Postconditions(c, fx, key, Ra, Pa)
    record('7', 'PASS (7 — advisory lock wait witness + postconditions)')
  } catch (e) {
    await safeRollback(a)
    await safeRollback(b)
    if (!results.some((r) => r.id === '7')) {
      record('7', 'FAIL', String(e?.message || e))
    }
    throw e
  } finally {
    try {
      if (fx) {
        await cleanupFixtures(c, fx)
        await assertNoResidue(c, fx)
      }
    } catch (cleanupErr) {
      console.error('[cleanup] test7 residue failure', cleanupErr?.message)
      throw cleanupErr
    }
    await a.end().catch(() => {})
    await b.end().catch(() => {})
    await c.end().catch(() => {})
  }
}

async function runTest8(url) {
  identityGate(url, { phase: 'test-8' })
  const a = await openClient(url)
  const b = await openClient(url)
  const c = await openClient(url)
  let fx = null
  try {
    fx = await seedFixtures(c)
    const keyA = randomUUID()
    const keyB = randomUUID()
    const pidA = await backendPid(a)
    const pidB = await backendPid(b)
    if (pidA === pidB) fail('test8: identical PIDs')

    const [rA, rB] = await dualOverlapStart(
      async () => {
        await a.query('BEGIN')
        await a.query(`SET LOCAL statement_timeout = '15s'`)
        const result = await callEnroll(a, fx, {
          userId: fx.userA,
          idemKey: keyA,
          registration: baseRegistration(fx, {
            userId: fx.userA,
            email: 'a@pr421.test',
            firstName: 'Alice',
          }),
        })
        await a.query('COMMIT')
        return result
      },
      async () => {
        await b.query('BEGIN')
        await b.query(`SET LOCAL statement_timeout = '15s'`)
        const result = await callEnroll(b, fx, {
          userId: fx.userB,
          idemKey: keyB,
          registration: baseRegistration(fx, {
            userId: fx.userB,
            email: 'b@pr421.test',
            firstName: 'Bob',
          }),
        })
        await b.query('COMMIT')
        return result
      },
    )

    if (rA?.status !== 'enrolled' || rB?.status !== 'enrolled') {
      fail(`test8: expected two enrolled, got ${JSON.stringify({ rA, rB })}`)
    }
    if (rA.registration_id === rB.registration_id) fail('test8: registration IDs collided')

    const { rows: idem } = await c.query(
      `SELECT COUNT(*)::int AS c FROM public.public_cash_course_enroll_idempotency WHERE tenant_id = $1`,
      [fx.tenantId],
    )
    if (idem[0].c !== 2) fail(`test8: expected 2 idem rows, got ${idem[0].c}`)

    record('8', 'PASS (8 — parallel distinct-key enroll)')
  } catch (e) {
    await safeRollback(a)
    await safeRollback(b)
    record('8', 'FAIL', String(e?.message || e))
    throw e
  } finally {
    if (fx) {
      await cleanupFixtures(c, fx)
      await assertNoResidue(c, fx)
    }
    await a.end().catch(() => {})
    await b.end().catch(() => {})
    await c.end().catch(() => {})
  }
}

async function insertPendingOutbox(client, fx, { n = 1 } = {}) {
  // Minimal pending jobs without full enroll (for claim tests).
  const jobs = []
  for (let i = 0; i < n; i++) {
    const regId = randomUUID()
    const payId = randomUUID()
    await client.query(
      `INSERT INTO public.course_registrations (
         id, course_id, tenant_id, user_id, email, status, payment_status, payment_method
       ) VALUES ($1,$2,$3,$4,$5,'confirmed','pending','cash_on_site')`,
      [regId, fx.courseId, fx.tenantId, fx.userA, `outbox${i}@pr421.test`],
    )
    await client.query(
      `INSERT INTO public.payments (
         id, tenant_id, user_id, course_registration_id, payment_method, payment_status,
         total_amount_rappen, metadata
       ) VALUES ($1,$2,$3,$4,'cash_on_site','pending',0,
         jsonb_build_object('public_cash_course_enroll', true))`,
      [payId, fx.tenantId, fx.userA, regId],
    )
    const { rows } = await client.query(
      `INSERT INTO public.public_cash_course_enroll_outbox (
         tenant_id, registration_id, payment_id, enroll_idempotency_key,
         event_type, dedupe_key, payload, status
       ) VALUES (
         $1,$2,$3,$4,'confirmation_email',$5,'{}'::jsonb,'pending'
       ) RETURNING id`,
      [fx.tenantId, regId, payId, randomUUID(), `confirmation_email:${regId}`],
    )
    jobs.push(rows[0].id)
  }
  return jobs
}

async function runTest9(url) {
  identityGate(url, { phase: 'test-9' })
  const a = await openClient(url)
  const b = await openClient(url)
  const c = await openClient(url)
  let fx = null
  try {
    fx = await seedFixtures(c)
    const [jobId] = await insertPendingOutbox(c, fx, { n: 1 })
    const pidA = await backendPid(a)
    const pidB = await backendPid(b)
    if (pidA === pidB) fail('test9: identical PIDs')

    const [cA, cB] = await dualOverlapStart(
      async () => {
        const { rows } = await a.query(
          `SELECT * FROM public.claim_public_cash_enroll_outbox_batch(1, $1, 60)`,
          ['worker-a'],
        )
        return rows
      },
      async () => {
        const { rows } = await b.query(
          `SELECT * FROM public.claim_public_cash_enroll_outbox_batch(1, $1, 60)`,
          ['worker-b'],
        )
        return rows
      },
    )

    const claims = [...cA, ...cB]
    if (claims.length !== 1) fail(`test9: expected exactly one claim, got ${claims.length}`)
    if (claims[0].id !== jobId) fail('test9: unexpected job id')
    const winner = cA.length === 1 ? 'worker-a' : 'worker-b'
    const { rows: st } = await c.query(
      `SELECT status, claimed_by, attempts FROM public.public_cash_course_enroll_outbox WHERE id = $1`,
      [jobId],
    )
    if (st[0].status !== 'processing') fail('test9: status not processing')
    if (st[0].claimed_by !== winner) fail(`test9: claimed_by=${st[0].claimed_by}`)
    if (Number(st[0].attempts) !== 1) fail(`test9: attempts=${st[0].attempts}`)

    record('9', 'PASS (9 — single claim SKIP LOCKED)')
  } catch (e) {
    record('9', 'FAIL', String(e?.message || e))
    throw e
  } finally {
    if (fx) {
      await cleanupFixtures(c, fx)
      await assertNoResidue(c, fx)
    }
    await a.end().catch(() => {})
    await b.end().catch(() => {})
    await c.end().catch(() => {})
  }
}

async function runTest10(url) {
  identityGate(url, { phase: 'test-10' })
  const a = await openClient(url)
  const b = await openClient(url)
  const c = await openClient(url)
  let fx = null
  try {
    fx = await seedFixtures(c)
    const jobIds = await insertPendingOutbox(c, fx, { n: 2 })
    const pidA = await backendPid(a)
    const pidB = await backendPid(b)
    if (pidA === pidB) fail('test10: identical PIDs')

    const [cA, cB] = await dualOverlapStart(
      async () => {
        const { rows } = await a.query(
          `SELECT * FROM public.claim_public_cash_enroll_outbox_batch(1, $1, 60)`,
          ['worker-a'],
        )
        return rows
      },
      async () => {
        const { rows } = await b.query(
          `SELECT * FROM public.claim_public_cash_enroll_outbox_batch(1, $1, 60)`,
          ['worker-b'],
        )
        return rows
      },
    )

    if (cA.length !== 1 || cB.length !== 1) {
      fail(`test10: expected 1+1 claims, got ${cA.length}+${cB.length}`)
    }
    if (cA[0].id === cB[0].id) fail('test10: both workers claimed same job')
    const claimed = new Set([cA[0].id, cB[0].id])
    for (const id of jobIds) {
      if (!claimed.has(id)) fail('test10: missing job in claims')
    }

    record('10', 'PASS (10 — multi-job parallel claim)')
  } catch (e) {
    record('10', 'FAIL', String(e?.message || e))
    throw e
  } finally {
    if (fx) {
      await cleanupFixtures(c, fx)
      await assertNoResidue(c, fx)
    }
    await a.end().catch(() => {})
    await b.end().catch(() => {})
    await c.end().catch(() => {})
  }
}

async function runTest26A(url) {
  identityGate(url, { phase: 'test-26A' })
  const a = await openClient(url)
  const b = await openClient(url)
  const c = await openClient(url)
  let fx = null
  try {
    fx = await seedFixtures(c)
    const [jobId] = await insertPendingOutbox(c, fx, { n: 1 })
    const pidA = await backendPid(a)
    const pidB = await backendPid(b)
    if (pidA === pidB) fail('test26A: identical PIDs')

    const [cA, cB] = await dualOverlapStart(
      async () => {
        const { rows } = await a.query(
          `SELECT * FROM public.claim_public_cash_enroll_outbox_batch(1, $1, 60)`,
          ['drain-a'],
        )
        return rows
      },
      async () => {
        const { rows } = await b.query(
          `SELECT * FROM public.claim_public_cash_enroll_outbox_batch(1, $1, 60)`,
          ['drain-b'],
        )
        return rows
      },
    )

    const winnerRows = cA.length === 1 ? cA : cB.length === 1 ? cB : null
    const loserRows = cA.length === 1 ? cB : cB.length === 1 ? cA : null
    if (!winnerRows || loserRows === null) fail('test26A: claim exclusivity failed')
    if (loserRows.length !== 0) fail('test26A: loser also claimed')
    if (winnerRows[0].id !== jobId) fail('test26A: wrong job')

    const winnerClient = cA.length === 1 ? a : b
    const winnerId = cA.length === 1 ? 'drain-a' : 'drain-b'
    // Fake process: no HTTP / email / SARI
    await winnerClient.query(
      `SELECT public.complete_public_cash_enroll_outbox_job($1::uuid, $2::text)`,
      [jobId, winnerId],
    )

    const { rows: st } = await c.query(
      `SELECT status, claimed_by, attempts, dedupe_key
         FROM public.public_cash_course_enroll_outbox WHERE id = $1`,
      [jobId],
    )
    if (st[0].status !== 'completed') fail(`test26A: status=${st[0].status}`)
    if (st[0].claimed_by !== winnerId) fail('test26A: claimed_by mismatch')
    if (Number(st[0].attempts) !== 1) fail(`test26A: attempts=${st[0].attempts}`)

    const { rows: dedupe } = await c.query(
      `SELECT COUNT(*)::int AS c FROM public.public_cash_course_enroll_outbox
        WHERE tenant_id = $1 AND dedupe_key = $2`,
      [fx.tenantId, st[0].dedupe_key],
    )
    if (dedupe[0].c !== 1) fail('test26A: dedupe invariant broken')

    record('26A', 'PASS (26A — DB dual-drainer)')
  } catch (e) {
    record('26A', 'FAIL', String(e?.message || e))
    throw e
  } finally {
    if (fx) {
      await cleanupFixtures(c, fx)
      await assertNoResidue(c, fx)
    }
    await a.end().catch(() => {})
    await b.end().catch(() => {})
    await c.end().catch(() => {})
  }
}

async function runConcurrency(url) {
  if (process.env.PR421_CONCURRENCY_EXECUTION_APPROVED !== '1') {
    fail('concurrency mode refused: set PR421_CONCURRENCY_EXECUTION_APPROVED=1 only with Gate C approval')
  }
  identityGate(url, { phase: 'concurrency-start' })

  const probe = await probeAdvisoryObservability(url)
  const observabilityOk = probe.ok
  if (!observabilityOk) {
    record('advisory-observability', 'BLOCKED', probe.reason)
    record('7', 'BLOCKED', 'advisory observability probe failed')
  } else {
    record('advisory-observability', 'PASS')
    await runTest7(url, true)
  }

  await runTest8(url)
  await runTest9(url)
  await runTest10(url)
  await runTest26A(url)
  record('26B', 'NOT RUN — BLOCKED (PG-only Path A)')

  identityGate(url, { phase: 'concurrency-end' })
}

function verifyF1ChecksumOnDisk() {
  const path = resolve(ROOT, F1_REL)
  const buf = readFileSync(path)
  const sha = createHash('sha256').update(buf).digest('hex')
  if (sha !== F1_EXPECTED_SHA256) {
    fail(`F1 SHA-256 mismatch: got ${sha}, expected ${F1_EXPECTED_SHA256}`)
  }
  console.log(`[checksum] F1 migration OK ${sha}`)
}

function summarizeAndExit() {
  console.log('[summary]')
  for (const r of results) {
    console.log(`  ${r.id}: ${r.status}${r.detail ? ' — ' + r.detail : ''}`)
  }
  // 26B expected NOT RUN label must not fail the job; any other FAIL/BLOCKED does.
  const unexpected = results.some((r) => {
    if (r.id === '26B') return false
    return r.status.startsWith('FAIL') || r.status.startsWith('BLOCKED')
  })
  if (unexpected) process.exitCode = 1
}

async function main() {
  verifyF1ChecksumOnDisk()
  const url = buildDatabaseUrl()
  identityGate(url, { phase: 'startup' })
  console.log(`[harness] mode=${MODE} target=${redactUrl(url)}`)

  if (MODE === 'preflight') {
    await runPreflight(url)
  } else {
    await runConcurrency(url)
  }

  summarizeAndExit()
}

main().catch((err) => {
  console.error('[fatal]', err?.message || err)
  process.exit(1)
})
