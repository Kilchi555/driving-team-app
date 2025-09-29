import type { PolicyWithRules, CancellationRule, CancellationCalculation } from '~/composables/useCancellationPolicies'

export interface AppointmentData {
  id: string
  start_time: string
  duration_minutes: number
  price_rappen?: number
  user_id: string
  staff_id: string
}

export interface CancellationResult {
  calculation: CancellationCalculation
  chargeAmountRappen: number
  shouldCreateInvoice: boolean
  shouldCreditHours: boolean
  invoiceDescription: string
}

/**
 * Calculate cancellation charges based on policy and appointment timing
 */
export const calculateCancellationCharges = (
  policy: PolicyWithRules,
  appointmentData: AppointmentData,
  cancellationDate: Date = new Date()
): CancellationResult => {
  const appointmentDate = new Date(appointmentData.start_time)
  const hoursBeforeAppointment = Math.floor(
    (appointmentDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60)
  )

  // Find the applicable rule (first rule where hours_before_appointment <= hoursBeforeAppointment)
  const applicableRule = policy.rules.find(rule => 
    hoursBeforeAppointment >= rule.hours_before_appointment
  ) || policy.rules[policy.rules.length - 1] // Fallback to last rule

  const calculation: CancellationCalculation = {
    applicableRule,
    chargePercentage: applicableRule?.charge_percentage || 0,
    creditHours: applicableRule?.credit_hours_to_instructor || false,
    hoursBeforeAppointment,
    description: applicableRule?.description || 'Keine Regel gefunden'
  }

  // Calculate charge amount
  const basePrice = appointmentData.price_rappen || 0
  const chargeAmountRappen = Math.floor((basePrice * calculation.chargePercentage) / 100)

  // Determine if invoice should be created
  const shouldCreateInvoice = calculation.chargePercentage > 0 && chargeAmountRappen > 0

  // Create invoice description
  const invoiceDescription = shouldCreateInvoice 
    ? `Stornogebühr für Termin am ${formatDate(appointmentDate)} (${calculation.chargePercentage}% von ${formatCurrency(basePrice)})`
    : ''

  return {
    calculation,
    chargeAmountRappen,
    shouldCreateInvoice,
    shouldCreditHours: calculation.creditHours,
    invoiceDescription
  }
}

/**
 * Get the most restrictive rule that applies to a given time period
 */
export const getApplicableRule = (
  policy: PolicyWithRules,
  hoursBeforeAppointment: number
): CancellationRule | null => {
  // Sort rules by hours_before_appointment descending (most restrictive first)
  const sortedRules = [...policy.rules].sort((a, b) => b.hours_before_appointment - a.hours_before_appointment)
  
  // Find the first rule that applies
  return sortedRules.find(rule => hoursBeforeAppointment >= rule.hours_before_appointment) || null
}

/**
 * Validate if a policy has valid rules
 */
