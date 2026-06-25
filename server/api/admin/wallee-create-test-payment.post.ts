/**
 * POST /api/admin/wallee-create-test-payment
 *
 * Super-admin only. Creates a minimal CHF 1.00 test transaction in Wallee
 * using the tenant's currently active credentials (test or production,
 * depending on wallee_test_mode). Use this to verify the full payment flow
 * end-to-end without involving real customers.
 *
 * Returns the Wallee payment page URL, the space ID used, and a payments record ID
 * so the super-admin can complete the payment and verify the webhook fires correctly.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeTestConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { Wallee } from 'wallee'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id, amount = 1.00 } = await readBody(event)
  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  const supabase = getSupabaseAdmin()

  // Load tenant info
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, wallee_test_mode, wallee_space_id')
    .eq('id', tenant_id)
    .single()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })
  }

  // Always use TEST credentials directly — test payments never affect production,
  // regardless of whether wallee_test_mode is on or off.
  const walleeConfig = await getWalleeTestConfigForTenant(tenant_id)
  if (!walleeConfig) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Keine Test-Credentials konfiguriert. Bitte zuerst Test-Credentials im Test-Modus Bereich speichern.',
    })
  }

  const isTestMode = true // test payment always uses test space
  const { spaceId } = walleeConfig
  const sdkConfig = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)

  // Create a payment record so the webhook can process it and we have an audit trail
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      tenant_id,
      total_amount_rappen: Math.round(amount * 100),
      payment_status: 'pending',
      payment_method: 'wallee',
      payment_provider: 'wallee',
      description: `[SUPER-ADMIN TEST] Wallee ${isTestMode ? 'Test-Space' : 'Prod-Space'} verification`,
      metadata: {
        super_admin_test: true,
        test_mode: isTestMode,
        wallee_space_id: spaceId,
        created_by: authUser.id,
      },
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    throw createError({ statusCode: 500, statusMessage: `Payment-Record konnte nicht erstellt werden: ${paymentError?.message}` })
  }

  // Create Wallee transaction
  const transactionService = new Wallee.api.TransactionService(sdkConfig)
  const paymentPageService  = new Wallee.api.TransactionPaymentPageService(sdkConfig)

  const baseUrl = 'https://app.simy.ch'
  const transactionCreate: Wallee.model.TransactionCreate = {
    lineItems: [{
      name: `Super-Admin Test (${tenant.name})`,
      quantity: 1,
      amountIncludingTax: amount,
      type: Wallee.model.LineItemType.PRODUCT,
      uniqueId: 'test-item-1',
      taxRate: 0,
    }],
    currency: 'CHF',
    autoConfirmationEnabled: true,
    chargeRetryEnabled: false,
    customersEmailAddress: authUser.email || 'superadmin@simy.ch',
    customerId: `superadmin-test-${tenant_id}`,
    merchantReference: `sa-test-${payment.id}`.substring(0, 100),
    successUrl: `${baseUrl}/payment/success?transaction_id=${payment.id}`,
    failedUrl:  `${baseUrl}/payment/failed?transaction_id=${payment.id}`,
    spaceViewId: null,
    shippingAddress: null,
    billingAddress: null,
    deviceSessionIdentifier: null,
  }

  let createdTransaction: any
  try {
    createdTransaction = await transactionService.create(spaceId, transactionCreate)
  } catch (walleeErr: any) {
    // Clean up the test payment record on failure
    await supabase.from('payments').delete().eq('id', payment.id)
    logger.error('❌ [wallee-test-payment] Wallee API error:', walleeErr?.message)
    throw createError({ statusCode: 502, statusMessage: `Wallee-Fehler: ${walleeErr?.message || 'Unbekannter Fehler'}` })
  }

  const transactionId = createdTransaction?.body?.id ?? createdTransaction?.id
  if (!transactionId) {
    await supabase.from('payments').delete().eq('id', payment.id)
    throw createError({ statusCode: 500, statusMessage: 'Wallee-Transaktion konnte nicht erstellt werden' })
  }

  // Store transaction ID on payment record
  await supabase
    .from('payments')
    .update({ wallee_transaction_id: String(transactionId), wallee_space_id: spaceId })
    .eq('id', payment.id)

  // Get payment page URL
  const urlResponse = await paymentPageService.paymentPageUrl(spaceId, transactionId)
  const paymentUrl: string = (urlResponse as any)?.body || String(urlResponse)

  logger.info(`✅ [wallee-test-payment] Created test transaction for tenant ${tenant.name} in space ${spaceId} (${isTestMode ? 'TEST MODE' : 'PRODUCTION'})`)

  return {
    success: true,
    paymentUrl,
    transactionId: String(transactionId),
    paymentId: payment.id,
    spaceId,
    isTestMode,
    tenantName: tenant.name,
    amount,
    message: `Test-Transaktion in ${isTestMode ? `Test-Space (${spaceId})` : `Produktions-Space (${spaceId})`} erstellt`,
  }
})
