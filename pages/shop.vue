<!-- pages/shop.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-2 md:p-4">
    <div class="max-w-2xl mx-auto w-full">
      
              <!-- Header -->
        <div class="bg-white rounded-t-xl shadow-2xl">
          <div class="bg-gray-200 text-gray-700 p-4 md:p-6 rounded-t-xl">
            <div class="text-center">
              <LoadingLogo size="lg" class="mx-auto mb-2 md:mb-3" />
              <h1 class="text-xl md:text-2xl font-bold">Shop</h1>
            </div>
          </div>

          <!-- Navigation Back -->
          <div class="px-3 md:px-6 py-2 md:py-3 bg-gray-50 border-b">
            <button
              @click="goBack"
              class="text-gray-600 hover:text-gray-800 flex items-center text-sm w-full md:w-auto justify-center md:justify-start"
            >
              ← Zurück zur Auswahl
            </button>
          </div>

        <!-- Step Content -->
        <div class="bg-white p-3 md:p-6">
          <!-- SCHRITT 1: PRODUKTÜBERSICHT & WARENKORB -->
          <div v-if="currentStep === 1">
            <div class="space-y-6">
              <!-- Willkommensnachricht -->
              <div class="text-center mb-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Willkommen im Driving Team Shop!</h2>
                <p class="text-gray-600">Wählen Sie Ihre gewünschten Produkte aus und legen Sie sie in den Warenkorb.</p>
              </div>

              <!-- Produktübersicht -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">📦 Verfügbare Produkte</h3>
                
                <!-- Produktliste -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div v-for="product in availableProducts" :key="product.id" 
                       class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-3">
                      <h4 class="font-medium text-gray-900">{{ product.name }}</h4>
                      <span class="text-lg font-bold text-green-600">CHF {{ (product.price_rappen / 100).toFixed(2) }}</span>
                    </div>
                    <p v-if="product.description" class="text-sm text-gray-600 mb-3">{{ product.description }}</p>
                    
                    <!-- Menge hinzufügen -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <button
                          @click="updateQuantity(product.id, getProductQuantity(product.id) - 1)"
                          :disabled="getProductQuantity(product.id) <= 0"
                          class="w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span class="w-8 text-center font-medium">{{ getProductQuantity(product.id) }}</span>
                        <button
                          @click="updateQuantity(product.id, getProductQuantity(product.id) + 1)"
                          class="w-8 h-8 flex items-center justify-center bg-green-100 border border-green-300 rounded text-green-600 hover:bg-green-200"
                        >
                          +
                        </button>
                      </div>
                      <span class="text-sm text-gray-500">
                        {{ getProductQuantity(product.id) > 0 ? `CHF ${(getProductQuantity(product.id) * product.price_rappen / 100).toFixed(2)}` : '' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Warenkorb Zusammenfassung -->
                <div v-if="hasProducts" class="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
                  <h4 class="text-lg font-medium text-blue-900 mb-3">🛒 Ihr Warenkorb</h4>
                  
                  <!-- Produktliste im Warenkorb -->
                  <div class="space-y-2 mb-4">
                    <div v-for="item in selectedProducts" :key="item.product.id"
                         class="flex justify-between items-center text-sm">
                      <span class="text-blue-800">{{ item.product.name }} × {{ item.quantity }}</span>
                      <span class="font-medium text-blue-800">CHF {{ item.total.toFixed(2) }}</span>
                    </div>
                  </div>
                  
                  <!-- Gesamtpreis -->
                  <div class="flex justify-between items-center pt-3 border-t border-blue-200">
                    <span class="text-lg font-bold text-blue-900">Gesamtpreis:</span>
                    <span class="text-xl font-bold text-blue-900">CHF {{ totalPrice.toFixed(2) }}</span>
                  </div>
                </div>

                <!-- Gutschein erstellen -->
                <div class="mt-6">
                  <VoucherProductSelector
                    :existing-vouchers="availableVouchers"
                    @voucher-created="handleVoucherCreated"
                    @voucher-selected="handleVoucherSelected"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- SCHRITT 2: KUNDENDATEN -->
          <div v-if="currentStep === 2">
            <div class="space-y-6">
              <!-- Bestellübersicht -->
              <div v-if="hasProducts" class="bg-blue-50 rounded-lg p-4 border-2 border-blue-300 mb-6">
                <h3 class="text-lg font-medium text-blue-900 mb-3">📦 Ihre Bestellung</h3>
                
                <!-- Produktliste -->
                <div class="space-y-2 mb-4">
                  <div v-for="item in selectedProducts" :key="item.product.id"
                       class="flex justify-between items-center text-sm">
                    <span class="text-blue-800">{{ item.product.name }} × {{ item.quantity }}</span>
                    <span class="font-medium text-blue-800">CHF {{ item.total.toFixed(2) }}</span>
                  </div>
                </div>
                
                <!-- Gesamtpreis -->
                <div class="flex justify-between items-center pt-3 border-t border-blue-200">
                  <span class="text-lg font-bold text-blue-900">Gesamtpreis:</span>
                  <span class="text-xl font-bold text-blue-900">CHF {{ totalPrice.toFixed(2) }}</span>
                </div>
              </div>

              <!-- Kontaktdaten Formular -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">👤 Ihre Kontaktdaten</h3>
                
                <!-- Name -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Vorname *
                    </label>
                    <input
                      v-model="formData.firstName"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Nachname *
                    </label>
                    <input
                      v-model="formData.lastName"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Muster"
                    />
                  </div>
                </div>

                <!-- Contact -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail *
                    </label>
                    <input
                      v-model="formData.email"
                      type="email"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="max@example.com"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Telefon *
                    </label>
                    <input
                      v-model="formData.phone"
                      type="tel"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="+41 79 123 45 67"
                    />
                  </div>
                </div>

                <!-- Address -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Straße *
                    </label>
                    <input
                      v-model="formData.street"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Musterstraße"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Hausnummer *
                    </label>
                    <input
                      v-model="formData.streetNumber"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="123"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      PLZ *
                    </label>
                    <input
                      v-model="formData.zip"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="8000"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Ort *
                    </label>
                    <input
                      v-model="formData.city"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Zürich"
                    />
                  </div>
                </div>

                <!-- Führerschein-Kategorie -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Führerschein-Kategorie *
                  </label>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <label v-for="category in availableCategories" :key="category.code"
                           class="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer hover:border-green-500 transition-colors text-center"
                           :class="formData.category === category.code ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'">
                      <input
                        v-model="formData.category"
                        type="radio"
                        :value="category.code"
                        class="sr-only"
                      />
                      <span class="text-lg font-bold">{{ category.code }}</span>
                      <span class="text-xs mt-1">{{ category.name }}</span>
                    </label>
                  </div>
                </div>

                <!-- Bemerkungen -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Bemerkungen (optional)
                  </label>
                  <textarea
                    v-model="formData.notes"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Spezielle Wünsche, Zeitpräferenzen, etc."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- SCHRITT 3: PAYMENT -->
          <div v-if="currentStep === 3">
            <div class="space-y-4 md:space-y-6">
              <!-- Bestellübersicht -->
              <div class="bg-gray-50 rounded-lg p-3 md:p-4 border">
                <h3 class="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Bestellübersicht</h3>
                
                <!-- Kundendaten -->
                <div class="mb-3 md:mb-4 pb-3 md:pb-4 border-b">
                  <h4 class="text-xs md:text-sm font-medium text-gray-700 mb-2">Kunde:</h4>
                  <div class="text-xs md:text-sm text-gray-600 space-y-1">
                    <p class="break-words"><strong>{{ formData.firstName }} {{ formData.lastName }}</strong></p>
                    <p class="break-words">{{ formData.street }} {{ formData.streetNumber }}</p>
                    <p class="break-words">{{ formData.zip }} {{ formData.city }}</p>
                    <p class="break-words">{{ formData.email }}</p>
                    <p class="break-words">{{ formData.phone }}</p>
                  </div>
                </div>

                <!-- Produkte -->
                <div class="mb-3 md:mb-4">
                  <h4 class="text-xs md:text-sm font-medium text-gray-700 mb-2">Bestellte Produkte:</h4>
                  <div class="space-y-2 text-gray-700">
                    <div v-for="item in selectedProducts" :key="item.product.id" 
                         class="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                      <div class="flex-1 min-w-0">
                        <span class="text-xs md:text-sm font-medium break-words">{{ item.product.name }}</span>
                        <div class="text-xs text-gray-500">({{ item.quantity }}x CHF {{ (item.product.price_rappen / 100).toFixed(2) }})</div>
                      </div>
                      <span class="text-xs md:text-sm font-medium text-right sm:text-left">CHF {{ item.total.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Gesamtpreis -->
                <div class="pt-3 md:pt-4 border-t">
                  <div class="flex justify-between items-center">
                    <span class="text-base md:text-lg font-bold text-gray-900">Gesamtpreis:</span>
                    <span class="text-lg md:text-xl font-bold text-green-600">CHF {{ totalPrice.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <!-- Payment Component -->
              <PaymentComponent
                :appointment-id="undefined"
                :user-id="'00000000-0000-0000-0000-000000000001'"
                :staff-id="'00000000-0000-0000-0000-000000000002'"
                :is-standalone="true"
                :initial-products="selectedProducts.map(item => ({
                  id: item.product.id,
                  name: item.product.name,
                  description: item.product.description || '',
                  price_rappen: item.product.price_rappen,
                  category: item.product.category || '',
                  is_active: item.product.is_active || true,
                  is_voucher: false,
                  allow_custom_amount: false,
                  min_amount_rappen: 0,
                  max_amount_rappen: 0,
                  display_order: item.product.display_order || 0,
                  created_at: item.product.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  quantity: item.quantity,
                  unit_price_rappen: item.product.price_rappen,
                  total_price_rappen: Math.round(item.total * 100)
                }))"
                :initial-discounts="[]"
                @payment-created="handlePaymentCreated"
                @payment-failed="handlePaymentFailed"
                @cancel="goBack"
              />
            </div>
          </div>
        </div>

        <!-- Footer mit Navigation -->
        <div class="px-3 md:px-6 py-3 md:py-4 bg-gray-50 rounded-b-xl border-t">
          <div class="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
            <!-- Zurück Button -->
            <button
              v-if="currentStep > 1"
              @click="previousStep"
              class="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 md:px-6 rounded-lg transition-colors text-sm md:text-base"
            >
              Zurück
            </button>
            <div v-else class="w-full sm:w-auto"></div>

            <button
              v-if="currentStep < 3"
              @click="nextStep"
              :disabled="!canProceedToNextStep"
              class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 md:px-6 rounded-lg transition-colors text-sm md:text-base"
            >
              {{ currentStep === 1 ? 'Zur Kontaktdaten' : 'Zur Bezahlung' }} →
            </button>
            
            <!-- Bestellung absenden -->
            <button
              v-if="currentStep === 3"
              @click="submitOrder"
              :disabled="isSubmitting"
              class="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 md:px-6 rounded-lg transition-colors text-sm md:text-base"
            >
              <span v-if="isSubmitting">⏳ Bestellung wird gesendet...</span>
              <span v-else>Absenden</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification (oben zentriert) -->
    <Transition 
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-2"
    >
      <div v-if="showToast" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div class="bg-green-100 border border-green-300 rounded-lg shadow-lg px-6 py-2 min-w-80">
          <div class="flex items-center justify-center text-green-800 font-medium text-sm">
            <svg class="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-center">{{ toastMessage }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Auto-Save Status (oben rechts) - nur beim Speichern, nicht bei "Gespeichert!" Nachrichten -->
    <div v-if="autoSave.isAutoSaving.value" class="fixed top-4 right-4 z-40">
      <Transition 
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform translate-y-2"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform translate-y-2"
      >
        <!-- Nur Auto-Saving Indicator anzeigen -->
        <div class="bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 flex items-center space-x-2 shadow-lg">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span class="text-sm text-blue-700 font-medium">Speichere...</span>
        </div>
      </Transition>
    </div>

    <!-- Universal Recovery Modal -->
    <div v-if="autoSave.showRecoveryModal.value" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            Eingaben wiederherstellen?
          </h3>
          <p class="text-sm text-gray-600">
            Wir haben Ihre letzte Eingabe gefunden. Möchten Sie dort weitermachen?
          </p>
        </div>

        <!-- Recovery Info -->
        <div v-if="autoSave.recoveryData.value" class="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium text-gray-700">Gefunden:</span>
            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {{ autoSave.recoveryData.value.source }}
            </span>
          </div>
          <div class="text-xs text-gray-600">
            Gespeichert: {{ new Date(autoSave.recoveryData.value.timestamp).toLocaleString('de-CH') }}
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex space-x-3">
          <button
            @click="autoSave.clearDraft()"
            class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Neu beginnen
          </button>
          <button
            @click="autoSave.recoveryData.value && autoSave.restoreFromRecovery(autoSave.recoveryData.value)"
            :disabled="!autoSave.recoveryData.value"
            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Wiederherstellen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { definePageMeta } from '#imports'
import { useAutoSave } from '~/composables/useAutoSave'
import { useTenant } from '~/composables/useTenant'

const route = useRoute()
const { loadTenant, tenantSlug } = useTenant()

// Get tenant from URL parameter
const tenantParam = ref(route.query.tenant as string || '')

// Watch for route changes to update tenant
watch(() => route.query.tenant, (newTenant) => {
  if (newTenant && newTenant !== tenantParam.value) {
    tenantParam.value = newTenant as string
    console.log('🏢 Shop - Tenant updated from URL:', tenantParam.value)
    loadTenant(tenantParam.value)
  }
}, { immediate: true })

// Components
import VoucherProductSelector from '~/components/VoucherProductSelector.vue'
import PaymentComponent from '~/components/PaymentComponent.vue'
import ProductSelectorModal from '~/components/ProductSelectorModal.vue'

// TypeScript Interfaces
interface Product {
  id: string
  name: string
  description?: string
  price_rappen: number
  category?: string
  is_active?: boolean
  display_order?: number
  image_url?: string
  stock_quantity?: number
  track_stock?: boolean
  created_at?: string
}

interface ProductItem {
  product: Product
  quantity: number
  total: number
  customAmount?: number
}

interface WalleeResponse {
  success: boolean
  paymentUrl?: string
  error?: string
  transactionId?: string
}

// Reactive data - Multi-Step Process
const currentStep = ref(1) // 1: Produktübersicht, 2: Kontaktdaten, 3: Payment
const isSubmitting = ref(false)
const isLoadingProducts = ref(false)
const availableProducts = ref<Product[]>([])
const selectedProducts = ref<ProductItem[]>([])
const showProductSelector = ref(false)

// Toast notification
const toastMessage = ref('')
const showToast = ref(false)
const toastTimeout = ref<NodeJS.Timeout | null>(null)

// Debug: Log initial state
console.log('🔔 Initial toast state:', { showToast: showToast.value, message: toastMessage.value })

// Gutschein-Funktionalität
const availableVouchers = ref<any[]>([])

// Step 1: Customer Data
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  streetNumber: '',
  zip: '',
  city: '',
  category: '',
  notes: ''
})

// Available categories
const availableCategories = [
  { code: 'B', name: 'Auto' },
  { code: 'A1/A35kW/A', name: 'Motorrad/Roller' },
  { code: 'BPT', name: 'Taxi' },
  { code: 'BE', name: 'Anhänger' },
  { code: 'C', name: 'LKW' },
  { code: 'D', name: 'Bus' },
  { code: 'Motorboot', name: 'Motorboot' },

]

// Computed
const canSubmitStep1 = computed((): boolean => {
  return Boolean(
    formData.value.firstName && 
    formData.value.lastName && 
    formData.value.email && 
    formData.value.phone &&
    formData.value.street &&
    formData.value.streetNumber &&
    formData.value.zip &&
    formData.value.city &&
    formData.value.category
  )
})

const canProceedToPayment = computed(() => {
  return selectedProducts.value.length > 0 && selectedProducts.value.every(item => item.quantity > 0)
})

const totalPrice = computed(() => {
  return selectedProducts.value.reduce((sum, item) => sum + item.total, 0)
})

const hasProducts = computed(() => selectedProducts.value.length > 0)

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 1: return 'Produktübersicht & Warenkorb'
    case 2: return 'Ihre Kontaktdaten'
    case 3: return 'Bezahlung'
    default: return 'Laufkundschaft'
  }
})

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 1: return hasProducts.value
    case 2: return canSubmitStep1.value
    default: false
  }
})

