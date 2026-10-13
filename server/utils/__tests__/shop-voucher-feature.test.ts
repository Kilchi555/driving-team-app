import { describe, expect, it } from 'vitest'
import {
  parseFeatureEnabled,
  pickCustomVoucherProduct,
  splitShopCatalog,
} from '../shop-voucher-feature'

describe('parseFeatureEnabled', () => {
  it('reads enabled:true from JSON metadata', () => {
    expect(parseFeatureEnabled(JSON.stringify({
      displayName: 'Gutschein-Erstellung',
      enabled: true,
    }))).toBe(true)
  })

  it('reads enabled:false from JSON metadata', () => {
    expect(parseFeatureEnabled(JSON.stringify({ enabled: false }))).toBe(false)
  })

  it('treats legacy metadata without enabled as on', () => {
    expect(parseFeatureEnabled(JSON.stringify({
      displayName: 'Gutschein-Erstellung',
      description: '…',
    }))).toBe(true)
  })

  it('returns false for missing or empty values', () => {
    expect(parseFeatureEnabled(undefined)).toBe(false)
    expect(parseFeatureEnabled(null)).toBe(false)
    expect(parseFeatureEnabled('')).toBe(false)
  })
})

describe('splitShopCatalog', () => {
  const products = [
    { id: 'a', is_voucher: false, allow_custom_amount: false },
    { id: 'b', is_voucher: true, allow_custom_amount: false },
    { id: 'c', is_voucher: true, allow_custom_amount: true },
  ]

  it('picks the custom-amount voucher product', () => {
    expect(pickCustomVoucherProduct(products)?.id).toBe('c')
  })

  it('keeps fixed vouchers in the catalog and excludes the custom template', () => {
    const { catalog, customVoucherProduct } = splitShopCatalog(products)
    expect(customVoucherProduct?.id).toBe('c')
    expect(catalog.map(p => p.id)).toEqual(['a', 'b'])
  })
})
