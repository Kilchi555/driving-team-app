/**
 * Einheitliche Anzeige des Guthabens (student_credits vs. Buchungsjournal).
 *
 * Problem: Legacy-/Duplikat-Zeilen in student_credits (z. B. tenant_id NULL vs. gesetzt)
 * oder veraltete balance_rappen, während credit_transactions korrekt sind.
 */

type CreditRow = { balance_rappen: number | null; tenant_id: string | null }

export function balanceFromStudentCreditRows(
  rows: CreditRow[] | null | undefined,
  tenantId: string | null | undefined
): number {
  if (!rows?.length) return 0
  if (tenantId) {
    const matching = rows.filter(r => r.tenant_id === tenantId || r.tenant_id == null)
    if (matching.length) {
      return Math.max(0, ...matching.map(r => Number(r.balance_rappen) || 0))
    }
  }
  return Math.max(0, ...rows.map(r => Number(r.balance_rappen) || 0))
}

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => any
  }
}

/**
 * Effektives Guthaben: student_credits (Tenant + Legacy-Zeilen), bei 0 Fallback auf
 * letzte credit_transactions.balance_after_rappen (nur wenn > 0).
 */
export async function getEffectiveCreditBalanceRappen(
  supabase: SupabaseLike,
  userId: string,
  tenantId: string | null | undefined
): Promise<number> {
  const { data: creditRows } = await supabase
    .from('student_credits')
    .select('balance_rappen, tenant_id')
    .eq('user_id', userId)

  let balance = balanceFromStudentCreditRows(creditRows as CreditRow[] | null, tenantId)

  const { data: lastRows } = await supabase
    .from('credit_transactions')
    .select('balance_after_rappen')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  const ledger = Array.isArray(lastRows) && lastRows[0]
    ? Number((lastRows[0] as { balance_after_rappen?: number }).balance_after_rappen)
    : NaN

  if (balance === 0 && Number.isFinite(ledger) && ledger > 0) {
    balance = ledger
  }

  return balance
}
