<!-- components/StaffPOSModal.vue -->
<!-- Staff Point-of-Sale: select products, choose payment (cash/invoice/online email) -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
    <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92svh] sm:max-h-[88vh]">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <h2 class="text-lg font-bold text-gray-900">💼 Direktverkauf</h2>
        <button @click="$emit('close')" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">✕</button>
      </div>

      <!-- Success state -->
      <div v-if="successState" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div class="text-5xl mb-4">
          {{ successState === 'email_sent' ? '📧' : successState === 'cash' ? '💵' : '📄' }}
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">
          {{ successState === 'email_sent' ? 'Zahlungslink gesendet!' : successState === 'cash' ? 'Barzahlung erfasst!' : 'Rechnung erstellt!' }}
        </h3>
        <p class="text-gray-500 text-sm mb-1">
          {{ successState === 'email_sent' ? `E-Mail mit Zahlungslink wurde an ${form.customerEmail} gesendet.` : `Verkauf über CHF ${totalCHF} wurde gespeichert.` }}
        </p>
        <p v-if="successWarning" class="text-orange-600 text-sm mt-2 bg-orange-50 rounded-lg px-4 py-2">⚠️ {{ successWarning }}</p>
        <button
          @click="$emit('close')"
          class="mt-6 px-6 py-3 text-white rounded-xl font-medium transition-colors hover:opacity-90"
          :style="{ background: primaryColor }"
        >
          Fertig
        </button>
      </div>

      <!-- Form -->
      <div v-else class="flex-1 overflow-y-auto">
        <div class="p-5 space-y-5">

          <!-- Customer -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">👤 Kunde</label>
            <div v-if="preselectedStudent" class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p class="font-medium text-gray-900">{{ preselectedStudent.first_name }} {{ preselectedStudent.last_name }}</p>
                <p class="text-sm text-gray-500">{{ preselectedStudent.email }}</p>
              </div>
              <button @click="clearStudent" class="text-gray-400 hover:text-gray-600 text-sm">Ändern</button>
            </div>
            <div v-else class="space-y-2">
              <input
                v-model="form.customerName"
                type="text"
                placeholder="Name (optional)"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                :style="{ '--tw-ring-color': primaryColor }"
              />
              <input
                v-model="form.customerEmail"
                type="email"
                placeholder="E-Mail (für Online-Zahlung)"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                :class="{ 'border-red-300': form.paymentMethod === 'online' && !form.customerEmail }"
              />
            </div>
          </div>

          <!-- Payment Method -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">💳 Zahlungsart</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="method in paymentMethods"
                :key="method.key"
                @click="form.paymentMethod = method.key"
                :class="[
                  'flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                  form.paymentMethod === method.key
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                ]"
                :style="form.paymentMethod === method.key ? { background: primaryColor, borderColor: primaryColor } : {}"
              >
                <span class="text-lg">{{ method.icon }}</span>
                <span>{{ method.label }}</span>
              </button>
            </div>
            <p v-if="form.paymentMethod === 'online'" class="text-xs text-gray-500 mt-2">
              Zahlungslink wird per E-Mail an den Kunden gesendet.
            </p>
          </div>

          <!-- Products -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">📦 Produkte</label>
            <div v-if="isLoadingProducts" class="text-center py-4 text-sm text-gray-500">Lade Produkte...</div>
            <div v-else-if="availableProducts.length === 0" class="text-center py-4 text-sm text-gray-400 bg-gray-50 rounded-xl">
              Keine Produkte verfügbar. Zuerst Produkte im Admin-Bereich erfassen.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="product in availableProducts"
                :key="product.id"
                class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
              >
                <div class="flex-1 min-w-0 mr-3">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ product.name }}</p>
                  <p class="text-sm font-bold" :style="{ color: primaryColor }">CHF {{ product.price.toFixed(2) }}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    @click="decreaseQty(product)"
                    :disabled="getQty(product.id) === 0"
                    class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
                  >−</button>
                  <span class="w-6 text-center text-sm font-semibold text-gray-900">{{ getQty(product.id) }}</span>
                  <button
                    @click="increaseQty(product)"
                    class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white transition-colors font-bold"
                    :style="{ background: primaryColor, borderColor: primaryColor }"
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes (optional) -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">📝 Notizen (optional)</label>
            <input
              v-model="form.notes"
              type="text"
              placeholder="Interne Notiz..."
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>

        </div>
      </div>

      <!-- Footer with total + submit (only when not in success state) -->
      <div v-if="!successState" class="border-t border-gray-100 px-5 py-4 flex-shrink-0 bg-white">
        <!-- Total -->
        <div v-if="selectedItems.length > 0" class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-500">{{ totalItems }} Artikel</span>
          <span class="text-xl font-bold text-gray-900">CHF {{ totalCHF }}</span>
        </div>

        <!-- Error -->
        <p v-if="errorMessage" class="text-sm text-red-600 mb-3 bg-red-50 rounded-lg px-3 py-2">❌ {{ errorMessage }}</p>

        <!-- Submit -->
        <button
          @click="submit"
          :disabled="!canSubmit || isProcessing"
          class="w-full py-3.5 text-white rounded-xl font-semibold text-base transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :style="{ background: primaryColor }"
        >
          <template v-if="isProcessing">
            <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </template>
          <span v-else>{{ submitLabel }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

interface Product {
  id: string
  name: string
  price: number
  price_rappen: number
  description?: string
}

interface Props {
  isVisible: boolean
  preselectedStudent?: any
  currentUser?: any
}

const props = withDefaults(defineProps<Props>(), { isVisible: false })
const emit = defineEmits<{ 'close': []; 'sale-created': [saleId: string] }>()

const { primaryColor } = useTenantBranding()

const paymentMethods = [
  { key: 'cash' as const,    icon: '💵', label: 'Bar' },
  { key: 'invoice' as const, icon: '📄', label: 'Rechnung' },
  { key: 'online' as const,  icon: '📧', label: 'E-Mail Link' }
]

// State
const availableProducts = ref<Product[]>([])
const isLoadingProducts = ref(false)
const cart = ref<Map<string, number>>(new Map())
const isProcessing = ref(false)
const errorMessage = ref('')
const successState = ref<'cash' | 'invoice' | 'email_sent' | null>(null)
const successWarning = ref('')

const form = ref({
  customerName: '',
  customerEmail: '',
  paymentMethod: 'cash' as 'cash' | 'invoice' | 'online',
  notes: ''
})

// Pre-fill from preselected student
watch(() => props.preselectedStudent, (student) => {
  if (student) {
    form.value.customerName = `${student.first_name} ${student.last_name}`
    form.value.customerEmail = student.email || ''
  }
}, { immediate: true })

// Reset when modal opens
watch(() => props.isVisible, (visible) => {
  if (visible) {
    cart.value = new Map()
    errorMessage.value = ''
    successState.value = null
    successWarning.value = ''
    form.value.paymentMethod = 'cash'
    form.value.notes = ''
    if (!props.preselectedStudent) {
      form.value.customerName = ''
      form.value.customerEmail = ''
    }
    loadProducts()
  }
})

const clearStudent = () => {
  form.value.customerName = ''
  form.value.customerEmail = ''
}

// Cart helpers
const getQty = (productId: string) => cart.value.get(productId) || 0

const increaseQty = (product: Product) => {
  cart.value = new Map(cart.value.set(product.id, getQty(product.id) + 1))
}

const decreaseQty = (product: Product) => {
  const current = getQty(product.id)
  if (current <= 1) {
    cart.value.delete(product.id)
    cart.value = new Map(cart.value)
  } else {
    cart.value = new Map(cart.value.set(product.id, current - 1))
  }
}

// Computed
const selectedItems = computed(() => {
  const items: { product: Product; quantity: number }[] = []
  cart.value.forEach((qty, productId) => {
    if (qty > 0) {
      const product = availableProducts.value.find(p => p.id === productId)
      if (product) items.push({ product, quantity: qty })
    }
  })
  return items
})

const totalItems = computed(() => selectedItems.value.reduce((s, i) => s + i.quantity, 0))

const totalAmountRappen = computed(() =>
  selectedItems.value.reduce((s, i) => s + i.product.price_rappen * i.quantity, 0)
)

const totalCHF = computed(() => (totalAmountRappen.value / 100).toFixed(2))

const canSubmit = computed(() => {
  if (selectedItems.value.length === 0) return false
  if (form.value.paymentMethod === 'online' && !form.value.customerEmail) return false
  return true
})

const submitLabel = computed(() => {
  if (isProcessing.value) return 'Verarbeite...'
  if (form.value.paymentMethod === 'cash') return `💵 Bar kassiert – CHF ${totalCHF.value}`
  if (form.value.paymentMethod === 'invoice') return `📄 Rechnung erstellen – CHF ${totalCHF.value}`
  return `📧 Zahlungslink senden – CHF ${totalCHF.value}`
})

// Load products
const loadProducts = async () => {
  isLoadingProducts.value = true
  try {
    const supabase = getSupabase()
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    const response = await $fetch<{ success: boolean; data: any[] }>('/api/products/list-all', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    availableProducts.value = (response.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price_rappen / 100,
      price_rappen: p.price_rappen,
      description: p.description
    }))
  } catch (err) {
    logger.warn('⚠️ Could not load products:', err)
  } finally {
    isLoadingProducts.value = false
  }
}

