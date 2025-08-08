<!-- PriceDisplay.vue - Sauberes Template -->
<template>
  <div class="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-700">
        💰 {{ eventType === 'lesson' ? 'Preisübersicht Fahrstunde' : 'Preisübersicht Termin' }}
      </h3>
    </div>

    <!-- HAUPTPREIS-ANZEIGE -->
    <div class="space-y-3">
      
      <!-- 1. FAHRSTUNDEN-GRUNDPREIS -->
      <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div class="flex-1">
          <!-- Datum, Zeit, Dauer -->
          <div class="text-xs text-blue-700 space-y-0.5">
            <div v-if="selectedDate">📅 {{ formatSelectedDate(selectedDate) }}</div>
            <div v-if="startTime && endTime">🕐 {{ startTime }} - {{ endTime }}</div>
            <div>⏱️ {{ durationMinutes }} Minuten</div>
          </div>
        </div>
        <span class="text-lg font-bold text-blue-900 ml-4">
          CHF {{ formatPrice(lessonPrice) }}
        </span>
      </div>

      <!-- 2. PRODUKTE ANZEIGE -->
      <div v-if="productSale.hasProducts.value" class="space-y-2">
        <div class="text-sm font-medium text-gray-700">📚 Zusätzliche Produkte</div>
        <div v-for="item in productSale.selectedProducts.value" :key="item.product.id" 
             class="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
          <div class="flex-1">
            <div class="text-sm font-medium text-green-800">{{ item.product.name }}</div>
            <div class="text-xs text-green-600">{{ item.quantity }}x CHF {{ item.product.price.toFixed(2) }}</div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-bold text-green-800">CHF {{ item.total.toFixed(2) }}</span>
            <button 
              @click="productSale.removeProduct(item.product.id)" 
              class="text-red-500 hover:text-red-700 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- 3. VERSICHERUNGSGEBÜHR -->
      <div v-if="shouldShowAdminFee" class="flex justify-between items-center p-2 bg-orange-50 rounded border border-orange-200">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-orange-800">🛡️ Versicherung</span>
          <button 
            @click="showAdminFeeInfo = !showAdminFeeInfo"
            class="text-orange-600 hover:text-orange-800 text-xs"
          >
            ℹ️
          </button>
        </div>
        <span class="text-sm font-bold text-orange-800">CHF {{ formatPrice(pricing.calculatedAdminFee.value) }}</span>
      </div>

      <!-- 4. RABATT ANZEIGE -->
      <div v-if="discount > 0" class="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-green-800">🏷️ Rabatt</span>
          <span v-if="discountReason" class="text-xs text-green-600">({{ discountReason }})</span>
        </div>
        <span class="text-sm font-bold text-green-800">- CHF {{ formatPrice(discount) }}</span>
                  <button 
            @click="removeDiscount"
            class="text-red-500 hover:text-red-700 text-xs"
          >
            ✕
          </button>
      </div>

      <!-- 5. GESAMTPREIS -->
      <div class="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
        <span class="text-lg font-bold text-gray-900">💳 Gesamtpreis</span>
        <span class="text-xl font-bold text-gray-900">CHF {{ formatPrice(finalPrice) }}</span>
      </div>
    </div>

    <!-- EDIT-BUTTONS (nur im Edit-Mode sichtbar) -->
    <div class="flex space-x-2 pt-2 border-t border-gray-200">
      <!-- Rabatt-Button -->
      <button
        v-if="allowDiscountEdit && !showDiscountEdit"
        @click="showDiscountEdit = true"
        class="flex items-center px-3 py-2 text-sm text-green-600 border border-green-300 rounded-md hover:bg-green-50"
      >
        🏷️ Rabatt
      </button>

      <!-- Produkt-Button -->
      <button
        v-if="allowProductSale && !productSale.showProductSelector.value"
        @click="productSale.openProductSelector()"
        class="flex items-center px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
      >
        📚 Produkte
      </button>
    </div>

    <!-- VERSICHERUNGS-INFO -->
    <div v-if="showAdminFeeInfo" class="bg-orange-50 border border-orange-200 rounded-md p-3">
      <h4 class="text-sm font-medium text-orange-800 mb-1">🛡️ Versicherungsgebühr</h4>
      <p class="text-xs text-orange-700">Diese Gebühr wird für jeden Termin einmalig erhoben.</p>
    </div>

    <!-- RABATT-BEARBEITUNGS-SEKTION -->
    <div v-if="showDiscountEdit" class="border-t border-gray-200 pt-4">      
      <div class="space-y-3">
        <h4 class="text-sm font-medium text-gray-700">🏷️ Rabatt hinzufügen</h4>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rabattbetrag (CHF)</label>
          <input 
            type="number" 
            v-model="tempDiscountInput"
            @blur="formatToTwoDecimals"
            step="0.01"
            min="0"
            :max="maxDiscount"
            placeholder="z.B. 20.00"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
          <p class="text-xs text-gray-500 mt-1">
            Maximaler Rabatt: CHF {{ formatPrice(maxDiscount) }}
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Grund für Rabatt</label>
          <input 
            type="text" 
            v-model="tempDiscountReason"
            placeholder="z.B. Treuebonus, Ausbildungsrabatt"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>

        <!-- BUTTONS -->
        <div class="flex justify-end space-x-3">
          <button
            @click="cancelDiscountEdit"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="applyDiscount"
            :disabled="tempDiscount <= 0"
            class="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rabatt anwenden
          </button>
        </div>
      </div>
    </div>

    <!-- PRODUKT-AUSWAHL-SEKTION -->
    <div v-if="productSale.showProductSelector.value" class="border-t border-gray-200 pt-4">      
      <div class="space-y-3">
        <h4 class="text-sm font-medium text-gray-700">📚 Produkte hinzufügen</h4>
        
        <!-- Produkt-Grid -->
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="product in productSale.availableProducts.value"
            :key="product.id"
            @click="productSale.addProduct(product)"
            class="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div class="text-sm font-medium">{{ product.name }}</div>
            <div class="text-xs text-gray-500 mb-1">{{ product.description }}</div>
            <div class="text-sm font-bold text-blue-600">CHF {{ product.price.toFixed(2) }}</div>
          </button>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end">
          <button 
            @click="productSale.closeProductSelector()" 
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>

    <!-- ZAHLUNGSART-SEKTION (vereinfacht) -->
    <div class="border-t border-gray-200 pt-4">
      <h4 class="text-md font-medium text-gray-900 mb-3">Zahlungsart wählen</h4>
      
      <div class="space-y-3">
        <!-- Rechnung Toggle -->
        <div class="flex items-center justify-between p-3 border rounded-lg" 
             :class="[
               invoiceMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
             ]">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Rechnung</span>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="invoiceMode" 
              @change="onInvoiceModeChange"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

          <!-- RECHNUNGSFELDER - MIT BESTEHENDEN FUNKTIONEN -->
          <div v-if="invoiceMode" class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 class="text-sm font-medium text-blue-800 mb-3">📋 Rechnungsadresse</h4>
            
            <!-- Bestehende Adressen laden Button -->
            <div v-if="companyBilling.savedAddresses.value.length === 0 && !companyBilling.currentAddress.value" class="mb-3">
              <button
                @click="loadExistingAddresses"
                class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                :disabled="companyBilling.isLoading.value"
              >
                {{ companyBilling.isLoading.value ? 'Laden...' : 'Bestehende Adressen laden' }}
              </button>
            </div>
            
            <!-- ✅ KORRIGIERT: Dropdown immer anzeigen wenn Adressen da sind -->
            <div v-if="companyBilling.savedAddresses.value.length > 0" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Gespeicherte Adresse auswählen:</label>
              <select
                :value="companyBilling.currentAddress.value?.id || ''"
                @change="selectExistingAddress(($event.target as HTMLSelectElement).value)"
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Neue Adresse eingeben</option>
                <option 
                  v-for="address in companyBilling.savedAddresses.value" 
                  :key="address.id" 
                  :value="address.id"
                >
                  {{ companyBilling.getAddressPreview(address) }}
                </option>
              </select>
            </div>
            
            <!-- Formular Felder -->
            <div v-if="!companyBilling.currentAddress.value" class="space-y-3">
              <!-- Firmenname -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
                <input
                  v-model="companyBilling.formData.value.companyName"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Firma AG"
                />
                <div v-if="companyBilling.validation.value.errors.companyName" class="text-red-500 text-xs mt-1">
                  {{ companyBilling.validation.value.errors.companyName }}
                </div>
              </div>
              
              <!-- Kontaktperson -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kontaktperson *</label>
                <input
                  v-model="companyBilling.formData.value.contactPerson"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Max Muster"
                />
                <div v-if="companyBilling.validation.value.errors.contactPerson" class="text-red-500 text-xs mt-1">
                  {{ companyBilling.validation.value.errors.contactPerson }}
                </div>
              </div>
              
              <!-- E-Mail -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                <input
                  v-model="companyBilling.formData.value.email"
                  type="email"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="rechnung@firma.ch"
                />
                <div v-if="companyBilling.validation.value.errors.email" class="text-red-500 text-xs mt-1">
                  {{ companyBilling.validation.value.errors.email }}
                </div>
              </div>
              
              <!-- Adresse -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Strasse *</label>
                  <input
                    v-model="companyBilling.formData.value.street"
                    type="text"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Musterstrasse"
                  />
                  <div v-if="companyBilling.validation.value.errors.street" class="text-red-500 text-xs mt-1">
                    {{ companyBilling.validation.value.errors.street }}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Hausnummer</label>
                  <input
                    v-model="companyBilling.formData.value.streetNumber"
                    type="text"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123"
                  />
                </div>
              </div>
              
              <!-- PLZ/Ort -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
                  <input
                    v-model="companyBilling.formData.value.zip"
                    type="text"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8000"
                  />
                  <div v-if="companyBilling.validation.value.errors.zip" class="text-red-500 text-xs mt-1">
                    {{ companyBilling.validation.value.errors.zip }}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
                  <input
                    v-model="companyBilling.formData.value.city"
                    type="text"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Zürich"
                  />
                  <div v-if="companyBilling.validation.value.errors.city" class="text-red-500 text-xs mt-1">
                    {{ companyBilling.validation.value.errors.city }}
                  </div>
                </div>
              </div>
              
              <!-- Optional: VAT -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">MwSt-Nummer (optional)</label>
                <input
                  v-model="companyBilling.formData.value.vatNumber"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CHE-123.456.789"
                />
              </div>
              
              <!-- Speichern Button -->
              <div class="flex justify-end">
                <button
                  @click="saveCompanyBillingAddress"
                  :disabled="!companyBilling.validation.value.isValid || companyBilling.isLoading.value"
                  class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ companyBilling.isLoading.value ? 'Speichern...' : 'Adresse speichern' }}
                </button>
              </div>
            </div>
            
            <!-- Gespeicherte Adresse anzeigen -->
            <div v-if="companyBilling.currentAddress.value" class="bg-green-50 border border-green-200 rounded p-3">
              <div class="flex justify-between items-start">
                <div>
                  <h5 class="font-medium text-green-800">{{ companyBilling.currentAddress.value.company_name }}</h5>
                  <p class="text-sm text-green-700">{{ companyBilling.currentAddress.value.contact_person }}</p>
                  <p class="text-sm text-green-600">
                    {{ companyBilling.currentAddress.value.street }} {{ companyBilling.currentAddress.value.street_number || '' }}<br>
                    {{ companyBilling.currentAddress.value.zip }} {{ companyBilling.currentAddress.value.city }}<br>                  </p>
                </div>
                <button
                  @click="companyBilling.currentAddress.value = null; companyBilling.resetForm()"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  Ändern
                </button>
              </div>
            </div>
            
            <!-- Error anzeigen -->
            <div v-if="companyBilling.error.value" class="text-red-600 text-sm mt-2">
              {{ companyBilling.error.value }}
            </div>
          </div>

        <!-- Barzahlung Toggle -->
        <div class="flex items-center justify-between p-3 border rounded-lg"
             :class="[
               cashMode ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-gray-50'
             ]">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Barzahlung</span>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="cashMode" 
              @change="onCashModeChange"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
          </label>
        </div>

        <!-- Online Zahlung (Standard) -->
        <div v-if="!invoiceMode && !cashMode" class="flex items-center justify-between p-3 border-2 border-green-500 bg-green-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Online Zahlung</span>
              <p class="text-sm text-gray-600">Twint, Kreditkarte über Wallee</p>
            </div>
          </div>
          <span class="px-2 py-1 bg-green-600 text-white text-xs rounded-full">Aktiv</span>
        </div>
      </div>
    </div>

    <!-- Statusmeldung -->
    <div v-if="paymentModeStatus" class="text-sm p-3 rounded-lg" 
         :class="[
           paymentModeStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
           paymentModeStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
           'bg-red-50 text-red-800 border border-red-200'
         ]">
      {{ paymentModeStatus.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProductSale } from '~/composables/useProductSale'
import { useCompanyBilling } from '~/composables/useCompanyBilling'
import { usePricing } from '~/composables/usePricing'
import { getSupabase } from '~/utils/supabase'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { navigateTo } from '#app'

// Props Interface - nur die nötigsten
interface Props {
  eventType?: 'lesson' | 'staff_meeting' | 'other'
  eventData?: any 
  selectedDate?: string
  startTime?: string
  endTime?: string
  durationMinutes: number
  pricePerMinute: number
  adminFee?: number
  appointmentNumber?: number
  discount?: number
  discountReason?: string
  allowDiscountEdit?: boolean
  allowProductSale?: boolean
  disabled?: boolean
  showAdminFeeByDefault?: boolean
  isSecondOrLaterAppointment?: boolean
  currentUser?: any
  selectedStudent?: any
  initialPaymentMethod?: string
  isPaid?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  eventType: 'lesson',
  durationMinutes: 45,
  // pricePerMinute: 2.11,
  // adminFee: 25,
  // appointmentNumber: 1,
  discount: 0,
  discountReason: '',
  allowDiscountEdit: true,
  allowProductSale: true,
  disabled: false,
  showAdminFeeByDefault: false,
  isSecondOrLaterAppointment: false,
  isPaid: false
})

