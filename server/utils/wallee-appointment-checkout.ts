import { createError } from 'h3'
import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import {
  PAY_BEFORE_CONFIRM_HOLD_MINUTES,
  canReleaseUnpaidHold,
  shouldConfirmHeldAppointmentFromPayments,
} from '~/server/utils/pay-before-confirm'
import { buildMerchantReference } from '~/utils/merchantReference'
import { logger } from '~/utils/logger'
import { buildWalleeTaxedLineItem, loadCheckoutVat, mergeVatIntoMetadata } from '~/server/utils/wallee-line-item'
import { refundStudentCreditFromPayment, remainingDueRappen } from '~/server/utils/apply-student-credit'

export function checkoutAppUrl(): string {
  return (process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch').replace(/\/$/, '')
}

export function safeCheckoutReturnUrl(url: string | undefined, fallback: string): string {
  if (!url) return fallback
  try {
    const parsed = new URL(url)
    const allowed = new URL(checkoutAppUrl())
    if (parsed.origin === allowed.origin) return url
  } catch {
    // invalid URL
  }
  logger.warn('⚠️ Rejected off-origin Wallee return URL', { url })
  return fallback
}

export async function createWalleeCheckoutForPayment(opts: {
  paymentId: string
  tenantId: string
  customerEmail: string
  customerName: string
  customerId: string
  appointmentId?: string | null
  startTime?: string | null
  durationMinutes?: number | null
  successUrl?: string
  failedUrl?: string
}): Promise<{ paymentUrl: string; transactionId: string }> {
  const supabase = getSupabaseAdmin()
  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, tenant_id, total_amount_rappen, credit_used_rappen, amount_paid_rappen, description, appointment_id, payment_status, wallee_transaction_id, wallee_space_id, metadata')
    .eq('id', opts.paymentId)
    .eq('tenant_id', opts.tenantId)
    .single()

  if (error || !payment) {
    throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
  }
  if (payment.payment_status !== 'pending' && payment.payment_status !== 'processing') {
    throw createError({ statusCode: 409, statusMessage: 'Zahlung kann nicht mehr gestartet werden' })
  }

  const amountRappen = remainingDueRappen({
    id: payment.id,
    user_id: '',
    total_amount_rappen: payment.total_amount_rappen,
    credit_used_rappen: payment.credit_used_rappen,
    amount_paid_rappen: payment.amount_paid_rappen,
    payment_status: payment.payment_status,
  })
  if (amountRappen <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Kein Betrag zur Onlinezahlung' })
  }

  const walleeConfig = await getWalleeConfigForTenant(opts.tenantId)
  const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
  const transactionService = new Wallee.api.TransactionService(config)
  const spaceId = walleeConfig.spaceId
  const successUrl = safeCheckoutReturnUrl(
    opts.successUrl,
    `${checkoutAppUrl()}/customer-dashboard?booking_success=true&payment_success=true`
  )
  const failedUrl = safeCheckoutReturnUrl(
    opts.failedUrl,
    `${checkoutAppUrl()}/customer-dashboard?payment_failed=true`
  )

  if (payment.wallee_transaction_id) {
    const existingUrl = await resolveExistingPaymentPageUrl(config, spaceId, payment.wallee_transaction_id)
    if (existingUrl) {
      return { paymentUrl: existingUrl, transactionId: String(payment.wallee_transaction_id) }
    }
  }

  const merchantReference = `payment-${payment.id} | ${buildMerchantReference({
    staffName: opts.customerName,
    startTime: opts.startTime || undefined,
    durationMinutes: opts.durationMinutes || undefined,
    appointmentId: opts.appointmentId || payment.appointment_id || undefined,
  })}`.slice(0, 100)

  const vat = await loadCheckoutVat(supabase, opts.tenantId, amountRappen)
  await supabase
    .from('payments')
    .update({
      metadata: mergeVatIntoMetadata((payment as any).metadata, vat),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)

  const created = await transactionService.create(spaceId, {
    lineItems: [{
      ...buildWalleeTaxedLineItem({
        name: payment.description || 'Termin',
        amountIncludingTaxChf: amountRappen / 100,
        vatRatePercent: vat.vatRate,
      }),
      type: Wallee.model.LineItemType.PRODUCT,
    }],
    currency: 'CHF',
    autoConfirmationEnabled: true,
    chargeRetryEnabled: false,
    customersEmailAddress: opts.customerEmail,
    customerId: `dt-${opts.tenantId}-${opts.customerId}`,
    merchantReference,
    successUrl,
    failedUrl,
  })

  const transaction = (created as any)?.body || created
  const transactionId = transaction?.id
  if (!transactionId) {
    throw createError({ statusCode: 502, statusMessage: 'Wallee-Transaktion konnte nicht erstellt werden' })
  }

  let paymentUrl: string | undefined =
    transaction?.paymentPageUrl || transaction?.paymentPageEndpoint
  if (!paymentUrl) {
    paymentUrl = await resolveExistingPaymentPageUrl(config, spaceId, transactionId) || undefined
  }
  if (!paymentUrl || typeof paymentUrl !== 'string') {
    paymentUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${transactionId}`
  }

  await supabase
    .from('payments')
    .update({
      wallee_transaction_id: String(transactionId),
      wallee_space_id: String(spaceId),
      payment_method: 'wallee',
      payment_provider: 'wallee',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .eq('tenant_id', opts.tenantId)
    .in('payment_status', ['pending', 'processing'])

  try {
    await supabase.from('payment_wallee_transactions').insert({
      payment_id: payment.id,
      wallee_transaction_id: String(transactionId),
      wallee_space_id: spaceId,
      merchant_reference: merchantReference,
    })
  } catch (historyErr: any) {
    logger.warn('⚠️ Transaction history save failed:', historyErr?.message)
  }

  return { paymentUrl, transactionId: String(transactionId) }
}

async function resolveExistingPaymentPageUrl(
  config: any,
  spaceId: number,
  transactionId: string | number
): Promise<string | null> {
  try {
    const pageService = new Wallee.api.TransactionPaymentPageService(config)
    const urlResponse = await pageService.paymentPageUrl(spaceId, Number(transactionId))
    const url = (urlResponse as any)?.body || urlResponse
    return typeof url === 'string' && url ? url : null
  } catch {
    return null
  }
}

export async function confirmHeldAppointmentAfterPayment(opts: {
  appointmentId: string
  tenantId?: string | null
  paymentStatus: 'completed' | 'authorized'
  sendConfirmationEmail?: boolean
}): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const query = supabase
    .from('appointments')
    .select('id, status, user_id, tenant_id')
    .eq('id', opts.appointmentId)
  if (opts.tenantId) query.eq('tenant_id', opts.tenantId)

  const { data: appointment } = await query.maybeSingle()
  if (!appointment) return false
  if (!['pending', 'scheduled', 'confirmed'].includes(appointment.status)) return false

  const nextStatus = opts.paymentStatus === 'completed' ? 'confirmed' : 'scheduled'
  if (opts.paymentStatus === 'authorized' && appointment.status === 'confirmed') return false

  const { error } = await supabase
    .from('appointments')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', appointment.id)
    .in('status', ['pending', 'scheduled', 'confirmed'])

  if (error) {
    logger.warn('⚠️ Could not confirm held appointment after payment:', error.message)
    return false
  }

  if (
    opts.sendConfirmationEmail !== false
    && opts.paymentStatus === 'completed'
    && appointment.status === 'pending'
    && appointment.user_id
    && appointment.tenant_id
  ) {
    try {
      const { dispatchAppointmentConfirmation } = await import(
        '~/server/utils/dispatch-appointment-confirmation'
      )
      await dispatchAppointmentConfirmation({
        appointmentId: appointment.id,
        userId: appointment.user_id,
        tenantId: appointment.tenant_id,
      })
    } catch (confirmErr: any) {
      logger.warn('⚠️ Pay-before-confirm confirmation email failed:', confirmErr?.message)
    }
  }

  return true
}

export async function releaseUnpaidPendingAppointment(opts: {
  appointmentId: string
  tenantId?: string | null
}): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const query = supabase
    .from('appointments')
    .select('id, tenant_id, staff_id, status, source')
    .eq('id', opts.appointmentId)
    .eq('status', 'pending')
    .eq('source', 'online')
  if (opts.tenantId) query.eq('tenant_id', opts.tenantId)

  const { data: appointment } = await query.maybeSingle()
  if (!appointment) return false

  const { data: payments } = await supabase
    .from('payments')
    .select('id, user_id, payment_status, credit_used_rappen, appointment_id, metadata, wallee_transaction_id, wallee_space_id, tenant_id')
    .eq('appointment_id', appointment.id)

  const related = payments || []
  const confirmFrom = shouldConfirmHeldAppointmentFromPayments(related)
  if (confirmFrom) {
    await confirmHeldAppointmentAfterPayment({
      appointmentId: appointment.id,
      tenantId: appointment.tenant_id,
      paymentStatus: confirmFrom,
    })
    logger.info('↩️ Hold not released — payment already captured, appointment confirmed', {
      appointmentId: appointment.id,
    })
    return false
  }

  if (!canReleaseUnpaidHold(related)) return false

  const now = new Date().toISOString()
  const { data: cancelled } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', appointment.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (!cancelled) return false

  for (const payment of related) {
    if (payment.payment_status !== 'pending' || !(payment.credit_used_rappen > 0)) continue
    try {
      await refundStudentCreditFromPayment({
        supabase,
        tenantId: payment.tenant_id || appointment.tenant_id,
        payment,
        notes: `Guthaben-Rückbuchung nach unbezahlter Online-Reservierung (Payment ${payment.id})`,
      })
    } catch (refundErr: any) {
      logger.error('Could not refund wallet credit after unpaid hold release:', refundErr?.message)
    }
  }

  await supabase
    .from('payments')
    .update({
      payment_status: 'cancelled',
      notes: 'Automatisch storniert: unbezahlte Online-Reservierung',
      updated_at: now,
    })
    .eq('appointment_id', appointment.id)
    .eq('payment_status', 'pending')

  for (const payment of related) {
    if (payment.payment_status !== 'pending' || !payment.wallee_transaction_id) continue
    try {
      await voidOpenWalleeTransaction({
        tenantId: payment.tenant_id || appointment.tenant_id,
        transactionId: payment.wallee_transaction_id,
        spaceId: payment.wallee_space_id,
      })
    } catch (voidErr: any) {
      logger.warn('⚠️ Could not void open Wallee transaction after hold release:', voidErr?.message)
    }
  }

  try {
    await supabase
      .from('vehicle_bookings')
      .update({ status: 'cancelled' })
      .eq('appointment_id', appointment.id)
      .neq('status', 'cancelled')
  } catch (vehicleErr: any) {
    logger.warn('⚠️ Could not release vehicle booking after unpaid hold:', vehicleErr?.message)
  }

  await supabase
    .from('availability_slots')
    .update({
      is_available: true,
      appointment_id: null,
      reserved_by_session: null,
      reserved_until: null,
      updated_at: now,
    })
    .eq('appointment_id', appointment.id)

  const cronSecret = process.env.CRON_SECRET
  $fetch('/api/availability/queue-recalc', {
    method: 'POST',
    body: { staff_id: appointment.staff_id, tenant_id: appointment.tenant_id, trigger: 'appointment' },
    headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
  }).catch((err: any) => {
    logger.warn('⚠️ Could not queue availability recalc after unpaid release:', err?.message)
  })

  logger.info('↩️ Released unpaid pending online appointment', { appointmentId: appointment.id })
  return true
}

async function voidOpenWalleeTransaction(opts: {
  tenantId: string
  transactionId: string
  spaceId?: string | number | null
}): Promise<void> {
  const { getWalleeConfigBySpace } = await import('~/server/utils/wallee-config')
  const walleeConfig = opts.spaceId
    ? await getWalleeConfigBySpace(opts.tenantId, Number(opts.spaceId))
    : await getWalleeConfigForTenant(opts.tenantId)
  const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
  const voidService = new Wallee.api.TransactionVoidService(config)
  await voidService.voidOnline(walleeConfig.spaceId, parseInt(String(opts.transactionId), 10))
}

export async function releaseExpiredUnpaidPendingAppointments(limit = 50): Promise<number> {
  const cutoff = new Date(Date.now() - PAY_BEFORE_CONFIRM_HOLD_MINUTES * 60 * 1000).toISOString()
  const supabase = getSupabaseAdmin()
  const { data: expired, error } = await supabase
    .from('appointments')
    .select('id, tenant_id')
    .eq('status', 'pending')
    .eq('source', 'online')
    .lt('created_at', cutoff)
    .limit(limit)

  if (error) {
    logger.warn('⚠️ Could not load expired unpaid pending appointments:', error.message)
    return 0
  }

  let released = 0
  for (const appointment of expired || []) {
    if (await releaseUnpaidPendingAppointment({
      appointmentId: appointment.id,
      tenantId: appointment.tenant_id,
    })) {
      released++
    }
  }
  if (released > 0) {
    logger.info(`🧹 Released ${released} expired unpaid pending appointment(s)`)
  }
  return released
}
