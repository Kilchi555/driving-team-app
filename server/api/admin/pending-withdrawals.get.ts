import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('student_credits')
    .select(`
      id,
      user_id,
      balance_rappen,
      pending_withdrawal_rappen,
      last_withdrawal_at,
      users (
        id,
        first_name,
        last_name,
        email,
        zip,
        city,
        student_withdrawal_preferences (
          iban_last4,
          account_holder
        )
      )
    `)
    .eq('tenant_id', profile.tenant_id)
    .gt('pending_withdrawal_rappen', 0)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data || []
})
