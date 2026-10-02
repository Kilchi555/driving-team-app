<!-- components/StaffPOSModal.vue -->
<!-- Staff Point-of-Sale: catalog product, server-priced payment -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
    <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92svh] sm:max-h-[88vh]">

      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <h2 class="text-lg font-bold text-gray-900">💼 Direktverkauf</h2>
        <button @click="$emit('close')" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">✕</button>
      </div>

      <div v-if="successState" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div class="text-5xl mb-4">{{ successIcon }}</div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">{{ successTitle }}</h3>
        <p class="text-gray-500 text-sm mb-1">{{ successText }}</p>
        <p v-if="successWarning" class="text-orange-600 text-sm mt-2 bg-orange-50 rounded-lg px-4 py-2">⚠️ {{ successWarning }}</p>
        <button
          @click="$emit('close')"
          class="mt-6 px-6 py-3 text-white rounded-xl font-medium transition-colors hover:opacity-90"
          :style="{ background: primaryColor }"
        >
          Fertig
        </button>
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <div class="p-5 space-y-5">

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">👤 Kunde</label>
            <div v-if="selectedCustomer" class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ selectedCustomer.first_name }} {{ selectedCustomer.last_name }}</p>
                <p class="text-sm text-gray-500 truncate">{{ selectedCustomer.email || selectedCustomer.phone || 'Keine Kontaktdaten' }}</p>
              </div>
              <div class="flex gap-2 flex-shrink-0">
                <button @click="startCustomerChange" class="text-sm text-gray-500 hover:text-gray-800">Ändern</button>
                <button @click="clearCustomer" class="text-sm text-gray-400 hover:text-gray-700">Entfernen</button>
              </div>
            </div>
            <div v-else class="space-y-2">
              <input
                v-model="customerQuery"
                type="search"
                placeholder="Name, E-Mail oder Telefon"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                @input="onCustomerQuery"
              />
              <p v-if="isSearchingCustomers" class="text-xs text-gray-400">Suche...</p>
              <div v-else-if="customerResults.length" class="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  v-for="customer in customerResults"
                  :key="customer.id"
                  type="button"
                  class="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                  @click="selectCustomer(customer)"
                >
                  <p class="text-sm font-medium text-gray-900">{{ customer.first_name }} {{ customer.last_name }}</p>
                  <p class="text-xs text-gray-500">{{ customer.email || customer.phone || '' }}</p>
                </button>
              </div>
              <p v-else-if="customerQuery.trim().length > 0 && !isSearchingCustomers" class="text-xs text-gray-400">Kein aktiver Kunde gefunden</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">💳 Zahlungsart</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="method in paymentMethods"
                :key="method.key"
                type="button"
                @click="form.paymentMethod = method.key"
                :disabled="!selectedCustomer"
                :class="[
                  'flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                  form.paymentMethod === method.key
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                ]"
                :style="form.paymentMethod === method.key && selectedCustomer ? { background: primaryColor, borderColor: primaryColor } : {}"
              >
                <span class="text-lg">{{ method.icon }}</span>
                <span class="text-center leading-tight">{{ method.label }}</span>
              </button>
            </div>
            <p v-if="!selectedCustomer" class="text-xs text-gray-500 mt-2">Bitte zuerst einen Kunden auswählen.</p>
            <p v-else-if="form.paymentMethod === 'online'" class="text-xs text-gray-500 mt-2">
              Zahlungslink wird per E-Mail an den Kunden gesendet. Guthaben erst nach Zahlungsbestätigung.
            </p>
            <p v-else-if="form.paymentMethod === 'invoice_send'" class="text-xs text-gray-500 mt-2">
              Guthaben wird erst nach erfolgreichem Rechnungsversand gutgeschrieben.
            </p>
          </div>

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
                    type="button"
                    @click="decreaseQty(product)"
                    :disabled="getQty(product.id) === 0"
                    class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
                  >−</button>
                  <span class="w-6 text-center text-sm font-semibold text-gray-900">{{ getQty(product.id) }}</span>
                  <button
                    type="button"
                    @click="increaseQty(product)"
                    :disabled="getQty(product.id) >= 100"
                    class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white transition-colors font-bold disabled:opacity-30"
                    :style="{ background: primaryColor, borderColor: primaryColor }"
                  >+</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div v-if="!successState" class="border-t border-gray-100 px-5 py-4 flex-shrink-0 bg-white">
        <div v-if="selectedItems.length > 0" class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-500">{{ totalItems }} Artikel</span>
          <span class="text-xl font-bold text-gray-900">CHF {{ totalCHF }}</span>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-600 mb-3 bg-red-50 rounded-lg px-3 py-2">❌ {{ errorMessage }}</p>
        <button
          type="button"
          @click="submit"
          :disabled="!canSubmit || isProcessing"
          class="w-full py-3.5 text-white rounded-xl font-semibold text-base transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :style="{ background: primaryColor }"
        >
          <span v-if="isProcessing">Verarbeite...</span>
          <span v-else>{{ submitLabel }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useCashPaymentSettings } from '~/composables/useCashPaymentSettings'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