// Verbesserte Produktvalidierung
const validateProductSelection = () => {
  if (selectedProducts.value.length === 0) {
    alert('❌ Bitte wählen Sie mindestens ein Produkt aus.')
    return false
  }
  
  const invalidProducts = selectedProducts.value.filter(item => item.quantity <= 0)
  if (invalidProducts.length > 0) {
    alert('❌ Alle Produkte müssen eine Menge größer als 0 haben.')
    return false
  }
  
  return true
}

// Step Navigation
const nextStep = () => {
  if (currentStep.value === 1 && !hasProducts.value) {
    alert('❌ Bitte wählen Sie mindestens ein Produkt aus.')
    return
  }
  
  if (currentStep.value === 2 && !canSubmitStep1.value) {
    alert('❌ Bitte füllen Sie alle Pflichtfelder aus.')
    return
  }
  
  if (currentStep.value < 3) {
    currentStep.value++
    
    // Produkte laden wenn wir zu Schritt 1 gehen
    if (currentStep.value === 1 && availableProducts.value.length === 0) {
      loadProducts()
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// Methods
const goBack = () => {
  const tenant = tenantParam.value || tenantSlug.value || 'driving-team'
  const url = `/auswahl?tenant=${tenant}`
  console.log('🔙 Shop - Going back to:', url)
  
  if (typeof navigateTo !== 'undefined') {
    navigateTo(url)
  } else {
    window.location.href = url
  }
}

// Produktverwaltung
const addProduct = (product: Product) => {
  const existingIndex = selectedProducts.value.findIndex(item => item.product.id === product.id)
  
  if (existingIndex >= 0) {
    // Produkt existiert bereits, erhöhe Menge
    selectedProducts.value[existingIndex].quantity += 1
    selectedProducts.value[existingIndex].total = selectedProducts.value[existingIndex].quantity * (product.price_rappen / 100)
  } else {
    // Neues Produkt hinzufügen
    selectedProducts.value.push({
      product,
      quantity: 1,
      total: product.price_rappen / 100
    })
    
    // Show toast notification
    showToastMessage(`✅ ${product.name} zum Warenkorb hinzugefügt!`)
  }
  console.log('✅ Product added:', product.name)
  showProductSelector.value = false
}

const handleProductsSelected = (products: any[]) => {
  // Konvertiere die Produkte vom neuen Format zurück zum bestehenden Format
  selectedProducts.value = products.map(item => ({
    product: {
      id: item.id,
      name: item.name,
      description: item.description,
      price_rappen: item.price_rappen,
      category: item.category,
      is_active: item.is_active,
      display_order: item.display_order,
      created_at: item.created_at
    },
    quantity: item.quantity || 1,
    total: (item.price_rappen / 100) * (item.quantity || 1),
    customAmount: item.customAmount || 0
  }))
  showProductSelector.value = false
  console.log('✅ Products selected:', products.length)
}

const removeProduct = (productId: string) => {
  const index = selectedProducts.value.findIndex(item => item.product.id === productId)
  if (index >= 0) {
    const productName = selectedProducts.value[index].product.name
    selectedProducts.value.splice(index, 1)
    console.log('🗑️ Product removed:', productName)
    
    // Show toast notification
    showToastMessage(`🗑️ ${productName} aus dem Warenkorb entfernt`)
  }
}

const updateQuantity = (productId: string, newQuantity: number) => {
  console.log('🔄 updateQuantity called:', productId, 'newQuantity:', newQuantity)
  
  if (newQuantity <= 0) {
    removeProduct(productId)
    return
  }
  
  const item = selectedProducts.value.find(item => item.product.id === productId)
    if (item) {
    // Produkt existiert bereits, aktualisiere Menge
    const oldQuantity = item.quantity
    item.quantity = newQuantity
    item.total = newQuantity * (item.product.price_rappen / 100)
    console.log('📊 Quantity updated:', item.product.name, 'x', newQuantity)
    
    // Show toast notification for quantity changes
    if (newQuantity > oldQuantity) {
      showToastMessage(`📈 ${item.product.name} Menge auf ${newQuantity} erhöht`)
    } else if (newQuantity < oldQuantity) {
      showToastMessage(`📉 ${item.product.name} Menge auf ${newQuantity} verringert`)
    }
  } else {
      // Produkt existiert noch nicht, füge es hinzu
      const product = availableProducts.value.find(p => p.id === productId)
      if (product) {
        const newItem = {
          product,
          quantity: newQuantity,
          total: newQuantity * (product.price_rappen / 100)
        }
        selectedProducts.value.push(newItem)
        console.log('✅ Product added to cart:', product.name, 'x', newQuantity, 'total:', newItem.total)
        
        // Show toast notification
        showToastMessage(`✅ ${product.name} zum Warenkorb hinzugefügt!`)
      } else {
        console.error('❌ Product not found:', productId)
      }
    }
  
  // Debug: Zeige aktuellen Warenkorb
  console.log('🛒 Current cart:', selectedProducts.value)
}

const getProductQuantity = (productId: string) => {
  const item = selectedProducts.value.find(item => item.product.id === productId)
  return item ? item.quantity : 0
}

// Toast notification functions
const showToastMessage = (message: string, duration: number = 3000) => {
  console.log('🔔 showToastMessage called:', message)
  
  // Clear existing timeout
  if (toastTimeout.value) {
    clearTimeout(toastTimeout.value)
  }
  
  toastMessage.value = message
  showToast.value = true
  
  console.log('🔔 Toast state:', { showToast: showToast.value, message: toastMessage.value })
  
  // Auto-hide after duration
  toastTimeout.value = setTimeout(() => {
    showToast.value = false
    toastMessage.value = ''
    console.log('🔔 Toast hidden')
  }, duration)
}

// Lade Produkte aus der Datenbank
const loadProducts = async () => {
  isLoadingProducts.value = true
  
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    if (error) throw error
    
    availableProducts.value = data || []
    console.log('✅ Products loaded:', availableProducts.value.length)
    console.log('📦 Available products:', availableProducts.value)
    
    // Wenn keine Produkte in der DB sind, zeige Fallback-Produkte
    if (availableProducts.value.length === 0) {
      console.log('⚠️ No products in database, showing fallback products')
      availableProducts.value = [
        { 
          id: 'fallback-1', 
          name: 'Theorielektionen', 
          description: 'Einzellektionen für die Theorieprüfung', 
          price_rappen: 4500, 
          category: 'theory',
          is_active: true,
          display_order: 1
        },
        { 
          id: 'fallback-2', 
          name: 'Lehrmaterial', 
          description: 'Theoriebücher und Online-Zugang', 
          price_rappen: 2900, 
          category: 'material',
          is_active: true,
          display_order: 2
        },
        { 
          id: 'fallback-3', 
          name: 'Praktische Fahrstunden', 
          description: 'Fahrstunden mit erfahrenem Fahrlehrer', 
          price_rappen: 8500, 
          category: 'practical',
          is_active: true,
          display_order: 3
        }
      ]
    }
    
  } catch (error) {
    console.error('❌ Error loading products:', error)
    // Fallback Produkte falls DB nicht erreichbar
    availableProducts.value = [
      { 
        id: 'error-1', 
        name: 'Theorielektionen', 
        description: 'Einzellektionen für die Theorieprüfung', 
        price_rappen: 4500, 
        category: 'theory',
        is_active: true,
        display_order: 1
      },
      { 
        id: 'error-2', 
        name: 'Lehrmaterial', 
        description: 'Theoriebücher und Online-Zugang', 
        price_rappen: 2900, 
        category: 'material',
        is_active: true,
        display_order: 2
      },
      { 
        id: 'error-3', 
        name: 'Praktische Fahrstunden', 
        description: 'Fahrstunden mit erfahrenem Fahrlehrer', 
        price_rappen: 8500, 
        category: 'practical',
        is_active: true,
        display_order: 3
      }
    ]
  } finally {
    isLoadingProducts.value = false
  }
}

const isAppleDevice = computed(() => {
  if (process.client) {
    return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
  }
  return false
})

const isAndroidDevice = computed(() => {
  if (process.client) {
    return /Android/.test(navigator.userAgent)
  }
  return false
})

// Payment Methods

const selectInvoicePayment = async () => {
  // Standard Rechnungsbestellung
  await submitOrder()
}

// Gutschein-Handler
const handleVoucherCreated = (voucherData: any) => {
  console.log('🎁 Voucher created:', voucherData)
  
  // Gutschein als Produkt hinzufügen
  const voucherProduct = {
    id: `voucher-${Date.now()}`,
    name: voucherData.name,
    description: voucherData.description,
    price_rappen: voucherData.price_rappen,
    category: 'Gutscheine',
    is_active: true,
    display_order: 999,
    is_voucher: true
  }
  
  addProduct(voucherProduct)
}

const handleVoucherSelected = (voucher: any) => {
  console.log('🎁 Voucher selected:', voucher)
  
  // Bestehenden Gutschein als Produkt hinzufügen
  const voucherProduct = {
    id: voucher.id,
    name: voucher.name,
    description: voucher.description,
    price_rappen: voucher.price_rappen,
    category: 'Gutscheine',
    is_active: true,
    display_order: 999,
    is_voucher: true
  }
  
  addProduct(voucherProduct)
}

// Auto-Save Integration
const autoSave = useAutoSave(
  // Was gespeichert werden soll
  computed(() => ({
    formData: formData.value,
    selectedProducts: selectedProducts.value,
    currentStep: currentStep.value
  })),
  
  // Konfiguration
  {
    formId: 'shop-order',
    tableName: 'invited_customers',
    
    // Wann in Database speichern
    isValidForDatabaseSave: () => canSubmitStep1.value,
   
    // Transformation für Database
    transformForSave: (data) => ({
      first_name: data.formData.firstName?.trim(),
      last_name: data.formData.lastName?.trim(),
      email: data.formData.email?.trim(),
      phone: data.formData.phone?.trim(),
      category: data.formData.category,
      notes: data.formData.notes || null,
      customer_type: 'laufkundschaft',
      source: 'website_shop',
      
      metadata: {
        address: {
          street: data.formData.street?.trim(),
          street_number: data.formData.streetNumber?.trim(),
          zip: data.formData.zip?.trim(),
          city: data.formData.city?.trim()
        },
        products: data.selectedProducts.map((item: any) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price_rappen: item.product.price_rappen,
          total_price_rappen: Math.round(item.total * 100)
        })),
        current_step: data.currentStep
      }
    }),
    
    // Transformation für Restore
    transformForRestore: (dbData) => ({
      formData: {
        firstName: dbData.first_name || '',
        lastName: dbData.last_name || '',
        email: dbData.email || '',
        phone: dbData.phone || '',
        street: dbData.metadata?.address?.street || '',
        streetNumber: dbData.metadata?.address?.street_number || '',
        zip: dbData.metadata?.address?.zip || '',
        city: dbData.metadata?.address?.city || '',
        category: dbData.category || '',
        notes: dbData.notes || ''
      },
        selectedProducts: dbData.metadata?.products?.map((p: any) => ({
          product: {
            id: p.product_id,
            name: p.product_name,
            price_rappen: p.unit_price_rappen
          },
          quantity: p.quantity,
          total: p.total_price_rappen / 100
        })) || [],
      currentStep: dbData.metadata?.current_step || 1
    }),
    
    // Callbacks
    onRestore: (data) => {
      console.log('🔄 Shop data restored!')
      // Produkte laden falls noch nicht da
      if (availableProducts.value.length === 0) {
        loadProducts()
      }
    },
    
    onError: (error) => {
      console.error('💾 Auto-save error:', error)
    }
  }
)

