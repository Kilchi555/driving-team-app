<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          🛒 Anonymer Verkauf
        </h1>
        <p class="text-gray-600">
          Wählen Sie Ihre Produkte und bezahlen Sie sicher online
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Lade Produkte...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <span class="text-red-400">❌</span>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Products Section -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Verfügbare Produkte</h2>
            
            <!-- Product Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="product in availableProducts"
                :key="product.id"
                class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-gray-900">{{ product.name }}</h3>
                  <span class="text-lg font-bold text-blue-600">
                    CHF {{ (product.price_rappen / 100).toFixed(2) }}
                  </span>
                </div>
                
                <p v-if="product.description" class="text-sm text-gray-600 mb-3">
                  {{ product.description }}
                </p>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <button
                      @click="decreaseQuantity(product.id)"
                      class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      :disabled="getProductQuantity(product.id) === 0"
                    >
                      -
                    </button>
                    <span class="w-8 text-center font-medium">
                      {{ getProductQuantity(product.id) }}
                    </span>
                    <button
                      @click="increaseQuantity(product.id)"
                      class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  
                  <span v-if="getProductQuantity(product.id) > 0" class="text-sm text-gray-500">
                    CHF {{ ((product.price_rappen * getProductQuantity(product.id)) / 100).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Section -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Ihr Warenkorb</h2>
            
            <!-- Cart Items -->
            <div v-if="cartItems.length === 0" class="text-center py-8">
              <span class="text-gray-400 text-4xl">🛒</span>
              <p class="text-gray-500 mt-2">Ihr Warenkorb ist leer</p>
            </div>
            
            <div v-else class="space-y-3 mb-6">
              <div
                v-for="item in cartItems"
                :key="item.product_id"
                class="flex justify-between items-center py-2 border-b border-gray-100"
              >
                <div>
                  <p class="font-medium text-gray-900">{{ item.product_name }}</p>
                  <p class="text-sm text-gray-500">{{ item.quantity }}x</p>
                </div>
                <span class="font-medium text-gray-900">
                  CHF {{ ((item.price_rappen * item.quantity) / 100).toFixed(2) }}
                </span>
              </div>
            </div>
            
            <!-- Total -->
            <div class="border-t border-gray-200 pt-4 mb-6">
              <div class="flex justify-between items-center">
                <span class="text-lg font-semibold text-gray-900">Gesamtbetrag:</span>
                <span class="text-2xl font-bold text-blue-600">
                  CHF {{ (totalAmount / 100).toFixed(2) }}
                </span>
              </div>
            </div>
            
            <!-- Payment Button -->
            <button
              @click="proceedToPayment"
              :disabled="cartItems.length === 0 || isProcessing"
              class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isProcessing">Verarbeite...</span>
              <span v-else>💳 Jetzt bezahlen (CHF {{ (totalAmount / 100).toFixed(2) }})</span>
            </button>
            
            <!-- Payment Methods Info -->
            <div class="mt-4 text-center">
              <p class="text-sm text-gray-500">Sichere Zahlung mit</p>
              <div class="flex justify-center space-x-2 mt-2">
                <span class="text-gray-400">💳</span>
                <span class="text-gray-400">📱</span>
                <span class="text-gray-400">🏦</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const saleId = route.params.id as string

// State
const isLoading = ref(true)
const error = ref('')
const availableProducts = ref<any[]>([])
const cartItems = ref<any[]>([])
const isProcessing = ref(false)
const sale = ref<any>(null)

// Computed
const totalAmount = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.price_rappen * item.quantity), 0)
})

