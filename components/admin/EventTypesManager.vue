<template>
  <div>
    <div v-if="isLoading" class="text-center py-6">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p class="text-sm text-gray-600">Eventtypen werden geladen...</p>
    </div>

    <div v-else>
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-medium text-gray-900">Eventtypen verwalten</h2>
          <button 
            @click="openCreateModal"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex">
            + Neuer Eventtyp
          </button>
        </div>
        <p class="text-sm text-gray-600">
          Öffentlich buchbare Gruppenkurse können auf der Adminseite "Kurse" erstellt werden.
        </p>
      </div>

      <div class="overflow-x-auto border rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dauer</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Farbe</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kostenpflichtig</th>
              <th v-if="showPricingColumns" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grundpreis</th>
              <th v-if="showPricingColumns" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gebühr/Termin</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Standard</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Öffentlich buchbar</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="et in eventTypes" 
              :key="et.id"
              class="hover:bg-gray-50 cursor-pointer"
              @click="openEditModal(et)"
            >
              <td class="px-4 py-2 text-sm text-gray-700">{{ et.code }}</td>
              <td class="px-4 py-2 text-sm text-gray-900">{{ et.name }}</td>
              <td class="px-4 py-2 text-sm text-gray-600 max-w-xs">
                <div class="truncate" :title="et.description || 'Keine Beschreibung'">
                  {{ et.description || '-' }}
                </div>
              </td>
              <td class="px-4 py-2 text-sm text-gray-900">{{ et.default_duration_minutes }} min</td>
              <td class="px-4 py-2 text-sm">
                <div class="flex items-center gap-2">
                  <span class="inline-block w-5 h-5 rounded border border-gray-300" :style="{ backgroundColor: et.default_color || '#ffffff' }"></span>
                  <span class="text-xs text-gray-600">{{ et.default_color || '-' }}</span>
                </div>
              </td>
              <td class="px-4 py-2 text-sm" @click.stop @mousedown.stop>
                <label class="inline-flex items-center cursor-pointer select-none">
                  <input type="checkbox" class="sr-only" :checked="!!et.require_payment" @change="onToggleRequirePayment(et, ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', et.require_payment ? 'bg-blue-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', et.require_payment ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                  <span class="ml-2 text-xs text-gray-600">{{ et.require_payment ? 'Kostenpflichtig' : 'Kostenlos' }}</span>
                </label>
              </td>
              <td v-if="showPricingColumns" class="px-4 py-2 text-sm text-gray-900">
                {{ et.require_payment ? (et.default_price_rappen ? `${et.default_price_rappen / 100} CHF` : 'Nicht gesetzt') : '-' }}
              </td>
              <td v-if="showPricingColumns" class="px-4 py-2 text-sm text-gray-900">
                {{ et.require_payment ? (et.default_fee_rappen ? `${et.default_fee_rappen / 100} CHF` : 'Nicht gesetzt') : '-' }}
              </td>
              <td class="px-4 py-2 text-center" @click.stop @mousedown.stop>
                <label class="inline-flex items-center cursor-pointer justify-center" :title="et.is_default ? 'Standard-EventType' : 'Als Standard setzen'">
                  <input 
                    type="radio" 
                    name="default_event_type" 
                    :checked="!!et.is_default" 
                    @change="setDefaultEventType(et)"
                    class="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </td>
              <td class="px-4 py-2 text-sm" @click.stop @mousedown.stop>
                <label class="inline-flex items-center cursor-pointer select-none">
                  <input type="checkbox" class="sr-only" :checked="!!et.public_bookable" @change="onTogglePublicBookable(et, ($event.target as HTMLInputElement).checked)" />
                  <div :class="['relative w-10 h-6 rounded-full transition-colors', et.public_bookable ? 'bg-indigo-600' : 'bg-gray-300']">
                    <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform', et.public_bookable ? 'translate-x-4' : 'translate-x-0']"></span>
                  </div>
                  <span class="ml-2 text-xs text-gray-600">{{ et.public_bookable ? 'Öffentlich' : 'Intern' }}</span>
                </label>
              </td>
              <td class="px-4 py-2 text-sm" @click.stop @mousedown.stop>
                <div class="flex items-center space-x-2">
                  <button
                    @click="deleteEventType(et)"
                    class="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Event-Type löschen"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Event Type Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeCreateModal">
      <div class="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col" @click.stop>
        <div class="p-6 overflow-y-auto flex-1">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Neuer Eventtyp erstellen</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input 
              v-model="newEventType.code"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. lesson, exam, theory"
              required
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input 
              v-model="newEventType.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Fahrstunde, Prüfung"
              required
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea 
              v-model="newEventType.description"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Kurze Beschreibung des Eventtyps"
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Standard-Dauer (Minuten)</label>
            <input 
              v-model.number="newEventType.default_duration_minutes"
              type="number"
              min="5"
              step="5"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="45"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
            <div class="flex items-center space-x-2">
              <input 
                v-model="newEventType.default_color"
                type="color"
                class="w-8 h-8 border border-gray-300 rounded"
              >
              <input 
                v-model="newEventType.default_color"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="#666666"
              >
            </div>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-700">Kostenpflichtig</span>
                <span class="text-xs text-gray-500">Event-Typ erfordert Zahlung</span>
              </div>
              <label class="inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" class="sr-only" v-model="newEventType.require_payment" />
                <div :class="['relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out', newEventType.require_payment ? 'bg-blue-600' : 'bg-gray-300']">
                  <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm', newEventType.require_payment ? 'translate-x-6' : 'translate-x-0']"></span>
                </div>
              </label>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-700">Öffentlich buchbar</span>
                <span class="text-xs text-gray-500">Kunden können direkt buchen</span>
              </div>
              <label class="inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" class="sr-only" v-model="newEventType.public_bookable" />
                <div :class="['relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out', newEventType.public_bookable ? 'bg-green-600' : 'bg-gray-300']">
                  <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm', newEventType.public_bookable ? 'translate-x-6' : 'translate-x-0']"></span>
                </div>
              </label>
            </div>

          </div>

          <!-- Preis-Felder (nur anzeigen wenn kostenpflichtig und nicht Fahrschule) -->
          <div v-if="newEventType.require_payment && showPricingColumns" class="space-y-4 border-t pt-4">
            <h4 class="text-sm font-medium text-gray-900">Preiseinstellungen</h4>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Grundpreis pro {{ newEventType.default_duration_minutes || 45 }}min (CHF)</label>
              <input 
                v-model.number="newEventType.default_price_chf"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              >
              <p class="text-xs text-gray-500 mt-1">Preis für {{ newEventType.default_duration_minutes || 45 }} Minuten</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Gebühr pro Termin (CHF)</label>
              <input 
                v-model.number="newEventType.default_fee_chf"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              >
              <p class="text-xs text-gray-500 mt-1">Einmalige Gebühr pro Termin</p>
            </div>
            
            <div class="p-3 bg-blue-50 rounded-lg">
              <div class="text-sm text-blue-700">
                <span class="font-medium">💡 Hinweis:</span>
                <span class="ml-2">Grundpreis ist der Basispreis, Gebühr wird pro Termin zusätzlich berechnet</span>
              </div>
            </div>
          </div>
          
          <!-- Info for Driving Schools -->
          <div v-if="newEventType.require_payment && !showPricingColumns" class="p-3 bg-blue-50 rounded-lg border-t pt-4">
            <div class="text-sm text-blue-700">
              <span class="font-medium">💡 Hinweis:</span>
              <span class="ml-2">Preise werden über Categories und Pricing Rules verwaltet</span>
            </div>
          </div>
        </div>
        </div>
        
        <div class="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <button 
            @click="closeCreateModal"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button 
            @click="createEventType"
            :disabled="isCreating || !newEventType.code || !newEventType.name"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <span v-if="isCreating">Wird erstellt...</span>
            <span v-else>Erstellen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Event Type Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeEditModal">
      <div class="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col" @click.stop>
        <div class="p-6 overflow-y-auto flex-1">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Eventtyp bearbeiten</h3>

        <div v-if="editModel" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input 
              v-model="editModel.code"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="code"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              v-model="editModel.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Name"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea 
              v-model="editModel.description"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Kurze Beschreibung des Eventtyps"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Standard-Dauer (Minuten)</label>
            <input 
              v-model.number="editModel.default_duration_minutes"
              type="number"
              min="5"
              step="5"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
            <div class="flex items-center space-x-2">
              <input 
                v-model="(editModel as any).default_color"
                type="color"
                class="w-8 h-8 border border-gray-300 rounded"
              >
              <input 
                v-model="(editModel as any).default_color"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="#666666"
              >
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-700">Kostenpflichtig</span>
                <span class="text-xs text-gray-500">Event-Typ erfordert Zahlung</span>
              </div>
              <label class="inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" class="sr-only" v-model="editModel.require_payment" />
                <div :class="['relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out', editModel.require_payment ? 'bg-blue-600' : 'bg-gray-300']">
                  <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm', editModel.require_payment ? 'translate-x-6' : 'translate-x-0']"></span>
                </div>
              </label>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-700">Öffentlich buchbar</span>
                <span class="text-xs text-gray-500">Kunden können direkt buchen</span>
              </div>
              <label class="inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" class="sr-only" v-model="editModel.public_bookable" />
                <div :class="['relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out', editModel.public_bookable ? 'bg-green-600' : 'bg-gray-300']">
                  <span :class="['absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm', editModel.public_bookable ? 'translate-x-6' : 'translate-x-0']"></span>
                </div>
              </label>
            </div>

          </div>

          <!-- Preis-Felder (nur anzeigen wenn kostenpflichtig und nicht Fahrschule) -->
          <div v-if="editModel.require_payment && showPricingColumns" class="space-y-4 border-t pt-4">
            <h4 class="text-sm font-medium text-gray-900">Preiseinstellungen</h4>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Grundpreis pro {{ editModel.default_duration_minutes || 45 }}min (CHF)</label>
              <input 
                v-model.number="editModel.default_price_chf"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              >
              <p class="text-xs text-gray-500 mt-1">Preis für {{ editModel.default_duration_minutes || 45 }} Minuten</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Gebühr pro Termin (CHF)</label>
              <input 
                v-model.number="editModel.default_fee_chf"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              >
              <p class="text-xs text-gray-500 mt-1">Einmalige Gebühr pro Termin</p>
            </div>
            
            <div class="p-3 bg-blue-50 rounded-lg">
              <div class="text-sm text-blue-700">
                <span class="font-medium">💡 Hinweis:</span>
                <span class="ml-2">Grundpreis ist der Basispreis, Gebühr wird pro Termin zusätzlich berechnet</span>
              </div>
            </div>
          </div>
          
          <!-- Info for Driving Schools -->
          <div v-if="editModel.require_payment && !showPricingColumns" class="p-3 bg-blue-50 rounded-lg border-t pt-4">
            <div class="text-sm text-blue-700">
              <span class="font-medium">💡 Hinweis:</span>
              <span class="ml-2">Preise werden über Categories und Pricing Rules verwaltet</span>
            </div>
          </div>
        </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <button 
            @click="closeEditModal"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button 
            @click="saveEdit"
            :disabled="isSaving || !editModel"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <span v-if="isSaving">Wird gespeichert...</span>
            <span v-else>Speichern</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'

