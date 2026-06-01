import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

/**
 * Marketing LTV Analysis
 *
 * Answers: "Welche Kampagne / welcher Kanal hat wieviel Umsatz generiert?"
 *
 * Joins users.acquisition_* (set at first booking) with all their payments
 * to compute true lifetime value per acquisition channel and campaign.
 */
export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const supabase = getSupabaseAdmin()

  // ── 1. Alle Kunden mit Attribution + Umsatz ──────────────────────────────
  const { data: rows, error } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      acquisition_source,
      acquisition_medium,
      acquisition_campaign,
      acquisition_referrer_page,
      acquisition_gclid,
      acquisition_at,
      created_at,
      payments (
        total_amount_rappen,
        payment_status,
        created_at
      ),
      appointments (
        id,
        status,
        type,
        start_time
      )
    `)
    .eq('tenant_id', user.tenant_id)
    .eq('role', 'student')
    .not('acquisition_at', 'is', null)
    .order('acquisition_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // ── 2. Pro User: Umsatz aggregieren ─────────────────────────────────────
  type UserLTV = {
    user_id: string
    name: string
    acquisition_source: string
    acquisition_medium: string
    acquisition_campaign: string | null
    acquisition_referrer_page: string | null
    acquisition_gclid: string | null
    acquisition_at: string
    is_ads: boolean
    total_appointments: number
    completed_appointments: number
    total_revenue_chf: number
    paid_revenue_chf: number
  }

  const users: UserLTV[] = (rows ?? []).map((r: any) => {
    const payments: any[] = r.payments ?? []
    const appointments: any[] = r.appointments ?? []

    const totalRevenue = payments.reduce((s: number, p: any) => s + (p.total_amount_rappen ?? 0), 0)
    const paidRevenue = payments
      .filter((p: any) => p.payment_status === 'paid' || p.payment_status === 'completed')
      .reduce((s: number, p: any) => s + (p.total_amount_rappen ?? 0), 0)

    const source = r.acquisition_source ?? 'unbekannt'
    const medium = r.acquisition_medium ?? '—'
    const isAds = medium === 'cpc' || !!r.acquisition_gclid

    return {
      user_id: r.id,
      name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
      acquisition_source: source,
      acquisition_medium: medium,
      acquisition_campaign: r.acquisition_campaign ?? null,
      acquisition_referrer_page: r.acquisition_referrer_page ?? null,
      acquisition_gclid: r.acquisition_gclid ?? null,
      acquisition_at: r.acquisition_at,
      is_ads: isAds,
      total_appointments: appointments.filter((a: any) => !a.status?.includes('cancel')).length,
      completed_appointments: appointments.filter((a: any) => a.status === 'completed').length,
      total_revenue_chf: Math.round(totalRevenue) / 100,
      paid_revenue_chf: Math.round(paidRevenue) / 100,
    }
  })

  // ── 3. Aggregation nach Kanal ────────────────────────────────────────────
  type ChannelSummary = {
    label: string
    source: string
    medium: string
    campaign: string | null
    is_ads: boolean
    customers: number
    total_appointments: number
    total_revenue_chf: number
    paid_revenue_chf: number
    avg_ltv_chf: number
  }

  const channelMap = new Map<string, ChannelSummary>()

  for (const u of users) {
    const key = u.acquisition_campaign
      ? `${u.acquisition_source}/${u.acquisition_medium}/${u.acquisition_campaign}`
      : `${u.acquisition_source}/${u.acquisition_medium}`

    const existing = channelMap.get(key)
    if (existing) {
      existing.customers++
      existing.total_appointments += u.total_appointments
      existing.total_revenue_chf += u.total_revenue_chf
      existing.paid_revenue_chf += u.paid_revenue_chf
    } else {
      const label = u.acquisition_campaign
        ? `${u.acquisition_source} · ${u.acquisition_campaign}`
        : u.acquisition_medium === 'cpc'
          ? `Google Ads (${u.acquisition_source})`
          : u.acquisition_source === 'organic/direct'
            ? 'Organisch / Direkt'
            : u.acquisition_source

      channelMap.set(key, {
        label,
        source: u.acquisition_source,
        medium: u.acquisition_medium,
        campaign: u.acquisition_campaign,
        is_ads: u.is_ads,
        customers: 1,
        total_appointments: u.total_appointments,
        total_revenue_chf: u.total_revenue_chf,
        paid_revenue_chf: u.paid_revenue_chf,
        avg_ltv_chf: 0,
      })
    }
  }

  const byChannel = [...channelMap.values()]
    .map(c => ({ ...c, avg_ltv_chf: c.customers > 0 ? Math.round((c.total_revenue_chf / c.customers) * 100) / 100 : 0 }))
    .sort((a, b) => b.total_revenue_chf - a.total_revenue_chf)

  // ── 4. Totals ────────────────────────────────────────────────────────────
  const totalCustomers = users.length
  const totalRevenue = users.reduce((s, u) => s + u.total_revenue_chf, 0)
  const adsRevenue = users.filter(u => u.is_ads).reduce((s, u) => s + u.total_revenue_chf, 0)
  const organicRevenue = users.filter(u => !u.is_ads).reduce((s, u) => s + u.total_revenue_chf, 0)

  return {
    summary: {
      total_attributed_customers: totalCustomers,
      total_revenue_chf: Math.round(totalRevenue * 100) / 100,
      ads_revenue_chf: Math.round(adsRevenue * 100) / 100,
      organic_revenue_chf: Math.round(organicRevenue * 100) / 100,
      avg_ltv_chf: totalCustomers > 0 ? Math.round((totalRevenue / totalCustomers) * 100) / 100 : 0,
    },
    byChannel,
    users: users.slice(0, 50), // Top 50 attributed users
    note: 'Nur Kunden mit bekannter Akquisitionsquelle (acquisition_at IS NOT NULL). Umsatz = alle Payments des Kunden, unabhängig vom Buchungsdatum.',
  }
})
