<!-- components/admin/VoucherRedeemer.vue -->
<template>
  <div class="voucher-redeemer bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center">
        🎁 Gutschein einlösen
      </h3>
      <button
        v-if="voucherDetails"
        @click="clearVoucher"
        class="text-gray-400 hover:text-gray-600 text-sm"
      >
        ✕ Neu scannen
      </button>
    </div>

    <!-- Gutschein-Code Eingabe -->
    <div v-if="!voucherDetails" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Gutschein-Code
        </label>
        <div class="flex space-x-2">
          <input
            v-model="voucherCode"
            type="text"
            placeholder="z.B. GC-ABC123-XYZ"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keydown.enter="validateVoucher"
            :disabled="isValidating"
          />
          <button
            @click="validateVoucher"
            :disabled="!voucherCode || isValidating"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isValidating">Prüfen...</span>
            <span v-else>Prüfen</span>
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Geben Sie den 12-stelligen Gutschein-Code ein
        </p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>
    </div>

    <!-- Gutschein-Details -->
    <div v-if="voucherDetails" class="space-y-4">
      <!-- Gutschein-Info -->
      <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-semibold text-gray-900">{{ voucherDetails.name }}</h4>
          <span 
            :class="getStatusClass(voucherDetails.status)"
            class="px-2 py-1 text-xs font-semibold rounded-full"
          >
            {{ getStatusText(voucherDetails.status) }}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Code:</span>
            <span class="font-mono font-bold text-blue-600 ml-2">{{ voucherDetails.code }}</span>
          </div>
          <div>
            <span class="text-gray-600">Betrag:</span>
            <span class="font-bold text-green-600 ml-2">CHF {{ (voucherDetails.amount_rappen / 100).toFixed(2) }}</span>
          </div>
          <div>
            <span class="text-gray-600">Empfänger:</span>
            <span class="ml-2">{{ voucherDetails.voucher_recipient_name || 'Inhaber' }}</span>
          </div>
          <div>
            <span class="text-gray-600">Gültig bis:</span>
            <span class="ml-2">{{ new Date(voucherDetails.valid_until).toLocaleDateString('de-CH') }}</span>
          </div>
        </div>

        <div v-if="voucherDetails.description" class="mt-3 pt-3 border-t border-blue-100">
          <span class="text-gray-600 text-sm">Beschreibung:</span>
          <p class="text-sm text-gray-700 mt-1">{{ voucherDetails.description }}</p>
        </div>
      </div>

      <!-- Einlösung -->
      <div v-if="voucherDetails.status === 'active'" class="space-y-4">
        <!-- Termin-Information -->
        <div v-if="appointmentId" class="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h5 class="font-semibold text-blue-900 mb-2">📅 Termin-Details</h5>
          <div class="text-sm text-blue-800 space-y-1">
            <p v-if="appointmentTitle"><strong>Titel:</strong> {{ appointmentTitle }}</p>
            <p v-if="appointmentDate"><strong>Datum:</strong> {{ new Date(appointmentDate).toLocaleDateString('de-CH') }}</p>
            <p><strong>Termin-ID:</strong> {{ appointmentId }}</p>
          </div>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p class="text-sm text-yellow-800">
            <strong>Hinweis:</strong> Dieser Gutschein kann nur einmal eingelöst werden.
            <span v-if="appointmentId"> Er wird für den aktuellen Termin eingelöst.</span>
          </p>
        </div>

        <div class="flex space-x-3">
          <button
            @click="redeemVoucher"
            :disabled="isRedeeming"
            class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isRedeeming">Einlösen...</span>
            <span v-else>{{ appointmentId ? 'Für Termin einlösen' : 'Gutschein einlösen' }}</span>
          </button>
          
          <button
            @click="downloadPDF"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            📄 PDF
          </button>
        </div>
      </div>

      <!-- Bereits eingelöst -->
      <div v-else-if="voucherDetails.status === 'redeemed'" class="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 class="font-semibold text-gray-900 mb-2">Gutschein bereits eingelöst</h4>
        <div class="text-sm text-gray-600 space-y-1">
          <p>Eingelöst am: {{ new Date(voucherDetails.redeemed_at!).toLocaleDateString('de-CH') }}</p>
          <p v-if="voucherDetails.redeemed_for">
            Für Termin: 
            <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{{ voucherDetails.redeemed_for }}</span>
          </p>
          <p v-if="voucherDetails.redeemed_by">
            Eingelöst von: 
            <span class="font-semibold">{{ voucherDetails.redeemed_by }}</span>
          </p>
        </div>
      </div>

      <!-- Abgelaufen -->
      <div v-else-if="voucherDetails.status === 'expired'" class="bg-red-50 border border-red-200 rounded-md p-4">
        <h4 class="font-semibold text-red-900 mb-2">Gutschein abgelaufen</h4>
        <p class="text-sm text-red-700">
          Dieser Gutschein ist nicht mehr gültig.
        </p>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-md p-3">
      <p class="text-sm text-green-800">{{ successMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref } from 'vue'
import { useVouchers, type Voucher } from '~/composables/useVouchers'
import { useAuthStore } from '~/stores/auth'

// Props
interface Props {
  appointmentId?: string
  appointmentTitle?: string
  appointmentDate?: string
  onVoucherRedeemed?: (voucher: Voucher, amount: number) => void
}

const props = withDefaults(defineProps<Props>(), {
  appointmentId: undefined,
  appointmentTitle: undefined,
  appointmentDate: undefined,
  onVoucherRedeemed: undefined
})

// Composables
const { findVoucherByCode, redeemVoucher: redeemVoucherComposable, downloadVoucherPDF } = useVouchers()
const authStore = useAuthStore()

// State
const voucherCode = ref('')
const voucherDetails = ref<Voucher | null>(null)
const isValidating = ref(false)
const isRedeeming = ref(false)
const error = ref('')
const successMessage = ref('')

// Methods
const validateVoucher = async () => {
  if (!voucherCode.value.trim()) return

  isValidating.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const voucher = await findVoucherByCode(voucherCode.value.trim())
    
    if (!voucher) {
      error.value = 'Gutschein nicht gefunden. Bitte überprüfen Sie den Code.'
      return
    }

    voucherDetails.value = voucher
    logger.debug('✅ Voucher found:', voucher.code)

  } catch (err: any) {
    console.error('❌ Error validating voucher:', err)
    error.value = 'Fehler beim Prüfen des Gutscheins.'
  } finally {
    isValidating.value = false
  }
}

