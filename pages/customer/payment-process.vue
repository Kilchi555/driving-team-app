<!-- pages/customer/payment-process.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-2">
    <div class="max-w-lg w-full">
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        
        <!-- Header -->
        <div class="flex justify-between items-center bg-blue-600 text-white p-2">
          <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <h1 class="text-2xl font-bold">Zahlungsübersicht</h1>
        </div>

            <button
                @click="router.push('/customer/payments')"
              :disabled="isProcessing"
              class="mt-2 w-full border text-gray-500 py-2 px-4 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <- Zurück
            </button>

        <!-- Loading State -->
        <div v-if="isLoading" class="p-6 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Lade Zahlungsdetails...</p>
        </div>

        <!-- Payment Details -->
        <div v-else-if="paymentDetails.length > 0" class="p-4">
          <!-- Summary Card -->
          <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6 border border-green-200">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Gesamtbetrag</h3>
                <p class="text-sm text-gray-600">{{ paymentDetails.length }} {{ paymentDetails.length === 1 ? 'Position' : 'Positionen' }}</p>
              </div>
              <div class="text-right">
                <p class="text-xl font-bold text-gray-900">CHF {{ totalAmount.toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <!-- Payment Items -->
          <div class="space-y-4 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Positionen</h3>
            
            <div v-for="(payment, index) in paymentDetails" :key="payment.id" 
                 class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              
              <!-- Appointment Info -->
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">
                    Termin mit {{ payment.staff?.first_name || 'Staff' }}
                  </h4>
                  <div class="flex items-center text-sm text-gray-600 mt-1">
                    {{ formatAppointmentDate(payment.appointments?.start_time) }} • {{ payment.appointments?.duration_minutes || payment.metadata?.duration || 45 }} Min
                  </div>
                </div>
                <div class="ml-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ payment.metadata?.category || payment.appointments?.type || 'B' }}
                  </span>
                </div>
              </div>

              <!-- Price Breakdown -->
              <div class="bg-gray-50 rounded-lg p-3 space-y-2">
                                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600 flex-1 mr-2">{{ getLessonTypeTitle(payment.appointments?.event_type_code) }}</span>
                    <span class="font-medium text-gray-600 whitespace-nowrap">CHF {{ (payment.lesson_price_rappen / 100).toFixed(2) }}</span>
                  </div>
                
                <!-- Administrationsgebühr -->
                <div v-if="payment.admin_fee_rappen && payment.admin_fee_rappen > 0" class="flex justify-between text-sm">
                  <span class="text-gray-600 flex-1 mr-2">Administrationsgebühr</span>
                  <span class="font-medium text-gray-600 whitespace-nowrap">CHF {{ (payment.admin_fee_rappen / 100).toFixed(2) }}</span>
                </div>

                <!-- Produkte -->
                <div v-if="payment.products && payment.products.length > 0" class="space-y-1">
                  <div v-for="product in payment.products" :key="product.id" class="flex justify-between text-sm">
                    <span class="text-gray-600 flex-1 mr-2">{{ product.name }}</span>
                    <span class="font-medium text-gray-600 whitespace-nowrap">CHF {{ (product.total_price_rappen / 100).toFixed(2) }}</span>
                  </div>
                </div>

                <!-- Rabatt -->
                <div v-if="payment.discount_amount_rappen && payment.discount_amount_rappen > 0" class="flex justify-between text-sm text-green-600">
                  <span class="flex-1 mr-2">Rabatt</span>
                  <span class="font-medium whitespace-nowrap">-CHF {{ (payment.discount_amount_rappen / 100).toFixed(2) }}</span>
                </div>

                <div class="flex justify-between text-gray-600 text-base font-semibold pt-2 border-t border-gray-300">
                  <span class="flex-1 mr-2">Zwischensumme</span>
                  <span class="whitespace-nowrap">CHF {{ (payment.total_amount_rappen / 100).toFixed(2) }}</span>
                </div>
              </div>

              <!-- Status -->
              <div class="mt-3 flex justify-between items-center">
                <span class="text-sm text-gray-500">Position {{ index + 1 }} von {{ paymentDetails.length }}</span>
                <span :class="getStatusClass(payment.payment_status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ getStatusLabel(payment.payment_status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Automatic Payment Info -->
          <div v-if="automaticPaymentBlocked" class="mb-6 p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
            <div class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="flex-1">
                <h4 class="font-semibold text-blue-900 mb-1">Automatische Zahlung aktiv</h4>
                <p class="text-sm text-blue-800">{{ automaticPaymentMessage }}</p>
                <p class="text-xs text-blue-700 mt-2">
                  Die Zahlung erfolgt automatisch von Ihrem hinterlegten Zahlungsmittel. Sie müssen nichts weiter tun.
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button
              @click="processPayment(true)"
              :disabled="isProcessing || automaticPaymentBlocked"
              class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isProcessing ? 'Verarbeitung...' : automaticPaymentBlocked ? 'Automatische Zahlung aktiv' : `CHF ${totalAmount.toFixed(2)} bezahlen` }}
            </button>
            
            <button
                @click="router.push('/customer/payments')"
              :disabled="isProcessing"
              class="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
          
          <!-- Payment Info -->
          <div class="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center space-x-2 text-sm">
              <span class="text-blue-600">💳</span>
              <span class="text-blue-800">
                <strong>Online-Zahlung:</strong> Du wirst zu Wallee weitergeleitet, wo Du zwischen verschiedenen Zahlungsmethoden auswählen kannst.
              </span>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6 text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Fehler beim Laden</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="router.push('/customer-dashboard')"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const router = useRouter()
