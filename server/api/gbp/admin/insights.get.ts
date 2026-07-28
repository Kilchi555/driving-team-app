import { defineEventHandler, createError } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'
import { getGbpInsightsSnapshot } from '~/server/utils/gbp-insights'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  try {
    const snapshot = await getGbpInsightsSnapshot(getSimyGbpTenantId())
    return { success: true, ...snapshot }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
