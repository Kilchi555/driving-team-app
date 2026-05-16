import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface LeadRow {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, createdBy, leads, sourceLabel, defaultCategories = [] } = body

  if (!tenantId || !leads || !Array.isArray(leads)) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and leads array are required' })
  }

  if (leads.length > 10000) {
    throw createError({ statusCode: 400, statusMessage: 'Max 10,000 leads per import' })
  }

  const supabase = getSupabaseAdmin()

  // Create import job
  const { data: job, error: jobError } = await supabase
    .from('lead_import_jobs')
    .insert({
      tenant_id: tenantId,
      source_label: sourceLabel || 'CSV Import',
      status: 'processing',
      total_rows: leads.length,
      default_categories: defaultCategories,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (jobError) throw createError({ statusCode: 500, statusMessage: jobError.message })

  const errorsLog: { row: number; email: string; reason: string }[] = []
  let importedCount = 0
  let skippedCount = 0

  const validRows: any[] = []

  leads.forEach((lead: LeadRow, index: number) => {
    const email = (lead.email || '').trim().toLowerCase()

    if (!email || !isValidEmail(email)) {
      errorsLog.push({ row: index + 2, email: lead.email || '', reason: 'Ungültige E-Mail-Adresse' })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      email,
      first_name: lead.first_name?.trim() || null,
      last_name: lead.last_name?.trim() || null,
      phone: lead.phone?.trim() || null,
      categories: defaultCategories,
      status: 'pending_consent',
      source: sourceLabel || 'csv_import',
    })
  })

  // Batch upsert — skip on conflict (duplicate email per tenant)
  if (validRows.length > 0) {
    const batchSize = 500
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize)
      const { data: inserted, error: insertError } = await supabase
        .from('leads')
        .upsert(batch, { onConflict: 'tenant_id,email', ignoreDuplicates: true })
        .select('id')

      if (insertError) {
        errorsLog.push({ row: i, email: '', reason: insertError.message })
      } else {
        importedCount += inserted?.length ?? 0
        skippedCount += batch.length - (inserted?.length ?? 0)
      }
    }
  }

  const errorCount = errorsLog.length

  // Update job status
  await supabase
    .from('lead_import_jobs')
    .update({
      status: 'completed',
      imported_count: importedCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      errors_log: errorsLog,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)

  return {
    success: true,
    jobId: job.id,
    totalRows: leads.length,
    importedCount,
    skippedCount,
    errorCount,
    errors: errorsLog.slice(0, 50),
  }
})
