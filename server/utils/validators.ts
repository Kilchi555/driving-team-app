/**
 * Centralized Input Validation Library
 * Provides validation functions for all API endpoints
 */

import { createError } from 'h3'

// ============================================================================
// STRING VALIDATORS
// ============================================================================

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(value: string | null | undefined, maxLength: number = 500): string {
  if (!value) return ''
  
  let sanitized = String(value)
    .trim()
    .substring(0, maxLength)
    // Remove potential XSS vectors
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
  
  return sanitized
}

/**
 * Validate email format with strict rules
 * - Must not contain HTML tags
 * - Must not contain script tags
 * - Must not contain event handlers
 */
export function validateEmail(email: string | null | undefined): { valid: boolean } {
  if (!email) return { valid: false }
  
  const emailStr = String(email).toLowerCase()
  
  // Check for dangerous patterns
  if (/<|>|script|javascript:|on\w+\s*=/.test(emailStr)) {
    return { valid: false }
  }
  
  // Standard email format validation
  const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
  return { valid: emailRegex.test(emailStr) }
}

/**
 * Validate password strength
 * - Min: 12 characters
 * - Max: 500 characters (prevent DoS attacks)
 * - Must contain uppercase, lowercase, numbers, and special characters
 */
export function validatePassword(password: string | null | undefined): { valid: boolean; message?: string } {
  if (!password) return { valid: false, message: 'Passwort ist erforderlich' }
  if (password.length < 12) return { valid: false, message: 'Passwort muss mindestens 12 Zeichen lang sein' }
  if (password.length > 500) return { valid: false, message: 'Passwort darf maximal 500 Zeichen lang sein' }
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Passwort muss Großbuchstaben enthalten' }
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Passwort muss Kleinbuchstaben enthalten' }
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Passwort muss Zahlen enthalten' }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { valid: false, message: 'Passwort muss Sonderzeichen enthalten' }
  return { valid: true }
}

/**
 * Validate UUID format
 */
export function validateUUID(value: string | null | undefined): { valid: boolean } {
  if (!value) return { valid: false }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return { valid: uuidRegex.test(String(value)) }
}

/**
 * Validate required string field
 */
export function validateRequiredString(value: any, fieldName: string, maxLength: number = 500): { valid: boolean; error?: string } {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, error: `${fieldName} ist erforderlich` }
  }
  
  const strValue = String(value)
  if (strValue.length > maxLength) {
    return { valid: false, error: `${fieldName} darf maximal ${maxLength} Zeichen lang sein` }
  }
  
  return { valid: true }
}

// ============================================================================
// NUMERIC VALIDATORS
// ============================================================================

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: any, fieldName: string, allowZero: boolean = false): { valid: boolean; error?: string } {
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} muss eine Zahl sein` }
  }
  
  if (allowZero && num < 0) {
    return { valid: false, error: `${fieldName} darf nicht negativ sein` }
  }
  
  if (!allowZero && num <= 0) {
    return { valid: false, error: `${fieldName} muss größer als 0 sein` }
  }
  
  return { valid: true }
}

/**
 * Validate amount in rappen (CHF cents)
 */
export function validateAmount(value: any, fieldName: string = 'Betrag', minRappen: number = 0, maxRappen: number = 999999999): { valid: boolean; error?: string } {
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} muss eine Zahl sein` }
  }
  
  if (num < minRappen) {
    return { valid: false, error: `${fieldName} muss mindestens CHF ${minRappen / 100} betragen` }
  }
  
  if (num > maxRappen) {
    return { valid: false, error: `${fieldName} darf maximal CHF ${maxRappen / 100} betragen` }
  }
  
  // Check if it's an integer (rappen must be whole numbers)
  if (!Number.isInteger(num)) {
    return { valid: false, error: `${fieldName} muss ein ganzzahliger Betrag sein` }
  }
  
  return { valid: true }
}

/**
 * Validate duration in minutes
 */
export function validateDuration(value: any, fieldName: string = 'Dauer', minMinutes: number = 15, maxMinutes: number = 600): { valid: boolean; error?: string } {
  const num = Number(value)
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, error: `${fieldName} muss eine ganze Zahl sein` }
  }
  
  if (num < minMinutes) {
    return { valid: false, error: `${fieldName} muss mindestens ${minMinutes} Minuten betragen` }
  }
  
  if (num > maxMinutes) {
    return { valid: false, error: `${fieldName} darf maximal ${maxMinutes} Minuten betragen` }
  }
  
  return { valid: true }
}

// ============================================================================
// DATE/TIME VALIDATORS
// ============================================================================

/**
 * Validate ISO 8601 date string
 */
