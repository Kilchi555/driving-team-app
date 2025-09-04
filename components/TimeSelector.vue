<!-- TimeSelector.vue -->
<template>
  <div v-if="shouldShow" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Datum -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          📅 Datum
        </label>
        <input
          :value="startDate"
          @input="updateStartDate(($event.target as HTMLInputElement)?.value || '')"
          type="date"
          :min="minDate"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          :disabled="disabled"
        />
      </div>

      <!-- Startzeit -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          🕐 Startzeit
        </label>
        <input
          :value="startTime"
          @input="updateStartTime(($event.target as HTMLInputElement)?.value || '')"
          type="time"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          :disabled="disabled"
        />
      </div>

      <!-- Endzeit -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          🕐 Endzeit
        </label>
        <input
          :value="endTime"
          @input="updateEndTime(($event.target as HTMLInputElement)?.value || '')"
          type="time"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          :disabled="disabled"
        />
          <div v-if="durationMinutes" class="text-xs text-gray-500 mt-1">
          Dauer: {{ durationMinutes }} Minuten
        </div>
      </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { toLocalTimeString } from '~/utils/dateUtils'

interface Props {
  startDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  disabled?: boolean
  eventType?: 'lesson' | 'staff_meeting' | 'other'
  selectedStudent?: any
  selectedSpecialType?: string
  mode?: 'create' | 'edit' | 'view'
}

interface Emits {
  (e: 'update:startDate', value: string): void
  (e: 'update:startTime', value: string): void
  (e: 'update:endTime', value: string): void
  (e: 'time-changed', data: { startDate: string, startTime: string, endTime: string, durationMinutes?: number }): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  eventType: 'lesson',
  mode: 'create'
})

const emit = defineEmits<Emits>()

// Computed Properties
const shouldShow = computed(() => {
  if (props.eventType === 'lesson') {
    return !!props.selectedStudent
  } else {
    return !!props.selectedSpecialType
  }
})

const minDate = computed(() => {
  const today = new Date()
  return toLocalTimeString(today).split('T')[0]
})

const suggestedTimes = computed(() => {
  if (props.disabled || !props.startDate) return []
  
  // Standard Fahrstunden-Zeiten
  if (props.eventType === 'lesson') {
    return ['08:00', '10:00', '13:00', '15:00', '17:00', '19:00']
  }
  
  // Für Staff Meetings
  if (props.eventType === 'staff_meeting') {
    return ['09:00', '11:00', '14:00', '16:00']
  }
  
  // Für andere Terminarten
  return ['09:00', '11:00', '14:00', '16:00', '18:00']
})

// Methods
const updateStartDate = (value: string) => {
  emit('update:startDate', value)
  calculateEndTime(value, props.startTime)
}

const updateStartTime = (value: string) => {
  emit('update:startTime', value)
  calculateEndTime(props.startDate, value)
}

const calculateEndTime = (date: string, time: string) => {
  if (!date || !time || !props.durationMinutes) return
  
  const [hours, minutes] = time.split(':').map(Number)
  const startDate = new Date(`${date}T${time}`)
  
  const endDate = new Date(startDate.getTime() + props.durationMinutes * 60000)
  const endTime = endDate.toTimeString().slice(0, 5)
  
  emit('update:endTime', endTime)
  emit('time-changed', {
    startDate: date,
    startTime: time,
    endTime: endTime
  })
}

const updateEndTime = (value: string) => {
  emit('update:endTime', value)
  
  // Berechne neue Dauer basierend auf Start- und Endzeit
  if (props.startDate && props.startTime && value) {
    const startDateTime = new Date(`${props.startDate}T${props.startTime}`)
    const endDateTime = new Date(`${props.startDate}T${value}`)
    
    const durationMs = endDateTime.getTime() - startDateTime.getTime()
    const newDurationMinutes = Math.round(durationMs / (1000 * 60))
    
    if (newDurationMinutes > 0) {
      // Emittiere time-changed mit der neuen Dauer
      emit('time-changed', {
        startDate: props.startDate,
        startTime: props.startTime,
        endTime: value
      })
    }
  }
}

const selectSuggestedTime = (time: string) => {
  updateStartTime(time)
}

// Watchers
watch(() => props.durationMinutes, () => {
  if (props.startDate && props.startTime) {
    calculateEndTime(props.startDate, props.startTime)
  }
})

// Expose für Parent-Component
defineExpose({
  calculateEndTime,
  suggestedTimes
})
</script>

<style scoped>
input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}
</style>