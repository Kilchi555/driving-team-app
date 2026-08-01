<template>
  <div>
    <label class="block text-sm font-semibold text-gray-900 mb-1.5">
      Terminart
    </label>

    <template v-if="showButtons">
      <select
        v-model="selectedPaidCode"
        @focus="onDropdownFocus"
        @change="onSelectPaid()"
        class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm bg-white font-medium text-gray-900"
      >
        <option v-if="paidEventTypes.length === 0" value="" disabled>Terminarten werden geladen…</option>
        <option v-for="eventType in paidEventTypes" :key="'paid-opt-' + eventType.code" :value="eventType.code">
          {{ eventType.emoji }} {{ eventType.name }}
        </option>
      </select>
    </template>

    <!-- Read-only display for past appointments -->
    <div v-else class="px-4 py-2.5 text-sm text-gray-600 bg-gray-50 rounded-xl border border-gray-200">
      {{ getSelectedLessonTypeName() }}
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, watch, computed, onMounted } from 'vue'
import { useEventTypes } from '~/composables/useEventTypes'
import { usePricing } from '~/composables/usePricing'
import { logger } from '~/utils/logger'

// Types
interface LessonType {
  code: string
  name: string
  description?: string
  emoji?: string
  require_payment?: boolean
  is_default?: boolean
}

interface Props {
  selectedType?: string
  disabled?: boolean
  showButtons?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: '',
  disabled: false,
  showButtons: true
})

const emit = defineEmits<{
  'lesson-type-selected': [lessonType: LessonType]
  'update:modelValue': [code: string]
}>()

// State
const selectedType = ref(props.selectedType || '')
const selectedPaidCode = ref<string>(props.selectedType || '')
const isLoadingDynamic = ref(false)
const dynamicLoaded = ref(false)

// Start empty — avoid flashing driving-school fallbacks (Fahrlektion) for other branches.
const eventTypes = ref<LessonType[]>([])

const { loadEventTypes } = useEventTypes()

// ✅ "Theorie" / "Beratung" nur anzeigen, wenn der Tenant für mind. eine Kategorie
// eine passende Preisregel aktiviert hat (Kategorien-Verwaltung / Tenant-Register)
const { loadPricingRules, hasTheoryPricing, hasConsultationPricing } = usePricing()

const paidEventTypes = computed(() =>
  eventTypes.value.filter((et: any) => {
    if (!et.require_payment) return false
    if (et.code === 'theory' && !hasTheoryPricing.value && et.code !== selectedPaidCode.value) return false
    if (et.code === 'consultation' && !hasConsultationPricing.value && et.code !== selectedPaidCode.value) return false
    return true
  })
)

async function loadDynamicTypes() {
  if (dynamicLoaded.value || isLoadingDynamic.value) return
  isLoadingDynamic.value = true
  try {
    const data = await loadEventTypes([], true) as LessonType[]
    if (data && data.length > 0) {
      eventTypes.value = data
      logger.debug('✅ LessonTypeSelector: dynamic types loaded:', data.map(e => e.code))
      syncSelectionToAvailableTypes()
    }
    dynamicLoaded.value = true
  } catch (err) {
    // Do not invent driving-school types (Fahrlektion) — that breaks consulting
    // tenants via FK on save. Leave empty and let the parent show a clear state.
    logger.debug('⚠️ LessonTypeSelector: dynamic load failed', err)
  } finally {
    isLoadingDynamic.value = false
  }
}

/** If current paid selection is missing from tenant types, pick first paid.
 *  Do not emit when selection is empty and list is still loading — and never
 *  fight a parent that intentionally holds a free default code. */
function syncSelectionToAvailableTypes() {
  const paid = paidEventTypes.value
  if (paid.length === 0) return
  const stillValid = paid.some(et => et.code === selectedPaidCode.value)
  if (stillValid) return
  // Parent still pointing at a free / non-paid code (e.g. discovery) while this
  // paid-only selector is mounting: wait for parent to set a paid code instead
  // of auto-jumping to consulting/workshop (causes UI flip-flop).
  const propCode = props.selectedType || ''
  if (propCode && !paid.some(et => et.code === propCode) && eventTypes.value.some((et: any) => et.code === propCode && !et.require_payment)) {
    logger.debug('ℹ️ LessonTypeSelector: parent has free type, skip auto-sync', propCode)
    return
  }
  const preferred =
    paid.find(et => et.is_default) ||
    paid.find(et => et.code === props.selectedType) ||
    paid[0]
  if (!preferred) return
  selectedType.value = preferred.code
  selectedPaidCode.value = preferred.code
  emit('lesson-type-selected', preferred)
  emit('update:modelValue', preferred.code)
  logger.debug('✅ LessonTypeSelector: synced selection to', preferred.code)
}

onMounted(() => {
  loadPricingRules().catch(() => {
    logger.debug('⚠️ LessonTypeSelector: could not load pricing rules for theory-gating')
  })
  // Eager load so consulting tenants never flash "Fahrlektion"
  loadDynamicTypes()
})

// Lazy load remains as safety if mount load was skipped
const onDropdownFocus = async () => {
  await loadDynamicTypes()
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
    if (dynamicLoaded.value) syncSelectionToAvailableTypes()
  }
}, { immediate: true })

const onSelectPaid = () => {
  const et = paidEventTypes.value.find(e => e.code === selectedPaidCode.value)
  if (et) selectLessonType(et)
}
</script>
