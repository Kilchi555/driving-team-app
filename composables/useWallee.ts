// composables/useWallee.ts - Updated Version mit neuer DB-Struktur

import { useRuntimeConfig } from '#app'
import { usePaymentsNew } from './usePaymentsNew'
import { getSupabase } from '~/utils/supabase'
import type { 
  Payment, 
  PaymentItem, 
  CreatePaymentRequest,
  CreatePaymentItemRequest,
  Product,
  Discount 
} from '~/types/payment'

interface WalleeTransactionResult {
  success: boolean
  error: string | null
  transactionId?: string
  paymentUrl?: string
  transaction?: any
  payment?: Payment // Neue DB-Integration
}

interface WalleeConnectionResult {
  success: boolean
  error: string | null
  connected?: boolean
  spaceId?: string
}

interface WalleeTransactionRequest {
  appointmentId?: string // Optional für standalone Zahlungen
  amount: number
  currency?: string
  customerId: string
  customerEmail: string
  userId: string // Neue DB-Integration
  staffId?: string // Neue DB-Integration
  paymentMethod: 'online' // Wallee ist immer online
  products?: Product[] // Neue DB-Integration
  discounts?: Discount[] // Neue DB-Integration
  lineItems?: Array<{
    uniqueId: string
    name: string
    quantity: number
    amountIncludingTax: number
    type: string
  }>
  successUrl?: string
  failedUrl?: string
  description?: string
}

