<template>
  <figure class="w-full max-w-[280px] mx-auto">
    <div
      class="relative aspect-[390/844] rounded-[2.5rem] border-[7px] border-[#1a1524] bg-white overflow-hidden shadow-[0_28px_60px_rgba(15,10,30,0.16)]"
    >
      <div class="absolute top-2.5 left-1/2 z-10 h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-[#1a1524]" />
      <div class="absolute inset-0 flex flex-col pt-8">
        <slot />
      </div>
    </div>
    <figcaption v-if="caption" class="mt-3 text-center text-xs text-gray-400">{{ caption }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
defineProps<{ caption?: string }>()
</script>