export function validateISODate(value: any, fieldName: string = 'Datum'): { valid: boolean; error?: string; date?: Date } {
  if (!value) {
    return { valid: false, error: `${fieldName} ist erforderlich` }
  }
  
  const date = new Date(String(value))
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} hat ein ungültiges Format` }
  }
  
  return { valid: true, date }
}

/**
 * Validate appointment times (start < end, not in past, etc.)
 */
export function validateAppointmentTimes(
  startTime: any,
  endTime: any,
  allowPastAppointments: boolean = false
): { valid: boolean; error?: string } {
  const startValidation = validateISODate(startTime, 'Start time')
  if (!startValidation.valid) return startValidation
  
  const endValidation = validateISODate(endTime, 'End time')
  if (!endValidation.valid) return endValidation
  
  const start = startValidation.date!
  const end = endValidation.date!
  
  // Check start < end
  if (start >= end) {
    return { valid: false, error: 'Startzeit muss vor Endzeit liegen' }
  }
  
  // Check not in past
  if (!allowPastAppointments && start < new Date()) {
    return { valid: false, error: 'Termin kann nicht in der Vergangenheit liegen' }
  }
  
  return { valid: true }
}

// ============================================================================
// ENUM VALIDATORS
// ============================================================================

/**
 * Validate driving category
 */
/**
 * Validate driving category - STATIC FALLBACK VERSION
 * 
 * This is a static fallback used when validateDrivingCategoryDynamic() fails
 * For actual validation, the /api/validate/category endpoint is called first
 * which loads categories dynamically from the database
 * 
 * IMPORTANT: Update this list when adding new categories to maintain
 * a working fallback even if the DB/API is temporarily unavailable
 */
export function validateDrivingCategory(value: any, fieldName: string = 'Fahrkategorie'): { valid: boolean; error?: string } {
  // STATIC FALLBACK - Updated 2026-01-03
  // For dynamic validation, use /api/validate/category endpoint
  const fallbackCategories = [
    // Standard EU Categories
    'A', 'A1', 'A2', 'B', 'BE', 'B96',
    'C', 'C1', 'CE', 'C1E',
    'D', 'D1', 'DE', 'D1E',
    'F', 'G', 'M',
    // Special Categories (Switzerland/Austria)
    'B Schaltung', 'BPT', 'C1/D1', 'Boot', 'Motorboot', 'Treffpunkt'
  ]
  
  if (!value || !fallbackCategories.includes(String(value).trim())) {
    return { 
      valid: false, 
      error: `${fieldName} muss eine gültige Kategorie sein (${fallbackCategories.join(', ')})` 
    }
  }
  
  return { valid: true }
}

/**
 * Validate event type
 * ✅ UPDATED: Now accepts any non-empty string as custom event types (vku, nothelfer, etc.) 
 * are stored in the event_types table and validated via Foreign Key constraint
 */
export function validateEventType(value: any, fieldName: string = 'Event Typ'): { valid: boolean; error?: string } {
  // Just check if it's a non-empty string
  // The actual validation happens via FK constraint to event_types table
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { valid: false, error: `${fieldName} ist erforderlich` }
  }
  
  return { valid: true }
}

/**
 * Validate appointment status
 */
export function validateAppointmentStatus(value: any, fieldName: string = 'Status'): { valid: boolean; error?: string } {
  const validStatuses = ['pending_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled']
  
  if (!value || !validStatuses.includes(String(value).toLowerCase())) {
    return { valid: false, error: `${fieldName} muss einer der folgenden Werte sein: ${validStatuses.join(', ')}` }
  }
  
  return { valid: true }
}

/**
 * Validate payment status
 */
export function validatePaymentStatus(value: any, fieldName: string = 'Zahlungsstatus'): { valid: boolean; error?: string } {
  const validStatuses = ['pending', 'completed', 'failed', 'cancelled', 'refunded']
  
  if (!value || !validStatuses.includes(String(value).toLowerCase())) {
    return { valid: false, error: `${fieldName} muss einer der folgenden Werte sein: ${validStatuses.join(', ')}` }
  }
  
  return { valid: true }
}

/**
 * Validate payment method
 */
export function validatePaymentMethod(value: any, fieldName: string = 'Zahlungsmethode'): { valid: boolean; error?: string } {
  const validMethods = ['cash', 'credit', 'wallee', 'bank_transfer', 'other']
  
  if (!value || !validMethods.includes(String(value).toLowerCase())) {
    return { valid: false, error: `${fieldName} muss einer der folgenden Werte sein: ${validMethods.join(', ')}` }
  }
  
  return { valid: true }
}

// ============================================================================
// APPOINTMENT VALIDATORS
// ============================================================================

export interface AppointmentValidationData {
  user_id?: string
  staff_id?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  type?: string
  event_type_code?: string
  status?: string
  tenant_id?: string
  title?: string
  description?: string
  location_id?: string | null
  custom_location_name?: string | null
  custom_location_address?: string | null
}

/**
 * Validate complete appointment data
 */
export function validateAppointmentData(data: AppointmentValidationData): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  // Required fields
  if (!data.user_id || !validateUUID(data.user_id)) {
    errors.user_id = 'Ungültige Benutzer-ID'
  }
  
  if (!data.staff_id || !validateUUID(data.staff_id)) {
    errors.staff_id = 'Ungültige Mitarbeiter-ID'
  }
  
  if (!data.tenant_id || !validateUUID(data.tenant_id)) {
    errors.tenant_id = 'Ungültige Mandanten-ID'
  }
  
  // Times
  // ✅ Allow past appointments - staff can create/edit appointments in the past
  const timeValidation = validateAppointmentTimes(data.start_time, data.end_time, true)
  if (!timeValidation.valid) {
    errors.times = timeValidation.error!
  }
  
  // Duration
  if (data.duration_minutes !== undefined) {
    const durationValidation = validateDuration(data.duration_minutes)
    if (!durationValidation.valid) {
      errors.duration_minutes = durationValidation.error!
    }
  }
  
  // Category (can be null for "other" event types like meetings, training)
  if (data.type !== undefined && data.type !== null) {
    const categoryValidation = validateDrivingCategory(data.type)
    if (!categoryValidation.valid) {
      errors.type = categoryValidation.error!
    }
  }
  
  // Event type
  if (data.event_type_code) {
    const eventTypeValidation = validateEventType(data.event_type_code)
    if (!eventTypeValidation.valid) {
      errors.event_type_code = eventTypeValidation.error!
    }
  }
  
  // Status (required - default to pending_confirmation if not provided)
  if (!data.status) {
    errors.status = 'Status ist erforderlich'
  } else {
    const statusValidation = validateAppointmentStatus(data.status)
    if (!statusValidation.valid) {
      errors.status = statusValidation.error!
    }
  }
  
  // Title and description
  if (data.title) {
    const titleValidation = validateRequiredString(data.title, 'Title', 255)
    if (!titleValidation.valid) {
      errors.title = titleValidation.error!
    }
  }
  
  if (data.description) {
    const descValidation = validateRequiredString(data.description, 'Description', 1000)
    if (!descValidation.valid) {
      errors.description = descValidation.error!
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

// ============================================================================
// PAYMENT VALIDATORS
// ============================================================================

export interface PaymentValidationData {
  user_id?: string
  appointment_id?: string
  total_amount_rappen?: number
  payment_status?: string
  payment_method?: string
  currency?: string
}

/**
 * Validate complete payment data
 */
export function validatePaymentData(data: PaymentValidationData): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  // Required fields
  if (!data.user_id || !validateUUID(data.user_id)) {
    errors.user_id = 'Ungültige Benutzer-ID'
  }
  
  if (data.appointment_id && !validateUUID(data.appointment_id)) {
    errors.appointment_id = 'Ungültige Termin-ID'
  }
  
  // Amount
  if (data.total_amount_rappen !== undefined) {
    const amountValidation = validateAmount(data.total_amount_rappen, 'Betrag', 0)
    if (!amountValidation.valid) {
      errors.total_amount_rappen = amountValidation.error!
    }
  }
  
  // Payment status
  if (data.payment_status) {
    const statusValidation = validatePaymentStatus(data.payment_status)
    if (!statusValidation.valid) {
      errors.payment_status = statusValidation.error!
    }
  }
  
  // Payment method
  if (data.payment_method) {
    const methodValidation = validatePaymentMethod(data.payment_method)
    if (!methodValidation.valid) {
      errors.payment_method = methodValidation.error!
    }
  }
  
  // Currency
  if (data.currency && data.currency !== 'CHF') {
    errors.currency = 'Nur CHF wird unterstützt'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

// ============================================================================
// HELPER: Throw error with validation failures
// ============================================================================

/**
 * Throw validation error with details
 */
export function throwValidationError(errors: Record<string, string>, fieldName?: string) {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('; ')
  
  throw createError({
    statusCode: 400,
    statusMessage: `Validierungsfehler: ${errorMessages}`
  })
}

/**
 * Throw if validation fails
 */
export function throwIfInvalid(validation: { valid: boolean; errors?: Record<string, string> }) {
  if (!validation.valid && validation.errors) {
    throwValidationError(validation.errors)
  }
}

