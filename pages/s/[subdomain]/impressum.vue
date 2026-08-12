<script setup lang="ts">
definePageMeta({ layout: 'site', ssr: true })

const route = useRoute()
const subdomain = computed(() => String(route.params.subdomain || '').toLowerCase())
const preview = computed(() => route.query.preview === '1')
const homeHref = computed(() => `/s/${subdomain.value}${preview.value ? '?preview=1' : ''}`)

if (import.meta.server && preview.value) {
  const ev = useRequestEvent()
  ev?.node?.res?.setHeader?.('Cache-Control', 'private, no-store')
}

const { data, pending, error } = await useAsyncData(
  () => `impressum-${subdomain.value}-${preview.value ? 'p' : 'l'}`,
  () =>
    $fetch(`/api/public/website/${encodeURIComponent(subdomain.value)}/legal`, {
      query: { type: 'impressum', ...(preview.value ? { preview: '1' } : {}) },
    }),
  { watch: [subdomain, preview] },
)

useHead(() => ({
  title: `Impressum | ${data.value?.tenant?.name || subdomain.value}`,
  meta: [{ name: 'robots', content: preview.value ? 'noindex,nofollow' : 'index,follow' }],
}))
</script>

<template>
  <div v-if="pending" class="legal-wrap">Lädt…</div>
  <div v-else-if="error || !data" class="legal-wrap">
    <h1>Nicht gefunden</h1>
    <NuxtLink :to="homeHref">Zur Startseite</NuxtLink>
  </div>
  <div v-else class="legal-wrap">
    <header class="legal-nav">
      <NuxtLink :to="homeHref" class="legal-back">← {{ data.tenant?.name || 'Zurück' }}</NuxtLink>
    </header>
    <article class="legal-article" v-html="data.html" />
    <footer class="legal-footer">
      <NuxtLink :to="`/s/${subdomain}/impressum${preview ? '?preview=1' : ''}`">Impressum</NuxtLink>
      <NuxtLink :to="`/s/${subdomain}/datenschutz${preview ? '?preview=1' : ''}`">Datenschutz</NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.legal-wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  font-family: Manrope, ui-sans-serif, system-ui, sans-serif;
  color: #1f2937;
  min-height: 70vh;
}
.legal-nav { margin-bottom: 1.5rem; }
.legal-back {
  color: #4b5563;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
}
.legal-article :deep(h1) {
  font-family: Syne, sans-serif;
  font-size: 2rem;
  margin: 0 0 1rem;
}
.legal-article :deep(h2) {
  font-size: 1.15rem;
  margin: 1.5rem 0 0.5rem;
}
.legal-article :deep(p) {
  line-height: 1.65;
  margin: 0.5rem 0;
  color: #374151;
}
.legal-footer {
  display: flex;
  gap: 1rem;
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.85rem;
}
.legal-footer a { color: #6b7280; }
</style>
