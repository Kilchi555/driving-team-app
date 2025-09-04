<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          Rabatt eingeben
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Schüler-Information -->
        <div class="bg-gray-50 p-3 rounded-lg">
          <p class="text-sm text-gray-600">Schüler</p>
          <p class="font-medium">{{ studentName }}</p>
        </div>

        <!-- Termin-Information -->
        <div class="bg-gray-50 p-3 rounded-lg">
          <p class="text-sm text-gray-600">Termin</p>
          <p class="font-medium">{{ formatDateTime(appointmentDate) }}</p>
        </div>

        <!-- Ursprünglicher Betrag -->
        <div class="bg-gray-50 p-3 rounded-lg">
          <p class="text-sm text-gray-600">Ursprünglicher Betrag</p>
          <p class="font-medium text-lg">{{ formatCurrency(originalAmount) }}</p>
        </div>

        <!-- Rabatt-Typ -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Rabatt-Typ
          </label>
          <div class="flex space-x-4">
            <label class="flex items-center">
              <input
                v-model="discountType"
                type="radio"
                value="fixed"
                class="mr-2"
              />
              <span class="text-sm">CHF Betrag</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="discountType"
                type="radio"
                value="percentage"
                class="mr-2"
              />
              <span class="text-sm">Prozent</span>
            </label>
          </div>
        </div>

        <!-- Rabatt-Betrag -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Rabatt {{ discountType === 'percentage' ? '(%)' : '(CHF)' }}
          </label>
          <input
            v-model.number="discountAmount"
            type="number"
            :step="discountType === 'percentage' ? 1 : 0.50"
            :min="0"
            :max="discountType === 'percentage' ? 100 : originalAmount / 100"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            :placeholder="discountType === 'percentage' ? '10' : '20.00'"
            required
          />
        </div>

        <!-- Vorschau des Rabatts -->
        <div v-if="discountAmount > 0" class="bg-blue-50 p-3 rounded-lg">
          <p class="text-sm text-blue-600">Rabatt-Vorschau</p>
          <p class="font-medium text-blue-800">
            {{ formatCurrency(calculatedDiscount) }} Rabatt
          </p>
          <p class="text-sm text-blue-600">
            Neuer Betrag: {{ formatCurrency(finalAmount) }}
          </p>
        </div>

        <!-- Rabatt-Grund -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Grund für den Rabatt
          </label>
          <textarea
            v-model="discountReason"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Treue-Kunde, besondere Umstände, etc."
            required
          ></textarea>
        </div>

        <!-- Ablaufdatum (optional) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Ablaufdatum (optional)
          </label>
          <input
            v-model="expiresAt"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Falls leer, läuft der Rabatt nie ab
          </p>
        </div>

        <!-- Fehler-Anzeige -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>

        <!-- Buttons -->
        <div class="flex space-x-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            :disabled="isLoading || !isFormValid"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Wird gespeichert...</span>
            <span v-else>Rabatt anwenden</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHybridDiscounts } from '~/composables/useHybridDiscounts'

interface Props {
  appointmentId: string
  userId: string
  staffId: string
  studentName: string
  appointmentDate: string
  originalAmount: number // in Rappen
}

interface Emits {
  (e: 'close'): void
  (e: 'discount-applied', discount: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createStaffDiscount, isLoading, error } = useHybridDiscounts()

// Form state
const discountType = ref<'fixed' | 'percentage'>('fixed')
const discountAmount = ref<number>(0)
const discountReason = ref('')
const expiresAt = ref('')

// Computed properties
const calculatedDiscount = computed(() => {
  if (!discountAmount.value || discountAmount.value <= 0) return 0
  
  if (discountType.value === 'percentage') {
    return Math.round(props.originalAmount * discountAmount.value / 100)
  } else {
    return Math.round(discountAmount.value * 100)
  }
})

const finalAmount = computed(() => {
  return Math.max(0, props.originalAmount - calculatedDiscount.value)
})

const isFormValid = computed(() => {
  return discountAmount.value > 0 && discountReason.value.trim().length > 0
})

// Methods
const formatCurrency = (amountRappen: number): string => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amountRappen / 100)
}

const formatDateTime = (dateTime: string): string => {
  if (!dateTime) return 'Kein Datum/Zeit'
  
  try {
    // Explizit als lokale Zeit behandeln - keine UTC-Konvertierung
    const date = new Date(dateTime)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum/Zeit'
    }
    
    // Verwende UTC-Methoden um lokale Zeit zu erzwingen
    const localDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes())
    
    return localDate.toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.warn('Error formatting dateTime:', dateTime, error)
    return 'Datum/Zeit Fehler'
  }
}

const handleSubmit = async () => {
  try {
    // Datum konvertieren falls gesetzt
    let expiresAtDate: string | undefined
    if (expiresAt.value) {
      expiresAtDate = new Date(expiresAt.value).toISOString()
    }

    const discount = await createStaffDiscount(
      props.appointmentId,
      props.userId,
      props.staffId,
      discountType.value,
      discountAmount.value,
      discountReason.value,
      props.originalAmount,
      expiresAtDate
    )

    if (discount) {
      emit('discount-applied', discount)
      emit('close')
    }
  } catch (err) {
    console.error('Error applying discount:', err)
  }
}

// Set default expiration date to 1 month from now
onMounted(() => {
  const oneMonthFromNow = new Date()
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
  expiresAt.value = oneMonthFromNow.toISOString().slice(0, 16)
})
</script>
