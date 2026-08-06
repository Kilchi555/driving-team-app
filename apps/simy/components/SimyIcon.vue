<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="simy-icon"
  >
    <!-- calendar -->
    <g v-if="name === 'calendar'">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </g>
    <!-- phone -->
    <g v-else-if="name === 'phone'">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </g>
    <!-- users -->
    <g v-else-if="name === 'users'">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </g>
    <!-- users-family -->
    <g v-else-if="name === 'users-family'">
      <circle cx="9" cy="7" r="3.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <path d="M16 14a4 4 0 0 1 4 4v2" />
    </g>
    <!-- globe -->
    <g v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </g>
    <!-- chart -->
    <g v-else-if="name === 'chart'">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 3 5-6" />
    </g>
    <!-- chart-down -->
    <g v-else-if="name === 'chart-down'">
      <path d="M3 3v18h18" />
      <path d="M7 8l4 4 4-3 5 6" />
    </g>
    <!-- car -->
    <g v-else-if="name === 'car'">
      <path d="M5 17h14v-5l-2-5H7l-2 5v5z" />
      <path d="M5 12h14" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </g>
    <!-- brain -->
    <g v-else-if="name === 'brain'">
      <path d="M12 5a3.5 3.5 0 0 0-3.5 3.5c0 1.2.6 2.2 1.5 2.8v6.2h4V11.3c.9-.6 1.5-1.6 1.5-2.8A3.5 3.5 0 0 0 12 5z" />
      <path d="M8.5 8.5A3 3 0 0 0 5 11.2c0 1.4.9 2.5 2.1 2.9M15.5 8.5A3 3 0 0 1 19 11.2c0 1.4-.9 2.5-2.1 2.9" />
      <path d="M10 21h4" />
    </g>
    <!-- briefcase -->
    <g v-else-if="name === 'briefcase'">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20" />
    </g>
    <!-- activity -->
    <g v-else-if="name === 'activity'">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </g>
    <!-- book -->
    <g v-else-if="name === 'book'">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </g>
    <!-- music -->
    <g v-else-if="name === 'music'">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </g>
    <!-- paw -->
    <g v-else-if="name === 'paw'">
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="18" cy="16" r="2" />
      <path d="M9 10c-2 0-4 1.5-4 4 0 2.5 2.5 5 5 5h2c2.5 0 5-2.5 5-5 0-2.5-2-4-4-4h-4z" />
    </g>
    <!-- leaf -->
    <g v-else-if="name === 'leaf'">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.5 2 8a8 8 0 0 1-8 8 8 8 0 0 1-2-.2z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.5 12 13 13 12" />
    </g>
    <!-- invoice -->
    <g v-else-if="name === 'invoice'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2V8z" />
      <path d="M14 2v6h6M8 13h6M8 17h4" />
    </g>
    <!-- bell -->
    <g v-else-if="name === 'bell'">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.7 1.7 0 0 0 3.4 0" />
    </g>
    <!-- bell-off -->
    <g v-else-if="name === 'bell-off'">
      <path d="M13.73 21a2 2 0 0 1-3.46 0M18.6 15A6 6 0 0 0 18 8" />
      <path d="M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M2 2l20 20" />
    </g>
    <!-- message -->
    <g v-else-if="name === 'message'">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </g>
    <!-- package -->
    <g v-else-if="name === 'package'">
      <path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </g>
    <!-- palette -->
    <g v-else-if="name === 'palette'">
      <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.7 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7H16c3.3 0 6-2.7 6-6 0-5.5-4.5-10-10-10z" />
    </g>
    <!-- handshake -->
    <g v-else-if="name === 'handshake'">
      <path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14" />
      <path d="m7 18 1.6-1.4c.3-.4.8-.6 1.3-.6h3.5c.6 0 1.2.3 1.6.8l2 2.4" />
      <path d="m14 14 2.4-2.4a2 2 0 0 1 2.8 0l2.4 2.4" />
      <path d="M5 14 3 16l2 2 4-2" />
    </g>
    <!-- wallet -->
    <g v-else-if="name === 'wallet'">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M16 3H6a2 2 0 0 0-2 2v2M16 14h.01" />
    </g>
    <!-- credit-card -->
    <g v-else-if="name === 'credit-card'">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </g>
    <!-- clock -->
    <g v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </g>
    <!-- graduate -->
    <g v-else-if="name === 'graduate'">
      <path d="M22 10 12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </g>
    <!-- school -->
    <g v-else-if="name === 'school'">
      <path d="M14 22v-4a2 2 0 0 0-4 0v4" />
      <path d="M18 22V10l-6-4-6 4v12" />
      <path d="M2 22h20M6 10v4M10 10v4M14 10v4M18 10v4" />
    </g>
    <!-- folder -->
    <g v-else-if="name === 'folder'">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </g>
    <!-- building -->
    <g v-else-if="name === 'building'">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M2 22h20M10 6h4M10 10h4M10 14h4M10 18h4" />
    </g>
    <!-- pen -->
    <g v-else-if="name === 'pen'">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </g>
    <!-- rocket -->
    <g v-else-if="name === 'rocket'">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.9 12.9 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </g>
    <!-- swiss -->
    <g v-else-if="name === 'swiss'">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </g>
    <!-- label -->
    <g v-else-if="name === 'label'">
      <path d="M12 2H2v10l9.3 9.3c.9.9 2.4.9 3.3 0l6.7-6.7c.9-.9.9-2.4 0-3.3L12 2z" />
      <circle cx="7" cy="7" r="1.5" />
    </g>
    <!-- target -->
    <g v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </g>
    <!-- calculator -->
    <g v-else-if="name === 'calculator'">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M16 14h0M8 18h2M12 18h2M16 18h0" />
    </g>
    <!-- camp -->
    <g v-else-if="name === 'camp'">
      <path d="m12 3 9 18H3l9-18z" />
      <path d="M12 3v18" />
    </g>
    <!-- clipboard -->
    <g v-else-if="name === 'clipboard'">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </g>
    <!-- cloud -->
    <g v-else-if="name === 'cloud'">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
    </g>
    <!-- link -->
    <g v-else-if="name === 'link'">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </g>
    <!-- refresh -->
    <g v-else-if="name === 'refresh'">
      <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
    </g>
    <!-- settings -->
    <g v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </g>
    <!-- map-pin -->
    <g v-else-if="name === 'map-pin'">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </g>
    <!-- spark -->
    <g v-else-if="name === 'spark'">
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </g>
    <!-- shuffle -->
    <g v-else-if="name === 'shuffle'">
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </g>
    <!-- megaphone -->
    <g v-else-if="name === 'megaphone'">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </g>
    <!-- search -->
    <g v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </g>
    <!-- monitor -->
    <g v-else-if="name === 'monitor'">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </g>
    <!-- zap -->
    <g v-else-if="name === 'zap'">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </g>
    <!-- award -->
    <g v-else-if="name === 'award'">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" />
    </g>
    <!-- mail -->
    <g v-else-if="name === 'mail'">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
    </g>
    <!-- flame -->
    <g v-else-if="name === 'flame'">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-1.5-.5-3.5.5-4.5.6 1.5 2 3.5 3.5 4.5 1.5 1 2.5 2.5 2.5 4.5a5 5 0 1 1-10 0c0-.6.1-1.2.3-1.7.4.8.9 1.4 1.7 1.7z" />
    </g>
    <!-- spa / leaf-like calm -->
    <g v-else-if="name === 'spa'">
      <path d="M12 22c4-4 6-8 6-12a6 6 0 0 0-12 0c0 4 2 8 6 12z" />
      <path d="M12 22V10" />
    </g>
    <!-- compass -->
    <g v-else-if="name === 'compass'">
      <circle cx="12" cy="12" r="10" />
      <path d="m16.2 7.8-2.2 6.2-6.2 2.2 2.2-6.2 6.2-2.2z" />
    </g>
    <!-- check -->
    <g v-else-if="name === 'check'">
      <path d="M20 6 9 17l-5-5" />
    </g>
    <!-- fallback spark -->
    <g v-else>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { SimyIconName } from '~/utils/icons'
import { resolveIconName } from '~/utils/icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  strokeWidth?: number | string
}>(), {
  size: 20,
  strokeWidth: 1.75,
})

const name = computed(() => resolveIconName(props.name) as SimyIconName)
</script>
