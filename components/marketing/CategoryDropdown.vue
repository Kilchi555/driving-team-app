<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="block text-xs font-medium text-gray-700">{{ label }}</label>
    </div>

    <!-- Trigger -->
    <div class="relative" ref="dropdownRef">
      <button
        type="button"
        @click="open = !open"
        class="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition hover:border-gray-400"
      >
        <div class="flex flex-wrap gap-1 flex-1 min-w-0">
          <template v-if="modelValue.length === 0">
            <span class="text-gray-400">{{ placeholder }}</span>
          </template>
          <span
            v-for="code in modelValue"
            :key="code"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            :style="{ background: colorOf(code) }"
          >
            {{ labelOf(code) }}
            <button type="button" @click.stop="remove(code)" class="opacity-70 hover:opacity-100">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
        <svg class="w-4 h-4 text-gray-400 shrink-0 transition-transform" :class="{ 'rotate-180': open }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown Panel -->
      <div v-if="open"
        class="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
        <!-- Search -->
        <div class="p-2 border-b border-gray-100">
          <input
            v-model="search"
            type="text"
            placeholder="Suchen…"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @click.stop
          />
        </div>

        <!-- Options -->
        <div class="max-h-52 overflow-y-auto">
          <div v-if="filtered.length === 0" class="px-3 py-3 text-xs text-gray-400 text-center">
            Keine Kategorien gefunden
          </div>
          <button
            v-for="cat in filtered"
            :key="cat.value"
            type="button"
            @click.stop="toggle(cat.value)"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left"
          >
            <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: cat.color }" />
            <span class="flex-1 text-sm text-gray-800">{{ cat.label }}</span>
            <span v-if="modelValue.includes(cat.value)"
              class="text-blue-600 shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span v-else class="text-xs text-gray-300 shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </span>
          </button>
        </div>

        <!-- Create new -->
        <div class="p-2 border-t border-gray-100">
          <button type="button" @click.stop="$emit('create'); open = false"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-blue-600 font-medium transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Neue Kategorie erstellen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  categories: { value: string; label: string; color: string }[]
  label?: string
  placeholder?: string
}>(), {
  label: 'Kategorien',
  placeholder: 'Kategorien wählen…',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'create': []
}>()

const open = ref(false)
const search = ref('')
const dropdownRef = ref<HTMLElement | null>(null)

const filtered = computed(() =>
  props.categories.filter(c =>
    !search.value || c.label.toLowerCase().includes(search.value.toLowerCase()) || c.value.toLowerCase().includes(search.value.toLowerCase())
  )
)

function colorOf(code: string) {
  return props.categories.find(c => c.value === code)?.color || '#94a3b8'
}

function labelOf(code: string) {
  return props.categories.find(c => c.value === code)?.label || code
}

function toggle(value: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(value)
  if (idx === -1) current.push(value)
  else current.splice(idx, 1)
  emit('update:modelValue', current)
}

function remove(value: string) {
  emit('update:modelValue', props.modelValue.filter(v => v !== value))
}

function handleOutsideClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false
    search.value = ''
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>
