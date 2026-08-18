/**
 * Public website product catalog: Simy products table + wizard-entered extras.
 * Credit top-ups stay internal. Gift vouchers can appear.
 */

export type WebsiteProductCard = {
  id: string
  name: string
  description: string
  price_cents: number | null
  price_label: string | null
  category: string | null
  source: 'db' | 'custom'
  shop_url?: string | null
  image_url?: string | null
}

type SupabaseLike = { from: (table: string) => any }

function moneyCHF(cents?: number | null) {
  if (cents == null || Number.isNaN(Number(cents))) return null
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(Number(cents) / 100)
}

export function isCustomWebsiteProduct(p: { id?: string; source?: string } | null) {
  if (!p) return false
  if (p.source === 'custom') return true
  const id = String(p.id || '')
  return id.startsWith('product-') || id.startsWith('wiz-product-')
}

export function shopUrlForTenant(bookingUrl: string, slug?: string | null) {
  if (!slug) return null
  const base = String(bookingUrl || '')
    .replace(/\/booking\/availability\/[^/?#]+.*$/, '')
    .replace(/\/$/, '')
  return base ? `${base}/shop?tenant=${encodeURIComponent(slug)}` : `/shop?tenant=${encodeURIComponent(slug)}`
}

export async function loadWebsiteCatalogProducts(
  supabase: SupabaseLike,
  tenantId: string,
  opts?: { bookingUrl?: string; slug?: string | null },
): Promise<WebsiteProductCard[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, description, price_rappen, category, display_order, is_voucher, show_in_shop, is_credit_product, is_active',
      )
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(24)

    if (error || !data?.length) return []
    const shopUrl = shopUrlForTenant(opts?.bookingUrl || '', opts?.slug)
    return data
      .filter((p: any) => !p.is_credit_product)
      .slice(0, 12)
      .map((p: any) => {
        const cents = p.price_rappen != null ? Number(p.price_rappen) : null
        return {
          id: String(p.id),
          name: String(p.name || '').trim() || 'Produkt',
          description: String(p.description || '').trim(),
          price_cents: Number.isFinite(cents as number) ? cents : null,
          price_label: moneyCHF(cents),
          category: p.category ? String(p.category) : p.is_voucher ? 'Gutschein' : null,
          source: 'db' as const,
          shop_url: p.show_in_shop && shopUrl ? shopUrl : null,
          image_url: null,
        } as WebsiteProductCard
      })
      .filter((p: WebsiteProductCard) => p.name)
  } catch {
    return []
  }
}

export function customProductsFromLanding(
  items: Array<Record<string, any>> | null | undefined,
): WebsiteProductCard[] {
  if (!Array.isArray(items)) return []
  return items.filter(isCustomWebsiteProduct).map((p) => {
    const cents =
      p.price_cents != null
        ? Number(p.price_cents)
        : p.price_chf != null
          ? Math.round(Number(p.price_chf) * 100)
          : null
    return {
      id: String(p.id),
      name: String(p.name || '').trim(),
      description: String(p.description || '').trim(),
      price_cents: Number.isFinite(cents as number) ? cents : null,
      price_label: p.price_label || moneyCHF(cents),
      category: p.category ? String(p.category) : null,
      source: 'custom' as const,
      shop_url: null,
      image_url: typeof p.image_url === 'string' && p.image_url.trim() ? p.image_url.trim() : null,
    } as WebsiteProductCard
  }).filter((p) => p.name)
}

export function mergeWebsiteProducts(
  db: WebsiteProductCard[],
  custom: WebsiteProductCard[],
): WebsiteProductCard[] {
  const seen = new Set(db.map((p) => p.name.toLowerCase()))
  const extras = custom.filter((p) => {
    const key = p.name.toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  return [...db, ...extras].slice(0, 12)
}
