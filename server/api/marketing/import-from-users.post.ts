/**
 * POST /api/marketing/import-from-users
 * Imports existing users/students from the users table into the leads table.
 * Only imports users that don't already exist as leads (deduplication by email).
 * Sets status to pending_consent — they need to opt-in before receiving campaigns.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId, categories = [], onlyWithEmail = true } = await readBody(event)

  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }

  const supabase = getSupabaseAdmin()

  // Load all active users for this tenant that have an email
  let usersQuery = supabase
    .from('users')
    .select('id, email, first_name, last_name, phone')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (onlyWithEmail) {
    usersQuery = usersQuery.not('email', 'is', null).neq('email', '')
  }

  const { data: users, error: usersError } = await usersQuery

  if (usersError) throw createError({ statusCode: 500, statusMessage: usersError.message })
  if (!users || users.length === 0) return { success: true, imported: 0, skipped: 0, total: 0 }

  // Load existing lead emails to avoid duplicates
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('email')
    .eq('tenant_id', tenantId)

  const existingEmails = new Set((existingLeads || []).map((l: any) => l.email.toLowerCase()))

  // Filter out already-imported users
  const toImport = users.filter(
    (u: any) => u.email && !existingEmails.has(u.email.toLowerCase())
  )

  if (toImport.length === 0) {
    return { success: true, imported: 0, skipped: users.length, total: users.length }
  }

  // Batch insert in chunks of 500
  const CHUNK = 500
  let imported = 0

  for (let i = 0; i < toImport.length; i += CHUNK) {
    const chunk = toImport.slice(i, i + CHUNK).map((u: any) => ({
      tenant_id: tenantId,
      email: u.email.toLowerCase().trim(),
      first_name: u.first_name || null,
      last_name: u.last_name || null,
      phone: u.phone || null,
      categories: categories,
      status: 'pending_consent',
      source: 'existing_users_import',
    }))

    const { error } = await supabase
      .from('leads')
      .insert(chunk)

    if (error) {
      console.error('Chunk insert error:', error.message)
    } else {
      imported += chunk.length
    }
  }

  return {
    success: true,
    imported,
    skipped: users.length - toImport.length,
    total: users.length,
  }
})
