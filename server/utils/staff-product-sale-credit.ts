/**
 * Webhook credit for metadata.source = staff_product_sale.
 * Credits once through staff_pos_sale(apply_credit). No product_sales path.
 */
import { logger } from '~/utils/logger'
import { webhookMayCredit } from '~/server/utils/staff-product-sale'

export async function applyStaffProductSaleCredits(
  supabase: { rpc: Function },
  payments: any[],
  resolvedStatus?: string | null,
): Promise<string[]> {
  const failedIds: string[] = []
  for (const payment of payments || []) {
    if (!webhookMayCredit(payment, resolvedStatus)) continue
    try {
      const { data, error } = await supabase.rpc('staff_pos_sale', {
        p_actor_user_id: null,
        p_customer_id: null,
        p_items: [],
        p_idempotency_key: null,
        p_method: null,
        p_action: 'apply_credit',
        p_payment_id: payment.id,
        p_claim_token: null,
      })
      if (error || data?.ok !== true) {
        failedIds.push(payment.id)
        logger.warn('⚠️ Staff product sale credit failed:', error?.message || data)
        continue
      }
      logger.info('✅ Staff product sale credit', {
        paymentId: payment.id,
        tenantId: payment.tenant_id,
        replayed: data?.replayed === true,
        creditApplied: data?.credit_applied === true,
      })
    } catch (err: any) {
      failedIds.push(payment.id)
      logger.warn('⚠️ Staff product sale credit failed:', err?.message || err)
    }
  }
  return failedIds
}
