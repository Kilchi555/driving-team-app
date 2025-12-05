<!-- PriceDisplay.vue - Grundlegende Version -->
<template>
  <div class="space-y-4">
    <!-- Grundpreis -->
    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h3 class="text-lg font-semibold text-blue-800 mb-3">Preisübersicht</h3>
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-gray-700">{{ lessonType || 'Grundpreis' }} ({{ durationMinutes }} min)</span>
          <span class="font-semibold text-gray-700">CHF {{ getBasePrice().toFixed(2) }}</span>
        </div>
        
        <!-- Rabatt Anzeige - direkt im blauen Bereich -->
        <div v-if="getDiscountAmount() > 0" class="flex justify-between items-center py-2 border-t border-blue-200">
          <div class="flex items-center">
            <span class="text-sm font-medium text-green-700">Rabatt</span>
            <span v-if="getDiscountReason()" class="text-xs text-green-600 ml-2">({{ getDiscountReason() }})</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-bold text-green-700">- CHF {{ getDiscountAmount().toFixed(2) }}</span>
            <button 
              v-if="props.allowDiscountEdit"
              @click="removeDiscount"
              class="text-red-500 hover:text-red-700 text-xs ml-2"
            >
              ✕
            </button>
          </div>
        </div>
        
        <!-- Admin-Fee Anzeige -->
        <div v-if="getAdminFee() > 0" class="py-2 border-t border-blue-200">
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-orange-700">Administrationsgebühr</span>
            <span class="text-sm font-semibold text-orange-700">CHF {{ getAdminFee().toFixed(2) }}</span>
          </div>
        </div>

        <!-- Student Credit Anzeige -->
        <div v-if="getUsedCredit() > 0 || (props.studentCredit && props.studentCredit.balance_rappen > 0)" class="py-2 border-t border-blue-200">
          <div class="space-y-2">
            <!-- Im Edit-Modus: Zeige das damals verwendete Guthaben -->
            <div v-if="props.isEditMode && getUsedCredit() > 0" class="flex justify-between items-center">
              <span class="text-sm font-medium text-green-600">Guthaben verwendet (damals)</span>
              <span class="text-sm font-semibold text-green-600">- CHF {{ getUsedCredit().toFixed(2) }}</span>
            </div>
            
            <!-- Im Create-Modus: Zeige aktuelles Guthaben -->
            <div v-else-if="!props.isEditMode && props.studentCredit && props.studentCredit.balance_rappen > 0" class="flex justify-between items-center">
              <span class="text-sm font-medium text-green-700">Verfügbares Guthaben</span>
              <span class="text-sm font-semibold text-green-700">CHF {{ (props.studentCredit.balance_rappen / 100).toFixed(2) }}</span>
            </div>
            
            <!-- Im Create-Modus: Zeige verwendetes Guthaben -->
            <div v-if="!props.isEditMode && getUsedCredit() > 0" class="flex justify-between items-center">
              <span class="text-sm text-green-600">Guthaben wird verwendet</span>
              <span class="text-sm font-semibold text-green-600">- CHF {{ getUsedCredit().toFixed(2) }}</span>
            </div>
            
            <!-- Im Create-Modus: Zeige verbleibendes Guthaben -->
            <div v-if="!props.isEditMode && props.studentCredit && props.studentCredit.balance_rappen / 100 > getUsedCredit()" class="flex justify-between items-center">
              <span class="text-sm text-green-600">Restguthaben</span>
              <span class="text-sm font-semibold text-green-600">CHF {{ ((props.studentCredit.balance_rappen / 100) - getUsedCredit()).toFixed(2) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Loading State für Guthaben -->
        <div v-else-if="props.isLoadingCredit" class="py-2 border-t border-blue-200">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">Guthaben wird geladen...</span>
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        </div>
        
        <!-- Kein Guthaben verfügbar -->
        <div v-else-if="props.studentCredit && props.studentCredit.balance_rappen === 0" class="py-2 border-t border-blue-200">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">Verfügbares Guthaben</span>
            <span class="text-sm text-gray-500">CHF 0.00</span>
          </div>
          <div class="mt-1">
            <span class="text-xs text-gray-400">Kein Guthaben verfügbar</span>
          </div>
        </div>
        
        <!-- Kein Guthaben verfügbar (Student hat kein Guthaben) -->
        <div v-else-if="!props.studentCredit && !props.isLoadingCredit" class="py-2 border-t border-blue-200">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">Verfügbares Guthaben</span>
            <span class="text-sm text-gray-500">CHF 0.00</span>
          </div>
        </div>

        <!-- Produkte Anzeige - direkt im blauen Bereich -->
        <div v-if="getProducts().length > 0" class="py-2 border-t border-blue-200">
          <div class="space-y-2">
            <div class="text-sm font-medium text-blue-700">Produkte</div>
            <div v-for="product in getProducts()" :key="product.id" class="flex justify-between items-center">
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-700">{{ product.name }}</span>
                <span v-if="product.quantity > 1" class="text-xs text-gray-500">({{ product.quantity }}x)</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm font-semibold text-gray-700">CHF {{ getProductPrice(product).toFixed(2) }}</span>
                <button 
                  v-if="props.allowProductEdit"
                  @click="removeProduct(product.id)"
                  class="text-red-500 hover:text-red-700 text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="border-t pt-2">
          <!-- Preis vor Guthaben (nur anzeigen wenn Guthaben vorhanden) -->
          <div v-if="props.studentCredit && props.studentCredit.balance_rappen > 0" class="flex justify-between text-sm text-gray-500 mb-1">
            <span>Preis vor Guthaben</span>
            <span>CHF {{ calculatePriceBeforeCredit().toFixed(2) }}</span>
          </div>
          
          <!-- Gesamtpreis (nach Guthaben) -->
          <div class="flex justify-between text-lg font-bold">
            <span class="text-gray-700">Zu bezahlen</span>
            <span class="text-blue-600">CHF {{ calculateTotalPrice().toFixed(2) }}</span>
          </div>
          
          <!-- Gratis Info wenn vollständig durch Guthaben gedeckt -->
          <div v-if="props.studentCredit && props.studentCredit.balance_rappen / 100 >= calculatePriceBeforeCredit()" class="text-center mt-2">
            <span class="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              ✅ Vollständig durch Guthaben gedeckt
            </span>
          </div>
        </div>
        
        <!-- Rabatt und Produkte Buttons - zwischen Gesamtpreis und Zahlungsarten -->

        <div v-if="props.allowDiscountEdit || props.allowProductEdit" class="border-t pt-3">
          <div class="flex justify-center space-x-3">
            <!-- ✅ RABATT BUTTON: Immer anzeigen wenn erlaubt -->
            <button
              v-if="props.allowDiscountEdit"
              @click="showDiscountSelector = true"
              class="flex items-center px-4 py-2 text-sm text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50"
            >
              🎫 Rabatt
            </button>
            
            <!-- ✅ PRODUKTE BUTTON: Immer anzeigen wenn erlaubt -->
            <button
              v-if="props.allowProductEdit"
              @click="showProductSelector = true"
              class="flex items-center px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              📦 Produkte
            </button>
          </div>
        </div>
        
        <!-- Produktauswahl Modal - direkt im PriceDisplay -->
        <div v-if="showProductSelector" class="border-t pt-3">
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
            
            <div class="space-y-3">
              <!-- Verfügbare Produkte als Kacheln -->
              <div v-if="props.availableProducts && props.availableProducts.length > 0" class="grid grid-cols-2 gap-3">
                <div 
                  v-for="product in props.availableProducts" 
                  :key="product.id" 
                  @click="addProduct(product)"
                  class="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div class="text-center space-y-1">
                    <!-- Produkt-Name -->
                    <div class="text-sm font-medium text-gray-700">{{ product.name }}</div>
                    
                    <!-- Produkt-Preis -->
                    <div class="text-sm font-bold text-blue-600">
                      CHF {{ (product.price_rappen / 100).toFixed(2) }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Keine Produkte verfügbar -->
              <div v-else class="text-sm text-gray-500 text-center py-4">
                Keine Produkte verfügbar
              </div>
              
              <div class="flex justify-end space-x-3">
                <button
                  @click="showProductSelector = false"
                  class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- ✅ RABATT-SELECTOR -->
        <div v-if="showDiscountSelector" class="border-t pt-3">
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
            
            <div class="space-y-4">
              
              <!-- Verfügbare Gutscheine -->
              <div v-if="availableDiscounts.length > 0" class="space-y-3">
                <div class="grid grid-cols-2 gap-2">
                  <div 
                    v-for="discount in availableDiscounts" 
                    :key="discount.id" 
                    @click="applyVoucher(discount)"
                    class="bg-white border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all duration-200"
                  >
                    <div class="text-center">
                      <div class="text-sm font-bold text-purple-600">
                        - CHF {{ parseFloat(discount.discount_value).toFixed(2) }}
                      </div>
                      <div class="text-xs text-gray-500">{{ discount.name || 'Gutschein' }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="flex justify-end space-x-3 pt-2 border-t border-gray-300">
                <button
                  @click="closeDiscountSelector"
                  class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- ✅ NEU: Bestehende Payment-Info anzeigen -->
        <div v-if="showExistingPaymentInfo" class="border-t pt-3">
          <div class="text-sm font-medium text-gray-700 mb-3">Zahlungsinformationen</div>
          <div class="space-y-3">
            <!-- Zahlungsart und Status Badges -->
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Zahlungsart Badge -->
              <span :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                existingPayment?.payment_method === 'wallee' ? 'bg-blue-100 text-blue-800' :
                existingPayment?.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                existingPayment?.payment_method === 'invoice' ? 'bg-purple-100 text-purple-800' :
                existingPayment?.payment_method === 'credit' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              ]">
                {{ existingPayment?.payment_method === 'wallee' ? 'Online-Zahlung' :
                   existingPayment?.payment_method === 'cash' ? 'Bar' :
                   existingPayment?.payment_method === 'invoice' ? 'Rechnung' :
                   existingPayment?.payment_method === 'credit' ? 'Guthaben' : 
                   'Unbekannt' }}
              </span>
              
              <!-- Status Badge -->
              <span :class="[
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                paymentStatusBadge.class
              ]">
                {{ paymentStatusBadge.label }}
              </span>
              
              <!-- Bezahldatum falls vorhanden -->
              <span v-if="existingPayment?.paid_at" class="text-sm text-gray-600">
                bezahlt am {{ new Date(existingPayment.paid_at).toLocaleDateString('de-CH') }}
              </span>
            </div>
            
            <!-- Rechnungsadresse für Invoice -->
            <div v-if="existingPayment?.payment_method === 'invoice' && hasInvoiceAddress" 
                 class="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div class="text-sm font-medium text-gray-700 mb-2">Rechnungsadresse</div>
              <div class="text-sm text-gray-600 whitespace-pre-line">{{ formatInvoiceAddress() }}</div>
            </div>
          </div>
        </div>

        <!-- Zahlungsarten - nur für neue Termine oder wenn kein Payment existiert -->
        <div v-if="showPaymentSelection && !props.isPastAppointment" class="border-t pt-3">
          <div class="text-sm font-medium text-gray-700 mb-3">Zahlungsart</div>
          
          <!-- ✅ IMMER die schönen Buttons anzeigen -->
          <div class="space-y-3">
            <!-- Online Payment Button -->
            <button
              @click="selectPaymentMethod('wallee')"
              :class="[
                'w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-3',
                selectedPaymentMethod === 'wallee'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
              ]"
            >
              <span class="font-medium">Online-Zahlung</span>
            </button>
            
            <!-- Cash Payment Button -->
            <button
              @click="selectPaymentMethod('cash')"
              :class="[
                'w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-3',
                selectedPaymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
              ]"
            >
              <span class="font-medium">Bar</span>
            </button>
            
            <!-- Invoice Button -->
            <button
              @click="selectPaymentMethod('invoice')"
              :class="[
                'w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-3',
                selectedPaymentMethod === 'invoice'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
              ]"
            >
              <span class="font-medium">Rechnung</span>
            </button>
          </div>
        </div>
        

        <!-- Rechnungsadresse Form - nur wenn Formular angezeigt werden soll -->
        <div v-if="shouldShowBillingAddressForm" class="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-3 gap-2">
              <h5 class="text-sm font-medium text-gray-700">Rechnungsadresse</h5>
              
              <!-- Toggle: Gleich wie Kundenadresse (mobil unterhalb, desktop rechts) -->
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  @click="useCustomBillingAddressInModal = !useCustomBillingAddressInModal"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    useCustomBillingAddressInModal ? 'bg-blue-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      useCustomBillingAddressInModal ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
                <span class="text-xs sm:text-sm font-medium text-gray-700">Gleich wie Kundenadresse</span>
              </div>
            </div>
            
            <!-- Formular - immer sichtbar -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Firmenname</label>
                <input
                  v-model="invoiceData.company_name"
                  type="text"
                  placeholder="Firmenname (optional)"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Kontaktperson *</label>
                <input
                  v-model="invoiceData.contact_person"
                  type="text"
                  required
                  placeholder="Vorname Nachname"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">E-Mail *</label>
                <input
                  v-model="invoiceData.email"
                  type="email"
                  required
                  placeholder="email@beispiel.ch"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input
                  v-model="invoiceData.phone"
                  type="tel"
                  placeholder="+41 44 123 45 67"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Straße & Hausnummer *</label>
                <div class="grid grid-cols-3 gap-2">
                  <input
                    v-model="invoiceData.street"
                    type="text"
                    required
                    placeholder="Musterstraße"
                    class="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  >
                  <input
                    v-model="invoiceData.street_number"
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
                    v-model="invoiceData.zip"
                    type="text"
                    required
                    placeholder="8000"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  >
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Ort *</label>
                  <input
                    v-model="invoiceData.city"
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
                  v-model="invoiceData.country"
                  type="text"
                  placeholder="Schweiz"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
              </div>
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">MWST-Nummer</label>
                  <input
                    v-model="invoiceData.vat_number"
                    type="text"
                    placeholder="CHE-123.456.789"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  >
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Handelsregisternummer</label>
                  <input
                    v-model="invoiceData.company_register_number"
                    type="text"
                    placeholder="CH-123.456.789"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  >
                </div>
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Notizen</label>
                <textarea
                  v-model="invoiceData.notes"
                  placeholder="Zusätzliche Informationen..."
                  rows="2"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                ></textarea>
              </div>
              
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="saveInvoiceAddress"
                  :disabled="!isInvoiceFormValid || isSavingInvoice"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isSavingInvoice">💾 Speichere...</span>
                  <span v-else>💾 {{ isEditingBillingAddress ? 'Änderungen speichern' : 'Rechnungsadresse speichern' }}</span>
                </button>
                
                <!-- Abbrechen-Button nur im Bearbeitungsmodus -->
                <button
                  v-if="isEditingBillingAddress"
                  type="button"
                  @click="cancelEditingBillingAddress"
                  class="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600"
                >
                  ❌ Abbrechen
                </button>
              </div>
              
              <div v-if="invoiceSaveMessage" class="text-sm text-center p-2 rounded-md" :class="invoiceSaveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ invoiceSaveMessage.text }}
              </div>
            </div>
            </div>
          </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePaymentMethods, useCompanyBilling } from '~/composables/usePaymentMethods'