// Emits - nur die nötigsten
const emit = defineEmits<{
  'discount-changed': [discount: number, discountType: "fixed" | "percentage", reason: string]
  'products-changed': [products: any[]]
  'payment-method-changed': [method: string, data?: any]
}>()

const priceDisplayRef = ref()

// ✅ BESTEHENDE COMPOSABLES VERWENDEN
const productSale = useProductSale(
  computed(() => props.eventData?.id),  // appointmentId
  []  // initial products
)
const companyBilling = useCompanyBilling()

// ✅ MINIMALE REACTIVE DATA
const isEditMode = ref(false)
const showDiscountEdit = ref(false)
const showAdminFeeInfo = ref(false)
const tempDiscountInput = ref('')
const tempDiscountReason = ref('')

// Payment 
const invoiceMode = ref(false)
const cashMode = ref(false)
const { loadStudentPaymentPreference } = usePaymentMethods()
const isProcessingPayment = ref(false)

const pricing = usePricing({
  selectedStudent: computed(() => props.selectedStudent),
  currentUser: computed(() => props.currentUser),
  durationMinutes: computed(() => props.durationMinutes),
  categoryCode: computed(() => props.eventType), 
  isSecondOrLaterAppointment: computed(() => props.isSecondOrLaterAppointment),
  showAdminFeeByDefault: computed(() => props.showAdminFeeByDefault),
  watchChanges: true,  
  autoUpdate: true     
})


