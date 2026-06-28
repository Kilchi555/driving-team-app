<template>
  <div>
    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{{ label }}</p>
    <p class="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string }>()
</script>