import { useEventModalForm } from '~/composables/useEventModalForm'
import { getSupabase } from '~/utils/supabase'
import { watch } from 'vue'

// Erweiterte Props
interface Props {
  durationMinutes: number
  pricePerMinute: number
  selectedStudent?: any
  discount?: number
  discountReason?: string
  allowDiscountEdit?: boolean
  allowProductEdit?: boolean
  lessonType?: string
  debugInfo?: string
  products?: any[]
  availableProducts?: any[]
  isPastAppointment?: boolean
  currentUser?: any
  adminFee?: number // ✅ NEU: Admin-Fee in CHF
  showAdminFee?: boolean // ✅ NEU: Ob Admin-Fee angezeigt werden soll
  selectedPaymentMethod?: string // ✅ NEU: Selected payment method von EventModal
  isEditMode?: boolean // ✅ NEU: Ob im Edit-Modus (bestehender Termin)
  appointmentId?: string // ✅ NEU: Appointment ID für Payment-Daten laden
  studentCredit?: any // ✅ NEU: Student credit information
  isLoadingCredit?: boolean // ✅ NEU: Loading state for credit
}

const props = withDefaults(defineProps<Props>(), {
  discount: 0,
  discountReason: '',
  allowDiscountEdit: true,
  allowProductEdit: true,
  products: () => [],
  availableProducts: () => [],
  isPastAppointment: false,
  adminFee: 0,
  showAdminFee: false,
  selectedPaymentMethod: 'wallee',
  isEditMode: false,
  appointmentId: undefined,
  studentCredit: undefined,
  isLoadingCredit: false
})

