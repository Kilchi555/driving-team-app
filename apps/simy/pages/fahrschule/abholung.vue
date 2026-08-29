<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="relative overflow-hidden pt-16 pb-16 px-6">
      <div class="absolute inset-0 simy-grid simy-grid-fade pointer-events-none opacity-80" />
      <div class="relative max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
            <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
            <a href="/fahrschule" class="hover:text-gray-600">Fahrschule</a><span>›</span>
            <span class="text-gray-600">Abholung</span>
          </nav>
          <p class="text-xs font-bold uppercase tracking-widest mb-4" style="color: var(--brand-primary)">Eigener Treffpunkt</p>
          <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-5 simy-display leading-tight">
            Abholung, die zeitlich<br />
            <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
              wirklich passt
            </span>
          </h1>
          <p class="text-lg text-gray-500 leading-relaxed mb-8">
            Der Schüler wählt den Treffpunkt. Simy rechnet Fahrzeit vom Standort — nicht Kilometer auf der Karte. Liegt die Adresse ausserhalb oder passt die Fahrt nicht zwischen zwei Stunden, ist der Slot einfach nicht da.
          </p>
          <a :href="registerCta" class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
            30 Tage kostenlos testen
          </a>
        </div>
        <SimyPickupGadget />
      </div>
    </section>

    <section class="py-20 px-6 bg-[#f7f6fa]" data-reveal>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-3">Zwei Prüfungen — nicht eine Distanz</h2>
        <p class="text-gray-500 mb-10 max-w-2xl">Viele Systeme zeichnen einen Kreis. Simy trennt Radius und Kalenderlücke.</p>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="rounded-3xl bg-white border border-gray-100 p-7">
            <SimyIconTile name="compass" :size="44" class="mb-4" />
            <h3 class="font-bold text-gray-900 mb-2">1. Pickup-Radius in Minuten</h3>
            <p class="text-sm text-gray-500 leading-relaxed">
              Pro Standort — optional pro Kategorie — gilt eine maximale <strong class="text-gray-700">Fahrzeit</strong> (typisch 10, einstellbar bis 120). Der Schüler gibt eine Schweizer PLZ oder Adresse. Liegt der Treffpunkt ausserhalb, erscheint kein Termin.
            </p>
          </div>
          <div class="rounded-3xl bg-white border border-gray-100 p-7">
            <SimyIconTile name="clock" :size="44" class="mb-4" />
            <h3 class="font-bold text-gray-900 mb-2">2. Lücke plus Puffer</h3>
            <p class="text-sm text-gray-500 leading-relaxed">
              Vorher Dietikon, danach Pickup in Dübendorf: der Slot kommt nur, wenn die gespeicherte Fahrzeit (Hauptverkehr oder Nebenzeit) <strong class="text-gray-700">plus Puffer</strong> in die Lücke passt. Sonst sieht der Schüler die Zeit nicht.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-20 px-6" data-reveal>
      <div class="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Getrennt von der Anfahrtsgebühr</h2>
          <p class="text-gray-500 leading-relaxed mb-6">
            Ob ein Slot existiert, entscheidet die Fahrzeit. Was er kostet, ist optional: Franken pro Kilometer, Freibetrag, Deckel. Auf der öffentlichen Seite steht «Eigener Treffpunkt — Adresse bei der Buchung». Private Abholadressen werden nicht publiziert.
          </p>
          <ul class="space-y-3 text-sm text-gray-600">
            <li class="flex gap-2"><span style="color: var(--brand-primary)">✓</span> Maximale Anfahrt zusätzlich pro Fahrlehrer möglich</li>
            <li class="flex gap-2"><span style="color: var(--brand-primary)">✓</span> Einbettbar auf der bestehenden Website</li>
            <li class="flex gap-2"><span style="color: var(--brand-primary)">✓</span> Kein GPS-Tracking der Fahrt, kein Lernmodell</li>
          </ul>
          <a href="/fahrschule/buchungssystem" class="inline-flex mt-6 text-sm font-semibold" style="color: var(--brand-primary)">
            Zur Online-Buchung →
          </a>
        </div>
        <SimyPickupResultMock />
      </div>
    </section>

    <section class="py-20 px-6 bg-[#f7f6fa]" data-reveal>
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center">Häufige Fragen</h2>
        <SimyFaqAccordion :items="faqs" />
      </div>
    </section>

    <section class="simy-closer py-24 px-6">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Radius einmal setzen. Slots bleiben ehrlich.</h2>
        <p class="text-white/65 mb-8">30 Tage testen. Keine Kreditkarte.</p>
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

