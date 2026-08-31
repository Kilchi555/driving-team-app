import type { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  CATEGORY_TO_ACCOUNT,
  KMU_DEFAULT_ACCOUNTS,
  SYSTEM_ACCOUNT_NUMBERS,
  accountClassFromNumber,
  defaultAccountForCategory,
  ledgerLinesBalanced,
  proposeLedgerLines,
  resolveLineAccountIds,
  reverseLedgerLines,
} from '~/server/utils/accounting-ledger'

type Admin = ReturnType<typeof getSupabaseAdmin>

type AccountRow = {
  id: string
  number: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  class: number
  is_system: boolean
  is_active: boolean
}

export async function ensureTenantAccounts(supabase: Admin, tenantId: string): Promise<AccountRow[]> {
  const { data: existing, error } = await supabase
    .from('accounting_accounts')
    .select('id, number, name, type, class, is_system, is_active')
    .eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)

  const have = new Set((existing ?? []).map(a => a.number))
  const missing = KMU_DEFAULT_ACCOUNTS.filter(a => !have.has(a.number))
  if (missing.length > 0) {
    const { error: insertError } = await supabase.from('accounting_accounts').insert(
      missing.map(a => ({
        tenant_id: tenantId,
        number: a.number,
        name: a.name,
        type: a.type,
        class: accountClassFromNumber(a.number),
        is_system: a.is_system === true,
        is_active: true,
      })),
    )
    if (insertError) throw new Error(insertError.message)
  }

  const { data: cats, error: catError } = await supabase
    .from('accounting_categories')
    .select('id, name, type, account_id')
    .eq('tenant_id', tenantId)
  if (catError) throw new Error(catError.message)

  const { data: accounts } = await supabase
    .from('accounting_accounts')
    .select('id, number, name, type, class, is_system, is_active')
    .eq('tenant_id', tenantId)
    .order('number')

  const byNumber = new Map((accounts ?? []).map(a => [a.number, a]))
  for (const cat of cats ?? []) {
    if (cat.account_id) continue
    const number = defaultAccountForCategory(cat.name, cat.type)
    const acc = byNumber.get(number) || byNumber.get(CATEGORY_TO_ACCOUNT[cat.name] ?? '')
    if (!acc) continue
    await supabase
      .from('accounting_categories')
      .update({ account_id: acc.id })
      .eq('id', cat.id)
      .eq('tenant_id', tenantId)
  }

  return (accounts ?? []) as AccountRow[]
}

function paymentMethodAccount(method?: string | null): string {
  const m = (method ?? '').toLowerCase()
  if (m.includes('cash') || m.includes('bar') || m.includes('kasse')) return '1000'
  return '1020'
}

export async function syncEntryLedger(
  supabase: Admin,
  tenantId: string,
  entryId: string,
): Promise<number> {
  await ensureTenantAccounts(supabase, tenantId)

  const { data: entry, error } = await supabase
    .from('accounting_entries')
    .select(`
      id, type, amount_rappen, document_kind, is_paid, linked_payment_id,
      vat_amount_rappen, vat_rate, storno_of_id, approval_status, deleted_at,
      external_reference,
      category:accounting_categories(id, name, account_id)
    `)
    .eq('id', entryId)
    .eq('tenant_id', tenantId)
    .single()
  if (error || !entry) throw new Error(error?.message ?? 'Buchung nicht gefunden')

  if (entry.external_reference === 'opening-bank') {
    const { count } = await supabase
      .from('accounting_journal_lines')
      .select('id', { count: 'exact', head: true })
      .eq('entry_id', entryId)
    return count ?? 0
  }

  await supabase.from('accounting_journal_lines').delete().eq('entry_id', entryId).eq('tenant_id', tenantId)

  if (entry.deleted_at || entry.approval_status === 'rejected' || entry.approval_status === 'pending') {
    return 0
  }

  const { data: accounts } = await supabase
    .from('accounting_accounts')
    .select('id, number')
    .eq('tenant_id', tenantId)
  const byNumber = new Map((accounts ?? []).map(a => [a.number, a]))
  const byId = new Map((accounts ?? []).map(a => [a.id, a]))

  const category = Array.isArray(entry.category) ? entry.category[0] : entry.category
  let paymentNumber = '1020'
  if (entry.linked_payment_id) {
    const { data: pay } = await supabase
      .from('payments')
      .select('payment_method')
      .eq('id', entry.linked_payment_id)
      .maybeSingle()
    paymentNumber = paymentMethodAccount(pay?.payment_method)
  }

  let drafts = proposeLedgerLines({
    type: entry.type,
    amount_rappen: entry.amount_rappen,
    document_kind: entry.document_kind,
    is_paid: entry.is_paid,
    linked_payment_id: entry.linked_payment_id,
    vat_amount_rappen: entry.vat_amount_rappen,
    vat_rate: entry.vat_rate,
    category_name: category?.name ?? null,
    category_account_number: category?.account_id ? byId.get(category.account_id)?.number ?? null : null,
    payment_account_number: paymentNumber,
    storno_of_id: entry.storno_of_id,
  })

  if (entry.storno_of_id) {
    const { data: originalLines } = await supabase
      .from('accounting_journal_lines')
      .select('account_id, debit_rappen, credit_rappen')
      .eq('entry_id', entry.storno_of_id)
    const originalDrafts = (originalLines ?? []).map((l) => ({
      account_number: byId.get(l.account_id)?.number ?? '',
      debit_rappen: l.debit_rappen,
      credit_rappen: l.credit_rappen,
    })).filter(l => l.account_number)
    drafts = reverseLedgerLines(originalDrafts)
  }

  if (!drafts.length) return 0
  if (!ledgerLinesBalanced(drafts)) throw new Error('Soll und Haben stimmen nicht überein')

  const rows = resolveLineAccountIds(drafts, byNumber).map(l => ({
    tenant_id: tenantId,
    entry_id: entryId,
    ...l,
  }))
  const { error: insertError } = await supabase.from('accounting_journal_lines').insert(rows)
  if (insertError) throw new Error(insertError.message)
  return rows.length
}

