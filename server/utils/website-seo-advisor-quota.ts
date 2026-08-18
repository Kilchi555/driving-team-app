const DAILY_LIMIT = 3

export function zurichDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function zurichTomorrowIso(now = new Date()) {
  const key = zurichDateKey(now)
  const [y, m, d] = key.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0))
  // 00:00 next Zurich day ≈ 22:00 UTC previous day in summer; show date only
  return zurichDateKey(new Date(next.getTime() + 12 * 60 * 60 * 1000))
}

export type SeoAdvisorUsage = {
  date?: string
  count?: number
  last?: Record<string, unknown> | null
}

export function readSeoAdvisorQuota(raw: unknown, now = new Date()) {
  const today = zurichDateKey(now)
  const usage = (raw && typeof raw === 'object' ? raw : {}) as SeoAdvisorUsage
  const count = usage.date === today ? Number(usage.count || 0) : 0
  return {
    today,
    count,
    remaining: Math.max(0, DAILY_LIMIT - count),
    limit: DAILY_LIMIT,
    last: usage.last || null,
    resets_on: zurichTomorrowIso(now),
  }
}

export async function consumeSeoAdvisorQuota(
  supabase: { from: (t: string) => any },
  websiteId: string,
  currentRaw: unknown,
  last: Record<string, unknown>,
) {
  const snap = readSeoAdvisorQuota(currentRaw)
  if (snap.remaining < 1) {
    return { ok: false as const, ...snap }
  }
  const next = {
    date: snap.today,
    count: snap.count + 1,
    last,
  }
  const { error } = await supabase
    .from('website_tenants')
    .update({ seo_advisor_usage: next, updated_at: new Date().toISOString() })
    .eq('id', websiteId)
  if (error) throw new Error(error.message)
  return {
    ok: true as const,
    today: snap.today,
    count: next.count,
    remaining: Math.max(0, DAILY_LIMIT - next.count),
    limit: DAILY_LIMIT,
    last,
    resets_on: snap.resets_on,
  }
}

export async function saveSeoAdvisorLast(
  supabase: { from: (t: string) => any },
  websiteId: string,
  currentRaw: unknown,
  last: Record<string, unknown>,
) {
  const snap = readSeoAdvisorQuota(currentRaw)
  const next = {
    date: snap.today,
    count: snap.count,
    last,
  }
  const { error } = await supabase
    .from('website_tenants')
    .update({ seo_advisor_usage: next, updated_at: new Date().toISOString() })
    .eq('id', websiteId)
  if (error) throw new Error(error.message)
  return { ok: true as const, ...snap, last }
}
