<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">

      <!-- Loading Overlay -->
      <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-80 rounded-lg flex flex-col items-center justify-center z-10">
        <svg class="animate-spin h-8 w-8 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-sm font-medium text-gray-700">Termin wird abgesagt...</p>
      </div>

      <!-- Header with Progress -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <div class="text-2xl mr-3">❌</div>
          <h3 class="text-lg font-semibold text-gray-900">
            {{ showChargeDecision ? 'Zahlung' : cancellationStep === 0 ? 'Wer hat abgesagt?' : cancellationStep === 1 ? 'Absage-Grund auswählen' : 'Absage-Bestätigung' }}
          </h3>
        </div>
        <button
          @click="cancelFlow"
          :disabled="isLoading"
          class="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Step 0: Wer hat abgesagt? -->
      <div v-if="cancellationStep === 0" class="mb-6">
        <div class="grid grid-cols-2 gap-4">
          <button
            @click="selectCancellationType('student')"
            :class="[
              'p-6 rounded-lg border-2 transition-all duration-200 text-center',
              localCancellationType === 'student'
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            <div class="text-3xl mb-2">👨‍🎓</div>
            <div class="font-medium">Schüler</div>
          </button>
          <button
            @click="selectCancellationType('staff')"
            :class="[
              'p-6 rounded-lg border-2 transition-all duration-200 text-center',
              localCancellationType === 'staff'
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            <div class="text-3xl mb-2">👨‍🏫</div>
            <div class="font-medium">Fahrlehrer</div>
          </button>
        </div>
      </div>

      <!-- Step 1: Absage-Gründe auswählen -->
      <div v-if="cancellationStep === 1 && !showChargeDecision" class="mb-6">
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="reason in filteredReasons"
            :key="reason.id"
            @click="selectReasonAndContinue(reason.id)"
            :class="[
              'p-4 rounded-lg border-2 transition-all duration-200 text-center',
              selectedReasonId === reason.id
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            <div class="font-medium text-sm">{{ reason.name_de }}</div>
          </button>
        </div>
      </div>

      <!-- Step 2: Policy-Bestätigung -->
      <div v-if="cancellationStep === 2" class="mb-6">
        <div v-if="policyResult" class="space-y-4">
          <!-- Termin-Info Header -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-gray-900">{{ appointment?.title || 'Termin' }}</h4>
                <p class="text-sm text-gray-600">
                  {{ formatDateWithTime(appointment?.start_time || appointment?.start) }} •
                  {{ appointment?.duration_minutes || 45 }} Min •
                  {{ formatCurrency(appointmentPriceLocal) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Confirmation Summary -->
          <div :class="[
            'border-l-4 rounded-lg p-4',
            policyResult.calculation.chargePercentage > 0
              ? 'bg-red-50 border-red-400'
              : 'bg-green-50 border-green-400'
          ]">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3" :class="[
                  policyResult.calculation.chargePercentage > 0 ? 'bg-red-100' : 'bg-green-100'
                ]">
                  <svg class="w-4 h-4" :class="[
                    policyResult.calculation.chargePercentage > 0 ? 'text-red-600' : 'text-green-600'
                  ]" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <div class="font-medium" :class="[
                    policyResult.calculation.chargePercentage > 0 ? 'text-red-900' : 'text-green-900'
                  ]">Berechnung</div>
                  <div class="text-sm" :class="[
                    policyResult.calculation.chargePercentage > 0 ? 'text-red-700' : 'text-green-700'
                  ]">
                    {{ policyResult.calculation.chargePercentage }}% verrechnen
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div v-if="policyResult.calculation.chargePercentage > 0" class="text-lg font-bold text-red-600">
                  {{ formatCurrency(policyResult.chargeAmountRappen) }}
                </div>
                <div v-else class="text-lg font-bold text-green-600">
                  Kostenlos
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charge Decision Modal (für Student < 24h) -->
      <div v-if="showChargeDecision" class="mb-6">
        <p class="text-sm text-gray-600 mb-4">
          Der Termin wird in weniger als 24 Stunden abgesagt. Wähle, ob der Schüler belastet werden soll:
        </p>

        <div class="bg-blue-50 border border-blue-200 rounded p-3 mb-6">
          <p class="text-sm font-medium text-blue-900">
            💰 Preis: {{ ((appointmentPriceLocal || 0) / 100).toFixed(2) }} CHF
          </p>
        </div>

        <div class="space-y-3">
          <button
            @click="handleChargeChoice(0)"
            :disabled="isLoading"
            class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kostenlos absagen
          </button>
          <button
            @click="handleChargeChoice(100)"
            :disabled="isLoading"
            class="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            100% verrechnen ({{ ((appointmentPriceLocal || 0) / 100).toFixed(2) }} CHF)
          </button>
        </div>

        <div v-if="!isLoading" class="flex gap-3 justify-between mt-4">
          <button
            @click="goBackFromChargeDecision"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Zurück
          </button>
          <button
            @click="cancelFlow"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex space-x-3" v-if="!showChargeDecision">
        <button
          v-if="cancellationStep === 1"
          @click="goBack"
          class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Zurück
        </button>
        <button
          v-if="cancellationStep === 2"
          @click="goBack"
          class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Zurück
        </button>
        <div class="flex-1"></div>
        <button
          v-if="cancellationStep === 2 && policyResult"
          @click="confirmCancellation"
          :disabled="isLoading"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          Absagen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { logger } from '~/utils/logger'
