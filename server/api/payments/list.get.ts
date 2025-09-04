// server/api/payments/list.get.ts
// ✅ Payment List API für Abfragen

import { getSupabase } from '~/utils/supabase'

interface PaymentListQuery {
  userId?: string
  staffId?: string
  status?: string
  method?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

interface PaymentListResponse {
  success: boolean
  payments: any[]
  total: number
  error?: string
}

export default defineEventHandler(async (event): Promise<PaymentListResponse> => {
  try {
    console.log('📋 Payment List API called')
    
    const query = getQuery(event) as PaymentListQuery
    console.log('🔍 Query parameters:', query)
    
    const supabase = getSupabase()
    
    // Base query
    let queryBuilder = supabase
      .from('payments')
      .select(`
        id,
        created_at,
        updated_at,
        appointment_id,
        user_id,
        staff_id,
        lesson_price_rappen,
        admin_fee_rappen,
        products_price_rappen,
        discount_amount_rappen,
        total_amount_rappen,
        payment_method,
        payment_status,
        paid_at,
        description,
        metadata
      `, { count: 'exact' })

    // Apply filters
    if (query.userId) {
      queryBuilder = queryBuilder.eq('user_id', query.userId)
    }
    
    if (query.staffId) {
      queryBuilder = queryBuilder.eq('staff_id', query.staffId)
    }
    
    if (query.status) {
      queryBuilder = queryBuilder.eq('payment_status', query.status)
    }
    
    if (query.method) {
      queryBuilder = queryBuilder.eq('payment_method', query.method)
    }
    
    if (query.startDate) {
      queryBuilder = queryBuilder.gte('created_at', query.startDate)
    }
    
    if (query.endDate) {
      queryBuilder = queryBuilder.lte('created_at', query.endDate)
    }

    // Apply pagination
    const limit = Math.min(parseInt(query.limit as string) || 50, 100) // Max 100
    const offset = parseInt(query.offset as string) || 0
    
    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Execute query
    const { data: payments, error, count } = await queryBuilder

    if (error) throw error

    console.log(`✅ Found ${payments?.length || 0} payments`)

    return {
      success: true,
      payments: payments || [],
      total: count || 0
    }

  } catch (error: any) {
    console.error('❌ Payment list API error:', error)
    
    return {
      success: false,
      payments: [],
      total: 0,
      error: error.message || 'Payments could not be retrieved'
    }
  }
})
