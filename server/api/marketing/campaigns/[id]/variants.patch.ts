import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)

  // body: { variants: [{ label: 'a', subjectOverride: '...' }, ...] }
  const { variants } = body as { variants: { label: string; subjectOverride: string | null }[] }

  if (!campaignId || !Array.isArray(variants) || variants.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'campaignId and variants array required' })
  }

  const supabase = getSupabaseAdmin()

  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .single()

  if (campErr || !campaign) {
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  }

  // Load current variant stats so we can snapshot them before changing the subject
  const { data: currentVariants } = await supabase
    .from('email_campaign_variants')
    .select('label, subject_override, sent_count, open_count, click_count, subject_snapshots')
    .eq('campaign_id', campaignId)

  const currentMap = new Map((currentVariants ?? []).map((v: any) => [v.label, v]))

  const errors: string[] = []
  for (const v of variants) {
    const current = currentMap.get(v.label)
    if (!current) continue

    const newSubject = v.subjectOverride || null
    const subjectChanged = current.subject_override !== newSubject

    let updatePayload: any = { subject_override: newSubject }

    if (subjectChanged && current.sent_count > 0) {
      // Freeze current stats into snapshot history before switching subject
      const snapshots: any[] = Array.isArray(current.subject_snapshots) ? current.subject_snapshots : []
      snapshots.push({
        subject: current.subject_override ?? null,
        sent_count: current.sent_count,
        open_count: current.open_count ?? 0,
        click_count: current.click_count ?? 0,
        snapped_at: new Date().toISOString(),
      })
      updatePayload.subject_snapshots = snapshots
    }

    const { error } = await supabase
      .from('email_campaign_variants')
      .update(updatePayload)
      .eq('campaign_id', campaignId)
      .eq('label', v.label)

    if (error) errors.push(`Variant ${v.label}: ${error.message}`)
  }

  if (errors.length > 0) {
    throw createError({ statusCode: 500, statusMessage: errors.join('; ') })
  }

  return { success: true }
})
