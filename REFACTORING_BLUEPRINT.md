// REFACTORING BLUEPRINT: usePayments.ts
// =====================================
// Migrate from direct Supabase queries to secure API endpoints

/**
 * BEFORE (UNSICHER - Direct DB Query):
 */
const createPaymentRecord = async (data: Partial<Payment>): Promise<Payment> => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return payment
  } catch (error) {
    console.error('Error creating payment record:', error)
    throw error
  }
}

/**
 * AFTER (SICHER - API Endpoint):
 */
const createPaymentRecord = async (data: Partial<Payment>): Promise<Payment> => {
  try {
    const response = await $fetch('/api/staff/create-payment', {
      method: 'POST',
      body: data
    }) as any
    
    if (!response?.data) {
      throw new Error('Invalid response from server')
    }
    
    return response.data
  } catch (error: any) {
    console.error('Error creating payment record:', error)
    throw error
  }
}

/**
 * BENÖTIGTE NEUE ENDPOINTS:
 * 1. POST /api/staff/create-payment.post.ts - Create payment record
 * 2. PUT /api/staff/update-payment.post.ts - Already exists, verify it's used
 * 3. POST /api/staff/add-payment-items.post.ts - Add items to payment
 */

/**
 * ALLGEMEINES REFACTORING PATTERN:
 * 
 * 1. Identifiziere alle .from().insert/update/delete Calls
 * 2. Erstelle einen neuen Backend-Endpoint für diese Operation
 * 3. Ersetze den direkten Supabase Call mit $fetch zum Endpoint
 * 4. Füge Server-seitige Validierung, Auth, und Logging hinzu
 * 5. Teste und verifiziere Funktionalität
 */
