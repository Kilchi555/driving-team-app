<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <label class="block text-sm font-semibold text-gray-900 mb-3">
      🎯 Terminart auswählen
    </label>

    <!-- Lesson Types Grid -->
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="lessonType in lessonTypes" 
        :key="lessonType.code"
        @click="selectLessonType(lessonType)"
        :class="[
          'p-3 text-sm rounded border text-left transition-colors duration-200',
          selectedType === lessonType.code
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ lessonType.emoji }} {{ lessonType.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Types
interface LessonType {
  code: string
  name: string
  emoji: string
  description?: string
}

interface Props {
  selectedType?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: 'lesson',
  disabled: false
})

const emit = defineEmits<{
  'lesson-type-selected': [lessonType: LessonType]
  'update:modelValue': [code: string]
}>()

// State
const selectedType = ref(props.selectedType)

// Lesson Types Data
const lessonTypes = ref<LessonType[]>([
  {
    code: 'lesson',
    name: 'Fahrstunde',
    emoji: '🚗',
    description: 'Reguläre Fahrstunde'
  },
  {
    code: 'exam',
    name: 'Prüfung',
    emoji: '📝',
    description: 'Praktische Fahrprüfung'
  },
  {
    code: 'theory',
    name: 'Theorie',
    emoji: '📚',
    description: 'Theorieunterricht'
  },
  {
    code: 'meeting',
    name: 'Besprechung',
    emoji: '💬',
    description: 'Besprechung mit Schüler'
  }
])

// Methods
const selectLessonType = (lessonType: LessonType) => {
  if (props.disabled) return
  
  selectedType.value = lessonType.code
  
  console.log('🎯 Lesson type selected:', lessonType.name)
  
  emit('lesson-type-selected', lessonType)
  emit('update:modelValue', lessonType.code)
}

// Initialize
onMounted(() => {
  // Auto-select default lesson type
  const defaultType = lessonTypes.value.find(t => t.code === props.selectedType)
  if (defaultType) {
    selectLessonType(defaultType)
  }
})
</script>