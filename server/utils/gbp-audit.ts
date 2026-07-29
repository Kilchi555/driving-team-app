import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  getGbpAutomationSettings,
  getGbpLocationProfile,
  getGbpReviews,
  getAllGbpReviews,
  getGbpServices,
  listGbpPosts,
  resolveGbpLocation,
} from '~/server/utils/gbp'
import { syncGbpInsights, GBP_INSIGHT_METRICS, type GbpInsightMetric } from '~/server/utils/gbp-insights'
import { requireAnthropicApiKey } from '~/server/utils/gbp-automation'

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / DAY_MS)
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export interface GbpAuditCategoryScore {
  key: 'profile' | 'reviews' | 'content' | 'visibility'
  label: string
  score: number
  summary: string
}

export interface GbpAuditRecommendation {
  priority: 'critical' | 'important' | 'optional'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  tab: 'profile' | 'posts' | 'photos' | 'reviews' | 'settings' | null
}

export interface GbpAuditResult {
  overallScore: number
  categories: GbpAuditCategoryScore[]
  strengths: string[]
  recommendations: GbpAuditRecommendation[]
  facts: {
    reviewCount: number
    averageRating: number
    replyRatePct: number
    lastPostDaysAgo: number | null
    postsLast28Days: number
    photoCount: number
    lastPhotoPublishedDaysAgo: number | null
    hoursConfiguredDays: number
    servicesCount: number
    insightsTotals28d: Record<GbpInsightMetric, number>
    insightsTrendPct: number | null
  }
  generatedAt: string
}

const CATEGORY_LABELS: Record<GbpAuditCategoryScore['key'], string> = {
  profile: 'Profil & Basisdaten',
  reviews: 'Bewertungen & Reputation',
  content: 'Aktualität (Posts & Fotos)',
  visibility: 'Sichtbarkeit & Performance',
}

/**
 * Gathers a structured snapshot of a location's GBP health and computes
 * deterministic sub-scores. Kept separate from AI synthesis so scores stay
 * stable/reproducible — only the qualitative narrative comes from Claude.
 */
async function buildAuditSnapshot(tenantId: string, locationId?: string | null) {
  const loc = await resolveGbpLocation(tenantId, locationId)

  const [profile, servicesResult, reviewsMeta, postsResult, settings] = await Promise.all([
    getGbpLocationProfile(tenantId, loc.id),
    getGbpServices(tenantId, loc.id),
    getGbpReviews(tenantId, loc.id),
    listGbpPosts(tenantId, loc.id),
    getGbpAutomationSettings(tenantId, loc.id),
  ])

  const recentReviews = await getAllGbpReviews(tenantId, 3, undefined, loc.id).catch(() => [])

  const { data: mediaRows } = await getSupabaseAdmin()
    .from('gbp_media_assets')
    .select('category, approved, last_published_at, created_at, location_id')
    .eq('tenant_id', tenantId)
    .or(`location_id.eq.${loc.id},location_id.is.null`)

  // Insights: sync once, then read raw rows ourselves for a 56-day trend window.
  let insightsTotals28d = Object.fromEntries(GBP_INSIGHT_METRICS.map((m) => [m, 0])) as Record<GbpInsightMetric, number>
  let insightsTrendPct: number | null = null
  try {
    await syncGbpInsights(tenantId, loc.id)
    const today = new Date()
    const from56 = new Date(today.getTime() - 55 * DAY_MS)
    const { data: rows } = await getSupabaseAdmin()
      .from('gbp_insights_daily')
      .select('metric, value, metric_date')
      .eq('location_id', loc.id)
      .gte('metric_date', from56.toISOString().slice(0, 10))
      .lte('metric_date', today.toISOString().slice(0, 10))

    const cutoff = new Date(today.getTime() - 27 * DAY_MS).toISOString().slice(0, 10)
    let recentSum = 0
    let priorSum = 0
    for (const row of rows ?? []) {
      const val = row.value || 0
      if ((GBP_INSIGHT_METRICS as readonly string[]).includes(row.metric) && row.metric_date >= cutoff) {
        insightsTotals28d[row.metric as GbpInsightMetric] += val
      }
      if (row.metric_date >= cutoff) recentSum += val
      else priorSum += val
    }
    const hasFullHistory = (rows ?? []).some((r) => r.metric_date < cutoff)
    if (hasFullHistory && priorSum > 0) {
      insightsTrendPct = Math.round(((recentSum - priorSum) / priorSum) * 100)
    }
  } catch {
    // Insights sync can fail independently (e.g. token issue) — audit continues without it.
  }

  return { loc, profile, servicesResult, reviewsMeta, postsResult, settings, recentReviews, mediaRows: mediaRows ?? [], insightsTotals28d, insightsTrendPct }
}