export async function backfillTenantLedger(supabase: Admin, tenantId: string) {
  const accounts = await ensureTenantAccounts(supabase, tenantId)
  const byNumber = new Map(accounts.map(a => [a.number, a]))
  const byId = new Map(accounts.map(a => [a.id, a]))

  const haveLines = new Set<string>()
  let from = 0
  while (true) {
    const { data: existingLines, error: lineError } = await supabase
      .from('accounting_journal_lines')
      .select('entry_id')
      .eq('tenant_id', tenantId)
      .range(from, from + 999)
    if (lineError) throw new Error(lineError.message)
    for (const row of existingLines ?? []) haveLines.add(row.entry_id)
    if ((existingLines ?? []).length < 1000) break
    from += 1000
  }

  const pending: Array<{
    id: string
    type: string
    amount_rappen: number
    document_kind: string | null
    is_paid: boolean | null
    linked_payment_id: string | null
    vat_amount_rappen: number | null
    vat_rate: number | null
    storno_of_id: string | null
    external_reference: string | null
    category: { name?: string; account_id?: string } | { name?: string; account_id?: string }[] | null
  }> = []
  from = 0
  while (true) {
    const { data: chunk, error } = await supabase
      .from('accounting_entries')
      .select('id, type, amount_rappen, document_kind, is_paid, linked_payment_id, vat_amount_rappen, vat_rate, storno_of_id, external_reference, category:accounting_categories(name, account_id)')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .is('deleted_at', null)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    pending.push(...(chunk ?? []))
    if ((chunk ?? []).length < 1000) break
    from += 1000
  }

  const toInsert: Array<{ tenant_id: string; entry_id: string; account_id: string; debit_rappen: number; credit_rappen: number }> = []
  let posted = 0
  for (const entry of pending) {
    if (haveLines.has(entry.id) || entry.external_reference === 'opening-bank') continue
    const category = Array.isArray(entry.category) ? entry.category[0] : entry.category
    const drafts = proposeLedgerLines({
      type: entry.type,
      amount_rappen: entry.amount_rappen,
      document_kind: entry.document_kind,
      is_paid: entry.is_paid,
      linked_payment_id: entry.linked_payment_id,
      vat_amount_rappen: entry.vat_amount_rappen,
      vat_rate: entry.vat_rate,
      category_name: category?.name ?? null,
      category_account_number: category?.account_id ? byId.get(category.account_id)?.number ?? null : null,
      storno_of_id: entry.storno_of_id,
    })
    if (entry.storno_of_id) continue
    if (!drafts.length || !ledgerLinesBalanced(drafts)) continue
    const rows = resolveLineAccountIds(drafts, byNumber).map(l => ({
      tenant_id: tenantId,
      entry_id: entry.id,
      ...l,
    }))
    toInsert.push(...rows)
    posted += rows.length
  }

  for (let i = 0; i < toInsert.length; i += 200) {
    const { error: insertError } = await supabase
      .from('accounting_journal_lines')
      .insert(toInsert.slice(i, i + 200))
    if (insertError) throw new Error(insertError.message)
  }

  const stornos = pending.filter(e => e.storno_of_id && !haveLines.has(e.id))
  for (const entry of stornos) {
    posted += await syncEntryLedger(supabase, tenantId, entry.id)
  }

  const bank = accounts.find(a => a.number === '1020')
  const opening = accounts.find(a => a.number === '9000')
  const { data: tenant } = await supabase
    .from('tenants')
    .select('bank_balance_rappen')
    .eq('id', tenantId)
    .single()
  const bankRappen = tenant?.bank_balance_rappen ?? 0

  if (bank && opening && bankRappen > 0) {
    const { data: existingOpen } = await supabase
      .from('accounting_entries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('external_reference', 'opening-bank')
      .is('deleted_at', null)
      .maybeSingle()
    if (!existingOpen) {
      const year = new Date().getFullYear()
      const { data: openEntry, error: openErr } = await supabase
        .from('accounting_entries')
        .insert({
          tenant_id: tenantId,
          type: 'income',
          amount_rappen: bankRappen,
          entry_date: `${year}-01-01`,
          description: 'Eröffnungsbilanz Bank',
          document_kind: 'debtor',
          is_paid: true,
          approval_status: 'approved',
          external_reference: 'opening-bank',
          notes: 'Automatisch aus bisherigem Banksaldo',
        })
        .select('id')
        .single()
      if (openErr) throw new Error(openErr.message)
      await supabase.from('accounting_journal_lines').insert([
        { tenant_id: tenantId, entry_id: openEntry.id, account_id: bank.id, debit_rappen: bankRappen, credit_rappen: 0 },
        { tenant_id: tenantId, entry_id: openEntry.id, account_id: opening.id, debit_rappen: 0, credit_rappen: bankRappen },
      ])
      posted += 2
    }
  }

  return { accounts: accounts.length, posted }
}

export { SYSTEM_ACCOUNT_NUMBERS }
