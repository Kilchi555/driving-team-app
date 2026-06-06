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
        supabase.rpc('increment_campaign_click', { p_campaign_id: cid }),
      ])
    }
  }

  // Append cid + lid to destination so landing pages (e.g. Helvetia form) can
  // attribute conversions back to the correct campaign and lead.
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