// Emits
const emit = defineEmits<{
  'discount-changed': [discount: number, discountType: "fixed", reason: string]
  'product-removed': [productId: string]
  'product-added': [product: any]
  'payment-method-changed': [method: string]
  'invoice-address-saved': [address: any]
  'billing-address-id-saved': [addressId: string] // ✅ NEU: Emit der gespeicherten Adress-ID

  'update:selectedPaymentMethod': [value: string] // ✅ NEU: v-model emit für payment method
}>()

// Composables
const { loadPaymentMethods, activePaymentMethods, isLoading: isLoadingPaymentMethods } = usePaymentMethods()
const { createBillingAddress } = useCompanyBilling()

// Computed Properties
const isStaffUser = computed(() => {
  // Prüfe ob der aktuelle Benutzer Staff oder Admin ist
  return props.currentUser?.role === 'staff' || props.currentUser?.role === 'admin'
})

// State
const showProductSelector = ref(false)
const showDiscountSelector = ref(false) // ✅ NEU: Für Gutschein-Auswahl
const availableDiscounts = ref<any[]>([]) // ✅ NEU: Verfügbare Gutscheine
const isLoadingDiscounts = ref(false) // ✅ NEU: Loading state für Gutscheine

// ✅ NEU: Payment State für Edit-Modus
const existingPayment = ref<any>(null)
const isLoadingPayment = ref(false)
// ✅ NEU: State für Student Billing Address Management
const studentBillingAddress = ref<any>(null)
const isLoadingStudentBilling = ref(false)
const isEditingBillingAddress = ref(false)
const useCustomBillingAddressInModal = ref(false)
const customBillingDataModal = ref({
  company_name: '',
  contact_person: '',
  email: ''
})

// ✅ NEU: Company Billing Address ID (wird gesetzt, wenn Rechnungsadresse gespeichert wird)
const savedCompanyBillingAddressId = ref<string | null>(null)

// ✅ Computed: Use prop for selectedPaymentMethod
const selectedPaymentMethod = computed({
  get: () => props.selectedPaymentMethod || 'wallee',
  set: (value: string) => emit('update:selectedPaymentMethod', value)
})

// ✅ Computed: Check if invoice address exists
const hasInvoiceAddress = computed(() => {
  const payment = existingPayment.value
  if (!payment) return false
  
  // Check if there's a company billing address (preferred)
  if (payment.company_billing_address && typeof payment.company_billing_address === 'object') {
    return true
  }
  
  // Fallback: Check JSONB invoice_address field
  return payment.invoice_address && 
         typeof payment.invoice_address === 'object' &&
         Object.keys(payment.invoice_address).length > 0
})

// ✅ Function: Format invoice address for display
const formatInvoiceAddress = (): string => {
  const payment = existingPayment.value
  if (!payment) return 'Keine Rechnungsadresse gespeichert'
  
  let invoiceAddr = null
  
  // Prefer company billing address (new structure with single object)
  if (payment.company_billing_address && typeof payment.company_billing_address === 'object') {
    invoiceAddr = payment.company_billing_address
  }
  // Fallback to JSONB invoice_address
  else if (payment.invoice_address && typeof payment.invoice_address === 'object') {
    invoiceAddr = payment.invoice_address
  }
  
  if (!invoiceAddr) {
    return 'Keine Rechnungsadresse gespeichert'
  }
  
  const lines = []
  
  if (invoiceAddr.company_name) {
    lines.push(invoiceAddr.company_name)
  }
  
  if (invoiceAddr.contact_person) {
    lines.push(invoiceAddr.contact_person)
  }
  
  if (invoiceAddr.street && invoiceAddr.street_number) {
    lines.push(`${invoiceAddr.street} ${invoiceAddr.street_number}`)
  } else if (invoiceAddr.street) {
    lines.push(invoiceAddr.street)
  }
  
  if (invoiceAddr.zip && invoiceAddr.city) {
    lines.push(`${invoiceAddr.zip} ${invoiceAddr.city}`)
  }
  
  if (invoiceAddr.country && invoiceAddr.country !== 'Schweiz') {
    lines.push(invoiceAddr.country)
  }
  
  if (invoiceAddr.email) {
    lines.push(`E-Mail: ${invoiceAddr.email}`)
  }
  
  if (invoiceAddr.phone) {
    lines.push(`Tel: ${invoiceAddr.phone}`)
  }
  
  if (invoiceAddr.vat_number) {
    lines.push(`UID: ${invoiceAddr.vat_number}`)
  }
  
  return lines.join('\n') || 'Keine Adressdaten verfügbar'
}

