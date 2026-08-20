import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parseCamtXml } from '~/server/utils/camt-parse'
import { flagAlreadyImported, matchEntriesToExpenses } from '~/server/utils/accounting-camt'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const body = await readBody<{ xml_content?: string }>(event)
  if (!body.xml_content?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'xml_content fehlt' })
  }

  const entries = parseCamtXml(body.xml_content, { directions: ['DBIT'] })
  if (!entries.length) {
    throw createError({ statusCode: 422, statusMessage: 'Keine Lastschriften in der CAMT-Datei gefunden' })
  }

  const { data: openRows } = await supabase
    .from('accounting_entries')
    .select('id, description, amount_rappen, creditor_name, creditor_iban, payment_reference, entry_date')
    .eq('tenant_id', profile.tenant_id)
    .eq('type', 'expense')
    .eq('approval_status', 'approved')
    .eq('is_paid', false)
    .is('deleted_at', null)
    .is('storno_of_id', null)

  const results = matchEntriesToExpenses(entries, openRows ?? [])
  const { data: existing } = await supabase
    .from('bank_import_records')
    .select('dedupe_key, imported_at')
    .eq('tenant_id', profile.tenant_id)
    .in('dedupe_key', entries.map(e => e.dedupe_key))
  flagAlreadyImported(results, new Map((existing ?? []).map(r => [r.dedupe_key, r.imported_at])))

  return {
    entries_count: entries.length,
    matched_count: results.filter(r => (r.confidence ?? 0) >= 65 && !r.already_imported).length,
    already_imported_count: results.filter(r => r.already_imported).length,
    results,
    open_expenses: (openRows ?? []).map(e => ({
      id: e.id,
      description: e.description,
      amount_rappen: e.amount_rappen,
      creditor_name: e.creditor_name,
    })),
  }
})