// Updated startOnlinePayment mit finalizeDraft und besserer Fehlerbehandlung
const startOnlinePayment = async () => {
  if (!hasProducts.value) return
  
  isSubmitting.value = true
  
  try {
    // Finalize draft as payment_pending
    let order = await autoSave.finalizeDraft('payment_pending')
    
    if (!order) {
      // Fallback: direct save
      order = await submitOrderWithStatus('payment_pending')
    }
    
    // Create Wallee payment
    const paymentData = {
      orderId: order.id,
      amount: totalPrice.value,
      currency: 'CHF',
      customerEmail: formData.value.email,
      customerName: `${formData.value.firstName} ${formData.value.lastName}`,
      description: `Driving Team Bestellung #${order.id}`,
      successUrl: `${window.location.origin}/payment/success?order=${order.id}`,
      failedUrl: `${window.location.origin}/payment/failed?order=${order.id}`
    }
    
    const response = await $fetch<WalleeResponse>('/api/wallee/create-transaction', {
      method: 'POST',
      body: paymentData
    })
    
    if (response.success && response.paymentUrl) {
      window.location.href = response.paymentUrl
    } else {
      throw new Error('Payment URL konnte nicht erstellt werden')
    }
    
  } catch (error: any) {
    console.error('❌ Online payment error:', error)
    
    // Spezifische Fehlerbehandlung für Wallee
    let errorMessage = '❌ Fehler beim Starten der Online-Zahlung.'
    
    if (error.statusCode === 442) {
      errorMessage = '❌ Zahlungssystem temporär nicht verfügbar. Bitte wählen Sie "Rechnung senden" oder versuchen Sie es später erneut.'
    } else if (error.statusCode === 401) {
      errorMessage = '❌ Authentifizierungsfehler. Bitte kontaktieren Sie den Support.'
    } else if (error.statusCode === 403) {
      errorMessage = '❌ Zugriff verweigert. Bitte kontaktieren Sie den Support.'
    } else if (error.data?.message?.includes('Permission denied')) {
      errorMessage = '❌ Zahlungssystem konfiguriert. Bitte wählen Sie "Rechnung senden" oder kontaktieren Sie den Support.'
    }
    
    alert(`${errorMessage}\n\nIhre Daten sind gespeichert und Sie können die Bestellung später abschließen.`)
  } finally {
    isSubmitting.value = false
  }
}

