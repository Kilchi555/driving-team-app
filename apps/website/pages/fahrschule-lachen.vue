<template>
  <div>
    <Head>
      <Title>Fahrschule Lachen SZ | ab CHF 95.- | Auto, Motorrad, Lastwagen | Driving Team</Title>
      <Meta name="description" content="Fahrschule Lachen SZ ✓ ab CHF 95.-/Lektion ✓ Auto, Motorrad, Anhänger, Lastwagen, Bus ✓ Flexible Zeiten & Treffpunkte ✓ Kanton Schwyz ✓ 85% Erfolgsquote. Jetzt anmelden!" />
      <Meta name="keywords" content="Fahrschule Lachen, Fahrschule Lachen SZ, Fahrstunden Lachen, Führerschein Lachen, Auto Fahrschule Lachen, Motorrad Fahrschule Lachen, Fahrlehrer Lachen SZ" />
      <Meta property="og:title" content="Fahrschule Lachen SZ | ab CHF 95.- | Auto, Motorrad & mehr | Driving Team" />
      <Meta property="og:description" content="Professionelle Fahrausbildung in Lachen SZ. Auto, Motorrad, Lastwagen & Kurse. Ab CHF 95.-/Lektion. Flexible Zeiten & Treffpunkte im Kanton Schwyz." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-lachen/" />
      <Meta property="og:type" content="website" />
      <Meta property="og:locale" content="de_CH" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-lachen/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/lachen-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Fahrschule Lachen SZ | ab CHF 95.- | Driving Team" />
      <Meta name="twitter:description" content="Fahrschule Lachen SZ. Auto, Motorrad, Anhänger, Lastwagen, Bus. Ab CHF 95.-/Lektion. Flexible Zeiten. Prüfung Pfäffikon SZ. Jetzt anmelden!" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <Meta name="date" :content="new Date().toISOString()" />
    </Head>

    <!-- Breadcrumb -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Fahrschule Lachen SZ' }]" />

    <!-- 1. Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <NuxtImg src="/images/locations/lachen-hero.webp" alt="Fahrstunden in Lachen/SZ – Auto, Motorrad, Anhänger und Motorboot mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" loading="eager" fetchpriority="high" sizes="100vw" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-6">Fahrschule Lachen</h1>
          <p class="hidden xs:block text-xl text-white mb-8">Deine moderne Fahrschule in Lachen/SZ. Melde Dich an und starte deine Fahrausbildung mit erfahrenen Fahrlehrern.</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- 2. Features (weiß) -->
    <FeatureSection
      title="Warum Driving Team Lachen?"
      subtitle="Melde Dich in unserer Fahrschule Lachen an und Du kannst folgende Punkte von uns erwarten…"
      :extras="['Unterricht auch in <strong>Englisch</strong> möglich!']"
    />

    <!-- 2.5. Instructors (weiß mit gradient) -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- 3. Standort Map (grau-50) -->
    <div class="bg-gray-50">
      <StandortMapSection location-key="lachen" />
    </div>

    <!-- 4. Themen (weiß) -->
    <AusbildungsthemenSection location="Lachen" />

    <!-- 5. Reviews (grau-50) -->
    <ReviewsSection category="lachen" />

    <!-- 6. CTA (primary) -->
    <CtaSection title="Jetzt in Lachen starten!" />

    <PriceSection />


    <!-- 7. FAQ (weiß) -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Die häufigsten Fragen & Antworten</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viele Fahrstunden benötige ich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das ist eine sehr häufig gestellte Frage, die gleichzeitig sehr schwierig zu beantworten ist. Auto fahren lernen kannst Du mit dem Erlernen einer neuen Sportart, eines neuen Instruments oder einer Fremdsprache vergleichen. Wenn Du das Projekt Fahrprüfung jedoch seriös angehst, sprich die Tipps und Tricks des Fahrlehrers ernst nimmst und probierst umzusetzen, dann wirst Du Dein Ziel in nützlicher Zeit erreichen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie kann ich meine Fahrausbildung beschleunigen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das Wichtigste ist sicher….Üben, Üben und nochmals Üben. Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrstunden, sondern zum Beispiel 1 Fahrlektion und 1 Mal privat repetieren. Ganz wichtig beim privat Üben ist, dass Du genau so fährst, wie es Dir Dein Fahrlehrer gezeigt hat.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieso dauert die Fahrstunde des Driving Teams 45 Minuten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt und analog zu den meisten Schulen angepasst. Je nach Übungsgebiet und Ausbildungsstand macht es Sinn eine 1.5 oder gar eine Doppellektion zu vereinbaren.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie rechtfertigen sich eure Preise?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke umsetzen. Dies beginnt bei den Fahrlehrer:innen, die nur langfristig seriös arbeiten können, wenn sie eine anständige Entlöhnung erhalten. Unsere Fahrzeuge befinden sich stets in einem top gewarteten Zustand.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo bietet Ihr Fahrstunden an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das Tätigkeitsgebiet des Driving Team Lachen erstreckt sich von Hinwil bis nach Schwyz und von Horgen bis nach Ziegelbrücke. Die Treffpunkte für die Autofahrstunden sind flexibel, das heisst wir holen euch, wenn möglich, zu Hause oder bei der Arbeit ab.</p>
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
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet die Aufwände ausserhalb der Fahrlektionen (z.B. Anmeldung zur Führerprüfung) sowie die spezielle Vollkaskoversicherung des Fahrschulfahrzeugs.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was haben eure Fahrlehrer:innen für eine Ausbildung?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Alle unsere Fahrlehrer:innen haben eine vollumfängliche Ausbildung mit eidgenössischem Fachausweis absolviert und absolvieren jedes Jahr mindestens einen Weiterbildungstag.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welches sind die häufigsten Prüfungsrouten ab Pfäffikon/SZ?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <ul class="list-disc pl-5 space-y-1">
                <li>Altendorf / Lachen</li>
                <li>Feusisberg / Schindellegi</li>
                <li>Wollerau / Samstagern</li>
                <li>Freienbach / Richterswil</li>
                <li>Rapperswil / Jona</li>
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

    <!-- 8. Gutschein-->
    <div class="bg-gray-50">
      <GutscheinSection />
    </div>

    <!-- 9. Interne Links Lachen -->
    <section class="py-10 bg-white">
      <div class="section-container">
        <h2 class="text-xl font-bold text-gray-900 mb-5 text-center">Kurse & Ausbildungen in Lachen SZ</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <a href="/vku-kurs-lachen/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">📋</span>
            <p class="font-semibold text-gray-900 text-sm">VKU Kurs</p>
            <p class="text-xs text-primary-600">Lachen</p>
          </a>
          <a href="/motorrad-grundkurs-lachen/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">🏍️</span>
            <p class="font-semibold text-gray-900 text-sm">Motorrad Grundkurs</p>
            <p class="text-xs text-primary-600">Lachen</p>
          </a>
          <a href="/fahrschule-pfaeffikon/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">📍</span>
            <p class="font-semibold text-gray-900 text-sm">Fahrschule</p>
            <p class="text-xs text-primary-600">Pfäffikon SZ</p>
          </a>
          <a href="/fahrschule-zuerich/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">🏙️</span>
            <p class="font-semibold text-gray-900 text-sm">Fahrschule</p>
            <p class="text-xs text-primary-600">Zürich</p>
          </a>
        </div>
      </div>
    </section>

    <!-- 10. Warum -->
    <WarumSection category="lachen" />

    <!-- 11. Finale CTA (primary) -->
    <CtaSection title="Bereit? Jetzt Termin buchen!" />

    <!-- 12. Andere Standorte (weiß) -->
    <StandorteSection exclude="lachen" />

  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": ["DrivingSchool", "LocalBusiness"],
    "@id": "https://drivingteam.ch/fahrschule-lachen/#driving-school",
    "name": "Driving Team Fahrschule Lachen",
    "description": "Professionelle Fahrausbildung in Lachen SZ für alle Fahrzeugkategorien. Auto, Motorrad, Anhänger, Lastwagen, Bus. Ab CHF 95.-/Lektion, flexible Treffpunkte.",
    "url": "https://drivingteam.ch/fahrschule-lachen/",
    "telephone": "+41444310033",
    "image": "https://drivingteam.ch/images/locations/lachen-hero.webp",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Lachen",
      "postalCode": "8853",
      "addressRegion": "SZ",
      "addressCountry": "CH"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 47.1967,
      "longitude": 8.8540
    },
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "07:00", "closes": "20:00" },
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday"], "opens": "08:00", "closes": "17:00" }
    ],
    "priceRange": "CHF 95.-–200.-",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "368",
      "bestRating": "5"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Fahrausbildung Lachen SZ",
      "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Auto Fahrstunden Lachen", "description": "Fahrstunden Kategorie B in Lachen SZ" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Motorrad Fahrstunden Lachen", "description": "Motorrad Fahrstunden A1/A35kW/A in Lachen SZ" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Anhänger Fahrstunden Lachen", "description": "Fahrstunden Kategorie BE in Lachen SZ" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "VKU Kurs Lachen", "description": "Verkehrskundeunterricht in Lachen SZ" } }
      ]
    },
    "sameAs": ["https://drivingteam.ch"]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
      { "@type": "ListItem", "position": 2, "name": "Fahrschule Lachen SZ", "item": "https://drivingteam.ch/fahrschule-lachen/" }
    ]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Wie viele Fahrstunden benötige ich in Lachen?", "acceptedAnswer": { "@type": "Answer", "text": "Das hängt von deiner Vorerfahrung und deinem Lerntempo ab. Bei regelmässigem Üben (2-4 Mal pro Woche inkl. privaten Lernfahrten) erreichst du dein Ziel am schnellsten." } },
      { "@type": "Question", "name": "Wie kann ich meine Fahrausbildung beschleunigen?", "acceptedAnswer": { "@type": "Answer", "text": "Optimal wären 2-4 Fahrten pro Woche – zum Beispiel 1 Fahrstunde mit dem Fahrlehrer und 1 private Lernfahrt. Wichtig: genau so fahren, wie es der Fahrlehrer gezeigt hat." } },
      { "@type": "Question", "name": "Wo bietet Driving Team Lachen Fahrstunden an?", "acceptedAnswer": { "@type": "Answer", "text": "Das Tätigkeitsgebiet erstreckt sich von Hinwil bis nach Schwyz und von Horgen bis nach Ziegelbrücke. Treffpunkte sind flexibel – wir holen euch wenn möglich zu Hause oder bei der Arbeit ab." } },
      { "@type": "Question", "name": "Was kosten Fahrstunden in Lachen?", "acceptedAnswer": { "@type": "Answer", "text": "Fahrstunden starten ab CHF 95.-/45min. Hinzu kommt eine einmalige Admin- und Versicherungspauschale für die gesamte Fahrausbildung." } },
      { "@type": "Question", "name": "Welches sind die häufigsten Prüfungsrouten ab Pfäffikon/SZ?", "acceptedAnswer": { "@type": "Answer", "text": "Die häufigsten Prüfungsrouten ab Pfäffikon/SZ führen nach Altendorf/Lachen, Feusisberg/Schindellegi, Wollerau/Samstagern, Freienbach/Richterswil und Rapperswil/Jona." } },
      { "@type": "Question", "name": "Was sind die Voraussetzungen für private Lernfahrten?", "acceptedAnswer": { "@type": "Answer", "text": "Die Begleitperson muss einen gültigen Führerausweis haben, nüchtern sein (0,0 Promille), mindestens 23 Jahre alt sein und die Prüfung vor mindestens 3 Jahren bestanden haben." } },
      { "@type": "Question", "name": "Was ist die Admin- und Versicherungspauschale?", "acceptedAnswer": { "@type": "Answer", "text": "Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet die Aufwände ausserhalb der Fahrlektionen (z.B. Anmeldung zur Führerprüfung) sowie die spezielle Vollkaskoversicherung." } },
      { "@type": "Question", "name": "Wie hoch sind die ungefähren Gesamtkosten?", "acceptedAnswer": { "@type": "Answer", "text": "Die Gesamtkosten hängen von der Anzahl Fahrstunden ab. Mit 15 Lektionen kommt man inkl. allen Kursen und Gebühren auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–." } },
      { "@type": "Question", "name": "Ab welchem Alter kann ich mit der Fahrausbildung starten?", "acceptedAnswer": { "@type": "Answer", "text": "Für 50ccm Motorräder ab 15 Jahren, für 125ccm ab 16 Jahren. Lernfahrten fürs Auto sind ab dem 17. Geburtstag erlaubt." } }
    ]
  }) }
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

const instructors = getInstructorsByLocation('lachen')
</script>
