<!-- pages/shop.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-4">
    <div class="max-w-2xl mx-auto">
      
      <!-- Header -->
      <div class="bg-white rounded-t-xl shadow-2xl">
        <div class="bg-gray-200 text-gray-700 p-6 rounded-t-xl">
          <div class="text-center">
            <img src="public/images/Driving_Team_Logo.png" class="h-12 w-auto mx-auto mb-3" alt="Driving Team">
            <h1 class="text-2xl font-bold">Registrierung</h1>
          </div>
        </div>

        <!-- Navigation Back -->
        <div class="px-6 py-3 bg-gray-50 border-b">
          <button
            @click="goBack"
            class="text-gray-600 hover:text-gray-800 flex items-center text-sm"
          >
            ← Zurück zur Auswahl
          </button>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="bg-white border-b px-6 py-4">
        <div class="flex items-center justify-center space-x-4">
          <div :class="currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 2" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 3" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            3
          </div>
        </div>
        <div class="text-center mt-2">
          <h4 class=" text-gray-600 font-bold">
            <span v-if="currentStep === 1">Kontaktdaten</span>
            <span v-if="currentStep === 2">Produktauswahl</span>
            <span v-if="currentStep === 3">Bezahlung</span>
          </h4>
        </div>
      </div>

      <!-- Form Content -->
          <!-- SCHRITT 1: KONTAKTDATEN -->
          <div v-if="currentStep === 1">
            <div class="space-y-4 bg-white p-2">
              <!-- Name -->
              <div class="grid md:grid-cols-2 gap-4">
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
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse *
                </label>
                <input
                  v-model="formData.email"
                  type="email"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="max@example.com"
                />
              </div>

              <!-- Telefon -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Telefonnummer *
                </label>
                <input
                  v-model="formData.phone"
                  type="tel"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="+41 79 123 45 67"
                />
              </div>

              <!-- Adresse -->
              <div class="grid md:grid-cols-4 gap-4">
                <div class="md:col-span-3">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Strasse *
                  </label>
                  <input
                    v-model="formData.street"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Musterstrasse"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Nr. *
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

              <!-- PLZ & Ort -->
              <div class="grid md:grid-cols-3 gap-4">
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
                <div class="md:col-span-2">
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
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Kategorie</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-gray-400">
                  <label v-for="category in availableCategories" :key="category.code"
                         class="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer hover:border-green-500 transition-colors text-center"
                         :class="formData.category === category.code ? 'border-green-500 bg-green-50' : 'border-gray-200'">
                    <input
                      v-model="formData.category"
                      type="radio"
                      :value="category.code"
                      class="sr-only"
                    />
                    <span class="text-lg font-bold">{{ category.code }}</span>
                    <span class="text-xs text-gray-600 mt-1">{{ category.name }}</span>
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

          <!-- SCHRITT 2: PRODUKTAUSWAHL -->
          <div v-if="currentStep === 2">
            <div class="space-y-6 bg-white p-2">

           <!-- Produktauswahl -->
            <div>
              <!-- Ausgewählte Produkte anzeigen -->
              <div v-if="hasProducts" class="space-y-3 mb-6">
                <h3 class="text-md font-medium text-gray-900">📦 Ihre Auswahl:</h3>
                
                <!-- Produktliste -->
                <div v-for="item in selectedProducts" :key="item.product.id"
                    class="relative flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div class="flex-1">
                    <div class="font-medium text-green-800">{{ item.product.name }}</div>
                    <div class="text-sm text-green-700">CHF {{ (item.product.price_rappen / 100).toFixed(2) }} × {{ item.quantity }}</div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <!-- Quantity Controls und Price vertikal angeordnet -->
                    <div class="flex flex-col items-center space-y-2">
                      <!-- Quantity Controls oben - enger zusammen -->
                      <div class="flex items-center space-x-1">
                        <button
                          @click="updateQuantity(item.product.id, item.quantity - 1)"
                          class="w-7 h-7 flex items-center justify-center bg-white border border-green-300 rounded text-green-600 hover:bg-green-100"
                        >
                          −
                        </button>
                        <span class="w-6 text-center font-medium text-sm">{{ item.quantity }}</span>
                        <button
                          @click="updateQuantity(item.product.id, item.quantity + 1)"
                          class="w-7 h-7 flex items-center justify-center bg-white border border-green-300 rounded text-green-600 hover:bg-green-100"
                        >
                          +
                        </button>
                      </div>
                      <!-- Total Price unten -->
                      <div class="text-lg font-bold text-green-800 text-center">
                        CHF {{ item.total.toFixed(2) }}
                      </div>
                    </div>
                  </div>
                  <!-- Remove Button - absolut positioniert unten rechts -->
                  <button
                    @click="removeProduct(item.product.id)"
                    class="absolute top-1 left-1 text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center text-sm"
                  >
                    ✕
                  </button>
                </div>
                </div>
                
                <!-- Gesamtpreis (AUSSERHALB der v-for Schleife!) -->
                <div class="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <span class="text-lg font-bold text-blue-900">💳 Gesamtpreis</span>
                  <span class="text-xl font-bold text-blue-900">CHF {{ totalPrice.toFixed(2) }}</span>
                </div>
              </div>


                  
                <!-- Produkt-Auswahl Button -->
                <div class="text-center">
                  <button
                    @click="showProductSelector = true"
                    class="px-6 py-3 mb-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    {{ hasProducts ? 'Weitere Produkte hinzufügen' : 'Produkte auswählen' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Produkt-Auswahl Modal -->
              <div v-if="showProductSelector" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  
                  <!-- Header (feste Höhe) mit X-Button -->
                  <div class="p-2 border-b flex-shrink-0">
                    <div class="flex justify-end">
                      <button 
                        @click="showProductSelector = false" 
                        class=" text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <!-- Scrollbarer Produktbereich (flexibel) -->
                  <div class="p-6 overflow-y-auto flex-1">
                    <!-- Loading State -->
                    <div v-if="isLoadingProducts" class="text-center py-8">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p class="text-gray-600">Lade Produkte...</p>
                    </div>
                    
                    <!-- Produktgrid -->
                    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div v-for="product in availableProducts" :key="product.id"
                          class="border rounded-lg p-4 hover:border-green-500 hover:shadow-md transition-all cursor-pointer"
                          @click="addProduct(product)">
                        <div v-if="product.image_url" class="mb-3">
                          <img :src="product.image_url" :alt="product.name" class="w-full h-32 object-cover rounded">
                        </div>
                        <div class="font-medium text-gray-900 mb-2">{{ product.name }}</div>
                        <div class="text-sm text-gray-600 mb-3">{{ product.description }}</div>
                        <div class="text-lg font-bold text-green-600">CHF {{ (product.price_rappen / 100).toFixed(2) }}</div>
                      </div>
                    </div>
                    
                    <!-- Fallback wenn keine Produkte -->
                    <div v-if="!isLoadingProducts && availableProducts.length === 0" class="text-center py-8 text-gray-500">
                      Derzeit sind keine Produkte verfügbar.
                    </div>
                  </div>
                </div>
              </div>
          </div>

          <!-- SCHRITT 3: PAYMENT -->
          <div v-if="currentStep === 3">
            <div class="p-2 bg-white max-w-2xl mx-auto">
              <!-- Bestellübersicht -->
              <div class="bg-gray-50 rounded-lg p-4 border">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Bestellübersicht</h3>
                
                <!-- Kundendaten -->
                <div class="mb-4 pb-4 border-b">
                  <h4 class="text-sm font-medium text-gray-700 mb-2">Kunde:</h4>
                  <div class="text-sm text-gray-600">
                    <p class="text-sm text-gray-600"><strong>{{ formData.firstName }} {{ formData.lastName }}</strong></p>
                    <p>{{ formData.street }} {{ formData.streetNumber }}</p>
                    <p>{{ formData.zip }} {{ formData.city }}</p>
                    <p>{{ formData.email }}</p>
                    <p>{{ formData.phone }}</p>
                  </div>
                </div>

                <!-- Produkte -->
                <div class="mb-4">
                  <h4 class="text-sm font-medium text-gray-700 mb-2">Bestellte Produkte:</h4>
                  <div class="space-y-2 text-gray-700 ">
                    <div v-for="item in selectedProducts" :key="item.product.id" 
                         class="flex justify-between items-center">
                      <div>
                        <span class="text-sm font-medium">{{ item.product.name }}</span><br>
                        <span class="text-xs text-gray-500 ml-2">({{ item.quantity }}x CHF {{ (item.product.price_rappen / 100).toFixed(2) }})</span>
                      </div>
                      <span class="text-sm font-medium">CHF {{ item.total.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Gesamtpreis -->
                <div class="pt-4 border-t">
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-gray-900">Gesamtpreis:</span>
                    <span class="text-xl font-bold text-green-600">CHF {{ totalPrice.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <!-- Payment Optionen -->
              <div class="bg-white border rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Bezahlung</h3>
                <div class="space-y-4">
                  
                  <!-- Online Payment (Wallee) - Hauptoption -->
                  <div class="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg">
                    
                    <!-- Dynamic Payment Methods basierend auf Geräteerkennung -->
                    <div class="grid grid-cols-2 gap-3 mb-3">
                      <!-- Twint (immer in der Schweiz) -->
                      <div class="flex items-center justify-center space-x-2 p-2 bg-white border border-blue-200 rounded-lg">
                          <img src="public/images/Twint_Logo.png" alt="Twint" class="h-10" />
                      </div>
                      
                      <!-- Apple Pay (nur auf iOS/Safari) -->
                      <div v-if="isAppleDevice" class="flex items-center justify-center space-x-2 p-2 bg-white border border-blue-200 rounded-lg">
                          <img src="/images/Apple_Pay_Mark.svg" alt="Apple Pay" class="h-10" />
                      </div>
                      
                      <!-- Google Pay (nur auf Android/Chrome) -->
                      <div  v-if="isAndroidDevice" class="flex items-center justify-center space-x-2 p-2 bg-white border border-blue-200 rounded-lg">
                          <img src="public/images/Google_Pay_Logo.png" alt="Google Pay" class="h-10" />
                      </div>
                      
                      <!-- Kreditkarte (immer verfügbar) -->
                      <div class="flex items-center justify-center space-x-2 p-2 bg-white border border-blue-200 rounded-lg">
                        <div class="flex space-x-1">
                          <!-- Visa/Mastercard -->
                          <img src="public/images/Visa_Mastercard_Logo.png" alt="Kartenzahlung" class="h-10" />
                        </div>
                      </div>
                    </div>
                    
                    <div class="text-sm text-blue-700 mb-3">
                      <p class="font-medium">Sichere Zahlung über Wallee</p>
                      <p class="text-xs text-blue-600">
                        SSL-verschlüsselt
                      </p>
                    </div>
                    
                    <!-- Online Payment Button -->
                    <button 
                      @click="startOnlinePayment"
                      :disabled="!hasProducts || isSubmitting"
                      class="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                    >
                      <span v-if="isSubmitting">⏳ Wird verarbeitet...</span>
                      <span v-else>Jetzt bezahlen <br> CHF {{ totalPrice.toFixed(2) }}</span>
                    </button>
                  </div>

                  <!-- Rechnung Option - sekundär -->
                  <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">                    
                    <!-- Invoice Button -->
                    <button 
                      @click="selectInvoicePayment"
                      :disabled="!hasProducts || isSubmitting"
                      class="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Rechnung senden
                    </button>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>

        <!-- Footer mit Navigation -->
        <div class="px-6 py-4 bg-gray-50 rounded-b-xl border-t max-w-2xl mx-auto">
          <div class="flex justify-between">
            <!-- Zurück Button -->
            <button
              v-if="currentStep > 1"
              @click="previousStep"
              class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Zurück
            </button>
            <div v-else></div>

            <button
              v-if="currentStep < 3"
              @click="nextStep"
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Weiter →
            </button>
            
            <!-- Bestellung absenden -->
            <button
              v-if="currentStep === 3"
              @click="submitOrder"
              :disabled="isSubmitting"
              class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              <span v-if="isSubmitting">⏳ Bestellung wird gesendet...</span>
              <span v-else>Absenden</span>
            </button>
          </div>
        </div>
    </div>

<!-- Auto-Save Status (oben rechts) -->
<div v-if="autoSave.statusMessage.value" class="fixed top-4 right-4 z-40">
  <Transition 
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 transform translate-y-2"
    enter-to-class="opacity-100 transform translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 transform translate-y-0"
    leave-to-class="opacity-0 transform translate-y-2"
  >
    <div v-if="autoSave.isAutoSaving.value" class="bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 flex items-center space-x-2 shadow-lg">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      <span class="text-sm text-blue-700 font-medium">{{ autoSave.statusMessage.value }}</span>
    </div>
    <div v-else-if="autoSave.showSaveMessage.value" class="bg-green-100 border border-green-300 rounded-lg px-3 py-2 shadow-lg">
      <span class="text-sm text-green-700 font-medium flex items-center">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        {{ autoSave.statusMessage.value }}
      </span>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
import { definePageMeta } from '#imports'
import { useAutoSave } from '~/composables/useAutoSave'

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
}

interface WalleeResponse {
  success: boolean
  paymentUrl?: string
  error?: string
  transactionId?: string
}

// Reactive data - Multi-Step Process
const currentStep = ref(1) // 1: Anmeldung, 2: Produktauswahl, 3: Payment
const isSubmitting = ref(false)
const isLoadingProducts = ref(false)
const availableProducts = ref<Product[]>([])
const selectedProducts = ref<ProductItem[]>([])
const showProductSelector = ref(false)

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
  return selectedProducts.value.length > 0
})

const totalPrice = computed(() => {
  return selectedProducts.value.reduce((sum, item) => sum + item.total, 0)
})

const hasProducts = computed(() => selectedProducts.value.length > 0)

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 1: return 'Ihre Kontaktdaten'
    case 2: return 'Produktauswahl'
    case 3: return 'Bezahlung'
    default: return 'Laufkundschaft'
  }
})

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 1: return canSubmitStep1.value
    case 2: return canProceedToPayment.value
    default: return false
  }
})

