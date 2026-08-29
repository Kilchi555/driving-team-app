<template>
  <p :class="classes">{{ compact ? PRICE_VAT_NOTE_SHORT : PRICE_VAT_NOTE }}</p>
</template>

<script setup lang="ts">
import { PRICE_VAT_NOTE, PRICE_VAT_NOTE_SHORT } from '~/data/pricing'

const props = withDefaults(defineProps<{
  compact?: boolean
  onDark?: boolean
}>(), {
  compact: false,
  onDark: false,
})

const classes = computed(() => {
  if (props.onDark) return props.compact ? 'text-[11px] text-white/65 mt-1' : 'text-xs text-white/65'
  return props.compact ? 'text-[11px] text-gray-400 mt-1' : 'text-xs text-gray-400'
})
</script>
