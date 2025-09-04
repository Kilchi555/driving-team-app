<!-- components/VoucherProductSelector.vue -->
<template>
  <div class="space-y-4">
    <!-- Gutschein-Selector -->
    <div v-if="showVoucherInput" class="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-lg font-medium text-blue-900 flex items-center">
          🎁 Gutschein erstellen
        </h4>
        <button
          @click="cancelVoucher"
          class="text-blue-600 hover:text-blue-800 text-xl"
        >
          ✕
        </button>
      </div>

      <!-- Betrag eingeben -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-blue-800 mb-2">
            Gutschein-Betrag (CHF) *
          </label>
          <div class="relative">
            <input
              v-model.number="voucherAmount"
              type="number"
              step="0.01"
              min="1"
              max="1000"
              placeholder="z.B. 100.00"
              class="w-full px-4 py-3 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              @keydown.enter="createVoucher"
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span class="text-blue-600 font-medium">CHF</span>
            </div>
          </div>
          <p class="text-xs text-blue-600 mt-1">
            Mindestbetrag: CHF 1.00, Maximum: CHF 1'000.00
          </p>
        </div>

        <!-- Beschreibung (optional) -->
        <div>
          <label class="block text-sm font-medium text-blue-800 mb-2">
            Beschreibung (optional)
          </label>
          <input
            v-model="voucherDescription"
            type="text"
            placeholder="z.B. Geburtstags-Gutschein, Weihnachtsgeschenk"
            class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Empfänger (optional) -->
        <div>
          <label class="block text-sm font-medium text-blue-800 mb-2">
            Empfänger (optional)
          </label>
          <input
            v-model="voucherRecipient"
            type="text"
            placeholder="z.B. Max Mustermann"
            class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 pt-2">
          <button
            @click="cancelVoucher"
            class="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            Abbrechen
          </button>
          <button
            @click="createVoucher"
            :disabled="!isValidAmount"
            class="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎁 Gutschein hinzufügen
          </button>
        </div>
      </div>
    </div>

    <!-- Gutschein-Button (wenn nicht geöffnet) -->
    <div v-if="!showVoucherInput" class="text-center">
      <button
        @click="openVoucherInput"
        class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 font-medium shadow-md transition-all"
      >
        🎁 Gutschein erstellen
      </button>
      <p class="text-xs text-gray-500 mt-2">
        Erstellen Sie einen Gutschein mit individuellem Betrag
      </p>
    </div>

    <!-- Bestehende Gutscheine anzeigen -->
    <div v-if="existingVouchers.length > 0" class="space-y-2">
      <h4 class="text-sm font-medium text-gray-700">🎁 Vorhandene Gutscheine</h4>
      <div class="grid grid-cols-1 gap-2">
        <button
          v-for="voucher in existingVouchers"
          :key="voucher.id"
          @click="addExistingVoucher(voucher)"
          class="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
        >
          <div>
            <div class="font-medium text-gray-900">{{ voucher.name }}</div>
            <div class="text-sm text-gray-500">{{ voucher.description }}</div>
          </div>
          <div class="text-lg font-bold text-blue-600">
            CHF {{ (voucher.price_rappen / 100).toFixed(2) }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props
interface Props {
  existingVouchers?: Array<{
    id: string
    name: string
    description?: string
    price_rappen: number
  }>
}

const props = withDefaults(defineProps<Props>(), {
  existingVouchers: () => []
})

// Emits
const emit = defineEmits<{
  'voucher-created': [voucher: {
    name: string
    description: string
    price_rappen: number
    category: string
    is_voucher: boolean
    recipient?: string
  }]
  'voucher-selected': [voucher: any]
}>()

// State
const showVoucherInput = ref(false)
const voucherAmount = ref<number | null>(null)
const voucherDescription = ref('')
const voucherRecipient = ref('')

// Computed
const isValidAmount = computed(() => {
  return voucherAmount.value && voucherAmount.value >= 1 && voucherAmount.value <= 1000
})

// Methods
const openVoucherInput = () => {
  showVoucherInput.value = true
  // Reset form
  voucherAmount.value = null
  voucherDescription.value = ''
  voucherRecipient.value = ''
}

const cancelVoucher = () => {
  showVoucherInput.value = false
  voucherAmount.value = null
  voucherDescription.value = ''
  voucherRecipient.value = ''
}

const createVoucher = () => {
  if (!isValidAmount.value) return

  const amount = voucherAmount.value!
  const description = voucherDescription.value.trim() || `Gutschein über CHF ${amount.toFixed(2)}`
  const recipient = voucherRecipient.value.trim()
  
  // Gutschein-Daten erstellen
  const voucherData = {
    name: recipient ? `Gutschein für ${recipient} - CHF ${amount.toFixed(2)}` : `Gutschein CHF ${amount.toFixed(2)}`,
    description: description,
    price_rappen: Math.round(amount * 100),
    category: 'Gutscheine',
    is_voucher: true,
    recipient: recipient || undefined
  }

  console.log('🎁 Creating voucher:', voucherData)
  
  emit('voucher-created', voucherData)
  
  // Form schließen
  showVoucherInput.value = false
  voucherAmount.value = null
  voucherDescription.value = ''
  voucherRecipient.value = ''
}

const addExistingVoucher = (voucher: any) => {
  console.log('🎁 Adding existing voucher:', voucher)
  emit('voucher-selected', voucher)
}
</script>

<style scoped>
/* Gradient animation for the voucher button */
.bg-gradient-to-r:hover {
  background-size: 200% 200%;
  animation: gradient 2s ease infinite;
}

@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Number input styling */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Focus states */
input:focus, select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>