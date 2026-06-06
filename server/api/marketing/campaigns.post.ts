import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface VariantInput {
  templateId: string
  label: 'a' | 'b' | 'c' | 'd' | 'e'
  splitPct: number
  subjectOverride?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, createdBy, name, subject_override, segment_filter = {}, variants } = body

  if (!tenantId || !name) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and name are required' })
  }

  // variants must be an array with at least one entry
  const variantList: VariantInput[] = Array.isArray(variants) && variants.length > 0
    ? variants
    : null as any

  if (!variantList) {
    throw createError({ statusCode: 400, statusMessage: 'variants array with at least one entry is required' })
  }

  const totalPct = variantList.reduce((sum, v) => sum + (v.splitPct ?? 0), 0)
  if (totalPct !== 100) {
    throw createError({ statusCode: 400, statusMessage: `Variant split percentages must sum to 100 (got ${totalPct})` })
  }

  const supabase = getSupabaseAdmin()

  // Use variant A's template as the primary template_id for backward compat
  const primaryTemplateId = variantList.find(v => v.label === 'a')?.templateId ?? variantList[0].templateId

  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .insert({
      tenant_id: tenantId,
      created_by: createdBy || null,
      name,
      template_id: primaryTemplateId,
      subject_override: subject_override || null,
      segment_filter,
      status: 'draft',
    })
    .select()
    .single()

  if (campErr || !campaign) throw createError({ statusCode: 500, statusMessage: campErr?.message ?? 'Failed to create campaign' })

  const { error: varErr } = await supabase
    .from('email_campaign_variants')
    .insert(variantList.map(v => ({
      campaign_id: campaign.id,
      template_id: v.templateId,
      label: v.label,
      split_pct: v.splitPct,
      subject_override: v.subjectOverride || null,
    })))

  if (varErr) throw createError({ statusCode: 500, statusMessage: varErr.message })

  return { campaign }
})
