<!-- components/VoucherProductSelector.vue -->
<template>
  <div class="space-y-4">
    <!-- Gutschein-Selector -->
    <div v-if="showVoucherInput" class="border-2 border-dashed rounded-xl p-5"
         :style="{ borderColor: brandBorder, background: brandBg }">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-lg font-medium text-gray-900 flex items-center">
          🎁 Gutschein erstellen
        </h4>
        <button
          @click="cancelVoucher"
          class="hover:opacity-70 text-xl text-gray-500"
        >
          ✕
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
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
              class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-lg bg-white"
              :style="{ borderColor: brandBorder, '--tw-ring-color': props.brandColor }"
              @keydown.enter="createVoucher"
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span class="font-medium" :style="{ color: props.brandColor }">CHF</span>
            </div>
          </div>
          <p class="text-xs mt-1" :style="{ color: props.brandColor }">
            Mindestbetrag: CHF 1.00, Maximum: CHF 1'000.00
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Empfänger (optional)
          </label>
          <input
            v-model="voucherRecipient"
            type="text"
            placeholder="z.B. Max Mustermann"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
            :style="{ borderColor: brandBorder, '--tw-ring-color': props.brandColor }"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Beschreibung (optional)
          </label>
          <input
            v-model="voucherDescription"
            type="text"
            placeholder="z.B. Geburtstags-Gutschein, Weihnachtsgeschenk"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
            :style="{ borderColor: brandBorder, '--tw-ring-color': props.brandColor }"
          />
        </div>

        <div v-if="voucherAmount" class="bg-white border rounded-xl p-4" :style="{ borderColor: brandBorder }">
          <h5 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
            👁️ Vorschau des Gutscheins:
          </h5>
          <div class="rounded-lg p-3 border" :style="{ background: brandBg, borderColor: brandBorder }">
            <div class="text-center">
              <div class="text-lg font-bold text-gray-800 mb-1">
                {{ generateVoucherName() }}
              </div>
              <div class="text-sm text-gray-600 mb-2">
                {{ generateVoucherDescription() }}
              </div>
              <div class="text-2xl font-bold" :style="{ color: props.brandColor }">
                CHF {{ voucherAmount.toFixed(2) }}
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2 text-center">
            So wird der Gutschein in der Bestellung angezeigt
          </p>
        </div>

        <div class="flex justify-end space-x-3 pt-2">
          <button
            @click="cancelVoucher"
            class="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 border-gray-300"
          >
            Abbrechen
          </button>
          <button
            @click="createVoucher"
            :disabled="!isValidAmount"
            class="px-6 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            :style="{ background: props.brandColor }"
          >
            Gutschein hinzufügen
          </button>
        </div>
      </div>
    </div>

    <!-- Gutschein-Button (wenn nicht geöffnet) -->
    <div v-if="!showVoucherInput" class="text-center">
      <button
        @click="openVoucherInput"
        class="inline-flex items-center px-6 py-3 rounded-xl font-medium border-2 transition-all hover:opacity-80"
        :style="{ borderColor: props.brandColor, color: props.brandColor, background: 'transparent' }"
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
          class="flex justify-between items-center p-3 border border-gray-200 rounded-lg text-left transition-colors hover:opacity-80"
        >
          <div>
            <div class="font-medium text-gray-900">{{ voucher.name }}</div>
            <div class="text-sm text-gray-500">{{ voucher.description }}</div>
          </div>
          <div class="text-lg font-bold" :style="{ color: props.brandColor }">
            CHF {{ (voucher.price_rappen / 100).toFixed(2) }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

// Props
interface Props {
  existingVouchers?: Array<{
    id: string
    name: string
    description?: string
    price_rappen: number
  }>
  brandColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  existingVouchers: () => [],
  brandColor: '#2563EB'
})

const brandBg = computed(() => {
  const hex = props.brandColor
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, 0.07)`
})

const brandBorder = computed(() => {
  const hex = props.brandColor
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, 0.3)`
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

  logger.debug('🎁 Creating voucher:', voucherData)
  
  emit('voucher-created', voucherData)
  
  // Form schließen
  showVoucherInput.value = false
  voucherAmount.value = null
  voucherDescription.value = ''
  voucherRecipient.value = ''
}

const addExistingVoucher = (voucher: any) => {
  logger.debug('🎁 Adding existing voucher:', voucher)
  emit('voucher-selected', voucher)
}

// Vorschau-Methoden
const generateVoucherName = () => {
  if (!voucherAmount.value) return ''
  const recipient = voucherRecipient.value.trim()
  return recipient 
    ? `Gutschein für ${recipient} - CHF ${voucherAmount.value.toFixed(2)}`
    : `Gutschein CHF ${voucherAmount.value.toFixed(2)}`
}

const generateVoucherDescription = () => {
  return voucherDescription.value.trim() || `Gutschein über CHF ${voucherAmount.value?.toFixed(2) || '0.00'}`
}
</script>

<style scoped>
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
</style>