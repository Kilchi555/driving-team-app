<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-2">
    <label class="block text-sm font-semibold text-gray-900 mb-2">
      🎯 Terminart
    </label>

    <template v-if="showButtons">
      <!-- Nur kostenpflichtige Typen als Dropdown -->
      <div>
        <div class="text-xs font-semibold text-gray-500 mb-1">Kostenpflichtig</div>
        <select
          v-model="selectedPaidCode"
          @change="onSelectPaid()"
          :disabled="paidEventTypes.length === 0"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
        >
          <option value="" disabled>Bitte wählen</option>
          <option v-for="eventType in paidEventTypes" :key="'paid-opt-' + eventType.code" :value="eventType.code">
            {{ eventType.emoji }} {{ eventType.name }}
          </option>
        </select>
      </div>
    </template>

    <!-- Read-only display for past appointments -->
    <div v-else class="p-2 text-sm text-gray-600 bg-gray-100 rounded border">
      {{ getSelectedLessonTypeName() }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, onMounted, watch, computed } from 'vue'
import { useEventTypes } from '~/composables/useEventTypes'

// Types
interface LessonType {
  code: string
  name: string
  description?: string
  emoji?: string
  require_payment?: boolean
}

interface Props {
  selectedType?: string
  disabled?: boolean
  showButtons?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: 'lesson',
  disabled: false,
  showButtons: true
})

const emit = defineEmits<{
  'lesson-type-selected': [lessonType: LessonType]
  'update:modelValue': [code: string]
}>()

// State
const selectedType = ref(props.selectedType)

// Event types
const eventTypes = ref<LessonType[]>([])
const paidEventTypes = computed(() => eventTypes.value.filter((et: any) => et.require_payment))
const freeEventTypes = computed(() => eventTypes.value.filter((et: any) => !et.require_payment))
const selectedPaidCode = ref<string>('')
const { loadEventTypes } = useEventTypes()

// Methods
const selectLessonType = (lessonType: LessonType) => {
  logger.debug('🎯 Lesson type selected:', lessonType)
  
  // ✅ FIX: selectedType aktualisieren
  selectedType.value = lessonType.code
  
  emit('lesson-type-selected', lessonType)
  emit('update:modelValue', lessonType.code)
}

const getSelectedLessonTypeName = () => {
  const lessonType = eventTypes.value.find(t => t.code === selectedType.value)
  return lessonType ? lessonType.name : 'Unbekannt'
}

// ✅ Watch for prop changes
watch(() => props.selectedType, (newType, oldType) => {
  logger.debug('🎯 LessonTypeSelector: selectedType prop changed:', {
    from: oldType,
    to: newType,
    will_update_internal: !!newType
  })
  if (newType) {
    selectedType.value = newType
    // ✅ WICHTIG: Auch selectedPaidCode synchronisieren für das Select-Element
    selectedPaidCode.value = newType
    logger.debug('✅ LessonTypeSelector: internal selectedType updated to:', selectedType.value, 'selectedPaidCode:', selectedPaidCode.value)
  }
}, { immediate: true })

// Initialize
onMounted(async () => {
  const data = await loadEventTypes([], true)
  eventTypes.value = data as any
})

const onSelectPaid = () => {
  const et: any = paidEventTypes.value.find(e => e.code === selectedPaidCode.value)
  if (et) selectLessonType(et)
}
</script>