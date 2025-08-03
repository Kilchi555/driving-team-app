// composables/useWallee.ts - Updated Version

import { useRuntimeConfig } from '#app'

interface WalleeTransactionResult {
  success: boolean
  error: string | null
  transactionId?: string
  paymentUrl?: string
  transaction?: any
}

interface WalleeConnectionResult {
  success: boolean
  error: string | null
  connected?: boolean
  spaceId?: string
}

interface WalleeTransactionRequest {
  appointmentId: string
  amount: number
  currency?: string
  customerId: string
  customerEmail: string
  lineItems?: Array<{
    uniqueId: string
    name: string
    quantity: number
    amountIncludingTax: number
    type: string
  }>
  successUrl?: string
  failedUrl?: string
}

export const useWallee = () => {
  const createTransaction = async (request: WalleeTransactionRequest): Promise<WalleeTransactionResult> => {
    try {
      console.log('🔄 Creating Wallee transaction:', request)
      
      // Validierung der erforderlichen Felder
      if (!request.appointmentId || !request.amount || !request.customerId || !request.customerEmail) {
        throw new Error('Missing required fields: appointmentId, amount, customerId, customerEmail')
      }

      // API Call zu deiner Wallee Route
const response = await $fetch('/api/mock/create-transaction', {
        method: 'POST',
        body: {
          appointmentId: request.appointmentId,
          amount: request.amount,
          currency: request.currency || 'CHF',
          customerId: request.customerId,
          customerEmail: request.customerEmail,
          lineItems: request.lineItems || [
            {
              uniqueId: `appointment-${request.appointmentId}`,
              name: 'Fahrstunde',
              quantity: 1,
              amountIncludingTax: request.amount,
              type: 'PRODUCT'
            }
          ],
          successUrl: request.successUrl,
          failedUrl: request.failedUrl
        }
      })  as any

      console.log('✅ Wallee transaction created successfully:', response)

      return {
        success: true,
        transactionId: response.transactionId,
        paymentUrl: response.paymentUrl,
        transaction: response.transaction,
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
      console.log('🔄 Testing Wallee connection...')
      
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

  const createAppointmentPayment = async (
    appointment: any, 
    user: any, 
    isSecondAppointment: boolean = false
  ): Promise<WalleeTransactionResult> => {
    const amount = calculateAppointmentPrice(
      appointment.type || 'B', 
      appointment.duration_minutes || 45, 
      isSecondAppointment
    )

    return await createTransaction({
      appointmentId: appointment.id,
      amount: amount,
      currency: 'CHF',
      customerId: user.id,
      customerEmail: user.email,
      lineItems: [
        {
          uniqueId: `appointment-${appointment.id}`,
          name: `Fahrstunde ${appointment.type || 'B'} (${appointment.duration_minutes || 45}min)`,
          quantity: 1,
          amountIncludingTax: amount,
          type: 'PRODUCT'
        }
      ]
    })
  }

  return {
    // Core functions
    createTransaction,
    testConnection,
    isWalleeAvailable,
    
    // Utility functions
    calculateAppointmentPrice,
    createAppointmentPayment
  }
}