<!-- components/InvoiceAddressModal.vue -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      
      <!-- Header -->
      <div class="bg-blue-600 text-white p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Rechnungsadresse</h2>
          <button 
            @click="close"
            class="text-white hover:text-blue-200 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content - Scrollable -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Toggle: Gleich wie Kundenadresse -->
        <div v-if="userAddress" class="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span class="text-sm font-medium text-gray-700">Gleich wie Kundenadresse</span>
          <button
            type="button"
            @click="toggleUseUserAddress"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              useUserAddress ? 'bg-blue-600' : 'bg-gray-300'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                useUserAddress ? 'translate-x-6' : 'translate-x-1'
              ]"
            ></span>
          </button>
        </div>

        <!-- Formular -->
        <form @submit.prevent="saveAndClose" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Firmenname</label>
            <input
              v-model="localInvoiceData.company_name"
              type="text"
              placeholder="Firmenname (optional)"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Kontaktperson *</label>
            <input
              v-model="localInvoiceData.contact_person"
              type="text"
              required
              placeholder="Vorname Nachname"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">E-Mail *</label>
            <input
              v-model="localInvoiceData.email"
              type="email"
              required
              placeholder="email@beispiel.ch"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
            <input
              v-model="localInvoiceData.phone"
              type="tel"
              placeholder="+41 44 123 45 67"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Straße & Hausnummer *</label>
            <div class="grid grid-cols-3 gap-2">
              <input
                v-model="localInvoiceData.street"
                type="text"
                required
                placeholder="Musterstraße"
                class="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              >
              <input
                v-model="localInvoiceData.street_number"
                type="text"
                required
                placeholder="123"
                class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              >
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">PLZ *</label>
              <input
                v-model="localInvoiceData.zip"
                type="text"
                required
                placeholder="8000"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              >
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Ort *</label>
              <input
                v-model="localInvoiceData.city"
                type="text"
                required
                placeholder="Zürich"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              >
            </div>
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Land</label>
            <input
              v-model="localInvoiceData.country"
              type="text"
              placeholder="Schweiz"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">MWST-Nummer</label>
              <input
                v-model="localInvoiceData.vat_number"
                type="text"
                placeholder="CHE-123.456.789"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              >
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Handelsregisternummer</label>
              <input
                v-model="localInvoiceData.company_register_number"
                type="text"
                placeholder="CH-123.456.789"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              >
            </div>
          </div>
          
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Notizen</label>
            <textarea
              v-model="localInvoiceData.notes"
              placeholder="Zusätzliche Informationen..."
              rows="2"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            ></textarea>
          </div>
        </form>
      </div>

      <!-- Footer - Action Buttons -->
      <div class="border-t p-4 bg-gray-50 flex justify-end gap-3">
        <button
          type="button"
          @click="close"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          type="button"
          @click="saveAndClose"
          :disabled="!isFormValid"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Speichern
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { logger } from '~/utils/logger'

interface InvoiceData {
  company_name: string
  contact_person: string
  email: string
  phone: string
  street: string
  street_number: string
  zip: string
  city: string
  country: string
  vat_number: string
  company_register_number: string
  notes: string
}

interface Props {
  isOpen: boolean
  invoiceData?: Partial<InvoiceData>
  userAddress?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: [data: InvoiceData]
}>()

// Local state
const useUserAddress = ref(false)
const localInvoiceData = ref<InvoiceData>({
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  street: '',
  street_number: '',
  zip: '',
  city: '',
  country: 'Schweiz',
  vat_number: '',
  company_register_number: '',
  notes: ''
})

// Initialize with props data
watch(() => props.invoiceData, (newData) => {
  if (newData) {
    localInvoiceData.value = {
      company_name: newData.company_name || '',
      contact_person: newData.contact_person || '',
      email: newData.email || '',
      phone: newData.phone || '',
      street: newData.street || '',
      street_number: newData.street_number || '',
      zip: newData.zip || '',
      city: newData.city || '',
      country: newData.country || 'Schweiz',
      vat_number: newData.vat_number || '',
      company_register_number: newData.company_register_number || '',
      notes: newData.notes || ''
    }
  }
}, { immediate: true })

// Form validation
const isFormValid = computed(() => {
  return !!(
    localInvoiceData.value.contact_person &&
    localInvoiceData.value.email &&
    localInvoiceData.value.street &&
    localInvoiceData.value.street_number &&
    localInvoiceData.value.zip &&
    localInvoiceData.value.city
  )
})

// Toggle user address
const toggleUseUserAddress = () => {
  useUserAddress.value = !useUserAddress.value
  
  if (useUserAddress.value && props.userAddress) {
    // Fill with user address (only basic fields available)
    localInvoiceData.value.contact_person = `${props.userAddress.first_name || ''} ${props.userAddress.last_name || ''}`.trim()
    localInvoiceData.value.email = props.userAddress.email || ''
    localInvoiceData.value.phone = props.userAddress.phone || ''
    
    logger.debug('✅ Filled invoice address with user contact data')
  }
}

// Actions
const close = () => {
  emit('close')
}

const saveAndClose = () => {
  if (!isFormValid.value) {
    logger.warn('⚠️ Invoice form is not valid')
    return
  }
  
  logger.debug('💾 Saving invoice address:', localInvoiceData.value)
  emit('save', localInvoiceData.value)
  close()
}
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}
</style>
