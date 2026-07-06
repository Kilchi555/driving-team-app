<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

    <!-- Header -->
    <div class="px-4 sm:px-5 py-4 flex items-center justify-between" :style="{ background: `${primaryColor}0d`, borderBottom: `1px solid ${primaryColor}22` }">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Pendenzen</h2>
        <p class="text-xs text-gray-500 mt-0.5">
          <span v-if="totalCount === 0">Keine offenen Aufgaben</span>
          <span v-else>{{ pendentCount }} pendent · <span class="text-red-600 font-medium">{{ overdueCount }} überfällig</span></span>
        </p>
      </div>
      <button
        @click="showNewModal = true"
        class="flex items-center gap-1.5 px-3 py-1.5 text-white text-sm font-medium rounded-lg shadow-sm hover:opacity-90 transition-opacity"
        :style="{ background: primaryColor }"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Neu
      </button>
    </div>

    <!-- ── System Alerts ──────────────────────────────────────────────── -->
    <div v-if="systemAlerts.length > 0" class="border-b border-gray-100">
      <div class="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span class="text-xs font-semibold text-amber-700">System-Meldungen</span>
      </div>
      <div class="divide-y divide-gray-50">
        <NuxtLink
          v-for="alert in systemAlerts"
          :key="alert.type"
          :to="alert.link"
          class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
        >
          <!-- Priority dot -->
          <span class="w-2 h-2 rounded-full flex-shrink-0"
            :class="{
              'bg-red-500': alert.priority === 'critical',
              'bg-orange-400': alert.priority === 'high',
              'bg-yellow-400': alert.priority === 'medium',
              'bg-blue-400': alert.priority === 'low',
            }"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-gray-700 truncate">{{ alert.label }}</p>
            <p v-if="alert.items.length > 0" class="text-[11px] text-gray-400 truncate">
              {{ alert.items[0].text }}{{ alert.items.length > 1 ? ` +${alert.items.length - 1} weitere` : '' }}
            </p>
          </div>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            :class="{
              'bg-red-100 text-red-700': alert.priority === 'critical',
              'bg-orange-100 text-orange-700': alert.priority === 'high',
              'bg-yellow-100 text-yellow-700': alert.priority === 'medium',
              'bg-blue-100 text-blue-700': alert.priority === 'low',
            }"
          >{{ alert.count }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
      <button
        v-for="{ key, label, count, color } in statCards"
        :key="key"
        @click="selectedStatus = selectedStatus === key ? null : key"
        :class="['py-3 text-center transition-colors', selectedStatus === key ? 'bg-gray-50' : 'hover:bg-gray-50']"
      >
        <div class="text-xl font-bold" :style="{ color: selectedStatus === key ? primaryColor : color }">{{ count }}</div>
        <div class="text-[10px] text-gray-500 mt-0.5 leading-tight px-1">{{ label }}</div>
      </button>
    </div>

    <!-- Active filter pill -->
    <div v-if="selectedStatus" class="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
      <span class="text-xs text-gray-500">Filter:</span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" :style="{ background: primaryColor }">
        {{ getStatusLabel(selectedStatus) }}
        <button @click="selectedStatus = null" class="ml-0.5 opacity-70 hover:opacity-100">✕</button>
      </span>
    </div>

    <!-- List -->
    <div class="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
      <div
        v-for="pendency in filteredPendencies"
        :key="pendency.id"
        @click="editingPendency = pendency; showEditModal = true"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <!-- Badges row -->
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              <span :class="['px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide', getStatusClass(pendency.status)]">
                {{ getStatusLabel(pendency.status) }}
              </span>
              <span :class="['px-1.5 py-0.5 rounded text-[10px] font-medium', getPriorityClass(pendency.priority)]">
                {{ pendency.priority }}
              </span>
            </div>
            <p class="text-sm font-medium text-gray-900 truncate">{{ pendency.title }}</p>
            <p v-if="pendency.description" class="text-xs text-gray-500 truncate mt-0.5">{{ pendency.description }}</p>
            <div class="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
              <span>📅 {{ formatDate(pendency.due_date) }}</span>
              <span v-if="pendency.assigned_to">👤 {{ pendency.assigned_to }}</span>
              <span v-if="pendency.recurrence_type !== 'keine'">🔄 {{ pendency.recurrence_type }}</span>
            </div>
          </div>
          <button
            @click.stop="toggleStatus(pendency)"
            class="flex-shrink-0 px-2.5 py-1 rounded-lg border text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            :style="{ borderColor: primaryColor, color: primaryColor }"
          >
            {{ getNextStatusLabel(pendency.status) }}
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPendencies.length === 0" class="py-10 text-center">
        <div class="text-3xl mb-2">🎉</div>
        <p class="text-sm text-gray-400">Keine Pendenzen</p>
      </div>
    </div>

    <!-- New/Edit Modal -->
    <div v-if="showNewModal || showEditModal" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92svh] flex flex-col">
        <!-- Modal Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0" :style="{ background: `${primaryColor}0d` }">
          <h3 class="text-base font-semibold text-gray-900">{{ editingPendency ? 'Pendenz bearbeiten' : 'Neue Pendenz' }}</h3>
          <button @click="closeModals" class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors text-sm">✕</button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto flex-1">
          <!-- Title -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Titel *</label>
            <input v-model="formData.title" type="text" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:border-transparent" placeholder="z.B. Rechnungsprüfung durchführen"/>
          </div>
          <!-- Description -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Beschreibung</label>
            <textarea v-model="formData.description" rows="2" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:border-transparent" placeholder="Weitere Details..."></textarea>
          </div>
          <!-- Priority / Category / Status -->
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Priorität</label>
              <select v-model="formData.priority" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2">
                <option value="niedrig">Niedrig</option>
                <option value="mittel">Mittel</option>
                <option value="hoch">Hoch</option>
                <option value="kritisch">Kritisch</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Kategorie</label>
              <select v-model="formData.category" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2">
                <option value="system">System</option>
                <option value="zahlung">Zahlung</option>
                <option value="marketing">Marketing</option>
                <option value="personal">Personal</option>
                <option value="buchung">Buchung</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select v-model="formData.status" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2">
                <option value="pendent">Pendent</option>
                <option value="in_bearbeitung">In Bearbeitung</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select>
            </div>
          </div>
          <!-- Due Date -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Fällig am *</label>
            <input :value="formatDatetimeLocal(formData.due_date)" @input="(e: any) => formData.due_date = new Date(e.target.value).toISOString()" type="datetime-local" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2"/>
          </div>
          <!-- Recurrence -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Wiederholung</label>
              <select v-model="formData.recurrence_type" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2">
                <option value="keine">Keine</option>
                <option value="täglich">Täglich</option>
                <option value="wöchentlich">Wöchentlich</option>
                <option value="monatlich">Monatlich</option>
                <option value="jährlich">Jährlich</option>
              </select>
            </div>
            <div v-if="formData.recurrence_type !== 'keine'">
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Endet am</label>
              <input :value="formatDateLocal(formData.recurrence_end_date)" @input="(e: any) => formData.recurrence_end_date = e.target.value ? new Date(e.target.value).toISOString() : undefined" type="date" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2"/>
            </div>
          </div>
          <!-- Notes -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Notizen</label>
            <textarea v-model="formData.notes" rows="2" class="tenant-focus w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2" placeholder="Interne Notizen..."></textarea>
          </div>
        </div>

        <div class="px-5 py-4 border-t border-gray-100 flex justify-between gap-3 flex-shrink-0">
          <button v-if="editingPendency" @click="deletePendencyConfirm" class="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors">Löschen</button>
          <div class="flex gap-2 ml-auto">
            <button @click="closeModals" class="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Abbrechen</button>
            <button @click="savePendency" class="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity" :style="{ background: primaryColor }">Speichern</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePendencies, type Pendency } from '~/composables/usePendencies'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { formatDate } from '~/utils/dateUtils'