// ✅ COMPUTED PROPERTIES - nur die nötigsten
const lessonPrice = computed(() => {
  // ✅ EINFACH: Verwende die Props direkt!
  const pricePerMin = props.pricePerMinute || 0
  const duration = props.durationMinutes || 0
  const result = pricePerMin * duration
  
  console.log('💰 PriceDisplay SIMPLE calculation:', {
    pricePerMinute: pricePerMin,
    durationMinutes: duration,
    result: result
  })
  
  return result
})

const shouldShowAdminFee = computed(() => 
  pricing.calculatedAdminFee.value > 0

)

const totalPriceWithoutDiscount = computed(() => {
  let total = lessonPrice.value
  if (shouldShowAdminFee.value) {
    total += pricing.calculatedAdminFee.value || 0
  }
  total += productSale.totalProductsValue.value
  return total
})

const maxDiscount = computed(() => totalPriceWithoutDiscount.value)

const tempDiscount = computed(() => {
  const value = parseFloat(tempDiscountInput.value) || 0
  return Math.min(value, maxDiscount.value)
})

const finalPrice = computed(() => {
  const total = totalPriceWithoutDiscount.value - (props.discount || 0)
  return Math.max(0, total)
})

const paymentModeStatus = computed(() => {
  if (!invoiceMode.value && !cashMode.value) {
    return {
      type: 'success' as const,
      message: 'Online-Zahlung über Customer Dashboard.'
    }
  }
  
  if (invoiceMode.value) {
    return {
      type: 'success' as const,
      message: 'Rechnung wird im Büro erstellt und versendet.'
    }
  }
  
  if (cashMode.value) {
    return {
      type: 'success' as const,
      message: 'Zahlung erfolgt bar beim Fahrlehrer.'
    }
  }
  
  return null
})

