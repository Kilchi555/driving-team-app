import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import { creditDeferredCashOverpayment } from '~/server/utils/staff-pos-deferred-overpayment'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const paymentIds = Array.isArray(body?.payment_ids) ? body.payment_ids.map((id: unknown) => String(id)) : []
  const amountRappen = body?.amount_rappen
  if (paymentIds.length === 0 || paymentIds.some((id: string) => !UUID.test(id)) || new Set(paymentIds).size !== paymentIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'Zahlung ist ungültig' })
  }
  if (!Number.isInteger(amountRappen) || amountRappen <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Überzahlung ist ungültig' })
  }

  const supabase = getSupabaseAdmin()
  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, tenant_id, user_id, payment_method, payment_status, appointment_id, metadata')
    .in('id', paymentIds)
    .eq('tenant_id', profile.tenant_id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Zahlung konnte nicht geladen werden' })
  }
  if (!payments || payments.length !== paymentIds.length) {
    throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
  }

  try {
    return await creditDeferredCashOverpayment({
      supabase,
      actorId: profile.id,
      actorTenantId: profile.tenant_id,
      payments,
      amountRappen,
    })
  } catch (err: unknown) {
    if (err instanceof StaffProductSaleError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    const statusCode = typeof err === 'object' && err && 'statusCode' in err && typeof err.statusCode === 'number'
      ? err.statusCode
      : 500
    const statusMessage = err instanceof Error ? err.message : 'Überzahlung konnte nicht verbucht werden'
    throw createError({ statusCode, statusMessage })
  }
})