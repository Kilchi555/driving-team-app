<template>
  <div class="relative">
    <div class="relative">
      <svg
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      <input
        ref="inputRef"
        :value="modelValue"
        type="search"
        autocomplete="off"
        :required="required"
        :placeholder="placeholder"
        :class="inputClass"
        style="padding-left: 2.25rem"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />
    </div>
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed z-[80] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
        :style="dropdownStyle"
        @mousedown.prevent
      >
        <p v-if="loading" class="px-3 py-2.5 text-xs text-gray-400">Lädt Firmen…</p>
        <template v-else-if="results.length">
          <button
            v-for="company in results"
            :key="company.id"
            type="button"
            class="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50"
            @mousedown.prevent="pick(company)"
          >
            <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              {{ (company.name || '?').charAt(0).toUpperCase() }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900">{{ company.name }}</p>
              <p class="truncate text-xs text-gray-400">
                {{ [company.contact_person, company.zip, company.city].filter(Boolean).join(' · ') || 'Keine Adresse' }}
              </p>
            </div>
          </button>
        </template>
        <p v-else class="px-3 py-2.5 text-xs text-gray-400">
          Keine Firma gefunden — Name bleibt als neue Firma
        </p>
      </div>
    </Teleport>
    <p v-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { searchCompanies, type CompanySearchHit } from '~/composables/useCompanyLink'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  hint?: string
  required?: boolean
  inputClass?: string
}>(), {
  placeholder: 'Firma suchen…',
  hint: '',
  required: false,
  inputClass: 'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [company: CompanySearchHit]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const results = ref<CompanySearchHit[]>([])
const open = ref(false)
const loading = ref(false)
const dropdownStyle = ref<Record<string, string>>({})
let timer: ReturnType<typeof setTimeout> | null = null
let blurTimer: ReturnType<typeof setTimeout> | null = null

function updatePosition() {
  const el = inputRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const maxHeight = 224
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const openAbove = spaceBelow < 140 && rect.top > spaceBelow
  dropdownStyle.value = {
    left: `${Math.max(8, rect.left)}px`,
    width: `${Math.max(rect.width, 240)}px`,
    maxHeight: `${maxHeight}px`,
    ...(openAbove
      ? { bottom: `${window.innerHeight - rect.top + 4}px`, top: 'auto' }
      : { top: `${rect.bottom + 4}px`, bottom: 'auto' }),
  }
}

function load(query: string) {
  if (timer) clearTimeout(timer)
  open.value = true
  loading.value = true
  nextTick(updatePosition)
  timer = setTimeout(async () => {
    try {
      results.value = (await searchCompanies(query)).slice(0, 12)
    } catch {
      results.value = []
    } finally {
      loading.value = false
      nextTick(updatePosition)
    }
  }, query.trim() ? 220 : 0)
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  load(value)
}

function onFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  load(props.modelValue || '')
}

function onBlur() {
  blurTimer = setTimeout(() => {
    open.value = false
  }, 160)
}

function pick(company: CompanySearchHit) {
  emit('update:modelValue', company.name || '')
  emit('select', company)
  open.value = false
}

onMounted(() => {
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  if (timer) clearTimeout(timer)
  if (blurTimer) clearTimeout(blurTimer)
})
</script>
