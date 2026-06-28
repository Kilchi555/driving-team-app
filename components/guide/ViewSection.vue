<template>
  <div
    class="rounded-2xl p-4 space-y-3"
    :class="teacher ? 'bg-indigo-50 border border-indigo-100' : bg === 'amber' ? 'bg-amber-50' : bg === 'indigo' ? 'bg-indigo-50' : bg === 'red' ? 'bg-red-50' : 'bg-white border border-gray-100'"
  >
    <div class="flex items-center gap-2">
      <span
        class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        :class="teacher ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'"
      >{{ num }}</span>
      <h4 class="text-sm font-bold" :class="teacher ? 'text-indigo-800' : 'text-gray-800'">{{ title }}</h4>
    </div>
    <p v-if="subtitle" class="text-xs text-gray-500 font-medium -mt-1">{{ subtitle }}</p>
    <slot/>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  num: string
  title: string
  subtitle?: string
  bg?: 'amber' | 'indigo' | 'red'
  teacher?: boolean
}>()
</script>