// Step Navigation
const nextStep = () => {
  if (currentStep.value < 3) { // ← canProceedToNextStep.value entfernt
    currentStep.value++
    
    // Produkte laden wenn wir zu Schritt 2 gehen
    if (currentStep.value === 2 && availableProducts.value.length === 0) {
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
  if (typeof navigateTo !== 'undefined') {
    navigateTo('/auswahl')
  } else {
    window.location.href = '/auswahl'
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
  }
  console.log('✅ Product added:', product.name)
  showProductSelector.value = false
}

const removeProduct = (productId: string) => {
  const index = selectedProducts.value.findIndex(item => item.product.id === productId)
  if (index >= 0) {
    const productName = selectedProducts.value[index].product.name
    selectedProducts.value.splice(index, 1)
    console.log('🗑️ Product removed:', productName)
  }
}

const updateQuantity = (productId: string, newQuantity: number) => {
  if (newQuantity <= 0) {
    removeProduct(productId)
    return
  }
  
  const item = selectedProducts.value.find(item => item.product.id === productId)
  if (item) {
    item.quantity = newQuantity
    item.total = newQuantity * (item.product.price_rappen / 100)
    console.log('📊 Quantity updated:', item.product.name, 'x', newQuantity)
  }
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
    
  } catch (error) {
    console.error('❌ Error loading products:', error)
    // Fallback Produkte falls DB nicht erreichbar
    availableProducts.value = [
      { 
        id: '1', 
        name: 'Theorielektionen', 
        description: 'Einzellektionen für die Theorieprüfung', 
        price_rappen: 4500, 
        category: 'theory',
        is_active: true,
        display_order: 1
      },
      { 
        id: '2', 
        name: 'Lehrmaterial', 
        description: 'Theoriebücher und Online-Zugang', 
        price_rappen: 2900, 
        category: 'material',
        is_active: true,
        display_order: 2
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

// In shop.vue <script setup> - Ersetzen Sie den Auto-Save Code mit:

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

// Updated startOnlinePayment mit finalizeDraft
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
    
  } catch (error) {
    console.error('❌ Online payment error:', error)
    alert('❌ Fehler beim Starten der Online-Zahlung. Ihre Daten sind gespeichert.')
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
onMounted(() => {
  // Produkte werden nur geladen wenn zu Schritt 2 navigiert wird
  console.log('🛍️ Shop mounted - Step-by-step process started')
   loadProducts() 
})
</script>