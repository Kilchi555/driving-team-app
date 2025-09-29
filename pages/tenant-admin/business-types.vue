<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">Business-Types verwalten</h1>
      <button @click="openCreateType" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Neu</button>
    </div>

    <div class="bg-white border rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aktiv</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="bt in businessTypes" :key="bt.code" class="hover:bg-gray-50">
            <td class="px-4 py-2 text-sm text-gray-700 font-mono">{{ bt.code }}</td>
            <td class="px-4 py-2 text-sm text-gray-900">{{ bt.name }}</td>
            <td class="px-4 py-2 text-sm text-gray-600">{{ bt.description || '-' }}</td>
            <td class="px-4 py-2 text-sm">
              <span :class="['px-2 py-0.5 rounded text-xs', bt.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700']">{{ bt.is_active ? 'Aktiv' : 'Inaktiv' }}</span>
            </td>
            <td class="px-4 py-2 text-sm text-right space-x-2">
              <button @click="openEditType(bt)" class="px-3 py-1 border rounded hover:bg-gray-50">Bearbeiten</button>
              <button @click="openEditPreset(bt)" class="px-3 py-1 border rounded hover:bg-gray-50">Preset</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Business Type Modal -->
    <div v-if="showTypeModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeTypeModal">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4" @click.stop>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editingType?.code ? 'Business-Type bearbeiten' : 'Business-Type erstellen' }}</h3>
        <div class="space-y-4">
          <div v-if="!editingType?.code">
            <label class="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input v-model="typeForm.code" type="text" class="w-full px-3 py-2 border rounded" placeholder="z.B. physiotherapy">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input v-model="typeForm.name" type="text" class="w-full px-3 py-2 border rounded" placeholder="Anzeigename">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea v-model="typeForm.description" rows="3" class="w-full px-3 py-2 border rounded" placeholder="Kurzbeschreibung"></textarea>
          </div>
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" v-model="typeForm.is_active">
            <span class="text-sm text-gray-700">Aktiv</span>
          </label>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button @click="closeTypeModal" class="px-4 py-2 bg-gray-100 rounded">Abbrechen</button>
          <button @click="saveType" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Speichern</button>
        </div>
      </div>
    </div>

    <!-- Preset Modal -->
    <div v-if="showPresetModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closePresetModal">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4" @click.stop>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Preset für {{ presetType?.name }} ({{ presetType?.code }})</h3>
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <h4 class="text-sm font-semibold text-gray-900 mb-2">Feature-Flags</h4>
            <div class="space-y-3">
              <label class="flex items-center justify-between">
                <span class="text-sm text-gray-700">Öffentliche Buchung</span>
                <input type="checkbox" v-model="presetForm.feature_flags.booking_public_enabled">
              </label>
              <label class="flex items-center justify-between">
                <span class="text-sm text-gray-700">Rechnungen</span>
                <input type="checkbox" v-model="presetForm.feature_flags.invoices_enabled">
              </label>
              <label class="flex items-center justify-between">
                <span class="text-sm text-gray-700">Pakete</span>
                <input type="checkbox" v-model="presetForm.feature_flags.packages_enabled">
              </label>
              <label class="flex items-center justify-between">
                <span class="text-sm text-gray-700">Produktverkauf</span>
                <input type="checkbox" v-model="presetForm.feature_flags.product_sales_enabled">
              </label>
              <label class="flex items-center justify-between">
                <span class="text-sm text-gray-700">Kalender-Sync</span>
                <input type="checkbox" v-model="presetForm.feature_flags.calendar_sync_enabled">
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-2">Weitere Flags können später ergänzt werden.</p>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gray-900 mb-2">UI-Labels (JSON)</h4>
            <textarea v-model="uiLabelsJson" rows="12" class="w-full px-3 py-2 border rounded font-mono text-xs" placeholder='{"label_event_type_header":"Sitzungsart"}'></textarea>
            <p v-if="uiLabelsError" class="text-xs text-red-600 mt-1">{{ uiLabelsError }}</p>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button @click="closePresetModal" class="px-4 py-2 bg-gray-100 rounded">Abbrechen</button>
          <button @click="savePreset" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Speichern</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