// ✅ NEU: Manueller Rabatt State
const manualDiscountAmount = ref<number>(0)
const manualDiscountReason = ref<string>('')

// Rechnungsadresse State
const invoiceData = ref({
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

const isSavingInvoice = ref(false)
const invoiceSaveMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)

// Lifecycle
onMounted(async () => {
  console.log('🚀 PriceDisplay mounted, starting to load data...')
  
  await Promise.all([
    loadPaymentMethods(),
    loadAvailableDiscounts(), // ✅ Lade verfügbare Gutscheine
    loadExistingPayment() // ✅ NEU: Payment-Daten laden
  ])
  
  // ✅ NEU: Student Billing Address laden (falls Student bereits ausgewählt)
  if (props.selectedStudent?.id) {
    console.log('🏢 PriceDisplay onMounted: Loading billing address for student:', props.selectedStudent.id)
    await loadStudentBillingAddressData(props.selectedStudent.id)
    
    // ✅ ZUSÄTZLICH: Falls kein Student Billing gefunden, versuche über bestehende Payments zu laden
    if (!studentBillingAddress.value) {
      await loadBillingAddressFromExistingPayments(props.selectedStudent.id)
    }
  } else {
    console.log('💡 PriceDisplay onMounted: No student selected yet')
  }
  
  console.log('✅ PriceDisplay initialization complete')
})

// ✅ NEU: Watcher für Student-Änderung - lädt automatisch Billing Address
watch(() => props.selectedStudent?.id, async (newStudentId: string, oldStudentId: string) => {
  if (newStudentId && newStudentId !== oldStudentId) {
    console.log('👤 Student changed, loading billing address for:', newStudentId)
    
    // Reset Toggle und Custom Data
    useCustomBillingAddressInModal.value = false
    customBillingDataModal.value = {
      company_name: '',
      contact_person: '',
      email: ''
    }
    
    await loadStudentBillingAddressData(newStudentId)
    
    // ✅ Fallback: Falls keine direkte Student Billing Address gefunden
    if (!studentBillingAddress.value) {
      await loadBillingAddressFromExistingPayments(newStudentId)
    }
  }
}, { immediate: false })

// ✅ NEU: Watcher für studentBillingAddress - automatisch Form füllen wenn Invoice ausgewählt
watch(() => studentBillingAddress.value, (newAddress: any) => {
  if (newAddress && selectedPaymentMethod.value === 'invoice' && !isEditingBillingAddress.value) {
    console.log('✅ Watcher: Auto-filling invoice form with loaded billing address')
    invoiceData.value = {
      company_name: newAddress.company_name || '',
      contact_person: newAddress.contact_person || '',
      email: newAddress.email || '',
      phone: newAddress.phone || '',
      street: newAddress.street || '',
      street_number: newAddress.street_number || '',
      zip: newAddress.zip || '',
      city: newAddress.city || '',
      country: newAddress.country || 'Schweiz',
      vat_number: newAddress.vat_number || '',
      company_register_number: newAddress.company_register_number || '',
      notes: newAddress.notes || ''
    }
  }
}, { immediate: false })

// ✅ NEU: Watcher für Toggle - füllt Formular mit Kundendaten wenn ON
watch(() => useCustomBillingAddressInModal.value, (isOn: boolean) => {
  console.log('🔄 Toggle watcher triggered, isOn:', isOn)
  
  if (isOn && studentBillingAddress.value) {
    console.log('✅ Toggle ON - filling form with customer billing address')
    invoiceData.value = {
      company_name: studentBillingAddress.value.company_name || '',
      contact_person: studentBillingAddress.value.contact_person || '',
      email: studentBillingAddress.value.email || '',
      phone: studentBillingAddress.value.phone || '',
      street: studentBillingAddress.value.street || '',
      street_number: studentBillingAddress.value.street_number || '',
      zip: studentBillingAddress.value.zip || '',
      city: studentBillingAddress.value.city || '',
      country: studentBillingAddress.value.country || 'Schweiz',
      vat_number: studentBillingAddress.value.vat_number || '',
      company_register_number: studentBillingAddress.value.company_register_number || '',
      notes: studentBillingAddress.value.notes || ''
    }
  } else if (!isOn) {
    console.log('✅ Toggle OFF - clearing form')
    invoiceData.value = {
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
    }
  }
})

// ✅ NEU: Watcher für Duration-Änderung im Edit-Modus - recalculate price
watch(() => props.durationMinutes, async (newDuration: number, oldDuration: number) => {
  if (newDuration !== oldDuration && props.isEditMode && props.appointmentId) {
    console.log('⏱️ Duration changed in edit mode:', `${oldDuration}min -> ${newDuration}min`)
    console.log('💰 Old stored price:', (existingPayment.value?.lesson_price_rappen || 0) / 100)
    
    // Calculate new price based on new duration
    const newPrice = newDuration * props.pricePerMinute
    console.log('💰 New calculated price:', newPrice)
    
    // Update the stored payment with new lesson price locally first
    if (existingPayment.value) {
      const oldTotalRappen = existingPayment.value.total_amount_rappen || 0
      const oldLessonPrice = existingPayment.value.lesson_price_rappen || 0
      const productsPrice = (existingPayment.value as any).products_price_rappen || 0
      const adminFee = existingPayment.value.admin_fee_rappen || 0
      const discount = existingPayment.value.discount_amount_rappen || 0
      
      // Neuer Gesamtbetrag: neue Lektionspreis + Produkte + Admin-Fee - Rabatt
      const newLessonPriceRappen = Math.round(newPrice * 100)
      const newTotalRappen = newLessonPriceRappen + productsPrice + adminFee - discount
      
      existingPayment.value.lesson_price_rappen = newLessonPriceRappen
      existingPayment.value.total_amount_rappen = Math.max(0, newTotalRappen)
      
      console.log('✅ PriceDisplay: Updated payment price for duration change:', {
        oldLessonPrice: (oldLessonPrice / 100).toFixed(2),
        newLessonPrice: (newLessonPriceRappen / 100).toFixed(2),
        oldTotal: (oldTotalRappen / 100).toFixed(2),
        newTotal: (newTotalRappen / 100).toFixed(2),
        productsPrice: (productsPrice / 100).toFixed(2),
        adminFee: (adminFee / 100).toFixed(2),
        discount: (discount / 100).toFixed(2)
      })
      
      // ✅ NEU: Update payment in database directly
      try {
        console.log('💾 Saving updated payment to database...')
        const supabase = getSupabase()
        
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            lesson_price_rappen: newLessonPriceRappen,
            total_amount_rappen: Math.max(0, newTotalRappen),
            updated_at: new Date().toISOString(),
            notes: `Dauer angepasst: ${oldDuration}min → ${newDuration}min (Preis: CHF ${(oldLessonPrice / 100).toFixed(2)} → CHF ${(newLessonPriceRappen / 100).toFixed(2)})`
          })
          .eq('id', existingPayment.value.id)
        
        if (updateError) {
          console.error('❌ Failed to save payment to database:', updateError)
        } else {
          console.log('✅ Payment saved to database')
        }
      } catch (error: any) {
        console.error('❌ Error saving payment:', error)
      }
      
      // ✅ Call API endpoint to handle payment reconciliation (for completed/authorized payments)
      try {
        console.log('📡 Calling adjust-duration endpoint...')
        const result = await $fetch('/api/appointments/adjust-duration', {
          method: 'POST',
          body: {
            appointmentId: props.appointmentId,
            oldDurationMinutes: oldDuration,
            newDurationMinutes: newDuration,
            pricePerMinute: props.pricePerMinute
          }
        })
        
        console.log('✅ Duration adjustment processed:', result)
        
        // Show notification based on result
        if ((result as any).action === 'additional_payment') {
          console.log(`💳 Additional payment created: CHF ${(result as any).details.amount}`)
          // Could show toast here if needed
        } else if ((result as any).action === 'credit_applied') {
          console.log(`💰 Credit applied to student: CHF ${(result as any).details.refundAmount}`)
          // Could show toast here if needed
        }
      } catch (error: any) {
        console.error('❌ Error calling adjust-duration endpoint:', error)
        // Show error notification
      }
    }
  }
}, { immediate: false })

