import { createError, defineEventHandler, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { evaluateReceiptReset } from '~/server/utils/payment-receipt-reset'
import { loadReceiptResetSnapshot, zurichDate } from '~/server/utils/payment-receipt-reset-load'
import { receiptResetBody, receiptResetStatus } from '~/server/utils/payment-receipt-reset-http'
import type { InvoiceLineDisposition, AppointmentDisposition } from '~/server/utils/payment-receipt-reset'

export default defineEventHandler(async (event) => {
  const snapshot = await snapshotFromEvent(event)
  const evaluation = evaluateReceiptReset(snapshot)
  const status = receiptResetStatus(evaluation)
  if (status === 401 || status === 403 || status === 404) {
    throw createError({ statusCode: status, statusMessage: evaluation.reasons[0] || 'Forbidden', data: receiptResetBody(evaluation) })
  }
  return receiptResetBody(evaluation)
})

async function snapshotFromEvent(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) {
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
    return loadReceiptResetSnapshot(getSupabaseAdmin(), {
      actorUserId: null,
      callerRole: null,
      callerTenantId: null,
      paymentId: null,
      appointmentId: null,
      asOfDate: zurichDate(),
      decisions: decisionsFromBody(body),
    })
  }

  const supabase = getSupabaseAdmin()
  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  return loadReceiptResetSnapshot(supabase, {
    actorUserId: staffUser?.id ?? null,
    callerRole: staffUser?.role ?? null,
    callerTenantId: staffUser?.tenant_id ?? null,
    paymentId: body?.payment_id ?? null,
    appointmentId: body?.appointment_id ?? null,
    asOfDate: zurichDate(),
    decisions: decisionsFromBody(body),
  })
}

function decisionsFromBody(body: {
  reason?: string
  confirm_siblings_remain_settled?: boolean
  invoice_line_disposition?: InvoiceLineDisposition | null
  appointment_disposition?: AppointmentDisposition | null
  appointment_status?: string | null
  idempotency_key?: string
} | null | undefined) {
  return {
    reason: body?.reason ?? null,
    confirmSiblingsRemainSettled: Boolean(body?.confirm_siblings_remain_settled),
    invoiceLineDisposition: body?.invoice_line_disposition ?? null,
    appointmentDisposition: body?.appointment_disposition ?? null,
    appointmentStatus: body?.appointment_status ?? null,
    idempotencyKey: body?.idempotency_key ?? null,
  }
}
