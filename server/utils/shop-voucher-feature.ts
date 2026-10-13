/**
 * Public shop helpers for custom voucher creation.
 * Guests cannot read tenant_settings via RLS; the shop API evaluates this server-side.
 */

export {
  CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE,
  canAddCustomVoucherToCart,
  customVoucherCheckoutLimitError,
  customVoucherFulfillmentKey,
  customVoucherUnitCount,
  isCustomAmountVoucher,
  resolveCustomVoucherDescription,
  resolveCustomVoucherDisplayName,
  resolveCustomVoucherRecipient,
} from '~/utils/shop-custom-voucher'

export type ShopCustomVoucherProduct = {
  id: string
  name: string
  description?: string | null
  price_rappen: number
  category?: string | null
  display_order?: number | null
  is_voucher: boolean
  allow_custom_amount: boolean
  min_amount_rappen: number | null
  max_amount_rappen: number | null
}

/** Default bounds match VoucherProductSelector (CHF 1–1000). */
export const SHOP_CUSTOM_VOUCHER_MIN_RAPPEN = 100
export const SHOP_CUSTOM_VOUCHER_MAX_RAPPEN = 100_000

export function parseFeatureEnabled(settingValue: string | null | undefined): boolean {
  if (!settingValue) return false
  try {
    const parsed = JSON.parse(settingValue)
    if (typeof parsed.enabled === 'boolean') return parsed.enabled
    // Legacy rows with display metadata but no enabled field → treat as on
    if (parsed.displayName || parsed.description) return true
  } catch {
    if (settingValue === 'true') return true
    if (settingValue === 'false') return false
  }
  return false
}

export function pickCustomVoucherProduct<T extends {
  is_voucher?: boolean | null
  allow_custom_amount?: boolean | null
}>(products: T[]): T | null {
  return products.find(p => p.is_voucher === true && p.allow_custom_amount === true) || null
}

export function splitShopCatalog<T extends {
  is_voucher?: boolean | null
  allow_custom_amount?: boolean | null
}>(products: T[]): { catalog: T[]; customVoucherProduct: T | null } {
  const customVoucherProduct = pickCustomVoucherProduct(products)
  const catalog = products.filter(p => !(p.is_voucher === true && p.allow_custom_amount === true))
  return { catalog, customVoucherProduct }
}