const supabase = getSupabase()

// Props from URL
const paymentIds = computed(() => {
  const payments = route.query.payments as string
  return payments ? payments.split(',') : []
})

// State
const isLoading = ref(true)
const isProcessing = ref(false)
const error = ref('')
const paymentDetails = ref<any[]>([])
const automaticPaymentBlocked = ref(false)
const automaticPaymentMessage = ref('')




// Computed
const totalAmount = computed(() => {
  return paymentDetails.value.reduce((sum, payment) => {
    // ✅ total_amount_rappen enthält bereits alle Gebühren (lesson + admin + products - discount)
    return sum + (payment.total_amount_rappen ? payment.total_amount_rappen / 100 : 0)
  }, 0)
})

// Methods
// pages/customer/payment-process.vue - ändere loadPaymentDetails:
const loadPaymentDetails = async () => {
  try {
    isLoading.value = true
    
    // ✅ NEUE LOGIK: Lade sowohl payments als auch appointments
    let enrichedPayments = []
    
    // ✅ Lade event_types für korrekte Dauer-Einstellungen
    let eventTypes: Record<string, { default_duration_minutes: number }> = {}
    try {
      const { data: eventTypesData, error: eventTypesError } = await supabase
        .from('event_types')
        .select('code, default_duration_minutes')
        .eq('is_active', true)
      
      if (eventTypesError) {
        console.warn('⚠️ Could not load event types:', eventTypesError)
      } else if (eventTypesData) {
        eventTypesData.forEach(et => {
          eventTypes[et.code] = {
            default_duration_minutes: et.default_duration_minutes
          }
        })
        console.log('✅ Event types loaded:', eventTypes)
      }
    } catch (error) {
      console.warn('⚠️ Could not load event types:', error)
    }
    
    // ✅ PRÜFE TENANT SETTINGS: Automatische Zahlung aktiviert?
    let automaticPaymentEnabled = false
    let automaticPaymentHoursBefore = 24
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('auth_user_id', authUser.id)
          .single()
        
        if (userData?.tenant_id) {
          // Lade automatische Zahlungs-Einstellungen (zwei separate Queries für bessere Kompatibilität)
          const { data: enabledSetting } = await supabase
            .from('tenant_settings')
            .select('setting_value')
            .eq('tenant_id', userData.tenant_id)
            .eq('setting_key', 'automatic_payment_enabled')
            .eq('is_active', true)
            .maybeSingle()
          
          const { data: hoursSetting } = await supabase
            .from('tenant_settings')
            .select('setting_value')
            .eq('tenant_id', userData.tenant_id)
            .eq('setting_key', 'automatic_payment_hours_before')
            .eq('is_active', true)
            .maybeSingle()
          
          if (enabledSetting) {
            automaticPaymentEnabled = enabledSetting.setting_value === true || enabledSetting.setting_value === 'true'
          }
          
          if (hoursSetting) {
            automaticPaymentHoursBefore = Number(hoursSetting.setting_value) || 24
          }
          
          console.log('🔧 Automatic payment settings:', {
            enabled: automaticPaymentEnabled,
            hoursBefore: automaticPaymentHoursBefore
          })
        }
      }
    } catch (settingsError) {
      console.warn('⚠️ Could not load tenant settings:', settingsError)
    }
    
    // 1. Lade Payments mit Appointments (falls vorhanden)
    try {
              const { data: paymentsData, error: loadError } = await supabase
          .from('payments')
          .select(`
            *,
            appointments (
              id,
              title,
              start_time,
              end_time,
              duration_minutes,
              type,
              event_type_code,
              location_id,
              staff_id,
              status
            )
          `)
          .in('id', paymentIds.value)

      if (loadError) {
        console.warn('⚠️ Error loading payments:', loadError)
      } else if (paymentsData && paymentsData.length > 0) {
        console.log('✅ Payments loaded:', paymentsData.length)
        
        // Verarbeite payments
        for (const payment of paymentsData) {
          let products = []
          let staffData = null
          
          if (payment.appointments?.id) {
            // ✅ Load products via discount_sales -> product_sales chain
            const { data: discountSales, error: discountError } = await supabase
              .from('discount_sales')
              .select('id')
              .eq('appointment_id', payment.appointments.id)
              .maybeSingle()
            
            // Ignore 406 errors or missing data - discount_sales is optional
            if (!discountError && discountSales?.id) {
              const { data: productsData } = await supabase
                .from('product_sales')
                .select(`
                  id,
                  quantity,
                  unit_price_rappen,
                  total_price_rappen,
                  products (
                    name,
                    description
                  )
                `)
                .eq('product_sale_id', discountSales.id)
              
              products = productsData?.map((ps: any) => ({
                ...ps.products,
                id: ps.id,
                quantity: ps.quantity,
                unit_price_rappen: ps.unit_price_rappen,
                total_price_rappen: ps.total_price_rappen
              })) || []
            }
            
            // ✅ Load staff data
            if (payment.appointments.staff_id) {
              const { data: staffResult } = await supabase
                .from('users')
                .select('id, first_name, last_name')
                .eq('id', payment.appointments.staff_id)
                .single()
              staffData = staffResult
            }
          }
          
          // ✅ PRÜFUNG: Blockiere manuelle Zahlung wenn automatische Zahlung geplant ist
          if (automaticPaymentEnabled && payment.payment_method === 'wallee') {
            const appointment = payment.appointments
            if (appointment?.start_time && payment.scheduled_payment_date) {
              const appointmentStart = new Date(appointment.start_time)
              const scheduledPaymentDate = new Date(payment.scheduled_payment_date)
              const now = new Date()
              
              // Prüfe ob scheduled_payment_date in der Zukunft liegt (mehr als X Stunden vor Termin)
              if (scheduledPaymentDate > now && !payment.automatic_payment_processed) {
                const hoursUntilPayment = (scheduledPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
                const hoursUntilAppointment = (appointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60)
                
                console.log('🔒 Automatic payment scheduled:', {
                  paymentId: payment.id,
                  appointmentStart: appointmentStart.toISOString(),
                  scheduledPaymentDate: scheduledPaymentDate.toISOString(),
                  hoursUntilPayment: hoursUntilPayment.toFixed(1),
                  hoursUntilAppointment: hoursUntilAppointment.toFixed(1),
                  automaticPaymentEnabled
                })
                
                // ✅ Blockiere manuelle Zahlung wenn automatische Zahlung geplant ist
                // UND Termin ist mehr als X Stunden entfernt
                if (hoursUntilAppointment > automaticPaymentHoursBefore) {
                  automaticPaymentBlocked.value = true
                  const appointmentDateStr = appointmentStart.toLocaleDateString('de-CH', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  automaticPaymentMessage.value = `Diese Zahlung wird automatisch ${Math.round(hoursUntilPayment)} Stunden vor dem Termin (${appointmentDateStr}) abgebucht. Eine manuelle Zahlung ist nicht erforderlich, da der Termin noch mehr als ${automaticPaymentHoursBefore} Stunden entfernt ist.`
                }
              }
            }
          }
          
          enrichedPayments.push({
            ...payment,
            products,
            staff: staffData,
            source: 'payment'
          })
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load payments:', error)
    }

    // 2. Lade Appointments direkt (falls keine payments gefunden wurden)
    if (enrichedPayments.length === 0) {
      console.log('🔍 No payments found, loading appointments directly')
      
      try {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            title,
            start_time,
            end_time,
            duration_minutes,
            type,
            event_type_code,
            location_id,
            status,
            user_id,
            staff_id
          `)
          .in('id', paymentIds.value)
          .is('deleted_at', null)

        if (appointmentsError) {
          console.warn('⚠️ Error loading appointments:', appointmentsError)
        } else if (appointmentsData && appointmentsData.length > 0) {
          console.log('✅ Appointments loaded:', appointmentsData.length)
          
          // Konvertiere appointments zu payment-ähnlicher Struktur
          for (const appointment of appointmentsData) {
            // ✅ Load products via discount_sales -> product_sales chain
            let appointmentProducts = []
            const { data: discountSales, error: discountError } = await supabase
              .from('discount_sales')
              .select('id')
              .eq('appointment_id', appointment.id)
              .maybeSingle()
            
            // Ignore 406 errors or missing data - discount_sales is optional
            if (!discountError && discountSales?.id) {
              const { data: productsData } = await supabase
                .from('product_sales')
                .select(`
                  id,
                  quantity,
                  unit_price_rappen,
                  total_price_rappen,
                  products (
                    name,
                    description
                  )
                `)
                .eq('product_sale_id', discountSales.id)
              
              appointmentProducts = productsData?.map((ps: any) => ({
                ...ps.products,
                id: ps.id,
                quantity: ps.quantity,
                unit_price_rappen: ps.unit_price_rappen,
                total_price_rappen: ps.total_price_rappen
              })) || []
            }
            
            // ✅ Lade Staff-Daten für dieses Appointment
            let staffData = null
            if (appointment.staff_id) {
              const { data: staffResult } = await supabase
                .from('users')
                .select('id, first_name, last_name')
                .eq('id', appointment.staff_id)
                .single()
              staffData = staffResult
            }
            
            // ✅ Lade Rabatte für dieses Appointment
            const { data: discountsData } = await supabase
              .from('product_sales')
              .select(`
                id,
                discount_amount_rappen,
                discount_type,
                discount_reason
              `)
              .eq('appointment_id', appointment.id)
              .not('discount_amount_rappen', 'is', null)
              .gt('discount_amount_rappen', 0)
            
            const discounts = discountsData || []
            
            // ✅ Berechne echte Preise basierend auf Kategorie und Dauer
            const categoryPrices: Record<string, number> = {
              'B': 211, 'A': 211, 'A1': 211, 'BE': 267, 'C': 378, 'C1': 333,
              'D': 444, 'CE': 444, 'D1': 333, 'Motorboot': 267, 'BPT': 222
            }
            const category = appointment.type || 'B'
            const pricePerMinuteRappen = categoryPrices[category] || 211
            
            // ✅ Verwende korrekte Dauer basierend auf event_type_code
            let correctDuration = appointment.duration_minutes || 45
            if (appointment.event_type_code && eventTypes[appointment.event_type_code]) {
              correctDuration = eventTypes[appointment.event_type_code].default_duration_minutes
            }
            
            // ✅ Fallback: Verwende Standard-Dauern falls event_types nicht geladen werden konnten
            if (Object.keys(eventTypes).length === 0) {
              if (appointment.event_type_code === 'exam') {
                // Standard Exam-Dauern basierend auf Kategorie
                const standardExamDurations: Record<string, number> = {
                  'B': 135, 'A': 60, 'BE': 135, 'BPT': 135, 'C1D1': 195,
                  'C': 195, 'CE': 195, 'D': 240, 'Motorboot': 135
                }
                correctDuration = standardExamDurations[category] || 135
              } else if (appointment.event_type_code === 'lesson') {
                // Standard Lesson-Dauer ist 45 Min für alle Kategorien
                correctDuration = 45
              }
            }
            
            const lessonPriceRappen = Math.round(pricePerMinuteRappen * correctDuration)
            
            // ✅ Admin-Fee berechnen (nur bei bestimmten Kategorien)
            let adminFeeRappen = 0
            const motorcycleCategories = ['A', 'A1', 'A35kW']
            if (!motorcycleCategories.includes(category)) {
              const adminFeeCategories = ['B', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'Motorboot', 'BPT']
              if (adminFeeCategories.includes(category)) {
                // TODO: Admin-Fee nur beim 2. Termin pro Kategorie
                adminFeeRappen = 0
              }
            }
            
            // ✅ Produkte und Rabatte Gesamtbeträge
            const productsTotalRappen = appointmentProducts.reduce((sum, p) => sum + (p.total_price_rappen || 0), 0)
            const discountTotalRappen = discounts.reduce((sum, d) => sum + (d.discount_amount_rappen || 0), 0)
            
            // ✅ Gesamtpreis berechnen
            const totalAmountRappen = lessonPriceRappen + adminFeeRappen + productsTotalRappen - discountTotalRappen
            
            // Erstelle payment-ähnliche Struktur
            const appointmentPayment = {
              id: appointment.id,
              appointment_id: appointment.id,
              title: appointment.title,
              start_time: appointment.start_time,
              end_time: appointment.end_time,
              duration_minutes: correctDuration,
              type: appointment.type,
              location_id: appointment.location_id,
              status: appointment.status,
              user_id: appointment.user_id,
              staff_id: appointment.staff_id,
              lesson_price_rappen: lessonPriceRappen,
              admin_fee_rappen: adminFeeRappen,
              products_price_rappen: productsTotalRappen,
              discount_amount_rappen: discountTotalRappen,
              total_amount_rappen: totalAmountRappen,
              payment_method: 'pending',
              payment_status: 'pending',
              description: appointment.title || `Fahrstunde ${appointment.type || 'B'}`,
              products: appointmentProducts,
              discounts,
              staff: staffData,
              source: 'appointment'
            }
            
            enrichedPayments.push(appointmentPayment)
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not load appointments:', error)
      }
    }

    paymentDetails.value = enrichedPayments
    console.log('✅ Payment details loaded:', paymentDetails.value)

  } catch (err: any) {
    console.error('❌ Error loading payment details:', err)
    error.value = err.message || 'Fehler beim Laden der Zahlungsdetails'
  } finally {
    isLoading.value = false
  }
}

const processPayment = async (success: boolean) => {
  // ✅ PRÜFUNG: Blockiere wenn automatische Zahlung aktiv ist
  if (automaticPaymentBlocked.value) {
    alert(automaticPaymentMessage.value || 'Diese Zahlung wird automatisch verarbeitet. Eine manuelle Zahlung ist nicht erforderlich.')
    return
  }
  
  isProcessing.value = true
  
  try {
    console.log('🔄 Processing payment for IDs:', paymentIds.value)
    console.log('💰 Total amount:', totalAmount.value)
    
    // ✅ ZUSÄTZLICHE PRÜFUNG: Validiere dass keine automatische Zahlung geplant ist
    for (const payment of paymentDetails.value) {
      if (payment.scheduled_payment_date && payment.payment_method === 'wallee' && !payment.automatic_payment_processed) {
        const scheduledDate = new Date(payment.scheduled_payment_date)
        const now = new Date()
        
        if (scheduledDate > now) {
          const appointment = payment.appointments
          if (appointment?.start_time) {
            const appointmentStart = new Date(appointment.start_time)
            const hoursUntilAppointment = (appointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60)
            
            if (hoursUntilAppointment > 24) {
              throw new Error(
                `Eine automatische Zahlung ist bereits für diesen Termin geplant (${new Date(payment.scheduled_payment_date).toLocaleString('de-CH')}). ` +
                `Die Zahlung erfolgt automatisch. Eine manuelle Zahlung ist nicht erforderlich.`
              )
            }
          }
        }
      }
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    
    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, tenant_id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (userError || !userData) throw new Error('User data not found')
    
    // Create Wallee transaction
    interface WalleeResponse {
      success: boolean
      paymentUrl?: string
      transactionId?: number | string
      error?: string
    }
    
    const walleeResponse = await $fetch<WalleeResponse>('/api/wallee/create-transaction', {
      method: 'POST',
      body: {
        orderId: `payment-${paymentIds.value.join('-')}-${Date.now()}`,
        amount: totalAmount.value,
        currency: 'CHF',
        customerEmail: userData.email,
        customerName: `${userData.first_name} ${userData.last_name}`,
        description: `Zahlung für ${paymentDetails.value.length} Termin(e)`,
        successUrl: `${window.location.origin}/payment/success?payment_ids=${paymentIds.value.join(',')}`,
        failedUrl: `${window.location.origin}/payment/failed?payment_ids=${paymentIds.value.join(',')}`,
        // Pseudonyme Customer-ID Inputs
        userId: userData.id,
        tenantId: userData.tenant_id
      }
    })
    
    if (walleeResponse.success && walleeResponse.paymentUrl && walleeResponse.transactionId) {
      // Update all payments with Wallee transaction ID before redirect
      console.log('💾 Saving Wallee transaction ID to payments:', walleeResponse.transactionId)
      
      for (const paymentId of paymentIds.value) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            wallee_transaction_id: walleeResponse.transactionId.toString(),
            metadata: {
              ...paymentDetails.value.find(p => p.id === paymentId)?.metadata,
              wallee_transaction_id: walleeResponse.transactionId
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentId)
        
        if (updateError) {
          console.error('❌ Error updating payment with transaction ID:', updateError)
        }
      }
      
      console.log('✅ All payments updated with transaction ID')
      
      // Redirect to Wallee payment page
      window.location.href = walleeResponse.paymentUrl
    } else {
      throw new Error(walleeResponse.error || 'Wallee transaction failed')
    }
    
  } catch (error) {
    console.error('Payment error:', error)
    await router.push(`/payment/failed?transaction_id=${paymentIds.value[0]}`)
  } finally {
    isProcessing.value = false
  }
}

const formatAppointmentDate = (dateString: string): string => {
  if (!dateString) return '-'
  
  // Da die DB lokale Zeit speichert, aber das Format UTC suggeriert,
  // müssen wir das Datum explizit als lokale Zeit behandeln
  
  // Entferne das +00:00 und behandle es als lokale Zeit
  const localDateString = dateString.replace('+00:00', '').replace('Z', '')
  const date = new Date(localDateString)
  
  // Prüfe ob das Datum gültig ist
  if (isNaN(date.getTime())) return '-'
  
  // Extrahiere die lokalen Komponenten direkt
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  
  // Wochentag auf Deutsch
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const weekday = weekdays[date.getDay()]
  
  // Formatiere: "Sa., 23.08.2025, 22:00"
  return `${weekday}., ${day}.${month}.${year}, ${hour}:${minute}`
}

const getLessonTypeTitle = (eventTypeCode: string): string => {
  const titles: Record<string, string> = {
    'exam': 'Prüfungsfahrt inkl. WarmUp und Rückfahrt',
    'theory': 'Theorielektion',
    'lesson': 'Fahrlektion'
  }
  return titles[eventTypeCode] || 'Fahrlektion'
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'B': 'Auto B',
    'A1': 'Motorrad A1',
    'A35kW': 'Motorrad A (35kW)',
    'A': 'Motorrad A',
    'BE': 'Auto BE',
    'C1': 'LKW C1',
    'D1': 'Bus D1',
    'C': 'LKW C',
    'CE': 'LKW CE',
    'D': 'Bus D',
    'Motorboot': 'Motorboot',
    'BPT': 'Berufspraxis'
  }
  return labels[category] || category
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending': 'Offen',
    'completed': 'Bezahlt',
    'failed': 'Fehlgeschlagen',
    'cancelled': 'Storniert'
  }
  return labels[status] || status
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

// Lifecycle
onMounted(() => {
  if (paymentIds.value.length === 0) {
    error.value = 'Keine Zahlungs-IDs gefunden'
    isLoading.value = false
    return
  }
  
  loadPaymentDetails()
})
</script>