<template>
  <div class="flex flex-col items-center" :class="compact ? 'mb-8' : 'mb-10'">
    <img
      src="/pascal-business-2-round.png"
      alt="Pascal Kilchenmann, Gründer von Simy"
      :width="size"
      :height="size"
      class="rounded-full object-cover mb-4 ring-2 ring-white/30"
      :style="{ width: `${size}px`, height: `${size}px` }"
      loading="lazy"
    />
    <p class="text-white font-bold text-base">Pascal Kilchenmann</p>
    <p class="text-sm mb-4" style="color: rgba(255,255,255,0.65);">
      Gründer von Simy · Driving Team Fahrschule, Zürich
    </p>
    <p
      class="text-sm md:text-base max-w-xl leading-relaxed"
      style="color: rgba(255,255,255,0.8);"
    >
      {{ blurb }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  blurb: string
  size?: number
  compact?: boolean
}>(), {
  size: 112,
  compact: false,
})
</script>
