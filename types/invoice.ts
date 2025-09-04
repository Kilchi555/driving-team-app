// Invoice Types für das Rechnungssystem

export interface Invoice {
  id: string
  product_sale_id?: string
  appointment_id?: string
  user_id: string
  staff_id?: string
  
  // Rechnungsinformationen
  invoice_number: string
  invoice_date: string
  due_date: string
  
  // Rechnungsempfänger
  billing_type: 'individual' | 'company'
  billing_company_name?: string
  billing_contact_person?: string
  billing_email?: string
  billing_street?: string
  billing_street_number?: string
  billing_zip?: string
  billing_city?: string
  billing_country: string
  billing_vat_number?: string
  
  // Rechnungsdetails
  subtotal_rappen: number
  vat_rate: number
  vat_amount_rappen: number
  discount_amount_rappen: number
  total_amount_rappen: number
  
  // Status und Zahlung
  status: InvoiceStatus
  payment_status: PaymentStatus
  payment_method?: string
  paid_at?: string
  paid_amount_rappen: number
  
  // Accounto Integration
  accounto_invoice_id?: string
  accounto_sync_status: AccountoSyncStatus
  accounto_sync_error?: string
  accounto_last_sync?: string
  
  // Metadaten
  notes?: string
  internal_notes?: string
  created_at: string
  updated_at: string
  sent_at?: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  
  // Produkt/Service Information
  product_id?: string
  product_name: string
  product_description?: string
  
  // Termin Information
  appointment_id?: string
  appointment_title?: string
  appointment_date?: string
  appointment_duration_minutes?: number
  
  // Preise
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  
  // MWST
  vat_rate: number
  vat_amount_rappen: number
  
  // Metadaten
  sort_order: number
  notes?: string
  created_at: string
}

export interface InvoicePayment {
  id: string
  invoice_id: string
  
  // Zahlungsinformationen
  payment_method: string
  payment_reference?: string
  amount_rappen: number
  currency: string
  
  // Status
  status: PaymentItemStatus
  
  // Metadaten
  payment_date: string
  notes?: string
  created_at: string
}

export interface InvoiceWithDetails extends Invoice {
  customer_first_name?: string
  customer_last_name?: string
  customer_email?: string
  staff_first_name?: string
  staff_last_name?: string
  staff_email?: string
  product_sale_total?: number
  appointment_title?: string
  appointment_start?: string
  appointment_duration?: number
}

// Enums
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'
export type AccountoSyncStatus = 'not_synced' | 'syncing' | 'synced' | 'error'
export type PaymentItemStatus = 'pending' | 'completed' | 'failed' | 'refunded'

// Form Interfaces
export interface InvoiceFormData {
  // Basis-Informationen
  user_id: string
  staff_id?: string
  product_sale_id?: string
  appointment_id?: string
  
  // Rechnungsempfänger
  billing_type: 'individual' | 'company'
  billing_company_name?: string
  billing_contact_person?: string
  billing_email?: string
  billing_street?: string
  billing_street_number?: string
  billing_zip?: string
  billing_city?: string
  billing_country: string
  billing_vat_number?: string
  
  // Rechnungsdetails
  subtotal_rappen: number
  vat_rate: number
  discount_amount_rappen: number
  
  // Metadaten
  notes?: string
  internal_notes?: string
}

export interface InvoiceItemFormData {
  product_id?: string
  product_name: string
  product_description?: string
  appointment_id?: string
  appointment_title?: string
  appointment_date?: string
  appointment_duration_minutes?: number
  quantity: number
  unit_price_rappen: number
  vat_rate: number
  sort_order: number
  notes?: string
}

// API Response Types
export interface InvoiceListResponse {
  data?: InvoiceWithDetails[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

export interface InvoiceResponse {
  data?: Invoice
  error?: string
}

export interface InvoiceCreateResponse {
  data?: Invoice
  error?: string
  invoice_number?: string
}

export interface InvoiceUpdateResponse {
  data?: Invoice
  error?: string
}

// Utility Types
export interface InvoiceFilters {
  status?: InvoiceStatus[]
  payment_status?: PaymentStatus[]
  user_id?: string
  staff_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface InvoiceSummary {
  total_invoices: number
  total_amount: number
  paid_amount: number
  pending_amount: number
  overdue_amount: number
  draft_amount: number
}

// Constants
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert'
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ausstehend',
  partial: 'Teilweise bezahlt',
  paid: 'Vollständig bezahlt',
  overdue: 'Überfällig'
}

export const ACCOUNTO_SYNC_STATUS_LABELS: Record<AccountoSyncStatus, string> = {
  not_synced: 'Nicht synchronisiert',
  syncing: 'Wird synchronisiert',
  synced: 'Synchronisiert',
  error: 'Fehler bei Synchronisation'
}

export const PAYMENT_ITEM_STATUS_LABELS: Record<PaymentItemStatus, string> = {
  pending: 'Ausstehend',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
  refunded: 'Rückerstattet'
}

// Default Values
export const DEFAULT_INVOICE_VALUES: Partial<InvoiceFormData> = {
  billing_type: 'individual',
  billing_country: 'CH',
  vat_rate: 7.70,
  discount_amount_rappen: 0
}

export const DEFAULT_INVOICE_ITEM_VALUES: Partial<InvoiceItemFormData> = {
  quantity: 1,
  vat_rate: 7.70,
  sort_order: 0
}
