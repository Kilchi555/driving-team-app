import { describe, expect, it } from 'vitest'
import { hasMetaClickId } from '~/server/utils/meta-capi'

describe('hasMetaClickId', () => {
  it('accepts fbclid or fbc', () => {
    expect(hasMetaClickId({ fbclid: 'abc', fbc: null })).toBe(true)
    expect(hasMetaClickId({ fbclid: null, fbc: 'fb.1.1.xyz' })).toBe(true)
  })

  it('rejects empty tokens', () => {
    expect(hasMetaClickId({ fbclid: null, fbc: null })).toBe(false)
    expect(hasMetaClickId({ fbclid: '  ', fbc: 'null' })).toBe(false)
  })

  it('does not treat browser fbp as a click ID — function only accepts fbclid or fbc', () => {
    const fbpOnly = { fbclid: null as string | null, fbc: null as string | null }
    expect(hasMetaClickId(fbpOnly)).toBe(false)
  })
})