interface Product {
  id: string
  name: string
  price: number
  price_rappen: number
}

interface PosCustomer {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
}

type PayMethod = 'cash' | 'deferred' | 'invoice' | 'invoice_send' | 'online'

interface Props {
  isVisible: boolean
  preselectedStudent?: PosCustomer | null
  currentUser?: any
}

const props = withDefaults(defineProps<Props>(), { isVisible: false, preselectedStudent: null })
const emit = defineEmits<{ close: []; 'sale-created': [saleId: string] }>()

const { primaryColor } = useTenantBranding()
const { cashVisible } = useCashPaymentSettings('staff')

const paymentMethods = computed(() => [
  ...(cashVisible.value ? [{ key: 'cash' as const, icon: '💵', label: 'Bar' }] : []),
  { key: 'deferred' as const, icon: '⏳', label: 'Später verrechnen' },
  { key: 'invoice' as const, icon: '📄', label: 'Rechnung erstellen' },
  { key: 'invoice_send' as const, icon: '✉️', label: 'Rechnung erstellen & versenden' },
  { key: 'online' as const, icon: '📧', label: 'E-Mail-Link' },
])

const availableProducts = ref<Product[]>([])
const isLoadingProducts = ref(false)
const cart = ref<Map<string, number>>(new Map())
const isProcessing = ref(false)
const errorMessage = ref('')
const successState = ref<PayMethod | null>(null)
const successWarning = ref('')
const selectedCustomer = ref<PosCustomer | null>(null)
const customerQuery = ref('')
const customerResults = ref<PosCustomer[]>([])
const isSearchingCustomers = ref(false)
const idempotencyKey = ref<string | null>(null)
const idempotencyFingerprint = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const form = ref({ paymentMethod: 'invoice' as PayMethod })

watch(() => props.preselectedStudent, (student) => {
  if (student?.id) selectedCustomer.value = student
}, { immediate: true })

watch(() => props.isVisible, (visible) => {
  if (!visible) return
  cart.value = new Map()
  errorMessage.value = ''
  successState.value = null
  successWarning.value = ''
  customerQuery.value = ''
  customerResults.value = []
  idempotencyKey.value = null
  idempotencyFingerprint.value = ''
  form.value.paymentMethod = cashVisible.value ? 'cash' : 'deferred'
  selectedCustomer.value = props.preselectedStudent?.id ? props.preselectedStudent : null
  loadProducts()
})

function clearCustomer() {
  selectedCustomer.value = null
  customerQuery.value = ''
  customerResults.value = []
  idempotencyKey.value = null
}

function startCustomerChange() {
  selectedCustomer.value = null
  customerQuery.value = ''
  customerResults.value = []
}

function selectCustomer(customer: PosCustomer) {
  selectedCustomer.value = customer
  customerResults.value = []
  customerQuery.value = ''
  idempotencyKey.value = null
}

function onCustomerQuery() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(searchCustomers, 250)
}