export const useWallee = () => {
  const { createPayment } = usePaymentsNew()

  // ✅ Hauptfunktion: Wallee-Transaktion mit DB-Integration
  const createTransaction = async (request: WalleeTransactionRequest): Promise<WalleeTransactionResult> => {
    try {
      logger.debug('🔄 Creating Wallee transaction with DB integration:', request)
      
      // Validierung der erforderlichen Felder
      if (!request.amount || !request.customerId || !request.customerEmail || !request.userId) {
        throw new Error('Missing required fields: amount, customerId, customerEmail, userId')
      }

      // 1. Wallee-Transaktion erstellen
      const walleeResponse = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          appointmentId: request.appointmentId,
          amount: request.amount,
          currency: request.currency || 'CHF',
          customerId: request.customerId,
          customerEmail: request.customerEmail,
          userId: request.userId,
          // tenantId wird serverseitig aus Header oder Payment abgeleitet, kann optional mitgegeben werden
          lineItems: request.lineItems || [
            {
              uniqueId: request.appointmentId ? `appointment-${request.appointmentId}` : `standalone-${Date.now()}`,
              name: request.description || 'Fahrstunde',
              quantity: 1,
              amountIncludingTax: request.amount,
              type: 'PRODUCT'
            }
          ],
          successUrl: request.successUrl,
          failedUrl: request.failedUrl
        }
      }) as any

      if (!walleeResponse.success) {
        throw new Error(walleeResponse.error || 'Wallee transaction failed')
      }

      logger.debug('✅ Wallee transaction created:', walleeResponse)

      // 2. Zahlung in der lokalen DB speichern
      const paymentItems: CreatePaymentItemRequest[] = []

      // Appointment Item hinzufügen (falls vorhanden)
      if (request.appointmentId) {
        paymentItems.push({
          item_type: 'appointment',
          item_id: request.appointmentId,
          quantity: 1,
          unit_price_rappen: Math.round(request.amount * 100), // CHF zu Rappen
          description: request.description || 'Fahrstunde'
        })
      }

      // Produkte hinzufügen
      if (request.products && request.products.length > 0) {
        request.products.forEach(product => {
          paymentItems.push({
            item_type: 'product',
            item_id: product.id,
            quantity: 1,
            unit_price_rappen: product.price_rappen,
            description: product.name
          })
        })
      }

      // Rabatte hinzufügen
      if (request.discounts && request.discounts.length > 0) {
        request.discounts.forEach(discount => {
          const discountAmount = discount.discount_type === 'percentage' 
            ? Math.round((request.amount * discount.discount_value / 100) * 100)
            : Math.round(discount.discount_value * 100)
          
          paymentItems.push({
            item_type: 'discount',
            item_id: discount.id,
            quantity: 1,
            unit_price_rappen: -discountAmount, // Negativ für Rabatte
            description: discount.name
          })
        })
      }

      // 3. Payment in der DB erstellen
      const paymentRequest: CreatePaymentRequest = {
        user_id: request.userId,
        staff_id: request.staffId,
        appointment_id: request.appointmentId,
        payment_method: 'online',
        items: paymentItems,
        description: request.description || 'Online-Zahlung via Wallee'
      }

      const dbPayment = await createPayment(paymentRequest)
      
      if (!dbPayment) {
        throw new Error('Failed to create payment in database')
      }

      logger.debug('✅ Payment saved to database:', dbPayment)

      return {
        success: true,
        transactionId: walleeResponse.transactionId,
        paymentUrl: walleeResponse.paymentUrl,
        transaction: walleeResponse.transaction,
        payment: dbPayment, // Neue DB-Integration
        error: null
      }

    } catch (error: any) {
      console.error('❌ Wallee Transaction Error:', error)
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Transaction creation failed'
      }
    }
  }

  const testConnection = async (): Promise<WalleeConnectionResult> => {
    try {
      logger.debug('🔄 Testing Wallee connection...')
      
      // Test mit einer minimalen Transaction oder Connection Check
      const testResponse = await $fetch('/api/wallee/test-connection', {
        method: 'GET'
      }) as any

      return {
        success: true,
        connected: true,
        spaceId: testResponse.spaceId,
        error: null
      }

    } catch (error: any) {
      console.error('❌ Wallee Connection Error:', error)
      
      return {
        success: false,
        connected: false,
        error: error.message || 'Connection test failed'
      }
    }
  }

  const isWalleeAvailable = (): boolean => {
    // Check if environment variables are available
    const config = useRuntimeConfig()
    return !!(config.public.walleeEnabled || process.env.WALLEE_SPACE_ID)
  }

  // Neue Utility-Funktionen
  const calculateAppointmentPrice = (category: string, duration: number, isSecondAppointment: boolean = false): number => {
    // Preise basierend auf deinen Projektdaten
    const categoryPrices: Record<string, { base: number, admin: number }> = {
      'B': { base: 95, admin: 120 },
      'A1': { base: 95, admin: 0 },
      'A35kW': { base: 95, admin: 0 },
      'A': { base: 95, admin: 0 },
      'BE': { base: 120, admin: 120 },
      'C1': { base: 150, admin: 200 },
      'D1': { base: 150, admin: 200 },
      'C': { base: 170, admin: 200 },
      'CE': { base: 200, admin: 250 },
      'D': { base: 200, admin: 300 },
      'Motorboot': { base: 95, admin: 120 },
      'BPT': { base: 100, admin: 120 }
    }

    const priceInfo = categoryPrices[category] || { base: 95, admin: 120 }
    
    // Preis pro 45min auf gewünschte Dauer umrechnen
    const lessonPrice = (priceInfo.base / 45) * duration
    
    // Versicherungspauschale ab 2. Termin (außer bei Motorrad-Kategorien)
    const adminFee = isSecondAppointment ? priceInfo.admin : 0
    
    return Math.round((lessonPrice + adminFee) * 100) / 100 // Auf 2 Dezimalstellen runden
  }

  // ✅ Termin-basierte Zahlung mit DB-Integration
  const createAppointmentPayment = async (
    appointment: any, 
    user: any, 
    isSecondAppointment: boolean = false
  ): Promise<WalleeTransactionResult> => {
    try {
      const basePrice = calculateAppointmentPrice(appointment.type, appointment.duration_minutes, isSecondAppointment)
      
      return await createTransaction({
        appointmentId: appointment.id,
        amount: basePrice,
        customerId: user.id,
        customerEmail: user.email,
        userId: user.id,
        staffId: appointment.staff_id,
        description: `Fahrstunde ${appointment.type} - ${appointment.duration_minutes}min`,
        products: [], // Können später hinzugefügt werden
        discounts: [], // Können später hinzugefügt werden
        paymentMethod: 'online' // Wallee ist immer online
      })
    } catch (error: any) {
      console.error('❌ Error creating appointment payment:', error)
      return {
        success: false,
        error: error.message || 'Failed to create appointment payment'
      }
    }
  }

  // ✅ Standalone Produktzahlung mit DB-Integration
  const createProductPayment = async (
    userId: string,
    products: Product[],
    discounts: Discount[] = [],
    staffId?: string
  ): Promise<WalleeTransactionResult> => {
    try {
      const totalAmount = products.reduce((sum, product) => sum + product.price_rappen, 0) / 100
      
      return await createTransaction({
        amount: totalAmount,
        customerId: userId,
        customerEmail: '', // Muss vom User geholt werden
        userId,
        staffId,
        description: `Produktkauf: ${products.map(p => p.name).join(', ')}`,
        products,
        discounts,
        paymentMethod: 'online' // Wallee ist immer online
      })
    } catch (error: any) {
      console.error('❌ Error creating product payment:', error)
      return {
        success: false,
        error: error.message || 'Failed to create product payment'
      }
    }
  }

  // ✅ Zahlungsstatus aktualisieren (Webhook-Integration)
  const updatePaymentStatus = async (
    paymentId: string, 
    walleeTransactionId: string, 
    status: 'completed' | 'failed' | 'pending'
  ): Promise<boolean> => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('payments')
        .update({ 
          payment_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)

      if (error) throw error

      logger.debug(`✅ Payment ${paymentId} status updated to ${status}`)
      return true
    } catch (error: any) {
      console.error('❌ Error updating payment status:', error)
      return false
    }
  }

  return {
    // Core functions
    createTransaction,
    testConnection,
    isWalleeAvailable,
    
    // Utility functions
    calculateAppointmentPrice,
    createAppointmentPayment,
    createProductPayment,
    updatePaymentStatus
  }
}