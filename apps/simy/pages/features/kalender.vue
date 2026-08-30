<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-24 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-4xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <span class="hover:text-gray-600">Features</span><span>›</span>
          <span class="text-gray-600">Kalender & Planung</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Feature — Kalender
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Kalender & Planung —<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Dein Stundenplan auf Autopilot
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Immer aktuell, automatisch synchronisiert. Simy zeigt dir und deinen Kunden genau, wann wer wo gebucht ist — ohne manuelles Pflegen.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a :href="registerCta"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            Kostenlos testen →
          </a>
        </div>
      </div>
    </section>

    <section class="py-10 px-6 bg-[#f7f6fa] border-y border-gray-100">
      <div class="max-w-5xl mx-auto">
        <SimyShot
          src="/screenshots/desktop-calendar.webp"
          alt="Simy Wochenkalender — echte Produktansicht"
          caption="iCal: Simy-Termine im privaten Kalender · Privattermine sperren Buchungen"
          priority
        />
      </div>
    </section>

    <!-- Features -->
    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Alles was der Kalender kann</h2>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="f in calFeatures" :key="f.title"
            class="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all group">
            <SimyIconTile :name="f.icon" :size="44" class="group-hover:scale-110 transition-transform" />
            <div>
              <h3 class="font-bold text-gray-900 mb-1">{{ f.title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <SimyWebsiteHighlight
      title="Kalender allein reicht nicht — Kunden müssen dich finden"
      subtitle="Die Simy-Website ist die öffentliche Seite vor dem Buchungskalender. SEO, Preise, Bewertungen — dann erst der Termin."
    />

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Den Kalender heute noch ausprobieren</h2>
        <p class="text-white mb-8">30 Tage kostenlos — Keine Kreditkarte.</p>
        <a :href="registerCta"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Jetzt starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { breadcrumbLd, ldScripts, softwareAppLd, webPageLd } from '~/utils/schema'
const { registerCta } = useRegisterCta()

useHead({
  title: 'Kalender & Terminplanung – Simy | Online-Buchung Schweiz',
  meta: [
    { name: 'description', content: 'Der Simy Kalender synchronisiert alle Mitarbeiter automatisch. Online-Buchung, iCal-Sync, Erinnerungen. Für iOS, Android und Browser. 30 Tage kostenlos.' },
    { name: 'keywords', content: 'terminplanung software schweiz, online buchungskalender, kalender app dienstleister' },
    { property: 'og:title', content: 'Kalender & Terminplanung – Simy | Stundenplan auf Autopilot' },
    { property: 'og:description', content: 'Multi-Mitarbeiter-Kalender, iCal-Sync, automatische Erinnerungen. Alles synchronisiert.' },
    { property: 'og:url', content: 'https://www.simy.ch/features/kalender' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.simy.ch/features/kalender' }],
  script: ldScripts(
    webPageLd({
      name: 'Kalender & Terminplanung – Simy',
      description: 'Multi-Mitarbeiter-Kalender mit Online-Buchung, iCal-Sync und Erinnerungen.',
      url: 'https://www.simy.ch/features/kalender',
    }),
    softwareAppLd({
      name: 'Simy Kalender',
      description: 'Terminplanung und Kalender-Sync für Schweizer Selbständige und KMUs.',
      url: 'https://www.simy.ch/features/kalender',
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://www.simy.ch/' },
      { name: 'Features', url: 'https://www.simy.ch/features/kalender' },
      { name: 'Kalender', url: 'https://www.simy.ch/features/kalender' },
    ]),
  ),
})

const calFeatures = [
  { icon: 'refresh', title: 'Echtzeit-Synchronisation', desc: 'Änderungen sind sofort sichtbar — für dich, alle Mitarbeiter und deine Kunden.' },
  { icon: 'phone', title: 'Simy-Termine im privaten Kalender', desc: 'Jeder Termin erscheint automatisch in deinem Google Calendar, Apple Calendar oder Outlook. Du siehst deinen ganzen Tag in einer App — ohne manuelles Übertragen.' },
  { icon: 'spark', title: 'Privatkalender blockiert Verfügbarkeit automatisch', desc: 'Zahnarzt, Ferien oder ein privater Termin? Simy erkennt das und zeigt Kunden in dieser Zeit keine freien Slots. Du musst nichts extra einstellen.' },
  { icon: 'users', title: 'Multi-Mitarbeiter-Ansicht', desc: 'Alle Teammitglieder auf einem Bildschirm — klarer Überblick für Inhaber und Admin.' },
  { icon: 'palette', title: 'Farbcodierung', desc: 'Verschiedene Kategorien (Sitzung, Kurs, Workshop) in verschiedenen Farben.' },
  { icon: 'map-pin', title: 'Standort-Info', desc: 'Treffpunkt direkt im Termin — ein Klick öffnet die Navigation.' },
  { icon: 'bell', title: 'Automatische Erinnerungen', desc: '24h vor jedem Termin: E-Mail zuerst, SMS nur wenn keine E-Mail — Segmente inkl. im Plan.' },
  { icon: 'settings', title: 'Verfügbarkeits-Regeln', desc: 'Definiere Pufferzeit, maximale Tages-Buchungen und Vorlaufzeit pro Mitarbeiter.' },
  { icon: 'chart', title: 'Auslastungs-Ansicht', desc: 'Sieh auf einen Blick, wer wann noch freie Kapazität hat.' },
]
</script>
