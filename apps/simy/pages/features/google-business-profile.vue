<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="pt-20 pb-24 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-4xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <span class="hover:text-gray-600">Features</span><span>›</span>
          <span class="text-gray-600">Google Business Profile</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Add-on · CHF {{ price }} / Monat
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Google Business Profile automatisieren —<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            kostenlose Klicks, die sonst verloren gehen
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-6 leading-relaxed">
          Niemand nutzt das Potenzial seines Google-Unternehmensprofils. Folge: kostenlose Klicks auf Google Maps gehen verloren — und damit oft mehrere Tausend Franken Umsatz pro Monat.
        </p>
        <p class="text-lg text-gray-700 font-medium max-w-2xl mb-10">
          Automatisiere mit Simy dein Google Business Profile für CHF {{ price }}.– pro Monat und gewinne vollautomatisiert und regelmässig Neukunden.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a :href="registerCta"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            30 Tage testen — dann CHF {{ price }}/Mt.
          </a>
          <a href="/preise"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold border-2 transition-all hover:bg-gray-50"
            style="border-color: rgba(var(--brand-rgb),0.3); color: var(--brand-primary)">
            Preise ansehen
          </a>
        </div>
      </div>
    </section>

    <section class="py-14 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        <div v-for="stat in stats" :key="stat.label" class="rounded-2xl bg-white border border-gray-100 p-6">
          <p class="text-2xl font-black text-gray-900 mb-1">{{ stat.value }}</p>
          <p class="text-sm text-gray-500">{{ stat.label }}</p>
        </div>
      </div>
    </section>

    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Was die Automation konkret macht</h2>
          <p class="text-gray-500 max-w-2xl mx-auto">Einmal Google verbinden, Frequenz setzen, Fotos hochladen. Danach postet Simy — du musst nicht mehr jede Woche ins Unternehmensprofil.</p>
        </div>
        <p class="text-xs font-bold uppercase tracking-widest mb-5" style="color: var(--brand-primary)">Läuft von selbst</p>
        <div class="grid md:grid-cols-2 gap-6 mb-14">
          <div v-for="item in automations" :key="item.title" class="bg-white rounded-3xl p-7 border border-gray-100">
            <div class="flex items-center justify-between gap-3 mb-4">
              <SimyIconTile :name="item.icon" :size="48" />
              <span class="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style="background: rgba(var(--brand-rgb),0.08); color: var(--brand-primary)">Automatisch</span>
            </div>
            <h3 class="font-bold text-gray-900 mb-2 text-lg">{{ item.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ item.desc }}</p>
          </div>
        </div>
        <p class="text-xs font-bold uppercase tracking-widest mb-5 text-gray-400">Du steuerst in Simy</p>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="item in controls" :key="item.title" class="bg-white rounded-3xl p-7 border border-gray-100">
            <SimyIconTile :name="item.icon" :size="48" class="mb-5" />
            <h3 class="font-bold text-gray-900 mb-2 text-lg">{{ item.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-24 px-6 bg-gray-50">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Wer «in der Nähe» googelt, soll dich finden</h2>
          <p class="text-gray-500 max-w-2xl mx-auto">Lokale Suche ist branchenabhängig. Simy spricht genau die Suchanfragen an, die bei dir zu Terminen werden.</p>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <a
            v-for="ind in industries"
            :key="ind.slug"
            :href="`/${ind.slug}`"
            class="rounded-2xl bg-white border border-gray-100 p-5 hover:border-gray-200 transition-all"
          >
            <p class="font-bold text-gray-900">{{ ind.label }}</p>
            <p class="text-sm text-gray-500 mt-1">Suche: «{{ ind.search }}»</p>
            <p class="text-xs text-gray-400 mt-2">Ohne Profil-Pflege verloren: {{ ind.lost }}</p>
          </a>
        </div>
      </div>
    </section>

    <SimyWebsiteHighlight
      title="Website plus Google-Profil — beides muss zusammenpassen"
      subtitle="Name, Adresse und Telefon identisch. Simy-Website und Google Business Profile verstärken sich: Maps bringt den Klick, die Landingpage die Buchung."
    />

    <section class="py-24 px-6">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-10 text-center">Häufige Fragen</h2>
        <div class="space-y-3">
          <div v-for="(faq, i) in faqs" :key="i" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              class="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-50"
              @click="openFaq = openFaq === i ? null : i"
            >
              {{ faq.q }}
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform" :class="openFaq === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-if="openFaq === i" class="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
              <div class="pt-4">{{ faq.a }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Hör auf, kostenlose Maps-Klicks zu verschenken</h2>
        <p class="text-white/80 mb-8">CHF {{ price }} / Monat. Zubuchbar zu jedem Simy-Plan. 30 Tage die Software testen — keine Kreditkarte.</p>
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
import { ADDON_GBP_CHF } from '~/data/pricing'
import { GBP_AUTOMATIONS, GBP_CONTROLS, GBP_INDUSTRIES, GBP_PATH } from '~/data/gbp'
import { breadcrumbLd, faqPageLd, ldScripts, softwareAppLd, webPageLd } from '~/utils/schema'

const { registerCta } = useRegisterCta()
const price = ADDON_GBP_CHF
const industries = GBP_INDUSTRIES
const openFaq = ref<number | null>(0)

const stats = [
  { value: `CHF ${price}`, label: 'pro Monat — Add-on für jeden Plan' },
  { value: '1–4×', label: 'Posts pro Woche aus dem Jahreskalender' },
  { value: '1–3×', label: 'Fotos pro Woche aus deinem Pool' },
]

const automations = GBP_AUTOMATIONS
const controls = GBP_CONTROLS

const faqs = [
  { q: 'Was kostet die Google-Business-Automation?', a: `CHF ${price} pro Monat, zubuchbar zu jedem Simy-Plan (Starter, Professional, Enterprise).` },
  { q: 'Warum verliere ich Umsatz ohne gepflegtes Profil?', a: 'Die meisten suchen lokal bei Google Maps, nicht auf deiner Website. Ein stilles Profil mit alten Fotos und unbeantworteten Bewertungen wird weniger gezeigt. Diese kostenlosen Klicks gehen an Betriebe, die ihr Profil nutzen — oft mehrere Tausend Franken Umsatz pro Monat.' },
  { q: 'Was macht Simy konkret im Google Business Profile?', a: 'Jahreskalender: KI plant 12 Monate und postet 1–4× pro Woche inkl. Buchungs-Button. Foto-Pool: du lädst Bilder, Simy veröffentlicht 1–3× pro Woche mit KI-Text. Reviews: neue Bewertungen werden automatisch beantwortet. Plus mehrere Standorte, Profil/Leistungen und Insights (Aufrufe, Anrufe, Website-Klicks, Routen).' },
  { q: 'Muss ich noch selbst bei Google einloggen?', a: 'Einmal verbinden. Danach laufen Kalender, Foto-Pool und Review-Antworten ohne wöchentliches Google-Login.' },
  { q: 'Für welche Branchen lohnt sich das?', a: 'Für jeden lokalen Terminbetrieb: Fahrschule, Coaching, Consulting, Personal Training, Nachhilfe, Musikschule, Hundeschule, Massage. Überall dort, wo Kunden «in der Nähe» googeln.' },
  { q: 'Brauche ich dafür die volle Simy-Software?', a: 'Ja. Das Add-on hängt am Simy-Abo. Die Website allein hostet deine Landingpage — das Google-Profil automatisierst du mit der Software.' },
]

useHead({
  title: 'Google Business Profile automatisieren Schweiz – CHF 19/Monat | Simy',
  meta: [
    { name: 'description', content: `Google Business Profile automatisieren: Jahreskalender-Posts, Foto-Pool, KI-Review-Antworten, mehrere Standorte und Insights. CHF ${price}/Monat. Kostenlose Maps-Klicks zurückholen.` },
    { name: 'keywords', content: 'google business profile automatisieren, google unternehmen profil software, google maps ranking schweiz, google business profile fahrschule, google maps coach, lokales seo google unternehmen, gbp automation schweiz' },
    { property: 'og:title', content: 'Google Business Profile automatisieren – Simy | CHF 19/Monat' },
    { property: 'og:description', content: 'Jahreskalender postet von selbst, Fotos gehen live, Reviews werden automatisch beantwortet. CHF 19/Monat — kostenlose Maps-Klicks zurückholen.' },
    { property: 'og:url', content: `https://www.simy.ch${GBP_PATH}` },
  ],
  link: [{ rel: 'canonical', href: `https://www.simy.ch${GBP_PATH}` }],
  script: ldScripts(
    softwareAppLd({
      name: 'Simy Google Business Profile Automation',
      description: 'Google Business Profile aus Simy: Jahreskalender-Posts, Foto-Pool, KI-Review-Antworten, mehrere Standorte und Insights.',
      url: `https://www.simy.ch${GBP_PATH}`,
      price,
    }),
    webPageLd({
      name: 'Google Business Profile automatisieren',
      description: 'Kostenlose Google-Maps-Klicks zurückholen — GBP-Automation für CHF 19/Monat.',
      url: `https://www.simy.ch${GBP_PATH}`,
    }),
    faqPageLd(faqs),
    breadcrumbLd([
      { name: 'Simy', url: 'https://www.simy.ch/' },
      { name: 'Features', url: 'https://www.simy.ch/features/kalender' },
      { name: 'Google Business Profile', url: `https://www.simy.ch${GBP_PATH}` },
    ]),
  ),
})
</script>