// ✅ METHODS - nur die nötigsten
const formatPrice = (amount: number): string => {
  return amount.toFixed(2)
}

const formatSelectedDate = (date: string): string => {
  return new Date(date).toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatToTwoDecimals = () => {
  if (tempDiscountInput.value) {
    tempDiscountInput.value = parseFloat(tempDiscountInput.value).toFixed(2)
  }
}

// Edit Mode
const toggleEditMode = () => {
  if (isEditMode.value) {
    // Speichern-Modus
    if (showDiscountEdit.value && tempDiscountInput.value) {
      applyDiscount()
    }
    
    showDiscountEdit.value = false
    productSale.closeProductSelector()
    showAdminFeeInfo.value = false
    isEditMode.value = false
  } else {
    isEditMode.value = true
  }
}

const saveStudentPaymentPreference = async (studentId: string, paymentMethod: string) => {
  try {
    const supabase = getSupabase()
    
    // ✅ Mapping zu gültigen payment_methods codes
    const methodMapping: Record<string, string> = {
      'cash': 'cash',
      'invoice': 'invoice', 
      'online': 'twint'  // oder 'stripe_card' - je nachdem was in deiner DB existiert
    }
    
    const validMethod = methodMapping[paymentMethod] || 'cash'
    
    const { error } = await supabase
      .from('users')
      .update({ preferred_payment_method: validMethod })
      .eq('id', studentId)

    if (error) throw error
    console.log('✅ Payment preference saved:', validMethod)
    
  } catch (err) {
    console.error('❌ Error saving payment preference:', err)
  }
}

// CustomerDashboard.vue - im script setup hinzufügen:
const payIndividual = async (payment: any) => {
  console.log('💳 Starting payment for:', payment)
  isProcessingPayment.value = true
  
  try {
    // 1. Wallee Payment erstellen
    const paymentUrl = await createWalleePayment(payment)
    
    if (paymentUrl) {
      // 2. Redirect zum Wallee Payment
      window.location.href = paymentUrl
    } else {
      // 3. Fallback: Mock-Payment-Seite
      await navigateTo(`/payment/process?amount=${payment.total_amount_rappen / 100}&payment_id=${payment.id}`)
    }
    
  } catch (error: any) {
    console.error('❌ Payment error:', error)
    alert('Zahlung konnte nicht gestartet werden. Bitte versuchen Sie es später erneut.')
  } finally {
    isProcessingPayment.value = false
  }
}

const createWalleePayment = async (payment: any) => {
  try {
    // Hier würde die echte Wallee-Integration stehen
    console.log('🔄 Creating Wallee payment for:', payment.total_amount_rappen / 100, 'CHF')
    
    // Mock für jetzt
    return null
    
  } catch (error) {
    console.error('❌ Wallee payment creation failed:', error)
    return null
  }
}

// Discount Methods
const applyDiscount = () => {
  emit('discount-changed', tempDiscount.value, 'fixed', tempDiscountReason.value)
  showDiscountEdit.value = false
  tempDiscountInput.value = ''
  tempDiscountReason.value = ''
}

const cancelDiscountEdit = () => {
  showDiscountEdit.value = false
  tempDiscountInput.value = ''
  tempDiscountReason.value = ''
}

const removeDiscount = () => {
  emit('discount-changed', 0, 'fixed', '')
}

// Payment Methods
const onInvoiceModeChange = () => {
  console.log('🔍 DEBUG: onInvoiceModeChange called')
  console.log('🔍 DEBUG: invoiceMode.value BEFORE:', invoiceMode.value)
  console.log('🔍 DEBUG: cashMode.value BEFORE:', cashMode.value)
  
  if (invoiceMode.value && cashMode.value) {
    cashMode.value = false
  }
  
  // ✅ NEU: Automatisch Adressen laden wenn Invoice Mode aktiviert wird
  if (invoiceMode.value && companyBilling.savedAddresses.value.length === 0) {
    autoLoadBillingAddress()
  }
  
  updatePaymentMode()
  
  console.log('🔍 DEBUG: invoiceMode.value AFTER:', invoiceMode.value)
  console.log('🔍 DEBUG: cashMode.value AFTER:', cashMode.value)
}

const loadExistingAddresses = async () => {
  if (!props.selectedStudent?.id) {
    console.warn('❌ No student selected for loading addresses')
    return
  }
  
  console.log('🔄 Loading existing addresses for student:', props.selectedStudent.id)
  
  try {
    // ✅ KORRIGIERT: getSupabase() direkt verwenden
    const supabase = getSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user?.id) {
      console.warn('❌ No authenticated user found')
      return
    }
    
    console.log('👤 Loading addresses for auth user:', user.id)
    
    // ✅ VERWENDE DIE BESTEHENDE FUNKTION MIT AUTH USER ID
    await companyBilling.loadUserCompanyAddresses(props.selectedStudent.id)
    
    console.log('✅ Loaded addresses:', companyBilling.savedAddresses.value.length)
    
    // Auto-select first address if available
    if (companyBilling.savedAddresses.value.length > 0) {
      const firstAddress = companyBilling.savedAddresses.value[0]
      companyBilling.loadFormFromAddress(firstAddress)
      console.log('✅ Auto-selected first address:', firstAddress.company_name)
    }
    
  } catch (error) {
    console.error('❌ Error loading existing addresses:', error)
  }
}

