import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { cid, lid, url, v } = getQuery(event) as { cid?: string; lid?: string; url?: string; v?: string }
  const variant = v && ['a', 'b', 'c', 'd', 'e'].includes(v) ? v : 'a'

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
        // Increment aggregate on campaign (legacy columns for backward compat)
        supabase.rpc(variant === 'b' ? 'increment_campaign_click_b' : 'increment_campaign_click', { p_campaign_id: cid }),
        // Increment per-variant counter
        supabase.rpc('increment_variant_click', { p_campaign_id: cid, p_label: variant }),
      ])
    }
  }

  // Append cid + lid to destination so landing pages can attribute conversions
  let destination = url ? decodeURIComponent(url) : 'https://app.simy.ch'
  if (cid || lid) {
    try {
      const dest = new URL(destination)
      if (cid) dest.searchParams.set('cid', cid)
      if (lid) dest.searchParams.set('lid', lid)
      destination = dest.toString()
    } catch {
      // Malformed URL — redirect as-is
    }
  }
  return sendRedirect(event, destination, 302)
})
