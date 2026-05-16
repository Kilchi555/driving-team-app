import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const { tenantId } = getQuery(event) as { tenantId: string }

  if (!tenantId || !id) throw createError({ statusCode: 400, statusMessage: 'tenantId and id are required' })

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
