import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { ensureTenantAccounts } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  await ensureTenantAccounts(supabase, profile.tenant_id)

  const query = getQuery(event)
  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()

  const { data: entries, error: entryError } = await supabase
    .from('accounting_entries')
    .select('id, entry_date, description, document_kind, type, storno_of_id')
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)
    .order('entry_date', { ascending: false })
  if (entryError) throw createError({ statusCode: 500, statusMessage: entryError.message })

  const entryIds = (entries ?? []).map(e => e.id)
  const byEntry = new Map((entries ?? []).map(e => [e.id, e]))
  const rows: Array<Record<string, unknown>> = []

  for (let i = 0; i < entryIds.length; i += 200) {
    const chunk = entryIds.slice(i, i + 200)
    const { data, error } = await supabase
      .from('accounting_journal_lines')
      .select('id, debit_rappen, credit_rappen, entry_id, account:accounting_accounts(id, number, name, type)')
      .eq('tenant_id', profile.tenant_id)
      .in('entry_id', chunk)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    for (const line of data ?? []) {
      rows.push({ ...line, entry: byEntry.get(line.entry_id) ?? null })
    }
  }

  rows.sort((a, b) => {
    const da = (a.entry as { entry_date?: string } | null)?.entry_date ?? ''
    const db = (b.entry as { entry_date?: string } | null)?.entry_date ?? ''
    return db.localeCompare(da)
  })

  return { success: true, year, data: rows }
})
