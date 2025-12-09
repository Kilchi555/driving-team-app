<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-xl">
      
      <!-- Header -->
      <div class="bg-green-600 text-white p-6 rounded-t-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <h3 class="text-xl font-semibold">Zahlung für Fahrlektion</h3>
          </div>
          <button @click="closeModal" class="text-white hover:text-green-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto max-h-[calc(95vh-140px)]">
        
        <!-- Termin Details -->
        <div v-if="appointment" class="p-6 border-b bg-gray-50">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Termindetails
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Schüler:</span>
                <span class="font-medium">{{ getStudentName() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Datum & Zeit:</span>
                <span class="font-medium">{{ formatDateTime(appointment.start_time) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Dauer:</span>
                <span class="font-medium">{{ appointment.duration_minutes }} Minuten</span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Kategorie:</span>
                <span class="font-medium">{{ appointment.extendedProps?.category || 'B' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Standort:</span>
                <span class="font-medium">{{ appointment.extendedProps?.location || 'Nicht definiert' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span class="font-medium capitalize">{{ appointment.extendedProps?.status || 'Geplant' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Preisberechnung -->
        <div class="p-6 border-b">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            Preisberechnung
          </h4>

          <!-- Loading State -->
          <div v-if="isLoadingPrice" class="flex items-center justify-center py-8">
            <LoadingLogo size="md" />
            <span class="ml-2 text-gray-600">Preis wird berechnet...</span>
          </div>

          <div v-else-if="priceError" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-red-800 text-sm">{{ priceError }}</span>
            </div>
          </div>

          <div v-else-if="calculatedPrice" class="space-y-3">
            <div class="bg-white border rounded-lg p-4">
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Grundpreis ({{ appointment?.duration_minutes || 45 }} Min):</span>
                  <span class="font-medium">CHF {{ calculatedPrice.base_price_chf }}</span>
                </div>
                
                <div v-if="Number(calculatedPrice.admin_fee_chf) > 0" class="flex justify-between text-sm">
                  <span class="text-gray-600">Administrationspauschale:</span>
                  <span class="font-medium">CHF {{ calculatedPrice.admin_fee_chf }}</span>
                </div>
                
                <div v-if="Number(calculatedPrice.admin_fee_chf) === 0" class="flex justify-between text-sm text-green-600">
                  <span>Administrationspauschale:</span>
                  <span class="font-medium">Kostenlos (1. Termin)</span>
                </div>
                
                <hr class="my-2">
                
                <div class="flex justify-between text-lg font-semibold">
                  <span>Gesamtbetrag:</span>
                  <span class="text-green-600">CHF {{ calculatedPrice.total_chf }}</span>
                </div>
              </div>
            </div>

            <!-- Appointment Counter Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div class="flex items-start">
                <svg class="w-4 h-4 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div class="text-xs text-blue-800">
                  <p><strong>Termin {{ appointmentCount }} für diesen Schüler</strong></p>
                  <p v-if="appointmentCount === 1">Die Administrationspauschale entfällt beim ersten Termin.</p>
                  <p v-else>Administrationspauschale wird ab dem 2. Termin berechnet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Zahlungsmethoden -->
        <div class="p-6">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
            Zahlungsart wählen
          </h4>

          <div v-if="isLoadingMethods" class="flex items-center justify-center py-8">
            <LoadingLogo size="md" />
            <span class="ml-2 text-gray-600">Zahlungsmethoden werden geladen...</span>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="method in availablePaymentMethods"
              :key="method.method_code"
              @click="selectPaymentMethod(method.method_code)"
              class="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md"
              :class="{
                'border-green-500 bg-green-50': selectedPaymentMethod === method.method_code,
                'border-gray-200 hover:border-gray-300': selectedPaymentMethod !== method.method_code
              }"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                       :class="getMethodIconClass(method.method_code)">
                    <component :is="getMethodIcon(method.method_code)" class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ method.display_name }}</div>
                    <div class="text-sm text-gray-600">{{ method.description }}</div>
                  </div>
                </div>
                <div class="flex items-center">
                  <div
                    class="w-4 h-4 rounded-full border-2"
                    :class="{
                      'border-green-500 bg-green-500': selectedPaymentMethod === method.method_code,
                      'border-gray-300': selectedPaymentMethod !== method.method_code
                    }"
                  >
                    <div v-if="selectedPaymentMethod === method.method_code" 
                         class="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  </div>
                </div>
              </div>

              <!-- Method-specific info -->
              <div v-if="method.method_code === 'invoice'" class="mt-3 text-xs text-gray-600">
                <p>💼 Nur für Firmenkunden verfügbar</p>
              </div>
              <div v-if="method.method_code === 'cash'" class="mt-3 text-xs text-gray-600">
                <p>💵 Zahlung direkt beim Fahrlehrer</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Firmenrechnung Details (falls ausgewählt) -->
        <div v-if="selectedPaymentMethod === 'invoice'" class="px-6 pb-6">
          <div class="border-t pt-4">
            <h5 class="font-medium text-gray-900 mb-3">Rechnungsdetails</h5>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
                <input
                  v-model="invoiceData.companyName"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Firma AG"
                  required
                />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Kontaktperson</label>
                  <input
                    v-model="invoiceData.contactPerson"
                    type="text"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Max Muster"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <input
                    v-model="invoiceData.email"
                    type="email"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="rechnung@firma.ch"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rechnungsadresse</label>
                <textarea
                  v-model="invoiceData.address"
                  rows="3"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Musterstrasse 123&#10;8000 Zürich&#10;Schweiz"
                  required
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Wallee Payment Integration -->
        <div v-if="selectedPaymentMethod === 'wallee'" class="px-6 pb-6">
          <div class="border-t pt-4">
            <h5 class="font-medium text-gray-900 mb-3">Online Zahlung</h5>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <div class="text-sm text-blue-800">
                  <p><strong>Sichere Online-Zahlung</strong></p>
                  <p>Sie werden zu unserem sicheren Zahlungspartner weitergeleitet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="bg-gray-50 px-6 py-4 rounded-b-lg border-t">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-600">
            Gesamtbetrag: <span class="font-semibold text-lg text-green-600">
              CHF {{ calculatedPrice?.total_chf || '0.00' }}
            </span>
          </div>
          <div class="flex gap-3">
            <button
              @click="closeModal"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              @click="processPayment"
              :disabled="!selectedPaymentMethod || isProcessing || !isFormValid"
              class="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <!-- Loading State -->
              <div v-if="isProcessing" class="flex items-center">
                <LoadingLogo size="sm" />
                <span class="ml-2">Verarbeite...</span>
              </div>
              {{ isProcessing ? 'Wird verarbeitet...' : getPaymentButtonText() }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'
import LoadingLogo from '~/components/LoadingLogo.vue'


// Props
interface Props {
  isVisible: boolean
  appointment: any
  currentUser?: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'payment-completed', 'payment-failed', 'payment-created'])

// Interfaces
interface PaymentMethod {
  method_code: string
  display_name: string
  description: string
  icon_name: string
  is_active: boolean
  is_online: boolean
  display_order: number
}

interface CalculatedPrice {
  base_price_rappen: number
  admin_fee_rappen: number
  total_rappen: number
  base_price_chf: string
  admin_fee_chf: string
  total_chf: string
  category_code: string
  duration_minutes: number
}

interface PaymentMetadata {
  appointment_count: number
  category: string
  student_name?: string
  invoice_data?: Record<string, unknown>
  [key: string]: unknown
}

interface InvoiceData {
  companyName: string
  contactPerson: string
  email: string
  address: string
}

interface PaymentApiResponse {
  success: boolean
  paymentUrl?: string
  paymentId?: string
  message?: string
  error?: string
}

// Type Guards
const isPaymentApiResponse = (result: unknown): result is PaymentApiResponse => {
  return typeof result === 'object' && result !== null && 'success' in result
}

// Supabase
const supabase = getSupabase()

// State
const selectedPaymentMethod = ref<string>('')
const availablePaymentMethods = ref<PaymentMethod[]>([
  {
    method_code: 'wallee',
    display_name: 'Online Zahlung',
    description: 'Kreditkarte, Twint, etc.',
    icon_name: 'credit-card',
    is_active: true,
    is_online: true,
    display_order: 1
  },
  {
    method_code: 'cash',
    display_name: 'Bar',
    description: 'Zahlung beim Fahrlehrer',
    icon_name: 'cash',
    is_active: true,
    is_online: false,
    display_order: 2
  },
  {
    method_code: 'invoice',
    display_name: 'Rechnung',
    description: 'Firmenrechnung',
    icon_name: 'document',
    is_active: true,
    is_online: false,
    display_order: 3
  }
])

const showPaymentModal = ref(false)
const selectedAppointment = ref(null)

const openPaymentModal = (appointment: any) => {
  selectedAppointment.value = appointment
  showPaymentModal.value = true
}

const handlePaymentCompleted = (result: any) => {
  logger.debug('Payment completed:', result)
  // Refresh calendar or appointment list
}

const isLoadingMethods = ref(false)
const isLoadingPrice = ref(false)
const isProcessing = ref(false)
const calculatedPrice = ref<CalculatedPrice | null>(null)
const priceError = ref<string>('')
const appointmentCount = ref(1)

// Invoice data
const invoiceData = ref<InvoiceData>({
  companyName: '',
  contactPerson: '',
  email: '',
  address: ''
})

// Computed
const getStudentName = () => {
  const extendedProps = props.appointment?.extendedProps
  return extendedProps?.student || extendedProps?.user_name || 'Unbekannter Schüler'
}

const getPaymentButtonText = () => {
  switch (selectedPaymentMethod.value) {
    case 'wallee': return 'Online bezahlen'
    case 'twint': return 'Mit Twint bezahlen'
    case 'stripe_card': return 'Mit Karte bezahlen'
    case 'debit_card': return 'Mit Debitkarte bezahlen'
    case 'cash': return 'Bar bezahlen'
    case 'invoice': return 'Rechnung erstellen'
    default: return 'Bezahlen'
  }
}

const isFormValid = computed(() => {
  if (selectedPaymentMethod.value === 'invoice') {
    return invoiceData.value.companyName && 
           invoiceData.value.address && 
           invoiceData.value.email
  }
  return true
})

// Methods
const closeModal = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  selectedPaymentMethod.value = ''
  calculatedPrice.value = null
  priceError.value = ''
  invoiceData.value = {
    companyName: '',
    contactPerson: '',
    email: '',
    address: ''
  }
}

const loadPaymentMethods = async () => {
  // Mock data for now - in production load from database
  isLoadingMethods.value = true
  
  setTimeout(() => {
    isLoadingMethods.value = false
  }, 500)
}

const loadAppointmentCount = async () => {
  if (!props.appointment?.extendedProps?.user_id) return

  try {
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', props.appointment.extendedProps.user_id)
      .is('deleted_at', null) // ✅ Soft Delete Filter
      .not('status', 'eq', 'cancelled') // ✅ Stornierte Termine nicht zählen
      .not('status', 'eq', 'aborted')   // ✅ Abgebrochene Termine nicht zählen

    if (error) throw error
    appointmentCount.value = (count || 0) + 1
  } catch (err: any) {
    console.error('❌ Error loading appointment count:', err)
    appointmentCount.value = 1
  }
}

const calculatePrice = async () => {
  if (!props.appointment) return

  isLoadingPrice.value = true
  priceError.value = ''

  try {
    const category = props.appointment.extendedProps?.category || 'B'
    const duration = props.appointment.duration_minutes || 45

    logger.debug('💰 Calculating price for:', { category, duration, appointmentCount: appointmentCount.value })

    // ✅ KORRIGIERT: Admin-Fee nur beim 2. Termin pro Kategorie (außer bei Motorrädern)
    const motorcycleCategories = ['A', 'A1', 'A35kW']
    const isMotorcycle = motorcycleCategories.includes(category)
    
    let adminFeeRappen = 0
    if (!isMotorcycle && appointmentCount.value === 2) {
      adminFeeRappen = 12000 // 120 CHF
    }
    
    const mockPrice = {
      base_price_rappen: 9500,
      admin_fee_rappen: adminFeeRappen,
      total_rappen: 9500 + adminFeeRappen,
      base_price_chf: '95.00',
      admin_fee_chf: (adminFeeRappen / 100).toFixed(2),
      total_chf: ((9500 + adminFeeRappen) / 100).toFixed(2),
      category_code: category,
      duration_minutes: duration
    }

    calculatedPrice.value = mockPrice
    logger.debug('✅ Price calculated:', mockPrice)

  } catch (err: any) {
    console.error('❌ Error calculating price:', err)
    priceError.value = err.message || 'Fehler bei der Preisberechnung'
  } finally {
    isLoadingPrice.value = false
  }
}

const selectPaymentMethod = (methodCode: string) => {
  selectedPaymentMethod.value = methodCode
}

const getMethodIcon = (methodCode: string) => {
  // Return SVG icon component or simple div
  return 'div'
}

const getMethodIconClass = (methodCode: string) => {
  const classes: Record<string, string> = {
    wallee: 'bg-blue-100 text-blue-600',
    twint: 'bg-blue-100 text-blue-600',
    stripe_card: 'bg-purple-100 text-purple-600',
    debit_card: 'bg-green-100 text-green-600',
    cash: 'bg-yellow-100 text-yellow-600',
    invoice: 'bg-gray-100 text-gray-600'
  }
  return classes[methodCode] || 'bg-gray-100 text-gray-600'
}

const processPayment = async () => {
  if (!selectedPaymentMethod.value || !calculatedPrice.value) return

  isProcessing.value = true

  try {
    logger.debug('💳 Processing payment:', {
      method: selectedPaymentMethod.value,
      amount: calculatedPrice.value.total_rappen,
      appointment: props.appointment.id
    })

    // Handle different payment methods
    switch (selectedPaymentMethod.value) {
      case 'wallee':
        await handleWalleePayment()
        break
      case 'cash':
        await handleCashPayment()
        break
      case 'invoice':
        await handleInvoicePayment()
        break
      default:
        throw new Error('Unbekannte Zahlungsmethode')
    }

  } catch (err: any) {
    console.error('❌ Payment processing error:', err)
    emit('payment-failed', err.message)
  } finally {
    isProcessing.value = false
  }
}

interface WalleeResponse {
  success: boolean
  paymentUrl: string
  transactionId: string
  transaction: any
}

const handleWalleePayment = async () => {
  try {
    logger.debug('🔄 Creating Wallee payment...')
    
    const paymentRequest = {
      appointmentId: props.appointment.id,
      userId: props.appointment.extendedProps?.user_id || props.currentUser?.id || 'guest',
      staffId: props.appointment.extendedProps?.staff_id || props.currentUser?.id,
      amount: Number(calculatedPrice.value?.total_chf || 0),
      currency: 'CHF',
      customerEmail: props.currentUser?.email || 'test@example.com',
      customerName: getStudentName(),
      description: `Fahrlektion ${calculatedPrice.value?.category_code || 'B'} - ${calculatedPrice.value?.duration_minutes || 45} Min`,
      paymentMethod: 'wallee' as const,
      successUrl: `${window.location.origin}/payment/success`,
      failedUrl: `${window.location.origin}/payment/failed`
    }

    const result = await $fetch('/api/payments/create', {
      method: 'POST',
      body: paymentRequest
    })

    if (isPaymentApiResponse(result) && result.success && result.paymentUrl) {
      logger.debug('✅ Wallee payment created:', result)
      // Redirect to Wallee payment page
      window.location.href = result.paymentUrl
    } else {
      throw new Error(isPaymentApiResponse(result) ? (result.error || 'Fehler beim Erstellen der Zahlung') : 'Ungültige API-Antwort')
    }

  } catch (err: any) {
    console.error('❌ Wallee payment error:', err)
    throw new Error(`Wallee Fehler: ${err.message}`)
  }
}

const handleCashPayment = async () => {
  try {
    logger.debug('💰 Processing cash payment...')
    
    const paymentRequest = {
      appointmentId: props.appointment.id,
      userId: props.appointment.extendedProps?.user_id || props.currentUser?.id || 'guest',
      staffId: props.appointment.extendedProps?.staff_id || props.currentUser?.id,
      amount: Number(calculatedPrice.value?.total_chf || 0),
      currency: 'CHF',
      customerEmail: props.currentUser?.email || 'test@example.com',
      customerName: getStudentName(),
      description: `Fahrlektion ${calculatedPrice.value?.category_code || 'B'} - ${calculatedPrice.value?.duration_minutes || 45} Min`,
      paymentMethod: 'cash' as const
    }

    const result = await $fetch('/api/payments/create', {
      method: 'POST',
      body: paymentRequest
    })

    if (isPaymentApiResponse(result) && result.success) {
      logger.debug('✅ Cash payment created:', result)
      
      // Emit success
      emit('payment-created', {
        type: 'cash',
        paymentId: result.paymentId,
        message: result.message || 'Barzahlung als Zahlungsmethode gespeichert'
      })
      
      closeModal()
    } else {
      throw new Error(isPaymentApiResponse(result) ? (result.error || 'Barzahlung konnte nicht verarbeitet werden') : 'Ungültige API-Antwort')
    }

  } catch (err: any) {
    console.error('❌ Cash payment error:', err)
    emit('payment-failed', `Barzahlung-Fehler: ${err.message}`)
  }
}

const handleInvoicePayment = async () => {
  try {
    logger.debug('📄 Processing invoice payment...')
    
    const paymentRequest = {
      appointmentId: props.appointment.id,
      userId: props.appointment.extendedProps?.user_id || props.currentUser?.id || 'test@example.com',
      staffId: props.appointment.extendedProps?.staff_id || props.currentUser?.id,
      amount: Number(calculatedPrice.value?.total_chf || 0),
      currency: 'CHF',
      customerEmail: props.currentUser?.email || 'test@example.com',
      customerName: getStudentName(),
      description: `Fahrlektion ${calculatedPrice.value?.category_code || 'B'} - ${calculatedPrice.value?.duration_minutes || 45} Min`,
      paymentMethod: 'invoice' as const
    }

    const result = await $fetch('/api/payments/create', {
      method: 'POST',
      body: paymentRequest
    })

    if (isPaymentApiResponse(result) && result.success) {
      logger.debug('✅ Invoice payment created:', result)
      
      // Emit success
      emit('payment-created', {
        type: 'invoice',
        paymentId: result.paymentId,
        message: result.message || 'Rechnung erfolgreich erstellt'
      })
      
      closeModal()
    } else {
      throw new Error(isPaymentApiResponse(result) ? (result.error || 'Rechnung konnte nicht erstellt werden') : 'Ungültige API-Antwort')
    }

  } catch (err: any) {
    console.error('❌ Invoice payment error:', err)
    emit('payment-failed', `Rechnungs-Fehler: ${err.message}`)
  }
}

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadPaymentMethods()
    loadAppointmentCount()
    calculatePrice()
  }
})

// Lifecycle
onMounted(() => {
  if (props.isVisible) {
    loadPaymentMethods()
    loadAppointmentCount()
    calculatePrice()
  }
})
</script>

<style scoped>
/* Additional styles if needed */
.payment-method-card {
  transition: all 0.2s ease-in-out;
}

.payment-method-card:hover {
  transform: translateY(-1px);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Custom scrollbar for modal content */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>