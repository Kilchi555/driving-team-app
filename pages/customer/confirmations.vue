<!-- pages/customer/confirmations.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div class="flex items-center space-x-4">
            <button
              @click="navigateTo('/customer-dashboard')"
              class="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Termine bestätigen</h1>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <LoadingLogo size="xl" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-l-4 border-red-400 rounded-lg p-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-red-800">Fehler beim Laden</h3>
            <p class="mt-2 text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>


      <!-- No Confirmations -->
      <div v-if="pendingConfirmations.length === 0" class="text-center py-12">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Alle Termine bestätigt</h3>
        <p class="text-gray-600 mb-6">Du hast alle deine Termine bestätigt. Neue Termine werden hier angezeigt, sobald sie erstellt wurden.</p>
        <button
          @click="navigateTo('/customer-dashboard')"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Zum Dashboard
        </button>
      </div>

      <!-- Confirmations List -->
      <div v-if="pendingConfirmations.length > 0" class="space-y-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-blue-800 text-sm">
              <strong>Bestätige deine Termine:</strong> Nach der Bestätigung wird die Zahlung automatisch über deine hinterlegte Zahlungsmethode abgewickelt.
            </p>
          </div>
        </div>

        <div v-for="appointment in pendingConfirmations" :key="appointment.id" 
             class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          
          <!-- Appointment Header -->
          <div class="p-6 border-b border-gray-200">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">
                  {{ appointment.title || `${getLessonTypeTitle(appointment.event_type_code)} ${appointment.type}` }}
                </h3>
                <div class="flex items-center text-sm text-gray-600 space-x-4">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ formatAppointmentDate(appointment.start_time) }}
                  </div>
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ appointment.duration_minutes }} Min
                  </div>
                  <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ appointment.type }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Price Breakdown -->
          <div class="p-6 bg-gray-50">
            <h4 class="text-sm font-medium text-gray-900 mb-3">Kostenübersicht</h4>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">{{ getLessonTypeTitle(appointment.event_type_code) }}</span>
                <span class="font-medium text-gray-900">CHF {{ (appointment.lesson_price_rappen / 100).toFixed(2) }}</span>
              </div>
              
              <div v-if="appointment.admin_fee_rappen && appointment.admin_fee_rappen > 0" class="flex justify-between text-sm">
                <span class="text-gray-600">Administrationsgebühr</span>
                <span class="font-medium text-gray-900">CHF {{ (appointment.admin_fee_rappen / 100).toFixed(2) }}</span>
              </div>

              <div v-if="appointment.products && appointment.products.length > 0" class="space-y-1">
                <div v-for="product in appointment.products" :key="product.id" class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ product.name }}</span>
                  <span class="font-medium text-gray-900">CHF {{ (product.total_price_rappen / 100).toFixed(2) }}</span>
                </div>
              </div>

              <div v-if="appointment.discount_amount_rappen && appointment.discount_amount_rappen > 0" class="flex justify-between text-sm text-green-600">
                <span>Rabatt</span>
                <span class="font-medium">-CHF {{ (appointment.discount_amount_rappen / 100).toFixed(2) }}</span>
              </div>

              <div class="flex justify-between text-base font-semibold pt-2 border-t border-gray-300">
                <span class="text-gray-900">Gesamtbetrag</span>
                <span class="text-gray-900">CHF {{ (appointment.total_amount_rappen / 100).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="p-6 bg-white">
            <div class="flex space-x-3">
              <button
                @click="confirmAppointment(appointment.id)"
                :disabled="isProcessing || isPaymentProcessing"
                class="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ (isProcessing || isPaymentProcessing) ? 'Wird verarbeitet...' : `Termin bestätigen (CHF ${(appointment.total_amount_rappen / 100).toFixed(2)})` }}
              </button>
              
              <button
                @click="declineAppointment(appointment.id)"
                :disabled="isProcessing"
                class="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useAutoPayment } from '~/composables/useAutoPayment'
import { useAnalytics } from '~/composables/useAnalytics'

// Composables
const authStore = useAuthStore()
const { user: currentUser, isClient } = storeToRefs(authStore)
const supabase = getSupabase()
const { trackAppointmentCreated, trackPaymentProcessed } = useAnalytics()
const { processAutomaticPayment, isProcessing: isPaymentProcessing } = useAutoPayment()

// State
const isLoading = ref(true)
const isProcessing = ref(false)
const error = ref<string | null>(null)
const appointments = ref<any[]>([])

// Computed
const pendingConfirmations = computed(() => {
  return appointments.value?.filter(apt => 
    apt.status === 'pending_confirmation' || 
    apt.status === 'confirmed' || 
    apt.status === 'scheduled'
  ) || []
})

// Methods
const loadAppointments = async () => {
  if (!currentUser.value?.id) return

  try {
    isLoading.value = true
    
    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', currentUser.value.id)
      .single()
    
    if (userError) throw userError
    if (!userData) throw new Error('User nicht in Datenbank gefunden')

    console.log('🔍 Loading appointments for confirmations:', userData.id)

    // Erst alle Termine laden um Status zu debuggen
    const { data: allAppointments, error: allAppointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        type,
        event_type_code,
        user_id,
        staff_id
      `)
      .eq('user_id', userData.id)
      .is('deleted_at', null)
      .order('start_time', { ascending: true })

    if (allAppointmentsError) throw allAppointmentsError
    console.log('🔍 ALL appointments for user:', allAppointments?.map(apt => ({
      id: apt.id,
      title: apt.title,
      status: apt.status,
      start_time: apt.start_time
    })))

    // Dann nur Termine filtern die bestätigt werden müssen
    // TEMPORÄR: Auch 'scheduled' und 'confirmed' Termine anzeigen für Testing
    const appointmentsData = allAppointments?.filter(apt => 
      apt.status === 'pending_confirmation' || 
      apt.status === 'confirmed' || 
      apt.status === 'scheduled'
    ) || []

    console.log('✅ Pending confirmations loaded:', appointmentsData?.length || 0)

    // Berechne Preise für jeden Termin
    const appointmentsWithPrices = (appointmentsData || []).map(appointment => {
      // Preisberechnung basierend auf Kategorie und Dauer
      const categoryPrices: Record<string, number> = {
        'B': 211, 'A': 211, 'A1': 211, 'BE': 267, 'C': 378, 'C1': 333,
        'D': 444, 'CE': 444, 'D1': 333, 'Motorboot': 267, 'BPT': 222
      }
      const category = appointment.type || 'B'
      const pricePerMinuteRappen = categoryPrices[category] || 211
      const duration = appointment.duration_minutes || 45
      
      const lessonPriceRappen = Math.round(pricePerMinuteRappen * duration)
      
      // Admin-Fee berechnen (nur bei bestimmten Kategorien)
      let adminFeeRappen = 0
      const motorcycleCategories = ['A', 'A1', 'A35kW']
      if (!motorcycleCategories.includes(category)) {
        const adminFeeCategories = ['B', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'Motorboot', 'BPT']
        if (adminFeeCategories.includes(category)) {
          // TODO: Admin-Fee nur beim 2. Termin pro Kategorie
          adminFeeRappen = 0
        }
      }
      
      const totalAmountRappen = lessonPriceRappen + adminFeeRappen
      
      return {
        ...appointment,
        lesson_price_rappen: lessonPriceRappen,
        admin_fee_rappen: adminFeeRappen,
        total_amount_rappen: totalAmountRappen
      }
    })

    appointments.value = appointmentsWithPrices

  } catch (err: any) {
    console.error('❌ Error loading appointments:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const confirmAppointment = async (appointmentId: string) => {
  isProcessing.value = true
  
  try {
    console.log('✅ Confirming appointment:', appointmentId)
    
    // 1. Update appointment status to confirmed
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
    
    if (updateError) throw updateError

    // Track appointment confirmation
    await trackAppointmentCreated(appointmentId, 'lesson', appointment.duration_minutes)
    
    // 2. Create payment record
    const appointment = appointments.value.find(apt => apt.id === appointmentId)
    if (appointment) {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointmentId,
          user_id: appointment.user_id,
          lesson_price_rappen: appointment.lesson_price_rappen || 0,
          admin_fee_rappen: appointment.admin_fee_rappen || 0,
          total_amount_rappen: appointment.total_amount_rappen || 0,
          payment_method: 'wallee',
          payment_status: 'pending',
          description: appointment.title || `Fahrstunde ${appointment.type}`
        })
      
      if (paymentError) throw paymentError
    }
    
    // 3. Remove from local list
    appointments.value = appointments.value.filter(apt => apt.id !== appointmentId)
    
    console.log('✅ Appointment confirmed and payment created')
    
    // 4. Trigger automatic payment processing
    try {
      await processAutomaticPayment(appointmentId)
      console.log('✅ Automatic payment processing started')
      
      // Track payment processing
      await trackPaymentProcessed(appointmentId, appointment.total_amount_rappen / 100, 'wallee', true)
    } catch (paymentErr) {
      console.error('❌ Automatic payment failed:', paymentErr)
      // Track failed payment
      await trackPaymentProcessed(appointmentId, appointment.total_amount_rappen / 100, 'wallee', false)
      // Payment failed, but appointment is still confirmed
      // User can pay manually later
    }
    
  } catch (err: any) {
    console.error('❌ Error confirming appointment:', err)
    error.value = err.message
  } finally {
    isProcessing.value = false
  }
}

const declineAppointment = async (appointmentId: string) => {
  isProcessing.value = true
  
  try {
    console.log('❌ Declining appointment:', appointmentId)
    
    // Update appointment status to cancelled
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
    
    if (updateError) throw updateError
    
    // Remove from local list
    appointments.value = appointments.value.filter(apt => apt.id !== appointmentId)
    
    console.log('✅ Appointment declined')
    
  } catch (err: any) {
    console.error('❌ Error declining appointment:', err)
    error.value = err.message
  } finally {
    isProcessing.value = false
  }
}

const formatAppointmentDate = (dateString: string): string => {
  if (!dateString) return '-'
  
  const localDateString = dateString.replace('+00:00', '').replace('Z', '')
  const date = new Date(localDateString)
  
  if (isNaN(date.getTime())) return '-'
  
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const weekday = weekdays[date.getDay()]
  
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

// Lifecycle
onMounted(async () => {
  if (!isClient.value) {
    await navigateTo('/')
    return
  }
  
  await loadAppointments()
})
</script>
