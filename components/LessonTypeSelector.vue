<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-2">
    <label class="block text-sm font-semibold text-gray-900 mb-2">
      🎯 Terminart
    </label>

    <template v-if="showButtons">
      <!-- Kostenpflichtige Typen als Dropdown — Fallback sofort, dynamisch beim ersten Öffnen -->
      <div>
        <select
          v-model="selectedPaidCode"
          @focus="onDropdownFocus"
          @change="onSelectPaid()"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
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

import { ref, watch, computed } from 'vue'
import { useEventTypes } from '~/composables/useEventTypes'
import { logger } from '~/utils/logger'

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
const selectedPaidCode = ref<string>(props.selectedType || 'lesson')
const isLoadingDynamic = ref(false)
const dynamicLoaded = ref(false)

// Hardcoded Fallback-Typen — sofort sichtbar, kein Warten
const fallbackTypes: LessonType[] = [
  { code: 'lesson', name: 'Fahrlektion', emoji: '🚗', require_payment: true },
  { code: 'exam', name: 'Prüfung', emoji: '📋', require_payment: true },
  { code: 'theory', name: 'Theorie', emoji: '📚', require_payment: true },
]
const eventTypes = ref<LessonType[]>([...fallbackTypes])
const paidEventTypes = computed(() => eventTypes.value.filter((et: any) => et.require_payment))

const { loadEventTypes } = useEventTypes()

// Lazy load: erst wenn Dropdown geöffnet wird
const onDropdownFocus = async () => {
  if (dynamicLoaded.value || isLoadingDynamic.value) return
  isLoadingDynamic.value = true
  try {
    const data = await loadEventTypes([], true) as LessonType[]
    if (data && data.length > 0) {
      eventTypes.value = data
      // Falls geladener Typ nicht mehr im aktuellen selectedPaidCode → beibehalten
      logger.debug('✅ LessonTypeSelector: dynamic types loaded:', data.map(e => e.code))
    }
    dynamicLoaded.value = true
  } catch (err) {
    logger.debug('⚠️ LessonTypeSelector: dynamic load failed, keeping fallback')
  } finally {
    isLoadingDynamic.value = false
  }
}

// Methods
const selectLessonType = (lessonType: LessonType) => {
  logger.debug('🎯 Lesson type selected:', lessonType)
  selectedType.value = lessonType.code
  emit('lesson-type-selected', lessonType)
  emit('update:modelValue', lessonType.code)
}

const getSelectedLessonTypeName = () => {
  const lessonType = eventTypes.value.find(t => t.code === selectedType.value)
  return lessonType ? lessonType.name : selectedType.value || 'Unbekannt'
}

// Watch for prop changes
watch(() => props.selectedType, (newType) => {
  if (newType) {
    selectedType.value = newType
    selectedPaidCode.value = newType
    logger.debug('✅ LessonTypeSelector: updated to:', newType)
  }
}, { immediate: true })

const onSelectPaid = () => {
  const et = paidEventTypes.value.find(e => e.code === selectedPaidCode.value)
  if (et) selectLessonType(et)
}
</script>