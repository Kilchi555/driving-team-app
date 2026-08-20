import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { backfillTenantLedger } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  try {
    const result = await backfillTenantLedger(supabase, profile.tenant_id)
    return { success: true, ...result }
  } catch (err: unknown) {
    throw createError({ statusCode: 500, statusMessage: (err as Error).message })
  }
})
