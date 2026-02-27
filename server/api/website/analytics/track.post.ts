// server/api/website/analytics/track.post.ts
// Track website analytics events

export default defineEventHandler(async (event) => {
  const { website_id, event_type, event_url, referrer, user_agent } =
    await readBody(event)

  const supabase = getSupabaseAdmin()

  // Hash IP for privacy
  const clientIP = getClientIP(event) || 'unknown'
  const crypto = require('crypto')
  const ipHash = crypto.createHash('sha256').update(clientIP).digest('hex')

  // Insert event
  const { error } = await supabase.from('website_analytics_events').insert({
    website_id,
    event_type,
    event_url,
    referrer: referrer || null,
    user_agent: user_agent || null,
    ip_hash: ipHash
  })

  if (error) {
    console.error('Analytics tracking error:', error)
  }

  return { success: true }
})

function getClientIP(event: any): string | null {
  return (
    event.node.req.headers['x-forwarded-for']?.split(',')[0] ||
    event.node.req.socket.remoteAddress ||
    null
  )
}
