import { defineEventHandler, createError } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'
import { getGbpInsights } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  try {
    const insights = await getGbpInsights(getSimyGbpTenantId())
    return { success: true, insights }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