// Updated submitOrder mit finalizeDraft
const submitOrder = async () => {
  isSubmitting.value = true
  
  try {
    // Finalize draft as completed order
    const order = await autoSave.finalizeDraft('shop_inquiry')
    
    const productList = selectedProducts.value.map(item => 
      `• ${item.product.name} (${item.quantity}x à CHF ${(item.product.price_rappen / 100).toFixed(2)})`
    ).join('\n')
    
    alert(`✅ Bestellung erfolgreich aufgegeben!

Hallo ${formData.value.firstName},

Ihre Bestellung wurde erfolgreich übermittelt:

${productList}

Gesamtpreis: CHF ${totalPrice.value.toFixed(2)}

Sie erhalten in Kürze eine Rechnung per E-Mail.`)
    
    goBack()
    
  } catch (error: any) {
    console.error('❌ Error submitting order:', error)
    alert('❌ Fehler beim Absenden der Bestellung.')
  } finally {
    isSubmitting.value = false
  }
}

const submitOrderWithStatus = async (status: string) => {
  if (!canProceedToPayment.value) return null
  
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    const customerData = {
      first_name: formData.value.firstName.trim(),
      last_name: formData.value.lastName.trim(),
      email: formData.value.email.trim(),
      phone: formData.value.phone.trim(),
      category: formData.value.category,
      notes: formData.value.notes || null,
      customer_type: 'laufkundschaft',
      source: 'website_shop',
      status: status,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      requested_product_id: selectedProducts.value[0]?.product.id || null,
      quantity: selectedProducts.value.reduce((sum, item) => sum + item.quantity, 0),
      total_price_rappen: Math.round(totalPrice.value * 100),
      
      metadata: {
        address: {
          street: formData.value.street.trim(),
          street_number: formData.value.streetNumber.trim(),
          zip: formData.value.zip.trim(),
          city: formData.value.city.trim()
        },
        products: selectedProducts.value.map((item: any) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price_rappen: item.product.price_rappen,
          total_price_rappen: Math.round(item.total * 100)
        })),
        payment_method: status === 'payment_pending' ? 'online' : 'invoice',
        order_completed_at: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('invited_customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error
    return data
    
  } catch (error) {
    console.error('❌ Error saving order:', error)
    throw error
  }
}

