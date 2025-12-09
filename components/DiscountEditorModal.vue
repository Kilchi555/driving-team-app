<!-- components/DiscountEditorModal.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ isEdit ? '✏️ Rabatt bearbeiten' : '➕ Neuer Rabatt' }}
        </h2>
        <button
          @click="$emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-6">
        <form @submit.prevent="saveDiscount" class="space-y-6">
          
          <!-- Basic Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="z.B. Studentenrabatt 10%"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gutscheincode (optional)
              </label>
              <div class="flex space-x-2">
                <input
                  v-model="form.code"
                  type="text"
                  placeholder="z.B. STUDENT10"
                  class="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  @click="generateCode"
                  class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                  title="Eindeutigen Code generieren"
                >
                  Generieren
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">Leer lassen oder Code generieren</p>
            </div>
          </div>

          <!-- Discount Type and Value -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Rabatttyp *
              </label>
              <select
                v-model="form.discount_type"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Bitte wählen...</option>
                <option value="percentage">Prozentual (%)</option>
                <option value="fixed">Fester Betrag (CHF)</option>
                <option value="free_lesson">Kostenlose Lektion</option>
                <option value="free_product">Kostenloses Produkt</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Rabattwert *
              </label>
              <div class="relative">
                <input
                  v-model="form.discount_value"
                  type="number"
                  required
                  :step="form.discount_type === 'percentage' ? '0.01' : '0.01'"
                  :min="0"
                  :max="form.discount_type === 'percentage' ? '100' : '9999.99'"
                  :placeholder="form.discount_type === 'percentage' ? '10.00' : '5.00'"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span class="text-gray-500 sm:text-sm">
                    {{ form.discount_type === 'percentage' ? '%' : 'CHF' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Amount Limits -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Mindestbetrag (CHF)
              </label>
              <input
                v-model="form.min_amount_rappen"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">Rabatt gilt nur ab diesem Betrag</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Maximaler Rabatt (CHF)
              </label>
              <input
                v-model="form.max_discount_rappen"
                type="number"
                step="0.01"
                min="0"
                placeholder="Unbegrenzt"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">Maximaler Rabattbetrag (optional)</p>
            </div>
          </div>

          <!-- Validity Period -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gültig ab *
              </label>
              <input
                v-model="form.valid_from"
                type="datetime-local"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gültig bis (optional)
              </label>
              <input
                v-model="form.valid_until"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">Leer lassen für unbegrenzte Gültigkeit</p>
            </div>
          </div>

          <!-- Usage Limits -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Maximale Verwendungen (gesamt)
              </label>
              <input
                v-model="form.usage_limit"
                type="number"
                min="1"
                placeholder="Unbegrenzt"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">Gesamtanzahl Verwendungen für diesen Code</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Verwendungen pro Kunde
              </label>
              <input
                v-model="form.max_per_user"
                type="number"
                min="1"
                placeholder="Unbegrenzt"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">Maximale Verwendungen pro Kunde</p>
            </div>
          </div>

          <!-- Applies To -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Gilt für *
            </label>
            <select
              v-model="form.applies_to"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle (Termine + Produkte)</option>
              <option value="appointments">Nur Termine</option>
              <option value="products">Nur Produkte</option>
              <option value="services">Nur Services</option>
            </select>
          </div>

          <!-- Category Filter - nur für Fahrschulen -->
          <div v-if="isDrivingSchool">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kategorie-Filter (optional)
            </label>
            <select
              v-model="form.category_filter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Kategorien</option>
              <option value="A">A - Motorrad/Roller</option>
              <option value="B">B - Auto</option>
              <option value="BE">BE - Auto mit Anhänger</option>
              <option value="C">C - LKW</option>
              <option value="D">D - Bus</option>
              <option value="BPT">BPT - Taxi</option>
              <option value="Motorboot">Motorboot</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">Rabatt gilt nur für diese Fahrzeugkategorie</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung (optional)
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Zusätzliche Informationen zum Rabatt..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Status -->
          <div class="flex items-center space-x-3">
            <label for="is_active" class="text-sm font-medium text-gray-700">
              Rabatt ist aktiv
            </label>
            <div class="relative">
              <input
                v-model="form.is_active"
                type="checkbox"
                id="is_active"
                class="sr-only"
              />
              <button
                @click="form.is_active = !form.is_active"
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  form.is_active ? 'bg-blue-600' : 'bg-gray-200'
                ]"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    form.is_active ? 'translate-x-5' : 'translate-x-0'
                  ]"
                />
              </button>
            </div>
          </div>

        </form>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="saveDiscount"
          :disabled="!isFormValid || isLoading"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
        >
          <span v-if="isLoading">⏳</span>
          <span v-else>{{ isEdit ? '💾 Änderungen speichern' : '➕ Rabatt erstellen' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed, onMounted, watch } from 'vue'
import { useDiscounts } from '~/composables/useDiscounts'
import { useCurrentUser } from '~/composables/useCurrentUser'
import type { Discount, CreateDiscountRequest } from '~/types/payment'

interface Props {
  discount?: Discount | null
  isEdit: boolean
}

const props = withDefaults(defineProps<Props>(), {
  discount: null,
  isEdit: false
})

const emit = defineEmits<{
  'close': []
  'saved': []
}>()

// Composables
const { createDiscount, updateDiscount } = useDiscounts()
const { currentUser } = useCurrentUser()

// State
const isLoading = ref(false)
const form = ref<CreateDiscountRequest>({
  name: '',
  code: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_amount_rappen: 0,
  max_discount_rappen: undefined,
  valid_from: new Date().toISOString().slice(0, 16),
  valid_until: undefined,
  usage_limit: undefined,
  max_per_user: undefined,
  applies_to: 'all',
  category_filter: undefined,
  is_active: true
})

// Computed
const isFormValid = computed(() => {
  return form.value.name && 
         form.value.discount_type && 
         form.value.discount_value > 0 &&
         form.value.valid_from &&
         form.value.applies_to
})

// Tenant business type check
const tenantBusinessType = computed(() => {
  return currentUser.value?.tenant?.business_type || null
})

const isDrivingSchool = computed(() => {
  return tenantBusinessType.value === 'driving_school'
})

// Methods
const initializeForm = () => {
  if (props.discount && props.isEdit) {
    form.value = {
      name: props.discount.name,
      code: props.discount.code || '',
      discount_type: props.discount.discount_type,
      discount_value: props.discount.discount_value,
      min_amount_rappen: props.discount.min_amount_rappen ? props.discount.min_amount_rappen / 100 : 0,
      max_discount_rappen: props.discount.max_discount_rappen ? props.discount.max_discount_rappen / 100 : undefined,
      valid_from: props.discount.valid_from.slice(0, 16),
      valid_until: props.discount.valid_until ? props.discount.valid_until.slice(0, 16) : undefined,
      usage_limit: props.discount.usage_limit,
      max_per_user: props.discount.max_per_user,
      applies_to: props.discount.applies_to,
      category_filter: props.discount.category_filter,
      is_active: props.discount.is_active !== undefined ? props.discount.is_active : true
    }
  } else {
    // Reset form for new discount
    form.value = {
      name: '',
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_amount_rappen: 0,
      max_discount_rappen: undefined,
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: undefined,
      usage_limit: undefined,
      max_per_user: undefined,
      applies_to: 'all',
      category_filter: undefined,
      is_active: true
    }
  }
}


const generateCode = () => {
  const prefix = form.value.name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  form.value.code = `${prefix}${random}`
}

const saveDiscount = async () => {
  if (!isFormValid.value) return

  try {
    isLoading.value = true
    
    // Convert amounts to rappen and clean up data
    const discountData: any = {
      ...form.value,
      min_amount_rappen: Math.round((parseFloat(String(form.value.min_amount_rappen || 0)) || 0) * 100),
      max_discount_rappen: form.value.max_discount_rappen ? Math.round(parseFloat(String(form.value.max_discount_rappen)) * 100) : undefined,
      discount_value: parseFloat(String(form.value.discount_value)) || 0,
      usage_limit: form.value.usage_limit ? parseInt(String(form.value.usage_limit)) : undefined,
      max_per_user: form.value.max_per_user ? parseInt(String(form.value.max_per_user)) : undefined,
      usage_count: undefined // Don't include usage_count in updates/creates
    }

    // Remove any empty strings or undefined values that could cause SQL errors
    Object.keys(discountData).forEach(key => {
      if (discountData[key] === '' || discountData[key] === undefined) {
        delete discountData[key]
      }
    })

    // For non-driving schools, always set category_filter to null
    if (!isDrivingSchool.value) {
      discountData.category_filter = undefined
    }

    if (props.isEdit && props.discount) {
      await updateDiscount(props.discount.id, discountData)
      logger.debug('✅ Discount updated')
    } else {
      await createDiscount(discountData)
      logger.debug('✅ Discount created')
    }
    
    emit('saved')
    
  } catch (error) {
    console.error('❌ Error saving discount:', error)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  initializeForm()
})

// Watch for discount changes
watch(() => props.discount, () => {
  initializeForm()
}, { immediate: true })
</script>
