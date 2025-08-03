<!-- pages/shop.vue -->
<template>
  <div class="min-h-screen bg-gray-200 p-4">
    <div class="max-w-2xl mx-auto">
      
      <!-- Header -->
      <div class="bg-white rounded-t-xl shadow-2xl">
        <div class="bg-gray-200 text-white p-6 rounded-t-xl">
          <div class="text-center">
            <img src="public/images/Driving_Team_Logo.png" class="mb-3" alt="Driving Team">
            <h1 class="text-2xl font-bold text-gray-700">Laufkundschaft</h1>
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

      <!-- Form Content -->
      <div class="bg-white shadow-2xl">
        <div class="p-6 space-y-6">
          
          <!-- Schritt 1: Kontaktdaten -->
          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-gray-900 border-b pb-2">
              📝 Ihre Kontaktdaten
            </h2>
            
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
          </div>

          <!-- Schritt 2: Produktauswahl aus Datenbank -->
          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-gray-900 border-b pb-2">
              🛍️ Was möchten Sie kaufen?
            </h2>
            
            <!-- Loading State -->
            <div v-if="isLoadingProducts" class="text-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
              <p class="text-gray-600 text-sm">Lade Produkte...</p>
            </div>
            
            <!-- Produktauswahl aus Datenbank -->
            <div v-else class="space-y-3">
              <label v-for="product in availableProducts" :key="product.id"
                     class="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-green-500 transition-colors"
                     :class="formData.selectedProductId === product.id ? 'border-green-500 bg-green-50' : 'border-gray-200'">
                <input
                  v-model="formData.selectedProductId"
                  type="radio"
                  :value="product.id"
                  class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 mr-3"
                />
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ product.name }}</div>
                  <div class="text-sm text-gray-600">{{ product.description }}</div>
                  <div class="text-sm font-semibold text-green-600 mt-1">CHF {{ (product.price_rappen / 100).toFixed(2) }}</div>
                </div>
                <div v-if="product.image_url" class="ml-4">
                  <img :src="product.image_url" :alt="product.name" class="w-16 h-16 object-cover rounded">
                </div>
              </label>
              
              <!-- Fallback wenn keine Produkte -->
              <div v-if="availableProducts.length === 0" class="text-center py-4 text-gray-500">
                Derzeit sind keine Produkte verfügbar.
              </div>
            </div>

            <!-- Menge auswählen -->
            <div v-if="formData.selectedProductId" class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Menge
              </label>
              <select v-model="formData.quantity" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <option v-for="i in 10" :key="i" :value="i">{{ i }}</option>
              </select>
            </div>
          </div>

          <!-- Schritt 3: Führerschein-Kategorie -->
          <div v-if="formData.selectedProductId" class="space-y-4">
            <h2 class="text-lg font-semibold text-gray-900 border-b pb-2">
              🚗 Führerschein-Kategorie
            </h2>
            
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
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

          <!-- Schritt 4: Bemerkungen -->
          <div v-if="formData.category" class="space-y-4">
            <h2 class="text-lg font-semibold text-gray-900 border-b pb-2">
              💬 Zusätzliche Informationen
            </h2>
            
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

        <!-- Footer mit Submit Button -->
        <div class="px-6 py-4 bg-gray-50 rounded-b-xl border-t">
          <div class="flex flex-col space-y-3">
            <!-- Preis-Anzeige -->
            <div v-if="estimatedPrice > 0" class="bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Geschätzter Preis:</span>
                <span class="text-xl font-bold text-green-600">CHF {{ estimatedPrice }}.-</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Endpreis wird individuell berechnet</p>
            </div>

            <!-- Submit Button -->
            <button
              @click="submitRequest"
              :disabled="!canSubmit || isSubmitting"
              class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <span v-if="isSubmitting">⏳ Wird gesendet...</span>
              <span v-else>📞 Anfrage senden & Kontakt aufnehmen</span>
            </button>

            <!-- Info Text -->
            <p class="text-xs text-gray-500 text-center">
              Wir kontaktieren Sie innerhalb von 24 Stunden für weitere Details und Terminvereinbarung.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { navigateTo } from '#app'

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

// Reactive data
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  selectedProductId: '',
  quantity: 1,
  category: '',
  notes: ''
})

const isSubmitting = ref(false)
const isLoadingProducts = ref(false)
const availableProducts = ref<Product[]>([])

// Available categories
const availableCategories = [
  { code: 'B', name: 'Auto' },
  { code: 'A1', name: 'Motorrad 125cc' },
  { code: 'A', name: 'Motorrad' },
  { code: 'BE', name: 'Anhänger' },
  { code: 'C', name: 'LKW' },
  { code: 'C1', name: 'LKW klein' },
  { code: 'CE', name: 'LKW Anhänger' },
  { code: 'D', name: 'Bus' }
]

// Computed
const canSubmit = computed(() => {
  return formData.value.firstName && 
         formData.value.lastName && 
         formData.value.email && 
         formData.value.selectedProductId && 
         formData.value.category
})

const estimatedPrice = computed(() => {
  const selectedProduct = availableProducts.value.find(p => p.id === formData.value.selectedProductId)
  if (!selectedProduct) return 0
  return (selectedProduct.price_rappen / 100) * formData.value.quantity
})

// Methods
const goBack = () => {
  navigateTo('/auswahl')
}

// Lade Produkte aus der Datenbank
const loadProducts = async () => {
  isLoadingProducts.value = true
  
  try {
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

const submitRequest = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    // Speichere Laufkundschaft in invited_customers Tabelle
    const supabase = getSupabase()
    const selectedProduct = availableProducts.value.find(p => p.id === formData.value.selectedProductId)
    
    const customerData = {
      first_name: formData.value.firstName.trim(),
      last_name: formData.value.lastName.trim(),
      email: formData.value.email.trim(),
      phone: null, // Kein Telefon für Laufkundschaft
      category: formData.value.category,
      notes: formData.value.notes || null,
      invited_by_staff_id: null, // Kein Staff - kommt von Website
      appointment_id: null, // Kein Termin - nur Shop-Anfrage
      customer_type: 'laufkundschaft',
      contact_method: 'email',
      source: 'website_shop',
      status: 'shop_inquiry',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Tage
      
      // 🔥 NEUE PRODUKT-VERKNÜPFUNG
      requested_product_id: formData.value.selectedProductId,
      quantity: formData.value.quantity,
      total_price_rappen: selectedProduct ? selectedProduct.price_rappen * formData.value.quantity : 0
    }

    const { data, error } = await supabase
      .from('invited_customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Shop inquiry saved:', data.id)
    
    alert(`✅ Anfrage erfolgreich gesendet!
    
Hallo ${formData.value.firstName},

Ihre Anfrage für "${selectedProduct?.name}" (${formData.value.quantity}x, Kategorie ${formData.value.category}) wurde erfolgreich übermittelt.

Geschätzter Preis: CHF ${estimatedPrice.value.toFixed(2)}

Wir kontaktieren Sie innerhalb von 24 Stunden an ${formData.value.email} für weitere Details.

Vielen Dank für Ihr Interesse!`)
    
    // Reset form mit proper typing
    const formKeys = Object.keys(formData.value) as Array<keyof typeof formData.value>
    formKeys.forEach(key => {
      if (key === 'quantity') {
        formData.value[key] = 1
      } else {
        (formData.value[key] as string) = ''
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error saving shop inquiry:', error)
    alert('❌ Fehler beim Senden der Anfrage. Bitte versuchen Sie es erneut.')
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadProducts()
})
</script>