const selectExistingAddress = (addressId: string) => {
  if (!addressId) {
    // "Neue Adresse eingeben" gewählt
    companyBilling.resetForm()
    companyBilling.currentAddress.value = null
    return
  }
  
  const address = companyBilling.savedAddresses.value.find(addr => addr.id === addressId)
  if (address) {
    companyBilling.loadFormFromAddress(address)
    updatePaymentMode()
    console.log('✅ Selected address:', address.company_name)
  }
}

const saveCompanyBillingAddress = async () => {
  if (!props.selectedStudent?.id) return
  
  // ✅ BESTEHENDE FUNKTION VERWENDEN
  const result = await companyBilling.createCompanyBillingAddress(props.selectedStudent.id)
  
  if (result.success && result.data) {
    console.log('✅ Company billing address saved:', result.data.id)
    
    // Nach dem Speichern updatePaymentMode aufrufen
    updatePaymentMode()
  }
}


// ✅ KORRIGIERTE autoLoadBillingAddress Funktion:
const autoLoadBillingAddress = async () => {
  if (!props.selectedStudent?.id) return

  try {
    const supabase = getSupabase()
    
    // 1. IMMER alle verfügbaren Adressen für Dropdown laden
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.id) return
    
    await companyBilling.loadUserCompanyAddresses(user.id)
    console.log('✅ Loaded all addresses:', companyBilling.savedAddresses.value.length)
    
    // 2. Prüfen ob Schüler eine Standard-Adresse hat
    const { data: studentData, error: studentError } = await supabase
      .from('users')
      .select('default_company_billing_address_id, first_name, last_name')
      .eq('id', props.selectedStudent.id)
      .single()
    
    console.log('🔍 Student default address ID:', studentData?.default_company_billing_address_id)
    
    if (studentData?.default_company_billing_address_id) {
      // 3. Standard-Adresse finden und vorauswählen
      const defaultAddress = companyBilling.savedAddresses.value.find(
        addr => addr.id === studentData.default_company_billing_address_id
      )
      
      if (defaultAddress) {
        console.log('✅ Pre-selecting student default address:', defaultAddress.company_name)
        companyBilling.loadFormFromAddress(defaultAddress)
        updatePaymentMode()
      } else {
        console.log('⚠️ Student default address not found in loaded addresses')
        companyBilling.resetForm()
      }
    } else {
      console.log('ℹ️ Student has no default address - form empty, all addresses available')
      companyBilling.resetForm()
    }
    
  } catch (error) {
    console.error('❌ Error loading billing addresses:', error)
  }
}

