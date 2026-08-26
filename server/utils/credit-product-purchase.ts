import { logger } from '~/utils/logger'

type CreditProductRow = {
  id: string
  name?: string | null
  is_credit_product?: boolean | null
  credit_amount_rappen?: number | null
}

/**
 * Credits a customer's wallet for credit/Abo products on a completed POS sale.
 * Safe to call with empty items. Does not throw — returns applied amount + warnings.
 */
export async function applyCreditProductsForCompletedSale(opts: {
  supabase: any
  userId: string
  tenantId: string
  saleId: string
  items: { product_id: string; quantity: number; product_name?: string }[]
}): Promise<{ applied_rappen: number; warnings: string[] }> {
  const { supabase, userId, tenantId, saleId, items } = opts
  const warnings: string[] = []
  let appliedRappen = 0

  const { data: existingTx } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('reference_id', saleId)
    .eq('reference_type', 'product_sale')
    .eq('transaction_type', 'credit_product_purchase')
    .limit(1)
    .maybeSingle()

  if (existingTx) {
    logger.debug(`ℹ️ POS credit already applied for sale=${saleId}`)
    return { applied_rappen: 0, warnings }
  }

  const qtyByProduct = new Map<string, number>()
  for (const item of items) {
    if (!item.product_id || !item.quantity) continue
    qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) || 0) + item.quantity)
  }
  if (qtyByProduct.size === 0) return { applied_rappen: 0, warnings }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, is_credit_product, credit_amount_rappen')
    .in('id', Array.from(qtyByProduct.keys()))
    .eq('tenant_id', tenantId)

  if (productsError) {
    logger.warn('⚠️ Could not load products for POS credit apply:', productsError.message)
    return { applied_rappen: 0, warnings: ['Guthaben konnte nicht automatisch gutgeschrieben werden.'] }
  }

  const creditProducts = ((products || []) as CreditProductRow[]).filter(
    (p) => p.is_credit_product && (p.credit_amount_rappen || 0) > 0
  )
  if (creditProducts.length === 0) return { applied_rappen: 0, warnings }

  for (const product of creditProducts) {
    const quantity = qtyByProduct.get(product.id) || 0
    const amountRappen = (product.credit_amount_rappen || 0) * quantity
    if (amountRappen <= 0) continue

    try {
      const { data: currentCredit } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      const currentBalance = currentCredit?.balance_rappen || 0
      const newBalance = currentBalance + amountRappen

      const { error: creditError } = await supabase
        .from('student_credits')
        .upsert({
          user_id: userId,
          tenant_id: tenantId,
          balance_rappen: newBalance,
          notes: `Guthaben aus Verkauf ${product.name || product.id}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,tenant_id' })

      if (creditError) throw creditError

      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          transaction_type: 'credit_product_purchase',
          amount_rappen: amountRappen,
          balance_before_rappen: currentBalance,
          balance_after_rappen: newBalance,
          reference_id: saleId,
          reference_type: 'product_sale',
          notes: `Credit from ${product.name || 'Produkt'}`
        })

      if (txError) throw txError

      appliedRappen += amountRappen
      logger.info(`✅ POS credit applied: sale=${saleId} product=${product.id} amount=${amountRappen}`)
    } catch (err: any) {
      logger.warn('⚠️ POS credit apply failed:', err?.message || err)
      warnings.push(`Guthaben für «${product.name || 'Produkt'}» konnte nicht gutgeschrieben werden.`)
    }
  }

  return { applied_rappen: appliedRappen, warnings }
}
