<template>
  <div class="bg-white rounded-2xl border overflow-hidden">
    <div class="px-5 py-4 border-b">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" :class="badgeClasses">
              {{ badge }}
            </span>
          </div>
          <h3 class="text-sm font-semibold text-gray-900 mt-1.5">{{ title }}</h3>
          <p class="text-xs text-gray-500 mt-0.5">{{ description }}</p>
        </div>
      </div>
    </div>
    <div class="px-5 py-3 flex gap-2 items-center">
      <button
        v-if="!confirming"
        @click="handleClick"
        :disabled="loading"
        class="px-3 py-1.5 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 flex items-center gap-1.5"
        :class="buttonClasses"
      >
        <svg v-if="loading" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ loading ? 'Läuft…' : 'Ausführen' }}
      </button>

      <!-- Confirmation step -->
      <template v-if="confirming">
        <p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex-1">
          {{ confirmMessage }}
        </p>
        <button @click="confirm" class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">
          Ja, ausführen
        </button>
        <button @click="confirming = false" class="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50">
          Abbrechen
        </button>
      </template>
    </div>
    <ToolResult :result="result" compact />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  title: string
  description: string
  badge: string
  badgeColor?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'gray' | 'orange'
  loading: boolean
  result: any
  confirmMessage?: string
}>()

const emit = defineEmits<{
  run: []
}>()

const confirming = ref(false)

const BADGE_COLORS: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700',
  green:  'bg-green-50 text-green-700',
  red:    'bg-red-50 text-red-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  purple: 'bg-purple-50 text-purple-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  gray:   'bg-gray-100 text-gray-600',
  orange: 'bg-orange-50 text-orange-700',
}

const BUTTON_COLORS: Record<string, string> = {
  blue:   'bg-blue-600 hover:bg-blue-700',
  green:  'bg-green-600 hover:bg-green-700',
  red:    'bg-red-600 hover:bg-red-700',
  yellow: 'bg-yellow-600 hover:bg-yellow-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  gray:   'bg-gray-700 hover:bg-gray-800',
  orange: 'bg-orange-600 hover:bg-orange-700',
}

const badgeClasses = computed(() => BADGE_COLORS[props.badgeColor ?? 'gray'])
const buttonClasses = computed(() => BUTTON_COLORS[props.badgeColor ?? 'gray'])

function handleClick() {
  if (props.confirmMessage) {
    confirming.value = true
  } else {
    emit('run')
  }
}

function confirm() {
  confirming.value = false
  emit('run')
}
</script>
