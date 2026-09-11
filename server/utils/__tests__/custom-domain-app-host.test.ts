import { describe, expect, it } from 'vitest'
import { isAppHost, isValidHostname, normalizeHostname } from '../custom-domain'

describe('normalizeHostname', () => {
  it('strips scheme, port, and trailing dot', () => {
    expect(normalizeHostname('https://App.Simy.ch:443/path')).toBe('app.simy.ch')
    expect(normalizeHostname('172.30.0.2:3000')).toBe('172.30.0.2')
  })
})

describe('isAppHost', () => {
  it('treats production and local loopback as the app', () => {
    expect(isAppHost('app.simy.ch')).toBe(true)
    expect(isAppHost('localhost:3000')).toBe(true)
    expect(isAppHost('127.0.0.1:3000')).toBe(true)
    expect(isAppHost('something.vercel.app')).toBe(true)
  })

  it('treats Cloud Agent and tunnel hosts as the app, not custom domains', () => {
    expect(isAppHost('cursor')).toBe(true)
    expect(isAppHost('172.30.0.2')).toBe(true)
    expect(isAppHost('bc-611e80c2-32a5-4ce4-9425-d1702f72d5aa.cloud.cursor.com')).toBe(true)
    expect(isAppHost('port-3000.cursor.run')).toBe(true)
    expect(isAppHost('3000.vm.cursor.sh')).toBe(true)
    expect(isAppHost('abc.ngrok-free.dev')).toBe(true)
  })

  it('still treats real customer domains as custom hosts', () => {
    expect(isAppHost('fahrschule-example.ch')).toBe(false)
    expect(isAppHost('www.driving-team.ch')).toBe(false)
  })
})

describe('isValidHostname', () => {
  it('rejects app hosts and accepts a real custom domain', () => {
    expect(isValidHostname('app.simy.ch')).toBe(false)
    expect(isValidHostname('fahrschule-example.ch')).toBe(true)
  })
})
