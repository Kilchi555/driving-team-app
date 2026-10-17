import { createError, defineEventHandler, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { evaluateReceiptReset } from '~/server/utils/payment-receipt-reset'
import { loadReceiptResetSnapshot, zurichDate } from '~/server/utils/payment-receipt-reset-load'
import { receiptResetBody, receiptResetRpcArgs, receiptResetStatus } from '~/server/utils/payment-receipt-reset-http'
import type { AppointmentDisposition, InvoiceLineDisposition } from '~/server/utils/payment-receipt-reset'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  const body = await readBody<{
    payment_id?: string
    appointment_id?: string
    reason?: string
    confirm_siblings_remain_settled?: boolean
    invoice_line_disposition?: InvoiceLineDisposition | null
    appointment_disposition?: AppointmentDisposition | null
    appointment_status?: string | null
    idempotency_key?: string
  }>(event)

  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  }

  const supabase = getSupabaseAdmin()
  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  const snapshot = await loadReceiptResetSnapshot(supabase, {
    actorUserId: staffUser?.id ?? null,
    callerRole: staffUser?.role ?? null,
    callerTenantId: staffUser?.tenant_id ?? null,
    paymentId: body?.payment_id ?? null,
    appointmentId: body?.appointment_id ?? null,
    asOfDate: zurichDate(),
    decisions: {
      reason: body?.reason ?? null,
      confirmSiblingsRemainSettled: Boolean(body?.confirm_siblings_remain_settled),
      invoiceLineDisposition: body?.invoice_line_disposition ?? null,
      appointmentDisposition: body?.appointment_disposition ?? null,
      appointmentStatus: body?.appointment_status ?? null,
      idempotencyKey: body?.idempotency_key ?? null,
    },
  })

  const evaluation = evaluateReceiptReset(snapshot)
  const status = receiptResetStatus(evaluation)
  const rpcArgs = receiptResetRpcArgs(snapshot, evaluation)
  if (!rpcArgs || status !== 200) {
    throw createError({
      statusCode: status === 200 ? 409 : status,
      statusMessage: evaluation.reasons[0] || 'blocked',
      data: receiptResetBody(evaluation),
    })
  }

  const { data, error } = await supabase.rpc('admin_reset_mistaken_receipt', rpcArgs)
  if (error) {
    throw createError({
      statusCode: 409,
      statusMessage: error.message,
      data: { ...receiptResetBody(evaluation), success: false, blocked: true },
    })
  }

  return { ...receiptResetBody(evaluation), rpc: data }
})
