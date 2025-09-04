// types/companyBilling.ts

import type { User } from './index'

export interface CompanyBillingAddress {
  id: string
  created_at: string
  updated_at: string
  
  // Firmeninformationen
  company_name: string
  contact_person: string
  email: string
  phone?: string
  
  // Rechnungsadresse
  street: string
  street_number?: string
  zip: string
  city: string
  country: string
  
  // Geschäftsinformationen
  vat_number?: string
  company_register_number?: string
  
  // Status und Metadaten
  is_active: boolean
  is_verified: boolean
  notes?: string
  
  // Verknüpfung
  created_by?: string
}

export interface CompanyBillingAddressInsert {
  // Pflichtfelder für neue Adresse
  company_name: string
  contact_person: string
  email: string
  street: string
  zip: string
  city: string
  
  // Optionale Felder
  phone?: string
  street_number?: string
  country?: string
  vat_number?: string
  company_register_number?: string
  notes?: string
  created_by?: string
}

export interface CompanyBillingAddressUpdate {
  // Alle Felder optional für Updates
  company_name?: string
  contact_person?: string
  email?: string
  phone?: string
  street?: string
  street_number?: string
  zip?: string
  city?: string
  country?: string
  vat_number?: string
  company_register_number?: string
  is_active?: boolean
  is_verified?: boolean
  notes?: string
}

// Für die Component-Verwendung
export interface CompanyBillingFormData {
  companyName: string
  contactPerson: string
  email: string
  phone: string
  street: string
  streetNumber: string
  zip: string
  city: string
  country: string
  vatNumber: string
  notes: string
  payment_method?: string
}

// Validation Interface
export interface CompanyBillingValidation {
  isValid: boolean
  errors: {
    companyName?: string
    contactPerson?: string
    email?: string
    street?: string
    zip?: string
    city?: string
    [key: string]: string | undefined
  }
}

// Erweiterte Payment Interface (update zu bestehenden types)
export interface PaymentWithCompanyBilling {
  id: string
  appointment_id: string
  user_id: string
  staff_id?: string
  lesson_price_rappen: number
  admin_fee_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  payment_provider?: string
  created_at: string
  updated_at: string
  
  // Neue Verknüpfung
  company_billing_address_id?: string
  company_billing_address?: CompanyBillingAddress
}

// User Interface erweitern (falls noch nicht vorhanden)
export interface UserWithBilling extends User {
  default_company_billing_address_id?: string
  default_company_billing_address?: CompanyBillingAddress
}

// API Response Types
export interface CreateCompanyBillingResponse {
  success: boolean
  data?: CompanyBillingAddress
  error?: string
}

export interface CompanyBillingListResponse {
  success: boolean
  data?: CompanyBillingAddress[]
  error?: string
}

// Für die Supabase View
export interface PaymentWithCompanyAddressView {
  // Payment Felder
  id: string
  appointment_id: string
  user_id: string
  staff_id?: string
  lesson_price_rappen: number
  admin_fee_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  created_at: string
  updated_at: string
  company_billing_address_id?: string
  
  // Company Address Felder (aus View)
  company_name?: string
  contact_person?: string
  company_email?: string
  street?: string
  street_number?: string
  zip?: string
  city?: string
  country?: string
  vat_number?: string
  formatted_address?: string
}

// Utility Types für bessere Entwicklung
export type CompanyBillingField = keyof CompanyBillingFormData
export type RequiredCompanyBillingFields = 'companyName' | 'contactPerson' | 'email' | 'street' | 'zip' | 'city'
export type OptionalCompanyBillingFields = Exclude<CompanyBillingField, RequiredCompanyBillingFields>