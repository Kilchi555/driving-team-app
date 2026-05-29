import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { cid, lid, url } = getQuery(event) as { cid?: string; lid?: string; url?: string }

  if (cid && lid) {
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('email_campaign_leads')
      .select('id, clicked_at')
      .eq('campaign_id', cid)
      .eq('lead_id', lid)
      .single()

    if (existing && !existing.clicked_at) {
      await Promise.all([
        supabase
          .from('email_campaign_leads')
          .update({ clicked_at: new Date().toISOString(), status: 'clicked' })
          .eq('id', existing.id),
        supabase.rpc('increment_campaign_click', { campaign_id: cid }),
      ])
    }
  }

  const destination = url ? decodeURIComponent(url) : 'https://app.simy.ch'
  return sendRedirect(event, destination, 302)
})
