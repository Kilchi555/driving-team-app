<template>
  <div v-if="links.length" class="flex flex-col gap-1.5 mt-1">
    <a
      v-for="(link, i) in links"
      :key="i"
      :href="link"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-800 hover:underline"
    >
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span class="truncate">{{ displayLabel(link) }}</span>
    </a>
  </div>
</template>

<script setup lang="ts">
defineProps<{ links: string[] }>()

function displayLabel(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) return `YouTube — ${u.pathname.slice(0, 40)}`
    if (u.hostname.includes('vimeo')) return `Vimeo — ${u.pathname.slice(0, 40)}`
    return url.slice(0, 60)
  } catch {
    return url.slice(0, 60)
  }
}
</script>
