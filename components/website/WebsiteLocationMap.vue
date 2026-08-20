<template>
  <div class="lp-map lp-map--section">
    <a
      v-if="!showIframe"
      class="lp-map-fallback"
      :href="openHref"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="lp-map-fallback-pin" aria-hidden="true">📍</span>
      <span class="lp-map-fallback-copy">
        <strong>Karte öffnen</strong>
        <span>{{ native ? 'Google Maps in der App' : 'Google Maps' }}</span>
      </span>
    </a>
    <iframe
      v-else
      :src="embedUrl"
      :title="title"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  embedUrl: string
  openUrl?: string | null
  title?: string
}>()

const title = computed(() => props.title || 'Karte')
const openHref = computed(() => props.openUrl || props.embedUrl)
const native = ref(false)
const showIframe = ref(false)

onMounted(() => {
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
  native.value = isNative
  showIframe.value = !isNative
})

/** Capacitor WKWebView blanks Google Map iframes — keep the tappable card. */
</script>

<style scoped>
.lp-map iframe,
.lp-map-fallback {
  display: block;
  width: 100%;
  min-height: 320px;
  border: 0;
  border-radius: 16px;
  background: var(--lp-bg, #eef1f5);
}
.lp-map-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  text-decoration: none;
  color: inherit;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--lp-primary, #0f766e) 18%, transparent), transparent 62%),
    linear-gradient(180deg, #e8eef4 0%, #d5dde6 100%);
  border: 1px solid color-mix(in srgb, var(--lp-primary, #0f766e) 18%, #d7dbe3);
}
.lp-map-fallback-pin {
  font-size: 2rem;
  line-height: 1;
}
.lp-map-fallback-copy {
  display: grid;
  gap: 0.15rem;
  text-align: center;
}
.lp-map-fallback-copy strong {
  font-size: 0.95rem;
  color: #111827;
}
.lp-map-fallback-copy span {
  font-size: 0.8rem;
  color: #6b7280;
}
@media (min-width: 880px) {
  .lp-map iframe,
  .lp-map-fallback {
    min-height: 420px;
  }
}
</style>