const faqs = [
  { q: 'Ist der Radius Kilometer oder Minuten?', a: 'Minuten Fahrzeit vom Standort-PLZ. Kein Kreis auf der Karte. Default oft 10 Minuten, einstellbar zwischen 0 und 120, pro Standort und optional pro Kategorie.' },
  { q: 'Warum sehe ich als Schüler keine Termine?', a: 'Entweder liegt der Treffpunkt ausserhalb des Radius, oder die Fahrt plus Puffer passt nicht zwischen zwei bestehende Stunden. Simy erfindet keine Verfügbarkeit.' },
  { q: 'Was ist die Anfahrtsgebühr?', a: 'Ein optionaler Preis (Franken pro km, Freibetrag, Deckel). Sie entscheidet nicht, ob ein Slot existiert — nur, was die Fahrt zusätzlich kostet.' },
  { q: 'Wird die Abholadresse öffentlich?', a: 'Nein. Die Website zeigt «Eigener Treffpunkt im Radius». Die Adresse gehört in die Buchung, nicht auf die Landingpage.' },
]

useHead({
  title: 'Abholung Fahrschule – Treffpunkt im Fahrzeit-Radius | Simy',
  meta: [
    { name: 'description', content: 'Abholung und eigener Treffpunkt für Fahrschulen: Simy prüft Fahrzeit in Minuten plus Kalenderlücke. Was nicht passt, ist nicht buchbar. 30 Tage kostenlos.' },
    { name: 'keywords', content: 'fahrlehrer abholen, fahrstunde treffpunkt, abholung fahrschule, pickup radius fahrschule' },
    { property: 'og:title', content: 'Abholung Fahrschule – Fahrzeit-Radius | Simy' },
    { property: 'og:description', content: 'Schüler wählen den Treffpunkt. Simy rechnet Fahrzeit, nicht Luftlinie.' },
    { property: 'og:url', content: 'https://www.simy.ch/fahrschule/abholung' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.simy.ch/fahrschule/abholung' }],
  script: ldScripts(
    softwareAppLd({
      name: 'Simy Abholung & Treffpunkt',
      description: 'Pickup-Radius in Fahrzeit und Slot-Filter mit Puffer für Fahrschulen.',
      url: 'https://www.simy.ch/fahrschule/abholung',
    }),
    howToLd({
      name: 'Treffpunkt in Simy prüfen',
      description: 'Vom Radius zur ehrlichen Buchung.',
      steps: [
        { name: 'Radius setzen', text: 'Pro Standort die maximale Fahrzeit in Minuten festlegen.' },
        { name: 'Schüler gibt PLZ ein', text: 'Simy prüft, ob der Treffpunkt in dieser Fahrzeit liegt.' },
        { name: 'Lücke prüfen', text: 'Nur Slots, in die Fahrzeit plus Puffer passen, erscheinen.' },
      ],
    }),
    faqPageLd(faqs),
    breadcrumbLd([
      { name: 'Simy', url: 'https://www.simy.ch/' },
      { name: 'Fahrschule', url: 'https://www.simy.ch/fahrschule' },
      { name: 'Abholung', url: 'https://www.simy.ch/fahrschule/abholung' },
    ]),
  ),
})
</script>
