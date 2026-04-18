<template>
  <div>
    <Head>
      <Title>Motorrad Grundkurs Altstetten | CHF 499.- | Driving Team</Title>
      <Meta name="description" content="Motorrad Grundkurs Altstetten ✓ CHF 499.- ✓ 12 Stunden (3×4h) ✓ Max. 5 Teilnehmer ✓ Baslerstrasse 145 ✓ Kat. A1/A2/A. Jetzt buchen!" />
      <Meta name="keywords" content="Motorrad Grundkurs Altstetten, Motorrad Grundkurs Zürich Altstetten, PGS Kurs Altstetten, Motorrad Kurs Zürich-Altstetten, Grundkurs Motorrad Altstetten" />
      <Meta property="og:title" content="Motorrad Grundkurs Altstetten | CHF 499.- | Driving Team" />
      <Meta property="og:description" content="Motorrad Grundkurs direkt in Zürich-Altstetten. CHF 499.- Komplettpreis. 12 Stunden (3×4h). Max. 5 Teilnehmer. Treffpunkt Baslerstrasse 145. Obligatorisch für Kat. A1/A2/A." />
      <Meta property="og:url" content="https://drivingteam.ch/motorrad-grundkurs-altstetten/" />
      <Meta property="og:type" content="website" />
      <Meta property="og:locale" content="de_CH" />
      <Link rel="canonical" href="https://drivingteam.ch/motorrad-grundkurs-altstetten/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/courses/motorrad-grundkurs-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Breadcrumb -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Motorrad Grundkurs', href: '/motorrad-grundkurs/' }, { label: 'Altstetten' }]" />

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/courses/motorrad-grundkurs-hero.webp" alt="Motorrad Grundkurs Altstetten – Sicheres Fahren auf zwei Rädern mit Driving Team in Zürich-Altstetten" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Driving Team – Zürich-Altstetten</p>
          <h1 class="heading-lg text-white mb-4">Motorrad Grundkurs Altstetten</h1>
          <p class="hidden xs:block text-xl text-white mb-2">Kompletter Kurs in Zürich-Altstetten nur für <strong>CHF 499.–</strong></p>
          <p class="hidden xs:block text-white mb-8">Praxisorientierter Motorrad Grundkurs: 3 Kursteile à 4 Stunden. Max. 5 Teilnehmer. Treffpunkt: Baslerstrasse 145, 8048 Zürich-Altstetten.</p>
          <a href="https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Z%C3%BCrich" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt anmelden
          </a>
        </div>
      </div>
    </section>

    <!-- Kursübersicht -->
    <CourseOverviewSection
      title="Motorrad Grundkurs Altstetten"
      description="Der Motorrad Grundkurs in Zürich-Altstetten findet direkt an der Baslerstrasse 145 statt – im Herzen unseres Hauptstandorts. Praxisorientiert, mit max. 5 Teilnehmern und erfahrenen Motorradfahrlehrern."
      :requirements="[
        'Gültiger Lernfahrausweis der Kategorie A1 / A35kW / A',
        'Selbständiges Fahren von A nach B möglich',
        'Eigenes Motorrad/Roller (Fahrschul-Fahrzeuge für CHF 80.- pro Kursteil auf Anfrage vorhanden)',
        'Eigene Motorrad-Sicherheitsbekleidung inkl. Helm'
      ]"
      :details="[
        '🏍️ Kompletter Kurs: <strong>CHF 499.-</strong> (3 Kursteile à CHF 190.-)',
        '👥 Maximal <strong>5 Teilnehmer</strong>',
        '📜 Inkl. <strong>Kursbestätigung & Getränk</strong>',
        '📍 Treffpunkt: <strong>Baslerstrasse 145, 8048 Zürich-Altstetten</strong>'
      ]"
      :important-notes="[
        'Für Kategorie A1 sind ebenfalls die Kursteile 1, 2 & 3 zu absolvieren.',
        'Wenn du die Kategorie A1 OHNE GESCHWINDIGKEITSBESCHRÄNKUNG bereits seit mind. 31.12.2020 besitzt und Kat. A (35kW) machen willst, melde dich nur für Kursteil 3 an.'
      ]"
      :stats="{ requirements: 4, details: 4, hours: '12h' }"
    />

    <!-- Standort & Map -->
    <LazyStandortMapSection location-key="zuerich" />

    <!-- Kategorien -->
    <ClientOnly>
      <MotorradKategorienSection />
    </ClientOnly>

    <!-- Kurs Themen -->
    <KursteileSection />

    <!-- Reviews -->
    <ReviewsSection category="motorrad-grundkurs" />

    <!-- FAQ -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zum Motorrad Grundkurs Altstetten</h2>
        <div class="max-w-3xl mx-auto space-y-4">
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo genau findet der Motorrad Grundkurs in Altstetten statt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Der Treffpunkt befindet sich direkt vor unserem Lokal in Zürich-Altstetten: <strong>Baslerstrasse 145, 8048 Zürich</strong>. Du bist gut erreichbar mit dem öffentlichen Verkehr (Tram 2, 3, 8 bis Altstetten) oder mit dem Auto. Parkplätze sind in der Nähe verfügbar.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kostet der Motorrad Grundkurs in Altstetten?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Der komplette Motorrad Grundkurs in Zürich-Altstetten kostet <strong>CHF 499.-</strong> (3 Kursteile à CHF 190.-). Falls du ein Fahrschul-Motorrad benötigst, fallen CHF 80.- pro Kursteil zusätzlich an. Helm-Miete: CHF 10.- Umtriebsentschädigung.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Ist der Motorrad Grundkurs in Altstetten obligatorisch?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Ja, in der Schweiz ist der Motorrad Grundkurs (Praktische Grundschulung, PGS) für alle Personen obligatorisch, die einen Führerschein der Kategorien A1, A35kW oder A anstreben. Er ist gesetzlich vorgeschrieben und muss vor der praktischen Fahrprüfung abgeschlossen werden.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viele Stunden dauert der Motorrad Grundkurs?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Der Motorrad Grundkurs in Altstetten umfasst insgesamt <strong>12 Stunden</strong>, aufgeteilt in 3 Kursteile à 4 Stunden. Die Kursteile können an verschiedenen Tagen absolviert werden und müssen nicht zwingend aufeinanderfolgend sein.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Muss ich mein eigenes Motorrad mitbringen?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">In der Regel ja. Du kannst jedoch gegen eine Gebühr von <strong>CHF 80.- pro Kursteil</strong> ein Motorrad von uns ausleihen. Bitte kontaktiere uns im Voraus, um die Verfügbarkeit zu prüfen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was wird im Motorrad Grundkurs geübt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm">
              <p class="mb-2">Der Kurs ist in drei Teile gegliedert:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li><strong>Teil 1:</strong> Fahrzeugbeherrschung im Langsamfahrbereich, Betriebssicherheit, Motorradbekleidung, Fahren im Verkehr.</li>
                <li><strong>Teil 2:</strong> Schnelle Bremsmanöver, Kreisverkehr, Vortrittsregeln, Berganfahren.</li>
                <li><strong>Teil 3:</strong> Sicheres Kurvenfahren, Sozius mitnehmen, Gruppenfahren.</li>
              </ul>
            </div>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie melde ich mich für den Motorrad Grundkurs Altstetten an?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Die Anmeldung erfolgt einfach online über den «Jetzt anmelden»-Button auf dieser Seite. Wähle einen verfügbaren Termin im Buchungssystem. Bei Fragen erreichst du uns per E-Mail unter info@drivingteam.ch oder telefonisch.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was passiert bei schlechtem Wetter?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Bei Temperaturen unter 5 Grad oder starkem Regen kann der Kurs angepasst oder verschoben werden. Wir informieren die Teilnehmenden rechtzeitig per E-Mail oder Telefon.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Warum Section -->
    <WarumSection category="motorrad" />

    <!-- Weitere Angebote -->
    <section class="section-container py-12">
      <h2 class="text-xl font-bold text-center mb-8 text-gray-900">Weitere Motorrad Grundkurs Standorte</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <a href="/motorrad-grundkurs-zuerich/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">🏍️</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Motorrad Grundkurs Zürich</p>
          <p class="text-xs text-gray-500 mt-1">CHF 499.- Komplettpreis</p>
        </a>
        <a href="/motorrad-grundkurs-lachen/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">📍</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Motorrad Grundkurs Lachen SZ</p>
          <p class="text-xs text-gray-500 mt-1">CHF 570.- Komplettpreis</p>
        </a>
        <a href="/motorrad-grundkurs/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">📋</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Alle Motorrad Grundkurse</p>
          <p class="text-xs text-gray-500 mt-1">Übersicht aller Standorte</p>
        </a>
      </div>
    </section>

    <!-- StandorteSection -->
    <StandorteSection exclude="zuerich" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Motorrad Grundkurs Altstetten",
    "description": "Obligatorischer Motorrad Grundkurs (PGS) in Zürich-Altstetten. 12 Stunden in 3 Kursteilen. Für Kategorie A1, A35kW und A. CHF 499.- Komplettpreis.",
    "url": "https://drivingteam.ch/motorrad-grundkurs-altstetten/",
    "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" },
    "offers": { "@type": "Offer", "price": "499", "priceCurrency": "CHF", "availability": "https://schema.org/InStock" },
    "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Driving Team Zürich-Altstetten", "address": { "@type": "PostalAddress", "streetAddress": "Baslerstrasse 145", "postalCode": "8048", "addressLocality": "Zürich", "addressCountry": "CH" } } }]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
      { "@type": "ListItem", "position": 2, "name": "Motorrad Grundkurs", "item": "https://drivingteam.ch/motorrad-grundkurs/" },
      { "@type": "ListItem", "position": 3, "name": "Motorrad Grundkurs Altstetten", "item": "https://drivingteam.ch/motorrad-grundkurs-altstetten/" }
    ]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Wo findet der Motorrad Grundkurs in Altstetten statt?", "acceptedAnswer": { "@type": "Answer", "text": "Baslerstrasse 145, 8048 Zürich-Altstetten. Gut erreichbar mit Tram 2, 3, 8 bis Altstetten." } },
      { "@type": "Question", "name": "Was kostet der Motorrad Grundkurs Altstetten?", "acceptedAnswer": { "@type": "Answer", "text": "CHF 499.- für alle 3 Kursteile (à CHF 190.-). Motorrad-Miete CHF 80.- pro Kursteil." } },
      { "@type": "Question", "name": "Wie viele Stunden dauert der Motorrad Grundkurs?", "acceptedAnswer": { "@type": "Answer", "text": "12 Stunden in 3 Kursteilen à 4 Stunden." } }
    ]
  }) }
]
useHead({ script: jsonLdScripts })

definePageMeta({ layout: 'default' })
</script>
