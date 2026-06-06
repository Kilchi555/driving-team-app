import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId } = getQuery(event) as { tenantId: string }
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('email_campaigns')
    // Explicit FK hint to avoid PostgREST 300 "ambiguous relationship"
    .select('*, email_template:email_templates!template_id(name, subject), variants:email_campaign_variants(id, label, split_pct, subject_override, sent_count, open_count, click_count, template_id, email_template:email_templates(name, subject))')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { campaigns: data ?? [] }
})