export const validatePolicy = (policy: PolicyWithRules): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!policy.rules || policy.rules.length === 0) {
    errors.push('Policy muss mindestens eine Regel haben')
  }

  // Check for overlapping rules
  const sortedRules = [...policy.rules].sort((a, b) => a.hours_before_appointment - b.hours_before_appointment)
  for (let i = 0; i < sortedRules.length - 1; i++) {
    const current = sortedRules[i]
    const next = sortedRules[i + 1]
    
    if (current.hours_before_appointment === next.hours_before_appointment) {
      errors.push(`Mehrere Regeln mit ${current.hours_before_appointment} Stunden vor Termin`)
    }
  }

  // Check for invalid percentages
  for (const rule of policy.rules) {
    if (rule.charge_percentage < 0 || rule.charge_percentage > 100) {
      errors.push(`Ungültiger Verrechnungsprozentsatz: ${rule.charge_percentage}%`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get a human-readable description of the cancellation policy
 */
export const getPolicyDescription = (policy: PolicyWithRules): string => {
  if (!policy.rules || policy.rules.length === 0) {
    return 'Keine Regeln definiert'
  }

  const sortedRules = [...policy.rules].sort((a, b) => b.hours_before_appointment - a.hours_before_appointment)
  
  const descriptions = sortedRules.map(rule => {
    const timeDesc = formatHoursBefore(rule.hours_before_appointment)
    const chargeDesc = rule.charge_percentage === 0 ? 'kostenlos' : `${rule.charge_percentage}% verrechnen`
    const creditDesc = rule.credit_hours_to_instructor ? ', Stunden gutschreiben' : ''
    
    return `${timeDesc}: ${chargeDesc}${creditDesc}`
  })

  return descriptions.join('; ')
}

/**
 * Format hours before appointment in a human-readable way
 */
export const formatHoursBefore = (hours: number): string => {
  if (hours === 0) return 'Weniger als 24h'
  if (hours < 24) return `${hours}h vorher`
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  if (remainingHours === 0) {
    return `${days} Tag${days > 1 ? 'e' : ''} vorher`
  } else {
    return `${days} Tag${days > 1 ? 'e' : ''} und ${remainingHours}h vorher`
  }
}

/**
 * Format currency amount in Rappen to CHF
 */
export const formatCurrency = (rappen: number): string => {
  return `${(rappen / 100).toFixed(2)} CHF`
}

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Calculate the time remaining until appointment
 */
export const getTimeUntilAppointment = (appointmentDate: Date, currentDate: Date = new Date()): {
  hours: number
  days: number
  isOverdue: boolean
  description: string
} => {
  const diffMs = appointmentDate.getTime() - currentDate.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const isOverdue = diffMs < 0

  let description: string
  if (isOverdue) {
    const overdueHours = Math.abs(hours)
    const overdueDays = Math.floor(overdueHours / 24)
    if (overdueDays > 0) {
      description = `Vor ${overdueDays} Tag${overdueDays > 1 ? 'en' : ''}`
    } else {
      description = `Vor ${overdueHours} Stunde${overdueHours > 1 ? 'n' : ''}`
    }
  } else {
    if (days > 0) {
      description = `In ${days} Tag${days > 1 ? 'en' : ''}`
    } else {
      description = `In ${hours} Stunde${hours > 1 ? 'n' : ''}`
    }
  }

  return {
    hours: Math.abs(hours),
    days: Math.abs(days),
    isOverdue,
    description
  }
}

/**
 * Create a cancellation fee invoice
 */
export const createCancellationFeeInvoice = async (
  appointmentData: AppointmentData,
  cancellationResult: CancellationResult,
  cancellationReason: string,
  staffId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> => {
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()

    if (!cancellationResult.shouldCreateInvoice || cancellationResult.chargeAmountRappen <= 0) {
      return { success: true, invoiceId: undefined }
    }

    // Create invoice record
    const invoiceData = {
      user_id: appointmentData.user_id,
      staff_id: staffId,
      appointment_id: appointmentData.id,
      billing_type: 'individual' as const,
      invoice_type: 'cancellation_fee' as const,
      subtotal_rappen: cancellationResult.chargeAmountRappen,
      vat_rate: 7.70,
      vat_amount_rappen: Math.round(cancellationResult.chargeAmountRappen * 0.077),
      total_amount_rappen: cancellationResult.chargeAmountRappen + Math.round(cancellationResult.chargeAmountRappen * 0.077),
      status: 'pending' as const,
      payment_status: 'pending' as const,
      description: cancellationResult.invoiceDescription,
      notes: `Stornogebühr basierend auf Policy-Regel: ${cancellationResult.calculation.description}`,
      internal_notes: `Cancellation reason: ${cancellationReason}`,
      invoice_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single()

    if (invoiceError) {
      throw invoiceError
    }

    // Create invoice item
    const invoiceItemData = {
      invoice_id: invoice.id,
      appointment_id: appointmentData.id,
      appointment_title: `Stornogebühr - ${formatDate(new Date(appointmentData.start_time))}`,
      appointment_date: appointmentData.start_time,
      appointment_duration_minutes: appointmentData.duration_minutes,
      product_name: 'Stornogebühr',
      product_description: cancellationResult.invoiceDescription,
      quantity: 1,
      unit_price_rappen: cancellationResult.chargeAmountRappen,
      total_price_rappen: cancellationResult.chargeAmountRappen,
      vat_rate: 7.70,
      vat_amount_rappen: Math.round(cancellationResult.chargeAmountRappen * 0.077),
      sort_order: 1
    }

    const { error: itemError } = await supabase
      .from('invoice_items')
      .insert([invoiceItemData])

    if (itemError) {
      console.warn('Could not create invoice item:', itemError)
    }

    console.log('✅ Cancellation fee invoice created:', invoice.id)
    return { success: true, invoiceId: invoice.id }

  } catch (error: any) {
    console.error('❌ Error creating cancellation fee invoice:', error)
    return { 
      success: false, 
      error: error.message || 'Fehler beim Erstellen der Stornogebühren-Rechnung' 
    }
  }
}
