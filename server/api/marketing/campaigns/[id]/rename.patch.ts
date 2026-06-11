import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const { name, tenantId } = await readBody(event) as { name: string; tenantId: string }

  if (!campaignId || !tenantId || !name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'campaignId, tenantId and name are required' })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ name: name.trim() })
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
