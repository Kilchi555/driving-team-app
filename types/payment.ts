// types/payment.ts
// Erweiterte Payment-Types für Produkte und Rabatte (mit und ohne Termin)

export interface Payment {
  id: string
  user_id: string
  staff_id?: string
  appointment_id?: string
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  total_amount_rappen: number
  currency: string
  description?: string
  is_standalone: boolean
  created_at: string
  updated_at: string
  // ✅ Neue Spalten für detaillierte Preisaufschlüsselung
  lesson_price_rappen?: number
  products_price_rappen?: number
  discount_amount_rappen?: number
  subtotal_rappen?: number
  // ✅ Alte Spalten für Kompatibilität
  amount_rappen?: number
  admin_fee_rappen?: number
  // ✅ Metadaten für erweiterte Informationen
  metadata?: Record<string, any>
}

export interface PaymentItem {
  id: string
  payment_id: string
  item_type: ItemType
  item_id?: string
  item_name: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  description?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface Product {
  id: string
  name: string
  price_rappen: number
  description?: string
  category?: string
  is_active: boolean
  is_voucher: boolean
  allow_custom_amount: boolean
  min_amount_rappen: number
  max_amount_rappen?: number
  display_order: number
  created_at: string
  updated_at: string
}

export interface Discount {
  id: string
  name: string
  code?: string
  discount_type: DiscountType
  discount_value: number
  min_amount_rappen: number
  max_discount_rappen?: number
  valid_from: string
  valid_until?: string
  usage_limit?: number
  max_per_user?: number
  usage_count: number
  is_active: boolean
  applies_to: AppliesTo
  category_filter?: string
  staff_id?: string
  created_at: string
  updated_at: string
}

export interface PaymentCalculation {
  base_amount_rappen: number
  discount_amount_rappen: number
  final_amount_rappen: number
  applied_discounts: AppliedDiscount[]
  payment_items: PaymentItem[]
}

export interface AppliedDiscount {
  discount: Discount
  amount_rappen: number
  reason: string
}

export interface CreatePaymentRequest {
  user_id: string
  staff_id?: string
  appointment_id?: string
  payment_method: PaymentMethod
  items: CreatePaymentItemRequest[]
  description?: string
  is_standalone?: boolean
}

export interface CreatePaymentItemRequest {
  item_type: ItemType
  item_id?: string
  item_name: string
  quantity: number
  unit_price_rappen: number
  description?: string
  metadata?: Record<string, any>
}

export interface CreateProductRequest {
  name: string
  price_rappen: number
  description?: string
  category?: string
  is_voucher?: boolean
  allow_custom_amount?: boolean
  min_amount_rappen?: number
  max_amount_rappen?: number
  display_order?: number
}

export interface CreateDiscountRequest {
  name: string
  code?: string
  discount_type: DiscountType
  discount_value: number
  min_amount_rappen?: number
  max_discount_rappen?: number
  valid_from?: string
  valid_until?: string
  usage_limit?: number
  max_per_user?: number
  applies_to?: AppliesTo
  category_filter?: string
  is_active?: boolean
  description?: string
}

// Enums
export type PaymentMethod = 'cash' | 'invoice' | 'online' | 'wallee' | 'twint' | 'apple_pay' | 'google_pay'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'

export type ItemType = 'appointment' | 'product' | 'discount' | 'service'

export type DiscountType = 'percentage' | 'fixed' | 'free_lesson' | 'free_product'

export type AppliesTo = 'all' | 'appointments' | 'products' | 'services'

// Utility Types
export type PaymentWithItems = Payment & {
  items: PaymentItem[]
}

export type ProductWithCategory = Product & {
  category_name?: string
}

export type DiscountWithUsage = Discount & {
  can_apply: boolean
  reason?: string
}

// Response Types
export interface PaymentResponse {
  payment: Payment
  items: PaymentItem[]
  total_amount_formatted: string
  status_label: string
}

export interface ProductResponse {
  products: Product[]
  categories: string[]
  total_count: number
}

export interface DiscountResponse {
  discounts: Discount[]
  active_count: number
  total_count: number
}

// Filter Types
export interface PaymentFilter {
  user_id?: string
  staff_id?: string
  appointment_id?: string
  payment_status?: PaymentStatus
  payment_method?: PaymentMethod
  is_standalone?: boolean
  date_from?: string
  date_until?: string
}

export interface ProductFilter {
  category?: string
  is_active?: boolean
  is_voucher?: boolean
  price_min?: number
  price_max?: number
  search?: string
}

export interface DiscountFilter {
  is_active?: boolean
  applies_to?: AppliesTo
  discount_type?: DiscountType
  valid_now?: boolean
  search?: string
}

// Constants
export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Bargeld',
  invoice: 'Rechnung',
  online: 'Online-Zahlung',
  wallee: 'Wallee',
  twint: 'Twint',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay'
}

export const PAYMENT_STATUSES: Record<PaymentStatus, string> = {
  pending: 'Ausstehend',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
  cancelled: 'Storniert',
  refunded: 'Rückerstattet'
}

export const ITEM_TYPES: Record<ItemType, string> = {
  appointment: 'Termin',
  product: 'Produkt',
  discount: 'Rabatt',
  service: 'Service'
}

export const DISCOUNT_TYPES: Record<DiscountType, string> = {
  percentage: 'Prozentual',
  fixed: 'Fester Betrag',
  free_lesson: 'Kostenlose Lektion',
  free_product: 'Kostenloses Produkt'
}

export const APPLIES_TO_OPTIONS: Record<AppliesTo, string> = {
  all: 'Alle',
  appointments: 'Nur Termine',
  products: 'Nur Produkte',
  services: 'Nur Services'
}
