// utils/paymentService.ts
// ✅ Einheitlicher Payment Service für alle Payment-Operationen

import { getSupabase } from './supabase'

export interface PaymentRequest {
  appointmentId?: string
  userId: string
  staffId?: string
  amount: number
  currency?: string
  customerEmail: string
  customerName?: string
  description?: string
  paymentMethod: 'wallee' | 'cash' | 'invoice'
  products?: Array<{
    id: string
    name: string
    quantity: number
    price_rappen: number
  }>
  discounts?: Array<{
    id: string
    name: string
    discount_amount_rappen: number
  }>
  successUrl?: string
  failedUrl?: string
}

export interface PaymentResult {
  success: boolean
  paymentId?: string
  transactionId?: string
  paymentUrl?: string
  error?: string
  message?: string
}

export interface PaymentRecord {
  id: string
  appointment_id?: string
  user_id: string
  staff_id?: string
  lesson_price_rappen: number
  products_price_rappen: number
  discount_amount_rappen: number
  subtotal_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  wallee_transaction_id?: string
  description?: string
  metadata?: any
  created_at: string
  updated_at: string
}

export class PaymentService {
  private supabase = getSupabase()

  /**
   * Erstellt eine neue Zahlung (alle Methoden)
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      console.log('💳 Creating payment:', request)

      // 1. Payment Record in DB erstellen
      const paymentRecord = await this.createPaymentRecord(request)
      
      // 2. Je nach Zahlungsmethode verarbeiten
      switch (request.paymentMethod) {
        case 'wallee':
          return await this.processWalleePayment(paymentRecord, request)
        case 'cash':
          return await this.processCashPayment(paymentRecord)
        case 'invoice':
          return await this.processInvoicePayment(paymentRecord)
        default:
          throw new Error(`Unbekannte Zahlungsmethode: ${request.paymentMethod}`)
      }

    } catch (error: any) {
      console.error('❌ Payment creation failed:', error)
      return {
        success: false,
        error: error.message || 'Zahlung konnte nicht erstellt werden'
      }
    }
  }

  /**
   * Erstellt einen Payment Record in der Datenbank
   */
  private async createPaymentRecord(request: PaymentRequest): Promise<PaymentRecord> {
    const now = new Date().toISOString()
    
    // Berechne Preise
    const lessonPriceRappen = request.amount * 100 // CHF zu Rappen
    const productsPriceRappen = (request.products || []).reduce((sum, p) => sum + (p.price_rappen * p.quantity), 0)
    const discountAmountRappen = (request.discounts || []).reduce((sum, d) => sum + d.discount_amount_rappen, 0)
    const subtotalRappen = lessonPriceRappen + productsPriceRappen
    const totalAmountRappen = subtotalRappen - discountAmountRappen
    
    const paymentData = {
      appointment_id: request.appointmentId,
      user_id: request.userId,
      staff_id: request.staffId,
      // ✅ Neue Spalten (Hauptstruktur)
      lesson_price_rappen: lessonPriceRappen,
      products_price_rappen: productsPriceRappen,
      discount_amount_rappen: discountAmountRappen,
      subtotal_rappen: subtotalRappen,
      total_amount_rappen: totalAmountRappen,
      // ✅ Alte Spalten (für Kompatibilität)
      amount_rappen: lessonPriceRappen,
      admin_fee_rappen: 0, // Wird aus lesson_price_rappen berechnet
      payment_method: request.paymentMethod,
      payment_status: 'pending',
      currency: 'CHF',
      description: request.description || 'Fahrlektion',
      metadata: {
        products: request.products,
        discounts: request.discounts,
        customer_name: request.customerName,
        customer_email: request.customerEmail
      },
      created_at: now,
      updated_at: now
    }

    const { data, error } = await this.supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Payment record created:', data.id)
    return data
  }

  /**
   * Verarbeitet Wallee Online-Zahlung
   */
  private async processWalleePayment(paymentRecord: PaymentRecord, request: PaymentRequest): Promise<PaymentResult> {
    try {
      console.log('🔄 Processing Wallee payment...')

      const walleeData = {
        orderId: paymentRecord.id,
        amount: request.amount,
        currency: request.currency || 'CHF',
        customerEmail: request.customerEmail,
        customerName: request.customerName,
        description: request.description || 'Fahrlektion',
        successUrl: request.successUrl || `${window.location.origin}/payment/success`,
        failedUrl: request.failedUrl || `${window.location.origin}/payment/failed`
      }

      const response = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: walleeData
      })

