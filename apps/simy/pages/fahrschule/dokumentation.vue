<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="relative overflow-hidden pt-16 pb-20 px-6">
      <div class="absolute inset-0 simy-grid simy-grid-fade pointer-events-none opacity-80" />
      <div class="relative max-w-4xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <a href="/fahrschule" class="hover:text-gray-600">Fahrschule</a><span>›</span>
          <span class="text-gray-600">Dokumentation</span>
        </nav>
        <p class="text-xs font-bold uppercase tracking-widest mb-4" style="color: var(--brand-primary)">Fahrstunden dokumentieren</p>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-5 simy-display leading-tight">
          Bewertungen und PDF —<br />
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Schüler sehen den Stand
          </span>
        </h1>
        <p class="text-lg text-gray-500 leading-relaxed mb-8 max-w-2xl">
          Simy dokumentiert, was gefahren wurde. Der Schüler sieht dieselben Bewertungen im Portal und holt das PDF selbst. Die nächste Stunde planst du — nicht ein Modell.
        </p>
        <a :href="registerCta" class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
          30 Tage kostenlos testen
        </a>
      </div>
    </section>

    <section class="px-6 pb-8">
      <div class="max-w-lg mx-auto">
        <SimyEvalMock />
      </div>
    </section>

    <section class="py-20 px-6" data-reveal>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-10">So läuft eine dokumentierte Stunde</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="(step, i) in steps" :key="step.name" class="rounded-3xl border border-gray-100 p-6">
            <span class="text-xs font-black" style="color: var(--brand-primary)">0{{ i + 1 }}</span>
            <h3 class="font-bold text-gray-900 mt-2 mb-2">{{ step.name }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ step.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-20 px-6 bg-[#f7f6fa]" data-reveal>
      <div class="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">PDF für Dossier, Prüfung, Lehrerwechsel</h2>
          <p class="text-gray-500 leading-relaxed mb-6">
            Export aus dem Schülerdossier oder aus dem Portal. Kriterien und Skala sind pro Fahrschule anpassbar — mehrere Kategorien am selben Schüler bleiben getrennt.
          </p>
          <ul class="space-y-3 text-sm text-gray-600">
            <li v-for="b in bullets" :key="b" class="flex gap-2">
              <span style="color: var(--brand-primary)">✓</span>
              <span>{{ b }}</span>
            </li>
          </ul>
        </div>
        <SimyStudentPortalMock />
      </div>
    </section>

    <section class="py-20 px-6" data-reveal>
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center">Häufige Fragen</h2>
        <SimyFaqAccordion :items="faqs" />
      </div>
    </section>

    <section class="simy-closer py-24 px-6">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Dokumentation statt Zettel</h2>
        <p class="text-white/65 mb-8">30 Tage testen. Schüler sehen den Stand, sobald du bewertest.</p>
        <a :href="registerCta" class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg" style="color: var(--brand-primary)">
          Jetzt starten →
        </a>
      </div>
    </section>
    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { breadcrumbLd, faqPageLd, howToLd, ldScripts, softwareAppLd } from '~/utils/schema'

const { registerCta } = useRegisterCta('driving_school')

const steps = [
  { name: 'Stunde fahren', text: 'Kalender und Schüler sind schon da. Kein extra Formular vor der Fahrt.' },
  { name: 'In 30 Sekunden bewerten', text: 'Kriterien antippen, kurze Notiz. Skala und Katalog gehören der Fahrschule.' },
  { name: 'Schüler sieht es', text: 'Im Portal und als PDF. Du musst den Stand nicht per Chat nachreichen.' },
]

const bullets = [
  'Anpassbare Kriterien — nicht ein starres Bundeshalt.',
  'PDF-Export für Schule und Schüler.',
  'Mehrere Kategorien am selben Schüler, getrennte Verläufe.',
  'Kein automatischer Prüfungsentscheid. Du bewertest.',
]

const faqs = [
  { q: 'Sieht der Schüler die Bewertung sofort?', a: 'Ja. Was du als Bewertung speicherst, ist im Schülerportal sichtbar. Das PDF kann die Schule und der Schüler exportieren.' },
  { q: 'Kann ich die Lernpunkte anpassen?', a: 'Ja. Kategorien, Kriterien und Skala gehören zum Mandanten — nicht zu einer globalen Vorlage, die alle Schulen teilen.' },
  { q: 'Ersetzt das eine digitale Ausbildungskarte mit Assistenten?', a: 'Simy dokumentiert und macht den Stand für beide Seiten sichtbar. Vorschläge für die «nächste sinnvolle Lektion» oder GPS-Lernanalyse gehören nicht dazu.' },
  { q: 'Geht das auf dem Handy?', a: 'Ja. Nach der Stunde in der Fahrlehrer-App — derselbe Datenbestand wie am Computer.' },
]

useHead({
  title: 'Fahrstunden dokumentieren & PDF – Schüler sieht den Stand | Simy',
  meta: [
    { name: 'description', content: 'Fahrstunden dokumentieren: Bewertungen, anpassbare Kriterien und PDF-Export. Schüler sehen den Lernfortschritt jederzeit im Portal. 30 Tage kostenlos.' },
    { name: 'keywords', content: 'ausbildungskarte digital, fahrstunden bewerten software, lernfortschritt fahrschule, fahrstunde dokumentieren pdf' },
    { property: 'og:title', content: 'Fahrstunden dokumentieren & PDF | Simy' },
    { property: 'og:description', content: 'Bewertungen nach der Stunde. Schüler sehen den Stand und holen das PDF.' },
    { property: 'og:url', content: 'https://www.simy.ch/fahrschule/dokumentation' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.simy.ch/fahrschule/dokumentation' }],
  script: ldScripts(
    softwareAppLd({
      name: 'Simy Fahrstunden-Dokumentation',
      description: 'Bewertungen, anpassbare Kriterien und PDF-Export für Fahrschulen.',
      url: 'https://www.simy.ch/fahrschule/dokumentation',
    }),
    howToLd({
      name: 'Fahrstunde in Simy dokumentieren',
      description: 'Vom Termin zur sichtbaren Bewertung und zum PDF.',
      steps,
    }),
    faqPageLd(faqs),
    breadcrumbLd([
      { name: 'Simy', url: 'https://www.simy.ch/' },
      { name: 'Fahrschule', url: 'https://www.simy.ch/fahrschule' },
      { name: 'Dokumentation', url: 'https://www.simy.ch/fahrschule/dokumentation' },
    ]),
  ),
})
</script>
