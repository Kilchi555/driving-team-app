<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-14 px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Kontakt
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-4 leading-tight">Wie können wir helfen?</h1>
        <p class="text-lg text-gray-500">Schreib uns — wir antworten innerhalb von 24 Stunden.</p>
      </div>
    </section>

    <!-- Main content -->
    <section class="pb-24 px-6">
      <div class="max-w-4xl mx-auto grid md:grid-cols-5 gap-10">

        <!-- Left: contact info -->
        <div class="md:col-span-2 space-y-8">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Direktkontakt</p>
            <a href="mailto:info@simy.ch"
              class="flex items-center gap-3 group">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                style="background: rgba(var(--brand-rgb),0.08)">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="var(--brand-primary)" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </span>
              <span class="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">info@simy.ch</span>
            </a>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Adresse</p>
            <div class="text-sm text-gray-600 leading-relaxed">
              <p class="font-semibold text-gray-800">Simy IT Systems</p>
              <p>Pascal Kilchenmann</p>
              <p class="text-gray-400 mt-1">Weiherweg 2<br>8610 Uster</p>
            </div>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Reaktionszeit</p>
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <span class="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
              <span>Innerhalb 24h an Werktagen</span>
            </div>
          </div>

          <div class="rounded-xl border border-gray-100 p-5">
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Lieber direkt starten?</p>
            <p class="text-sm text-gray-500 mb-4 leading-relaxed">60 Tage kostenlos testen — Keine Kreditkarte, in 5 Minuten bereit.</p>
            <a href="https://app.simy.ch/tenant-register"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
              Kostenlos starten →
            </a>
          </div>
        </div>

        <!-- Right: form -->
        <div class="md:col-span-3">
          <div v-if="submitted" class="rounded-2xl border border-gray-100 p-10 text-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
              style="background: rgba(var(--brand-rgb),0.08)">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="var(--brand-primary)" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 class="text-lg font-extrabold text-gray-900 mb-2">Anfrage erhalten!</h2>
            <p class="text-sm text-gray-500">Wir melden uns innerhalb von 24 Stunden. Eine Bestätigung geht sogleich an deine E-Mail-Adresse.</p>
          </div>

          <form v-else @submit.prevent="submit" class="space-y-5">
            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Name</label>
                <input v-model="form.name" type="text" placeholder="Max Muster" autocomplete="name"
                  class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-purple-400 transition-colors" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">E-Mail <span class="text-red-400">*</span></label>
                <input v-model="form.email" type="email" placeholder="max@fahrschule.ch" autocomplete="email" required
                  class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-purple-400 transition-colors" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Thema</label>
              <select v-model="form.topic"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-purple-400 transition-colors bg-white">
                <option>Allgemeine Anfrage</option>
                <option>Produktfragen & Demo</option>
                <option>Support</option>
                <option>Partnership</option>
                <option>Datenschutz</option>
                <option>Sonstiges</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Nachricht <span class="text-red-400">*</span></label>
              <textarea v-model="form.message" rows="5" placeholder="Womit können wir dir helfen?" required
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-purple-400 transition-colors resize-none"></textarea>
            </div>
            <div v-if="error" class="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {{ error }}
            </div>
            <button type="submit" :disabled="loading"
              class="w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
              <span v-if="loading">Wird gesendet…</span>
              <span v-else>Anfrage senden →</span>
            </button>
            <p class="text-xs text-gray-400 text-center">
              Mit dem Absenden akzeptierst du unsere
              <a href="/datenschutz" class="hover:underline" style="color: var(--brand-primary)">Datenschutzerklärung</a>.
            </p>
          </form>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Lieber direkt einsteigen?</h2>
        <p class="text-purple-200 mb-8 text-sm">60 Tage kostenlos testen — Keine Kreditkarte, keine Kündigung nötig.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-base transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

useHead({
  title: 'Kontakt – Simy | Fahrschulsoftware Schweiz',
  meta: [
    { name: 'description', content: 'Kontaktiere Simy IT Systems bei Fragen zu Fahrschulsoftware, Support oder Partnerships. Antwort innerhalb von 24h.' },
    { property: 'og:title', content: 'Kontakt – Simy' },
    { property: 'og:description', content: 'Schreib uns — wir antworten innerhalb von 24 Stunden.' },
    { property: 'og:url', content: 'https://simy.ch/kontakt' },
    { name: 'robots', content: 'index, follow' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/kontakt' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Kontakt – Simy',
        url: 'https://simy.ch/kontakt',
        mainEntity: {
          '@type': 'Organization',
          name: 'Simy IT Systems',
          url: 'https://simy.ch',
          email: 'info@simy.ch',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Weiherweg 2',
            addressLocality: 'Uster',
            postalCode: '8610',
            addressCountry: 'CH',
          },
        },
      }),
    },
  ],
})

const form = reactive({ name: '', email: '', topic: 'Allgemeine Anfrage', message: '' })
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

async function submit() {
  error.value = ''

  loading.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { name: form.name, email: form.email, topic: form.topic, message: form.message },
    })
    submitted.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Etwas ist schiefgelaufen. Bitte versuche es nochmals.'
  } finally {
    loading.value = false
  }
}
</script>
