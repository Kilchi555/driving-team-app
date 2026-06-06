import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export default defineEventHandler(async (event) => {
  const { cid, lid, v } = getQuery(event) as { cid?: string; lid?: string; v?: string }
  const variant = v && ['a', 'b', 'c', 'd', 'e'].includes(v) ? v : 'a'

  if (cid && lid) {
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('email_campaign_leads')
      .select('id, opened_at')
      .eq('campaign_id', cid)
      .eq('lead_id', lid)
      .single()

    if (existing && !existing.opened_at) {
      await Promise.all([
        supabase
          .from('email_campaign_leads')
          .update({ opened_at: new Date().toISOString(), status: 'opened' })
          .eq('id', existing.id),
        // Increment aggregate on campaign (legacy columns for backward compat)
        supabase.rpc(variant === 'b' ? 'increment_campaign_open_b' : 'increment_campaign_open', { p_campaign_id: cid }),
        // Increment per-variant counter
        supabase.rpc('increment_variant_open', { p_campaign_id: cid, p_label: variant }),
      ])
    }
  }

  setHeader(event, 'Content-Type', 'image/gif')
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  setHeader(event, 'Pragma', 'no-cache')
  return PIXEL
})
