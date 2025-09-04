// server/api/wallee/create-anonymous-transaction.post.ts
// ✅ WALLEE API für anonyme Verkäufe

import { getSupabase } from '~/utils/supabase'

interface AnonymousSaleRequest {
  amount: number
  currency: string
  customer_name: string
  customer_email?: string | null
  sale_id: string
  items: Array<{
    name: string
    quantity: number
    price_rappen: number
  }>
}

export default defineEventHandler(async (event) => {
  try {
    console.log('🔄 Creating anonymous sale transaction...')
    
    const body = await readBody(event) as AnonymousSaleRequest
    console.log('📨 Request body:', JSON.stringify(body, null, 2))
    
    // Validate request
    if (!body.amount || !body.currency || !body.sale_id || !body.items || body.items.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request: missing required fields'
      })
    }
    
    const supabase = getSupabase()
    
    // Verify the anonymous sale exists
    const { data: sale, error: saleError } = await supabase
      .from('product_sales')
      .select('id, status, metadata')
      .eq('id', body.sale_id)
      .is('user_id', null)
      .single()
    
    if (saleError || !sale) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Anonymous sale not found'
      })
    }
    
    if (sale.status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Sale is not in pending status'
      })
    }
    
    console.log('✅ Anonymous sale verified:', sale.id)
    
    // Create Wallee transaction
    // TODO: Implement actual Wallee API call
    // For now, we'll simulate the response
    
    const mockTransactionId = `wallee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const mockPaymentUrl = `https://app-wallee.com/payment/${mockTransactionId}`
    
    // Update the sale with Wallee transaction ID
    const { error: updateError } = await supabase
      .from('product_sales')
      .update({
        wallee_transaction_id: mockTransactionId,
        wallee_transaction_state: 'PENDING',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.sale_id)
    
    if (updateError) {
      console.error('❌ Error updating sale with transaction ID:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update sale'
      })
    }
    
    console.log('✅ Sale updated with Wallee transaction ID:', mockTransactionId)
    
    // Return success response
    return {
      success: true,
      transaction_id: mockTransactionId,
      payment_url: mockPaymentUrl,
      amount: body.amount,
      currency: body.currency,
      sale_id: body.sale_id
    }
    
  } catch (error: any) {
    console.error('❌ Error creating anonymous sale transaction:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message}`
    })
  }
})
