<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2 mt-2">
     ⏱️ Dauer
    </label>
    
    <div class="grid grid-cols-4 gap-2" v-if="!isLoading">
      <button
        v-for="duration in formattedDurations"
        :key="duration.value"
        @click="selectDuration(duration.value)"
        :class="[
          'p-2 text-sm rounded border transition-colors',
          modelValue === duration.value
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ duration.label }}
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-4 gap-2">
      <div v-for="i in 4" :key="i" class="p-2 bg-gray-200 rounded animate-pulse h-10"></div>
    </div>
    
    <!-- Hinweis wenn keine Dauern verfügbar -->
    <div v-if="!isLoading && formattedDurations.length === 0" class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
      ⚠️ Keine Lektionsdauern für diese Kategorie konfiguriert. 
      <br>Bitte in den Profileinstellungen Dauern hinzufügen.
    </div>
    
    <!-- Error State -->
    <div v-if="error" class="mt-2 text-red-600 text-sm">
      ❌ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDurationManager } from '~/composables/useDurationManager' 

interface Props {
  modelValue: number
  selectedCategory?: any
  currentUser?: any
  availableDurations?: number[]  
  pricePerMinute?: number
  adminFee?: number
  showDebugInfo?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: number): void
  (e: 'duration-changed', duration: number): void
}

const props = withDefaults(defineProps<Props>(), {
  pricePerMinute: 0,
  adminFee: 0,
  availableDurations: () => [],
  showDebugInfo: false
})

const emit = defineEmits<Emits>()

const {
  isLoading,
  error,
  loadStaffDurations,  
  getDefaultDuration
} = useDurationManager()

// Computed
const totalPrice = computed(() => {
  return props.modelValue * props.pricePerMinute
})

const formattedDurations = computed(() => {
  // ✅ Verwende Props-Dauern falls verfügbar, sonst Composable
  const durations = props.availableDurations?.length > 0 
    ? props.availableDurations 
    : [] // Fallback auf leer

  console.log('🎯 DurationSelector - Using durations from props:', durations)
  
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
})

// Methods
const selectDuration = (duration: number) => {
  console.log('🔄 Duration selected:', duration)
  emit('update:modelValue', duration)
  emit('duration-changed', duration)
}

// Watchers
watch(() => props.availableDurations, (newDurations) => {
  console.log('🔄 DurationSelector - Available durations changed:', newDurations)
  
  // Nur prüfen ob aktuelle Auswahl noch gültig ist
  if (newDurations.length > 0 && !newDurations.includes(props.modelValue)) {
    console.log('⏱️ Auto-setting duration to first available:', newDurations[0])
    emit('update:modelValue', newDurations[0])
    emit('duration-changed', newDurations[0])
  }
}, { immediate: true })
</script>

<style scoped>
/* Animations für smooth transitions */
.duration-button {
  transition: all 0.2s ease-in-out;
}

.duration-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Grid responsiveness */
@media (max-width: 640px) {
  .duration-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>