async function authHeader() {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function searchCustomers() {
  const q = customerQuery.value.trim()
  if (!q) {
    customerResults.value = []
    return
  }
  isSearchingCustomers.value = true
  try {
    const response = await $fetch<{ success: boolean; data: PosCustomer[] }>('/api/admin/staff-pos/customers', {
      query: { q },
      headers: await authHeader(),
    })
    customerResults.value = response.data || []
  } catch (err) {
    customerResults.value = []
    logger.warn('POS customer search failed', err)
  } finally {
    isSearchingCustomers.value = false
  }
}

const getQty = (productId: string) => cart.value.get(productId) || 0

const increaseQty = (product: Product) => {
  const next = Math.min(100, getQty(product.id) + 1)
  cart.value = new Map(cart.value.set(product.id, next))
  idempotencyKey.value = null
}

const decreaseQty = (product: Product) => {
  const current = getQty(product.id)
  if (current <= 1) cart.value.delete(product.id)
  else cart.value.set(product.id, current - 1)
  cart.value = new Map(cart.value)
  idempotencyKey.value = null
}

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

const totalItems = computed(() => selectedItems.value.reduce((sum, item) => sum + item.quantity, 0))
const totalAmountRappen = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.product.price_rappen * item.quantity, 0)
)
const totalCHF = computed(() => (totalAmountRappen.value / 100).toFixed(2))

const canSubmit = computed(() => selectedItems.value.length > 0 && !!selectedCustomer.value?.id)

const submitLabel = computed(() => {
  if (form.value.paymentMethod === 'cash') return `Bar kassiert – CHF ${totalCHF.value}`
  if (form.value.paymentMethod === 'deferred') return `Später verrechnen – CHF ${totalCHF.value}`
  if (form.value.paymentMethod === 'invoice') return `Rechnung erstellen – CHF ${totalCHF.value}`
  if (form.value.paymentMethod === 'invoice_send') return `Rechnung versenden – CHF ${totalCHF.value}`
  return `Zahlungslink senden – CHF ${totalCHF.value}`
})

const successIcon = computed(() => {
  if (successState.value === 'online') return '📧'
  if (successState.value === 'cash') return '💵'
  if (successState.value === 'deferred') return '⏳'
  return '📄'
})

const successTitle = computed(() => {
  if (successState.value === 'online') return 'Zahlungslink erstellt'
  if (successState.value === 'cash') return 'Barzahlung erfasst'
  if (successState.value === 'deferred') return 'Verkauf erfasst'
  if (successState.value === 'invoice_send') return successWarning.value ? 'Rechnung erstellt' : 'Rechnung versendet'
  return 'Rechnung erstellt'
})

const successText = computed(() => {
  if (successState.value === 'online') return 'Der Zahlungslink wurde vorbereitet.'
  return `Verkauf über CHF ${totalCHF.value} wurde gespeichert.`
})

const loadProducts = async () => {
  isLoadingProducts.value = true
  try {
    const response = await $fetch<{ success: boolean; data: any[] }>('/api/products/list-all', {
      headers: await authHeader(),
    })
    availableProducts.value = (response.data || [])
      .filter((product: any) => product.is_voucher !== true && product.is_active !== false)
      .map((product: any) => ({
        id: product.id,
        name: product.name,
        price: product.price_rappen / 100,
        price_rappen: product.price_rappen,
      }))
  } catch (err) {
    logger.warn('⚠️ Could not load products:', err)
  } finally {
    isLoadingProducts.value = false
  }
}

function saleFingerprint() {
  return JSON.stringify({
    customer: selectedCustomer.value?.id,
    method: form.value.paymentMethod,
    items: selectedItems.value.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
  })
}

const submit = async () => {
  if (!canSubmit.value || !selectedCustomer.value) return
  errorMessage.value = ''
  isProcessing.value = true
  const fingerprint = saleFingerprint()
  if (!idempotencyKey.value || idempotencyFingerprint.value !== fingerprint) {
    idempotencyKey.value = crypto.randomUUID()
    idempotencyFingerprint.value = fingerprint
  }

  try {
    const response = await $fetch<any>('/api/admin/staff-pos/sale', {
      method: 'POST',
      headers: await authHeader(),
      body: {
        customer_id: selectedCustomer.value.id,
        payment_method: form.value.paymentMethod,
        idempotency_key: idempotencyKey.value,
        items: selectedItems.value.map(({ product, quantity }) => ({
          product_id: product.id,
          quantity,
        })),
      },
    })

    successWarning.value = response.warning || ''
    if (response.retry_same_key) {
      errorMessage.value = response.warning || 'Der Verkauf ist noch nicht abgeschlossen. Bitte erneut versuchen.'
      return
    }
    idempotencyKey.value = null
    successState.value = form.value.paymentMethod
    emit('sale-created', response.payment_id)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Fehler beim Speichern'
    logger.error('❌ Staff POS submit error:', err)
  } finally {
    isProcessing.value = false
  }
}
</script>
