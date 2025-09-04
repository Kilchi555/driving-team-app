// types/studentCredits.ts - Types für das Schüler-Guthaben-System

export interface StudentCredit {
  id: string
  user_id: string
  balance_rappen: number
  created_at: string
  updated_at: string
  notes?: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  transaction_type: 'deposit' | 'withdrawal' | 'appointment_payment' | 'refund' | 'cancellation'
  amount_rappen: number
  balance_before_rappen: number
  balance_after_rappen: number
  payment_method?: 'cash' | 'online' | 'invoice' | 'credit'
  reference_id?: string
  reference_type?: 'appointment' | 'invoice' | 'manual'
  created_by: string
  created_at: string
  notes?: string
}

export interface CreditTransactionWithDetails extends CreditTransaction {
  user?: {
    first_name: string
    last_name: string
    email: string
  }
  created_by_user?: {
    first_name: string
    last_name: string
  }
  reference_details?: {
    title?: string
    amount?: number
    date?: string
  }
}

export interface CreditDepositData {
  user_id: string
  amount_rappen: number
  payment_method: 'cash' | 'online' | 'invoice'
  notes?: string
}

export interface CreditWithdrawalData {
  user_id: string
  amount_rappen: number
  reason: string
  notes?: string
}

export interface CreditPaymentData {
  user_id: string
  appointment_id: string
  amount_rappen: number
  notes?: string
}

// Hilfsfunktionen für Beträge
export const rappenToCHF = (rappen: number): number => rappen / 100
export const chfToRappen = (chf: number): number => Math.round(chf * 100)

// Formatierung für Anzeige
export const formatCreditAmount = (rappen: number): string => {
  const chf = rappenToCHF(rappen)
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(chf)
}

// Validierung
export const isValidCreditAmount = (amount: number): boolean => {
  return amount > 0 && Number.isInteger(amount)
}

export const getTransactionTypeText = (type: CreditTransaction['transaction_type']): string => {
  const typeMap = {
    deposit: 'Einzahlung',
    withdrawal: 'Auszahlung',
    appointment_payment: 'Termin-Bezahlung',
    refund: 'Rückerstattung',
    cancellation: 'Stornierung'
  }
  return typeMap[type] || type
}

export const getTransactionTypeClass = (type: CreditTransaction['transaction_type']): string => {
  const classMap = {
    deposit: 'text-green-600 bg-green-100',
    withdrawal: 'text-red-600 bg-red-100',
    appointment_payment: 'text-blue-600 bg-blue-100',
    refund: 'text-orange-600 bg-orange-100',
    cancellation: 'text-gray-600 bg-gray-100'
  }
  return classMap[type] || 'text-gray-600 bg-gray-100'
}
