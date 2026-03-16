<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Gutschein- & Rabattcodes</h3>
        <p class="text-sm text-gray-500 mt-0.5">Codes für Guthaben-Aufladung oder Preisnachlass erstellen</p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Neuer Code
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
      <button
        v-for="tab in tabs" :key="tab.value"
        @click="activeTab = tab.value"
        :class="['px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          activeTab === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900']"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-10">
      <div class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredCodes.length === 0" class="text-center py-10 text-gray-400">
      <svg class="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
      </svg>
      <p class="text-sm">Keine Codes vorhanden</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Code</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Typ</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Wert</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Einlösungen</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Gültig bis</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="code in filteredCodes" :key="code.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="font-mono font-semibold text-gray-900">{{ code.code }}</div>
              <div v-if="code.description" class="text-xs text-gray-400 mt-0.5">{{ code.description }}</div>
            </td>
            <td class="px-4 py-3">
              <span :class="['inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                code.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700']">
                {{ code.type === 'credit' ? 'Guthaben' : 'Rabatt' }}
              </span>
            </td>
            <td class="px-4 py-3 font-medium text-gray-800">
              <span v-if="code.type === 'credit'">+ CHF {{ (code.credit_amount_rappen / 100).toFixed(2) }}</span>
              <span v-else-if="code.discount_type === 'percentage'">
                {{ code.discount_value }}%
                <span v-if="code.max_discount_rappen" class="text-xs text-gray-400">
                  (max. CHF {{ (code.max_discount_rappen / 100).toFixed(2) }})
                </span>
              </span>
              <span v-else>- CHF {{ (code.discount_value / 100).toFixed(2) }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">
              {{ code.current_redemptions }} / {{ code.max_redemptions }}
            </td>
            <td class="px-4 py-3 text-gray-600">
              {{ code.valid_until ? formatDate(code.valid_until) : '∞' }}
            </td>
            <td class="px-4 py-3">
              <span :class="['inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                isCodeActive(code) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500']">
                {{ isCodeActive(code) ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1 justify-end">
                <button @click="openEditModal(code)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button @click="toggleActive(code)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                  <svg v-if="code.is_active" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <button @click="showModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <h3 class="text-lg font-bold text-gray-900 mb-5">
            {{ editingCode ? 'Code bearbeiten' : 'Neuer Code' }}
          </h3>

          <div class="space-y-4">
            <!-- Code -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                v-model="form.code"
                type="text"
                placeholder="z.B. WELCOME10"
                :disabled="!!editingCode"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                @input="form.code = form.code.toUpperCase().replace(/[^A-Z0-9-_]/g, '')"
              />
            </div>

            <!-- Beschreibung -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <input v-model="form.description" type="text" placeholder="Interne Notiz (optional)"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>

            <!-- Typ -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Typ *</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="t in codeTypes" :key="t.value"
                  @click="form.type = t.value"
                  :class="['px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition-colors',
                    form.type === t.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300']"
                >
                  <div class="font-semibold">{{ t.label }}</div>
                  <div class="text-xs opacity-70 mt-0.5">{{ t.desc }}</div>
                </button>
              </div>
            </div>

            <!-- Guthaben-Betrag -->
            <div v-if="form.type === 'credit'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Guthabenbetrag (CHF) *</label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-400 text-sm">CHF</span>
                <input v-model.number="form.credit_amount_chf" type="number" min="1" step="1" placeholder="10"
                  class="w-full border border-gray-300 rounded-lg pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
            </div>

            <!-- Rabatt-Einstellungen -->
            <div v-if="form.type === 'discount'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Rabattart *</label>
                <div class="flex gap-2">
                  <button
                    @click="form.discount_type = 'fixed'"
                    :class="['flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors',
                      form.discount_type === 'fixed' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600']"
                  >Fixer Betrag</button>
                  <button
                    @click="form.discount_type = 'percentage'"
                    :class="['flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors',
                      form.discount_type === 'percentage' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600']"
                  >Prozentsatz</button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ form.discount_type === 'percentage' ? 'Rabatt (%)' : 'Rabattbetrag (CHF)' }} *
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-400 text-sm">{{ form.discount_type === 'percentage' ? '%' : 'CHF' }}</span>
                  <input v-model.number="form.discount_value" type="number" :min="1" :max="form.discount_type === 'percentage' ? 100 : undefined" step="1"
                    class="w-full border border-gray-300 rounded-lg pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>

              <div v-if="form.discount_type === 'percentage'">
                <label class="block text-sm font-medium text-gray-700 mb-1">Max. Rabattbetrag (CHF)</label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-400 text-sm">CHF</span>
                  <input v-model.number="form.max_discount_chf" type="number" min="0" step="1" placeholder="optional"
                    class="w-full border border-gray-300 rounded-lg pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            <!-- Einlösungen -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Max. Einlösungen gesamt</label>
                <input v-model.number="form.max_redemptions" type="number" min="1" placeholder="z.B. 100"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Max. pro Benutzer</label>
                <input v-model.number="form.max_usage_per_user" type="number" min="1" placeholder="unbegrenzt"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
            </div>

            <!-- Gültigkeit -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Gültig ab</label>
                <input v-model="form.valid_from" type="date"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Gültig bis</label>
                <input v-model="form.valid_until" type="date"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
            </div>

            <!-- Error -->
            <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button @click="showModal = false"
                class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Abbrechen
              </button>
              <button @click="saveCode" :disabled="isSaving"
                class="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                {{ isSaving ? 'Wird gespeichert…' : (editingCode ? 'Speichern' : 'Code erstellen') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const codes = ref<any[]>([])
const isLoading = ref(false)
const showModal = ref(false)
const editingCode = ref<any>(null)
const isSaving = ref(false)
const formError = ref('')
const activeTab = ref('all')

const tabs = [
  { label: 'Alle', value: 'all' },
  { label: 'Guthaben', value: 'credit' },
  { label: 'Rabatt', value: 'discount' },
  { label: 'Inaktiv', value: 'inactive' },
]

const codeTypes = [
  { value: 'credit', label: 'Guthaben', desc: 'Lädt CHF-Betrag auf Guthaben' },
  { value: 'discount', label: 'Rabatt', desc: 'Reduziert Preis einer Buchung' },
]

const defaultForm = () => ({
  code: '',
  description: '',
  type: 'credit' as 'credit' | 'discount',
  credit_amount_chf: null as number | null,
  discount_type: 'fixed' as 'fixed' | 'percentage',
  discount_value: null as number | null,
  max_discount_chf: null as number | null,
  max_redemptions: 100,
  max_usage_per_user: null as number | null,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
})

const form = ref(defaultForm())

const filteredCodes = computed(() => {
  if (activeTab.value === 'all') return codes.value.filter(c => c.is_active)
  if (activeTab.value === 'inactive') return codes.value.filter(c => !c.is_active)
  return codes.value.filter(c => c.is_active && c.type === activeTab.value)
})

function isCodeActive(code: any) {
  if (!code.is_active) return false
  if (code.valid_until && new Date(code.valid_until) < new Date()) return false
  if (code.current_redemptions >= code.max_redemptions) return false
  return true
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function openCreateModal() {
  editingCode.value = null
  form.value = defaultForm()
  formError.value = ''
  showModal.value = true
}

function openEditModal(code: any) {
  editingCode.value = code
  form.value = {
    code: code.code,
    description: code.description || '',
    type: code.type || 'credit',
    credit_amount_chf: code.credit_amount_rappen ? code.credit_amount_rappen / 100 : null,
    discount_type: code.discount_type || 'fixed',
    discount_value: code.discount_value || null,
    max_discount_chf: code.max_discount_rappen ? code.max_discount_rappen / 100 : null,
    max_redemptions: code.max_redemptions,
    max_usage_per_user: code.max_usage_per_user || null,
    valid_from: code.valid_from ? code.valid_from.split('T')[0] : new Date().toISOString().split('T')[0],
    valid_until: code.valid_until ? code.valid_until.split('T')[0] : '',
  }
  formError.value = ''
  showModal.value = true
}

async function saveCode() {
  formError.value = ''

  if (!form.value.code.trim()) { formError.value = 'Code erforderlich'; return }
  if (form.value.type === 'credit' && (!form.value.credit_amount_chf || form.value.credit_amount_chf <= 0)) {
    formError.value = 'Guthabenbetrag erforderlich'; return
  }
  if (form.value.type === 'discount' && (!form.value.discount_value || form.value.discount_value <= 0)) {
    formError.value = 'Rabattwert erforderlich'; return
  }

  isSaving.value = true
  try {
    const payload: any = {
      action: editingCode.value ? 'update' : 'create',
      code: form.value.code,
      description: form.value.description || null,
      type: form.value.type,
      credit_amount_rappen: form.value.type === 'credit' ? Math.round((form.value.credit_amount_chf || 0) * 100) : 0,
      discount_type: form.value.type === 'discount' ? form.value.discount_type : null,
      discount_value: form.value.type === 'discount' ? form.value.discount_value : null,
      max_discount_rappen: form.value.max_discount_chf ? Math.round(form.value.max_discount_chf * 100) : null,
      max_redemptions: form.value.max_redemptions || 1,
      max_usage_per_user: form.value.max_usage_per_user || null,
      valid_from: form.value.valid_from ? new Date(form.value.valid_from).toISOString() : null,
      valid_until: form.value.valid_until ? new Date(form.value.valid_until).toISOString() : null,
      is_active: true,
    }

    if (editingCode.value) payload.id = editingCode.value.id

    await $fetch('/api/voucher-codes/manage', { method: 'POST', body: payload })
    showModal.value = false
    await loadCodes()
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || 'Fehler beim Speichern'
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(code: any) {
  try {
    await $fetch('/api/voucher-codes/manage', {
      method: 'POST',
      body: { action: 'update', id: code.id, is_active: !code.is_active }
    })
    await loadCodes()
  } catch {}
}

async function loadCodes() {
  isLoading.value = true
  try {
    const data = await $fetch<any[]>('/api/voucher-codes/manage', {
      method: 'POST',
      body: { action: 'list' }
    })
    codes.value = data || []
  } catch {
    codes.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadCodes)
</script>