// ✅ NEUE Funktion: Alle Adressen für Dropdown laden (ohne Vorauswahl)
const loadAllAddressesForDropdown = async () => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user?.id) return
    
    // Alle verfügbaren Firmenadressen laden
    await companyBilling.loadUserCompanyAddresses(user.id)
    console.log('📋 Loaded all addresses for dropdown:', companyBilling.savedAddresses.value.length)
    
    // ✅ WICHTIG: KEINE automatische Auswahl!
    // User muss manuell aus Dropdown wählen
    
  } catch (error) {
    console.error('❌ Error loading addresses for dropdown:', error)
  }
}

// ✅ ERWEITERE DIE BESTEHENDE updatePaymentMode FUNKTION:
const updatePaymentMode = () => {
  let method = 'online'
  let data = null
  
  if (invoiceMode.value) {
    method = 'invoice'
    if (companyBilling.currentAddress.value) {
      data = {
        formData: companyBilling.formData.value,
        currentAddress: companyBilling.currentAddress.value,
        isValid: companyBilling.validation.value.isValid
      }
    }
  } else if (cashMode.value) {
    method = 'cash'
  }
    console.log('🔥 PriceDisplay EMITTING payment-method-changed:', method) // ← Debug hinzufügen

  // ✅ NEU: Speichern der Zahlungsmethode
  if (props.selectedStudent?.id) {
    saveStudentPaymentPreference(props.selectedStudent.id, method)
  }
  
  emit('payment-method-changed', method, data)
    console.log('✅ Event emitted successfully') // ← Debug hinzufügen

}

