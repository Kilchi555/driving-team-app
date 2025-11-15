<template>
  <div class="bg-white rounded-lg shadow border">
    <!-- Header -->
    <div class="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">📋 Pendenzen</h2>
        <p class="text-sm text-gray-600 mt-1">{{ totalCount }} Aufgaben · {{ pendentCount }} pendent · {{ overdueCount }} überfällig</p>
      </div>
      <button
        @click="showNewModal = true"
        class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        + Neue Pendenz
      </button>
    </div>

    <!-- Status Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 border-b border-gray-200">
      <div class="bg-blue-50 rounded-lg p-3 text-center">
        <div class="text-2xl font-bold text-blue-600">{{ pendentCount }}</div>
        <div class="text-xs text-gray-600 mt-1">Pendent</div>
      </div>
      <div class="bg-red-50 rounded-lg p-3 text-center">
        <div class="text-2xl font-bold text-red-600">{{ overdueCount }}</div>
        <div class="text-xs text-gray-600 mt-1">Überfällig</div>
      </div>
      <div class="bg-yellow-50 rounded-lg p-3 text-center">
        <div class="text-2xl font-bold text-yellow-600">{{ inProgressCount }}</div>
        <div class="text-xs text-gray-600 mt-1">In Bearbeitung</div>
      </div>
      <div class="bg-green-50 rounded-lg p-3 text-center">
        <div class="text-2xl font-bold text-green-600">{{ completedCount }}</div>
        <div class="text-xs text-gray-600 mt-1">Abgeschlossen</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="px-4 sm:px-6 py-3 border-b border-gray-200 flex flex-wrap gap-2">
      <button
        v-for="status in ['pendent', 'überfällig', 'in_bearbeitung', 'abgeschlossen']"
        :key="status"
        @click="selectedStatus = selectedStatus === status ? null : status"
        :class="[
          'px-3 py-1 rounded-full text-sm font-medium transition',
          selectedStatus === status
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        {{ getStatusLabel(status) }}
      </button>
    </div>

    <!-- Pendencies List -->
    <div class="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
      <div
        v-for="pendency in filteredPendencies"
        :key="pendency.id"
        @click="editingPendency = pendency; showEditModal = true"
        class="p-4 hover:bg-gray-50 cursor-pointer transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span :class="['px-2 py-1 rounded text-xs font-medium', getStatusClass(pendency.status)]">
                {{ getStatusLabel(pendency.status) }}
              </span>
              <span :class="['px-2 py-1 rounded text-xs font-medium', getPriorityClass(pendency.priority)]">
                {{ pendency.priority }}
              </span>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {{ pendency.category }}
              </span>
            </div>
            <h3 class="font-medium text-gray-900 truncate">{{ pendency.title }}</h3>
            <p v-if="pendency.description" class="text-sm text-gray-600 truncate mt-1">{{ pendency.description }}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>📅 {{ formatDate(pendency.due_date) }}</span>
              <span v-if="pendency.assigned_to">👤 {{ pendency.assigned_to }}</span>
              <span v-if="pendency.recurrence_type !== 'keine'">🔄 {{ pendency.recurrence_type }}</span>
            </div>
          </div>
          <button
            @click.stop="toggleStatus(pendency)"
            class="px-3 py-1 rounded border border-gray-300 hover:border-gray-400 text-xs font-medium whitespace-nowrap"
          >
            {{ getNextStatusLabel(pendency.status) }}
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPendencies.length === 0" class="p-8 text-center text-gray-500">
        <p>Keine Pendenzen found</p>
      </div>
    </div>

    <!-- New/Edit Modal -->
    <div v-if="showNewModal || showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 class="text-lg font-semibold">{{ editingPendency ? 'Pendenz bearbeiten' : 'Neue Pendenz' }}</h3>
          <button @click="closeModals" class="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. Rechnungsprüfung durchführen"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              v-model="formData.description"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Weitere Details..."
            ></textarea>
          </div>

          <!-- Grid: Priority, Category, Status -->
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
              <select v-model="formData.priority" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="niedrig">Niedrig</option>
                <option value="mittel">Mittel</option>
                <option value="hoch">Hoch</option>
                <option value="kritisch">Kritisch</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select v-model="formData.category" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="system">System</option>
                <option value="zahlung">Zahlung</option>
                <option value="marketing">Marketing</option>
                <option value="personal">Personal</option>
                <option value="buchung">Buchung</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select v-model="formData.status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="pendent">Pendent</option>
                <option value="in_bearbeitung">In Bearbeitung</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select>
            </div>
          </div>

          <!-- Due Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fällig am *</label>
            <input
              v-model="formData.due_date"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <!-- Recurrence -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Wiederholung</label>
              <select v-model="formData.recurrence_type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="keine">Keine</option>
                <option value="täglich">Täglich</option>
                <option value="wöchentlich">Wöchentlich</option>
                <option value="monatlich">Monatlich</option>
                <option value="jährlich">Jährlich</option>
              </select>
            </div>

            <div v-if="formData.recurrence_type !== 'keine'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Wiederholung endet am</label>
              <input
                v-model="formData.recurrence_end_date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea
              v-model="formData.notes"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="2"
              placeholder="Interne Notizen..."
            ></textarea>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-gray-50">
          <button
            @click="closeModals"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Abbrechen
          </button>
          <button
            v-if="editingPendency"
            @click="deletePendencyConfirm"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Löschen
          </button>
          <button
            @click="savePendency"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePendencies, type Pendency } from '~/composables/usePendencies'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { formatDate } from '~/utils/dateUtils'

const { currentUser } = useCurrentUser()
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

const totalCount = computed(() => pendencies.value.length)

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
  if (!currentUser.value?.tenant_id || !formData.value.title || !formData.value.due_date) {
    alert('Bitte füllen Sie alle erforderlichen Felder aus')
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
        tenant_id: currentUser.value.tenant_id
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

const closeModals = () => {
  showNewModal.value = false
  showEditModal.value = false
  editingPendency.value = null
  formData.value = {
    title: '',
    description: '',
    status: 'pendent',
    priority: 'mittel',
    category: 'sonstiges',
    due_date: new Date().toISOString(),
    recurrence_type: 'keine',
    notes: ''
  }
}

// Watch for new modal
watch(() => showNewModal.value, (newVal) => {
  if (newVal && !editingPendency.value) {
    showEditModal.value = true
  }
})

import { watch } from 'vue'
</script>

