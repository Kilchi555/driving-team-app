<template>
  <div>
    <Head>
      <Title>Auto Fahrschule Aargau | 6 Schritte zur Fahrprüfung | Driving Team</Title>
      <Meta name="description" content="Fahrschule Aargau - Auto, Motorrad, Lastwagen Fahrstunden. 85% Erfolgsquote, ab CHF 100/Lektion, Deutsch & Albanisch. Flexible Zeiten. Jetzt anmelden!" />
      <Meta property="og:title" content="Fahrschule Aargau – Auto & Motorrad | Driving Team" />
      <Meta property="og:description" content="Professionelle Fahrausbildung im Kanton Aargau. Auto, Motorrad, Lastwagen. 85% Erfolgsquote, ab CHF 100/Lektion." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-aargau/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-aargau/" />
      <Link rel="preload" as="image" href="/images/locations/aargau-hero.webp" fetchpriority="high" />
      
      
          <Meta property="og:image" content="https://drivingteam.ch/images/locations/aargau-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- 1. Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/aargau-hero.webp" alt="Fahrstunden im Aargau – Auto und Anhänger Fahrschule mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-6">Fahrschule Aargau</h1>
          <p class="hidden xs:block text-xl text-white mb-8">Melde Dich in unserer Fahrschule Aargau an – individuelle Ausbildung, flexible Treffpunkte und professionelle Fahrlehrer.</p>
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- 2. Features (weiß) -->
    <FeatureSection
      title="Warum Driving Team Aargau?"
      subtitle="Melde Dich in unserer Fahrschule Aargau an und Du kannst folgende Punkte von uns erwarten…"
      :extras="['Unterricht auch in <strong>Albanisch</strong> möglich!']"
    />

    <!-- 2.5. Instructors (weiß mit gradient) -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- 3. Standort Map (grau-50) -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="spreitenbach" />
    </div>

    <!-- 4. Themen (weiß) -->
    <AusbildungsthemenSection location="Aargau" />

    <!-- 5. Reviews (grau-50) -->
    <ReviewsSection category="aargau" />

    <!-- 6. CTA (primary) -->
    <CtaSection title="Jetzt in Aargau starten!" />

    <PriceSection />


    <!-- 7. FAQ (weiß) -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Die häufigsten Fragen & Antworten</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviele Fahrstunden benötige ich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das ist eine sehr häufig gestellte Frage, die gleichzeitig sehr schwierig zu beantworten ist. Auto fahren lernen kannst Du mit dem Erlernen einer neuen Sportart vergleichen. Wenn Du das Projekt Fahrprüfung seriös angehst, dann wirst Du Dein Ziel in nützlicher Zeit erreichen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie kann ich meine Fahrausbildung beschleunigen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das Wichtigste ist sicher….Üben, Üben und nochmals Üben. Optimal wären 2-4 Fahrten pro Woche. Ganz wichtig beim privat Üben ist, dass Du genau so fährst, wie es Dir Dein Fahrlehrer gezeigt hat. Wir empfehlen zu Beginn ca. 5-10 Fahrlektionen und anschliessend regelmässige private Lernfahrten.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieso dauert die Fahrstunde des Driving Teams 45 Minuten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt. Je nach Übungsgebiet und Ausbildungsstand macht es Sinn eine 1.5 oder gar eine Doppellektion zu vereinbaren.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie rechtfertigen sich eure Preise?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke umsetzen. Unsere Fahrzeuge befinden sich stets in einem top gewarteten Zustand. Dank diesen optimalen Voraussetzungen erreichen wir das Wichtigste: zufriedene Kunden.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo bietet Ihr Fahrstunden an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das Tätigkeitsgebiet des Driving Team Aargau erstreckt sich von Baden (Limmattal) bis nach Thalwil und von Bülach bis nach Wettswil/Bonstetten im Knonaueramt. Bei der Anhänger- und Motorradausbildung beschränkt sich der Treffpunkt auf Zürich-Altstetten.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Soll ich geschaltet oder automatisch fahren lernen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das muss grundsätzlich jeder für sich entscheiden. Rechtlich gesehen ist es egal, mit was ihr die Prüfung ablegt — ihr dürft nach bestandener Prüfung so oder so beides fahren.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was sind die Voraussetzungen für private Lernfahrten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <p class="mb-2">Private Lernfahrten werden häufig unterschätzt. Wichtige Voraussetzungen:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Die Begleitperson muss einen gültigen Führerausweis haben und nüchtern sein (0,0 Promille).</li>
                <li>Beim Auto: Begleitperson muss mindestens 23 Jahre alt sein und die Prüfung vor mind. 3 Jahren bestanden haben.</li>
                <li>Die Handbremse muss für die Begleitperson gut erreichbar sein.</li>
              </ul>
            </div>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was ist die Admin- und Versicherungspauschale?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet die Aufwände ausserhalb der Fahrlektionen sowie die spezielle Vollkaskoversicherung des Fahrschulfahrzeugs.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was haben eure Fahrlehrer:innen für eine Ausbildung?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Alle unsere Fahrlehrer:innen haben eine vollumfängliche Ausbildung mit eidgenössischem Fachausweis absolviert und absolvieren jedes Jahr mindestens einen Weiterbildungstag.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welches sind die häufigsten Prüfungsrouten ab Wettingen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <ul class="list-disc pl-5 space-y-1">
                <li>Regensberg / Buchs</li>
                <li>Otelfingen / Würenlos</li>
                <li>Baden / Ehrendingen</li>
                <li>Baden / Obersiggenthal</li>
              </ul>
            </div>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviel betragen die ungefähren Gesamtkosten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die Gesamtkosten sind hauptsächlich abhängig von der Anzahl der benötigten Fahrstunden. Mit 15 Lektionen kommt man inkl. allen Kursen und Gebühren auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Ab welchem Alter kann ich starten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Für 50ccm Motorräder kannst du dich bereits mit 15 Jahren anmelden. Ab 16 Jahren darfst du 125ccm fahren. Lernfahrten fürs Auto sind ab dem 17. Geburtstag erlaubt.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Internal Links -->
    <section class="py-12 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Passende Angebote im Aargau</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <a href="/auto-fahrschule/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Auto Fahrschule</a>
          <a href="/anhaenger-fahrschule/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Anhänger Fahrschule</a>
          <a href="/fahrschule-dietikon/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Dietikon</a>
          <a href="/vku-kurse/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">VKU Kurs</a>
          <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Preise & Kosten</a>
          <a href="/kostenrechner/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Kostenrechner</a>
          <a href="/blog/fuehrerschein-kosten-schweiz/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Führerschein Kosten</a>
          <a href="/fahrschule-standorte/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Alle Standorte</a>
        </div>
      </div>
    </section>

    <!-- 8. Preise (grau-50) -->
    <div class="bg-gray-50">
      <GutscheinSection />
    </div>

    <!-- 9. Finale CTA (primary) -->
    <CtaSection title="Bereit? Jetzt Termin buchen!" />

    <!-- 10. Andere Standorte (weiß) -->
    <StandorteSection exclude="aargau" />

    <WarumSection category="aargau" />

  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": ["DrivingSchool", "LocalBusiness"], "name": "Driving Team Fahrschule Aargau", "description": "Professionelle Fahrausbildung im Kanton Aargau. Auto und Anhänger Fahrstunden in Spreitenbach und Umgebung.", "url": "https://drivingteam.ch/fahrschule-aargau/", "telephone": "+41444310033", "address": { "@type": "PostalAddress", "addressLocality": "Spreitenbach", "addressRegion": "Aargau", "addressCountry": "CH" }, "openingHours": "Mo-Fr 08:00-19:00", "image": "https://drivingteam.ch/images/locations/aargau-hero.webp", "priceRange": "CHF 100-200", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "bestRating": "5", "worstRating": "1", "ratingCount": "25", "reviewCount": "25" }, "sameAs": ["https://drivingteam.ch"] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Fahrschule Aargau", "item": "https://drivingteam.ch/fahrschule-aargau/" }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [ { "@type": "Question", "name": "Wieviele Fahrstunden benötige ich?", "acceptedAnswer": { "@type": "Answer", "text": "Das ist individuell verschieden. Wir empfehlen zu Beginn ca. 5-10 Fahrlektionen und anschliessend regelmässige private Lernfahrten mit 2-4 Fahrten pro Woche." } }, { "@type": "Question", "name": "Wo bietet Driving Team Aargau Fahrstunden an?", "acceptedAnswer": { "@type": "Answer", "text": "Das Tätigkeitsgebiet des Driving Team Aargau erstreckt sich von Baden (Limmattal) bis nach Thalwil und von Bülach bis nach Wettswil/Bonstetten. Treffpunkte im ganzen Kanton Aargau möglich." } }, { "@type": "Question", "name": "Welches sind die häufigsten Prüfungsrouten im Aargau?", "acceptedAnswer": { "@type": "Answer", "text": "Typische Prüfungsrouten: Spreitenbach/Killwangen, Dietikon/Oberengstringen, Baden/Ennetbaden, Neuenhof/Wettingen." } }, { "@type": "Question", "name": "Wieviel betragen die ungefähren Gesamtkosten?", "acceptedAnswer": { "@type": "Answer", "text": "Mit 15 Lektionen kommt man inkl. allen Kursen und Gebühren auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–." } }, { "@type": "Question", "name": "Ab welchem Alter kann ich starten?", "acceptedAnswer": { "@type": "Answer", "text": "Für 50ccm Motorräder ab 15 Jahren, 125ccm ab 16 Jahren. Lernfahrten fürs Auto sind ab dem 17. Geburtstag erlaubt." } } ] }) },
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

const instructors = getInstructorsByLocation('aargau')
</script>
