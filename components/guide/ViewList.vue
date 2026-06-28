<template>
  <div v-if="items.length" class="space-y-1.5">
    <p v-if="label" class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ label }}</p>
    <ul class="space-y-1">
      <li v-for="(item, i) in items" :key="i" class="flex items-start gap-2 text-sm text-gray-800">
        <span v-if="badge" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 flex-shrink-0 mt-0.5">{{ i + 1 }}</span>
        <span v-else class="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" :class="dotColor"/>
        {{ item }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  items: string[]
  label?: string
  color?: 'indigo' | 'blue' | 'teal' | 'orange' | 'amber' | 'purple' | 'gray'
  badge?: boolean
}>()

const dotColor = {
  indigo: 'bg-indigo-400',
  blue: 'bg-blue-400',
  teal: 'bg-teal-400',
  orange: 'bg-orange-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
  gray: 'bg-gray-300'
}[props.color ?? 'gray']
</script>
