/**
 * POST /api/marketing/import-from-users
 * Imports existing users/students into the leads table and sends each a consent invitation email.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendConsentEmail } from '~/server/utils/send-consent-email'

export default defineEventHandler(async (event) => {
  const { tenantId, categories = [], onlyWithEmail = true } = await readBody(event)

  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }

  const supabase = getSupabaseAdmin()

  const [usersResult, tenantResult] = await Promise.all([
    (() => {
      let q = supabase
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
      if (onlyWithEmail) q = q.not('email', 'is', null).neq('email', '')
      return q
    })(),
    supabase.from('tenants').select('name, primary_color').eq('id', tenantId).single(),
  ])

  if (usersResult.error) throw createError({ statusCode: 500, statusMessage: usersResult.error.message })
  const users = usersResult.data || []
  const tenant = tenantResult.data
  const tenantName = tenant?.name || 'Fahrschule'
  const primaryColor = tenant?.primary_color || '#1e293b'

  if (users.length === 0) return { success: true, imported: 0, skipped: 0, total: 0 }

  // Deduplicate against existing leads
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('email')
    .eq('tenant_id', tenantId)

  const existingEmails = new Set((existingLeads || []).map((l: any) => l.email.toLowerCase()))
  const toImport = users.filter((u: any) => u.email && !existingEmails.has(u.email.toLowerCase()))

  if (toImport.length === 0) {
    return { success: true, imported: 0, skipped: users.length, total: users.length }
  }

  // Batch insert in chunks of 500, collect inserted leads for email sending
  const CHUNK = 500
  let imported = 0
  const insertedLeads: { id: string; email: string; first_name: string | null; unsubscribe_token: string }[] = []

  for (let i = 0; i < toImport.length; i += CHUNK) {
    const chunk = toImport.slice(i, i + CHUNK).map((u: any) => ({
      tenant_id: tenantId,
      email: u.email.toLowerCase().trim(),
      first_name: u.first_name || null,
      last_name: u.last_name || null,
      phone: u.phone || null,
      categories,
      status: 'pending_consent',
      source: 'existing_users_import',
    }))

    const { data: inserted, error } = await supabase
      .from('leads')
      .insert(chunk)
      .select('id, email, first_name, unsubscribe_token')

    if (error) {
      console.error('Chunk insert error:', error.message)
    } else if (inserted) {
      imported += inserted.length
      insertedLeads.push(...inserted)
    }
  }

  // Send consent emails fire-and-forget (rate-limited: max 5 concurrent)
  const CONCURRENCY = 5
  ;(async () => {
    for (let i = 0; i < insertedLeads.length; i += CONCURRENCY) {
      const batch = insertedLeads.slice(i, i + CONCURRENCY)
      await Promise.allSettled(
        batch.map(lead =>
          sendConsentEmail({
            leadId: lead.id,
            token: lead.unsubscribe_token,
            email: lead.email,
            firstName: lead.first_name,
            tenantName,
            primaryColor,
          })
        )
      )
      // Small delay between batches to avoid overwhelming the email provider
      if (i + CONCURRENCY < insertedLeads.length) {
        await new Promise(r => setTimeout(r, 200))
      }
    }
  })().catch(e => console.error('Batch consent email error:', e))

  return {
    success: true,
    imported,
    skipped: users.length - toImport.length,
    total: users.length,
  }
})
