<template>
  <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
    <!-- Header mit Zurück-Button -->
    <div class="flex justify-between items-center mb-3">
      <label class="block text-sm font-semibold text-gray-900">
        📋 {{ get('label_event_type_header', 'Terminart') }}
      </label>
      <button
        v-if="showBackButton"
        @click="$emit('back-to-student')"
        class="text-md text-purple-600 hover:text-purple-800 text-bold"
      >
        ← Zurück
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
      <p class="text-sm text-gray-600">Terminarten werden geladen...</p>
    </div>

    <!-- Event Types Grid -->
    <div v-else class="space-y-3 mb-4">
      <!-- No paid dropdown here by design -->

      <!-- Free types -->
      <div>
        <div class="text-xs font-semibold text-gray-500 mb-1">{{ get('label_free_event_types', 'Andere Terminarten') }}</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="eventType in freeEventTypes" 
            :key="'free-' + eventType.code"
            @click="selectEventType(eventType)"
            :disabled="!showBackButton"
            :class="[
              'p-3 text-sm rounded border text-left transition-colors duration-200',
              selectedType === eventType.code
                ? 'bg-purple-600 text-black border-purple-600'
                : showBackButton
                  ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            ]"
          >
            {{ eventType.emoji }} {{ eventType.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && eventTypes.length === 0" class="text-center py-4">
      <p class="text-sm text-gray-500">Keine Terminarten verfügbar</p>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useEventTypes } from '~/composables/useEventTypes'
import { useUILabels } from '~/composables/useUILabels'

// Types
interface EventType {
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number
  default_color?: string
  auto_generate_title?: boolean
  price_per_minute?: number
}

// Props
interface Props {
  selectedType?: string | null
  autoLoad?: boolean
  showBackButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: null,
  autoLoad: true,
  showBackButton: true
})

// Emits
const emit = defineEmits<{
  'event-type-selected': [eventType: EventType]
  'back-to-student': []
}>()

// State
const eventTypes = ref<EventType[]>([])
const freeEventTypes = computed(() => eventTypes.value.filter((et: any) => !et.require_payment))
const isLoading = ref(false)
const selectedPaidCode = ref<string>('')

// Methods
const { loadEventTypes: loadEventTypesFromComposable } = useEventTypes()
const { get, load: loadUILabels } = useUILabels()

// EventTypeSelector.vue
const loadEventTypes = async (excludeTypes: string[] = []) => {
  isLoading.value = true
  try {
    // ✅ Jetzt mit Parametern aufrufen
    const data = await loadEventTypesFromComposable(excludeTypes, true)
    eventTypes.value = data
  } finally {
    isLoading.value = false
  }
}

const selectEventType = (eventType: EventType) => {
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (!props.showBackButton) {
    logger.debug('🚫 Cannot change event type for past appointment')
    return
  }
  
  try {
    logger.debug('📋 Selecting event type:', eventType)
    // Sichere Checks
    if (!eventType || !eventType.code) {
      console.error('❌ Invalid event type:', eventType)
      return
    }
    
    logger.debug('✅ Event type selected successfully:', {
      code: eventType.code,
      name: eventType.name,
      duration: eventType.default_duration_minutes
    })
    
    emit('event-type-selected', eventType)
  } catch (error) {
    console.error('❌ Error in selectEventType:', error)
  }
}

// removed paid selection logic for this component

// Lifecycle
onMounted(() => {
  if (props.autoLoad) {
    loadEventTypes(['exam', 'theorie']) // ✅ Diese rausfiltern
  }
  loadUILabels()
})

// Expose methods for manual loading
defineExpose({
  loadEventTypes
})
</script>