// ✅ NEUE METHODE: Lade verfügbare Gutscheine
const loadAvailableDiscounts = async () => {
  try {
    console.log('🔄 Starting to load available discounts...')
    isLoadingDiscounts.value = true
    const supabase = getSupabase()
    
    console.log('🔍 Querying discounts table for fixed discounts...')
    
    // ✅ Lade nur Gutscheine mit discount_type = 'fixed'
    let query = supabase
      .from('discounts')
      .select('*')
      .eq('is_active', true)
      .eq('discount_type', 'fixed')
    
    // ✅ WICHTIG: Nach tenant_id filtern, falls verfügbar
    if (props.currentUser?.tenant_id) {
      query = query.eq('tenant_id', props.currentUser.tenant_id)
      console.log('🏢 Filtering discounts by tenant_id:', props.currentUser.tenant_id)
    }
    
    const { data, error } = await query.order('discount_value', { ascending: true })
    
    if (error) {
      console.error('❌ Error loading discounts:', error)
      return
    }
    
    console.log('📊 Raw discounts data:', data)
    console.log('📊 Fixed discounts found:', data)
    
    availableDiscounts.value = data || []
    console.log('✅ Loaded available fixed discounts:', availableDiscounts.value.length)
    console.log('🎫 Available discounts:', availableDiscounts.value)
    
  } catch (err: any) {
    console.error('❌ Error loading discounts:', err)
  } finally {
    isLoadingDiscounts.value = false
  }
}

// Methods
const applyVoucher = (discount: any) => {
  const discountValue = parseFloat(discount.discount_value) || 0
  if (discountValue > 0) {
    emit('discount-changed', discountValue, discount.discount_type || 'fixed', discount.name)
    showDiscountSelector.value = false
    console.log('✅ Applied voucher:', discount.name, 'Value:', discountValue)
  }
}

// ✅ NEUE METHODE: Manuellen Rabatt anwenden
const applyManualDiscount = () => {
  if (!manualDiscountAmount.value || manualDiscountAmount.value <= 0) return
  
  const reason = manualDiscountReason.value || 'Manueller Rabatt'
  emit('discount-changed', manualDiscountAmount.value, 'fixed', reason)
  
  // Reset form
  manualDiscountAmount.value = 0
  manualDiscountReason.value = ''
  showDiscountSelector.value = false
  
  console.log('✅ Applied manual discount:', manualDiscountAmount.value, 'Reason:', reason)
}

// ✅ NEUE METHODE: Gutschein-Selector schließen
const closeDiscountSelector = () => {
  showDiscountSelector.value = false
  // Reset manual discount form
  manualDiscountAmount.value = 0
  manualDiscountReason.value = ''
}

const removeDiscount = () => {
  emit('discount-changed', 0, 'fixed', '')
}

const removeProduct = (productId: string) => {
  emit('product-removed', productId)
}

// ✅ NEU: Base Price aus bestehender Payment oder berechnet
const getBasePrice = () => {
  // Im Edit-Modus: Verwende den Wert aus existingPayment (wird durch den Watch aktualisiert)
  if (props.isEditMode && existingPayment.value) {
    const storedPrice = (existingPayment.value.lesson_price_rappen || 0) / 100
    console.log('📊 getBasePrice (edit mode):', {
      storedPrice,
      durationMinutes: props.durationMinutes,
      pricePerMinute: props.pricePerMinute
    })
    return storedPrice
  }
  
  // Im Create-Modus: Berechne den Preis neu
  return props.durationMinutes * props.pricePerMinute
}

// ✅ NEU: Discount Amount aus bestehender Payment oder Props
const getDiscountAmount = () => {
  // Im Edit-Modus: Verwende den gespeicherten Rabatt aus der Payment-Tabelle
  if (props.isEditMode && existingPayment.value) {
    return (existingPayment.value.discount_amount_rappen || 0) / 100
  }
  
  // Im Create-Modus: Verwende Props
  return props.discount || 0
}

// ✅ NEU: Discount Reason aus bestehender Payment oder Props
const getDiscountReason = () => {
  // Im Edit-Modus: Verwende den gespeicherten Rabatt-Grund aus der Payment-Tabelle
  if (props.isEditMode && existingPayment.value) {
    return existingPayment.value.discount_reason || ''
  }
  
  // Im Create-Modus: Verwende Props
  return props.discountReason || ''
}

// ✅ NEU: Products aus bestehender Payment oder Props
const getProducts = () => {
  // Im Edit-Modus: verwende ausschließlich die geladenen Produkte der Payment
  if (props.isEditMode) {
    return (existingPayment.value && (existingPayment.value as any).products) ? (existingPayment.value as any).products : []
  }
  
  // Im Create-Modus: Verwende Props
  return props.products || []
}

// ✅ NEU: Admin Fee aus bestehender Payment oder Props
const getAdminFee = () => {
  // Im Edit-Modus: Verwende den gespeicherten Admin-Fee aus der Payment-Tabelle
  if (props.isEditMode && existingPayment.value) {
    return (existingPayment.value.admin_fee_rappen || 0) / 100
  }
  
  // Im Create-Modus: Verwende Props
  return (props.showAdminFee && props.adminFee) ? props.adminFee : 0
}