      if (response.success && response.paymentUrl) {
        // Update payment record with Wallee transaction ID
        await this.updatePaymentWithWalleeId(paymentRecord.id, response.transactionId)
        
        return {
          success: true,
          paymentId: paymentRecord.id,
          transactionId: response.transactionId,
          paymentUrl: response.paymentUrl,
          message: 'Wallee-Zahlung erfolgreich erstellt'
        }
      } else {
        throw new Error('Wallee-Zahlung konnte nicht erstellt werden')
      }

    } catch (error: any) {
      console.error('❌ Wallee payment failed:', error)
      
      // Update payment status to failed
      await this.updatePaymentStatus(paymentRecord.id, 'failed')
      
      return {
        success: false,
        error: `Wallee-Fehler: ${error.message}`,
        paymentId: paymentRecord.id
      }
    }
  }

  /**
   * Verarbeitet Barzahlung (nur Zahlungsmethode speichern, nicht als bezahlt markieren)
   */
  private async processCashPayment(paymentRecord: PaymentRecord): Promise<PaymentResult> {
    try {
      console.log('💰 Processing cash payment method...')

      // WICHTIG: Payment bleibt auf 'pending' - wird erst nach Bewertung bestätigt
      // Nur die Zahlungsmethode wird gespeichert
      
      // Appointment wird NICHT als bezahlt markiert
      // Das passiert erst nach der Bewertung, wenn der Fahrlehrer bestätigt

      return {
        success: true,
        paymentId: paymentRecord.id,
        message: 'Barzahlung als Zahlungsmethode gespeichert - Zahlung wird nach Bewertung bestätigt'
      }

    } catch (error: any) {
      console.error('❌ Cash payment method failed:', error)
      return {
        success: false,
        error: `Barzahlung-Methode-Fehler: ${error.message}`,
        paymentId: paymentRecord.id
      }
    }
  }

  /**
   * Verarbeitet Rechnungszahlung
   */
  private async processInvoicePayment(paymentRecord: PaymentRecord): Promise<PaymentResult> {
    try {
      console.log('📄 Processing invoice payment...')

      // Update payment status to pending (waiting for payment)
      await this.updatePaymentStatus(paymentRecord.id, 'pending')

      // Update appointment if exists
      if (paymentRecord.appointment_id) {
        await this.updateAppointmentPaymentStatus(paymentRecord.appointment_id, 'pending')
      }

      return {
        success: true,
        paymentId: paymentRecord.id,
        message: 'Rechnung erfolgreich erstellt'
      }

    } catch (error: any) {
      console.error('❌ Invoice payment failed:', error)
      return {
        success: false,
        error: `Rechnungs-Fehler: ${error.message}`,
        paymentId: paymentRecord.id
      }
    }
  }

  /**
   * Aktualisiert Payment mit Wallee Transaction ID
   */
  private async updatePaymentWithWalleeId(paymentId: string, walleeTransactionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('payments')
      .update({
        wallee_transaction_id: walleeTransactionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (error) throw error
    console.log('✅ Payment updated with Wallee transaction ID')
  }

  /**
   * Aktualisiert Payment Status
   */
  private async updatePaymentStatus(paymentId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('payments')
      .update({
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (error) throw error
    console.log('✅ Payment status updated to:', status)
  }

  /**
   * Aktualisiert Appointment Payment Status
   */
  private async updateAppointmentPaymentStatus(appointmentId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('appointments')
      .update({
        payment_status: status,
        is_paid: status === 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (error) throw error
    console.log('✅ Appointment payment status updated to:', status)
  }

  /**
   * Holt Payment Details
   */
  async getPaymentDetails(paymentId: string): Promise<PaymentRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()

      if (error) throw error
      return data

    } catch (error: any) {
      console.error('❌ Error fetching payment details:', error)
      return null
    }
  }

  /**
   * Holt alle Payments für einen User
   */
  async getUserPayments(userId: string): Promise<PaymentRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error: any) {
      console.error('❌ Error fetching user payments:', error)
      return []
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService()
