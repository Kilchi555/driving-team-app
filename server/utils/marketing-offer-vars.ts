/**
 * Resolve offer-related template variables from campaign segment_filter / offer snapshot.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildOfferCtaUrl,
  formatCoursePriceRappen,
  formatDiscountLabel,
  formatOfferDate,
  type OfferCtaType,
  type TemplateVariables,
} from '~/server/utils/email-template'

export interface OfferRenderContext {
  discount_code?: string
  discount_percent?: string
  discount_valid_until?: string
  cta_url?: string
  course_name?: string
  course_date?: string
  course_price?: string
  category_label?: string
  affiliate_signup_url?: string
}

/**
 * Enrich template vars from campaign.segment_filter.offer (snapshot written by offer create API)
 * and/or by looking up related discount/course rows.
 */
export async function resolveOfferTemplateVars(
  supabase: SupabaseClient,
  opts: {
    tenantId: string
    tenantSlug: string
    baseUrl: string
    segmentFilter?: Record<string, any> | null
    campaignId?: string | null
  },
): Promise<OfferRenderContext> {
  const filter = opts.segmentFilter || {}
  const snap = (filter.offer || {}) as Record<string, any>
  const discountCode = (filter.discount_code || snap.discount_code || '') as string

  let discountPercent = (snap.discount_percent || '') as string
  let discountValidUntil = (snap.discount_valid_until || '') as string
  let courseName = (snap.course_name || '') as string
  let courseDate = (snap.course_date || '') as string
  let coursePrice = (snap.course_price || '') as string
  let categoryLabel = (snap.category_label || snap.category_code || filter.categories?.[0] || '') as string

  const ctaType = (snap.cta_type || 'booking') as OfferCtaType
  const courseId = snap.course_id || null
  const categoryCode = snap.category_code || (Array.isArray(filter.categories) ? filter.categories[0] : null)
  const customPath = snap.cta_path || null

  // Fill discount labels from DB if missing
  if (discountCode && (!discountPercent || !discountValidUntil)) {
    const { data: discount } = await supabase
      .from('discounts')
      .select('discount_type, discount_value, valid_until')
      .eq('tenant_id', opts.tenantId)
      .ilike('code', discountCode)
      .is('deleted_at', null)
      .maybeSingle()

    if (discount) {
      if (!discountPercent) {
        discountPercent = formatDiscountLabel(discount.discount_type, discount.discount_value)
      }
      if (!discountValidUntil && discount.valid_until) {
        discountValidUntil = formatOfferDate(discount.valid_until)
      }
    }
  }

  // Fill course fields from DB if course_id present but labels empty
  if (courseId && (!courseName || !courseDate || !coursePrice)) {
    const { data: course } = await supabase
      .from('courses')
      .select('name, price_per_participant_rappen, course_sessions(start_time)')
      .eq('id', courseId)
      .maybeSingle()

    if (course) {
      if (!courseName) courseName = course.name || ''
      if (!coursePrice) coursePrice = formatCoursePriceRappen(course.price_per_participant_rappen)
      if (!courseDate) {
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
  }

  // Category label from codes table if needed
  if (categoryCode && (!categoryLabel || categoryLabel === categoryCode)) {
    const [cat, courseCat, leadCat] = await Promise.all([
      supabase.from('categories').select('name, code').eq('tenant_id', opts.tenantId).eq('code', categoryCode).maybeSingle(),
      supabase.from('course_categories').select('name, code').eq('tenant_id', opts.tenantId).eq('code', categoryCode).maybeSingle(),
      supabase.from('lead_categories').select('name, code').eq('tenant_id', opts.tenantId).eq('code', categoryCode).maybeSingle(),
    ])
    categoryLabel = cat.data?.name || courseCat.data?.name || leadCat.data?.name || categoryCode
  }

  const ctaUrl = buildOfferCtaUrl({
    baseUrl: opts.baseUrl,
    tenantSlug: opts.tenantSlug,
    ctaType,
    customPath,
    categoryCode,
    courseId,
    discountCode: discountCode || null,
    campaignId: opts.campaignId || null,
  })

  const affiliateUrl = buildOfferCtaUrl({
    baseUrl: opts.baseUrl,
    tenantSlug: opts.tenantSlug,
    ctaType: 'ref',
    campaignId: opts.campaignId || null,
  })

  return {
    discount_code: discountCode,
    discount_percent: discountPercent,
    discount_valid_until: discountValidUntil,
    cta_url: ctaUrl,
    course_name: courseName,
    course_date: courseDate,
    course_price: coursePrice,
    category_label: categoryLabel,
    affiliate_signup_url: affiliateUrl,
  }
}

export function mergeOfferVars(
  base: TemplateVariables,
  offer: OfferRenderContext,
): TemplateVariables {
  return { ...base, ...offer }
}
