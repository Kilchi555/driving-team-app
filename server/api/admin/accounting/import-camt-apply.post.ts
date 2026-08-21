import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { syncEntryLedger } from '~/server/utils/accounting-ledger-db'

type ApplyItem = {
  action: 'match' | 'create' | 'skip'
  dedupe_key: string
  entry_id?: string
  bank_ref?: string | null
  date?: string
  amount_rappen?: number
  reference?: string | null
  counterparty_name?: string | null
  remittance?: string | null
  iban?: string | null
}

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const body = await readBody<{ items?: ApplyItem[] }>(event)
  const items = (body.items ?? []).filter(i => i.action !== 'skip')
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'Keine Zeilen zum Verbuchen' })
  if (items.length > 200) throw createError({ statusCode: 400, statusMessage: 'Maximal 200 Zeilen' })

  const { data: fallbackCat } = await supabase
    .from('accounting_categories')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('name', 'Sonstige Ausgaben')
    .eq('is_active', true)
    .maybeSingle()

  let matched = 0
  let created = 0
  const errors: string[] = []

  async function releaseDedupe(key: string) {
    await supabase.from('bank_import_records').delete().eq('tenant_id', profile.tenant_id).eq('dedupe_key', key)
  }

  for (const item of items) {
    if (!item.dedupe_key) {
      errors.push('Zeile ohne Deduplizier-Schlüssel')
      continue
    }

    const { error: dedupeError } = await supabase.from('bank_import_records').insert({
      tenant_id: profile.tenant_id,
      dedupe_key: item.dedupe_key,
      bank_ref: item.bank_ref || null,
      entry_date: item.date || null,
      amount_rappen: item.amount_rappen || 0,
      reference: item.reference || null,
      debtor_name: item.counterparty_name || null,
      imported_by: profile.id,
      source: 'camt',
      accounting_entry_id: item.action === 'match' ? item.entry_id || null : null,
    })
    if (dedupeError) {
      if (dedupeError.code === '23505') {
        errors.push(`${item.counterparty_name || item.dedupe_key}: bereits importiert`)
        continue
      }
      errors.push(dedupeError.message)
      continue
    }

    if (item.action === 'match') {
      if (!item.entry_id) {
        await releaseDedupe(item.dedupe_key)
        errors.push('Zuordnung ohne Buchung')
        continue
      }
      const { data: existing } = await supabase
        .from('accounting_entries')
        .select('id, amount_rappen, is_paid, description')
        .eq('id', item.entry_id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()
      if (!existing) {
        await releaseDedupe(item.dedupe_key)
        errors.push('Buchung nicht gefunden')
        continue
      }
      if (existing.is_paid) {
        await releaseDedupe(item.dedupe_key)
        errors.push(`${existing.description}: bereits bezahlt`)
        continue
      }
      if (item.amount_rappen != null && Math.abs((existing.amount_rappen ?? 0) - item.amount_rappen) > 1) {
        await releaseDedupe(item.dedupe_key)
        errors.push(`${existing.description}: Betrag weicht ab`)
        continue
      }
      const { error } = await supabase
        .from('accounting_entries')
        .update({
          is_paid: true,
          paid_date: item.date || null,
        })
        .eq('id', existing.id)
        .eq('tenant_id', profile.tenant_id)
      if (error) {
        await releaseDedupe(item.dedupe_key)
        errors.push(error.message)
        continue
      }
      await supabase
        .from('bank_import_records')
        .update({ accounting_entry_id: existing.id })
        .eq('tenant_id', profile.tenant_id)
        .eq('dedupe_key', item.dedupe_key)
      await syncEntryLedger(supabase, profile.tenant_id, existing.id)
      matched++
      continue
    }

    if (!item.amount_rappen || item.amount_rappen <= 0) {
      await releaseDedupe(item.dedupe_key)
      errors.push(`${item.counterparty_name || item.dedupe_key}: Betrag fehlt`)
      continue
    }
    const description = (item.remittance || item.counterparty_name || 'Bankausgabe').trim()
    const { data: entry, error } = await supabase
      .from('accounting_entries')
      .insert({
        tenant_id: profile.tenant_id,
        type: 'expense',
        document_kind: item.iban || item.counterparty_name ? 'creditor' : 'expense',
        amount_rappen: item.amount_rappen || 0,
        entry_date: item.date,
        description,
        category_id: fallbackCat?.id ?? null,
        is_paid: true,
        paid_date: item.date || null,
        creditor_name: item.counterparty_name || null,
        creditor_iban: item.iban || null,
        payment_reference: item.reference || null,
        external_reference: item.dedupe_key,
        notes: 'CAMT-Import',
        approval_status: 'approved',
        created_by: profile.id,
      })
      .select('id')
      .single()
    if (error || !entry) {
      await releaseDedupe(item.dedupe_key)
      errors.push(`${description}: ${error?.message ?? 'Insert fehlgeschlagen'}`)
      continue
    }
    await supabase
      .from('bank_import_records')
      .update({ accounting_entry_id: entry.id })
      .eq('tenant_id', profile.tenant_id)
      .eq('dedupe_key', item.dedupe_key)
    await syncEntryLedger(supabase, profile.tenant_id, entry.id)
    created++
  }

  return { success: true, matched, created, errors }
})
