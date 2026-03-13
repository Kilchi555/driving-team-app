<template>
  <div>
    <Head>
      <Title>Partner werden | Driving Team</Title>
      <Meta name="description" content="Empfehle Driving Team und erhalte CHF-Guthaben für jede erfolgreiche Empfehlung. Kostenlos, einfach, für alle." />
      <Meta property="og:title" content="Partner werden – Geld verdienen mit Empfehlungen | Driving Team" />
      <Meta property="og:description" content="Empfehle Driving Team und verdiene CHF-Guthaben für jede erfolgreiche Empfehlung. Kostenlos & einfach." />
      <Meta property="og:url" content="https://drivingteam.ch/partner/" />
      <Link rel="canonical" href="https://drivingteam.ch/partner/" />
          <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-gray-900 to-gray-700 text-white py-16 md:py-24 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
        <div class="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl"></div>
      </div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium mb-6">
            <span>🤝</span>
            <span>Affiliate Programm</span>
          </div>
          <h1 class="heading-lg text-white mb-6">Empfehle uns –<br>und werde belohnt</h1>
          <p class="text-xl text-gray-300 mb-8 max-w-2xl">
            Teile deinen persönlichen Link. Jedes Mal wenn jemand über deinen Link eine Lektion absolviert, 
            wird dein Guthaben automatisch aufgeladen.
          </p>
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-3">
              <span class="text-2xl">💸</span>
              <div>
                <div class="font-bold text-lg">CHF-Guthaben</div>
                <div class="text-gray-400 text-sm">Pro Empfehlung</div>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-3">
              <span class="text-2xl">🔗</span>
              <div>
                <div class="font-bold text-lg">Einmalig aktivieren</div>
                <div class="text-gray-400 text-sm">Dann automatisch</div>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-3">
              <span class="text-2xl">🏦</span>
              <div>
                <div class="font-bold text-lg">Auszahlbar</div>
                <div class="text-gray-400 text-sm">Per Banküberweisung</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="section-container py-16">
      <h2 class="heading-md text-center mb-12">So funktioniert es</h2>
      <div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mx-auto mb-4">1️⃣</div>
          <h3 class="font-bold text-lg mb-2">Registrieren</h3>
          <p class="text-gray-600 text-sm">Trag deine E-Mail ein und erhalte per Link Zugang zu deinem Affiliate-Dashboard.</p>
        </div>
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mx-auto mb-4">2️⃣</div>
          <h3 class="font-bold text-lg mb-2">Link teilen</h3>
          <p class="text-gray-600 text-sm">Teile deinen persönlichen Link mit Freunden, Familie oder deiner Community.</p>
        </div>
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mx-auto mb-4">3️⃣</div>
          <h3 class="font-bold text-lg mb-2">Guthaben kassieren</h3>
          <p class="text-gray-600 text-sm">Sobald ein Geworbener seine erste Lektion absolviert, wird dein Guthaben automatisch gutgeschrieben.</p>
        </div>
      </div>
    </section>

    <!-- Registration Form / Success -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <div class="max-w-md mx-auto">

          <!-- Success state -->
          <div v-if="emailSent" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div class="text-5xl mb-4">📬</div>
            <h2 class="text-2xl font-bold text-gray-900 mb-3">E-Mail gesendet!</h2>
            <p class="text-gray-600 mb-2">
              Wir haben einen Zugangslink an <strong>{{ submittedEmail }}</strong> gesendet.
            </p>
            <p class="text-gray-500 text-sm">Öffne die E-Mail und klicke auf den Link um dein Affiliate-Dashboard zu öffnen. Der Link ist 1 Stunde gültig.</p>
          </div>

          <!-- Form state -->
          <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Jetzt Partner werden</h2>
            <p class="text-gray-500 text-sm mb-6">
              Kein Passwort nötig. Du erhältst einen Link per E-Mail.
            </p>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  required
                  placeholder="Max"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  required
                  placeholder="Mustermann"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail-Adresse</label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="max@beispiel.ch"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>

              <p v-if="errorMessage" class="text-red-600 text-sm bg-red-50 rounded-lg p-3">{{ errorMessage }}</p>

              <button
                type="submit"
                :disabled="loading"
                class="w-full bg-gray-900 text-white rounded-lg px-6 py-3 font-semibold text-sm hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="loading">Wird gesendet…</span>
                <span v-else>Zugangslink senden →</span>
              </button>
            </form>

            <p class="text-xs text-gray-400 mt-4 text-center">
              Mit der Registrierung stimmst du unseren
              <NuxtLink to="/agb" class="underline">AGB</NuxtLink> und der
              <NuxtLink to="/datenschutz" class="underline">Datenschutzerklärung</NuxtLink> zu.
            </p>
          </div>

          <!-- Already a customer? -->
          <p class="text-center text-sm text-gray-500 mt-6">
            Bist du bereits Schüler oder Mitarbeiter?
            <a href="https://app.drivingteam.ch/login" class="font-medium text-gray-900 underline">Direkt einloggen →</a>
          </p>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section-container py-16">
      <h2 class="heading-md text-center mb-10">Häufige Fragen</h2>
      <div class="max-w-2xl mx-auto space-y-4">
        <details v-for="faq in faqs" :key="faq.q" class="bg-white border border-gray-200 rounded-xl p-5 group">
          <summary class="flex justify-between items-center cursor-pointer font-medium text-gray-900 list-none">
            {{ faq.q }}
            <span class="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <p class="mt-3 text-gray-600 text-sm leading-relaxed">{{ faq.a }}</p>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const form = ref({ firstName: '', lastName: '', email: '' })
