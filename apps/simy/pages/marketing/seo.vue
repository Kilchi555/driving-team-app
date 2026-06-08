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
          <a href="/marketing" class="hover:text-gray-600">Marketing</a><span>›</span>
          <span class="text-gray-600">SEO</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          🔍 Lokales SEO für Fahrschulen
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          SEO für Fahrschulen —<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Dauerhaft oben bei Google
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Organisch auf Platz 1, wenn jemand "Fahrschule [deine Stadt]" googelt. Einmal etabliert — kostenloser Traffic für immer. Wir machen das für dich.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="/marketing/seo-anfrage"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            SEO-Analyse anfragen →
          </a>
        </div>
      </div>
    </section>

    <!-- SEO vs Ads comparison -->
    <section class="py-14 px-6 border-y border-gray-100 bg-gray-50">
      <div class="max-w-3xl mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 text-center">SEO vs. Google Ads</p>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="rounded-2xl p-6 border border-green-100 bg-green-50">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-xl">🔍</span>
              <h3 class="font-bold text-gray-900">SEO</h3>
              <span class="ml-auto text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Nachhaltig</span>
            </div>
            <ul class="space-y-2.5 text-sm">
              <li v-for="p in seoProps" :key="p" class="flex items-start gap-2 text-gray-700">
                <svg class="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                {{ p }}
              </li>
            </ul>
          </div>
          <div class="rounded-2xl p-6 border border-blue-100 bg-blue-50">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-xl">📢</span>
              <h3 class="font-bold text-gray-900">Google Ads</h3>
              <span class="ml-auto text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Sofort</span>
            </div>
            <ul class="space-y-2.5 text-sm">
              <li v-for="p in adsProps" :key="p" class="flex items-start gap-2 text-gray-700">
                <svg class="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                {{ p }}
              </li>
            </ul>
          </div>
        </div>
        <p class="text-center text-sm text-gray-500 mt-5">💡 <strong>Empfehlung:</strong> Kombination aus SEO (langfristig) + Ads (sofort) für maximale Sichtbarkeit</p>
      </div>
    </section>

    <!-- What we do -->
    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Lokales SEO — was wir konkret tun</h2>
          <p class="text-gray-500 max-w-xl mx-auto">SEO für Fahrschulen ist nicht kompliziert — aber es braucht die richtigen Massnahmen zur richtigen Zeit.</p>
        </div>
        <div class="space-y-5">
          <div v-for="(item, i) in seoActions" :key="i"
            class="flex gap-4 p-5 rounded-2xl border border-gray-100 hover:border-purple-100 transition-all group">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-sm mt-0.5"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">{{ i + 1 }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="font-bold text-gray-900">{{ item.title }}</h3>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" :style="{ background: item.impact === 'Hoch' ? 'rgba(var(--brand-rgb),0.08)' : 'rgba(5,150,105,0.08)', color: item.impact === 'Hoch' ? 'var(--brand-primary)' : '#059669' }">
                  {{ item.impact }}
                </span>
              </div>
              <p class="text-sm text-gray-500 leading-relaxed">{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Timeline -->
    <section class="py-20 px-6 bg-gray-50">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-10 text-center">Wann sieht man Ergebnisse?</h2>
        <div class="space-y-0">
          <div v-for="(phase, i) in timeline" :key="i" class="flex gap-5">
            <div class="flex flex-col items-center">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">{{ i + 1 }}</div>
              <div v-if="i < timeline.length - 1" class="w-0.5 bg-gray-200 flex-1 my-1"></div>
            </div>
            <div class="pb-8 flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="font-bold text-gray-900">{{ phase.title }}</h3>
                <span class="text-xs font-semibold text-gray-400">{{ phase.time }}</span>
              </div>
              <p class="text-sm text-gray-500 leading-relaxed">{{ phase.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Wie gut rankt deine Fahrschule aktuell?</h2>
        <p class="text-purple-200 mb-8">Wir machen eine kostenlose SEO-Analyse für deine Fahrschule und zeigen dir das Potenzial.</p>
        <a href="/marketing/seo-anfrage"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Kostenlose SEO-Analyse →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'SEO für Fahrschulen – Organisch auf Platz 1 bei Google | Simy',
  meta: [
    { name: 'description', content: 'Lokales SEO für Fahrschulen: Simy optimiert dein Google Business Profile, deine Website und dein lokales Ranking. Dauerhaft mehr Schüler ohne Werbekosten.' },
    { name: 'keywords', content: 'seo fahrschule, lokales seo fahrschule, google fahrschule, fahrschule google maps, fahrschule suchmaschinenoptimierung' },
    { property: 'og:title', content: 'SEO für Fahrschulen – Simy | Dauerhaft auf Platz 1 bei Google' },
    { property: 'og:description', content: 'Lokales SEO für Fahrschulen: Google Business, Keywords, Website-Optimierung. Nachhaltig mehr Schüler.' },
    { property: 'og:url', content: 'https://simy.ch/marketing/seo' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/marketing/seo' }],
  script: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Simy', item: 'https://simy.ch/' },
        { '@type': 'ListItem', position: 2, name: 'Marketing', item: 'https://simy.ch/marketing' },
        { '@type': 'ListItem', position: 3, name: 'SEO für Fahrschulen' },
      ],
    }),
  }],
})