// ✅ NEU: Used Credit aus bestehender Payment oder Props
const getUsedCredit = () => {
  // Im Edit-Modus: Verwende das gespeicherte verwendete Guthaben aus der Payment-Tabelle
  if (props.isEditMode && existingPayment.value) {
    // Primär: explizit gespeicherter Wert
    const fromPayment = existingPayment.value.credit_used_rappen
    if (typeof fromPayment === 'number' && fromPayment > 0) {
      return fromPayment / 100
    }

    // Fallback: aus verknüpfter Kredit-Transaktion ableiten
    const tx = (existingPayment.value as any).credit_transaction
    if (tx && typeof tx.amount_rappen === 'number') {
      // Verwende den absoluten Betrag (Transaktionsrichtung kann variieren)
      return Math.abs(tx.amount_rappen) / 100
    }

    return 0
  }
  
  // Im Create-Modus: Berechne das verwendete Guthaben basierend auf dem aktuellen Guthaben
  if (props.studentCredit && props.studentCredit.balance_rappen > 0) {
    const creditAmount = props.studentCredit.balance_rappen / 100
    const totalBeforeCredit = calculatePriceBeforeCredit()
    return Math.min(creditAmount, totalBeforeCredit)
  }
  
  return 0
}

// ✅ NEW: Expose usedCredit as computed for external access
const usedCredit = computed(() => getUsedCredit())

const calculateTotalPrice = () => {
  const basePrice = getBasePrice()
  const discountAmount = getDiscountAmount()
  const productsTotal = getProducts().reduce((total: any, product: any) => {
    return total + getProductPrice(product)
  }, 0)
  const adminFeeAmount = getAdminFee()
  const creditUsed = usedCredit.value // Use computed value
  
  const totalBeforeCredit = basePrice - discountAmount + productsTotal + adminFeeAmount
  
  // Guthaben abziehen (entweder aus Payment-Tabelle oder aktuelles Guthaben)
  return Math.max(0, totalBeforeCredit - creditUsed)
}

const calculatePriceBeforeCredit = () => {
  const basePrice = getBasePrice()
  const discountAmount = getDiscountAmount()
  const productsTotal = getProducts().reduce((total: any, product: any) => {
    return total + getProductPrice(product)
  }, 0)
  const adminFeeAmount = getAdminFee()
  
  return basePrice - discountAmount + productsTotal + adminFeeAmount
}

const addProduct = (product: any) => {
  // Füge das Produkt zu den ausgewählten Produkten hinzu
  const existingProduct = props.products?.find(p => p.id === product.id)
  
  if (existingProduct) {
    // Produkt bereits vorhanden - Menge erhöhen
    existingProduct.quantity = (existingProduct.quantity || 1) + 1
  } else {
    // Neues Produkt hinzufügen
    emit('product-added', { 
      ...product, 
      quantity: 1,
      price: product.price_rappen / 100 // Konvertiere zu CHF
    })
  }
  
  // Modal nach dem Hinzufügen schließen
  showProductSelector.value = false
}

const getProductPrice = (product: any): number => {
  // Sichere Preisberechnung - unterstützt sowohl price als auch price_rappen
  if (product.price !== undefined) {
    return product.price * (product.quantity || 1)
  } else if (product.price_rappen !== undefined) {
    return (product.price_rappen / 100) * (product.quantity || 1)
  }
  return 0
}

const selectPaymentMethod = (method: string) => {
  selectedPaymentMethod.value = method
  emit('payment-method-changed', method)
  console.log('💳 PriceDisplay - Payment method selected:', method)
  
  // ✅ Debug: Zeige den aktuellen Zustand wenn 'invoice' gewählt wird
  if (method === 'invoice') {
    console.log('📋 Invoice selected - current state:', {
      selectedStudent: props.selectedStudent?.id,
      studentBillingAddress: !!studentBillingAddress.value,
      existingPayment: !!existingPayment.value,
      isEditMode: props.isEditMode
    })
    
    // ✅ NEU: Automatisch die gespeicherte Rechnungsadresse ins Formular laden
    if (studentBillingAddress.value && !isEditingBillingAddress.value) {
      console.log('✅ Auto-filling invoice form with studentBillingAddress')
      invoiceData.value = {
        company_name: studentBillingAddress.value.company_name || '',
        contact_person: studentBillingAddress.value.contact_person || '',
        email: studentBillingAddress.value.email || '',
        phone: studentBillingAddress.value.phone || '',
        street: studentBillingAddress.value.street || '',
        street_number: studentBillingAddress.value.street_number || '',
        zip: studentBillingAddress.value.zip || '',
        city: studentBillingAddress.value.city || '',
        country: studentBillingAddress.value.country || 'Schweiz',
        vat_number: studentBillingAddress.value.vat_number || '',
        company_register_number: studentBillingAddress.value.company_register_number || '',
        notes: studentBillingAddress.value.notes || ''
      }
    }
  }
}

// ✅ NEU: Load customer data from users table (fallback method)
const loadBillingAddressFromExistingPayments = async (studentId: string) => {
  if (!studentId) return null
  
  try {
    console.log('🔍 Loading customer data from users table for student:', studentId)
    
    const supabase = getSupabase()
    
    // Load user data to use as billing address
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', studentId)
      .single()

    if (userError) {
      console.warn('⚠️ Error loading user data:', userError)
      return null
    }

    if (userData) {
      // Map user data to billing address format
      const billingAddress = {
        company_name: userData.company_name || '',
        contact_person: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        email: userData.email || '',
        phone: userData.phone || '',
        street: userData.street || '',
        street_number: userData.street_nr || '',
        zip: userData.zip || '',
        city: userData.city || '',
        country: userData.country || 'Schweiz',
        vat_number: userData.vat_number || '',
        notes: ''
      }
      
      studentBillingAddress.value = billingAddress
      console.log('✅ Billing address loaded from user data:', billingAddress)
      return billingAddress
    }
    
    return null
  } catch (error) {
    console.error('❌ Error loading customer data:', error)
    return null
  }
}

// ✅ NEU: Load student billing address for new appointments or editing
const loadStudentBillingAddressData = async (studentId: string) => {
  if (!studentId) return null
  
  try {
    isLoadingStudentBilling.value = true
    console.log('🏢 Loading student billing address for PriceDisplay:', studentId)
    
    const modalForm = useEventModalForm()
    const billingData = await modalForm.loadStudentBillingAddress(studentId)
    
    if (billingData) {
      studentBillingAddress.value = billingData
      console.log('✅ Student billing address loaded in PriceDisplay:', billingData)
    }
    
    return billingData
  } catch (error) {
    console.error('❌ Error loading student billing address:', error)
    return null
  } finally {
    isLoadingStudentBilling.value = false
  }
}