const { currentUser } = useCurrentUser()
const { primaryColor: brandPrimary } = useTenantBranding()
const primaryColor = computed(() => brandPrimary.value || '#4f46e5')
const { 
  pendencies, 
  pendentCount, 
  overdueCount, 
  inProgressCount, 
  completedCount,
  loadPendencies, 
  createPendency, 
  updatePendency, 
  deletePendency,
  handleRecurrence,
  changeStatus
} = usePendencies()

const showNewModal = ref(false)
const showEditModal = ref(false)
const selectedStatus = ref<string | null>(null)
const editingPendency = ref<Pendency | null>(null)
const systemAlerts = ref<any[]>([])

const totalCount = computed(() => pendencies.value.length)

const statCards = computed(() => [
  { key: 'pendent',        label: 'Pendent',        count: pendentCount.value,    color: '#3b82f6' },
  { key: 'überfällig',     label: 'Überfällig',     count: overdueCount.value,    color: '#ef4444' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung', count: inProgressCount.value, color: '#f59e0b' },
  { key: 'abgeschlossen',  label: 'Abgeschlossen',  count: completedCount.value,  color: '#22c55e' },
])

const filteredPendencies = computed(() => {
  if (!selectedStatus.value) return pendencies.value
  return pendencies.value.filter(p => p.status === selectedStatus.value)
})

const formData = ref<Partial<Pendency>>({
  title: '',
  description: '',
  status: 'pendent',
  priority: 'mittel',
  category: 'sonstiges',
  due_date: new Date().toISOString(),
  recurrence_type: 'keine',
  notes: ''
})

onMounted(async () => {
  if (currentUser.value?.tenant_id) {
    await loadPendencies(currentUser.value.tenant_id)
  }
  // Load system alerts (non-blocking)
  $fetch<any>('/api/admin/system-alerts').then(res => {
    systemAlerts.value = res?.alerts ?? []
  }).catch(() => {})
})

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pendent': '⏳ Pendent',
    'überfällig': '🔴 Überfällig',
    'in_bearbeitung': '⚙️ In Bearbeitung',
    'abgeschlossen': '✅ Abgeschlossen',
    'gelöscht': '🗑️ Gelöscht'
  }
  return labels[status] || status
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'pendent': 'bg-blue-100 text-blue-800',
    'überfällig': 'bg-red-100 text-red-800',
    'in_bearbeitung': 'bg-yellow-100 text-yellow-800',
    'abgeschlossen': 'bg-green-100 text-green-800',
    'gelöscht': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getPriorityClass = (priority: string) => {
  const classes: Record<string, string> = {
    'kritisch': 'bg-red-100 text-red-800',
    'hoch': 'bg-orange-100 text-orange-800',
    'mittel': 'bg-blue-100 text-blue-800',
    'niedrig': 'bg-gray-100 text-gray-800'
  }
  return classes[priority] || 'bg-gray-100 text-gray-800'
}

