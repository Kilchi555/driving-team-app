<!-- components/PendenzenModal.vue - Neue Datei erstellen -->
<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>
    
    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h2 class="text-xl font-bold text-gray-900">
          Offene Bewertungen ({{ pendingTasks.length }})
        </h2>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[70vh]">
        <!-- Loading -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p class="mt-2 text-gray-600">Lade Pendenzen...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="pendingTasks.length === 0" class="text-center py-8">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine offenen Bewertungen!</h3>
          <p class="text-gray-600">Alle Termine sind bewertet und kommentiert.</p>
        </div>

        <!-- Pending Tasks List -->
        <div v-else class="space-y-4">
          <div 
            v-for="task in pendingTasks" 
            :key="task.id"
            class="border rounded-lg p-4 bg-gray-50"
          >
            <!-- Task Header -->
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="font-semibold text-gray-900">
                  {{ task.users?.first_name }} {{ task.users?.last_name }}
                </h3>
                <p class="text-sm text-gray-600">{{ task.title }}</p>
                <p class="text-xs text-gray-500">
                  {{ formatDate(task.start_time) }} - {{ formatTime(task.start_time) }} bis {{ formatTime(task.end_time) }}
                </p>
              </div>
              <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                Offen
              </span>
            </div>

            <!-- Rating Form -->
            <div class="space-y-3">
              <!-- Rating -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Bewertung (1-6 Skala)
                </label>
                <div class="flex gap-1">
                  <button
                    v-for="rating in 6"
                    :key="rating"
                    @click="setRating(task.id, rating)"
                    :class="[
                      'w-8 h-8 rounded-full text-sm font-bold transition-colors',
                      getRating(task.id) >= rating 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    {{ rating }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  1=besprochen, 2=geübt, 3=ungenügend, 4=genügend, 5=gut, 6=prüfungsreif
                </p>
              </div>

              <!-- Note -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Notizen
                </label>
                <textarea
                  v-model="taskNotes[task.id]"
                  rows="3"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Notizen zur Fahrstunde..."
                ></textarea>
              </div>

              <!-- Save Button -->
              <div class="flex justify-end">
                <button
                  @click="saveTask(task)"
                  :disabled="!canSave(task.id)"
                  :class="[
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    canSave(task.id)
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  ]"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePendingTasks } from '~/composables/usePendingTasks'

interface Props {
  show: boolean
}

defineProps<Props>()

defineEmits<{
  close: []
}>()

const { pendingTasks, isLoading, markAsCompleted } = usePendingTasks()

const taskRatings = ref<Record<string, number>>({})
const taskNotes = ref<Record<string, string>>({})

const canSave = (taskId: string) => {
  return taskRatings.value[taskId] && taskNotes.value[taskId]?.trim()
}

const setRating = (taskId: string, rating: number) => {
  taskRatings.value[taskId] = rating
}

const getRating = (taskId: string) => {
  return taskRatings.value[taskId] || 0
}

const saveTask = async (task: any) => {
  try {
    await markAsCompleted(
      task.id,
      taskRatings.value[task.id],
      taskNotes.value[task.id]
    )
    
    delete taskRatings.value[task.id]
    delete taskNotes.value[task.id]
    
  } catch (error) {
    console.error('Fehler beim Speichern:', error)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('de-CH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>