const onCashModeChange = () => {
  if (cashMode.value && invoiceMode.value) {
    invoiceMode.value = false
  }
  updatePaymentMode()
}

const loadDefaultAddressForStudent = async () => {
  if (!props.selectedStudent?.id) return
  
  const defaultAddress = await companyBilling.loadDefaultBillingAddress(props.selectedStudent.id)
  
  if (defaultAddress) {
    companyBilling.loadFormFromAddress(defaultAddress)  // ← BESTEHENDE Funktion
    console.log('✅ Default billing address auto-loaded:', defaultAddress.company_name)
  }
}

// Debug-Code für PriceDisplay.vue - füge diese Logs hinzu:

// 1. Debug den Watch für selectedStudent:
watch(() => props.selectedStudent, async (newStudent, oldStudent) => {
  console.log('🔍 PriceDisplay: selectedStudent changed!')
  console.log('🔍 Old student:', oldStudent?.id)
  console.log('🔍 New student:', newStudent?.id)
  console.log('🔍 Has student ID:', !!newStudent?.id)
  
  if (newStudent?.id) {
    console.log('👤 Loading payment preference for student:', newStudent.id)
    
    try {
      const savedMethod = await loadStudentPaymentPreference(newStudent.id)
      console.log('💳 Loaded payment method:', savedMethod)
      
      // Debug: Aktuelle Werte BEVOR Änderung
      console.log('🔍 BEFORE - invoiceMode:', invoiceMode.value, 'cashMode:', cashMode.value)
      
      invoiceMode.value = (savedMethod === 'invoice')
      cashMode.value = (savedMethod === 'cash')
      
      // Debug: Aktuelle Werte NACH Änderung
      console.log('🔍 AFTER - invoiceMode:', invoiceMode.value, 'cashMode:', cashMode.value)
      
      if (savedMethod === 'invoice') {
        console.log('🔄 Invoice mode detected, loading billing address...')
        await autoLoadBillingAddress()
      } else {
        console.log('🧹 Not invoice mode, clearing billing data...')
        companyBilling.resetForm()
        companyBilling.currentAddress.value = null
        companyBilling.savedAddresses.value = []
      }
    } catch (error) {
      console.error('❌ Error in payment preference loading:', error)
    }
  } else {
    console.log('❌ No student ID, skipping payment preference loading')
  }
}, { immediate: true }) // ← WICHTIG: immediate: true damit es auch beim ersten Laden triggert

