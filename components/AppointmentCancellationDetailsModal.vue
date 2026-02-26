<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <!-- Header -->
      <h2 class="text-xl font-bold text-gray-900 mb-1">Termin-Stornierung</h2>
      <p class="text-sm text-gray-600 mb-4">{{ appointmentDate }}</p>

      <!-- Status Info -->
      <div v-if="isPaymentPending" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p class="text-sm text-blue-700">
          <strong>ⓘ Payment ausstehend:</strong> Wählen Sie, was verrechnet werden soll
        </p>
      </div>
      <div v-else class="mb-4 p-3 bg-green-50 border border-green-200 rounded">
        <p class="text-sm text-green-700">
          <strong>✓ Bereits bezahlt:</strong> Wählen Sie, was rückvergütet werden soll
        </p>
      </div>

      <!-- Items Breakdown -->
      <div class="mb-6 bg-gray-50 rounded p-4 space-y-3">
        <!-- Lesson Item -->
        <div class="flex items-start space-x-3">
          <input
            v-model="selectedItems.lesson"
            type="checkbox"
            class="mt-1 w-4 h-4 text-blue-600 rounded"
          />
          <div class="flex-1">
            <label class="text-sm font-medium text-gray-900">
              Fahrlektion {{ appointment.duration_minutes }}min
            </label>
            <p class="text-xs text-gray-500 mt-0.5">
              CHF {{ formatAmount(appointment.base_price_rappen || 0) }}
            </p>
          </div>
        </div>

        <!-- Admin Fee Item -->
        <div v-if="appointment.admin_fee_rappen > 0" class="flex items-start space-x-3">
          <input
            v-model="selectedItems.adminFee"
            type="checkbox"
            class="mt-1 w-4 h-4 text-blue-600 rounded"
          />
          <div class="flex-1">
            <label class="text-sm font-medium text-gray-900">
              Administrationsgebühr
            </label>
            <p class="text-xs text-gray-500 mt-0.5">
              CHF {{ formatAmount(appointment.admin_fee_rappen) }}
            </p>
          </div>
        </div>

        <!-- Products Items -->
        <div
          v-for="product in appointment.products"
          :key="product.id"
          class="flex items-start space-x-3"
        >
          <input
            v-model="selectedItems.productIds"
            :value="product.id"
            type="checkbox"
            class="mt-1 w-4 h-4 text-blue-600 rounded"
          />
          <div class="flex-1">
            <label class="text-sm font-medium text-gray-900">
              {{ product.name }}
            </label>
            <p class="text-xs text-gray-500 mt-0.5">
              CHF {{ formatAmount(product.price_rappen || 0) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Total Calculation -->
      <div class="mb-6 border-t pt-4">
        <div class="flex justify-between mb-2">
          <span class="text-gray-600">{{ isPaymentPending ? "Zu verrechnen:" : "Zu rückvergüten:" }}</span>
          <span class="font-bold text-lg text-gray-900">CHF {{ totalAmount }}</span>
        </div>
      </div>

      <!-- Quick Selection Buttons -->
      <div class="mb-6 space-y-2">
        <button
          @click="selectAll"
          class="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
        >
          {{ isPaymentPending ? "Alles verrechnen" : "Alles rückvergüten" }}
        </button>
        <button
          @click="selectLesson"
          class="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
        >
          Nur Fahrlektion
        </button>
        <button
          @click="selectNone"
          class="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
        >
          {{ isPaymentPending ? "Kostenlos stornieren" : "Nichts rückvergüten" }}
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          @click="handleCancel"
          class="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition font-medium"
        >
          Abbrechen
        </button>
        <button
          @click="handleConfirm"
          :disabled="!hasAnySelection"
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stornieren
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

interface SelectedItems {
  lesson: boolean
  adminFee: boolean
  productIds: string[]
}

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  appointment: {
    type: Object,
    required: true
  },
  payment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'confirm'])

const selectedItems = ref<SelectedItems>({
  lesson: true,
  adminFee: true,
  productIds: []
})

// Initialize product selection
if (props.appointment.products?.length > 0) {
  selectedItems.value.productIds = props.appointment.products.map((p: any) => p.id)
}

// Computed properties
const isPaymentPending = computed(() => props.payment?.payment_status === 'pending')

const appointmentDate = computed(() => {
  const date = new Date(props.appointment.start_time)
  return date.toLocaleString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich'
  })
})

const totalAmount = computed(() => {
  let total = 0

  if (selectedItems.value.lesson) {
    total += props.appointment.base_price_rappen || 0
  }

  if (selectedItems.value.adminFee && props.appointment.admin_fee_rappen > 0) {
    total += props.appointment.admin_fee_rappen
  }

  if (selectedItems.value.productIds.length > 0 && props.appointment.products) {
    const selectedProducts = props.appointment.products.filter((p: any) =>
      selectedItems.value.productIds.includes(p.id)
    )
    total += selectedProducts.reduce((sum: number, p: any) => sum + (p.price_rappen || 0), 0)
  }

  return formatAmount(total)
})

const hasAnySelection = computed(() => {
  return selectedItems.value.lesson ||
    selectedItems.value.adminFee ||
    selectedItems.value.productIds.length > 0
})

// Methods
const formatAmount = (rappen: number): string => {
  return (rappen / 100).toFixed(2)
}

const selectAll = () => {
  selectedItems.value.lesson = true
  selectedItems.value.adminFee = true
  if (props.appointment.products?.length > 0) {
    selectedItems.value.productIds = props.appointment.products.map((p: any) => p.id)
  }
}

const selectLesson = () => {
  selectedItems.value.lesson = true
  selectedItems.value.adminFee = false
  selectedItems.value.productIds = []
}

const selectNone = () => {
  selectedItems.value.lesson = false
  selectedItems.value.adminFee = false
  selectedItems.value.productIds = []
}

const handleCancel = () => {
  logger.debug('🚫 Cancellation modal closed')
  emit('close')
}

const handleConfirm = () => {
  logger.debug('✅ Cancellation confirmed with items:', selectedItems.value)
  emit('confirm', selectedItems.value)
}
</script>

<style scoped>
input[type='checkbox'] {
  accent-color: rgb(37, 99, 235);
}
</style>

