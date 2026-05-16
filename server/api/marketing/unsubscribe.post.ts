import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { lead_id, token } = body

  if (!lead_id || !token) {
    throw createError({ statusCode: 400, statusMessage: 'lead_id and token are required' })
  }

  const supabase = getSupabaseAdmin()

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('id, unsubscribe_token, status')
    .eq('id', lead_id)
    .single()

  if (fetchError || !lead) {
    throw createError({ statusCode: 404, statusMessage: 'Lead not found' })
  }

  if (lead.unsubscribe_token !== token) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid unsubscribe token' })
  }

  if (lead.status === 'unsubscribed') {
    return { success: true, alreadyUnsubscribed: true }
  }

  const { error: updateError } = await supabase
    .from('leads')
    .update({ status: 'unsubscribed' })
    .eq('id', lead_id)

  if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

  return { success: true }
})
