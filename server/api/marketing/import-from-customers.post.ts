/**
 * POST /api/marketing/import-from-customers
 *
 * Imports emails from the imported_customers table (via raw_json->>'E-Mail')
 * into the leads table. Does NOT send any consent emails.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId, categories = [] } = await readBody(event)

  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }

  const supabase = getSupabaseAdmin()

  // Fetch all imported_customers with an email in raw_json, in batches
  const PAGE_SIZE = 1000
  let page = 0
  const allCustomers: { email: string; name: string }[] = []

  while (true) {
    const { data, error } = await supabase
      .from('imported_customers')
      .select('raw_json')
      .eq('tenant_id', tenantId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    if (!data || data.length === 0) break

    for (const row of data) {
      try {
        const json = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json
        const email = json?.['E-Mail']?.trim()
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          allCustomers.push({ email: email.toLowerCase(), name: json?.['Name'] || '' })
        }
      } catch {}
    }

    if (data.length < PAGE_SIZE) break
    page++
  }

  if (allCustomers.length === 0) {
    return { success: true, imported: 0, skipped: 0, total: 0 }
  }

  // Build lead rows — split "Vorname Nachname" on first space
  const rows = allCustomers.map(({ email, name }) => {
    const parts = name.trim().split(' ')
    const last_name = parts.length > 1 ? parts.slice(1).join(' ') : null
    const first_name = parts[0] || null
    return {
      tenant_id: tenantId,
      email,
      first_name,
      last_name,
      categories,
      status: 'pending_consent',
      source: 'imported_customers',
    }
  })

  // Batch upsert — skip on conflict, no emails sent
  const CHUNK = 500
  let imported = 0
  let skipped = 0
  let lastError = ''

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { data: inserted, error } = await supabase
      .from('leads')
      .upsert(chunk, { onConflict: 'tenant_id,email', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error('import-from-customers chunk error:', error.message)
      lastError = error.message
    } else if (inserted) {
      imported += inserted.length
      skipped += chunk.length - inserted.length
    }
  }

  return {
    success: true,
    imported,
    skipped,
    total: allCustomers.length,
    error: lastError || undefined,
  }
})