import { useCancellationReasons } from '~/composables/useCancellationReasons'
import { useCancellationPolicies } from '~/composables/useCancellationPolicies'
import { calculateCancellationCharges } from '~/utils/policyCalculations'
import { useUIStore } from '~/stores/ui'

interface Props {
  isOpen: boolean
  appointment: any
  currentUser: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  cancelled: [appointmentId: string]
}>()

const uiStore = useUIStore()
const { cancellationReasons, staffCancellationReasons, fetchCancellationReasons } = useCancellationReasons()
const { defaultPolicy, fetchPolicies } = useCancellationPolicies()

// State
const cancellationStep = ref(0)
const localCancellationType = ref<'student' | 'staff' | undefined>()
const selectedReasonId = ref<string | undefined>()
const policyResult = ref<any>(null)
const appointmentPriceLocal = ref(0)
const isLoading = ref(false)
const showChargeDecision = ref(false)
const pendingReason = ref<any>(null)

// Computed: Gefilterte Absage-Gründe basierend auf Typ
const filteredReasons = computed(() => {
  if (!localCancellationType.value) return []
  return localCancellationType.value === 'staff'
    ? (staffCancellationReasons.value || [])
    : cancellationReasons.value?.filter(r => r.cancellation_type === 'student') || []
})

// Watch: Load data when modal opens
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    resetState()
    await fetchCancellationReasons()
  }
})

// Methods
const resetState = () => {
  cancellationStep.value = 0
  localCancellationType.value = undefined
  selectedReasonId.value = undefined
  policyResult.value = null
  appointmentPriceLocal.value = 0
  isLoading.value = false
  showChargeDecision.value = false
  pendingReason.value = null

}

const selectCancellationType = (type: 'student' | 'staff') => {
  logger.debug('👤 Cancellation type selected:', type)
  localCancellationType.value = type
  cancellationStep.value = 1
  selectedReasonId.value = undefined
}

const selectReasonAndContinue = async (reasonId: string) => {
  logger.debug('🎯 Reason selected and continuing:', reasonId)
  selectedReasonId.value = reasonId

  const selectedReason = cancellationReasons.value.find(r => r.id === reasonId)
  if (!selectedReason) return

  pendingReason.value = selectedReason

  // Load appointment price
  await loadAppointmentPrice()

  const isCancelledByStudent = localCancellationType.value === 'student'

  // For student cancellations: show charge decision modal
  if (isCancelledByStudent) {
    logger.debug('❓ Student cancellation - showing charge decision modal')
    showChargeDecision.value = true
    return
  }

  // For staff: use force_charge_percentage or default to 0
  await goToPolicySelection(selectedReason)
}

const goToPolicySelection = async (selectedReason: any) => {
  logger.debug('📋 Going to policy selection')

  const forceChargePercentage = selectedReason.force_charge_percentage
  const reasonCancellationType = selectedReason.cancellation_type

  const shouldUseForceCharge = forceChargePercentage !== null && forceChargePercentage !== undefined
  const chargePercentageToUse = shouldUseForceCharge
    ? forceChargePercentage
    : (reasonCancellationType === 'staff' ? 0 : null)

  if (chargePercentageToUse !== null) {
    logger.debug('✅ Force charge percentage:', chargePercentageToUse)
    policyResult.value = {
      calculation: { chargePercentage: chargePercentageToUse },
      chargeAmountRappen: Math.round((appointmentPriceLocal.value || 0) * chargePercentageToUse / 100),
      shouldCreateInvoice: chargePercentageToUse > 0,
      shouldCreditHours: chargePercentageToUse === 0,
      invoiceDescription: chargePercentageToUse === 0
        ? 'Kostenlose Stornierung durch Fahrlehrer'
        : `Stornogebühr für Termin (${chargePercentageToUse}% von ${((appointmentPriceLocal.value || 0) / 100).toFixed(2)} CHF)`
    }
    logger.debug('✅ Policy result set:', policyResult.value)
    cancellationStep.value = 2
    return
  }

  // Load policies and calculate
  await fetchPolicies('appointments')

  if (defaultPolicy.value && props.appointment) {
    const appointmentData = {
      id: props.appointment.id,
      start_time: props.appointment.start_time || props.appointment.start,
      duration_minutes: props.appointment.duration_minutes || 45,
      price_rappen: appointmentPriceLocal.value,
      user_id: props.appointment.user_id,
      staff_id: props.appointment.staff_id
    }

    const result = calculateCancellationCharges(defaultPolicy.value, appointmentData, new Date())
    logger.debug('✅ Policy calculation result:', result)
    policyResult.value = result
  } else {
    // No policy: default to free
    policyResult.value = {
      calculation: { chargePercentage: 0 },
      chargeAmountRappen: 0,
      shouldCreateInvoice: false,
      shouldCreditHours: true,
      invoiceDescription: 'Kostenlose Stornierung (keine Richtlinie definiert)'
    }
  }

  cancellationStep.value = 2
}

