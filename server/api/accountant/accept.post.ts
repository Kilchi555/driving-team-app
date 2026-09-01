import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sanitizeString, validateBasicPassword, validateEmail } from '~/server/utils/validators'
import { normalizeAccountantEmail } from '~/server/utils/accountant'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event)
  const rate = await checkRateLimit(ip, 'accountant_accept', 8, 3600 * 1000)
  if (!rate.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Versuche. Bitte später erneut.' })
  }

  const body = await readBody(event)
  const token = String(body?.token || '')
  const firstName = sanitizeString(body?.first_name || '')
  const lastName = sanitizeString(body?.last_name || '')
  const password = String(body?.password || '')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Token fehlt' })
  if (!firstName || !lastName) throw createError({ statusCode: 400, statusMessage: 'Vor- und Nachname erforderlich' })
  const pw = validateBasicPassword(password)
  if (!pw.valid) throw createError({ statusCode: 400, statusMessage: pw.message })

  const supabase = getSupabaseAdmin()
  const { data: grant } = await supabase
    .from('accountant_grants')
    .select('*')
    .eq('invite_token', token)
    .is('revoked_at', null)
    .maybeSingle()
  if (!grant) throw createError({ statusCode: 404, statusMessage: 'Einladung ungültig' })

  const email = normalizeAccountantEmail(grant.email)
  if (!validateEmail(email).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail auf der Einladung' })
  }

  if (grant.user_id) {
    await supabase
      .from('accountant_grants')
      .update({ accepted_at: grant.accepted_at ?? new Date().toISOString(), invite_token: null, updated_at: new Date().toISOString() })
      .eq('id', grant.id)
    return { success: true, already_had_account: true }
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'accountant', first_name: firstName, last_name: lastName },
  })
  if (authError || !authData.user) {
    throw createError({ statusCode: 400, statusMessage: authError?.message || 'Konto konnte nicht erstellt werden' })
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      tenant_id: grant.tenant_id,
      email,
      role: 'accountant',
      first_name: firstName,
      last_name: lastName,
      is_active: true,
    })
    .select('id')
    .single()

  if (userError || !userRow) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {})
    throw createError({ statusCode: 500, statusMessage: userError?.message || 'Profil konnte nicht erstellt werden' })
  }

  const { error: grantError } = await supabase
    .from('accountant_grants')
    .update({
      user_id: userRow.id,
      accepted_at: new Date().toISOString(),
      invite_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', grant.id)
  if (grantError) {
    throw createError({ statusCode: 500, statusMessage: grantError.message })
  }

  return { success: true }
})
