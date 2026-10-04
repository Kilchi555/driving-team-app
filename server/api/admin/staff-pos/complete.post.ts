import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import { completeDeferredStaffProductSale } from '~/server/utils/staff-pos-completion'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const paymentId = String(body?.payment_id || '')
  if (!UUID.test(paymentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Zahlung ist ungültig' })
  }

  const supabase = getSupabaseAdmin()
  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, tenant_id, payment_method, payment_status, appointment_id, metadata')
    .eq('id', paymentId)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Zahlung konnte nicht geladen werden' })
  }

  try {
    return await completeDeferredStaffProductSale({
      actorId: profile.id,
      actorTenantId: profile.tenant_id,
      payment,
      rpc: async (args) => {
        const { data, error: rpcError } = await supabase.rpc('staff_pos_sale', args)
        if (rpcError) throw rpcError
        return data
      },
    })
  } catch (err: unknown) {
    if (err instanceof StaffProductSaleError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    const statusCode = typeof err === 'object' && err && 'statusCode' in err && typeof err.statusCode === 'number'
      ? err.statusCode
      : 500
    const statusMessage = typeof err === 'object' && err && 'statusMessage' in err && typeof err.statusMessage === 'string'
      ? err.statusMessage
      : err instanceof Error
        ? err.message
        : 'Verkauf konnte nicht abgeschlossen werden'
    throw createError({ statusCode, statusMessage })
  }
})
