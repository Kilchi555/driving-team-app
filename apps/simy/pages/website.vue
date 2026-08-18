<template>
  <div class="min-h-screen bg-[#fbfaf8] font-sans text-gray-800">
    <SimyNav />

    <section class="pt-20 pb-16 px-6 relative overflow-hidden">
      <div class="simy-glow -top-48 left-1/2 -translate-x-1/3 opacity-70" />
      <div class="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
            <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
            <span class="text-gray-600">Website-Generator</span>
          </nav>
          <a
            href="#preise"
            class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium mb-7 border border-black/[0.06] bg-white/70 backdrop-blur"
            style="color: var(--brand-primary)"
          >
            Einmalig CHF {{ setup }} · Hosting ab CHF {{ host }}
            <span class="opacity-50">→</span>
          </a>
          <h1 class="text-[2.6rem] md:text-[4.4rem] text-gray-900 mb-6 simy-display">
            Website in Minuten.
            <span
              class="block"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
            >
              Gefunden bei Google.
            </span>
          </h1>
          <p class="text-lg text-gray-500/90 max-w-md mb-9 leading-relaxed font-normal">
            Preise, Standorte, Bewertungen — und im Hintergrund die Daten, die Google und ChatGPT lesen.
            Vorschau sofort. Live erst, wenn du bereit bist.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 mb-5">
            <a
              :href="websiteRegisterCta"
              class="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-white font-semibold transition-transform hover:-translate-y-0.5"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 14px 40px rgba(var(--brand-rgb),0.28)"
            >
              Website jetzt erstellen
            </a>
            <a
              href="#preise"
              class="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-medium border border-black/[0.08] bg-white/60 text-gray-700 hover:bg-white transition-all"
            >
              Preise
            </a>
          </div>
          <p class="text-sm text-gray-400">30 Tage einrichten · keine automatische Belastung</p>
        </div>
        <SimyProductFrame preview-host="simy.ch/s/dein-betrieb" />
      </div>
    </section>

    <section class="px-6 pb-4">
      <div class="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-gray-400">
        <template v-for="(stat, i) in stats" :key="stat.label">
          <span v-if="i" class="hidden sm:inline text-gray-200">·</span>
          <span><strong class="text-gray-700 font-medium">{{ stat.value }}</strong> {{ stat.label }}</span>
        </template>
      </div>
    </section>

    <section class="py-28 px-6" data-reveal>
      <div class="max-w-5xl mx-auto">
        <p class="text-[13px] mb-3" style="color: var(--brand-primary)">Das Problem</p>
        <h2 class="text-3xl md:text-5xl text-gray-900 mb-5 simy-display max-w-2xl">Die meisten KMU-Websites bringen keine Kunden</h2>
        <p class="text-gray-500 text-lg max-w-xl mb-12 leading-relaxed">
          Wix, Jimdo oder eine Agentur-Seite für CHF 5'000 — und trotzdem keine Anfragen.
        </p>
        <div class="grid md:grid-cols-3 gap-px bg-black/[0.06] rounded-3xl overflow-hidden border border-black/[0.06]">
          <div v-for="pain in pains" :key="pain.title" class="bg-[#fbfaf8] p-8">
            <h3 class="font-semibold text-gray-900 mb-2">{{ pain.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ pain.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-20 px-6" data-reveal>
      <div class="max-w-5xl mx-auto">
        <p class="text-[13px] mb-3" style="color: var(--brand-primary)">Ablauf</p>
        <h2 class="text-3xl md:text-5xl text-gray-900 mb-14 simy-display">Drei Schritte. Dann live.</h2>
        <div class="grid md:grid-cols-3 gap-10">
          <div v-for="(step, i) in steps" :key="step.title">
            <p class="text-5xl font-semibold mb-5 tabular-nums" style="color: rgba(var(--brand-rgb),0.28)">0{{ i + 1 }}</p>
            <h3 class="font-semibold text-gray-900 mb-2 text-lg">{{ step.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ step.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-20 px-6" data-reveal>
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl md:text-5xl text-gray-900 mb-4 simy-display">Was die Seite mitbringt</h2>
        <p class="text-gray-500 text-lg max-w-md mb-12">Gebaut für lokale Suche — nicht als Broschüre.</p>
        <div class="grid md:grid-cols-4 gap-4">
          <div
            v-for="(f, i) in features"
            :key="f.title"
            class="rounded-3xl p-6 border border-black/[0.05] bg-white/70"
            :class="i === 0 ? 'md:col-span-2 md:row-span-2 min-h-[220px]' : ''"
          >
            <SimyIconTile :name="f.icon" :size="i === 0 ? 52 : 40" />
            <h3 class="font-semibold text-gray-900 mt-4 mb-1" :class="i === 0 ? 'text-xl' : ''">{{ f.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="preise" class="py-24 px-6" data-reveal>
      <div class="max-w-5xl mx-auto">
        <div class="mb-14 max-w-xl">
          <p class="text-[13px] mb-3" style="color: var(--brand-primary)">Preise</p>
          <h2 class="text-3xl md:text-5xl text-gray-900 mb-4 simy-display">Klar. Einmalig. Ohne Abo-Falle.</h2>
          <p class="text-gray-500 leading-relaxed">
            30 Tage einrichten und Vorschau teilen — ohne Zahlung. Live erst, wenn die Homepage steht.
          </p>
        </div>
        <div class="grid md:grid-cols-3 gap-5">
          <div v-for="plan in websitePlans" :key="plan.name" class="rounded-3xl p-8 bg-white/80 flex flex-col" :class="plan.highlight ? 'simy-gradient-border' : 'border border-black/[0.05]'" :style="plan.highlight ? 'box-shadow: 0 24px 50px rgba(var(--brand-rgb),0.1)' : ''">
            <p class="text-[12px] font-medium mb-2" style="color: var(--brand-primary)">{{ plan.badge }}</p>
            <h3 class="font-semibold text-xl text-gray-900 mb-1">{{ plan.name }}</h3>
            <p class="text-sm text-gray-400 mb-5">{{ plan.tagline }}</p>
            <div class="flex items-baseline gap-1 mb-6">
              <span class="text-4xl text-gray-900 simy-display">CHF {{ plan.price }}</span>
              <span class="text-sm text-gray-400">{{ plan.suffix }}</span>
            </div>
            <ul class="space-y-2.5 mb-8 flex-1">
              <li v-for="item in plan.items" :key="item" class="flex items-start gap-2.5 text-sm text-gray-700">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" style="color: var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ item }}
              </li>
            </ul>
            <a
              :href="websiteRegisterCta"
              class="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl text-sm font-bold transition-all"
              :class="plan.highlight ? 'text-white' : 'border border-gray-200 text-gray-800 hover:bg-gray-50'"
              :style="plan.highlight ? 'background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' : ''"
            >
              {{ plan.cta }}
            </a>
          </div>
        </div>
        <div class="text-center mt-10">
          <a
            :href="websiteRegisterCta"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
          >
            Kostenlos starten — Vorschau in Minuten →
          </a>
          <p class="text-xs text-gray-400 mt-3">Kein Abo beim Start. Zahlung erst bei Live oder nach 30 Tagen Hosting-Wahl.</p>
        </div>
      </div>
    </section>

    <section class="py-24 px-6" data-reveal>
      <div class="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p class="text-[13px] mb-3" style="color: var(--brand-primary)">Beispiel</p>
          <h2 class="text-3xl md:text-5xl text-gray-900 mb-4 simy-display">So sieht eine generierte Seite aus</h2>
          <p class="text-gray-500 mb-7 leading-relaxed">Fahrschule Muster — Preise, Standorte, Buchung. Kein Agentur-Projekt.</p>
          <a
            href="https://app.simy.ch/s/fahrschule-muster?preview=1"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm font-semibold"
            style="color: var(--brand-primary)"
          >
            Beispiel in einem neuen Tab →
          </a>
        </div>
        <SimyProductFrame preview-host="app.simy.ch/s/fahrschule-muster" />
      </div>
    </section>

    <section class="py-20 px-6" data-reveal>
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl md:text-5xl text-gray-900 mb-10 simy-display">Simy vs. Baukasten</h2>
        <div class="overflow-x-auto rounded-3xl border border-black/[0.05] bg-white/70">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left">
              <tr>
                <th class="px-5 py-3 font-bold text-gray-700"> </th>
                <th class="px-5 py-3 font-bold" style="color: var(--brand-primary)">Simy Website</th>
                <th class="px-5 py-3 font-bold text-gray-500">Baukasten</th>
                <th class="px-5 py-3 font-bold text-gray-500">Agentur</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="row in compare" :key="row.label">
                <td class="px-5 py-3.5 font-medium text-gray-900">{{ row.label }}</td>
                <td class="px-5 py-3.5 text-gray-800 font-semibold">{{ row.simy }}</td>
                <td class="px-5 py-3.5 text-gray-500">{{ row.builder }}</td>
                <td class="px-5 py-3.5 text-gray-500">{{ row.agency }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="py-16 px-6">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl text-gray-900 mb-3 simy-display">Für jede Branche vorbereitet</h2>
        <p class="text-gray-500 mb-8">Texte und SEO-Vorlagen — nicht eine generische Hülle.</p>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="link in branchenLinks"
            :key="link.href"
            :href="link.href"
            class="text-sm font-medium px-4 py-2 rounded-full border border-black/[0.06] bg-white/70 text-gray-600 hover:text-gray-900 hover:border-black/10 transition-all"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </section>

    <section class="py-24 px-6" data-reveal>
      <div class="max-w-2xl mx-auto">
        <h2 class="text-3xl md:text-5xl text-gray-900 mb-10 simy-display">Fragen</h2>
        <div class="space-y-2">
          <div v-for="(faq, i) in faqs" :key="faq.q" class="bg-white/70 rounded-2xl border border-black/[0.05] overflow-hidden">
            <button
              class="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              @click="openFaq = openFaq === i ? null : i"
            >
              {{ faq.q }}
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform" :class="openFaq === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="openFaq === i" class="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
              <div class="pt-4">{{ faq.a }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="simy-closer py-28 px-6">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl md:text-5xl text-white mb-5 simy-display">Heute noch als Vorschau.</h2>
        <p class="text-white/50 mb-9 leading-relaxed">Konto, Inhalte, Link teilen. Zahlen erst bei Live.</p>
        <a
          :href="websiteRegisterCta"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white font-semibold text-lg hover:-translate-y-0.5 transition-transform"
          style="color: var(--brand-primary)"
        >
          Website erstellen
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { WEBSITE_CARE_CHF, WEBSITE_HOST_CHF, WEBSITE_SETUP_CHF } from '~/data/pricing'
import { breadcrumbLd, faqPageLd, howToLd, ldScripts, productOffersLd, webPageLd } from '~/utils/schema'

const { websiteRegisterCta } = useWebsiteRegisterCta()
const openFaq = ref<number | null>(0)
const setup = WEBSITE_SETUP_CHF
const host = WEBSITE_HOST_CHF
const care = WEBSITE_CARE_CHF

const stats = [
  { value: `${setup}`, label: 'CHF einmalig Setup' },
  { value: `${host}`, label: 'CHF/Mt. Hosting' },
  { value: '30', label: 'Tage Vorschau gratis' },
  { value: 'AI', label: 'Daten im Hintergrund, nicht nur Design' },
]

const pains = [
  { title: 'Baukasten ohne SEO', text: 'Wix & Co. sind langsam, voller Tracking-Scripts und selten für lokale Schweizer Suche gebaut. Schön — aber unsichtbar.' },
  { title: 'Agentur für Tausende', text: 'Einmalige Projekte, dann niemand pflegt Texte, Preise oder Bewertungen. Nach einem Jahr ist die Seite veraltet.' },
  { title: 'Website ohne Buchung', text: 'Besucher müssen anrufen oder mailen. Simy verbindet Seite, Preise und — wenn du willst — später die volle Software.' },
]

const steps = [
  { title: 'Konto eröffnen', text: 'Branche, Firmenname, Ort, E-Mail — fertig. Kein Mitarbeiter-Setup, keine Kreditkarte. Du landest direkt im Website-Wizard.' },
  { title: 'Inhalte & Vorschau', text: 'Blöcke, Texte, Farben, Standorte. Die Vorschau ist sofort teilbar — intern oder mit Kunden. Noch nichts ist öffentlich.' },
  { title: 'Live schalten', text: 'Wenn die Homepage steht: einmalig CHF 490 plus Host oder Care. Danach ist die Seite unter deinem Simy-Link live.' },
]

const features = [
  { icon: 'search', title: 'SEO- und AI-optimiert', desc: 'Nicht das Design ist «AI-optimiert» — sondern die Daten dahinter: Leistungen, Ort, Preise, FAQ als strukturierte Informationen. Genau das lesen Google, Maps und ChatGPT aus.' },
  { icon: 'globe', title: 'Schnell auf Mobil', desc: 'Leichte Landingpage, klare CTAs, keine Baukasten-Bloatware. Ladezeit ist ein Ranking-Faktor — und Conversion.' },
  { icon: 'wallet', title: 'Preise & Standorte live', desc: 'Inhalte kommen aus deinen Betriebsdaten. Kein Copy-Paste in ein zweites CMS, wenn sich ein Preis ändert.' },
  { icon: 'award', title: 'Bewertungen sichtbar', desc: 'Social Proof auf der Seite, nicht nur auf Google. Vertrauen, bevor jemand anruft.' },
  { icon: 'palette', title: 'Dein Branding', desc: 'Farben, Logo, Ton. Die Seite sieht nach deinem Betrieb aus — nicht nach einer Vorlage von 2019.' },
  { icon: 'spark', title: 'Später erweiterbar', desc: 'Nur Website heute. Wenn du Termine, Rechnungen und App willst, bleibt derselbe Account — ohne Neuaufbau.' },
]

const websitePlans = [
  {
    name: 'Setup',
    badge: 'Einmalig',
    tagline: 'Wenn die Homepage live geht',
    price: setup,
    suffix: ' einmalig',
    highlight: false,
    items: ['Professionelle Landingpage', 'Strukturierte Daten im Hintergrund', 'Zahlung erst bei Go-Live', 'Kein Abo für die Erstellung'],
    cta: 'Jetzt starten',
  },
  {
    name: 'Host',
    badge: 'Hosting',
    tagline: 'Seite bleibt schnell & online',
    price: host,
    suffix: '/Monat',
    highlight: true,
    items: ['Hosting & SSL', 'Updates & Performance', 'Vorschau bleibt kostenlos', 'Monatlich kündbar'],
    cta: 'Mit Hosting starten',
  },
  {
    name: 'Care',
    badge: 'Hosting + Pflege',
    tagline: 'Wir halten die Seite scharf',
    price: care,
    suffix: '/Monat',
    highlight: false,
    items: ['Alles aus Host', 'Inhaltliche Begleitung', 'SEO-Feinschliff', 'Für Betriebe ohne Zeit'],
    cta: 'Mit Care starten',
  },
]

const compare = [
  { label: 'Zeit bis Vorschau', simy: 'Minuten', builder: 'Stunden–Tage', agency: 'Wochen' },
  { label: 'Startkosten', simy: `CHF ${setup}`, builder: 'Abo + Templates', agency: 'CHF 3’000–15’000' },
  { label: 'Laufend', simy: `ab CHF ${host}/Mt.`, builder: 'CHF 20–80/Mt.', agency: 'Retainer oder nichts' },
  { label: 'SEO / Google', simy: 'Ja, eingebaut', builder: 'Oft schwach', agency: 'Nur wenn beauftragt' },
  { label: 'AI-Suche (ChatGPT & Co.)', simy: 'Daten im Hintergrund', builder: 'Selten', agency: 'Nur wenn beauftragt' },
  { label: 'Schweizer Support', simy: 'Ja, auf Deutsch', builder: 'Chatbot', agency: 'Je nach Agentur' },
  { label: 'Später Software', simy: 'Gleicher Account', builder: 'Extra-Tools', agency: 'Neu ausschreiben' },
]

const branchenLinks = [
  { href: '/fahrschule', label: 'Fahrschule' },
  { href: '/coaching', label: 'Coaching' },
  { href: '/consulting', label: 'Consulting' },
  { href: '/personal-training', label: 'Personal Training' },
  { href: '/nachhilfe', label: 'Nachhilfe' },
  { href: '/musikschule', label: 'Musikschule' },
  { href: '/hundeschule', label: 'Hundeschule' },
  { href: '/massage', label: 'Massage' },
  { href: '/branchen', label: 'Alle Branchen' },
]

const faqs = [
  { q: 'Was kostet eine Simy-Website?', a: `Einmalig CHF ${setup} beim Live-Gang, danach Hosting CHF ${host}/Monat oder Care CHF ${care}/Monat. 30 Tage kannst du einrichten und die Vorschau teilen — ohne Zahlung.` },
  { q: 'Muss ich die volle Simy-Software nehmen?', a: 'Nein. Das Website-Produkt ist eigenständig. Du startest über diese Seite, landest im Website-Admin und kannst später auf die volle Software erweitern.' },
  { q: 'Wann muss ich bezahlen?', a: 'Erst wenn die Homepage bereit ist und du live schaltest — oder wenn du nach 30 Tagen ein Hosting-Abo wählst. Es gibt keine automatische Belastung beim Registrieren.' },
  { q: 'Kann ich meine bestehende Domain nutzen?', a: 'Ja. Im Website-Admin verbindest du zuerst deine bestehende Domain. Hast du noch keine, prüfst du die Verfügbarkeit und kaufst sie bei Infomaniak — danach trägst du die DNS-Einträge ein.' },
  { q: 'Ist die Seite wirklich SEO-tauglich?', a: 'Ja. Saubere Title/Description, FAQ und Sitemap — plus Inhalte aus deiner Branche. Genau die Signale, die lokale Suche braucht.' },
  { q: 'Was heisst AI-optimiert?', a: 'Nicht die Optik. Im Hintergrund liegen deine Betriebsdaten strukturiert vor: Name, Ort, Leistungen, Preise, FAQ. Google und ChatGPT lesen genau diese Daten — nicht nur den sichtbaren Text. Deshalb kann dein Betrieb genannt werden, wenn jemand fragt «Fahrschule in meiner Stadt».' },
  { q: 'Was ist der Unterschied zu Host und Care?', a: `Host (CHF ${host}) hält die Seite online und schnell. Care (CHF ${care}) ergänzt laufende inhaltliche Pflege, damit Texte und SEO nicht nach dem Launch einschlafen.` },
  { q: 'Was passiert nach 30 Tagen ohne Live-Schaltung?', a: 'Die Vorschau bleibt. Im Admin kannst du weiter Billing und Profil erreichen, um Hosting zu wählen. Es wird nichts automatisch abgebucht.' },
]

useHead({
  title: 'Website-Generator Schweiz – SEO- und AI-Website für KMUs | Simy',
  meta: [
    { name: 'description', content: `Website erstellen in der Schweiz: SEO- und AI-optimiert, einmalig CHF ${setup}, Hosting ab CHF ${host}/Monat. 30 Tage Vorschau gratis. Für Fahrschulen, Coaches und Dienstleister.` },
    { name: 'keywords', content: 'website erstellen schweiz, website generator kmu, seo website schweiz, ai website schweiz, landingpage generator, website fahrschule, website coaching' },
    { property: 'og:title', content: 'Website-Generator Schweiz – SEO- und AI-Website in Minuten | Simy' },
    { property: 'og:description', content: `Professionelle KMU-Website: einmalig CHF ${setup}, Hosting ab CHF ${host}/Monat. Vorschau sofort, live wenn du bereit bist.` },
    { property: 'og:url', content: 'https://simy.ch/website' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/website' }],
  script: ldScripts(
    webPageLd({
      name: 'Website-Generator Schweiz – Simy',
      description: 'SEO- und AI-optimierte KMU-Website in Minuten. Preise, Standorte, Bewertungen, eigene Domain.',
      url: 'https://simy.ch/website',
    }),
    productOffersLd({
      name: 'Simy Website-Generator',
      description: 'Professionelle SEO-Website für Schweizer Dienstleister — Setup plus Hosting.',
      url: 'https://simy.ch/website',
      plans: [
        { name: 'Setup', price: setup, description: 'Einmalige Live-Schaltung' },
        { name: 'Host', price: host, description: 'Monatliches Hosting' },
        { name: 'Care', price: care, description: 'Hosting plus Pflege' },
      ],
    }),
    howToLd({
      name: 'Simy-Website erstellen',
      description: 'In drei Schritten zur SEO-Website für deinen Schweizer Betrieb.',
      steps: steps.map((s) => ({ name: s.title, text: s.text })),
    }),
    faqPageLd(faqs),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Website-Generator', url: 'https://simy.ch/website' },
    ]),
  ),
})
</script>
