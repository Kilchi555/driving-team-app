<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white admin-modal">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-medium text-gray-900">Neue Rechnung erstellen</h3>
        <button
          class="text-gray-400 hover:text-gray-600"
          @click="$emit('close')"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>

      <form class="space-y-6" @submit.prevent="createInvoice">
        <!-- Kunde und Staff auswählen -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kunde *
            </label>
            <UserSelector
              v-model="formData.user_id"
              :placeholder="'Kunde auswählen...'"
              @selected="onCustomerSelected"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Staff (optional)
            </label>
            <StaffSelector
              v-model="formData.staff_id"
              :placeholder="'Staff auswählen...'"
            />
          </div>
        </div>

        <!-- Verknüpfungen -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Produktverkauf (optional)
            </label>
            <select
              v-model="formData.product_sale_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Keine Verknüpfung</option>
              <option v-for="sale in availableProductSales" :key="sale.id" :value="sale.id">
                {{ sale.id }} - CHF {{ formatCurrency(sale.total_amount_rappen) }}
              </option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Termin (optional)
            </label>
            <select
              v-model="formData.appointment_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Keine Verknüpfung</option>
              <option v-for="appointment in availableAppointments" :key="appointment.id" :value="appointment.id">
                {{ appointment.title }} - {{ formatDate(appointment.start_time) }}
              </option>
            </select>
          </div>
        </div>

        <!-- Offene Positionen (Kurse, Räume, Fahrzeuge) -->
        <div v-if="formData.user_id" class="border-t pt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-800">Offene Positionen</h4>
            <button type="button" @click="loadOpenItems" class="text-xs text-blue-600 hover:underline">
              {{ isLoadingOpenItems ? 'Lädt…' : 'Aktualisieren' }}
            </button>
          </div>
          <div v-if="isLoadingOpenItems" class="text-xs text-gray-400 py-2">Lädt offene Positionen…</div>
          <div v-else-if="openItems.length === 0" class="text-xs text-gray-400 py-2">Keine offenen Positionen für diesen Kunden.</div>
          <div v-else class="space-y-1.5">
            <label v-for="item in openItems" :key="item.source_id"
              class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              :class="selectedOpenItemIds.has(item.source_id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'">
              <input type="checkbox" :value="item.source_id"
                :checked="selectedOpenItemIds.has(item.source_id)"
                @change="toggleOpenItem(item)"
                class="rounded" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
                <p v-if="item.date" class="text-xs text-gray-500">{{ formatDate(item.date) }}</p>
              </div>
              <span class="text-sm font-semibold text-gray-700">CHF {{ (item.amount_rappen / 100).toFixed(2) }}</span>
            </label>
          </div>
          <div v-if="selectedOpenItemIds.size > 0" class="mt-2 text-xs text-blue-700 font-medium">
            {{ selectedOpenItemIds.size }} Position(en) ausgewählt — werden automatisch als Rechnungsposten hinzugefügt.
          </div>
        </div>

        <!-- Rechnungsempfänger -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-4">Rechnungsempfänger</h4>
          
          <div class="mb-4">
            <label class="flex items-center">
              <input
                v-model="formData.billing_type"
                type="radio"
                value="individual"
                class="mr-2"
              >
              Privatperson
            </label>
            <label class="flex items-center ml-6">
              <input
                v-model="formData.billing_type"
                type="radio"
                value="company"
                class="mr-2"
              >
              Firma
            </label>
          </div>

          <!-- Firmenfelder -->
          <div v-if="formData.billing_type === 'company'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
              <input
                v-model="formData.billing_company_name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ansprechpartner</label>
              <input
                v-model="formData.billing_contact_person"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
              <input
                v-model="formData.billing_email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">MWST-Nummer</label>
              <input
                v-model="formData.billing_vat_number"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
          </div>

          <!-- Adressfelder -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Straße</label>
              <input
                v-model="formData.billing_street"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Hausnummer</label>
              <input
                v-model="formData.billing_street_number"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <input
                v-model="formData.billing_zip"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
              <input
                v-model="formData.billing_city"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Land</label>
              <select
                v-model="formData.billing_country"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CH">Schweiz</option>
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="LI">Liechtenstein</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Rechnungspositionen -->
        <div class="border-t pt-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-md font-medium text-gray-900">Rechnungspositionen</h4>
            <button
              type="button"
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              @click="addInvoiceItem"
            >
              <PlusIcon class="h-4 w-4 mr-1" />
              Position hinzufügen
            </button>
          </div>

          <div v-if="invoiceItems.length === 0" class="text-center py-8 text-gray-500">
            Keine Positionen hinzugefügt. Fügen Sie mindestens eine Position hinzu.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(item, index) in invoiceItems"
              :key="index"
              class="border rounded-lg p-4 bg-gray-50"
            >
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
                  <input
                    v-model="item.product_name"
                    type="text"
                    required
                    placeholder="z.B. Fahrstunde, Theorieunterricht"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Menge</label>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Einzelpreis (CHF)</label>
                  <input
                    v-model.number="item.unit_price_rappen"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    @input="calculateItemTotal(item)"
                  >
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">MWST (%)</label>
                  <input
                    v-model.number="item.vat_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    @input="calculateItemTotal(item)"
                  >
                </div>
              </div>
              
              <div class="mt-2 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  Gesamt: CHF {{ formatCurrency(item.total_price_rappen) }}
                  (MWST: CHF {{ formatCurrency(item.vat_amount_rappen) }})
                </div>
                
                <button
                  type="button"
                  class="text-red-600 hover:text-red-800 text-sm"
                  @click="removeInvoiceItem(index)"
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Zusammenfassung -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-4">Zusammenfassung</h4>
          
          <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between">
              <span>Zwischensumme:</span>
              <span>CHF {{ formatCurrency(subtotal) }}</span>
            </div>
            
            <div class="flex justify-between">
              <span>MWST ({{ averageVatRate }}%):</span>
              <span>CHF {{ formatCurrency(totalVat) }}</span>
            </div>
            
            <div class="flex justify-between">
              <span>Rabatt:</span>
              <span>CHF {{ formatCurrency(formData.discount_amount_rappen) }}</span>
            </div>
            
            <div class="border-t pt-2 flex justify-between font-medium text-lg">
              <span>Gesamtbetrag:</span>
              <span>CHF {{ formatCurrency(totalAmount) }}</span>
            </div>
          </div>
        </div>

        <!-- Notizen -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Notizen (für Kunde)
            </label>
            <textarea
              v-model="formData.notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optionale Notizen für den Kunden..."
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Interne Notizen
            </label>
            <textarea
              v-model="formData.internal_notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Interne Notizen (nur für Staff sichtbar)..."
            />
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="$emit('close')"
          >
            Abbrechen
          </button>
          
          <button
            type="submit"
            :disabled="!canSubmit || isSubmitting"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon v-if="isSubmitting" class="animate-spin h-4 w-4 mr-2" />
            {{ isSubmitting ? 'Wird erstellt...' : 'Rechnung erstellen' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInvoices } from '~/composables/useInvoices'
import { useUsers } from '~/composables/useUsers'
import { useProducts } from '~/composables/useProducts'
import type { InvoiceFormData, InvoiceItemFormData } from '~/types/invoice'
import { DEFAULT_INVOICE_VALUES, DEFAULT_INVOICE_ITEM_VALUES } from '~/types/invoice'
import {
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

// Emits
const emit = defineEmits<{
  close: []
  created: [invoice: any]
}>()

// Composables
const { createInvoice } = useInvoices()
const { users, fetchUsers } = useUsers()
const { products, fetchProducts } = useProducts()

// State
const isSubmitting = ref(false)
const availableProductSales = ref<any[]>([])
const availableAppointments = ref<any[]>([])

// Form data
const formData = ref<InvoiceFormData>({
  user_id: '',
  staff_id: '',
  product_sale_id: '',
  appointment_id: '',
  billing_type: 'individual',
  billing_company_name: '',
  billing_contact_person: '',
  billing_email: '',
  billing_street: '',
  billing_street_number: '',
  billing_zip: '',
  billing_city: '',
  billing_country: 'CH',
  billing_vat_number: '',
  subtotal_rappen: 0,
  vat_rate: 7.70,
  discount_amount_rappen: 0,
  notes: '',
  internal_notes: ''
})

// Invoice items
const invoiceItems = ref<InvoiceItemFormData[]>([
  { ...DEFAULT_INVOICE_ITEM_VALUES, product_name: '', unit_price_rappen: 0, vat_rate: 7.70 }
])

// Computed
const canSubmit = computed(() => {
  return formData.value.user_id && 
         invoiceItems.value.length > 0 && 
         invoiceItems.value.every(item => 
           item.product_name && 
           item.quantity > 0 && 
           item.unit_price_rappen > 0
         )
})

const subtotal = computed(() => {
  return invoiceItems.value.reduce((sum, item) => sum + item.total_price_rappen, 0)
})

const totalVat = computed(() => {
  return invoiceItems.value.reduce((sum, item) => sum + item.vat_amount_rappen, 0)
})

const totalAmount = computed(() => {
  return subtotal.value + totalVat.value - formData.value.discount_amount_rappen
})

const averageVatRate = computed(() => {
  if (subtotal.value === 0) return 0
  return ((totalVat.value / subtotal.value) * 100).toFixed(2)
})

// ── Open items (courses, rooms, vehicles) ─────────────────────────────────
const openItems = ref<any[]>([])
const isLoadingOpenItems = ref(false)
const selectedOpenItemIds = ref<Set<string>>(new Set())

async function loadOpenItems() {
  if (!formData.value.user_id) return
  isLoadingOpenItems.value = true
  try {
    const res: any = await $fetch('/api/admin/invoices/open-items', { query: { user_id: formData.value.user_id } })
    openItems.value = res.items || []
  } catch {
    openItems.value = []
  } finally {
    isLoadingOpenItems.value = false
  }
}

function toggleOpenItem(item: any) {
  const ids = new Set(selectedOpenItemIds.value)
  if (ids.has(item.source_id)) {
    ids.delete(item.source_id)
    // Remove from invoiceItems
    const idx = invoiceItems.value.findIndex(i => (i as any)._open_item_id === item.source_id)
    if (idx !== -1) invoiceItems.value.splice(idx, 1)
    if (invoiceItems.value.length === 0) addInvoiceItem()
  } else {
    ids.add(item.source_id)
    // Add as invoice item, remove the empty placeholder if present
    const hasEmpty = invoiceItems.value.length === 1 && !invoiceItems.value[0].product_name
    if (hasEmpty) invoiceItems.value.splice(0, 1)
    const newItem: any = {
      ...DEFAULT_INVOICE_ITEM_VALUES,
      product_name: item.label,
      product_description: item.unit,
      quantity: 1,
      unit_price_rappen: item.amount_rappen,
      total_price_rappen: item.amount_rappen,
      vat_rate: 0,
      vat_amount_rappen: 0,
      sort_order: invoiceItems.value.length,
      _open_item_id: item.source_id,
      _open_item_type: item.type,
      _open_item_source_table: item.source_table,
    }
    invoiceItems.value.push(newItem)
  }
  selectedOpenItemIds.value = ids
}

// Methods
const onCustomerSelected = (user: any) => {
  if (user) {
    // Kundenadresse vorausfüllen
    formData.value.billing_email = user.email || ''
    formData.value.billing_street = user.street || ''
    formData.value.billing_street_number = user.street_nr || ''
    formData.value.billing_zip = user.zip || ''
    formData.value.billing_city = user.city || ''
    // Load open items for new user
    selectedOpenItemIds.value = new Set()
    openItems.value = []
    loadOpenItems()
  }
}

const addInvoiceItem = () => {
  invoiceItems.value.push({
    ...DEFAULT_INVOICE_ITEM_VALUES,
    product_name: '',
    unit_price_rappen: 0,
    vat_rate: 7.70,
    sort_order: invoiceItems.value.length
  })
}

const removeInvoiceItem = (index: number) => {
  if (invoiceItems.value.length > 1) {
    invoiceItems.value.splice(index, 1)
    // Sort order neu setzen
    invoiceItems.value.forEach((item, idx) => {
      item.sort_order = idx
    })
  }
}

const calculateItemTotal = (item: InvoiceItemFormData) => {
  item.total_price_rappen = Math.round(item.quantity * item.unit_price_rappen)
  item.vat_amount_rappen = Math.round(item.total_price_rappen * item.vat_rate / 100)
}

const createInvoiceHandler = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    // Alle Item-Totale berechnen
    invoiceItems.value.forEach(calculateItemTotal)
    
    // Form data aktualisieren
    formData.value.subtotal_rappen = subtotal.value
    formData.value.vat_rate = parseFloat(averageVatRate.value)
    
    const result = await createInvoice(formData.value, invoiceItems.value)
    
    if (result.error) {
      alert('Fehler beim Erstellen der Rechnung: ' + result.error)
    } else {
      alert(`Rechnung erfolgreich erstellt! Rechnungsnummer: ${result.invoice_number}`)
      emit('created', result.data)
    }
    
  } catch (error: any) {
    alert('Fehler beim Erstellen der Rechnung: ' + error.message)
  } finally {
    isSubmitting.value = false
  }
}

// Utility functions
const formatCurrency = (rappen: number) => {
  return (rappen / 100).toFixed(2)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchProducts()
  ])
  
  // TODO: Verfügbare Produktverkäufe und Termine laden
})
</script>
