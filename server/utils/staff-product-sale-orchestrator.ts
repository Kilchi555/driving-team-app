/**
 * Orders the staff POS sale around public.staff_pos_sale.
 * Financial writes stay in the RPC. Mail and Wallee run only after commit.
 */
import {
  StaffProductSaleError,
  assertNoClientMoney,
  parseStaffPosLines,
  parseStaffPosMethod,
  type StaffPosMethod,
} from '~/server/utils/staff-product-sale'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface StaffPosActor {
  id: string
  tenant_id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

export interface StaffPosRpcResult {
  ok?: boolean
  replayed?: boolean
  payment_id?: string
  invoice_id?: string | null
  payment_status?: string
  payment_method?: string
  fulfillment?: string
  total_rappen?: number
  credit_applied?: boolean
  credit_rappen?: number
  products?: any[]
  customer_email?: string | null
  customer_name?: string | null
  wallee_transaction_id?: string | null
  vat_rate?: number | string | null
  gross_rappen?: number | string | null
  net_rappen?: number | string | null
  payment_url?: string | null
  claimed?: boolean
  already_sent?: boolean
  already_started?: boolean
  in_progress?: boolean
  claim_token?: string | null
}

export interface StaffPosSaleResult {
  success: true
  payment_id: string
  replayed: boolean
  payment_status: string
  payment_method: string
  fulfillment: StaffPosMethod
  invoice_id: string | null
  invoice_sent: boolean
  credit_applied: boolean
  payment_url: string | null
  warning: string | null
  retry_same_key: boolean
  total_rappen: number
}

type RpcFn = (args: Record<string, unknown>) => Promise<StaffPosRpcResult>

function mapRpcError(error: any): StaffProductSaleError {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  const known: Array<[string, number, string]> = [
    ['forbidden_role', 403, 'Keine Berechtigung'],
    ['forbidden_actor', 403, 'Keine Berechtigung'],
    ['foreign_tenant', 403, 'Falscher Mandant'],
    ['invalid_customer', 400, 'Kunde ist nicht zulässig'],
    ['invalid_product', 400, 'Produkt ist nicht verkaufbar'],
    ['invalid_quantity', 400, 'Ungültige Menge'],
    ['client_price_rejected', 400, 'Preise werden nicht vom Client übernommen'],
    ['overflow', 400, 'Betrag ist zu hoch'],
    ['invalid_method', 400, 'Ungültige Zahlungsart'],
    ['invalid_items', 400, 'Ungültige Positionen'],
    ['invoice_not_sent', 409, 'Rechnung wurde noch nicht versendet'],
    ['payment_not_completed', 409, 'Zahlung ist noch nicht bestätigt'],
    ['invalid_payment', 404, 'Zahlung nicht gefunden'],
    ['invalid_vat_rate', 400, 'MwSt-Satz ist ungültig'],
    ['no_exact_net', 400, 'Für diesen Preis gibt es keinen passenden Nettobetrag'],
    ['zero_credit_snapshot', 409, 'Guthaben-Snapshot ist ungültig'],
    ['invoice_total_mismatch', 409, 'Rechnungsbetrag stimmt nicht mit dem Katalogpreis überein'],
    ['vat_allocation_failed', 409, 'MwSt-Aufteilung ist ungültig'],
  ]
  for (const [code, status, message] of known) {
    if (text.includes(code)) return new StaffProductSaleError(code, status, message)
  }
  return new StaffProductSaleError('sale_failed', 500, 'Verkauf konnte nicht gespeichert werden')
}

async function callRpc(rpc: RpcFn, args: Record<string, unknown>): Promise<StaffPosRpcResult> {
  try {
    const result = await rpc(args)
    if (!result?.ok && !result?.payment_id) {
      throw new StaffProductSaleError('sale_failed', 500, 'Verkauf konnte nicht gespeichert werden')
    }
    return result
  } catch (error: any) {
    if (error instanceof StaffProductSaleError) throw error
    throw mapRpcError(error)
  }
}

function baseArgs(actorId: string, method: StaffPosMethod, customerId: string, items: unknown, key: string) {
  return {
    p_actor_user_id: actorId,
    p_customer_id: customerId,
    p_items: items,
    p_idempotency_key: key,
    p_method: method,
    p_payment_id: null,
    p_claim_token: null,
  }
}

export async function executeStaffProductSale(opts: {
  rpc: RpcFn
  actor: StaffPosActor
  body: any
  sendInvoice?: (invoiceId: string) => Promise<{ sent: boolean; reason?: string }>
  startWallee?: (input: {
    paymentId: string
    totalRappen: number
    products: any[]
    customerEmail: string
    customerName: string
    vatRatePercent: number
  }) => Promise<{ transactionId: string | null; paymentUrl: string | null; warning?: string }>
  sendPaymentLink?: (input: { to: string; paymentUrl: string; customerName: string; totalRappen: number }) => Promise<void>
}): Promise<StaffPosSaleResult> {
  const body = opts.body || {}
  assertNoClientMoney(body)
  const method = parseStaffPosMethod(body.payment_method)
  const items = parseStaffPosLines(body.items)
  const customerId = String(body.customer_id || '')
  const idempotencyKey = String(body.idempotency_key || '')
  if (!UUID.test(customerId)) {
    throw new StaffProductSaleError('invalid_customer', 400, 'Kunde ist erforderlich')
  }
  if (!UUID.test(idempotencyKey)) {
    throw new StaffProductSaleError('invalid_idempotency_key', 400, 'Idempotency-Key fehlt')
  }

  const created = await callRpc(opts.rpc, {
    ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
    p_action: 'create',
  })

  const paymentId = String(created.payment_id || '')
  if (!paymentId) throw new StaffProductSaleError('sale_failed', 500, 'Zahlung wurde nicht erzeugt')

  const result: StaffPosSaleResult = {
    success: true,
    payment_id: paymentId,
    replayed: created.replayed === true,
    payment_status: created.payment_status || (method === 'cash' ? 'completed' : 'pending'),
    payment_method: created.payment_method || (method === 'invoice_send' ? 'invoice' : method),
    fulfillment: method,
    invoice_id: created.invoice_id || null,
    invoice_sent: false,
    credit_applied: created.credit_applied === true,
    payment_url: null,
    warning: null,
    retry_same_key: false,
    total_rappen: Number(created.total_rappen || 0),
  }

  if (method === 'invoice_send') {
    return finishInvoiceSend(opts, result, method, customerId, items, idempotencyKey)
  }
  if (method === 'wallee') {
    return finishWallee(opts, result, created, method, customerId, items, idempotencyKey)
  }
  return result
}

async function finishInvoiceSend(
  opts: Parameters<typeof executeStaffProductSale>[0],
  result: StaffPosSaleResult,
  method: StaffPosMethod,
  customerId: string,
  items: unknown,
  idempotencyKey: string,
): Promise<StaffPosSaleResult> {
  const claim = await callRpc(opts.rpc, {
    ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
    p_action: 'claim_send',
    p_payment_id: result.payment_id,
  })

  if (claim.already_sent) {
    const credit = await callRpc(opts.rpc, {
      ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
      p_action: 'apply_credit',
      p_payment_id: result.payment_id,
    })
    return {
      ...result,
      invoice_id: claim.invoice_id || result.invoice_id,
      invoice_sent: true,
      credit_applied: credit.credit_applied === true,
      retry_same_key: credit.credit_applied !== true,
    }
  }

  if (claim.in_progress || !claim.claimed) {
    return {
      ...result,
      invoice_sent: false,
      credit_applied: false,
      retry_same_key: true,
      warning: 'Rechnungsversand läuft bereits',
    }
  }

  let sent = false
  let reason = 'send_failed'
  try {
    const delivery = await opts.sendInvoice?.(String(claim.invoice_id || result.invoice_id || ''))
    sent = delivery?.sent === true
    reason = delivery?.reason || reason
  } catch {
    sent = false
  }

  if (!sent) {
    if (claim.claim_token) {
      await callRpc(opts.rpc, {
        ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
        p_action: 'release_send',
        p_payment_id: result.payment_id,
        p_claim_token: claim.claim_token,
      }).catch(() => undefined)
    }
    return {
      ...result,
      invoice_id: claim.invoice_id || result.invoice_id,
      invoice_sent: false,
      credit_applied: false,
      retry_same_key: true,
      warning: reason === 'missing_email'
        ? 'Rechnung wurde erstellt, aber es fehlt eine E-Mail-Adresse'
        : 'Rechnung wurde erstellt, der Versand ist fehlgeschlagen',
    }
  }

  const credit = await callRpc(opts.rpc, {
    ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
    p_action: 'apply_credit',
    p_payment_id: result.payment_id,
  })

  return {
    ...result,
    invoice_id: claim.invoice_id || result.invoice_id,
    invoice_sent: true,
    credit_applied: credit.credit_applied === true,
    retry_same_key: credit.credit_applied !== true,
  }
}

async function finishWallee(
  opts: Parameters<typeof executeStaffProductSale>[0],
  result: StaffPosSaleResult,
  created: StaffPosRpcResult,
  method: StaffPosMethod,
  customerId: string,
  items: unknown,
  idempotencyKey: string,
): Promise<StaffPosSaleResult> {
  const pending = {
    ...result,
    credit_applied: false,
    payment_status: 'pending',
  }

  const claim = await callRpc(opts.rpc, {
    ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
    p_action: 'claim_wallee',
    p_payment_id: result.payment_id,
  })

  if (claim.already_started || created.wallee_transaction_id) {
    return {
      ...pending,
      payment_url: claim.payment_url || null,
      warning: claim.payment_url ? null : 'Online-Zahlung wurde bereits gestartet',
      retry_same_key: false,
    }
  }
  if (claim.in_progress || !claim.claimed) {
    return { ...pending, retry_same_key: true, warning: 'Online-Zahlung wird bereits gestartet' }
  }

  const email = String(created.customer_email || '').trim()
  if (!email) {
    await releaseWallee(opts, result.payment_id, claim.claim_token, method, customerId, items, idempotencyKey)
    return { ...pending, retry_same_key: true, warning: 'E-Mail-Adresse fehlt für den Zahlungslink' }
  }

  const vatRate = storedVatPercent(created.vat_rate)
  if (vatRate == null) {
    await releaseWallee(opts, result.payment_id, claim.claim_token, method, customerId, items, idempotencyKey)
    return { ...pending, retry_same_key: true, warning: 'MwSt-Satz des Verkaufs fehlt' }
  }

  try {
    const started = await opts.startWallee?.({
      paymentId: result.payment_id,
      totalRappen: Number(created.total_rappen || result.total_rappen),
      products: created.products || [],
      customerEmail: email,
      customerName: created.customer_name || 'Kunde',
      vatRatePercent: vatRate,
    })
    if (!started?.transactionId) {
      await releaseWallee(opts, result.payment_id, claim.claim_token, method, customerId, items, idempotencyKey)
      return {
        ...pending,
        retry_same_key: true,
        warning: started?.warning || 'Online-Zahlung konnte nicht gestartet werden',
      }
    }
    await callRpc(opts.rpc, {
      ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
      p_action: 'attach_wallee',
      p_payment_id: result.payment_id,
      p_claim_token: started.transactionId,
    })
    if (started.paymentUrl && opts.sendPaymentLink) {
      try {
        await opts.sendPaymentLink({
          to: email,
          paymentUrl: started.paymentUrl,
          customerName: created.customer_name || 'Kunde',
          totalRappen: Number(created.total_rappen || result.total_rappen),
        })
      } catch {
        return {
          ...pending,
          payment_url: started.paymentUrl,
          retry_same_key: false,
          warning: 'Zahlungslink wurde erstellt, die E-Mail konnte nicht gesendet werden',
        }
      }
    }
    return { ...pending, payment_url: started.paymentUrl, retry_same_key: false }
  } catch {
    await releaseWallee(opts, result.payment_id, claim.claim_token, method, customerId, items, idempotencyKey)
    return { ...pending, retry_same_key: true, warning: 'Online-Zahlung konnte nicht gestartet werden' }
  }
}

function storedVatPercent(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const rate = Number(raw)
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return null
  return rate
}

async function releaseWallee(
  opts: Parameters<typeof executeStaffProductSale>[0],
  paymentId: string,
  token: string | null | undefined,
  method: StaffPosMethod,
  customerId: string,
  items: unknown,
  idempotencyKey: string,
) {
  if (!token) return
  await callRpc(opts.rpc, {
    ...baseArgs(opts.actor.id, method, customerId, items, idempotencyKey),
    p_action: 'release_wallee',
    p_payment_id: paymentId,
    p_claim_token: token,
  }).catch(() => undefined)
}
