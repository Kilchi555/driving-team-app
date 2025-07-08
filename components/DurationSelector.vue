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
import { useStaffCategoryDurations } from '~/composables/useStaffCategoryDurations'

interface Props {
  modelValue: number
  selectedCategory?: any
  currentUser?: any
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
  showDebugInfo: false
})

const emit = defineEmits<Emits>()

// Composable verwenden
const {
  formattedDurations,
  isLoading,
  error,
  loadStaffCategoryDurations,
  getDefaultDuration
} = useStaffCategoryDurations()

// Computed
const totalPrice = computed(() => {
  return props.modelValue * props.pricePerMinute
})

// Methods
const selectDuration = (duration: number) => {
  console.log('🔄 Duration selected:', duration)
  emit('update:modelValue', duration)
  emit('duration-changed', duration)
}

// Watchers
watch(() => props.selectedCategory, async (newCategory, oldCategory) => {
  console.log('🔄 DurationSelector - Category watcher triggered:', {
    old: oldCategory?.code,
    new: newCategory?.code,
    userId: props.currentUser?.id
  })
  
  if (newCategory && props.currentUser?.id) {
    console.log('🚗 Loading durations for staff + category:', {
      staffId: props.currentUser.id,
      categoryCode: newCategory.code
    })
    
    try {
      // Lade spezifische Dauern für Staff + Kategorie
      await loadStaffCategoryDurations(props.currentUser.id, newCategory.code)
      
      const defaultDuration = getDefaultDuration()
      console.log('🎯 Setting default duration:', defaultDuration)
      
      if (defaultDuration && defaultDuration !== props.modelValue) {
        emit('update:modelValue', defaultDuration)
        emit('duration-changed', defaultDuration)
      }
    } catch (error) {
      console.error('❌ Error loading durations:', error)
    }
  }
}, { immediate: true })

// User change watcher
watch(() => props.currentUser?.id, async (newUserId, oldUserId) => {
  console.log('🔄 DurationSelector - User watcher triggered:', {
    old: oldUserId,
    new: newUserId,
    categoryCode: props.selectedCategory?.code
  })
  
  if (newUserId && props.selectedCategory?.code) {
    await loadStaffCategoryDurations(newUserId, props.selectedCategory.code)
  }
})
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