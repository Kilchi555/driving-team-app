import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  DEFAULT_EXAM_PASSED_EMAIL_COPY,
  loadExamPassedEmailSettings,
} from '~/server/utils/exam-passed-email-settings'
import { resolveExamReviewPlaces } from '~/server/utils/exam-passed-emails'
import { isTenantAffiliateProgramActive } from '~/server/utils/tenant-affiliate-active'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'super_admin'])
  const supabase = getSupabaseAdmin()

  const [settings, affiliateEnabled, tenantRes] = await Promise.all([
    loadExamPassedEmailSettings(profile.tenant_id),
    isTenantAffiliateProgramActive(profile.tenant_id),
    supabase
      .from('tenants')
      .select('google_review_places')
      .eq('id', profile.tenant_id)
      .maybeSingle(),
  ])

  if (!tenantRes.data && tenantRes.error) {
    throw createError({ statusCode: 500, statusMessage: 'Tenant konnte nicht geladen werden' })
  }

  const reviewPlaces = resolveExamReviewPlaces((tenantRes.data as any)?.google_review_places)

  return {
    success: true,
    settings,
    defaults: DEFAULT_EXAM_PASSED_EMAIL_COPY,
    capabilities: {
      reviewPlaces: reviewPlaces.length,
      affiliateEnabled,
    },
  }
})