// ✅ NEU: Funktionen für Rechnungsadresse-Bearbeitung
const startEditingBillingAddress = () => {
  isEditingBillingAddress.value = true
  
  // ✅ NEU: Stelle sicher, dass wir die bestehende Adresse haben
  const existingAddress = studentBillingAddress.value || existingPayment.value?.company_billing_address
  
  if (existingAddress) {
    console.log('✏️ Loading existing address data for editing:', existingAddress.id || 'no-id')
    
    invoiceData.value = {
      company_name: existingAddress.company_name || '',
      contact_person: existingAddress.contact_person || '',
      email: existingAddress.email || '',
      phone: existingAddress.phone || '',
      street: existingAddress.street || '',
      street_number: existingAddress.street_number || '',
      zip: existingAddress.zip || '',
      city: existingAddress.city || '',
      country: existingAddress.country || 'Schweiz',
      vat_number: existingAddress.vat_number || '',
      company_register_number: existingAddress.company_register_number || '',
      notes: existingAddress.notes || ''
    }
  } else {
    console.log('⚠️ No existing address found for editing')
  }
  
  console.log('✏️ Started editing billing address')
}

const cancelEditingBillingAddress = () => {
  isEditingBillingAddress.value = false
  // Formular zurücksetzen
  invoiceData.value = {
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
  }
  console.log('❌ Cancelled editing billing address')
}

// ✅ NEU: Load existing payment data
const loadExistingPayment = async () => {
  console.log('🔍 loadExistingPayment check:', {
    appointmentId: props.appointmentId,
    isEditMode: props.isEditMode,
    shouldLoad: !!(props.appointmentId && props.isEditMode)
  })
  
  if (!props.appointmentId || !props.isEditMode) {
    console.log('⏭️ Skipping payment loading - no appointmentId or not in edit mode')
    return
  }
  
  // 🔄 Reset state to avoid leaking previous appointment data
  existingPayment.value = null
  
  isLoadingPayment.value = true
  try {
    const supabase = getSupabase()
    const { data: paymentData, error } = await supabase
      .from('payments')
      .select(`
        *,
        company_billing_address:company_billing_addresses!company_billing_address_id (
          id,
          company_name,
          contact_person,
          email,
          phone,
          street,
          street_number,
          zip,
          city,
          country,
          vat_number,
          notes
        ),
        credit_transaction:credit_transactions!credit_transaction_id (
          id,
          amount_rappen,
          transaction_type,
          notes
        )
      `)
      .eq('appointment_id', props.appointmentId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn('⚠️ PriceDisplay - Error loading payment data:', error)
      return
    }
    
    if (paymentData) {
      // Initialize with empty products array to avoid stale data
      existingPayment.value = { ...paymentData, products: [] }
      console.log('✅ PriceDisplay - Existing payment loaded:', {
        payment_method: paymentData.payment_method,
        payment_status: paymentData.payment_status,
        total_chf: (paymentData.total_amount_rappen / 100).toFixed(2),
        invoice_address: paymentData.invoice_address ? 'JSONB vorhanden' : 'JSONB nicht vorhanden',
        company_billing_address_id: paymentData.company_billing_address_id,
        company_billing_address: paymentData.company_billing_address ? 'Joined vorhanden' : 'Joined nicht vorhanden',
        paid_at: paymentData.paid_at
      })

      // 🔗 Produkte für genau diesen Termin laden (discount_sales -> product_sales)
      try {
        console.log('📦 Loading existing products for appointment:', props.appointmentId)
        
        // ✅ DEBUG: Prüfe zuerst, ob es überhaupt eine discount_sale gibt
        const { data: discountSale, error: dsError } = await supabase
          .from('discount_sales')
          .select('id')
          .eq('appointment_id', props.appointmentId as string)
          .single()

        console.log('🔍 DEBUG - discount_sale query result:', {
          discountSale,
          dsError,
          appointmentId: props.appointmentId
        })

        if (!dsError && discountSale?.id) {
          console.log('✅ Found discount_sale, loading products with discount_sale_id:', discountSale.id)
          
          // ✅ FIX: Versuche verschiedene Verknüpfungsmöglichkeiten
          let productsData = null
          let psError = null
          
          // Versuche 1: Über discount_sale_id (falls die Spalte existiert)
          try {
            const result1 = await supabase
              .from('product_sales')
              .select(`
                id,
                quantity,
                unit_price_rappen,
                total_price_rappen,
                products (
                  name,
                  description
                )
              `)
              .eq('discount_sale_id', discountSale.id)
            
            if (!result1.error) {
              productsData = result1.data
              psError = result1.error
              console.log('✅ Method 1 (discount_sale_id) worked')
            } else {
              console.log('❌ Method 1 failed:', result1.error.message)
            }
          } catch (e) {
            console.log('❌ Method 1 exception:', e)
          }
          
          // Versuche 2: Direkt über die product_sale_id aus der payment
          if (!productsData) {
            try {
              console.log('🔄 Trying method 2: direct product_sale_id lookup from discount_sale.id:', discountSale.id)
              const result2 = await supabase
                .from('product_sales')
                .select(`
                  id,
                  quantity,
                  unit_price_rappen,
                  total_price_rappen,
                  products (
                    name,
                    description
                  )
                `)
                .eq('product_sale_id', discountSale.id)
              
              if (!result2.error) {
                productsData = result2.data
                psError = result2.error
                console.log('✅ Method 2 (direct product_sale_id) worked')
              } else {
                console.log('❌ Method 2 failed:', result2.error.message)
              }
            } catch (e) {
              console.log('❌ Method 2 exception:', e)
            }
          }

          console.log('🔍 DEBUG - product_sales query result:', {
            productsData,
            psError,
            discountSaleId: discountSale.id
          })

          if (!psError && Array.isArray(productsData)) {
            const mapped = productsData.map((p: any) => ({
              id: p.id,
              name: p.products?.name || 'Produkt',
              description: p.products?.description || '',
              quantity: p.quantity || 1,
              price_rappen: typeof p.unit_price_rappen === 'number' ? p.unit_price_rappen : undefined,
              total_price_rappen: typeof p.total_price_rappen === 'number' ? p.total_price_rappen : undefined,
              price: undefined
            }))
            ;(existingPayment.value as any).products = mapped
            console.log('📦 PriceDisplay - Loaded appointment products:', mapped.length, mapped)
          } else {
            // Ensure products cleared if query returns nothing
            ;(existingPayment.value as any).products = []
            console.log('📦 PriceDisplay - No products for this appointment, error:', psError)
          }
        } else {
          // No discount sale => no products
          ;(existingPayment.value as any).products = []
          console.log('📦 PriceDisplay - No discount_sale found for this appointment, error:', dsError)
        }
      } catch (prodErr) {
        // On error, still ensure products are empty
        ;(existingPayment.value as any).products = []
        console.warn('⚠️ PriceDisplay - Could not load appointment products:', prodErr)
      }
    }
  } catch (err) {
    console.error('❌ PriceDisplay - Error loading payment:', err)
  } finally {
    isLoadingPayment.value = false
  }
}