function scoreProfile(profile: Awaited<ReturnType<typeof getGbpLocationProfile>>): { score: number; hoursConfiguredDays: number } {
  let score = 0
  if (profile.phoneNumber) score += 15
  if (profile.websiteUri) score += 15
  if (profile.description) score += 15
  if ((profile.description?.length ?? 0) >= 300) score += 10
  if (profile.primaryCategory) score += 15
  if ((profile.additionalCategories?.length ?? 0) >= 1) score += 10
  const hoursConfiguredDays = profile.regularHours?.length ?? 0
  score += (hoursConfiguredDays / 7) * 20
  return { score: Math.round(clamp(score, 0, 100)), hoursConfiguredDays }
}

function scoreReviews(
  reviewsMeta: { averageRating: number; totalReviewCount: number },
  recentReviews: { updateTime: string; reviewReply?: unknown }[]
): { score: number; replyRatePct: number } {
  const avgRating = reviewsMeta.averageRating || 0
  const count = reviewsMeta.totalReviewCount || 0
  const ratingScore = clamp(((avgRating - 3) / 2) * 40, 0, 40)
  const countScore = clamp(count * 0.6, 0, 30)
  const replied = recentReviews.filter((r) => !!r.reviewReply).length
  const replyRate = recentReviews.length > 0 ? replied / recentReviews.length : 0
  const replyScore = replyRate * 30
  return { score: Math.round(ratingScore + countScore + replyScore), replyRatePct: Math.round(replyRate * 100) }
}

function scoreContent(
  posts: { createTime?: string }[],
  postsPerWeekTarget: number,
  mediaRows: { approved: boolean | null; last_published_at: string | null; created_at: string }[]
): { score: number; lastPostDaysAgo: number | null; postsLast28Days: number; photoCount: number; lastPhotoPublishedDaysAgo: number | null } {
  const postDates = posts.map((p) => p.createTime).filter(Boolean) as string[]
  const lastPostDaysAgo = postDates.length ? Math.min(...postDates.map((d) => daysAgo(d) ?? Infinity)) : null
  const postsLast28Days = postDates.filter((d) => (daysAgo(d) ?? Infinity) <= 28).length

  let recencyScore = 0
  if (lastPostDaysAgo == null) recencyScore = 0
  else if (lastPostDaysAgo <= 7) recencyScore = 40
  else if (lastPostDaysAgo <= 14) recencyScore = 32
  else if (lastPostDaysAgo <= 30) recencyScore = 20
  else if (lastPostDaysAgo <= 60) recencyScore = 10

  const targetPer28Days = Math.max(1, postsPerWeekTarget) * 4
  const frequencyScore = clamp((postsLast28Days / targetPer28Days) * 20, 0, 20)

  const publishedPhotos = mediaRows.filter((m) => m.last_published_at)
  const photoCount = publishedPhotos.length
  const photoCountScore = clamp(photoCount * 1.25, 0, 25)

  const lastPhotoDate = publishedPhotos
    .map((m) => m.last_published_at)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined
  const lastPhotoPublishedDaysAgo = daysAgo(lastPhotoDate)
  let photoRecencyScore = 0
  if (lastPhotoPublishedDaysAgo == null) photoRecencyScore = 0
  else if (lastPhotoPublishedDaysAgo <= 30) photoRecencyScore = 15
  else if (lastPhotoPublishedDaysAgo <= 90) photoRecencyScore = 8

  return {
    score: Math.round(recencyScore + frequencyScore + photoCountScore + photoRecencyScore),
    lastPostDaysAgo,
    postsLast28Days,
    photoCount,
    lastPhotoPublishedDaysAgo,
  }
}

function scoreVisibility(trendPct: number | null): number {
  if (trendPct == null) return 65
  if (trendPct >= 10) return 100
  if (trendPct >= 0) return 80
  if (trendPct >= -10) return 60
  return 40
}

const AI_JSON_SCHEMA_HINT = `{
  "categories": { "profile": "1-2 Sätze", "reviews": "1-2 Sätze", "content": "1-2 Sätze", "visibility": "1-2 Sätze" },
  "strengths": ["kurzer Satz", "..."],
  "recommendations": [
    { "priority": "critical|important|optional", "title": "kurz", "description": "1-2 Sätze, konkret", "impact": "high|medium|low", "effort": "low|medium|high", "tab": "profile|posts|photos|reviews|settings|null" }
  ]
}`