definePageMeta({ layout: 'tenant-admin' })

interface BusinessType { code: string; name: string; description?: string; is_active: boolean }

const isLoading = ref(false)
const isSaving = ref(false)
const businessTypes = ref<BusinessType[]>([])

// Type modal
const showTypeModal = ref(false)
const editingType = ref<BusinessType | null>(null)
const typeForm = ref<BusinessType>({ code: '', name: '', description: '', is_active: true })

// Preset modal
const showPresetModal = ref(false)
const presetType = ref<BusinessType | null>(null)
const presetForm = ref<any>({ feature_flags: {}, ui_labels: {}, defaults: {} })
const uiLabelsJson = ref('')
const uiLabelsError = ref('')

const loadBusinessTypes = async () => {
  isLoading.value = true
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('business_types')
      .select('code, name, description, is_active')
      .order('name')
    if (error) throw error
    businessTypes.value = (data || []) as BusinessType[]
  } catch (e) {
    console.error('Failed to load business types', e)
  } finally {
    isLoading.value = false
  }
}

const openCreateType = () => {
  editingType.value = null
  typeForm.value = { code: '', name: '', description: '', is_active: true }
  showTypeModal.value = true
}

const openEditType = (bt: BusinessType) => {
  editingType.value = bt
  typeForm.value = { ...bt }
  showTypeModal.value = true
}

const closeTypeModal = () => { showTypeModal.value = false }

const saveType = async () => {
  if (!typeForm.value.name || (!editingType.value && !typeForm.value.code)) return
  isSaving.value = true
  try {
    const supabase = getSupabase()
    if (editingType.value) {
      const { error } = await supabase
        .from('business_types')
        .update({ name: typeForm.value.name, description: typeForm.value.description, is_active: typeForm.value.is_active })
        .eq('code', editingType.value.code)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('business_types')
        .insert({ code: typeForm.value.code, name: typeForm.value.name, description: typeForm.value.description, is_active: typeForm.value.is_active })
      if (error) throw error
    }
    showTypeModal.value = false
    await loadBusinessTypes()
  } catch (e) {
    console.error('Failed to save business type', e)
  } finally {
    isSaving.value = false
  }
}

const openEditPreset = async (bt: BusinessType) => {
  presetType.value = bt
  uiLabelsError.value = ''
  const supabase = getSupabase()
  const { data } = await supabase
    .from('business_type_presets')
    .select('feature_flags, ui_labels, defaults')
    .eq('business_type_code', bt.code)
    .maybeSingle()
  presetForm.value = data || { feature_flags: {}, ui_labels: {}, defaults: {} }
  uiLabelsJson.value = JSON.stringify(presetForm.value.ui_labels || {}, null, 2)
  showPresetModal.value = true
}

const closePresetModal = () => { showPresetModal.value = false }

const savePreset = async () => {
  // parse UI labels
  try {
    presetForm.value.ui_labels = uiLabelsJson.value ? JSON.parse(uiLabelsJson.value) : {}
    uiLabelsError.value = ''
  } catch (e: any) {
    uiLabelsError.value = 'Ungültiges JSON'
    return
  }
  isSaving.value = true
  try {
    const supabase = getSupabase()
    const payload = {
      business_type_code: presetType.value?.code,
      feature_flags: presetForm.value.feature_flags || {},
      ui_labels: presetForm.value.ui_labels || {},
      defaults: presetForm.value.defaults || {}
    }
    const { error } = await supabase
      .from('business_type_presets')
      .upsert(payload, { onConflict: 'business_type_code' })
    if (error) throw error
    showPresetModal.value = false
  } catch (e) {
    console.error('Failed to save preset', e)
  } finally {
    isSaving.value = false
  }
}

onMounted(loadBusinessTypes)
</script>

<style scoped>
</style>


