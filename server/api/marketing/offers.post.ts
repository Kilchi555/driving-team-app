/**
 * POST /api/marketing/offers
 * Atomically create discount (optional) + email template + campaign + marketing_offers row.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getThemeCreative, type ThemeKey } from '~/server/utils/marketing-theme-presets'
import {
  addDaysZurichEndIso,
  buildOfferCtaUrl,
  endOfMonthZurichIso,
  formatCoursePriceRappen,
  formatDiscountLabel,
  formatOfferDate,
  type OfferCtaType,
} from '~/server/utils/email-template'
import { computeNextRunAt, type ScheduleFrequency } from '~/server/utils/campaign-schedule'

type ValidityPreset = 'end_of_month' | '7_days' | '14_days' | 'custom'

interface OfferBody {
  tenantId?: string
  themeKey?: ThemeKey
  title?: string
  creativeId?: string
  subjectOverride?: string
  htmlBodyOverride?: string
  // Discount
  includeDiscount?: boolean
  discountType?: 'percentage' | 'fixed' | 'free_lesson' | 'free_product'
  discountValue?: number
  discountCode?: string
  firstLessonOnly?: boolean
  categoryFilter?: string | null
  validityPreset?: ValidityPreset
  validUntil?: string | null
  // Target
  ctaType?: OfferCtaType
  ctaPath?: string | null
  courseId?: string | null
  categoryCode?: string | null
  categoryLabel?: string | null
  // Audience
  segmentCategories?: string[]
  excludeCategories?: string[]
  clientsOnly?: boolean
  // Schedule
  schedule?: {
    enabled?: boolean
    frequency?: ScheduleFrequency
    dayOfWeek?: number
    hour?: number
    batchSize?: number
  } | null
  sendNow?: boolean
  pilotLimit?: number | null
}

function generateCode(prefix = 'AKTION'): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const month = new Date().toLocaleString('de-CH', { month: 'short', timeZone: 'Europe/Zurich' }).toUpperCase().replace('.', '')
  return `${prefix}${month}${rand}`.slice(0, 20)
}

function resolveValidUntil(preset?: ValidityPreset, custom?: string | null): string | null {
  if (preset === 'end_of_month') return endOfMonthZurichIso()
  if (preset === '7_days') return addDaysZurichEndIso(7)
  if (preset === '14_days') return addDaysZurichEndIso(14)
  if (preset === 'custom' && custom) return new Date(custom).toISOString()
  return custom ? new Date(custom).toISOString() : null
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event) || {}) as OfferBody
  const tenantId = body.tenantId || authUser.tenant_id
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  if (authUser.role !== 'super_admin' && tenantId !== authUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const themeKey = body.themeKey
  if (!themeKey || !['discount_promo', 'course', 'category', 'affiliate'].includes(themeKey)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid themeKey' })
  }

  const creativeId = body.creativeId
  const creative = creativeId ? getThemeCreative(themeKey, creativeId) : undefined
  if (!creative && !body.htmlBodyOverride) {
    throw createError({ statusCode: 400, statusMessage: 'creativeId or htmlBodyOverride required' })
  }

  const supabase = getSupabaseAdmin()
  const createdBy = (authUser as any).db_user_id || (authUser as any).profile?.id || null

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color')
    .eq('id', tenantId)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'
  const title = (body.title || creative?.label || 'Aktion').trim()

  // --- Discount (optional) ---
  let discountId: string | null = null
  let discountCode: string | null = null
  let discountPercent = ''
  let validUntilIso: string | null = null
  const wantsDiscount = body.includeDiscount !== false && (
    themeKey === 'discount_promo'
    || !!body.discountCode
    || (typeof body.discountValue === 'number' && body.discountValue > 0)
    || body.discountType === 'free_lesson'
  )

  if (themeKey === 'affiliate') {
    // Affiliate theme: no discount by default
  } else if (wantsDiscount || themeKey === 'discount_promo') {
    const discountType = body.discountType || 'percentage'
    const discountValue = typeof body.discountValue === 'number' ? body.discountValue : (discountType === 'percentage' ? 50 : 0)
    discountCode = (body.discountCode || generateCode()).trim().toUpperCase()
    validUntilIso = resolveValidUntil(body.validityPreset || 'end_of_month', body.validUntil)

    const discountPayload: Record<string, any> = {
      tenant_id: tenantId,
      name: title,
      code: discountCode,
      discount_type: discountType,
      discount_value: discountValue,
      valid_from: new Date().toISOString(),
      valid_until: validUntilIso,
      is_active: true,
      applies_to: 'all',
      first_lesson_only: !!body.firstLessonOnly,
      category_filter: body.categoryFilter || body.categoryCode || null,
      usage_count: 0,
    }

    const { data: discount, error: discErr } = await supabase
      .from('discounts')
      .insert(discountPayload)
      .select('id, code, discount_type, discount_value, valid_until')
      .single()

    if (discErr || !discount) {
      throw createError({ statusCode: 500, statusMessage: discErr?.message || 'Failed to create discount' })
    }

    discountId = discount.id
    discountCode = discount.code
    discountPercent = formatDiscountLabel(discount.discount_type, discount.discount_value)
    validUntilIso = discount.valid_until
  }

  // --- Course enrichment ---
  let courseName = ''
  let courseDate = ''
  let coursePrice = ''
  const courseId = body.courseId || null

  if (courseId) {
    const { data: course } = await supabase
      .from('courses')
      .select('name, price_per_participant_rappen, course_sessions(start_time)')
      .eq('id', courseId)
      .maybeSingle()

    if (course) {
      courseName = course.name || ''
      coursePrice = formatCoursePriceRappen(course.price_per_participant_rappen)
      const sessions = Array.isArray(course.course_sessions) ? [...course.course_sessions] : []
      sessions.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      if (sessions[0]?.start_time) {
        courseDate = new Date(sessions[0].start_time).toLocaleString('de-CH', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Zurich',
        })
      }
    }
  }

  const categoryCode = body.categoryCode || body.categoryFilter || null
  let categoryLabel = body.categoryLabel || categoryCode || ''
  if (categoryCode && (!body.categoryLabel || body.categoryLabel === categoryCode)) {
    const [cat, courseCat, leadCat] = await Promise.all([
      supabase.from('categories').select('name').eq('tenant_id', tenantId).eq('code', categoryCode).maybeSingle(),
      supabase.from('course_categories').select('name').eq('tenant_id', tenantId).eq('code', categoryCode).maybeSingle(),
      supabase.from('lead_categories').select('name').eq('tenant_id', tenantId).eq('code', categoryCode).maybeSingle(),
    ])
    categoryLabel = cat.data?.name || courseCat.data?.name || leadCat.data?.name || categoryCode
  }

  // --- CTA ---
  let ctaType: OfferCtaType = body.ctaType || 'booking'
  if (themeKey === 'affiliate') ctaType = 'ref'
  if (themeKey === 'course' && !body.ctaType) ctaType = 'course'
  if (themeKey === 'category' && !body.ctaType) ctaType = 'booking'

  const ctaPath = body.ctaPath || null
  const ctaUrl = buildOfferCtaUrl({
    baseUrl,
    tenantSlug: tenant.slug,
    ctaType,
    customPath: ctaPath,
    categoryCode,
    courseId,
    discountCode,
  })

  const offerSnapshot = {
    discount_code: discountCode,
    discount_percent: discountPercent,
    discount_valid_until: formatOfferDate(validUntilIso),
    cta_type: ctaType,
    cta_path: ctaPath,
    cta_url: ctaUrl,
    course_id: courseId,
    course_name: courseName,
    course_date: courseDate,
    course_price: coursePrice,
    category_code: categoryCode,
    category_label: categoryLabel,
  }

  // --- Template ---
  const subject = (body.subjectOverride || creative?.subject || title).trim()
  const htmlBody = (body.htmlBodyOverride || creative?.html_body || '').trim()

  const { data: template, error: tplErr } = await supabase
    .from('email_templates')
    .insert({
      tenant_id: tenantId,
      created_by: createdBy,
      name: `[Aktion] ${title}`,
      subject,
      html_body: htmlBody,
      text_body: null,
    })
    .select('id')
    .single()

  if (tplErr || !template) {
    throw createError({ statusCode: 500, statusMessage: tplErr?.message || 'Failed to create template' })
  }

  // --- Campaign ---
  const segmentCategories = Array.isArray(body.segmentCategories) ? body.segmentCategories : []
  const excludeCategories = Array.isArray(body.excludeCategories) ? body.excludeCategories : []
  const segment_filter: Record<string, any> = {
    categories: segmentCategories,
    offer: offerSnapshot,
  }
  if (excludeCategories.length) segment_filter.exclude_categories = excludeCategories
  if (body.clientsOnly) segment_filter.require_tags = ['client']
  if (discountCode) segment_filter.discount_code = discountCode

  const scheduleEnabled = !!body.schedule?.enabled
  const frequency: ScheduleFrequency = body.schedule?.frequency || 'weekly'
  const dayOfWeek = frequency === 'weekly' ? (body.schedule?.dayOfWeek ?? 1) : null
  const hour = typeof body.schedule?.hour === 'number' ? body.schedule.hour : 9
  const batchSize = typeof body.schedule?.batchSize === 'number' && body.schedule.batchSize > 0
    ? Math.min(2000, body.schedule.batchSize)
    : 500

  const campaignRow: Record<string, any> = {
    tenant_id: tenantId,
    created_by: createdBy,
    name: title,
    template_id: template.id,
    subject_override: subject,
    segment_filter,
    status: scheduleEnabled ? 'recurring' : 'draft',
  }

  if (scheduleEnabled) {
    campaignRow.schedule_enabled = true
    campaignRow.schedule_frequency = frequency
    campaignRow.schedule_day_of_week = dayOfWeek
    campaignRow.schedule_hour = hour
    campaignRow.schedule_batch_size = batchSize
    campaignRow.next_run_at = computeNextRunAt({ frequency, dayOfWeek, hour }).toISOString()
  }

  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .insert(campaignRow)
    .select('*')
    .single()

  if (campErr || !campaign) {
    throw createError({ statusCode: 500, statusMessage: campErr?.message || 'Failed to create campaign' })
  }

  await supabase.from('email_campaign_variants').insert({
    campaign_id: campaign.id,
    template_id: template.id,
    label: 'a',
    split_pct: 100,
    subject_override: subject,
  })

  // Rebuild CTA with campaign id for attribution
  const finalCtaUrl = buildOfferCtaUrl({
    baseUrl,
    tenantSlug: tenant.slug,
    ctaType,
    customPath: ctaPath,
    categoryCode,
    courseId,
    discountCode,
    campaignId: campaign.id,
  })
  offerSnapshot.cta_url = finalCtaUrl
  await supabase
    .from('email_campaigns')
    .update({
      segment_filter: { ...segment_filter, offer: { ...offerSnapshot, cta_url: finalCtaUrl } },
    })
    .eq('id', campaign.id)

  // --- Offer row ---
  const offerStatus = scheduleEnabled ? 'scheduled' : 'draft'
  const { data: offer, error: offerErr } = await supabase
    .from('marketing_offers')
    .insert({
      tenant_id: tenantId,
      created_by: createdBy,
      theme_key: themeKey,
      title,
      status: offerStatus,
      discount_id: discountId,
      course_id: courseId,
      category_code: categoryCode,
      cta_type: ctaType,
      cta_path: ctaPath || finalCtaUrl,
      template_id: template.id,
      campaign_id: campaign.id,
      creative_id: creativeId || null,
      valid_until: validUntilIso,
      offer_snapshot: { ...offerSnapshot, cta_url: finalCtaUrl },
    })
    .select('*')
    .single()

  if (offerErr || !offer) {
    throw createError({ statusCode: 500, statusMessage: offerErr?.message || 'Failed to create offer' })
  }

  let sendResult: any = null
  if (body.sendNow && !scheduleEnabled) {
    const { queueCampaignSend } = await import('~/server/utils/marketing-campaign-send')
    sendResult = await queueCampaignSend({
      supabase,
      campaignId: campaign.id,
      tenantId,
      batchLimit: typeof body.pilotLimit === 'number' && body.pilotLimit > 0 ? body.pilotLimit : undefined,
      fromSchedule: false,
    })
    await supabase
      .from('marketing_offers')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', offer.id)
  }

  return {
    success: true,
    offer,
    campaign: { id: campaign.id, name: campaign.name, status: campaign.status },
    template: { id: template.id },
    discount: discountId ? { id: discountId, code: discountCode, valid_until: validUntilIso } : null,
    cta_url: finalCtaUrl,
    sendResult,
  }
})
