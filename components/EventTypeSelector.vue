<template>
  <div class="rounded-xl p-4 border" :style="{ ...primaryBgLight, borderColor: 'color-mix(in srgb, var(--color-primary, #111827) 20%, transparent)' }">
    <!-- Header mit Zurück-Button -->
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm font-semibold text-gray-900">{{ get('label_event_type_header', 'Terminart wählen') }}</span>
      <button
        v-if="showBackButton"
        @click="$emit('back-to-student')"
        class="flex items-center gap-1 text-sm font-medium hover:opacity-75 transition-opacity"
        :style="primaryText"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Zurück
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center gap-3 py-6">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2" :style="primaryBorder"></div>
      <p class="text-sm text-gray-500">Terminarten werden geladen...</p>
    </div>

    <!-- Event Types Grid -->
    <div v-else class="grid grid-cols-2 gap-2">
      <button
        v-for="eventType in freeEventTypes"
        :key="'free-' + eventType.code"
        @click="selectEventType(eventType)"
        :disabled="!showBackButton"
        class="p-3 text-sm rounded-xl border text-center transition-all duration-200 font-medium"
        :style="selectedType === eventType.code ? { ...primaryBg } : {}"
        :class="[
          selectedType === eventType.code
            ? 'shadow-sm'
            : showBackButton
              ? 'bg-white text-gray-700 border-gray-200 hover:shadow-sm'
              : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
        ]"
      >
        {{ eventType.name }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && eventTypes.length === 0" class="text-center py-6">
      <p class="text-sm text-gray-400">Keine Terminarten verfügbar</p>
    </div>
  </div>
</template>

<script setup lang="ts">

import { logger } from '~/utils/logger'
import { ref, onMounted } from 'vue'
import { useEventTypes } from '~/composables/useEventTypes'
import { useUILabels } from '~/composables/useUILabels'
const { primaryBg, primaryText, primaryBgLight, primaryBorder } = usePrimaryColor()

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