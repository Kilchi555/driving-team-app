<template>
  <figure :class="['simy-shot-wrap', device]">
    <div
      class="simy-shot"
      :class="device === 'phone' ? 'rounded-[1.75rem]' : 'rounded-2xl md:rounded-[1.35rem]'"
    >
      <div v-if="device !== 'phone'" class="flex items-center gap-1.5 px-3 py-2 border-b border-black/[0.05] bg-white/80">
        <span class="w-1.5 h-1.5 rounded-full bg-black/15" />
        <span class="w-1.5 h-1.5 rounded-full bg-black/10" />
        <span class="w-1.5 h-1.5 rounded-full bg-black/10" />
        <span class="ml-2 text-[10px] font-medium text-gray-400 tracking-wide">{{ chrome }}</span>
      </div>
      <img
        :src="src"
        :alt="alt"
        :width="width"
        :height="height"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'low'"
        decoding="async"
      />
    </div>
    <figcaption v-if="caption" class="mt-3 text-center text-xs text-gray-400">{{ caption }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  alt: string
  caption?: string
  device?: 'desktop' | 'tablet' | 'phone'
  chrome?: string
  width?: number
  height?: number
  priority?: boolean
}>(), {
  device: 'desktop',
  chrome: 'app.simy.ch',
  width: 1440,
  height: 900,
  priority: false,
})
</script>

<style scoped>
.simy-shot-wrap.phone {
  max-width: 280px;
  margin-inline: auto;
}
</style>
