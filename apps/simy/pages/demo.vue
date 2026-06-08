<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-24 px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-2xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          ⚡ Kostenloser Demo-Zugang
        </div>
        <h1 class="text-5xl font-black text-gray-900 mb-5 leading-tight">In 5 Minuten startklar</h1>
        <p class="text-xl text-gray-500 mb-10 leading-relaxed">
          Teste simy 60 Tage lang vollständig kostenlos — ohne Kreditkarte, ohne Risiko. Alles eingerichtet, sofort bereit.
        </p>

        <!-- Checklist -->
        <div class="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-600 mb-10">
          <span v-for="item in checks" :key="item" class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            {{ item }}
          </span>
        </div>

        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white font-black text-lg transition-all hover:opacity-90 hover:-translate-y-0.5"
          style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 12px 40px rgba(var(--brand-rgb),0.35)">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Jetzt kostenlos starten
        </a>
        <p class="text-xs text-gray-400 mt-4">Keine Kreditkarte · Keine Kündigung nötig · Sofort verfügbar</p>
      </div>
    </section>

    <!-- Steps -->
    <section class="py-20 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-extrabold text-gray-900 text-center mb-12">So funktioniert der Start</h2>
        <div class="grid md:grid-cols-4 gap-6">
          <div v-for="(step, i) in steps" :key="i" class="text-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-black mx-auto mb-4"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">{{ i + 1 }}</div>
            <h3 class="font-bold text-gray-900 mb-2 text-sm">{{ step.title }}</h3>
            <p class="text-xs text-gray-500 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- What you get -->
    <section class="py-20 px-6">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-12">Was du im Trial bekommst</h2>
        <div class="grid md:grid-cols-3 gap-5">
          <div v-for="f in trialFeatures" :key="f.title"
            class="rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-all group">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
              style="background: rgba(var(--brand-rgb),0.08)">
              <span class="text-xl">{{ f.icon }}</span>
            </div>
            <h3 class="font-bold text-gray-900 mb-1 text-sm">{{ f.title }}</h3>
            <p class="text-xs text-gray-500 leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Bereit loszulegen?</h2>
        <p class="text-white/70 mb-8">Hunderte Benutzer lieben Simy.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Demo & Gratis-Test – Simy | 60 Tage kostenlos testen',
  meta: [
    { name: 'description', content: 'Simy 60 Tage kostenlos testen. Keine Kreditkarte, keine Kündigung nötig. In 5 Minuten startklar. Jetzt Fahrschulsoftware Demo starten.' },
    { property: 'og:title', content: 'Demo & Gratis-Test – Simy | 60 Tage kostenlos' },
    { property: 'og:description', content: 'Simy 60 Tage kostenlos testen — keine Kreditkarte, keine Kündigung.' },
    { property: 'og:url', content: 'https://simy.ch/demo' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/demo' }],
})

const checks = ['Keine Kreditkarte nötig', '60 Tage vollständig kostenlos', 'Alle Features freigeschaltet (ausser Online-Zahlung)', 'Jederzeit kündbar', 'In 5 Min. eingerichtet']

const steps = [
  { title: 'Registrieren', desc: 'Angaben von der Fahrschule und Fahrlehrer eingeben — fertig. Keine weiteren Angaben nötig.' },
  { title: 'Einrichten', desc: 'Setup-Wizard führt dich durch Kategorien, Preise und Standorte.' },
  { title: 'Ausprobieren', desc: '60 Tage alle Features nutzen — Terminbuchung, Rechnungen, App, Website.' },
  { title: 'Entscheiden', desc: 'Nach 60 Tagen ab CHF 49/Mt. oder gratis kündigen — ohne Diskussion.' },
]

const trialFeatures = [
  { icon: '📅', title: 'Online-Terminbuchung', desc: 'Sofort Schüler einladen und mit echten Terminen testen.' },
  { icon: '💶', title: 'Einfache Rechnungsstellung', desc: 'Erste Rechnung in 2 Minuten erstellen und per Mail versenden.' },
  { icon: '📱', title: 'Fahrlehrer-App', desc: 'iOS und Android — sofort installieren und Kalender im Griff haben.' },
  { icon: '💵', title: 'Barzahlungen erfassen', desc: 'Barzahlungen direkt eingeben und jederzeit den aktuellen Stand im Überblick behalten.' },
  { icon: '🎨', title: 'Eigenes Branding', desc: 'Logo hochladen, Farben anpassen — Simy sieht innerhalb der App wie deine eigene App aus.' },
  { icon: '📊', title: 'Statistiken & Berichte', desc: 'Alle Einnahmen, Fahrstunden und Schüler auf einen Blick sehen.' },
]
</script>
