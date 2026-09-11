import { describe, expect, it } from 'vitest'
import { isTenantLoginPath, resolvePublicTenantRef } from '../public-paths'

describe('resolvePublicTenantRef', () => {
  it('reads tenant login slugs and ignores reserved app routes', () => {
    expect(resolvePublicTenantRef('/acme-fahrschule')).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/driving-team')).toEqual({
      slug: 'driving-team',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/login')).toBeNull()
    expect(resolvePublicTenantRef('/admin')).toBeNull()
    expect(isTenantLoginPath('/acme-fahrschule')).toBe(true)
    expect(isTenantLoginPath('/login')).toBe(false)
  })

  it('reads known public tenant path prefixes', () => {
    expect(resolvePublicTenantRef('/register/acme-fahrschule')).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/register/staff')).toBeNull()
    expect(resolvePublicTenantRef('/login/acme-fahrschule')).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/login/set-password')).toBeNull()
    expect(resolvePublicTenantRef('/ref/acme-fahrschule')).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/booking/availability/acme-fahrschule')).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/booking/waitlist/abc')).toBeNull()
    expect(resolvePublicTenantRef('/newsletter/acme-fahrschule')).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/partner/acme-fahrschule')).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
  })

  it('tags website routes separately and prefers ?tenant= on app URLs', () => {
    expect(resolvePublicTenantRef('/s/acme')).toEqual({ slug: 'acme', surface: 'website' })
    expect(resolvePublicTenantRef('/s/acme/preise')).toEqual({ slug: 'acme', surface: 'website' })
    expect(resolvePublicTenantRef('/login', { tenant: 'acme-fahrschule' })).toEqual({
      slug: 'acme-fahrschule',
      surface: 'app',
    })
    expect(resolvePublicTenantRef('/s/acme', { tenant: 'other' })).toEqual({
      slug: 'acme',
      surface: 'website',
    })
  })

  it('rejects invalid slugs', () => {
    expect(resolvePublicTenantRef('/Not A Slug')).toBeNull()
    expect(resolvePublicTenantRef('/register/foo.bar')).toBeNull()
  })
})
