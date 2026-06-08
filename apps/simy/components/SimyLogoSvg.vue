<template>
  <svg
    viewBox="0 0 220 64"
    :class="className"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Simy.ch"
    role="img"
  >
    <!-- Circle background -->
    <circle cx="32" cy="32" r="30" :fill="primaryColor" />

    <!-- S letter inside circle (lighter tint via opacity) -->
    <text
      x="32" y="44"
      text-anchor="middle"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      font-size="34"
      font-weight="900"
      fill="white"
      fill-opacity="0.45"
    >S</text>

    <!-- "Simy" bold text -->
    <text
      x="74" y="44"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      font-size="34"
      font-weight="800"
      :fill="primaryColor"
    >Simy</text>

    <!-- ".ch" light text -->
    <text
      x="163" y="44"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      font-size="34"
      font-weight="400"
      :fill="primaryColor"
      fill-opacity="0.45"
    >.ch</text>
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  primaryColor?: string
  className?: string
}>(), {
  primaryColor: '#6000BD',
  className: 'h-8'
})
</script>