// Auto-Save für andere Komponenten verfügbar machen
defineExpose({
  autoSave
})

// Lifecycle
onMounted(async () => {
  // Load tenant if tenant parameter is provided
  if (tenantParam.value) {
    console.log('🏢 Shop - Loading tenant from URL parameter:', tenantParam.value)
    await loadTenant(tenantParam.value)
  } else if (route.query.tenant) {
    console.log('🏢 Shop - Loading tenant from route query:', route.query.tenant)
    await loadTenant(route.query.tenant as string)
  }
  
  // Produkte direkt beim Laden der Seite laden
  console.log('🛍️ Shop mounted - Step-by-step process started')
  loadProducts()
})

onUnmounted(() => {
  // Cleanup toast timeout
  if (toastTimeout.value) {
    clearTimeout(toastTimeout.value)
  }
})

// Payment handlers
const handlePaymentCreated = (payment: any) => {
  console.log('✅ Payment created:', payment)
  
  // Bestellung als abgeschlossen markieren
  submitOrderWithStatus('completed')
    
  const productList = selectedProducts.value.map(item => 
    `• ${item.product.name} (${item.quantity}x à CHF ${(item.product.price_rappen / 100).toFixed(2)})`
  ).join('\n')
  
  alert(`✅ Zahlung erfolgreich!

Hallo ${formData.value.firstName},

Ihre Bestellung wurde erfolgreich bezahlt:

${productList}

Gesamtpreis: CHF ${totalPrice.value.toFixed(2)}

Sie erhalten in Kürze eine Bestätigung per E-Mail.`)
  
  goBack()
}

const handlePaymentFailed = (error: any) => {
  console.error('❌ Payment failed:', error)
  alert('❌ Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsmethode.')
}
</script>