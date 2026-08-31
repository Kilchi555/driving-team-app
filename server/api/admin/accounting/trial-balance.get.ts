import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildTrialBalance, statementsFromTrial, type LedgerAccountType } from '~/server/utils/accounting-ledger'
import { ensureTenantAccounts } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const accounts = await ensureTenantAccounts(supabase, profile.tenant_id)

  const query = getQuery(event)
  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()

  const { data: entryRows, error: entryError } = await supabase
    .from('accounting_entries')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)
  if (entryError) throw createError({ statusCode: 500, statusMessage: entryError.message })

  const entryIds = (entryRows ?? []).map(e => e.id)
  let lines: Array<{ account_id: string; debit_rappen: number; credit_rappen: number }> = []
  for (let i = 0; i < entryIds.length; i += 200) {
    const chunk = entryIds.slice(i, i + 200)
    const { data, error } = await supabase
      .from('accounting_journal_lines')
      .select('account_id, debit_rappen, credit_rappen')
      .eq('tenant_id', profile.tenant_id)
      .in('entry_id', chunk)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    lines = lines.concat(data ?? [])
  }

  const trial = buildTrialBalance(
    accounts.map(a => ({
      id: a.id,
      number: a.number,
      name: a.name,
      type: a.type as LedgerAccountType,
      class: a.class,
    })),
    lines,
  )
  const statements = statementsFromTrial(trial)

  return {
    success: true,
    year,
    trial,
    statements,
  }
})
