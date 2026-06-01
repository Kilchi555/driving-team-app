<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />
    <section class="pt-16 pb-24 px-6">
      <div class="max-w-2xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <span class="text-gray-600">Impressum</span>
        </nav>
        <h1 class="text-3xl font-black text-gray-900 mb-10">Impressum</h1>
        <div class="space-y-8">
          <div v-for="block in blocks" :key="block.title"
            class="rounded-2xl p-6 border border-gray-100">
            <h2 class="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">{{ block.title }}</h2>
            <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ block.content }}</p>
          </div>
        </div>
      </div>
    </section>
    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Impressum – Simy IT Systems',
  meta: [{ name: 'robots', content: 'noindex' }],
})

const blocks = [
  {
    title: 'Firmenangaben',
    content: 'Simy IT Systems\nPascal Kilchenmann\nSchweiz',
  },
  {
    title: 'Kontakt',
    content: 'E-Mail: info@simy.ch\nWebsite: https://simy.ch',
  },
  {
    title: 'Vertretungsberechtigte Person',
    content: 'Pascal Kilchenmann',
  },
  {
    title: 'Haftungsausschluss',
    content: 'Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschliesslich deren Betreiber verantwortlich.',
  },
  {
    title: 'Urheberrecht',
    content: 'Die auf dieser Website veröffentlichten Inhalte unterliegen dem Schweizer Urheberrecht. Jede Art von Nutzung, insbesondere die Verwendung von Texten, Bildern oder Teilen davon ohne Genehmigung ist untersagt.',
  },
]
</script>
