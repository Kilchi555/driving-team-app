<template>
  <div class="flex justify-center items-center">
    <img 
      src="/images/driving-team-logo.png" 
      :alt="alt || 'Loading...'"
      :class="[
        'animate-pulse',
        sizeClasses[size] || sizeClasses.md
      ]"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  alt: 'Loading...'
})

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-32 w-32'
}
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
