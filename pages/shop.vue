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
      <div class="bg-white shadow-2xl">
        <div class="p-6">
          <!-- SCHRITT 1: KONTAKTDATEN -->
          <div v-if="currentStep === 1">
            <div class="space-y-4">
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
                <p class="text-xs text-gray-500 mt-1">Für die Bestätigung und weitere Informationen</p>
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
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-gray-300">
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
            <div class="space-y-6">

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
                    class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    {{ hasProducts ? '+ Weitere Produkte hinzufügen' : '🛍️ Produkte auswählen' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Produkt-Auswahl Modal -->
            <div v-if="showProductSelector" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                
                <div class="p-6 overflow-y-auto max-h-[90vh]">
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
            <div class="space-y-6">
              <!-- Bestellübersicht -->
              <div class="bg-gray-50 rounded-lg p-6 border">
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
                        <span class="text-sm font-medium">{{ item.product.name }}</span>
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
                <h3 class="text-lg font-medium text-gray-900 mb-4">💳 Bezahlung</h3>
                <div class="space-y-4">
                  
                  <!-- Online Payment (Wallee) - Hauptoption -->
                  <div class="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="font-bold text-blue-900 text-lg">⚡ Sofort bezahlen</h4>
                      <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                        Empfohlen
                      </span>
                    </div>
                    
                    <!-- Dynamic Payment Methods basierend auf Geräteerkennung -->
                    <div class="grid grid-cols-2 gap-3 mb-3">
                      <!-- Twint (immer in der Schweiz) -->
                      <div class="flex items-center space-x-2 p-3 bg-white border border-blue-200 rounded-lg">
                      <!-- Twint SVG Fallback -->
                      <svg class="w-8 h-8" viewBox="0 0 100 100" fill="none">
                        <rect width="100" height="100" rx="20" fill="#0066CC"/>
                        <path d="M20 25h60v50H20z" fill="white"/>
                        <text x="50" y="55" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="16" fill="#0066CC">twint</text>
                      </svg>                        
                      <span class="font-medium text-gray-700">Twint</span>
                      </div>
                      
                      <!-- Apple Pay (nur auf iOS/Safari) -->
                      <div v-if="isAppleDevice" class="flex items-center space-x-2 p-3 bg-white border border-blue-200 rounded-lg">
                          <img src="/images/Apple_Pay_Mark.svg" alt="Apple Pay" class="w-8 h-8" />
                      </div>
                      
                      <!-- Google Pay (nur auf Android/Chrome) -->
                      <div v-if="isAndroidDevice" class="flex items-center space-x-2 p-3 bg-white border border-blue-200 rounded-lg">
                        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M12.0002 2C6.48022 2 2.00022 6.48 2.00022 12C2.00022 17.52 6.48022 22 12.0002 22C17.5202 22 22.0002 17.52 22.0002 12C22.0002 6.48 17.5202 2 12.0002 2ZM10.0002 17L5.00022 12L6.41022 10.59L10.0002 14.17L17.5902 6.58L19.0002 8L10.0002 17Z" fill="#4285F4"/>
                        </svg>
                        <span class="font-medium text-gray-700">Google Pay</span>
                      </div>
                      
                      <!-- Kreditkarte (immer verfügbar) -->
                      <div class="flex items-center space-x-2 p-3 bg-white border border-blue-200 rounded-lg">
                        <div class="flex space-x-1">
                          <!-- Visa -->
                          <svg class="w-6 h-4" viewBox="0 0 40 24" fill="none">
                            <rect width="40" height="24" rx="4" fill="#1A1F71"/>
                            <path d="M16.4 18.4L14.2 5.6H11.6L13.8 18.4H16.4ZM22.8 5.6L20.4 14.8L18.6 6.8C18.4 6 17.8 5.6 17 5.6H12.4L12.2 6.2C13.8 6.6 15.2 7.4 16.2 8.4L18.8 18.4H21.6L26.2 5.6H22.8ZM32.8 12.4C32.8 11.2 31.8 10.4 30.2 9.8C29.4 9.4 28.8 9.2 28.8 8.8C28.8 8.4 29.2 8 30 8C30.8 8 31.4 8.2 31.8 8.4L32.2 8.6L32.8 6.2C32.2 5.8 31.2 5.4 30 5.4C27.4 5.4 25.6 6.8 25.6 8.8C25.6 10.4 27 11.4 28.2 12C29.4 12.6 29.8 13 29.8 13.6C29.8 14.4 28.8 14.8 27.8 14.8C26.6 14.8 25.8 14.4 25.2 14L24.8 13.8L24.2 16.4C24.8 16.8 26 17.2 27.4 17.2C30.2 17.2 32 15.8 32.8 12.4Z" fill="white"/>
                          </svg>
                          <!-- Mastercard -->
                          <svg class="w-6 h-4" viewBox="0 0 40 24" fill="none">
                            <rect width="40" height="24" rx="4" fill="#FF5F00"/>
                            <circle cx="15" cy="12" r="7" fill="#EB001B"/>
                            <circle cx="25" cy="12" r="7" fill="#F79E1B"/>
                            <path d="M20 6.27C21.8 7.82 23 10.12 23 12.73C23 15.34 21.8 17.64 20 19.19C18.2 17.64 17 15.34 17 12.73C17 10.12 18.2 7.82 20 6.27Z" fill="#FF5F00"/>
                          </svg>
                        </div>
                        <span class="font-medium text-gray-700">Karte</span>
                      </div>
                    </div>
                    
                    <div class="text-sm text-blue-700 mb-3">
                      <p class="font-medium">✅ Sichere Zahlung über Wallee</p>
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
                      <span v-else>⚡ Jetzt bezahlen - CHF {{ totalPrice.toFixed(2) }}</span>
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
        </div>

        <!-- Footer mit Navigation -->
        <div class="px-6 py-4 bg-gray-50 rounded-b-xl border-t">
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

            <!-- Weiter/Absenden Button -->
            <button
              @click="nextStep"
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Weiter
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
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
import { definePageMeta } from '#imports'

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
  { code: 'Boot', name: 'Motorboot' },

]

// Computed
const canSubmitStep1 = computed(() => {
  return formData.value.firstName && 
         formData.value.lastName && 
         formData.value.email && 
         formData.value.phone &&
         formData.value.street &&
         formData.value.streetNumber &&
         formData.value.zip &&
         formData.value.city &&
         formData.value.category
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

const submitOrder = async () => {
  if (!canProceedToPayment.value) return
  
  isSubmitting.value = true
  
  try {
    // Importiere getSupabase dynamisch
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    const customerData = {
      first_name: formData.value.firstName.trim(),
      last_name: formData.value.lastName.trim(),
      email: formData.value.email.trim(),
      phone: formData.value.phone.trim(),
      category: formData.value.category,
      notes: formData.value.notes || null,
      invited_by_staff_id: null, // Kein Staff - kommt von Website
      appointment_id: null, // Kein Termin - nur Shop-Anfrage
      customer_type: 'laufkundschaft',
      contact_method: 'email',
      source: 'website_shop',
      status: 'shop_inquiry',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Tage
      
      // 🔥 ERSTE PRODUKT-VERKNÜPFUNG (für invited_customers table)
      requested_product_id: selectedProducts.value.length > 0 ? selectedProducts.value[0].product.id : null,
      quantity: selectedProducts.value.reduce((sum, item) => sum + item.quantity, 0),
      total_price_rappen: Math.round(totalPrice.value * 100),
      
      // 🔥 ALLE PRODUKTE IM METADATA
      metadata: {
        address: {
          street: formData.value.street.trim(),
          street_number: formData.value.streetNumber.trim(),
          zip: formData.value.zip.trim(),
          city: formData.value.city.trim()
        },
        products: selectedProducts.value.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price_rappen: item.product.price_rappen,
          total_price_rappen: Math.round(item.total * 100)
        })),
        order_step: 'completed',
        payment_method: 'invoice',
        source_details: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      }
    }

    const { data, error } = await supabase
      .from('invited_customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Shop order saved:', data.id)
    
    const productList = selectedProducts.value.map(item => 
      `• ${item.product.name} (${item.quantity}x à CHF ${(item.product.price_rappen / 100).toFixed(2)})`
    ).join('\n')
    
    alert(`✅ Bestellung erfolgreich aufgegeben!
    
Hallo ${formData.value.firstName},

Ihre Bestellung wurde erfolgreich übermittelt:

${productList}

Gesamtpreis: CHF ${totalPrice.value.toFixed(2)}
Bestellnummer: ${data.id}

Sie erhalten in Kürze eine Rechnung per E-Mail an ${formData.value.email} mit allen Details und der Bankverbindung.

Wir kontaktieren Sie innerhalb von 24 Stunden für die weitere Abwicklung.

Vielen Dank für Ihre Bestellung!`)
    
    // Redirect back to start
    goBack()
    
  } catch (error: any) {
    console.error('❌ Error saving shop order:', error)
    alert('❌ Fehler beim Absenden der Bestellung. Bitte versuchen Sie es erneut.')
  } finally {
    isSubmitting.value = false
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
const startOnlinePayment = async () => {
  if (!hasProducts.value) return
  
  isSubmitting.value = true
  
  try {
    // 1. Bestellung erstellen
    await submitOrder()
    
    // 2. Wallee Payment starten
    const paymentData = {
      amount: totalPrice.value,
      currency: 'CHF',
      customerEmail: formData.value.email,
      customerName: `${formData.value.firstName} ${formData.value.lastName}`,
      description: `Driving Team Bestellung - ${selectedProducts.value.map(p => p.product.name).join(', ')}`,
      successUrl: `${window.location.origin}/payment/success`,
      failedUrl: `${window.location.origin}/payment/failed`
    }
    
    const response = await $fetch<WalleeResponse>('/api/wallee/create-transaction', {
      method: 'POST',
      body: paymentData
    })
    
    if (response.success && response.paymentUrl) {
      // Redirect zu Wallee Payment Page
      window.location.href = response.paymentUrl
    } else {
      throw new Error('Payment URL konnte nicht erstellt werden')
    }
    
  } catch (error) {
    console.error('❌ Online payment error:', error)
    alert('❌ Fehler beim Starten der Online-Zahlung. Versuchen Sie es erneut oder wählen Sie Rechnung.')
  } finally {
    isSubmitting.value = false
  }
}

const selectInvoicePayment = async () => {
  // Standard Rechnungsbestellung
  await submitOrder()
}

// Lifecycle
onMounted(() => {
  // Produkte werden nur geladen wenn zu Schritt 2 navigiert wird
  console.log('🛍️ Shop mounted - Step-by-step process started')
   loadProducts() 
})
</script>