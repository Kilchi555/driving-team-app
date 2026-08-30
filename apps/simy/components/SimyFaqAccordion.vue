<template>
  <div class="space-y-3">
    <div
      v-for="(faq, i) in items"
      :key="faq.q"
      class="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      <button
        type="button"
        class="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        :aria-expanded="open === i"
        @click="open = open === i ? null : i"
      >
        {{ faq.q }}
        <svg
          class="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform"
          :class="open === i ? 'rotate-180' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="open === i" class="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
        <div class="pt-4">{{ faq.a }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/schema'

defineProps<{
  items: FaqItem[]
}>()

const open = ref<number | null>(null)
</script>