const redeemVoucher = async () => {
  if (!voucherDetails.value || !authStore.user?.id) return

  isRedeeming.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const result = await redeemVoucherComposable(
      voucherDetails.value.code,
      props.appointmentId || '',
      authStore.user.id
    )

    if (result.success) {
      const redemptionInfo = props.appointmentId 
        ? ` für Termin ${props.appointmentId}`
        : ''
      
      successMessage.value = `Gutschein erfolgreich eingelöst${redemptionInfo}! Betrag: CHF ${(voucherDetails.value.amount_rappen / 100).toFixed(2)}`
      
      // Emit success
      if (props.onVoucherRedeemed) {
        props.onVoucherRedeemed(voucherDetails.value, voucherDetails.value.amount_rappen)
      }

      // Update voucher status
      voucherDetails.value.status = 'redeemed'
      voucherDetails.value.redeemed_at = new Date().toISOString()
      voucherDetails.value.redeemed_for = props.appointmentId
      voucherDetails.value.redeemed_by = authStore.user?.id

      logger.debug('✅ Voucher redeemed:', {
        code: voucherDetails.value.code,
        amount: voucherDetails.value.amount_rappen / 100,
        appointmentId: props.appointmentId,
        redeemedBy: authStore.user?.id,
        timestamp: new Date().toISOString()
      })

    } else {
      error.value = result.message
    }

  } catch (err: any) {
    console.error('❌ Error redeeming voucher:', err)
    error.value = 'Fehler beim Einlösen des Gutscheins.'
  } finally {
    isRedeeming.value = false
  }
}

const downloadPDF = async () => {
  if (!voucherDetails.value) return

  try {
    await downloadVoucherPDF(voucherDetails.value.id)
  } catch (err: any) {
    console.error('❌ Error downloading voucher PDF:', err)
    error.value = 'Fehler beim Herunterladen des PDFs.'
  }
}

const clearVoucher = () => {
  voucherCode.value = ''
  voucherDetails.value = null
  error.value = ''
  successMessage.value = ''
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    'active': 'bg-green-100 text-green-800',
    'redeemed': 'bg-blue-100 text-blue-800',
    'expired': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    'active': 'Aktiv',
    'redeemed': 'Eingelöst',
    'expired': 'Abgelaufen',
    'cancelled': 'Storniert'
  }
  return texts[status] || status
}

// Expose methods for parent components
defineExpose({
  clearVoucher,
  validateVoucher
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
