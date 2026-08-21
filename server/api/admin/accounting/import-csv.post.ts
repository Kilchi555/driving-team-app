import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parseBookingCsv } from '~/server/utils/accounting-csv'
import { documentKindToEntryType } from '~/server/utils/accounting'
import { ensureTenantAccounts, syncEntryLedger } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const body = await readBody<{ csv?: string }>(event)
  if (!body.csv?.trim()) throw createError({ statusCode: 400, statusMessage: 'csv fehlt' })

  const { rows, errors } = parseBookingCsv(body.csv)
  if (!rows.length) {
    throw createError({ statusCode: 400, statusMessage: errors[0] || 'Keine gültigen Zeilen' })
  }
  if (rows.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Maximal 500 Zeilen pro Import' })
  }

  await ensureTenantAccounts(supabase, profile.tenant_id)
  const { data: categories } = await supabase
    .from('accounting_categories')
    .select('id, name, type')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)

  const { data: existing } = await supabase
    .from('accounting_entries')
    .select('entry_date, amount_rappen, description')
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'approved')
    .is('deleted_at', null)

  const seen = new Set((existing ?? []).map(e => `${e.entry_date}|${e.amount_rappen}|${e.description}`))
  let created = 0
  let skipped = 0

  for (const row of rows) {
    const key = `${row.entry_date}|${row.amount_rappen}|${row.description}`
    if (seen.has(key)) { skipped++; continue }
    if (row.document_kind === 'contract' && row.amount_rappen < 0) {
      errors.push(`${row.description}: negativer Betrag`)
      continue
    }
    const type = documentKindToEntryType(row.document_kind)
    const cat = (categories ?? []).find(c => c.name === row.category_name && c.type === type)
    const { data: entry, error } = await supabase
      .from('accounting_entries')
      .insert({
        tenant_id: profile.tenant_id,
        type,
        document_kind: row.document_kind,
        amount_rappen: row.amount_rappen,
        entry_date: row.entry_date,
        description: row.description,
        category_id: cat?.id ?? null,
        vat_rate: row.vat_rate,
        vat_amount_rappen: row.vat_amount_rappen,
        is_paid: row.is_paid,
        paid_date: row.is_paid ? row.entry_date : null,
        creditor_name: row.creditor_name,
        creditor_iban: row.creditor_iban,
        payment_reference: row.payment_reference,
        notes: row.notes ? `Import: ${row.notes}` : 'CSV-Import',
        approval_status: 'approved',
      })
      .select('id')
      .single()
    if (error || !entry) {
      errors.push(`${row.description}: ${error?.message ?? 'Insert fehlgeschlagen'}`)
      continue
    }
    await syncEntryLedger(supabase, profile.tenant_id, entry.id)
    seen.add(key)
    created++
  }

  return { success: true, created, skipped, errors }
})