interface EventTypeRow {
  id: string
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number
  default_color?: string
  is_active: boolean
  display_order?: number
  require_payment?: boolean
  public_bookable?: boolean
  is_default?: boolean
  default_price_rappen?: number
  default_fee_rappen?: number
  default_price_chf?: number
  default_fee_chf?: number
}

const isLoading = ref(false)
const isSaving = ref(false)
const isCreating = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const eventTypes = ref<EventTypeRow[]>([])
const tenantBusinessType = ref<string | null>(null)

const editModel = ref<EventTypeRow | null>(null)
const { currentUser } = useCurrentUser()

// Check if tenant is a driving school
const isDrivingSchool = computed(() => tenantBusinessType.value === 'driving_school')
const showPricingColumns = computed(() => !isDrivingSchool.value)

const newEventType = ref({
  code: '',
  name: '',
  emoji: '',
  description: '',
  default_duration_minutes: 45,
  default_color: '#666666',
  require_payment: false,
  public_bookable: true,
  default_price_chf: 0,
  default_fee_chf: 0
})

const openCreateModal = () => {
  showCreateModal.value = true
  // Reset form
  newEventType.value = {
    code: '',
    name: '',
    emoji: '',
    description: '',
    default_duration_minutes: 45,
    default_color: '#666666',
    require_payment: false,
    public_bookable: true,
    default_price_chf: 0,
    default_fee_chf: 0
  }
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const createEventType = async () => {
  if (!newEventType.value.code || !newEventType.value.name) return
  
  isCreating.value = true
  try {
    const supabase = getSupabase()
    const user = authStore.user // ✅ MIGRATED: Use auth store instead
    if (!user) throw new Error('Nicht angemeldet')

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    const tenantId = profile?.tenant_id
    if (!tenantId) throw new Error('Kein Tenant zugewiesen')

    // Pre-check per-tenant code uniqueness to avoid 409
    const { data: existing } = await supabase
      .from('event_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', newEventType.value.code)
      .limit(1)

    if (existing && existing.length > 0) {
      throw new Error('Code existiert bereits für diesen Tenant')
    }

    // Get next display order
    const { data: maxOrder } = await supabase
      .from('event_types')
      .select('display_order')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = (maxOrder?.[0]?.display_order || 0) + 1

    const { error } = await supabase
      .from('event_types')
      .insert({
        tenant_id: tenantId,
        code: newEventType.value.code,
        name: newEventType.value.name,
        emoji: newEventType.value.emoji,
        description: newEventType.value.description,
        default_duration_minutes: newEventType.value.default_duration_minutes,
        default_color: newEventType.value.default_color,
        require_payment: newEventType.value.require_payment,
        public_bookable: newEventType.value.public_bookable,
        is_active: true, // Event Types sind immer aktiv wenn erstellt
        display_order: nextOrder,
        allowed_roles: ['staff', 'admin'],
        requires_team_invite: false,
        auto_generate_title: true,
        // Convert CHF to Rappen
        default_price_rappen: newEventType.value.require_payment ? Math.round((newEventType.value.default_price_chf || 0) * 100) : 0,
        default_fee_rappen: newEventType.value.require_payment ? Math.round((newEventType.value.default_fee_chf || 0) * 100) : 0
      })

    if (error) throw error
    
    closeCreateModal()
    await load() // Reload the list
  } catch (e) {
    console.error('Failed to create event type', e)
  } finally {
    isCreating.value = false
  }
}

const load = async () => {
  isLoading.value = true
  try {
    const supabase = getSupabase()
    const user = authStore.user // ✅ MIGRATED: Use auth store instead
    if (!user) throw new Error('Nicht angemeldet')

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    const tenantId = profile?.tenant_id
    if (!tenantId) throw new Error('Kein Tenant zugewiesen')

    // Load tenant business type
    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()
    
    tenantBusinessType.value = tenant?.business_type || null
    logger.debug('🏢 Tenant business type:', tenantBusinessType.value)

    const { data, error } = await supabase
      .from('event_types')
      .select('id, code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, require_payment, public_bookable, is_default, default_price_rappen, default_fee_rappen')
      .eq('tenant_id', tenantId)
      .order('display_order')

    if (error) throw error
    eventTypes.value = (data || []) as EventTypeRow[]
  } catch (e) {
    console.error('Failed to load event types', e)
  } finally {
    isLoading.value = false
  }
}

const save = async () => {
  isSaving.value = true
  try {
    const supabase = getSupabase()
    const updates = eventTypes.value.map(et => ({
      id: et.id,
      name: et.name,
      emoji: et.emoji,
      default_duration_minutes: et.default_duration_minutes,
      is_active: et.is_active,
      require_payment: et.require_payment ?? false,
      public_bookable: et.public_bookable ?? true
    }))

    const { error } = await supabase
      .from('event_types')
      .upsert(updates, { onConflict: 'id' })

    if (error) throw error
  } catch (e) {
    console.error('Failed to save event types', e)
  } finally {
    isSaving.value = false
    await load()
  }
}

const openEditModal = (et: EventTypeRow) => {
  editModel.value = { 
    ...et,
    // Convert Rappen to CHF for editing
    default_price_chf: et.default_price_rappen ? et.default_price_rappen / 100 : 0,
    default_fee_chf: et.default_fee_rappen ? et.default_fee_rappen / 100 : 0
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editModel.value = null
}

const saveEdit = async () => {
  if (!editModel.value) return
  isSaving.value = true
  try {
    const supabase = getSupabase()
    const updatePayload = {
      id: editModel.value.id,
      code: editModel.value.code,
      name: editModel.value.name,
      emoji: editModel.value.emoji,
      default_duration_minutes: editModel.value.default_duration_minutes,
      default_color: (editModel.value as any).default_color,
      is_active: editModel.value.is_active,
      require_payment: editModel.value.require_payment ?? false,
      public_bookable: (editModel.value as any).public_bookable ?? true,
      // Convert CHF to Rappen
      default_price_rappen: editModel.value.require_payment ? Math.round((editModel.value.default_price_chf || 0) * 100) : 0,
      default_fee_rappen: editModel.value.require_payment ? Math.round((editModel.value.default_fee_chf || 0) * 100) : 0
    }

    const { error } = await supabase
      .from('event_types')
      .upsert(updatePayload, { onConflict: 'id' })

    if (error) throw error
    closeEditModal()
    await load()
  } catch (e) {
    console.error('Failed to save event type', e)
  } finally {
    isSaving.value = false
  }
}

const onTogglePublicBookable = async (et: EventTypeRow, value: boolean) => {
  try {
    const supabase = getSupabase()
    et.public_bookable = value
    const { error } = await supabase
      .from('event_types')
      .update({ public_bookable: value })
      .eq('id', et.id)
    if (error) throw error
  } catch (e) {
    console.error('Failed to update public_bookable', e)
    await load()
  }
}

const onToggleRequirePayment = async (et: EventTypeRow, value: boolean) => {
  try {
    const supabase = getSupabase()
    et.require_payment = value
    const { error } = await supabase
      .from('event_types')
      .update({ require_payment: value })
      .eq('id', et.id)
    if (error) throw error
  } catch (e) {
    console.error('Failed to update require_payment', e)
    await load()
  }
}

const setDefaultEventType = async (et: EventTypeRow) => {
  try {
    const supabase = getSupabase()
    const user = authStore.user // ✅ MIGRATED: Use auth store instead
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    const tenantId = profile?.tenant_id
    if (!tenantId) return

    // Set all event types to is_default=false for this tenant
    const { error: resetError } = await supabase
      .from('event_types')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
    
    if (resetError) throw resetError

    // Set selected event type to is_default=true
    const { error: setError } = await supabase
      .from('event_types')
      .update({ is_default: true })
      .eq('id', et.id)
    
    if (setError) throw setError

    // Update local state
    eventTypes.value.forEach(e => {
      e.is_default = e.id === et.id
    })

    logger.debug('✅ Default event type set:', et.name)
  } catch (e) {
    console.error('Failed to set default event type', e)
    await load()
  }
}

const onToggleActive = async (et: EventTypeRow, value: boolean) => {
  try {
    const supabase = getSupabase()
    et.is_active = value
    const { error } = await supabase
      .from('event_types')
      .update({ is_active: value })
      .eq('id', et.id)
    if (error) throw error
  } catch (e) {
    console.error('Failed to update is_active', e)
    await load()
  }
}

onMounted(load)
</script>