const loading = ref(false)
const emailSent = ref(false)
const submittedEmail = ref('')
const errorMessage = ref('')

const faqs = [
  {
    q: 'Wer kann Partner werden?',
    a: 'Jeder! Egal ob du bereits Schüler, Mitarbeiter oder jemand von aussen bist – das Programm steht allen offen.'
  },
  {
    q: 'Wie viel Guthaben erhalte ich pro Empfehlung?',
    a: 'Den aktuellen Betrag siehst du in deinem Affiliate-Dashboard nach der Registrierung.'
  },
  {
    q: 'Wann wird das Guthaben gutgeschrieben?',
    a: 'Sobald die erste Lektion deines geworbenen Kontakts als abgeschlossen markiert wird, wird dein Guthaben automatisch aufgeladen.'
  },
  {
    q: 'Wie kann ich mein Guthaben auszahlen lassen?',
    a: 'Du kannst das Guthaben entweder für eigene Fahrstunden nutzen oder eine Auszahlung per Banküberweisung beantragen. Beides ist in deinem Dashboard möglich.'
  },
  {
    q: 'Gibt es eine Begrenzung wie viele Personen ich empfehlen kann?',
    a: 'Nein, es gibt keine Begrenzung. Jede erfolgreiche Empfehlung wird belohnt.'
  },
]

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Partner werden – Affiliate Programm | Driving Team",
        "description": "Empfehle Driving Team und erhalte CHF-Guthaben für jede erfolgreiche Empfehlung. Kostenlos, einfach, für alle.",
        "url": "https://drivingteam.ch/partner/",
        "publisher": {
          "@type": "Organization",
          "name": "Driving Team Fahrschule",
          "url": "https://drivingteam.ch"
        }
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
          { "@type": "ListItem", "position": 2, "name": "Partner werden", "item": "https://drivingteam.ch/partner/" }
        ]
      })
    }
  ]
})

async function handleSubmit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await $fetch('/api/affiliate/register-partner', {
      method: 'POST',
      body: {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        email: form.value.email.trim().toLowerCase(),
      }
    })
    submittedEmail.value = form.value.email
    emailSent.value = true
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
  } finally {
    loading.value = false
  }
}
</script>
