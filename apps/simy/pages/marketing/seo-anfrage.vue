<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-14 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <a href="/marketing" class="hover:text-gray-600">Marketing</a><span>›</span>
          <a href="/marketing/seo" class="hover:text-gray-600">SEO</a><span>›</span>
          <span class="text-gray-600">Anfrage</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Kostenlose SEO-Analyse
        </div>
        <h1 class="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
          Wie sichtbar ist deine<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Fahrschule bei Google?
          </span>
        </h1>
        <p class="text-gray-500 leading-relaxed">
          Füll das Formular aus — wir analysieren kostenlos deine aktuelle Google-Sichtbarkeit und melden uns innerhalb von 24 Stunden mit konkreten Empfehlungen.
        </p>
      </div>
    </section>

    <!-- Form -->
    <section class="pb-24 px-6">
      <div class="max-w-xl mx-auto">

        <!-- Success -->
        <div v-if="submitted"
          class="rounded-2xl border border-gray-100 p-10 text-center"
          style="background: rgba(var(--brand-rgb),0.03)">
          <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style="background: rgba(var(--brand-rgb),0.1)">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="var(--brand-primary)" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 class="text-xl font-extrabold text-gray-900 mb-2">Anfrage erhalten!</h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">
            Wir melden uns innerhalb von 24 Stunden mit deiner persönlichen SEO-Analyse. Eine Bestätigung geht sogleich an deine E-Mail-Adresse.
          </p>
          <a href="/marketing/seo"
            class="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
            style="color: var(--brand-primary)">
            ← Zurück zur SEO-Seite
          </a>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit" class="space-y-5">

          <!-- Context hint -->
          <div class="rounded-xl p-4 text-sm leading-relaxed" style="color: var(--brand-primary); background: rgba(var(--brand-rgb),0.06)"
            style="background: rgba(var(--brand-rgb),0.06); border: 1px solid rgba(var(--brand-rgb),0.15)">
            Damit wir dir eine fundierte Analyse schicken können, brauchen wir nur ein paar kurze Angaben zu dir und deiner Fahrschule.
          </div>

          <div class="grid sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Dein Name <span class="text-red-400">*</span></label>
              <input v-model="form.name" type="text" placeholder="Max Muster" autocomplete="name" required
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Name der Fahrschule <span class="text-red-400">*</span></label>
              <input v-model="form.school" type="text" placeholder="Fahrschule Muster" required
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors" />
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Stadt / Region <span class="text-red-400">*</span></label>
              <input v-model="form.city" type="text" placeholder="Zürich, Aarau, …" required
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Telefon <span class="text-gray-300">(optional)</span></label>
              <input v-model="form.phone" type="tel" placeholder="+41 79 123 45 67" autocomplete="tel"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">E-Mail <span class="text-red-400">*</span></label>
            <input v-model="form.email" type="email" placeholder="max@fahrschule.ch" autocomplete="email" required
              class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Hast du bereits eine Website?</label>
            <select v-model="form.website"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors bg-white">
              <option value="">Bitte wählen…</option>
              <option>Ja, eine eigene Website</option>
              <option>Ja, eine Simy-Website</option>
              <option>Nein, noch keine Website</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Was interessiert dich? <span class="text-gray-300">(optional)</span></label>
            <textarea v-model="form.message" rows="3"
              placeholder="z. B. «Ich möchte bei Google in Winterthur besser gefunden werden» oder «Ich weiss nicht wie ich aktuell ranke.»"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors resize-none"></textarea>
          </div>

          <div v-if="errorMsg" class="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {{ errorMsg }}
          </div>

          <button type="submit" :disabled="loading"
            class="w-full py-4 rounded-xl text-white font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.25)">
            <span v-if="loading">Wird gesendet…</span>
            <span v-else>Kostenlose SEO-Analyse anfragen →</span>
          </button>

          <p class="text-xs text-gray-400 text-center">
            Mit dem Absenden akzeptierst du unsere
            <a href="/datenschutz" class="hover:underline" style="color: var(--brand-primary)">Datenschutzerklärung</a>.
            Kein Spam, keine Weitergabe an Dritte.
          </p>
        </form>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

useHead({
  title: 'Kostenlose SEO-Analyse für Fahrschulen – Simy',
  meta: [
    { name: 'description', content: 'Jetzt kostenlose SEO-Analyse für deine Fahrschule anfragen. Simy zeigt dir, wie sichtbar du bei Google bist und was du verbessern kannst.' },
    { property: 'og:title', content: 'Kostenlose SEO-Analyse für Fahrschulen – Simy' },
    { property: 'og:description', content: 'Wir analysieren kostenlos deine Google-Sichtbarkeit und melden uns innerhalb von 24 Stunden.' },
    { property: 'og:url', content: 'https://simy.ch/marketing/seo-anfrage' },
    { name: 'robots', content: 'noindex, follow' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/marketing/seo-anfrage' }],
})

const form = reactive({
  name: '',
  school: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  message: '',
})
const loading = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

async function submit() {
  errorMsg.value = ''
  loading.value = true
  try {
    const body = {
      name: form.name,
      email: form.email,
      topic: 'SEO-Analyse Anfrage',
      message: `Fahrschule: ${form.school}\nStadt/Region: ${form.city}\nTelefon: ${form.phone || '—'}\nWebsite: ${form.website || '—'}\n\n${form.message}`,
    }
    await $fetch('/api/contact', { method: 'POST', body })
    submitted.value = true
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Etwas ist schiefgelaufen. Bitte versuche es nochmals.'
  } finally {
    loading.value = false
  }
}
</script>
