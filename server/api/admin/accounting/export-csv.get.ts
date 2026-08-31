import { defineEventHandler, getQuery, createError, setResponseHeader } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { inferDocumentKind } from '~/server/utils/accounting'
import { BOOKING_CSV_HEADERS, csvRow } from '~/server/utils/accounting-csv'
import { ensureTenantAccounts } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const kind = String(query.kind || 'bookings')
  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()

  if (kind === 'accounts') {
    const accounts = await ensureTenantAccounts(supabase, profile.tenant_id)
    const body = [
      csvRow(['nummer', 'name', 'klasse', 'typ', 'system', 'aktiv']),
      ...accounts.map(a => csvRow([a.number, a.name, a.class, a.type, a.is_system ? 'ja' : 'nein', a.is_active ? 'ja' : 'nein'])),
    ].join('\n')
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="kontenplan.csv"`)
    return `\uFEFF${body}`
  }

  if (kind === 'journal') {
    const { data: entries } = await supabase
      .from('accounting_entries')
      .select('id, entry_date, description')
      .eq('tenant_id', profile.tenant_id)
      .eq('approval_status', 'approved')
      .is('deleted_at', null)
      .gte('entry_date', `${year}-01-01`)
      .lte('entry_date', `${year}-12-31`)
    const byId = new Map((entries ?? []).map(e => [e.id, e]))
    const ids = [...byId.keys()]
    const lines: Array<Record<string, unknown>> = []
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase
        .from('accounting_journal_lines')
        .select('debit_rappen, credit_rappen, entry_id, account:accounting_accounts(number, name)')
        .eq('tenant_id', profile.tenant_id)
        .in('entry_id', ids.slice(i, i + 200))
      lines.push(...(data ?? []))
    }
    const body = [
      csvRow(['datum', 'beschreibung', 'konto', 'konto_name', 'soll_chf', 'haben_chf']),
      ...lines.map((l) => {
        const acc = l.account as { number?: string; name?: string } | null
        const entry = byId.get(l.entry_id as string)
        return csvRow([
          entry?.entry_date,
          entry?.description,
          acc?.number,
          acc?.name,
          ((l.debit_rappen as number) || 0) ? ((l.debit_rappen as number) / 100).toFixed(2) : '',
          ((l.credit_rappen as number) || 0) ? ((l.credit_rappen as number) / 100).toFixed(2) : '',
        ])
      }),
    ].join('\n')
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="journal-${year}.csv"`)
    return `\uFEFF${body}`
  }

  const { data: bookings, error } = await supabase
    .from('accounting_entries')
    .select('type, amount_rappen, entry_date, description, vat_rate, vat_amount_rappen, is_paid, creditor_name, creditor_iban, payment_reference, notes, document_kind, submitted_by_user_id, category:accounting_categories(name)')
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)
    .order('entry_date')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const body = [
    csvRow([...BOOKING_CSV_HEADERS]),
    ...(bookings ?? []).map((e) => {
      const cat = e.category as { name?: string } | null
      return csvRow([
        e.entry_date,
        e.type,
        inferDocumentKind(e),
        ((e.amount_rappen ?? 0) / 100).toFixed(2),
        e.description,
        cat?.name ?? '',
        '',
        e.vat_rate ?? '',
        e.vat_amount_rappen != null ? (e.vat_amount_rappen / 100).toFixed(2) : '',
        e.is_paid ? 'ja' : 'nein',
        e.creditor_name ?? '',
        e.creditor_iban ?? '',
        e.payment_reference ?? '',
        e.notes ?? '',
      ])
    }),
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="buchungen-${year}.csv"`)
  return `\uFEFF${body}`
})