// ✅ Computed: Soll Zahlungsauswahl angezeigt werden?
const showPaymentSelection = computed(() => {
  // Im Edit-Modus nur anzeigen wenn kein Payment existiert
  if (props.isEditMode) {
    return !existingPayment.value
  }
  // Im CREATE-Modus immer anzeigen
  return true
})

// ✅ Computed: Soll bestehende Payment-Info angezeigt werden?
const showExistingPaymentInfo = computed(() => {
  return props.isEditMode && existingPayment.value
})

// ✅ NEU: Computed für Rechnungsadresse-Anzeige vs. Formular
const shouldShowBillingAddressForm = computed(() => {
  const isInvoiceSelected = selectedPaymentMethod.value === 'invoice'
  const hasPaymentSelection = showPaymentSelection.value
  
  // Formular soll IMMER angezeigt werden wenn Rechnung ausgewählt ist
  const result = isInvoiceSelected && hasPaymentSelection
  
  console.log('📝 shouldShowBillingAddressForm check:', {
    isInvoiceSelected,
    hasPaymentSelection,
    result
  })
  
  return result
})

// ✅ NEU: Computed für die Anzeige der gespeicherten Rechnungsadresse
const shouldShowSavedBillingAddress = computed(() => {
  const isInvoiceSelected = selectedPaymentMethod.value === 'invoice'
  const hasStudentBilling = !!studentBillingAddress.value
  const hasExistingPaymentBilling = !!existingPayment.value?.company_billing_address
  const isNotEditing = !isEditingBillingAddress.value
  
  const result = isInvoiceSelected && (hasStudentBilling || hasExistingPaymentBilling) && isNotEditing
  
  if (isInvoiceSelected) {
    console.log('🔍 shouldShowSavedBillingAddress check (INVOICE SELECTED):', {
      isInvoiceSelected,
      hasStudentBilling,
      studentBillingAddress: studentBillingAddress.value,
      hasExistingPaymentBilling,
      existingPaymentBilling: existingPayment.value?.company_billing_address,
      isNotEditing,
      result
    })
  }
  
  return result
})

// ✅ NEU: Einheitliche Labels + Farben für Payment-Status
const paymentStatusBadge = computed(() => {
  const status = (existingPayment.value?.payment_status || '').toLowerCase()

  const statusMap: Record<string, { label: string; class: string }> = {
    completed: { label: 'Bezahlt', class: 'bg-green-100 text-green-800' },
    pending: { label: 'Ausstehend', class: 'bg-yellow-100 text-yellow-800' },
    failed: { label: 'Fehlgeschlagen', class: 'bg-red-100 text-red-800' },
    authorized: { label: 'Autorisiert', class: 'bg-blue-100 text-blue-800' },
    refunded: { label: 'Rückerstattet', class: 'bg-green-100 text-green-800' },
    refunding: { label: 'Rückerstattung läuft', class: 'bg-yellow-100 text-yellow-800' },
    voided: { label: 'Storniert', class: 'bg-gray-200 text-gray-800' }
  }

  if (!status) {
    return { label: 'Keine Zahlung', class: 'bg-gray-100 text-gray-800' }
  }

  return statusMap[status] || { label: 'Unbekannt', class: 'bg-gray-100 text-gray-800' }
})

// Computed für Rechnungsform-Validierung
const isInvoiceFormValid = computed(() => {
  return invoiceData.value.contact_person && 
         invoiceData.value.email && 
         invoiceData.value.street && 
         invoiceData.value.street_number && 
         invoiceData.value.zip && 
         invoiceData.value.city
})

// Rechnungsadresse speichern
const saveInvoiceAddress = async () => {
  if (!isInvoiceFormValid.value) return
  
  isSavingInvoice.value = true
  invoiceSaveMessage.value = null
  
  try {
    // Hole den aktuellen Benutzer für created_by
    const supabase = getSupabase()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser?.id) {
      throw new Error('Benutzer nicht angemeldet')
    }
    
    // ✅ WICHTIG: Hole die Business User ID aus der users Tabelle (nicht die Auth User ID)
    // Der Foreign Key created_by verweist auf users.id, nicht auf auth.users.id
    const { data: businessUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()
    
    if (userError || !businessUser) {
      console.error('❌ Error fetching business user:', userError)
      throw new Error('Benutzerprofil nicht gefunden. Bitte melden Sie sich erneut an.')
    }
    
    const currentUserId = businessUser.id
    console.log('🔍 Using business user ID for created_by:', currentUserId, '(auth user ID:', authUser.id, ')')
    
    let result
    
    // ✅ NEU: Falls wir im Bearbeitungsmodus sind, UPDATE statt INSERT
    if (isEditingBillingAddress.value && studentBillingAddress.value?.id) {
      console.log('✏️ Updating existing billing address:', studentBillingAddress.value.id)
      
      const updateData = {
        ...invoiceData.value,
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('company_billing_addresses')
        .update(updateData)
        .eq('id', studentBillingAddress.value.id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Update failed: ${error.message}`)
      }
      
      result = { success: true, data }
      console.log('✅ Billing address updated successfully')
      
    } else {
      // ✅ NEU: Neuen Eintrag erstellen
      console.log('➕ Creating new billing address')
      
      const addressData = {
        ...invoiceData.value,
        created_by: currentUserId, // ✅ Business User ID aus users Tabelle
        is_active: true,
        is_verified: false
      }
      
      result = await createBillingAddress(addressData)
    }
    
          if (result.success) {
        // ✅ NEU: Speichere die company_billing_address_id
        savedCompanyBillingAddressId.value = result.data?.id || null
        console.log('✅ Company billing address ID saved:', result.data?.id)
        
        // ✅ NEU: Unterscheide zwischen Update und Create für die Nachricht
        const isUpdate = isEditingBillingAddress.value
        invoiceSaveMessage.value = {
          type: 'success',
          text: isUpdate ? '✅ Rechnungsadresse erfolgreich aktualisiert!' : '✅ Rechnungsadresse erfolgreich gespeichert!'
        }
        
        // Emit an Parent Component
        emit('invoice-address-saved', result.data)
        
        // ✅ NEU: Emit der Adress-ID für Settlement
        if (result.data?.id) {
          emit('billing-address-id-saved', result.data.id)
        }
        
        // ✅ NEU: Update studentBillingAddress und exit edit mode
        studentBillingAddress.value = result.data
        isEditingBillingAddress.value = false
        
        // Form zurücksetzen
        setTimeout(() => {
          invoiceSaveMessage.value = null
        }, 3000)
        
      } else {
        throw new Error(result.error || 'Unbekannter Fehler')
      }
    
  } catch (err: any) {
    console.error('❌ Error saving invoice address:', err)
    invoiceSaveMessage.value = {
      type: 'error',
      text: `❌ Fehler beim Speichern: ${err.message}`
    }
  } finally {
    isSavingInvoice.value = false
  }
}


// ✅ Expose usedCredit for external access (useEventModalForm)
defineExpose({
  usedCredit,
  savedCompanyBillingAddressId,
  invoiceData
})

</script>
