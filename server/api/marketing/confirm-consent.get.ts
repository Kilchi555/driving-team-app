import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { lead_id, token } = getQuery(event) as { lead_id: string; token: string }

  if (!lead_id || !token) {
    return sendRedirect(event, '/consent-confirmed?status=invalid')
  }

  const supabase = getSupabaseAdmin()

  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, unsubscribe_token, status')
    .eq('id', lead_id)
    .single()

  if (error || !lead || lead.unsubscribe_token !== token) {
    return sendRedirect(event, '/consent-confirmed?status=invalid')
  }

  if (lead.status === 'active') {
    return sendRedirect(event, '/consent-confirmed?status=already')
  }

  await supabase
    .from('leads')
    .update({
      status: 'active',
      consent_given_at: new Date().toISOString(),
      consent_source: 're_consent_email',
    })
    .eq('id', lead_id)

  return sendRedirect(event, '/consent-confirmed?status=success')
})
