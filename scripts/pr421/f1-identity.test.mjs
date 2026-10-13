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
  isLoopbackHost,
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

function liveOk(serverHost, connectionHost = '127.0.0.1', database = DB) {
  return assertLiveServerIdentity({
    connectionHost,
    database,
    serverHost,
    expectedDb: DB,
    phase: 'preflight',
  })
}

function liveFail(serverHost, connectionHost = '127.0.0.1', database = DB) {
  assertThrows(
    () => assertLiveServerIdentity({
      connectionHost,
      database,
      serverHost,
      expectedDb: DB,
      phase: 'preflight',
    }),
    /live identity/,
  )
}

/** Positive accept must fail when client host or DB name is wrong. */
function assertPositiveWithNegativeControls(serverHost, expectedTopology) {
  const r = liveOk(serverHost)
  assert.equal(r.ok, true)
  assert.equal(r.topology, expectedTopology)

  assertThrows(
    () => liveOk(serverHost, '10.0.0.5', DB),
    /connection host must be loopback/,
  )
  assertThrows(
    () => liveOk(serverHost, '127.0.0.1', 'postgres'),
    /database postgres != pr421_f1_concurrency/,
  )
}

test('normalizeInetHost accepts bare IPs and exact CIDR', () => {
  assert.equal(normalizeInetHost('172.18.0.2'), '172.18.0.2')
  assert.equal(normalizeInetHost('172.18.0.2/32'), '172.18.0.2')
  assert.equal(normalizeInetHost('127.0.0.1/32'), '127.0.0.1')
  assert.equal(normalizeInetHost('::1/128'), '::1')
  assert.equal(normalizeInetHost('[::1]'), '::1')
  assert.equal(normalizeInetHost(null), null)
  assert.equal(normalizeInetHost(''), null)
})

test('normalizeInetHost rejects malformed CIDR suffixes and zone IDs', () => {
  assert.equal(normalizeInetHost('172.18.0.2/32extra'), null)
  assert.equal(normalizeInetHost('172.18.0.2/'), null)
  assert.equal(normalizeInetHost('172.18.0.2/32/8'), null)
  assert.equal(normalizeInetHost('172.18.0.2/-1'), null)
  assert.equal(normalizeInetHost('172.18.0.2/33'), null)
  assert.equal(normalizeInetHost('::1/129'), null)
  assert.equal(normalizeInetHost('fe80::1%eth0'), null)
  assert.equal(normalizeInetHost('not-an-ip'), null)
  assert.equal(normalizeInetHost('172.18.0'), null)
})

test('Actions disposable topology: 127.0.0.1 client + Docker bridge server', () => {
  assertPositiveWithNegativeControls('172.18.0.2', 'docker-bridge-published')
})

test('Actions disposable topology: exact inet text with netmask 172.18.0.2/32', () => {
  assertPositiveWithNegativeControls('172.18.0.2/32', 'docker-bridge-published')
})

test('invalid CIDR suffix 172.18.0.2/32extra rejected', () => {
  liveFail('172.18.0.2/32extra')
})

test('loopback server address with normalization', () => {
  for (const serverHost of ['127.0.0.1', '127.0.0.1/32', '::1', '::1/128', '0:0:0:0:0:0:0:1']) {
    assertPositiveWithNegativeControls(serverHost, 'loopback-server')
    assert.equal(isLoopbackIp(normalizeInetHost(serverHost)), true)
  }
})

test('bracketed IPv6 loopback host [::1] recognized for connection host', () => {
  assert.equal(isLoopbackHost('[::1]'), true)
  const r = liveOk('172.18.0.2', '[::1]', DB)
  assert.equal(r.topology, 'docker-bridge-published')
  const url = assertUrlIdentityGate(`postgresql://u:p@[::1]:5432/${DB}`, { expectedDb: DB })
  assert.equal(url.host, '::1')
})

test('localhost connection host + RFC1918 Docker bridge accepted (conjunction)', () => {
  assertPositiveWithNegativeControls('10.0.0.5', 'docker-bridge-published')
})

test('valid IPv6 ULA accepted only with full identity conjunction', () => {
  assertPositiveWithNegativeControls('fc00::1', 'docker-bridge-published')
  assertPositiveWithNegativeControls('fd12:3456::78', 'docker-bridge-published')
  assert.equal(isDockerBridgeCompatibleServerIp('fc00::1'), true)
})

test('valid IPv6 link-local accepted only with full identity conjunction', () => {
  assertPositiveWithNegativeControls('fe80::1', 'docker-bridge-published')
  assert.equal(isDockerBridgeCompatibleServerIp('fe80::abcd:1'), true)
})

test('malformed IPv6 and zone IDs rejected', () => {
  for (const bad of ['fcgg::1', 'fd:::1', 'fc::', 'fe80:', 'fe80::1%eth0', 'fe80::1%2']) {
    liveFail(bad)
    assert.equal(isDockerBridgeCompatibleServerIp(bad), false)
  }
})

test('IPv4-mapped IPv6 rejected (no unmap / no blanket accept)', () => {
  liveFail('::ffff:8.8.8.8')
  liveFail('::ffff:172.18.0.2')
  liveFail('::ffff:127.0.0.1')
})

test('public IPv4 and public IPv6 rejected', () => {
  liveFail('8.8.8.8')
  liveFail('1.2.3.4/32')
  liveFail('2001:db8::1')
  liveFail('2001:4860:4860::8888')
})

test('CGNAT 100.64.0.1 rejected', () => {
  liveFail('100.64.0.1')
  liveFail('100.127.0.1')
})

test('unverifiable server address (hostname) rejected', () => {
  liveFail('db.example.invalid')
})

test('NULL / empty server address rejected (fail closed)', () => {
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

test('non-loopback connection host rejected by live check', () => {
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

test('URL gate: non-loopback and malformed hosts rejected', () => {
  assertThrows(
    () => assertUrlIdentityGate(`postgresql://u:p@db.example.invalid:5432/${DB}`, {
      phase: 'startup',
      expectedDb: DB,
    }),
    /host must be localhost\/127\.0\.0\.1/,
  )
  assertThrows(
    () => assertUrlIdentityGate(`postgresql://u:p@not_a_host:5432/${DB}`, {
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
