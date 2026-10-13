/**
 * Focused unit tests for PR #421 Path A identity helpers.
 * No network / database connections — pure policy evaluation only.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_EXPECTED_DB,
  assertLiveServerIdentity,
  assertUrlIdentityGate,
  isDockerBridgeCompatibleServerIp,
  isLoopbackIp,
  normalizeInetHost,
} from './f1-identity.mjs'

const DB = DEFAULT_EXPECTED_DB
const LOOPBACK_URL = `postgresql://postgres:pr421_local_only@127.0.0.1:5432/${DB}`

function assertThrows(fn, re) {
  assert.throws(fn, (err) => {
    assert.match(String(err?.message || err), re)
    return true
  })
}

test('normalizeInetHost strips netmask (/32, /128)', () => {
  assert.equal(normalizeInetHost('172.18.0.2/32'), '172.18.0.2')
  assert.equal(normalizeInetHost('127.0.0.1/32'), '127.0.0.1')
  assert.equal(normalizeInetHost('::1/128'), '::1')
  assert.equal(normalizeInetHost('172.18.0.2'), '172.18.0.2')
  assert.equal(normalizeInetHost(null), null)
  assert.equal(normalizeInetHost(''), null)
})

test('Actions disposable topology: 127.0.0.1 client + Docker bridge server', () => {
  const r = assertLiveServerIdentity({
    connectionHost: '127.0.0.1',
    database: DB,
    serverHost: '172.18.0.2',
    expectedDb: DB,
    phase: 'preflight',
  })
  assert.equal(r.ok, true)
  assert.equal(r.topology, 'docker-bridge-published')
  assert.equal(r.serverHost, '172.18.0.2')
})

test('Actions disposable topology: inet text with netmask 172.18.0.2/32', () => {
  const r = assertLiveServerIdentity({
    connectionHost: '127.0.0.1',
    database: DB,
    serverHost: '172.18.0.2/32',
    expectedDb: DB,
  })
  assert.equal(r.ok, true)
  assert.equal(r.serverHost, '172.18.0.2')
  assert.equal(r.topology, 'docker-bridge-published')
})

test('loopback server address with correct normalization', () => {
  for (const serverHost of ['127.0.0.1', '127.0.0.1/32', '::1', '::1/128']) {
    const r = assertLiveServerIdentity({
      connectionHost: '127.0.0.1',
      database: DB,
      serverHost,
      expectedDb: DB,
    })
    assert.equal(r.ok, true)
    assert.equal(r.topology, 'loopback-server')
    assert.equal(isLoopbackIp(r.serverHost), true)
  }
})

test('localhost connection host + RFC1918 Docker bridge accepted (conjunction)', () => {
  const r = assertLiveServerIdentity({
    connectionHost: 'localhost',
    database: DB,
    serverHost: '10.0.0.5',
    expectedDb: DB,
  })
  assert.equal(r.topology, 'docker-bridge-published')
})

test('public server address rejected', () => {
  assertThrows(
    () => assertLiveServerIdentity({
      connectionHost: '127.0.0.1',
      database: DB,
      serverHost: '8.8.8.8',
      expectedDb: DB,
      phase: 'preflight',
    }),
    /unexpected inet_server_addr/,
  )
  assertThrows(
    () => assertLiveServerIdentity({
      connectionHost: '127.0.0.1',
      database: DB,
      serverHost: '1.2.3.4/32',
      expectedDb: DB,
    }),
    /unexpected inet_server_addr/,
  )
})

test('unverifiable server address (hostname) rejected', () => {
  assertThrows(
    () => assertLiveServerIdentity({
      connectionHost: '127.0.0.1',
      database: DB,
      serverHost: 'db.example.invalid',
      expectedDb: DB,
    }),
    /unverifiable inet_server_addr/,
  )
})

test('NULL / Unix-socket server address rejected (fail closed)', () => {
  for (const serverHost of [null, undefined, '']) {
    assertThrows(
      () => assertLiveServerIdentity({
        connectionHost: '127.0.0.1',
        database: DB,
        serverHost,
        expectedDb: DB,
        phase: 'preflight',
      }),
      /inet_server_addr is null|Unix socket not supported/,
    )
  }
})

test('wrong database name rejected even with Docker bridge addr', () => {
  assertThrows(
    () => assertLiveServerIdentity({
      connectionHost: '127.0.0.1',
      database: 'postgres',
      serverHost: '172.18.0.2/32',
      expectedDb: DB,
    }),
    /database postgres != pr421_f1_concurrency/,
  )
})

test('non-loopback connection host rejected by live check (defense in depth)', () => {
  assertThrows(
    () => assertLiveServerIdentity({
      connectionHost: 'db.aws.example',
      database: DB,
      serverHost: '172.18.0.2',
      expectedDb: DB,
    }),
    /connection host must be loopback/,
  )
})

test('RFC1918 alone is not enough without loopback client', () => {
  assert.equal(isDockerBridgeCompatibleServerIp('172.18.0.2'), true)
  assertThrows(
    () => assertLiveServerIdentity({
      connectionHost: '172.18.0.2',
      database: DB,
      serverHost: '172.18.0.2',
      expectedDb: DB,
    }),
    /connection host must be loopback/,
  )
})

test('URL gate: accepts loopback + exact DB name', () => {
  const r = assertUrlIdentityGate(LOOPBACK_URL, { phase: 'startup', expectedDb: DB })
  assert.equal(r.ok, true)
  assert.equal(r.host, '127.0.0.1')
  assert.equal(r.dbName, DB)
})

test('URL gate: non-loopback host rejected', () => {
  assertThrows(
    () => assertUrlIdentityGate(`postgresql://u:p@db.example.invalid:5432/${DB}`, {
      phase: 'startup',
      expectedDb: DB,
    }),
    /host must be localhost\/127\.0\.0\.1/,
  )
})

test('URL gate: SUPABASE_DB_URL present rejected', () => {
  assertThrows(
    () => assertUrlIdentityGate(LOOPBACK_URL, {
      phase: 'startup',
      expectedDb: DB,
      supabaseDbUrlSet: true,
    }),
    /SUPABASE_DB_URL must not be set/,
  )
})

test('URL gate: forbidden hosted project / supabase.co rejected', () => {
  assertThrows(
    () => assertUrlIdentityGate(
      'postgresql://u:p@127.0.0.1:5432/pr421_f1_concurrency?x=unyjaetebnaexaflpyoc',
      { expectedDb: DB },
    ),
    /forbidden substring unyjaetebnaexaflpyoc/,
  )
  assertThrows(
    () => assertUrlIdentityGate(
      'postgresql://u:p@127.0.0.1:5432/pr421_f1_concurrency?ref=kssqalisscxkhvorqwgy',
      { expectedDb: DB },
    ),
    /forbidden substring kssqalisscxkhvorqwgy/,
  )
  assertThrows(
    () => assertUrlIdentityGate(
      `postgresql://u:p@127.0.0.1:5432/${DB}?host=db.xxx.supabase.co`,
      { expectedDb: DB },
    ),
    /forbidden substring supabase\.co/,
  )
})

test('URL gate: wrong database name rejected', () => {
  assertThrows(
    () => assertUrlIdentityGate('postgresql://u:p@127.0.0.1:5432/postgres', {
      expectedDb: DB,
    }),
    /database name must be pr421_f1_concurrency/,
  )
})
