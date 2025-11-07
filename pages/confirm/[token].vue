<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
    <div v-if="isLoading" class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Lade Termindaten...</p>
    </div>

    <div v-else-if="error" class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-gray-900">Fehler</h2>
        <p class="mt-2 text-gray-600">{{ error }}</p>
      </div>
    </div>

    <div v-else-if="appointment && !isConfirmed" class="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-blue-600 text-white px-6 py-4">
        <h1 class="text-2xl font-bold">Terminbestätigung</h1>
        <p class="mt-1 text-blue-100">Bitte bestätigen Sie Ihren Termin</p>
      </div>

      <!-- Appointment Details -->
      <div class="px-6 py-6">
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Termindetails</h2>
          <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Datum & Zeit</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDateTime(appointment.start_time) }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Dauer</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ appointment.duration_minutes }} Minuten</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Fahrlehrer</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ appointment.staff_name || 'Wird zugewiesen' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Betrag</dt>
              <dd class="mt-1 text-lg font-semibold text-gray-900">CHF {{ formatPrice(appointment.total_amount_rappen) }}</dd>
            </div>
          </dl>
        </div>

        <!-- Payment Information -->
        <div v-if="automaticPaymentEnabled" class="border-2 border-blue-200 rounded-lg p-4 mb-6 bg-blue-50">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Zahlung</h3>
          
          <!-- Case 1: No payment method - immediate payment with tokenization -->
          <div v-if="paymentMethods.length === 0" class="space-y-3">
            <p class="text-sm text-gray-700">
              Um Ihren Termin zu bestätigen, wird der Betrag von <strong>CHF {{ formatPrice(appointment.total_amount_rappen) }}</strong> 
              jetzt direkt abgebucht. Bei dieser Zahlung wird Ihr Zahlungsmittel automatisch für zukünftige automatische Abbuchungen gespeichert.
            </p>
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
              <p class="text-xs text-green-800">
                <strong>✓ Sicherheit:</strong> Ihre Zahlungsdaten werden sicher bei Wallee gespeichert (PCI-DSS compliant). 
                Bei zukünftigen Terminen wird der Betrag automatisch {{ automaticPaymentHoursBefore }} Stunden vor dem Termin abgebucht.
              </p>
            </div>
            <button
              @click="processImmediatePaymentWithTokenization"
              :disabled="isProcessing"
              class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isProcessing">Wird verarbeitet...</span>
              <span v-else>Jetzt CHF {{ formatPrice(appointment.total_amount_rappen) }} bezahlen & Termin bestätigen</span>
            </button>
          </div>

          <!-- Case 2: Has payment method - automatic payment (always enabled) -->
          <div v-else class="space-y-3">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p class="text-sm text-blue-800">
                <strong>✓ Automatische Zahlung aktiviert:</strong> Der Betrag von CHF {{ formatPrice(appointment.total_amount_rappen) }} 
                wird automatisch {{ automaticPaymentHoursBefore }} Stunden vor dem Termin von Ihrem hinterlegten Zahlungsmittel abgebucht.
              </p>
            </div>

            <!-- Payment Method Selection (automatic) -->
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Zahlungsmittel (automatisch ausgewählt)
              </label>
              
              <div class="space-y-2">
                <div
                  v-for="method in paymentMethods"
                  :key="method.id"
                  class="flex items-center p-3 border rounded-lg"
                  :class="selectedPaymentMethodId === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'"
                >
                  <input
                    type="radio"
                    :value="method.id"
                    v-model="selectedPaymentMethodId"
                    class="mr-3"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-gray-900">{{ method.display_name }}</div>
                    <div class="text-xs text-gray-500">
                      {{ method.payment_method_type || 'Karte' }}
                      <span v-if="method.expires_at"> • Läuft ab {{ formatDate(method.expires_at) }}</span>
                    </div>
                    <div class="text-xs text-green-600 mt-1">✓ Sicher gespeichert bei Wallee</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Confirm Button -->
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            @click="confirmAppointment"
            :disabled="isProcessing || (automaticPaymentEnabled && paymentMethods.length > 0 && !selectedPaymentMethodId)"
            class="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isProcessing">Wird verarbeitet...</span>
            <span v-else>Termin bestätigen</span>
          </button>
          <button
            @click="declineAppointment"
            :disabled="isProcessing"
            class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Ablehnen
          </button>
        </div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="isConfirmed" class="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
      <svg class="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 class="mt-4 text-2xl font-bold text-gray-900">Termin bestätigt!</h2>
      <p class="mt-2 text-gray-600">Ihr Termin wurde erfolgreich bestätigt.</p>
      <button
        @click="goToDashboard"
        class="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Zum Dashboard
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'

definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()
const token = route.params.token as string

const isLoading = ref(true)
const error = ref<string | null>(null)
const appointment = ref<any>(null)
const isConfirmed = ref(false)
const isProcessing = ref(false)
const automaticPaymentEnabled = ref(false)
const automaticPaymentHoursBefore = ref(24)
const paymentMethods = ref<any[]>([])
const selectedPaymentMethodId = ref<string | null>(null)

const loadAppointment = async () => {
  try {
    const supabase = getSupabase()
    
    // Load appointment by confirmation token (you'll need to add this field)
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        users!user_id (id, first_name, last_name, email),
        staff:users!staff_id (id, first_name, last_name)
      `)
      .eq('confirmation_token', token)
      .is('deleted_at', null)
      .maybeSingle()

    if (appointmentError) throw appointmentError
    
    if (!appointmentData) {
      error.value = 'Termin nicht gefunden oder bereits bestätigt/abgelehnt.'
      return
    }

    // ✅ Lade Payment für diesen Termin um den Betrag zu erhalten
    let totalAmountRappen = 0
    const { data: paymentData } = await supabase
      .from('payments')
      .select('total_amount_rappen')
      .eq('appointment_id', appointmentData.id)
      .maybeSingle()
    
    if (paymentData?.total_amount_rappen) {
      totalAmountRappen = paymentData.total_amount_rappen
    } else {
      // Falls kein Payment existiert, berechne basierend auf Pricing Rules
      // Fallback: 85 CHF für eine Fahrstunde
      totalAmountRappen = 8500
    }

    appointment.value = {
      ...appointmentData,
      staff_name: appointmentData.staff 
        ? `${appointmentData.staff.first_name} ${appointmentData.staff.last_name}`
        : null,
      total_amount_rappen: totalAmountRappen
    }

    // Load tenant payment settings
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', appointmentData.tenant_id)
      .single()

    if (tenantData) {
      const { data: paymentSettings } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantData.id)
        .eq('category', 'payment')
        .eq('setting_key', 'payment_settings')
        .maybeSingle()

      if (paymentSettings?.setting_value) {
        const settings = typeof paymentSettings.setting_value === 'string'
          ? JSON.parse(paymentSettings.setting_value)
          : paymentSettings.setting_value
        
        automaticPaymentEnabled.value = settings.automatic_payment_enabled || false
        automaticPaymentHoursBefore.value = settings.automatic_payment_hours_before || 24
      }
    }

    // Load customer payment methods if automatic payment is enabled
    // ✅ WICHTIG: Lade Wallee-Token aus unserer Datenbank (keine sensiblen Daten!)
    if (automaticPaymentEnabled.value && appointmentData.user_id) {
      await loadPaymentMethods(appointmentData.user_id)
    }

    // ✅ Done loading
    isLoading.value = false

  } catch (err: any) {
    console.error('Error loading appointment:', err)
    error.value = err.message || 'Fehler beim Laden des Termins'
    // Nur isLoading auf false setzen wenn nicht bereits bestätigt
    if (!isConfirmed.value) {
      isLoading.value = false
    }
  }
}

const loadPaymentMethods = async (userId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error: methodsError } = await supabase
      .from('customer_payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (methodsError) {
      console.warn('Error loading payment methods:', methodsError)
      return
    }

    paymentMethods.value = data || []
    
    // ✅ Automatisch Standard-Zahlungsmittel auswählen (wichtig für automatische Zahlung)
    const defaultMethod = paymentMethods.value.find(m => m.is_default)
    if (defaultMethod) {
      selectedPaymentMethodId.value = defaultMethod.id
    } else if (paymentMethods.value.length > 0) {
      selectedPaymentMethodId.value = paymentMethods.value[0].id
    }
    
    console.log('✅ Payment methods loaded:', {
      count: paymentMethods.value.length,
      selectedId: selectedPaymentMethodId.value,
      methods: paymentMethods.value.map(m => ({ id: m.id, display_name: m.display_name, is_default: m.is_default }))
    })
  } catch (err) {
    console.error('Error loading payment methods:', err)
  }
}

const confirmAppointment = async () => {
  if (!appointment.value) return
  
  // ✅ Automatische Zahlung ist IMMER aktiviert wenn automaticPaymentEnabled = true
  if (automaticPaymentEnabled.value && paymentMethods.value.length > 0 && !selectedPaymentMethodId.value) {
    alert('Bitte wählen Sie ein Zahlungsmittel aus.')
    return
  }

  isProcessing.value = true

  try {
    const supabase = getSupabase()
    
    // ✅ Calculate scheduled payment date - automatisch aktiviert wenn automaticPaymentEnabled = true
    let scheduledPaymentDate: string | null = null
    let shouldProcessImmediately = false
    
    // ✅ Automatische Zahlung ist aktiviert wenn:
    // 1. automaticPaymentEnabled = true UND
    // 2. (paymentMethods.length > 0 UND selectedPaymentMethodId gesetzt) ODER paymentMethods.length = 0 (wird bei Zahlung gespeichert)
    const willUseAutomaticPayment = automaticPaymentEnabled.value && (
      (paymentMethods.value.length > 0 && selectedPaymentMethodId.value) ||
      paymentMethods.value.length === 0 // Wird bei erster Zahlung gespeichert
    )
    
    if (willUseAutomaticPayment) {
      const appointmentDate = new Date(appointment.value.start_time)
      const hoursBefore = automaticPaymentHoursBefore.value || 24
      const now = new Date()
      
      // Berechne theoretisches scheduled_payment_date
      const theoreticalScheduledDate = new Date(
        appointmentDate.getTime() - (hoursBefore * 60 * 60 * 1000)
      )
      
      // ✅ PROBLEM BEHOBEN: Wenn Bestätigung zu spät kommt (weniger als hoursBefore vor Termin)
      // → Zahlung wird SOFORT ausgelöst, nicht später
      
      if (theoreticalScheduledDate < now) {
        // Zahlung wäre bereits fällig gewesen → SOFORT verarbeiten
        shouldProcessImmediately = true
        scheduledPaymentDate = now.toISOString() // Setze auf jetzt für sofortige Verarbeitung
      } else {
        // Normal: Zahlung ist in der Zukunft
        scheduledPaymentDate = theoreticalScheduledDate.toISOString()
      }
      
      console.log('💰 Scheduled payment date calculated:', {
        appointmentDate: appointmentDate.toISOString(),
        hoursBefore,
        theoreticalScheduledDate: theoreticalScheduledDate.toISOString(),
        now: now.toISOString(),
        finalScheduledDate: scheduledPaymentDate,
        shouldProcessImmediately,
        isTooLate: theoreticalScheduledDate < now
      })
      
      // Speichere Flag für sofortige Verarbeitung
      if (shouldProcessImmediately) {
        console.log('⚡ Payment will be processed immediately (confirmation too late)')
      }
    }

    // Update appointment (nur Status)
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment.value.id)

    if (updateError) throw updateError

    // ✅ Erstelle/Update Payment-Record - automatische Zahlung ist immer aktiviert wenn automaticPaymentEnabled = true
    if (willUseAutomaticPayment && scheduledPaymentDate) {
      try {
        // ✅ PRÜFUNG: Prüfe ob bereits ein Payment mit anderer Zahlungsmethode existiert
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id, payment_method, payment_status')
          .eq('appointment_id', appointment.value.id)
          .maybeSingle()

        if (existingPayment) {
          // Payment existiert bereits - prüfe auf inkompatible Zahlungsmethode
          if (existingPayment.payment_method && existingPayment.payment_method !== 'wallee') {
            // Staff hat bereits cash/invoice gewählt - automatische Zahlung nicht möglich
            console.warn('⚠️ Payment already exists with method:', existingPayment.payment_method)
            alert(`Automatische Zahlung nicht möglich: Zahlungsmethode wurde bereits auf "${existingPayment.payment_method === 'cash' ? 'Bar' : 'Rechnung'}" gesetzt.`)
            isConfirmed.value = true // Termin trotzdem als bestätigt markieren
            return
          }

          // Aktualisiere vorhandenes Payment - automatische Zahlung aktivieren
          const updateData: any = {
            payment_method: 'wallee',
            automatic_payment_consent: true,
            automatic_payment_consent_at: new Date().toISOString(),
            scheduled_payment_date: scheduledPaymentDate,
            automatic_payment_processed: false,
            updated_at: new Date().toISOString()
          }
          
          // Nur payment_method_id setzen wenn vorhanden (bei erster Zahlung wird es später gesetzt)
          if (selectedPaymentMethodId.value) {
            updateData.payment_method_id = selectedPaymentMethodId.value
          }
          
          const { error: updateError } = await supabase
            .from('payments')
            .update(updateData)
            .eq('id', (existingPayment as { id: string }).id)

          if (updateError) {
            throw new Error('Fehler beim Aktualisieren der Zahlung: ' + updateError.message)
          }

          console.log('✅ Existing payment updated for automatic collection')
          isConfirmed.value = true
          return
        }

        // Hole Appointment-Details für Preisberechnung
        const { data: appointmentDetails } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointment.value.id)
          .single()

        if (!appointmentDetails) {
          throw new Error('Appointment details not found')
        }

        // Berechne Preis (vereinfacht - könnte aus appointment.metadata oder separater Tabelle kommen)
        // TODO: Richte echte Preisberechnung ein
        const estimatedPriceRappen = 8500 // Fallback: 85 CHF (sollte aus appointment oder pricing rules kommen)

        // Erstelle Payment mit automatischen Zahlungsfeldern
        const paymentInsertData: any = {
          appointment_id: appointment.value.id,
          user_id: appointment.value.user_id,
          staff_id: appointmentDetails.staff_id || null,
          total_amount_rappen: estimatedPriceRappen,
          payment_method: 'wallee',
          payment_status: 'pending',
          automatic_payment_consent: true,
          automatic_payment_consent_at: new Date().toISOString(),
          scheduled_payment_date: scheduledPaymentDate,
          automatic_payment_processed: false,
          currency: 'CHF',
          description: `Automatische Zahlung für Termin: ${appointmentDetails.title || 'Fahrstunde'}`,
          metadata: {
            confirmation_token: appointment.value.confirmation_token,
            confirmed_at: new Date().toISOString(),
            scheduled_for: scheduledPaymentDate
          }
        }
        
        // Nur payment_method_id setzen wenn vorhanden (bei erster Zahlung wird es später gesetzt)
        if (selectedPaymentMethodId.value) {
          paymentInsertData.payment_method_id = selectedPaymentMethodId.value
        }
        
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert(paymentInsertData)
          .select()
          .single()

        if (paymentError) {
          console.error('❌ Error creating payment:', paymentError)
          throw new Error('Fehler beim Erstellen der Zahlung: ' + paymentError.message)
        }

        console.log('✅ Payment created for automatic collection:', paymentData.id)

        // ✅ SOFORTIGE VERARBEITUNG: Wenn Bestätigung zu spät kommt (< hoursBefore vor Termin)
        if (shouldProcessImmediately) {
          console.log('⚡ Processing payment immediately...')
          
          try {
            // Rufe API auf, um Zahlung sofort zu verarbeiten
            const immediateResult = await $fetch('/api/payments/process-immediate', {
              method: 'POST',
              body: {
                paymentId: paymentData.id
              }
            }) as { success?: boolean; error?: string }

            if (immediateResult.success) {
              console.log('✅ Immediate payment processed successfully:', immediateResult)
              
              // Zeige Erfolgsmeldung
              alert('Termin bestätigt! Die Zahlung wurde sofort verarbeitet, da die Bestätigung weniger als ' + 
                    (automaticPaymentHoursBefore.value || 24) + ' Stunden vor dem Termin erfolgte.')
            } else {
              console.warn('⚠️ Immediate payment processing returned:', immediateResult)
              alert('Termin bestätigt. Die Zahlung wird in Kürze verarbeitet.')
            }

          } catch (immediateErr: any) {
            console.error('❌ Error processing immediate payment:', immediateErr)
            // Nicht kritisch - Payment wurde erstellt, wird später via Cron verarbeitet
            alert('Termin bestätigt. Die automatische Zahlung wird in Kürze verarbeitet.')
          }
        }

      } catch (paymentErr: any) {
        console.error('❌ Error creating payment record:', paymentErr)
        // Nicht kritisch - Appointment ist trotzdem bestätigt
        alert('Warnung: Zahlung konnte nicht vorbereitet werden. Bitte kontaktieren Sie den Fahrlehrer.')
      }
    }

    isConfirmed.value = true

  } catch (err: any) {
    console.error('Error confirming appointment:', err)
    alert('Fehler bei der Bestätigung: ' + (err.message || 'Unbekannter Fehler'))
  } finally {
    isProcessing.value = false
  }
}

const declineAppointment = async () => {
  if (!appointment.value) return
  if (!confirm('Möchten Sie den Termin wirklich ablehnen?')) return

  isProcessing.value = true

  try {
    const supabase = getSupabase()
    
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment.value.id)

    if (updateError) throw updateError

    alert('Termin wurde abgelehnt.')
    await navigateTo('/')

  } catch (err: any) {
    console.error('Error declining appointment:', err)
    alert('Fehler beim Ablehnen: ' + (err.message || 'Unbekannter Fehler'))
  } finally {
    isProcessing.value = false
  }
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('de-CH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = (rappen: number | null | undefined) => {
  if (!rappen || rappen === 0) return '0.00'
  return (rappen / 100).toFixed(2)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    month: '2-digit',
    year: 'numeric'
  })
}

// ✅ NEUE FUNKTION: Sofortige Zahlung mit Tokenization (wenn kein Zahlungsmittel vorhanden)
const processImmediatePaymentWithTokenization = async () => {
  if (!appointment.value) return
  
  isProcessing.value = true
  
  try {
    const supabase = getSupabase()
    
    // ✅ Erstelle Wallee-Transaktion mit Tokenization für sofortige Zahlung
    type WalleeResponse = { success?: boolean; paymentUrl?: string; transactionId?: number | string; error?: string }
    const response = await $fetch<WalleeResponse>('/api/wallee/create-transaction', {
      method: 'POST',
      body: {
        orderId: `appointment-${appointment.value.id}-${Date.now()}`,
        amount: appointment.value.total_amount_rappen / 100, // Von Rappen zu CHF
        currency: 'CHF',
        customerEmail: (appointment.value.users as any)?.email || '',
        customerName: `${(appointment.value.users as any)?.first_name || ''} ${(appointment.value.users as any)?.last_name || ''}`.trim(),
        description: `Termin: ${appointment.value.title || 'Fahrstunde'}`,
        successUrl: `${window.location.origin}/confirm/${token}?payment=success`,
        failedUrl: `${window.location.origin}/confirm/${token}?payment=failed`,
        // Für pseudonyme Customer-ID
        userId: (appointment.value.users as any)?.id,
        tenantId: appointment.value.tenant_id,
        tokenizationEnabled: true, // ✅ WICHTIG: Tokenization aktivieren
        isTokenizationOnly: false // ✅ Echte Zahlung, nicht nur Tokenization
      }
    })
    
    if (response.success && response.paymentUrl) {
      // 🔗 Bestehendes Payment mit Wallee Transaction ID verknüpfen
      try {
        const supabase = getSupabase()
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('appointment_id', appointment.value.id)
          .maybeSingle()

        if (existingPayment && response.transactionId) {
          await supabase
            .from('payments')
            .update({
              wallee_transaction_id: response.transactionId.toString(),
              payment_method: 'wallee',
              updated_at: new Date().toISOString()
            })
            .eq('id', (existingPayment as { id: string }).id)
        }
      } catch (linkErr) {
        console.warn('⚠️ Could not link transaction to payment (non-critical):', linkErr)
      }
      // Weiterleitung zu Wallee - nach erfolgreicher Zahlung:
      // 1. Token wird automatisch gespeichert (via Webhook)
      // 2. Payment wird erstellt (via Webhook oder Return-URL)
      // 3. Appointment wird bestätigt
      window.location.href = response.paymentUrl
    } else {
      throw new Error(response.error || 'Fehler beim Erstellen der Zahlung')
    }
    
  } catch (err: any) {
    console.error('Error processing immediate payment:', err)
    alert('Fehler bei der Zahlung: ' + err.message)
  } finally {
    isProcessing.value = false
  }
}

const goToDashboard = () => {
  navigateTo('/customer-dashboard')
}

// ✅ Verarbeite Return-URL nach Wallee-Zahlung
const handlePaymentReturn = async () => {
  const paymentStatus = route.query.payment as string | undefined
  
  if (!paymentStatus) return
  
  isLoading.value = true
  
  try {
    if (paymentStatus === 'success') {
      console.log('✅ Payment return detected: success')
      
      // Lade Appointment zuerst, damit wir die ID haben
      const supabase = getSupabase()
      const { data: appointmentData, error: aptError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('confirmation_token', token)
        .maybeSingle()
      
      if (aptError || !appointmentData) {
        console.error('❌ Could not load appointment:', aptError)
        error.value = 'Termin nicht gefunden'
        isLoading.value = false
        return
      }
      
      // Warte kurz, damit der Webhook Zeit hat zu verarbeiten
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Prüfe nochmal ob Appointment bereits bestätigt wurde (via Webhook)
      const { data: updatedAppointment } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appointmentData.id)
        .maybeSingle()
      
      if (updatedAppointment?.status === 'scheduled') {
        console.log('✅ Appointment already confirmed via webhook')
      } else {
        // Falls noch nicht bestätigt, aktualisiere manuell
        console.log('⚠️ Appointment not yet confirmed, updating manually...')
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            status: 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentData.id)
        
        if (updateError) {
          console.error('❌ Error confirming appointment:', updateError)
        } else {
          console.log('✅ Appointment confirmed manually')
        }
      }
      
      // Setze bestätigt Status (BEVOR loadAppointment, damit die Erfolgsansicht angezeigt wird)
      isConfirmed.value = true
      
      // Lade Appointment-Daten neu für die Anzeige (aber isConfirmed bleibt true)
      await loadAppointment()
      
      isLoading.value = false
      
      // Remove query parameters after a short delay
      setTimeout(async () => {
        await navigateTo(`/confirm/${token}`, { replace: true })
      }, 500)
      
    } else if (paymentStatus === 'failed') {
      error.value = 'Die Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.'
      isLoading.value = false
    }
  } catch (err: any) {
    console.error('Error handling payment return:', err)
    error.value = 'Fehler bei der Verarbeitung der Zahlung: ' + err.message
    isLoading.value = false
  }
}

onMounted(async () => {
  if (token) {
    // Prüfe zuerst ob wir von Wallee zurückkommen (BEVOR wir loadAppointment aufrufen)
    const paymentStatus = route.query.payment as string | undefined
    if (paymentStatus) {
      await handlePaymentReturn()
    } else {
      await loadAppointment()
    }
  } else {
    error.value = 'Ungültiger Bestätigungslink'
    isLoading.value = false
  }
})
</script>

