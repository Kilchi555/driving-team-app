<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="relative overflow-hidden pt-16 pb-20 px-6">
      <div class="absolute inset-0 simy-grid simy-grid-fade pointer-events-none opacity-80" />
      <div class="relative max-w-5xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <a href="/fahrschule" class="hover:text-gray-600">Fahrschule</a><span>›</span>
          <span class="text-gray-600">Schülerportal</span>
        </nav>
        <div class="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest mb-4" style="color: var(--brand-primary)">Schülerportal</p>
            <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-5 simy-display leading-tight">
              Was der Schüler sieht —<br />
              <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                derselbe Stand wie du
              </span>
            </h1>
            <p class="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl">
              Termine, Fortschritt, Guthaben und Dokumente. Kein WhatsApp-Pingpong, keine zweite Wahrheit in Excel.
            </p>
            <div class="flex flex-col sm:flex-row gap-3">
              <a :href="registerCta" class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
                30 Tage kostenlos testen
              </a>
              <a href="/fahrschule/dokumentation" class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold border border-gray-200 text-gray-700 hover:bg-gray-50">
                Dokumentation ansehen
              </a>
            </div>
          </div>
          <div class="relative mx-auto lg:mx-0 lg:ml-auto">
            <SimyStudentPortalMock />
          </div>
        </div>
      </div>
    </section>

    <section class="py-20 px-6" data-reveal>
      <div class="max-w-5xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
        <SimyEvalMock />
        <div>
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary)">Im Portal</p>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Vier Dinge, die der Chat nicht kann</h2>
          <ul class="space-y-4">
            <li v-for="item in sees" :key="item.title" class="flex gap-4">
              <SimyIconTile :name="item.icon" :size="40" rounded="xl" />
              <div>
                <h3 class="font-bold text-gray-900">{{ item.title }}</h3>
                <p class="text-sm text-gray-500 leading-relaxed">{{ item.desc }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="py-20 px-6 bg-[#f7f6fa]" data-reveal>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-3">Was der Schüler nicht sieht</h2>
        <p class="text-gray-500 mb-10 max-w-2xl">Rollen steuern den Zugriff. Das Portal ist kein zweites Büro.</p>
        <div class="grid sm:grid-cols-3 gap-4">
          <div v-for="item in hidden" :key="item" class="rounded-2xl bg-white border border-gray-100 p-5 text-sm text-gray-600">
            {{ item }}
          </div>
        </div>
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
        <h2 class="text-3xl font-black text-white mb-4">Schüler-Login in 30 Tagen testen</h2>
        <p class="text-white/65 mb-8">Keine Kreditkarte. Du lädst ein — der Schüler sieht nur seinen Bereich.</p>
        <a :href="registerCta" class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg" style="color: var(--brand-primary)">
          Jetzt starten →
        </a>
      </div>
    </section>
    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { breadcrumbLd, faqPageLd, ldScripts, softwareAppLd } from '~/utils/schema'

const { registerCta } = useRegisterCta('driving_school')

const sees = [
  { icon: 'calendar', title: 'Nächster Termin', desc: 'Bestätigen oder absagen — in den Fristen, die du setzt. Ohne Screenshot-Pingpong.' },
  { icon: 'graduate', title: 'Fortschritt & Bewertungen', desc: 'Was nach der Stunde dokumentiert wurde, ist im Portal sichtbar. PDF inklusive.' },
  { icon: 'wallet', title: 'Guthaben & offene Beträge', desc: 'Paketstand und Restzahlung — derselbe Stand wie in deiner Kasse.' },
  { icon: 'folder', title: 'Dokumente', desc: 'Lernfahrausweis und Beilagen hochladen. Du siehst sie im Dossier, nicht in WhatsApp.' },
]

const hidden = [
  'Interne Notizen und Admin-Zahlen bleiben intern.',
  'Andere Schüler und deren Zahlungen sind unsichtbar.',
  'Konto nur über Einladung der Fahrschule — kein öffentliches Registrieren.',
]

const faqs = [
  { q: 'Braucht der Schüler eine App aus dem Store?', a: 'Nein. Das Portal läuft im Browser auf dem Handy. Die Fahrlehrer-App für iOS und Android ist separat — für dich, nicht für den Schüler.' },
  { q: 'Sieht der Schüler alle Bewertungen?', a: 'Ja, den dokumentierten Lernstand und das PDF. Interne Kommentare, die du nicht als Bewertung speicherst, bleiben bei der Fahrschule.' },
  { q: 'Kann der Schüler selbst buchen?', a: 'Ja, über den Buchungslink und im Portal — nur Zeiten, die wirklich frei und im Radius sind.' },
  { q: 'Was ist mit Guthaben?', a: 'Gekaufte Stunden und der Abzug nach der Lektion stehen im Portal. Teilzahlungen und offene Restbeträge ebenfalls.' },
]

useHead({
  title: 'Schülerportal Fahrschule – Termine, Fortschritt, Guthaben | Simy',
  meta: [
    { name: 'description', content: 'Schülerportal für Fahrschulen: Termine, Lernfortschritt, Guthaben und Dokumente — derselbe Stand für Schüler und Fahrschule. 30 Tage kostenlos.' },
    { name: 'keywords', content: 'schülerportal fahrschule, schüler app fahrschule, fahrschule login schüler, lernfortschritt fahrschule' },
    { property: 'og:title', content: 'Schülerportal Fahrschule | Simy' },
    { property: 'og:description', content: 'Termine, Fortschritt, Guthaben und Dokumente — ohne WhatsApp-Chaos.' },
    { property: 'og:url', content: 'https://www.simy.ch/fahrschule/schuelerportal' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.simy.ch/fahrschule/schuelerportal' }],
  script: ldScripts(
    softwareAppLd({
      name: 'Simy Schülerportal',
      description: 'Schülerportal für Fahrschulen: Termine, Fortschritt, Guthaben und Dokumente.',
      url: 'https://www.simy.ch/fahrschule/schuelerportal',
    }),
    faqPageLd(faqs),
    breadcrumbLd([
      { name: 'Simy', url: 'https://www.simy.ch/' },
      { name: 'Fahrschule', url: 'https://www.simy.ch/fahrschule' },
      { name: 'Schülerportal', url: 'https://www.simy.ch/fahrschule/schuelerportal' },
    ]),
  ),
})
</script>