const handleChargeChoice = async (chargePercent: number) => {
  logger.debug('👤 Staff chose charge percentage:', chargePercent)
  isLoading.value = true
  await nextTick()
  // Ensure the browser actually paints the loading overlay before continuing
  await new Promise(resolve => requestAnimationFrame(resolve))

  let paymentStatus = null
  if (chargePercent === 0 && props.appointment?.id) {
    try {
      const response = await $fetch('/api/staff/get-payment', {
        query: { appointment_id: props.appointment.id }
      }) as any
      if (response?.data) {
        paymentStatus = response.data.payment_status
      }
    } catch (err) {
      logger.warn('⚠️ Could not fetch payment status:', err)
    }
  }

  const price = appointmentPriceLocal.value || 0
  policyResult.value = {
    calculation: { chargePercentage: chargePercent },
    chargeAmountRappen: Math.round(price * chargePercent / 100),
    shouldCreateInvoice: chargePercent > 0,
    shouldCreditHours: chargePercent === 100,
    invoiceDescription: chargePercent === 0
      ? (paymentStatus === 'completed' || paymentStatus === 'authorized'
          ? 'Kostenlose Stornierung - Credits rückvergütet'
          : 'Kostenlose Stornierung (manuell festgelegt)')
      : `Stornogebühr ${chargePercent}% (manuell festgelegt)`,
    paymentStatus
  }

  await confirmCancellation()
}

const loadAppointmentPrice = async () => {
  if (!props.appointment?.id) return
  try {
    const response = await $fetch('/api/staff/get-payment', {
      query: { appointment_id: props.appointment.id }
    }) as any
    const payment = response?.data
    if (payment) {
      appointmentPriceLocal.value = payment.lesson_price_rappen || payment.total_amount_rappen || 0
      logger.debug('💰 Loaded appointment price:', appointmentPriceLocal.value)
    }
  } catch (err) {
    logger.warn('⚠️ Could not load appointment price:', err)
  }
}

const confirmCancellation = async () => {
  if (!localCancellationType.value || !selectedReasonId.value || !pendingReason.value) return

  isLoading.value = true

  try {
    const cancellerName = localCancellationType.value === 'student'
      ? (props.appointment?.student_name || props.appointment?.users?.first_name || 'Schüler')
      : (props.currentUser?.first_name || 'Fahrlehrer')

    const deletionReason = `Termin abgesagt von ${cancellerName} wegen ${pendingReason.value.name_de}`
    const withCosts = (policyResult.value?.chargeAmountRappen || 0) > 0
    const chargePercentage = policyResult.value?.calculation?.chargePercentage || 0

    logger.debug('🗑️ Performing cancellation:', {
      appointmentId: props.appointment?.id,
      deletionReason,
      cancellationReasonId: selectedReasonId.value,
      chargePercentage,
      withCosts,
      cancellationType: localCancellationType.value
    })

    const wasFreeCancellationOfPaid = chargePercentage === 0 &&
      policyResult.value?.paymentStatus === 'completed'

    const result = await $fetch('/api/appointments/cancel-staff', {
      method: 'POST',
      body: {
        appointmentId: props.appointment?.id,
        cancellationReasonId: selectedReasonId.value,
        deletionReason,
        chargePercentage,
        shouldCreditHours: chargePercentage === 100,
        cancelledBy: localCancellationType.value === 'student' ? 'customer' : 'staff'
      }
    }) as any

    logger.debug('✅ Cancellation completed:', result)

    let notificationMessage = result.message || 'Der Termin wurde erfolgreich storniert.'
    if (wasFreeCancellationOfPaid) {
      notificationMessage += ' Credits wurden rückvergütet.'
    }

    uiStore.addNotification({
      type: 'success',
      title: 'Termin storniert',
      message: notificationMessage
    })

    // Gesamten Kalender-Cache löschen damit Termine neu geladen werden
    const { clearCache } = useCalendarCache()
    clearCache()

    emit('cancelled', props.appointment?.id)
    emit('close')
  } catch (err: any) {
    console.error('❌ Cancellation error:', err)
    isLoading.value = false
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: err.message || 'Fehler beim Absagen des Termins'
    })
  }
}

const goBack = () => {
  if (cancellationStep.value === 2) {
    cancellationStep.value = 1
    policyResult.value = null
  } else if (cancellationStep.value === 1) {
    cancellationStep.value = 0
    selectedReasonId.value = undefined
    policyResult.value = null
  }
}

const goBackFromChargeDecision = () => {
  showChargeDecision.value = false
  selectedReasonId.value = undefined
  pendingReason.value = null
}

const cancelFlow = () => {
  resetState()
  emit('close')
}

const formatDateWithTime = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const formatCurrency = (rappen: number) => {
  return ((rappen || 0) / 100).toFixed(2) + ' CHF'
}
</script>
