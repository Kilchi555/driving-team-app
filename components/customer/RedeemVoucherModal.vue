<!-- components/customer/RedeemVoucherModal.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-md w-full shadow-2xl">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">💰</span>
            <h3 class="text-xl font-semibold text-white">
              Gutschein einlösen
            </h3>
          </div>
          <button 
            @click="$emit('close')" 
            class="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-6">
        
        <!-- Success State -->
        <div v-if="redemptionSuccess" class="text-center py-6">
          <div class="text-6xl mb-4 animate-bounce">🎉</div>
          <h4 class="text-2xl font-bold text-green-600 mb-2">
            Erfolgreich eingelöst!
          </h4>
          <p class="text-gray-600 mb-4">
            {{ successMessage }}
          </p>
          <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-green-700">
              Ihr neues Guthaben beträgt:
            </p>
            <p class="text-3xl font-bold text-green-600 mt-2">
              CHF {{ (newBalance / 100).toFixed(2) }}
            </p>
          </div>
          <button
            @click="$emit('close')"
            class="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Schließen
          </button>
        </div>

        <!-- Form State -->
        <div v-else>
          
          <!-- Description -->
          <div class="mb-6 text-center">
            <p class="text-gray-600">
              Geben Sie Ihren Gutschein-Code ein, um Guthaben zu erhalten
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-start">
              <span class="text-red-500 text-xl mr-2">⚠️</span>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- Code Input -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Gutschein-Code *
            </label>
            <input
              v-model="voucherCode"
              type="text"
              :disabled="isRedeeming"
              @input="voucherCode = voucherCode.toUpperCase()"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-lg uppercase text-center tracking-widest disabled:bg-gray-100"
              placeholder="XXXX-XXXX-XXXX"
              maxlength="50"
            />
            <p class="text-xs text-gray-500 mt-2 text-center">
              Der Code wird automatisch in Großbuchstaben umgewandelt
            </p>
          </div>

          <!-- Current Balance Info -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Aktuelles Guthaben:</span>
              <span class="text-lg font-bold text-gray-900">
                CHF {{ (currentBalance / 100).toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex space-x-3">
            <button
              @click="$emit('close')"
              :disabled="isRedeeming"
              class="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              @click="redeemVoucher"
              :disabled="!voucherCode.trim() || isRedeeming"
              class="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <span v-if="!isRedeeming">Einlösen</span>
              <span v-else class="flex items-center justify-center">
                <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird eingelöst...
              </span>
            </button>
          </div>

        </div>

      </div>

      <!-- Footer Info -->
      <div v-if="!redemptionSuccess" class="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div class="flex items-start text-xs text-gray-600">
          <span class="mr-2">ℹ️</span>
          <p>
            Gutschein-Codes können nur einmal verwendet werden. Nach erfolgreicher Einlösung wird das Guthaben sofort Ihrem Konto gutgeschrieben.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props
interface Props {
  currentBalance: number
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  success: [newBalance: number]
}>()

// State
const voucherCode = ref('')
const isRedeeming = ref(false)
const errorMessage = ref('')
const redemptionSuccess = ref(false)
const successMessage = ref('')
const newBalance = ref(0)

// Methods
const redeemVoucher = async () => {
  if (!voucherCode.value.trim()) {
    errorMessage.value = 'Bitte geben Sie einen Gutschein-Code ein'
    return
  }

  isRedeeming.value = true
  errorMessage.value = ''

  try {
    console.log('🎫 Redeeming voucher:', voucherCode.value)

    const response = await $fetch('/api/vouchers/redeem', {
      method: 'POST',
      credentials: 'include',
      body: {
        code: voucherCode.value.trim().toUpperCase()
      }
    })

    console.log('✅ Voucher redeemed:', response)

    // Success!
    redemptionSuccess.value = true
    successMessage.value = response.message || 'Gutschein erfolgreich eingelöst!'
    newBalance.value = response.newBalance || 0

    // Emit success event
    emit('success', newBalance.value)

  } catch (error: any) {
    console.error('❌ Error redeeming voucher:', error)
    
    if (error.status === 404) {
      errorMessage.value = 'Ungültiger Gutschein-Code'
    } else if (error.status === 400) {
      errorMessage.value = error.data?.error || 'Gutschein kann nicht eingelöst werden'
    } else if (error.status === 410) {
      errorMessage.value = 'Dieser Gutschein ist bereits vollständig eingelöst worden'
    } else {
      errorMessage.value = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    }
  } finally {
    isRedeeming.value = false
  }
}
</script>

