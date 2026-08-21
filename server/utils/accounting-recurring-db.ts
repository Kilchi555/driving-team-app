import {
  dueDatesUntil,
  recurringExternalRef,
  todayZurich,
  type RecurringInterval,
} from '~/server/utils/accounting-recurring'
import { documentKindToEntryType, isAccountingDocumentKind } from '~/server/utils/accounting'
import { syncEntryLedger } from '~/server/utils/accounting-ledger-db'

type RecurringRow = {
  id: string
  tenant_id: string
  interval: RecurringInterval
  next_due_date: string
  ends_on: string | null
  type: string
  document_kind: string
  amount_rappen: number
  description: string
  category_id: string | null
  creditor_name: string | null
  creditor_iban: string | null
  payment_reference: string | null
  is_paid: boolean
  vat_rate: number | null
  vat_amount_rappen: number | null
  notes: string | null
}

export async function runDueRecurring(
  supabase: ReturnType<typeof import('~/server/utils/supabase-admin').getSupabaseAdmin>,
  opts: { tenantId?: string; today?: string } = {},
) {
  const today = opts.today ?? todayZurich()
  let query = supabase
    .from('accounting_recurring_entries')
    .select('id, tenant_id, interval, next_due_date, ends_on, type, document_kind, amount_rappen, description, category_id, creditor_name, creditor_iban, payment_reference, is_paid, vat_rate, vat_amount_rappen, notes')
    .eq('is_active', true)
    .lte('next_due_date', today)
  if (opts.tenantId) query = query.eq('tenant_id', opts.tenantId)

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  let created = 0
  let skipped = 0
  let advanced = 0

  for (const row of (rows ?? []) as RecurringRow[]) {
    const plan = dueDatesUntil(row.next_due_date, row.interval, today, row.ends_on)
    const document_kind = isAccountingDocumentKind(row.document_kind) ? row.document_kind : 'expense'
    const type = documentKindToEntryType(document_kind)

    for (const due of plan.dates) {
      const external = recurringExternalRef(row.id, due)
      const { data: existing } = await supabase
        .from('accounting_entries')
        .select('id')
        .eq('tenant_id', row.tenant_id)
        .eq('external_reference', external)
        .is('deleted_at', null)
        .maybeSingle()
      if (existing) {
        skipped++
        continue
      }

      const { data: entry, error: insertError } = await supabase
        .from('accounting_entries')
        .insert({
          tenant_id: row.tenant_id,
          type,
          document_kind,
          amount_rappen: row.amount_rappen,
          entry_date: due,
          description: row.description,
          category_id: row.category_id,
          creditor_name: row.creditor_name,
          creditor_iban: row.creditor_iban,
          payment_reference: row.payment_reference,
          is_paid: row.is_paid,
          paid_date: row.is_paid ? due : null,
          vat_rate: row.vat_rate,
          vat_amount_rappen: row.vat_amount_rappen,
          notes: row.notes ? `${row.notes}` : 'Wiederkehrende Buchung',
          external_reference: external,
          approval_status: 'approved',
        })
        .select('id')
        .single()
      if (insertError || !entry) {
        throw new Error(insertError?.message ?? 'Wiederkehrende Buchung konnte nicht erstellt werden')
      }
      await syncEntryLedger(supabase, row.tenant_id, entry.id)
      created++
    }

    await supabase
      .from('accounting_recurring_entries')
      .update({
        next_due_date: plan.next ?? row.next_due_date,
        last_created_at: new Date().toISOString(),
        is_active: plan.next != null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('tenant_id', row.tenant_id)
    advanced++
  }

  return { created, skipped, advanced, today }
}
