/**
 * Overlay live pricing onto baked services block (home / prices pages).
 */
import { loadWebsiteServices } from '~/server/utils/website-services'

function moneyCHF(cents?: number | null) {
  if (cents == null || Number.isNaN(Number(cents))) return null
  const value = Number(cents) / 100
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(value)
}

export async function applyLivePricesToLanding(
  tenantId: string,
  landing: any,
): Promise<any> {
  if (!landing || typeof landing !== 'object' || !Array.isArray(landing.blocks)) {
    return landing
  }

  const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
  const supabase = getSupabaseAdmin()
  const pricing = await loadWebsiteServices(supabase, tenantId)

  if (!pricing.length) return landing

  const byId = new Map(pricing.map((p) => [String(p.id), p]))
  const byCategory = new Map(pricing.map((p) => [String(p.category), p]))
  const clone = JSON.parse(JSON.stringify(landing))
  const servicesBlock = clone.blocks.find((b: any) => b?.type === 'services')
  if (!servicesBlock?.content?.services?.length) return clone

  servicesBlock.content.services = servicesBlock.content.services.map((svc: any) => {
    const live = byId.get(String(svc.id)) || byCategory.get(String(svc.category || ''))
    if (!live) return svc
    return {
      ...svc,
      duration_minutes: live.duration_minutes ?? svc.duration_minutes,
      price_label: moneyCHF(live.price) || svc.price_label,
      price_live: true,
    }
  })

  clone.live_prices = true
  return clone
}
