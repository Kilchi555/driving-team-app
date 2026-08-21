<template>
  <div class="topic-note-picker">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1.5">{{ label }}</label>

    <div v-if="!disabled" class="relative" ref="rootRef">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          v-model="searchQuery"
          @focus="showDropdown = true"
          @input="showDropdown = true"
          type="text"
          :placeholder="placeholder"
          class="w-full pl-9 pr-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style="--tw-ring-color: var(--color-primary, #111827); padding-left: 2.25rem !important; padding-top: 0.625rem !important; padding-bottom: 0.625rem !important; padding-right: 0.5rem !important;"
        >
      </div>

      <div
        v-if="showDropdown && filteredCriteria.length > 0"
        class="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-50 max-h-72 overflow-y-auto"
      >
        <template v-for="(items, categoryName) in groupedCriteria" :key="categoryName">
          <div class="px-3 py-1.5 border-b" :style="{ background: 'color-mix(in srgb, var(--color-primary, #111827) 8%, white)', borderColor: 'color-mix(in srgb, var(--color-primary, #111827) 20%, white)' }">
            <h4 class="text-xs font-bold uppercase tracking-wide" :style="primaryText">{{ categoryName }}</h4>
          </div>
          <div
            v-for="criteria in items"
            :key="criteria.id"
            @click="selectCriteria(criteria)"
            class="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between gap-2"
          >
            <span class="text-sm text-gray-900 leading-tight">{{ criteria.name }}</span>
            <span v-if="isSelected(criteria.id)" class="text-xs font-medium flex-shrink-0" :style="primaryText">✓ ausgewählt</span>
          </div>
        </template>
      </div>

      <p v-if="!isLoading && allCriteria.length === 0" class="text-xs text-gray-400 mt-1.5">
        Keine Themen konfiguriert.
      </p>
    </div>

    <div v-if="localTopics.length > 0" class="mt-2 space-y-2">
      <div
        v-for="topic in localTopics"
        :key="topic.evaluation_criteria_id"
        class="bg-gray-50 rounded-lg p-2.5 border border-gray-200"
      >
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <h4 class="text-sm font-medium text-gray-900 leading-snug">
            {{ getCriteriaName(topic.evaluation_criteria_id) }}
          </h4>
          <button
            v-if="!disabled"
            type="button"
            @click="removeTopic(topic.evaluation_criteria_id)"
            class="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <textarea
          v-if="!disabled"
          v-model="topic.note"
          @input="emitUpdate"
          placeholder="Notiz optional"
          class="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:border-transparent resize-none"
          style="--tw-ring-color: var(--color-primary, #111827);"
          rows="1"
        ></textarea>
        <p v-else-if="topic.note" class="text-sm text-gray-600">{{ topic.note }}</p>
      </div>
    </div>

    <p v-else-if="disabled" class="text-sm text-gray-400 italic">Keine Themen vorgemerkt.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { logger } from '~/utils/logger'

export interface PlannedTopic {
  evaluation_criteria_id: string
  note: string
}

interface Criteria {
  id: string
  name: string
  category_id?: string
  driving_categories?: string[]
  evaluation_categories?: { name: string; display_order?: number }[] | { name: string; display_order?: number }
}

interface Props {
  modelValue: PlannedTopic[]
  studentCategory?: string
  isTheoryLesson?: boolean
  label?: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  studentCategory: '',
  isTheoryLesson: false,
  label: '',
  placeholder: 'Thema suchen und vormerken…',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: PlannedTopic[]]
}>()

const rootRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const showDropdown = ref(false)
const isLoading = ref(false)
const allCriteria = ref<Criteria[]>([])
const localTopics = ref<PlannedTopic[]>((props.modelValue || []).map(t => ({ ...t })))

const { primaryText } = usePrimaryColor()

watch(() => props.modelValue, (nv) => {
  const incoming = nv || []
  // Only re-sync when the parent replaces the list wholesale (e.g. after loading
  // existing data) — avoids clobbering in-progress note edits on every keystroke.
  const sameIds = incoming.length === localTopics.value.length &&
    incoming.every(t => localTopics.value.some(l => l.evaluation_criteria_id === t.evaluation_criteria_id))
  if (!sameIds) {
    localTopics.value = incoming.map(t => ({ ...t }))
  }
})

const loadCriteria = async () => {
  isLoading.value = true
  try {
    const response = await $fetch<{ success: boolean; criteria: any[] }>('/api/staff/get-evaluation-criteria', {
      query: {
        isTheoryLesson: String(props.isTheoryLesson),
        studentCategory: props.studentCategory || '',
      },
    })
    allCriteria.value = response?.criteria || []
  } catch (err: any) {
    logger.error('❌ TopicNotePicker: Error loading criteria:', err)
    allCriteria.value = []
  } finally {
    isLoading.value = false
  }
}

watch(() => [props.studentCategory, props.isTheoryLesson], () => {
  loadCriteria()
}, { immediate: true })

const filteredCriteria = computed(() => {
  let criteria = allCriteria.value

  if (props.studentCategory) {
    criteria = criteria.filter(c => {
      const drivingCategories = c.driving_categories || []
      return drivingCategories.length === 0 || drivingCategories.includes(props.studentCategory)
    })
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    criteria = criteria.filter(c => c.name?.toLowerCase().includes(query))
  }

  return criteria
})

const groupedCriteria = computed(() => {
  const groups: Record<string, { order: number; items: Criteria[] }> = {}

  filteredCriteria.value.forEach(criteria => {
    const categoryInfo = Array.isArray(criteria.evaluation_categories)
      ? criteria.evaluation_categories[0]
      : criteria.evaluation_categories
    const categoryName = categoryInfo?.name || 'Weitere Themen'
    if (!groups[categoryName]) {
      groups[categoryName] = { order: categoryInfo?.display_order ?? 999, items: [] }
    }
    groups[categoryName].items.push(criteria)
  })

  return Object.entries(groups)
    .sort((a, b) => a[1].order - b[1].order)
    .reduce((acc, [key, value]) => {
      acc[key] = value.items
      return acc
    }, {} as Record<string, Criteria[]>)
})

const isSelected = (criteriaId: string) => localTopics.value.some(t => t.evaluation_criteria_id === criteriaId)

const getCriteriaName = (criteriaId: string) => {
  return allCriteria.value.find(c => c.id === criteriaId)?.name || '…'
}

const emitUpdate = () => {
  emit('update:modelValue', localTopics.value.map(t => ({ ...t })))
}

const selectCriteria = (criteria: Criteria) => {
  if (!isSelected(criteria.id)) {
    localTopics.value.push({ evaluation_criteria_id: criteria.id, note: '' })
    emitUpdate()
  }
  searchQuery.value = ''
  showDropdown.value = false
}

const removeTopic = (criteriaId: string) => {
  localTopics.value = localTopics.value.filter(t => t.evaluation_criteria_id !== criteriaId)
  emitUpdate()
}

const handleClickOutside = (event: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

defineExpose({ getCriteriaName })
</script>