const getNextStatusLabel = (status: string) => {
  const nextStates: Record<string, string> = {
    'pendent': 'In Bearbeitung',
    'überfällig': 'In Bearbeitung',
    'in_bearbeitung': 'Abgeschlossen',
    'abgeschlossen': 'Pendent'
  }
  return nextStates[status] || 'Wechseln'
}

const toggleStatus = async (pendency: Pendency) => {
  let nextStatus: Pendency['status']
  switch (pendency.status) {
    case 'pendent':
    case 'überfällig':
      nextStatus = 'in_bearbeitung'
      break
    case 'in_bearbeitung':
      nextStatus = 'abgeschlossen'
      break
    default:
      nextStatus = 'pendent'
  }
  
  await changeStatus(pendency.id, nextStatus)
  
  if (nextStatus === 'abgeschlossen' && pendency.recurrence_type !== 'keine') {
    await handleRecurrence(pendency)
  }
}

const savePendency = async () => {
  // Validate required fields
  if (!formData.value.title || formData.value.title.trim() === '') {
    alert('Bitte geben Sie einen Titel ein')
    return
  }
  if (!formData.value.due_date) {
    alert('Bitte wählen Sie ein Fälligkeitsdatum')
    return
  }

  // Wait for currentUser if not loaded yet
  let tenantId = currentUser.value?.tenant_id
  if (!tenantId) {
    // Retry a few times
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      tenantId = currentUser.value?.tenant_id
      if (tenantId) break
    }
  }

  if (!tenantId) {
    alert('Tenant ID konnte nicht geladen werden. Bitte melden Sie sich ab und erneut an.')
    return
  }

  try {
    if (editingPendency.value) {
      await updatePendency(editingPendency.value.id, {
        ...formData.value,
        updated_at: new Date().toISOString()
      } as any)
    } else {
      await createPendency({
        ...formData.value,
        tenant_id: tenantId
      } as any)
    }
    closeModals()
  } catch (err) {
    console.error('Error saving pendency:', err)
    alert('Fehler beim Speichern der Pendenz')
  }
}

const deletePendencyConfirm = async () => {
  if (editingPendency.value && confirm('Sind Sie sicher, dass Sie diese Pendenz löschen möchten?')) {
    try {
      await deletePendency(editingPendency.value.id)
      closeModals()
    } catch (err) {
      console.error('Error deleting pendency:', err)
      alert('Fehler beim Löschen der Pendenz')
    }
  }
}

const resetForm = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)
  
  formData.value = {
    title: '',
    description: '',
    status: 'pendent',
    priority: 'mittel',
    category: 'sonstiges',
    due_date: tomorrow.toISOString(),
    recurrence_type: 'keine',
    notes: ''
  }
}

const closeModals = () => {
  showNewModal.value = false
  showEditModal.value = false
  editingPendency.value = null
  resetForm()
}

// Watch for new modal
watch(() => showNewModal.value, (newVal) => {
  if (newVal && !editingPendency.value) {
    showEditModal.value = true
  }
})

// Format ISO datetime to datetime-local format (yyyy-MM-ddThh:mm)
const formatDatetimeLocal = (dateString: any) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

// Format ISO datetime to date format (yyyy-MM-dd)
const formatDateLocal = (dateString: any) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

import { watch } from 'vue'
</script>

