import { defineEventHandler, getHeader, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { decryptIBAN } from '~/server/utils/iban-utils'

/**
 * GET /api/admin/get-iban?userId=xxx
 * Returns the decrypted IBAN for a pending withdrawal — admin only.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { userId } = getQuery(event)

  if (!userId || typeof userId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'userId is required' })
  }

  const supabase = getSupabaseAdmin()

  // Verify the user belongs to this admin's tenant
  const { data: prefs } = await supabase
    .from('student_withdrawal_preferences')
    .select('iban_encrypted, iban_last4, account_holder')
    .eq('user_id', userId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!prefs?.iban_encrypted) {
    throw createError({ statusCode: 404, statusMessage: 'Keine IBAN hinterlegt' })
  }

  const iban = decryptIBAN(prefs.iban_encrypted)

  return {
    iban,
    iban_last4: prefs.iban_last4,
    account_holder: prefs.account_holder,
  }
})
