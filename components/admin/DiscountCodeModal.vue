<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ isEditing ? 'Rabatt-Code bearbeiten' : 'Neuen Rabatt-Code erstellen' }}
        </h3>
        <button
          class="text-gray-400 hover:text-gray-600"
          @click="$emit('close')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Grundlegende Informationen -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Code *
            </label>
            <input
              v-model="form.code"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. BIRTHDAY2024"
              required
              :disabled="isEditing"
            >
            <p class="text-xs text-gray-500 mt-1">
              Eindeutiger Code für den Rabatt
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Geburtstags-Rabatt"
              required
            >
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Beschreibung
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Beschreibung des Rabatts..."
          />
        </div>

        <!-- Rabatt-Konfiguration -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-4">Rabatt-Konfiguration</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Rabatt-Typ *
              </label>
              <select
                v-model="form.discount_type"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="fixed">CHF Betrag</option>
                <option value="percentage">Prozent</option>
                <option value="free_lesson">Kostenlose Fahrstunde</option>
                <option value="free_product">Kostenloses Produkt</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Rabatt-Wert *
              </label>
              <input
                v-model.number="form.discount_value"
                type="number"
                :step="form.discount_type === 'percentage' ? 1 : 0.50"
                :min="0"
                :max="form.discount_type === 'percentage' ? 100 : 1000"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                :placeholder="form.discount_type === 'percentage' ? '10' : '20.00'"
                required
              >
              <p class="text-xs text-gray-500 mt-1">
                {{ form.discount_type === 'percentage' ? 'Prozent (0-100)' : 'CHF Betrag' }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Max. Rabatt (CHF)
              </label>
              <input
                v-model.number="form.max_discount_rappen"
                type="number"
                step="0.50"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50.00"
              >
              <p class="text-xs text-gray-500 mt-1">
                Maximaler Rabatt in CHF (für Prozent-Rabatte)
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Mindestbetrag (CHF)
              </label>
              <input
                v-model.number="form.min_amount_rappen"
                type="number"
                step="0.50"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              >
              <p class="text-xs text-gray-500 mt-1">
                Mindestbetrag für Anwendung des Rabatts
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gilt für
              </label>
              <select
                v-model="form.applies_to"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle</option>
                <option value="appointments">Nur Fahrstunden</option>
                <option value="products">Nur Produkte</option>
                <option value="specific_categories">Spezifische Kategorien</option>
              </select>
            </div>
          </div>

          <div v-if="form.applies_to === 'specific_categories'" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kategorien
            </label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="category in availableCategories"
                :key="category"
                class="flex items-center"
              >
                <input
                  v-model="form.category_filter"
                  type="checkbox"
                  :value="category"
                  class="mr-2"
                >
                <span class="text-sm">{{ category }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Automatisierung -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-4">Automatisierung</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Trigger-Typ *
              </label>
              <select
                v-model="form.trigger_type"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="manual">Manuell</option>
                <option value="birthday">Geburtstag</option>
                <option value="anniversary">Jubiläum</option>
                <option value="first_lesson">Erste Fahrstunde</option>
                <option value="milestone">Meilenstein</option>
                <option value="seasonal">Saisonal</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Automatisch anwenden
              </label>
              <div class="flex items-center">
                <input
                  v-model="form.auto_apply"
                  type="checkbox"
                  class="mr-2"
                >
                <span class="text-sm">Bei nächster Fahrstunde automatisch anwenden</span>
              </div>
            </div>
          </div>

          <!-- Trigger-Bedingungen -->
          <div v-if="form.trigger_type !== 'manual'" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Trigger-Bedingungen
            </label>
            <div class="space-y-3">
              <!-- Geburtstag -->
              <div v-if="form.trigger_type === 'birthday'" class="p-3 bg-gray-50 rounded">
                <p class="text-sm text-gray-600 mb-2">Geburtstags-Rabatt wird automatisch im Geburtsmonat angewendet</p>
                <div class="flex items-center">
                  <input
                    v-model="form.trigger_conditions.birthday_month"
                    type="checkbox"
                    class="mr-2"
                  >
                  <span class="text-sm">Nur in bestimmtem Monat (1-12)</span>
                </div>
                <input
                  v-if="form.trigger_conditions.birthday_month"
                  v-model.number="form.trigger_conditions.birthday_month_value"
                  type="number"
                  min="1"
                  max="12"
                  class="mt-2 px-3 py-1 border border-gray-300 rounded text-sm"
                  placeholder="12"
                >
              </div>

              <!-- Meilenstein -->
              <div v-if="form.trigger_type === 'milestone'" class="p-3 bg-gray-50 rounded">
                <p class="text-sm text-gray-600 mb-2">Rabatt nach bestimmter Anzahl Fahrstunden</p>
                <div class="flex items-center space-x-2">
                  <span class="text-sm">Nach</span>
                  <input
                    v-model.number="form.trigger_conditions.min_lessons"
                    type="number"
                    min="1"
                    class="px-3 py-1 border border-gray-300 rounded text-sm w-20"
                    placeholder="10"
                  >
                  <span class="text-sm">Fahrstunden</span>
                </div>
              </div>

              <!-- Saisonal -->
              <div v-if="form.trigger_type === 'seasonal'" class="p-3 bg-gray-50 rounded">
                <p class="text-sm text-gray-600 mb-2">Saisonale Rabatte</p>
                <select
                  v-model="form.trigger_conditions.season"
                  class="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="spring">Frühling (März-Mai)</option>
                  <option value="summer">Sommer (Juni-August)</option>
                  <option value="autumn">Herbst (September-November)</option>
                  <option value="winter">Winter (Dezember-Februar)</option>
                </select>
              </div>

              <!-- Jubiläum -->
              <div v-if="form.trigger_type === 'anniversary'" class="p-3 bg-gray-50 rounded">
                <p class="text-sm text-gray-600 mb-2">Rabatt zum Jubiläum (jährlich)</p>
                <div class="flex items-center space-x-2">
                  <span class="text-sm">Alle</span>
                  <input
                    v-model.number="form.trigger_conditions.years"
                    type="number"
                    min="1"
                    class="px-3 py-1 border border-gray-300 rounded text-sm w-20"
                    placeholder="1"
                  >
                  <span class="text-sm">Jahr(e)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gültigkeit -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-4">Gültigkeit</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gültig ab *
              </label>
              <input
                v-model="form.valid_from"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gültig bis
              </label>
              <input
                v-model="form.valid_until"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
              <p class="text-xs text-gray-500 mt-1">
                Leer lassen für unbegrenzte Gültigkeit
              </p>
            </div>
          </div>
        </div>

        <!-- Nutzungslimits -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-4">Nutzungslimits</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Max. Gesamt-Nutzung
              </label>
              <input
                v-model.number="form.max_total_usage"
                type="number"
                min="-1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-1"
              >
              <p class="text-xs text-gray-500 mt-1">
                -1 = unbegrenzt, 0 = deaktiviert
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Max. pro Benutzer
              </label>
              <input
                v-model.number="form.max_per_user"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
                required
              >
            </div>
          </div>
        </div>

        <!-- Fehler-Anzeige -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>

        <!-- Buttons -->
        <div class="flex space-x-3 pt-6 border-t">
          <button
            type="button"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @click="$emit('close')"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            :disabled="isLoading || !isFormValid"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Wird gespeichert...</span>
            <span v-else>{{ isEditing ? 'Aktualisieren' : 'Erstellen' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHybridDiscounts } from '~/composables/useHybridDiscounts'
import type { DiscountCode } from '~/composables/useHybridDiscounts'

interface Props {
  code?: DiscountCode | null
}

interface Emits {
  (e: 'close'): void
  (e: 'saved', code: DiscountCode): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createDiscountCode, updateDiscountCode, isLoading, error } = useHybridDiscounts()

// Available categories
const availableCategories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

// Form state
const form = ref({
  code: '',
  name: '',
  description: '',
  discount_type: 'fixed' as const,
  discount_value: 0,
  max_discount_rappen: undefined as number | undefined,
  min_amount_rappen: 0,
  applies_to: 'all' as const,
  category_filter: [] as string[],
  trigger_type: 'manual' as const,
  trigger_conditions: {} as Record<string, any>,
  auto_apply: false,
  valid_from: '',
  valid_until: '',
  max_total_usage: -1,
  max_per_user: 1
})

// Computed
const isEditing = computed(() => !!props.code)
const isFormValid = computed(() => {
  return form.value.code && 
         form.value.name && 
         form.value.discount_value > 0 &&
         form.value.valid_from &&
         form.value.max_per_user > 0
})

// Methods
const initializeForm = () => {
  if (props.code) {
    // Editing mode
    Object.assign(form.value, {
      code: props.code.code,
      name: props.code.name,
      description: props.code.description || '',
      discount_type: props.code.discount_type,
      discount_value: props.code.discount_value,
      max_discount_rappen: props.code.max_discount_rappen ? props.code.max_discount_rappen / 100 : undefined,
      min_amount_rappen: props.code.min_amount_rappen / 100,
      applies_to: props.code.applies_to,
      category_filter: props.code.category_filter || [],
      trigger_type: props.code.trigger_type,
      trigger_conditions: props.code.trigger_conditions || {},
      auto_apply: props.code.auto_apply,
      valid_from: props.code.valid_from.slice(0, 16),
      valid_until: props.code.valid_until ? props.code.valid_until.slice(0, 16) : '',
      max_total_usage: props.code.max_total_usage,
      max_per_user: props.code.max_per_user
    })
  } else {
    // Create mode
    const now = new Date()
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    
    Object.assign(form.value, {
      code: '',
      name: '',
      description: '',
      discount_type: 'fixed',
      discount_value: 0,
      max_discount_rappen: undefined,
      min_amount_rappen: 0,
      applies_to: 'all',
      category_filter: [],
      trigger_type: 'manual',
      trigger_conditions: {},
      auto_apply: false,
      valid_from: now.toISOString().slice(0, 16),
      valid_until: oneYearFromNow.toISOString().slice(0, 16),
      max_total_usage: -1,
      max_per_user: 1
    })
  }
}

const handleSubmit = async () => {
  try {
    // Form data vorbereiten
    const codeData = {
      ...form.value,
      max_discount_rappen: form.value.max_discount_rappen ? Math.round(form.value.max_discount_rappen * 100) : undefined,
      min_amount_rappen: Math.round(form.value.min_amount_rappen * 100),
      valid_from: new Date(form.value.valid_from).toISOString(),
      valid_until: form.value.valid_until ? new Date(form.value.valid_until).toISOString() : undefined
    }

    let savedCode: DiscountCode | null = null

    if (isEditing.value && props.code) {
      savedCode = await updateDiscountCode(props.code.id, codeData)
    } else {
      savedCode = await createDiscountCode(codeData)
    }

    if (savedCode) {
      emit('saved', savedCode)
    }
  } catch (err: any) {
    console.error('Error saving discount code:', err)
  }
}

// Watch for trigger type changes to reset conditions
watch(() => form.value.trigger_type, (newType) => {
  form.value.trigger_conditions = {}
  
  if (newType === 'birthday') {
    form.value.trigger_conditions = { birthday_month: false }
  } else if (newType === 'milestone') {
    form.value.trigger_conditions = { min_lessons: 10 }
  } else if (newType === 'seasonal') {
    form.value.trigger_conditions = { season: 'summer' }
  } else if (newType === 'anniversary') {
    form.value.trigger_conditions = { years: 1 }
  }
})

// Lifecycle
onMounted(() => {
  initializeForm()
})
</script>
