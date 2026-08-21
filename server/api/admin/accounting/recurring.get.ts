import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { runDueRecurring } from '~/server/utils/accounting-recurring-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const canRun = !profile.is_accountant || profile.accountant_access === 'write'
  if (canRun) {
    try { await runDueRecurring(supabase, { tenantId: profile.tenant_id }) } catch { /* list still works */ }
  }

  const { data, error } = await supabase
    .from('accounting_recurring_entries')
    .select('id, interval, next_due_date, last_created_at, ends_on, is_active, type, document_kind, amount_rappen, description, category_id, creditor_name, is_paid, notes')
    .eq('tenant_id', profile.tenant_id)
    .order('next_due_date', { ascending: true, nullsFirst: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data: data ?? [] }
})
