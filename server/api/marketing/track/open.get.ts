import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export default defineEventHandler(async (event) => {
  const { cid, lid, v } = getQuery(event) as { cid?: string; lid?: string; v?: string }
  const variant = v === 'b' ? 'b' : 'a'

  if (cid && lid) {
    const supabase = getSupabaseAdmin()

    // Only count first open per lead per campaign
    const { data: existing } = await supabase
      .from('email_campaign_leads')
      .select('id, opened_at')
      .eq('campaign_id', cid)
      .eq('lead_id', lid)
      .single()

    if (existing && !existing.opened_at) {
      const rpcName = variant === 'b' ? 'increment_campaign_open_b' : 'increment_campaign_open'
      await Promise.all([
        supabase
          .from('email_campaign_leads')
          .update({ opened_at: new Date().toISOString(), status: 'opened' })
          .eq('id', existing.id),
        supabase.rpc(rpcName, { p_campaign_id: cid }),
      ])
    }
  }

  setHeader(event, 'Content-Type', 'image/gif')
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  setHeader(event, 'Pragma', 'no-cache')
  return PIXEL
})
