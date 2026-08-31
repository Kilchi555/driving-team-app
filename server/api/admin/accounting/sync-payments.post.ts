import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { backfillTenantLedger } from '~/server/utils/accounting-ledger-db'

/**
 * Idempotent: verbucht abgeschlossene Zahlungen, die noch kein Journal-Eintrag haben.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase.rpc('backfill_accounting_from_payments', {
    p_tenant_id: profile.tenant_id,
  })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const ledger = await backfillTenantLedger(supabase, profile.tenant_id)

  return { success: true, booked: Number(data ?? 0), ledger }
})
