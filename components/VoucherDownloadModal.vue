<!-- components/VoucherDownloadModal.vue -->
<!-- Modal für automatischen Gutschein-Download nach dem Kauf -->

<template>
  <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
          🎁 Ihre Gutscheine sind bereit!
        </h3>
        <button
          @click="closeModal"
          class="text-gray-400 hover:text-gray-600"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="space-y-4">
        <p class="text-gray-600">
          {{ vouchers.length }} Gutschein(e) wurden erfolgreich erstellt und können sofort verwendet werden.
        </p>

        <!-- Voucher List -->
        <div class="space-y-3">
          <div 
            v-for="voucher in vouchers" 
            :key="voucher.id"
            class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200"
          >
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-gray-900">{{ voucher.name }}</h4>
              <span class="bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded-full">
                CHF {{ (voucher.amount_chf || (voucher.amount_rappen ? voucher.amount_rappen / 100 : 0)).toFixed(2) }}
              </span>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">Code:</span>
                <span class="font-mono font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded text-sm">
                  {{ voucher.code }}
                </span>
              </div>
              
              <button
                @click="downloadVoucherPDF(voucher.id)"
                :disabled="isDownloading"
                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isDownloading">📄 Download...</span>
                <span v-else>📄 PDF</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-3 pt-4">
          <button
            @click="downloadAllPDFs"
            :disabled="isDownloading"
            class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isDownloading">📄 Alle herunterladen...</span>
            <span v-else>📄 Alle PDFs herunterladen</span>
          </button>
          
          <button
            @click="sendAllEmails"
            :disabled="isSendingEmails"
            class="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSendingEmails">📧 E-Mails senden...</span>
            <span v-else>📧 E-Mails senden</span>
          </button>
        </div>

        <!-- Success Messages -->
        <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-md p-3">
          <p class="text-sm text-green-800">{{ successMessage }}</p>
        </div>

        <!-- Error Messages -->
        <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-6 pt-4 border-t border-gray-200">
        <button
          @click="closeModal"
          class="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVouchers } from '~/composables/useVouchers'

// Props
interface Props {
  showModal: boolean
  vouchers: Array<{
    id: string
    code: string
    name: string
    amount_chf: number
  }>
  onClose?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  showModal: false,
  vouchers: () => [],
  onClose: undefined
})

// Composables
const { downloadVoucherPDF: downloadPDF, sendVoucherEmail } = useVouchers()

// State
const isDownloading = ref(false)
const isSendingEmails = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Methods
const downloadVoucherPDF = async (voucherId: string) => {
  try {
    isDownloading.value = true
    errorMessage.value = ''
    
    await downloadPDF(voucherId)
    successMessage.value = 'PDF erfolgreich heruntergeladen!'
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (err: any) {
    console.error('❌ Error downloading voucher PDF:', err)
    errorMessage.value = 'Fehler beim Herunterladen des PDFs'
    
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    isDownloading.value = false
  }
}

const downloadAllPDFs = async () => {
  try {
    isDownloading.value = true
    errorMessage.value = ''
    
    for (const voucher of props.vouchers) {
      await downloadPDF(voucher.id)
      // Kurze Pause zwischen Downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    successMessage.value = `${props.vouchers.length} PDF(s) erfolgreich heruntergeladen!`
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (err: any) {
    console.error('❌ Error downloading all voucher PDFs:', err)
    errorMessage.value = 'Fehler beim Herunterladen der PDFs'
    
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    isDownloading.value = false
  }
}

const sendAllEmails = async () => {
  try {
    isSendingEmails.value = true
    errorMessage.value = ''
    
    let successCount = 0
    
    for (const voucher of props.vouchers) {
      const result = await sendVoucherEmail(voucher.id)
      if (result.success) {
        successCount++
      }
      // Kurze Pause zwischen E-Mails
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    if (successCount > 0) {
      successMessage.value = `${successCount} E-Mail(s) erfolgreich gesendet!`
    } else {
      errorMessage.value = 'Keine E-Mails konnten gesendet werden'
    }
    
    setTimeout(() => {
      successMessage.value = ''
      errorMessage.value = ''
    }, 5000)
    
  } catch (err: any) {
    console.error('❌ Error sending all voucher emails:', err)
    errorMessage.value = 'Fehler beim Senden der E-Mails'
    
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  } finally {
    isSendingEmails.value = false
  }
}

const closeModal = () => {
  successMessage.value = ''
  errorMessage.value = ''
  if (props.onClose) {
    props.onClose()
  }
}

// Expose methods for parent components
defineExpose({
  downloadAllPDFs,
  sendAllEmails
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
