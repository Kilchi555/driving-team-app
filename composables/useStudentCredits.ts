// composables/useStudentCredits.ts - Guthaben-Management für Schüler

import { getSupabase } from '~/utils/supabase'
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
      const supabase = getSupabase()
      
      // Get current user's tenant_id first
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      
      const tenantId = userProfile?.tenant_id
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }
      
      // Verwende .maybeSingle() statt .single() um 406 Fehler zu vermeiden - FILTERED BY TENANT
      const { data, error: fetchError } = await supabase
        .from('student_credits')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (fetchError) {
        console.error('❌ Error fetching student credit:', fetchError)
        error.value = fetchError.message
        return null
      }

      return data
    } catch (err: any) {
      console.error('❌ Error fetching student credit:', err)
      error.value = err.message
      return null
    }
  }

  // Guthaben für mehrere Schüler laden
  const getStudentsCredits = async (userIds: string[]): Promise<Record<string, StudentCredit>> => {
    try {
      const supabase = getSupabase()
      
      // Get current user's tenant_id first
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      
      const tenantId = userProfile?.tenant_id
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }
      
      const { data, error: fetchError } = await supabase
        .from('student_credits')
        .select('*')
        .in('user_id', userIds)
        .eq('tenant_id', tenantId)

      if (fetchError) throw fetchError

      const creditsMap: Record<string, StudentCredit> = {}
      data?.forEach(credit => {
        creditsMap[credit.user_id] = credit
      })

      return creditsMap
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
      
      const supabase = getSupabase()
      const currentUser = supabase.auth.getUser()
      
      if (!currentUser) {
        throw new Error('Nicht eingeloggt')
      }

      // Aktuelles Guthaben laden
      const currentCredit = await getStudentCredit(depositData.user_id)
      const currentBalance = currentCredit?.balance_rappen || 0
      const newBalance = currentBalance + depositData.amount_rappen

      try {
        // Guthaben aktualisieren oder erstellen
        if (currentCredit) {
          const { error: updateError } = await supabase
            .from('student_credits')
            .update({ 
              balance_rappen: newBalance,
              notes: depositData.notes || 'Guthaben-Einzahlung'
            })
            .eq('user_id', depositData.user_id)

          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase
            .from('student_credits')
            .insert([{
              user_id: depositData.user_id,
              balance_rappen: newBalance,
              notes: depositData.notes || 'Erste Guthaben-Einzahlung'
            }])

          if (insertError) throw insertError
        }

        // Transaktion in Historie eintragen
        const { error: historyError } = await supabase
          .from('credit_transactions')
          .insert([{
            user_id: depositData.user_id,
            transaction_type: 'deposit',
            amount_rappen: depositData.amount_rappen,
            balance_before_rappen: currentBalance,
            balance_after_rappen: newBalance,
            payment_method: depositData.payment_method,
            reference_type: 'manual',
            created_by: (await currentUser).data.user?.id,
            notes: depositData.notes || 'Guthaben-Einzahlung'
          }])

        if (historyError) throw historyError

        console.log('✅ Credit deposit successful:', {
          userId: depositData.user_id,
          amount: depositData.amount_rappen,
          newBalance
        })

        return true

      } catch (err) {
        console.error('❌ Error during deposit:', err)
        throw err
      }

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
      
      const supabase = getSupabase()
      const currentUser = supabase.auth.getUser()
      
      if (!currentUser) {
        throw new Error('Nicht eingeloggt')
      }

      // Aktuelles Guthaben laden
      const currentCredit = await getStudentCredit(withdrawalData.user_id)
      if (!currentCredit || currentCredit.balance_rappen < withdrawalData.amount_rappen) {
        throw new Error('Nicht genügend Guthaben vorhanden')
      }

      const currentBalance = currentCredit.balance_rappen
      const newBalance = currentBalance - withdrawalData.amount_rappen

      // Transaktion starten
      const { error: transactionError } = await supabase.rpc('begin_transaction')
      if (transactionError) throw transactionError

      try {
        // Guthaben aktualisieren
        const { error: updateError } = await supabase
          .from('student_credits')
          .update({ 
            balance_rappen: newBalance,
            notes: `Auszahlung: ${withdrawalData.reason}`
          })
          .eq('user_id', withdrawalData.user_id)

        if (updateError) throw updateError

        // Transaktion in Historie eintragen
        const { error: historyError } = await supabase
          .from('credit_transactions')
          .insert([{
            user_id: withdrawalData.user_id,
            transaction_type: 'withdrawal',
            amount_rappen: -withdrawalData.amount_rappen, // Negativ für Auszahlungen
            balance_before_rappen: currentBalance,
            balance_after_rappen: newBalance,
            payment_method: 'credit',
            reference_type: 'manual',
            created_by: (await currentUser).data.user?.id,
            notes: `Auszahlung: ${withdrawalData.reason}`
          }])

        if (historyError) throw historyError

        console.log('✅ Credit withdrawal successful:', {
          userId: withdrawalData.user_id,
          amount: withdrawalData.amount_rappen,
          newBalance
        })

        return true

      } catch (err) {
        console.error('❌ Error during withdrawal:', err)
        throw err
      }

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
      
      const supabase = getSupabase()
      const currentUser = supabase.auth.getUser()
      
      if (!currentUser) {
        throw new Error('Nicht eingeloggt')
      }

      // Aktuelles Guthaben laden
      const currentCredit = await getStudentCredit(paymentData.user_id)
      if (!currentCredit || currentCredit.balance_rappen <= 0) {
        return {
          success: false,
          amountUsed: 0,
          remainingBalance: 0,
          remainingCost: paymentData.amount_rappen,
          creditTransactionId: undefined
        }
      }

      // Verfügbares Guthaben für diesen Termin
      const availableCredit = Math.min(currentCredit.balance_rappen, paymentData.amount_rappen)
      const newBalance = currentCredit.balance_rappen - availableCredit
      const remainingCost = paymentData.amount_rappen - availableCredit

      try {
        // Guthaben aktualisieren
        const { error: updateError } = await supabase
          .from('student_credits')
          .update({ 
            balance_rappen: newBalance,
            notes: `Verwendet für Termin ${paymentData.appointment_id}`
          })
          .eq('user_id', paymentData.user_id)

        if (updateError) throw updateError

        // Transaktion in Historie eintragen
        const { data: creditTransaction, error: historyError } = await supabase
          .from('credit_transactions')
          .insert([{
            user_id: paymentData.user_id,
            transaction_type: 'appointment_payment',
            amount_rappen: -availableCredit, // Negativ für Verwendung
            balance_before_rappen: currentCredit.balance_rappen,
            balance_after_rappen: newBalance,
            payment_method: 'credit',
            reference_id: paymentData.appointment_id,
            reference_type: 'appointment',
            created_by: (await currentUser).data.user?.id,
            notes: paymentData.notes || 'Guthaben für Termin verwendet'
          }])
          .select('id')
          .single()

        if (historyError) throw historyError

        console.log('✅ Credit used for appointment:', {
          userId: paymentData.user_id,
          appointmentId: paymentData.appointment_id,
          amountUsed: availableCredit,
          remainingBalance: newBalance,
          remainingCost
        })

        return {
          success: true,
          amountUsed: availableCredit,
          remainingBalance: newBalance,
          remainingCost,
          creditTransactionId: creditTransaction?.id
        }

      } catch (err) {
        console.error('❌ Error during credit usage:', err)
        throw err
      }

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
      const supabase = getSupabase()
      
      // Get current user's tenant_id first
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      
      const tenantId = userProfile?.tenant_id
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }
      
      const { data, error: fetchError } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          user:users!credit_transactions_user_id_fkey (
            first_name,
            last_name,
            email
          ),
          created_by_user:users!credit_transactions_created_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      return data || []
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
      const supabase = getSupabase()
      
      // Get current user's tenant_id first
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      
      const tenantId = userProfile?.tenant_id
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }
      
      const { data, error: fetchError } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('tenant_id', tenantId)

      if (fetchError) throw fetchError

      const totalBalance = data?.reduce((sum, credit) => sum + credit.balance_rappen, 0) || 0
      const activeStudents = data?.filter(credit => credit.balance_rappen > 0).length || 0
      const averageBalance = data && data.length > 0 ? totalBalance / data.length : 0

      return {
        totalCredits: data?.length || 0,
        totalBalance,
        activeStudents,
        averageBalance
      }
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