// 2. Debug die loadStudentPaymentPreference Funktion:
// Erweitere sie um mehr Logs:
const debugLoadStudentPaymentPreference = async (studentId: string): Promise<string> => {
  console.log('🔍 loadStudentPaymentPreference called with:', studentId)
  
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('preferred_payment_method, default_company_billing_address_id')
      .eq('id', studentId)
      .maybeSingle()

    console.log('🔍 Supabase query result:', { data, error })

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }
    
    const preference = data?.preferred_payment_method || 'cash'
    console.log('💳 Final payment preference:', preference)
    console.log('🏠 Has billing address ID:', !!data?.default_company_billing_address_id)
    
    return preference

  } catch (err) {
    console.error('❌ Error loading payment preference:', err)
    return 'cash'
  }
}


// ✅ WATCHERS - nur für Produktänderungen
watch(productSale.selectedProducts, (newProducts) => {
  emit('products-changed', newProducts)
}, { deep: true })

// ✅ LIFECYCLE
onMounted(() => {
  console.log('🔍 PriceDisplay mounted!')
  console.log('🔍 Initial selectedStudent:', props.selectedStudent?.id)
  console.log('🔍 Initial payment method:', props.initialPaymentMethod)
  
  // Load existing products in edit mode
  if (props.eventData?.id) {
    productSale.loadProducts(props.eventData.id)
    
    // ✅ RABATTE aus props laden (kommen von populateFormFromAppointment)
    console.log('💰 PriceDisplay mounted - checking for discount props:', {
      discount: props.discount,
      discountReason: props.discountReason
    })
  }
  
  // Initial payment method setup
  if (props.initialPaymentMethod === 'invoice') {
    invoiceMode.value = true
    autoLoadBillingAddress()
  } else if (props.initialPaymentMethod === 'cash') {
    cashMode.value = true
  }
  
  // ✅ NEU: Synchronisiere das formData mit dem UI-Zustand
  updatePaymentMode()
  console.log('✅ Payment mode synchronized on mount')
})

defineExpose({
  productSale
})
</script>