// Submit
const submit = async () => {
  if (!canSubmit.value) return
  errorMessage.value = ''
  isProcessing.value = true

  try {
    const items = selectedItems.value.map(({ product, quantity }) => ({
      product_id: product.id,
      quantity,
      unit_price_rappen: product.price_rappen,
      total_price_rappen: product.price_rappen * quantity,
      product_name: product.name
    }))

    const body: any = {
      items,
      total_amount_rappen: totalAmountRappen.value,
      payment_method: form.value.paymentMethod,
      notes: form.value.notes || undefined
    }

    if (props.preselectedStudent) {
      body.user_id = props.preselectedStudent.id
      body.customer_name = `${props.preselectedStudent.first_name} ${props.preselectedStudent.last_name}`
      body.customer_email = props.preselectedStudent.email || undefined
    } else {
      body.customer_name = form.value.customerName || undefined
      body.customer_email = form.value.customerEmail || undefined
    }

    const response = await $fetch<any>('/api/admin/product-sales/staff-pos', {
      method: 'POST',
      body
    })

    if (response.warning) {
      successWarning.value = response.warning
    }

    successState.value = form.value.paymentMethod === 'online' ? 'email_sent' : form.value.paymentMethod
    // Emit after showing success — parent should NOT close modal immediately;
    // the "Fertig" button (which calls $emit('close')) is the only close trigger.
    emit('sale-created', response.sale_id)

  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Fehler beim Speichern'
    logger.error('❌ Staff POS submit error:', err)
  } finally {
    isProcessing.value = false
  }
}
</script>
