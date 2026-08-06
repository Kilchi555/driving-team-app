<template>
  <div
    class="simy-icon-tile inline-flex items-center justify-center flex-shrink-0 transition-colors duration-200"
    :class="tileClass"
    :style="tileStyle"
  >
    <SimyIcon :name="name" :size="iconSize" :stroke-width="strokeWidth" />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  /** Tile outer size in px */
  size?: number
  /** Icon stroke size in px (defaults to ~45% of tile) */
  iconSize?: number
  strokeWidth?: number | string
  rounded?: 'xl' | '2xl' | 'full'
  alpha?: number
}>(), {
  size: 48,
  strokeWidth: 1.75,
  rounded: '2xl',
  alpha: 0.08,
})

const iconSize = computed(() => props.iconSize ?? Math.round(props.size * 0.45))

const tileClass = computed(() => ({
  'rounded-xl': props.rounded === 'xl',
  'rounded-2xl': props.rounded === '2xl',
  'rounded-full': props.rounded === 'full',
}))

const tileStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  background: `rgba(var(--brand-rgb), ${props.alpha})`,
  color: 'var(--brand-primary)',
}))
</script>
