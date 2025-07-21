<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-2">
    <label class="block text-sm font-semibold text-gray-900 mb-2">
      🎯 Terminart auswählen
    </label>
    
    <!-- Lesson Types Grid -->
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="lessonType in lessonTypes"
        :key="lessonType.code"
        @click="selectLessonType(lessonType)"
        :class="[
          'p-2 text-sm rounded border text-center transition-colors duration-200',
          selectedType === lessonType.code
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ lessonType.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

// Types
interface LessonType {
  code: string
  name: string
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
    description: 'Reguläre Fahrstunde'
  },
  {
    code: 'exam',
    name: 'Prüfung',
    description: 'Praktische Fahrprüfung'
  },
  {
    code: 'theory',
    name: 'Theorie',
    description: 'Theorieunterricht'
  }
])

// Methods
const selectLessonType = (lessonType: LessonType) => {
  console.log('🎯 Lesson type selected:', lessonType)
  
  // ✅ FIX: selectedType aktualisieren
  selectedType.value = lessonType.code
  
  emit('lesson-type-selected', lessonType)
  emit('update:modelValue', lessonType.code)
}

// ✅ Watch for prop changes
watch(() => props.selectedType, (newType) => {
  if (newType) {
    selectedType.value = newType
  }
}, { immediate: true })

// Initialize
onMounted(() => {
  // ✅ Auto-select "lesson" als Default falls nicht gesetzt
  if (!selectedType.value) {
    const defaultType = lessonTypes.value.find(t => t.code === 'lesson')
    if (defaultType) {
      selectLessonType(defaultType)
    }
  }
})
</script>