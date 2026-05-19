/**
 * POST /api/marketing/import-from-users
 *
 * Imports existing users into the leads table, then sends each a consent invitation.
 *
 * Scalability notes:
 * - Tenant email context is fetched ONCE regardless of import size.
 * - DB inserts are batched in chunks of 500.
 * - Consent emails are sent fire-and-forget with concurrency cap.
 *   For very large imports (>500 leads) the email queue may outlive the serverless
 *   function. A "Consent-Mails erneut senden" button on the leads page handles this.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { fetchTenantEmailContext, sendConsentEmailWithContext } from '~/server/utils/send-consent-email'

export default defineEventHandler(async (event) => {
  const { tenantId, categories = [], onlyWithEmail = true } = await readBody(event)

  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }

  const supabase = getSupabaseAdmin()

  // ── 1. Fetch users + tenant context in parallel ──────────────────
  const [usersResult, emailCtx] = await Promise.all([
    (() => {
      let q = supabase
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
      if (onlyWithEmail) q = q.not('email', 'is', null).neq('email', '')
      return q
    })(),
    fetchTenantEmailContext(tenantId),
  ])

  if (usersResult.error) throw createError({ statusCode: 500, statusMessage: usersResult.error.message })
  const users = usersResult.data || []

  if (users.length === 0) return { success: true, imported: 0, skipped: 0, total: 0 }

  // ── 2. Filter users without email ────────────────────────────────
  const toImport = users.filter((u: any) => u.email?.trim())

  if (toImport.length === 0) {
    return { success: true, imported: 0, skipped: users.length, total: users.length }
  }

  // ── 3. Batch upsert (ignoreDuplicates) — 500 rows per chunk ──────
  const INSERT_CHUNK = 500
  let imported = 0
  let skipped = 0
  const insertedLeads: { id: string; email: string; first_name: string | null; unsubscribe_token: string }[] = []
  let lastInsertError = ''

  for (let i = 0; i < toImport.length; i += INSERT_CHUNK) {
    const chunk = toImport.slice(i, i + INSERT_CHUNK).map((u: any) => ({
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
      .upsert(chunk, { onConflict: 'tenant_id,email', ignoreDuplicates: true })
      .select('id, email, first_name, unsubscribe_token')

    if (error) {
      console.error('Chunk upsert error:', error.message)
      lastInsertError = error.message
    } else if (inserted) {
      imported += inserted.length
      skipped += chunk.length - inserted.length
      insertedLeads.push(...inserted)
    }
  }

  // ── 4. Send consent emails (fire-and-forget, context reused) ─────
  // Tenant context was fetched ONCE above — no extra DB calls per email.
  // Concurrency of 20 is safe for Resend; adjust if you see 429 errors.
  const CONCURRENCY = 20

  ;(async () => {
    for (let i = 0; i < insertedLeads.length; i += CONCURRENCY) {
      const batch = insertedLeads.slice(i, i + CONCURRENCY)
      await Promise.allSettled(
        batch.map(lead =>
          sendConsentEmailWithContext(emailCtx, {
            leadId: lead.id,
            token: lead.unsubscribe_token,
            email: lead.email,
            firstName: lead.first_name,
          })
        )
      )
      // 50ms breathing room between batches (≈ 400 emails/s theoretical max)
      if (i + CONCURRENCY < insertedLeads.length) {
        await new Promise(r => setTimeout(r, 50))
      }
    }
    console.log(`[import-from-users] Sent ${insertedLeads.length} consent emails for tenant ${tenantId}`)
  })().catch(e => console.error('Batch consent email error:', e))

  return {
    success: true,
    imported,
    skipped: skipped + (toImport.length - imported - skipped),
    total: users.length,
    error: lastInsertError || undefined,
  }
})
