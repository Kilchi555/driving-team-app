<template>
  <div>
    <Head>
      <Title>Auto Fahrschule Uster | 6 Schritte zur Autofahrprüfung | Driving Team</Title>
      <Meta name="description" content="Fahrschule Uster - Auto, Motorrad, Lastwagen Fahrstunden im Zürcher Oberland. 95% Erfolgsquote, erfahrene Fahrlehrer, flexible Zeiten. Jetzt Termin buchen!" />
      <Meta property="og:title" content="Fahrschule Uster – Auto & Motorrad im Zürcher Oberland | Driving Team" />
      <Meta property="og:description" content="Professionelle Fahrausbildung in Uster ZH. 95% Erfolgsquote, ab CHF 100/Lektion, flexible Zeiten." />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-uster/" />
      
      
          <Meta property="og:image" content="https://drivingteam.ch/images/locations/uster-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- 1. Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/uster-hero.webp" alt="Fahrschule Uster" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-6">Fahrschule Uster</h1>
          <p class="hidden xs:block text-xl text-white mb-8">Deine moderne Fahrschule in Uster und dem Zürcher Oberland. Erfahrene Fahrlehrer, flexible Zeiten und individuelle Ausbildung.</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- 2. Features (weiß) -->
    <FeatureSection
      title="Warum Driving Team Uster?"
      subtitle="Melde Dich in unserer Fahrschule Uster an und Du kannst folgende Punkte von uns erwarten…"
      :extras="['Unterricht auch in <strong>Englisch</strong> möglich!']"
    />

    <!-- 2.5. Instructors (weiß mit gradient) -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- 3. Standort Map (grau-50) -->
    <div class="bg-gray-50">
      <StandortMapSection location-key="uster" />
    </div>

    <!-- 4. Themen (weiß) -->
    <AusbildungsthemenSection location="Uster" />

    <!-- 5. Reviews (grau-50) -->
    <ReviewsSection category="uster" />

    <!-- 6. CTA (primary) & Preise -->
    <CtaSection title="Jetzt in Uster starten!" />

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
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke umsetzen. Unsere Fahrzeuge befinden sich stets in einem top gewarteten Zustand und auf dem neuesten Stand der Technik. Dank diesen optimalen Voraussetzungen erreichen wir das Wichtigste: zufriedene Kunden.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo bietet Ihr Fahrstunden an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unsere Lokale befinden sich in Zürich-Altstetten und in Lachen/SZ. Das Tätigkeitsgebiet erstreckt sich von Baden (Limmattal) bis nach Thalwil und von Bülach bis nach Wettswil/Bonstetten. Seit ein paar Jahren geben wir auch im Zürcher Oberland rundum Uster Auto- und Motorradfahrstunden.</p>
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
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welches sind die häufigsten Prüfungsrouten ab Hinwil?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <ul class="list-disc pl-5 space-y-1">
                <li>Bubikon / Wetzikon</li>
                <li>Hinwil / Dürnten</li>
                <li>Gossau / Mönchaltdorf</li>
                <li>Wetzikon / Kempten</li>
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

    <!-- 8. Preise (grau-50) -->
    <div class="bg-gray-50">
      <GutscheinSection />
    </div>

    <!-- WarumSection -->
    <WarumSection category="uster" />

    <!-- 9. Finale CTA (primary) -->
    <CtaSection title="Bereit? Jetzt Termin buchen!" />

    <!-- 10. Andere Standorte (weiß) -->
    <StandorteSection exclude="uster" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness", "name": "Driving Team Fahrschule Uster", "description": "Professionelle Fahrausbildung in Uster im Zürcher Oberland.", "url": "https://drivingteam.ch/fahrschule-uster/", "telephone": "+41444310033", "address": { "@type": "PostalAddress", "addressLocality": "Uster", "postalCode": "8610", "addressCountry": "CH" }, "openingHours": "Mo-Fr 08:00-19:00", "image": "https://drivingteam.ch/images/locations/uster-hero.webp", "priceRange": "CHF 100-200", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5.0", "bestRating": "5", "worstRating": "1", "reviewCount": "25" }, "sameAs": ["https://drivingteam.ch"] }) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Fahrschule Uster", "item": "https://drivingteam.ch/fahrschule-uster/" }] }) },
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

const instructors = getInstructorsByLocation('uster')
</script>