const seoProps = [
  'Kein laufendes Werbebudget nötig',
  'Vertrauen durch organische Ergebnisse',
  'Langfristiger, nachhaltiger Traffic',
  'Einmalige Investition, dauerhafte Wirkung',
]

const adsProps = [
  'Sofortige Sichtbarkeit bei Google',
  'Schnelle Leads und Anfragen',
  'Messbar und sofort skalierbar',
  'Jederzeit pausierbar',
]

const seoActions = [
  { title: 'Google Business Profile optimieren', desc: 'Das GBP ist der wichtigste Faktor für lokales SEO. Wir optimieren alle Felder, fügen Fotos hinzu und sorgen für eine lückenlose Präsenz.', impact: 'Hoch' },
  { title: 'Lokale Keyword-Strategie', desc: 'Wir identifizieren alle relevanten Suchbegriffe ("fahrschule zürich", "fahrstunden schlieren", etc.) und integrieren sie gezielt in deine Website.', impact: 'Hoch' },
  { title: 'On-Page SEO & Website-Struktur', desc: 'Simy-Websites sind bereits SEO-optimiert. Wir erstellen zusätzliche Stadtseiten und Landingpages für maximale lokale Reichweite.', impact: 'Hoch' },
  { title: 'Bewertungsmanagement', desc: 'Mehr Google-Bewertungen verbessern das Ranking direkt. Wir helfen dir, systematisch mehr Reviews zu sammeln.', impact: 'Mittel' },
  { title: 'Schema Markup & Structured Data', desc: 'Technische SEO-Massnahmen für Rich Snippets und bessere Darstellung in Google-Suchergebnissen.', impact: 'Mittel' },
  { title: 'Lokale Backlinks', desc: 'Erwähnungen und Links von lokalen Websites, Vereinen und Medien stärken die lokale Autorität deiner Fahrschule.', impact: 'Mittel' },
]

const timeline = [
  { title: 'Technisches Setup', time: 'Woche 1–2', desc: 'Website-Optimierung, Google Business Profile, Schema Markup. Diese Massnahmen wirken schnell.' },
  { title: 'Erste Verbesserungen', time: 'Monat 1–2', desc: 'Google beginnt die Verbesserungen zu indexieren. Erste Positionsgewinne bei Long-Tail-Keywords.' },
  { title: 'Sichtbares Wachstum', time: 'Monat 3–4', desc: 'Merkliche Verbesserung der Rankings. Mehr organische Klicks und erste Anfragen aus der organischen Suche.' },
  { title: 'Top-Positionen', time: 'Monat 5–6+', desc: 'Stabile Top-3-Positionen für die wichtigsten lokalen Keywords. Dauerhafter organischer Traffic ohne Werbekosten.' },
]
</script>