async function synthesizeWithAi(input: {
  tenantName: string
  locationTitle?: string | null
  scores: { profile: number; reviews: number; content: number; visibility: number }
  facts: GbpAuditResult['facts']
}): Promise<{ categories: Record<string, string>; strengths: string[]; recommendations: GbpAuditRecommendation[] }> {
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const prompt = `Du bist ein erfahrener Local-SEO-Berater für Fahrschulen in der Schweiz. Analysiere das Google Business Profile von "${input.tenantName}"${input.locationTitle ? ` (Standort: ${input.locationTitle})` : ''} anhand dieser Fakten und Scores (0-100, bereits berechnet — nicht neu bewerten, nur interpretieren):

Scores: Profil=${input.scores.profile}, Bewertungen=${input.scores.reviews}, Aktualität=${input.scores.content}, Sichtbarkeit=${input.scores.visibility}

Fakten:
- ${input.facts.reviewCount} Bewertungen, Ø ${input.facts.averageRating.toFixed(1)}★, Antwortrate ${input.facts.replyRatePct}%
- Letzter Post vor ${input.facts.lastPostDaysAgo ?? 'nie'} Tagen, ${input.facts.postsLast28Days} Posts in den letzten 28 Tagen
- ${input.facts.photoCount} veröffentlichte Fotos, letztes vor ${input.facts.lastPhotoPublishedDaysAgo ?? 'nie'} Tagen
- Öffnungszeiten an ${input.facts.hoursConfiguredDays}/7 Tagen konfiguriert
- ${input.facts.servicesCount} Leistungen hinterlegt
- Sichtbarkeits-Trend (28 Tage vs. vorherige 28 Tage): ${input.facts.insightsTrendPct != null ? input.facts.insightsTrendPct + '%' : 'noch nicht genug Daten'}

Schreibe auf Schweizer Hochdeutsch, konkret und handlungsorientiert (kein Marketing-Blabla). Beziehe dich auf die tatsächlichen Zahlen oben. Priorisiere Empfehlungen nach echtem Reichweiten-Impact für eine lokale Fahrschule (Sichtbarkeit in Google Maps/Suche, Anfragen). Gib 4-7 Empfehlungen, sortiert nach Priorität (critical zuerst).

Antworte AUSSCHLIESSLICH mit validem JSON in exakt diesem Format, ohne Markdown-Codeblock:
${AI_JSON_SCHEMA_HINT}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      categories: parsed.categories ?? {},
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 8) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 10) : [],
    }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'KI-Analyse konnte nicht gelesen werden' })
  }
}

/**
 * Runs a full GBP audit: gathers live data, computes deterministic scores,
 * then asks Claude to turn them into a prioritized, plain-language action plan.
 */
export async function runGbpAudit(tenantId: string, tenantName: string, locationId?: string | null): Promise<GbpAuditResult> {
  const snap = await buildAuditSnapshot(tenantId, locationId)

  const profileScore = scoreProfile(snap.profile)
  const reviewsScore = scoreReviews(snap.reviewsMeta, snap.recentReviews)
  const contentScore = scoreContent(snap.postsResult?.localPosts ?? [], snap.settings.posts_per_week, snap.mediaRows as any)
  const visibilityScore = scoreVisibility(snap.insightsTrendPct)

  const facts: GbpAuditResult['facts'] = {
    reviewCount: snap.reviewsMeta.totalReviewCount || 0,
    averageRating: snap.reviewsMeta.averageRating || 0,
    replyRatePct: reviewsScore.replyRatePct,
    lastPostDaysAgo: contentScore.lastPostDaysAgo,
    postsLast28Days: contentScore.postsLast28Days,
    photoCount: contentScore.photoCount,
    lastPhotoPublishedDaysAgo: contentScore.lastPhotoPublishedDaysAgo,
    hoursConfiguredDays: profileScore.hoursConfiguredDays,
    servicesCount: snap.servicesResult.services.length,
    insightsTotals28d: snap.insightsTotals28d,
    insightsTrendPct: snap.insightsTrendPct,
  }

  const ai = await synthesizeWithAi({
    tenantName,
    locationTitle: snap.loc.title,
    scores: { profile: profileScore.score, reviews: reviewsScore.score, content: contentScore.score, visibility: visibilityScore },
    facts,
  })

  const categories: GbpAuditCategoryScore[] = (['profile', 'reviews', 'content', 'visibility'] as const).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    score: { profile: profileScore.score, reviews: reviewsScore.score, content: contentScore.score, visibility: visibilityScore }[key],
    summary: ai.categories[key] || '',
  }))

  const overallScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)

  return {
    overallScore,
    categories,
    strengths: ai.strengths,
    recommendations: ai.recommendations,
    facts,
    generatedAt: new Date().toISOString(),
  }
}
