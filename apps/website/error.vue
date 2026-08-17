<template>
  <div class="min-h-screen bg-white flex items-center justify-center px-4">
    <Head>
      <Title>{{ title }} | Driving Team</Title>
      <Meta name="robots" content="noindex, nofollow" />
    </Head>
    <div class="max-w-lg text-center">
      <p class="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">{{ error?.statusCode || 500 }}</p>
      <h1 class="text-3xl font-extrabold text-gray-900 mb-4">{{ heading }}</h1>
      <p class="text-gray-600 mb-8">{{ message }}</p>
      <a href="/" class="inline-block bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-700 transition">
        Zur Startseite
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string } }>()

const is404 = computed(() => props.error?.statusCode === 404)
const title = computed(() => (is404.value ? 'Seite nicht gefunden' : 'Fehler'))
const heading = computed(() => (is404.value ? 'Seite nicht gefunden' : 'Etwas ist schiefgelaufen'))
const message = computed(() =>
  is404.value
    ? 'Diese Seite existiert nicht oder wurde verschoben. Über die Startseite findest du unser Angebot.'
    : 'Bitte versuche es später noch einmal oder gehe zurück zur Startseite.',
)
</script>
