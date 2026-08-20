import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { CASH_DIFF_CATEGORY_NAME, cashDifferenceRappen } from '~/server/utils/accounting'
import { syncEntryLedger } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const body = await readBody<{
    counted_rappen?: number
    close_date?: string
    notes?: string
  }>(event)

  const counted = Math.round(Number(body.counted_rappen))
  if (!Number.isFinite(counted) || counted < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Gezählter Bestand muss ≥ 0 sein' })
  }

  const closeDate = body.close_date || new Date().toISOString().slice(0, 10)

  const { data: cashRows, error: cashErr } = await supabase
    .from('cash_balances')
    .select('current_balance_rappen')
    .eq('tenant_id', profile.tenant_id)
  if (cashErr) throw createError({ statusCode: 500, statusMessage: cashErr.message })

  const bookRappen = (cashRows ?? []).reduce((s, r) => s + (r.current_balance_rappen ?? 0), 0)
  const diff = cashDifferenceRappen(counted, bookRappen)

  const { data: close, error: closeErr } = await supabase
    .from('cash_daily_closes')
    .insert({
      tenant_id: profile.tenant_id,
      close_date: closeDate,
      counted_rappen: counted,
      book_balance_rappen: bookRappen,
      difference_rappen: diff,
      notes: body.notes?.trim() || null,
      closed_by: profile.id || null,
    })
    .select()
    .single()
  if (closeErr) throw createError({ statusCode: 500, statusMessage: closeErr.message })

  let entry = null
  if (diff !== 0) {
    const { data: cat } = await supabase
      .from('accounting_categories')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('name', CASH_DIFF_CATEGORY_NAME)
      .maybeSingle()

    const abs = Math.abs(diff)
    const { data: created, error: entryErr } = await supabase
      .from('accounting_entries')
      .insert({
        tenant_id: profile.tenant_id,
        type: diff > 0 ? 'income' : 'expense',
        amount_rappen: abs,
        entry_date: closeDate,
        description: diff > 0
          ? `Kassendifferenz Überschuss (${closeDate})`
          : `Kassendifferenz Fehlbetrag (${closeDate})`,
        category_id: cat?.id ?? null,
        notes: body.notes?.trim() || `Gezählt ${counted}, Buch ${bookRappen}`,
        linked_cash_close_id: close.id,
        is_paid: true,
        paid_date: closeDate,
        approval_status: 'approved',
        created_by: profile.id || null,
      })
      .select()
      .single()
    if (entryErr) throw createError({ statusCode: 500, statusMessage: entryErr.message })
    entry = created
    if (entry?.id) await syncEntryLedger(supabase, profile.tenant_id, entry.id)
  }

  return {
    success: true,
    close,
    difference_rappen: diff,
    entry,
  }
})
