<template>
  <div class="space-y-3">



    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
      <div class="flex items-center">
        <svg class="h-4 w-4 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <span class="text-sm text-red-800">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCancellationPolicies, type PolicyWithRules } from '~/composables/useCancellationPolicies'
import { 
  calculateCancellationCharges, 
  getTimeUntilAppointment, 
  formatHoursBefore, 
  formatCurrency,
  type AppointmentData,
  type CancellationResult 
} from '~/utils/policyCalculations'

interface Props {
  appointmentData: AppointmentData
  modelValue?: string // Selected policy ID
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'policy-changed', result: CancellationResult | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { 
  policiesWithRules, 
  defaultPolicy, 
  fetchPolicies, 
  getPolicyById,
  isLoading,
  error 
} = useCancellationPolicies()

const selectedPolicyId = ref<string>('') // Immer leer, da wir die Standard-Policy verwenden
const cancellationResult = ref<CancellationResult | null>(null)
const timeUntilAppointment = ref({ hours: 0, days: 0, isOverdue: false, description: '' })

// Computed properties
const selectedPolicy = computed(() => {
  return defaultPolicy.value
})

// Watch for changes
watch(() => selectedPolicy.value, () => {
  calculateCharges()
})

watch(() => props.appointmentData, () => {
  calculateCharges()
}, { deep: true })

// Methods

const calculateCharges = () => {
  if (!selectedPolicy.value || !props.appointmentData) {
    cancellationResult.value = null
    emit('policy-changed', null)
    return
  }

  try {
    const appointmentDate = new Date(props.appointmentData.start_time)
    const currentDate = new Date()
    
    // Calculate time until appointment
    timeUntilAppointment.value = getTimeUntilAppointment(appointmentDate, currentDate)
    
    // Calculate cancellation charges
    const result = calculateCancellationCharges(
      selectedPolicy.value,
      props.appointmentData,
      currentDate
    )
    
    cancellationResult.value = result
    emit('policy-changed', result)
  } catch (err) {
    console.error('Error calculating cancellation charges:', err)
    cancellationResult.value = null
    emit('policy-changed', null)
  }
}

// Load data on mount
onMounted(async () => {
  await fetchPolicies()
  calculateCharges()
})

// Expose methods for parent component
defineExpose({
  calculateCharges,
  getCancellationResult: () => cancellationResult.value
})
</script>