// Methods
const loadSale = async () => {
  try {
    const supabase = getSupabase()
    
    // Lade den anonymen Verkauf
    const { data: saleData, error: saleError } = await supabase
      .from('product_sales')
      .select('*')
      .eq('id', saleId)
      .single()
    
    if (saleError) throw saleError
    
    if (!saleData || saleData.user_id !== null) {
      throw new Error('Verkauf nicht gefunden oder ungültig')
    }
    
    sale.value = saleData
    console.log('✅ Verkauf geladen:', saleData)
    
  } catch (error: any) {
    console.error('❌ Fehler beim Laden des Verkaufs:', error)
    error.value = 'Verkauf konnte nicht geladen werden'
  }
}

const loadProducts = async () => {
  try {
    const supabase = getSupabase()
    
    // Lade alle aktiven Produkte
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    
    if (productsError) throw productsError
    
    availableProducts.value = products || []
    console.log('✅ Produkte geladen:', availableProducts.value.length)
    
  } catch (error: any) {
    console.error('❌ Fehler beim Laden der Produkte:', error)
    error.value = 'Produkte konnten nicht geladen werden'
  }
}

const getProductQuantity = (productId: string) => {
  const item = cartItems.value.find(item => item.product_id === productId)
  return item ? item.quantity : 0
}

const increaseQuantity = (productId: string) => {
  const product = availableProducts.value.find(p => p.id === productId)
  if (!product) return
  
  const existingItem = cartItems.value.find(item => item.product_id === productId)
  
  if (existingItem) {
    existingItem.quantity++
  } else {
    cartItems.value.push({
      product_id: product.id,
      product_name: product.name,
      price_rappen: product.price_rappen,
      quantity: 1
    })
  }
}

const decreaseQuantity = (productId: string) => {
  const existingItem = cartItems.value.find(item => item.product_id === productId)
  
  if (existingItem) {
    if (existingItem.quantity > 1) {
      existingItem.quantity--
    } else {
      cartItems.value = cartItems.value.filter(item => item.product_id !== productId)
    }
  }
}

const proceedToPayment = async () => {
  if (cartItems.value.length === 0) return
  
  isProcessing.value = true
  
  try {
    const supabase = getSupabase()
    
    // Aktualisiere den Verkauf mit den Produkten
    const { error: updateError } = await supabase
      .from('product_sales')
      .update({
        total_amount_rappen: totalAmount.value,
        metadata: {
          ...sale.value.metadata,
          cart_items: cartItems.value,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', saleId)
    
    if (updateError) throw updateError
    
    // Füge die Produkte zur product_sale_items hinzu
    const itemsToInsert = cartItems.value.map(item => ({
      product_sale_id: saleId,
      product_id: item.product_id,
      quantity: item.quantity,
      price_rappen: item.price_rappen
    }))
    
    const { error: itemsError } = await supabase
      .from('product_sale_items')
      .insert(itemsToInsert)
    
    if (itemsError) throw itemsError
    
    // Erstelle Wallee-Transaktion
    console.log('🔄 Erstelle Wallee-Transaktion...')
    
    const response = await fetch('/api/wallee/create-anonymous-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: totalAmount.value,
        currency: 'CHF',
        customer_name: sale.value.metadata?.customer_name || 'Anonymer Kunde',
        customer_email: sale.value.metadata?.customer_email || null,
        sale_id: saleId,
        items: cartItems.value.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price_rappen: item.price_rappen
        }))
      })
    })
    
    if (!response.ok) {
      throw new Error('Fehler bei der Wallee-Transaktion')
    }
    
    const transactionData = await response.json()
    
    if (transactionData.success && transactionData.payment_url) {
      // Weiterleitung zur Wallee-Zahlungsseite
      console.log('✅ Wallee-Transaktion erstellt, leite weiter...')
      window.location.href = transactionData.payment_url
    } else {
      throw new Error('Keine Zahlungs-URL erhalten')
    }
    
  } catch (error: any) {
    console.error('❌ Fehler beim Aktualisieren des Verkaufs:', error)
    alert(`Fehler: ${error.message}`)
  } finally {
    isProcessing.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await loadSale()
  await loadProducts()
  isLoading.value = false
})
</script>
