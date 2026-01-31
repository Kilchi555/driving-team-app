// composables/useStudentCredits.ts - Guthaben-Management für Schüler

import { ref, readonly } from 'vue'
import type { 
  StudentCredit, 
  CreditTransaction, 
  CreditTransactionWithDetails,
  CreditDepositData,
  CreditWithdrawalData,
  CreditPaymentData
} from '~/types/studentCredits'

import { 
  chfToRappen,
  rappenToCHF,
  formatCreditAmount
} from '~/types/studentCredits'

export const useStudentCredits = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Guthaben eines Schülers laden
  const getStudentCredit = async (userId: string): Promise<StudentCredit | null> => {
    try {
      const response = await $fetch('/api/student-credits/get-credit', {
        method: 'GET',
        query: { user_id: userId }
      }) as any

      if (!response || !response.data) {
        return null
      }

      return response.data
    } catch (err: any) {
      console.error('❌ Error fetching student credit:', err)
      error.value = err.message
      return null
    }
  }

  // Guthaben für mehrere Schüler laden
  const getStudentsCredits = async (userIds: string[]): Promise<Record<string, StudentCredit>> => {
    try {
      const response = await $fetch('/api/student-credits/get-credits', {
        method: 'GET',
        query: { user_ids: userIds.join(',') }
      }) as any

      if (!response || !response.data) {
        return {}
      }

      return response.data
    } catch (err: any) {
      console.error('❌ Error fetching students credits:', err)
      error.value = err.message
      return {}
    }
  }

  // Guthaben-Einzahlung
  const depositCredit = async (depositData: CreditDepositData): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await $fetch('/api/student-credits/deposit', {
        method: 'POST',
        body: depositData
      }) as any

      if (!response || !response.data) {
        throw new Error('Failed to deposit credit')
      }

      logger.debug('✅ Credit deposit successful:', {
        userId: depositData.user_id,
        amount: depositData.amount_rappen,
        newBalance: response.data.newBalance
      })

      return true

    } catch (err: any) {
      console.error('❌ Error depositing credit:', err)
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Guthaben-Auszahlung
  const withdrawCredit = async (withdrawalData: CreditWithdrawalData): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await $fetch('/api/student-credits/withdraw', {
        method: 'POST',
        body: withdrawalData
      }) as any

      if (!response || !response.data) {
        throw new Error('Failed to withdraw credit')
      }

      logger.debug('✅ Credit withdrawal successful:', {
        userId: withdrawalData.user_id,
        amount: withdrawalData.amount_rappen,
        newBalance: response.data.newBalance
      })

      return true

    } catch (err: any) {
      console.error('❌ Error withdrawing credit:', err)
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Guthaben für Termin-Bezahlung verwenden
  const useCreditForAppointment = async (paymentData: CreditPaymentData): Promise<{
    success: boolean
    amountUsed: number
    remainingBalance: number
    remainingCost: number
    creditTransactionId?: string
  }> => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await $fetch('/api/student-credits/use-for-appointment', {
        method: 'POST',
        body: paymentData
      }) as any

      if (!response || !response.data) {
        throw new Error('Failed to use credit for appointment')
      }

      logger.debug('✅ Credit used for appointment:', {
        userId: paymentData.user_id,
        appointmentId: paymentData.appointment_id,
        amountUsed: response.data.amountUsed,
        remainingBalance: response.data.remainingBalance,
        remainingCost: response.data.remainingCost
      })

      return response.data

    } catch (err: any) {
      console.error('❌ Error using credit for appointment:', err)
      error.value = err.message
      return {
        success: false,
        amountUsed: 0,
        remainingBalance: 0,
        remainingCost: paymentData.amount_rappen,
        creditTransactionId: undefined
      }
    } finally {
      isLoading.value = false
    }
  }

  // Transaktions-Historie laden
  const getCreditTransactions = async (userId: string, limit = 50): Promise<CreditTransactionWithDetails[]> => {
    try {
      const response = await $fetch('/api/student-credits/get-transactions', {
        method: 'GET',
        query: { user_id: userId, limit: limit.toString() }
      }) as any

      if (!response || !Array.isArray(response.data)) {
        return []
      }

      return response.data
    } catch (err: any) {
      console.error('❌ Error fetching credit transactions:', err)
      error.value = err.message
      return []
    }
  }

  // Guthaben-Statistiken laden
  const getCreditStatistics = async (): Promise<{
    totalCredits: number
    totalBalance: number
    activeStudents: number
    averageBalance: number
  }> => {
    try {
      const response = await $fetch('/api/student-credits/get-statistics', {
        method: 'GET'
      }) as any

      if (!response || !response.data) {
        throw new Error('Failed to fetch statistics')
      }

      return response.data
    } catch (err: any) {
      console.error('❌ Error fetching credit statistics:', err)
      error.value = err.message
      return {
        totalCredits: 0,
        totalBalance: 0,
        activeStudents: 0,
        averageBalance: 0
      }
    }
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Methods
    getStudentCredit,
    getStudentsCredits,
    depositCredit,
    withdrawCredit,
    useCreditForAppointment,
    getCreditTransactions,
    getCreditStatistics,
    
    // Utilities
    rappenToCHF,
    chfToRappen,
    formatCreditAmount
  }
}
