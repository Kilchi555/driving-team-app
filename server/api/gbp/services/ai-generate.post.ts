import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpAutomationSettings, getGbpLocationProfile, resolveGbpLocation } from '~/server/utils/gbp'
import { generateGbpServiceSuggestions } from '~/server/utils/gbp-automation'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/services/ai-generate
 * Suggests free-form services based on the location's category and existing services.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{ locationId?: string | null; existingServiceNames?: string[] }>(event)
  const locationId = getGbpLocationIdFromEvent(event, body)

  try {
    const [loc, profile, settings, tenant] = await Promise.all([
      resolveGbpLocation(authUser.tenant_id, locationId),
      getGbpLocationProfile(authUser.tenant_id, locationId),
      getGbpAutomationSettings(authUser.tenant_id, locationId),
      getSupabaseAdmin().from('tenants').select('name').eq('id', authUser.tenant_id).single(),
    ])

    const suggestions = await generateGbpServiceSuggestions({
      tenantName: tenant.data?.name || 'Fahrschule',
      locationTitle: loc.title,
      categoryName: profile.primaryCategory?.displayName,
      existingServiceNames: body.existingServiceNames ?? [],
      keywords: settings.keywords,
      brandVoice: settings.brand_voice,
    })

    return { success: true, suggestions }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Leistungen konnten nicht vorgeschlagen werden' })
  }
})
