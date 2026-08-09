<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </template>
    <template v-else-if="name === 'star'">
      <path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.4l.9-5.4L4.2 9.2l5.4-.8L12 3.5z" />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 3l7 3v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </template>
    <template v-else-if="name === 'map'">
      <path d="M9 4.5l-5 2v13l5-2 6 2 5-2v-13l-5 2-6-2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </template>
    <template v-else-if="name === 'phone'">
      <path d="M7 3.5h3.2l1.2 3.2-2 1.2a11 11 0 005.5 5.5l1.2-2 3.2 1.2V16a2.5 2.5 0 01-2.5 2.5A13.5 13.5 0 014.5 5.5 2.5 2.5 0 017 3.5z" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </template>
    <template v-else-if="name === 'check'">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M5 6.5h14a2 2 0 012 2v6a2 2 0 01-2 2H10l-4.5 3v-3H5a2 2 0 01-2-2v-6a2 2 0 012-2z" />
    </template>
  </svg>
</template>

<script setup lang="ts">
import type { WebsiteIconKey } from '~/utils/website-icons'

withDefaults(
  defineProps<{
    name: WebsiteIconKey
    size?: number | string
  }>(),
  { size: 18 },
)
</script>
