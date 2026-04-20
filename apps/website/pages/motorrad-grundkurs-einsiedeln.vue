<template>
  <div>
    <Head>
      <Title>Motorrad Grundkurs Einsiedeln | CHF 600.- | Driving Team</Title>
      <Meta name="description" content="Motorrad Grundkurs Einsiedeln – 3 x 4h praxisorientierter Grundkurs. In Kooperation mit Fahrschule Bisig. Kompletter Kurs CHF 600.-. Max. 5 Teilnehmer." />
      <Meta property="og:title" content="Motorrad Grundkurs Einsiedeln – CHF 600.- | Driving Team" />
      <Meta property="og:description" content="Motorrad Grundkurs in Einsiedeln. 3x4h, CHF 600.-, max. 5 Teilnehmer. In Kooperation mit Fahrschule Bisig." />
      <Meta property="og:url" content="https://drivingteam.ch/motorrad-grundkurs-einsiedeln/" />
      <Link rel="canonical" href="https://drivingteam.ch/motorrad-grundkurs-einsiedeln/" />
      
      
          <Meta property="og:image" content="https://drivingteam.ch/images/categories/motorrad-fahrschule-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img :src="`/_vercel/image?url=%2Fimages%2Fcourses%2Fmotorrad-grundkurs-hero.webp&w=828&q=60`" :srcset="`/_vercel/image?url=%2Fimages%2Fcourses%2Fmotorrad-grundkurs-hero.webp&w=640&q=55 640w, /_vercel/image?url=%2Fimages%2Fcourses%2Fmotorrad-grundkurs-hero.webp&w=828&q=60 828w, /_vercel/image?url=%2Fimages%2Fcourses%2Fmotorrad-grundkurs-hero.webp&w=1080&q=60 1080w`" sizes="100vw" alt="Motorrad Grundkurs – Sicheres Fahren auf zwei Rädern lernen mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" loading="eager" fetchpriority="high" width="828" height="550" />      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-4">Motorrad Grundkurs Einsiedeln</h1>
          <p class="text-base xs:text-xl text-primary-200 mb-2">In Kooperation mit Fahrschule Bisig</p>
          <p class="text-base xs:text-xl text-white mb-2">Kompletter Kurs in Einsiedeln nur für <strong>CHF 600.–</strong> anstatt 630.-</p>
          <p class="text-base xs:text-xl text-white mb-8">Praxisorientierter Motorrad Grundkurs: 3 Kursteile à 4 Stunden. Max. 5 Teilnehmer. Inkl. Kursbestätigung & Getränk.</p>
          <a href="https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Einsiedeln" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt anmelden
          </a>
        </div>
      </div>
    </section>

    <!-- Kursübersicht -->
    <CourseOverviewSection
      title="Motorrad Grundkurs Einsiedeln"
      description="Wir gestalten den Motorrad Grundkurs in Einsiedeln praxisorientiert, sodass du intensiv üben und stark davon profitieren kannst. In Kooperation mit der Fahrschule Bisig."
      :requirements="[
        'Gültiger Lernfahrausweis der Kategorie A1/A',
        'Selbständiges Fahren von A nach B möglich',
        'Eigenes Motorrad/Roller',
        'Eigene Motorrad-Sicherheitsbekleidung inkl. Helm'
      ]"
      :details="[
        '🏍️ Kompletter Kurs: <strong>CHF 600.-</strong> (Kosten pro Kursteil CHF 200.-)',
        '👥 Maximal <strong>5 Teilnehmer</strong>',
        '📜 Inkl. <strong>Kursbestätigung & Getränk</strong>',
        '📍 Treffpunkt: <strong>Fahrschule Bisig, Bennauerstrasse 48, 8836 Bennau</strong>'
      ]"
      :important-notes="[
        'Für Kategorie A1 sind neu ebenfalls die Kursteile 1, 2 & 3 zu absolvieren. (Für Inhaber der Kategorie B ist dann keine praktische Prüfung notwendig.)',
        'Wenn du die Kategorie A1 OHNE GESCHWINDIGKEITSBESCHRÄNKUNG (45km/h) bereits seit mindestens 31.12.2020 besitzt und die Kategorie A beschränkt (35kW) machen willst, dann melde dich nur für den Kursteil 3 an.'
      ]"
      :stats="{ requirements: 4, details: 4, hours: '12h' }"
    />

    <!-- Standort & Map -->
    <LazyStandortMapSection location-key="einsiedeln" />

    <!-- Kategorien -->
    <ClientOnly>
      <MotorradKategorienSection />
    </ClientOnly>

    <!-- Kursteile -->
    <section class="section-container">
      <h2 class="heading-md mb-10 text-center">Kursinhalte – 3 Kursteile</h2>
      <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-900 mb-3">🔵 Teil 1</h3>
          <p class="text-gray-600 text-sm">Fahrzeugbeherrschung im Langsamfahrbereich, Parcours, Betriebssicherheit, Motorradbekleidung, gesetzliche Aspekte, Fahren im Verkehr</p>
        </div>
        <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-900 mb-3">🟡 Teil 2</h3>
          <p class="text-gray-600 text-sm">Schnelle und sichere Bremsmanöver, Kreisverkehrsplätze, Rechtsvortritt, Berganfahren, Vortrittsregeln, Parkieren</p>
        </div>
        <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-900 mb-3">🟢 Teil 3</h3>
          <p class="text-gray-600 text-sm">Sicheres Kurvenfahren, Mitnahme eines Sozius, Geschwindigkeitsgestaltung, Gruppenfahren</p>
        </div>
      </div>
    </section>

    <!-- Reviews -->
    <ReviewsSection category="motorrad-grundkurs" />

    <!-- FAQ -->
    <section class="section-container">
      <h2 class="heading-md mb-10 text-center">Die häufigen Fragen bezüglich Motorrad Grundkurs</h2>
      <div class="max-w-3xl mx-auto space-y-4">
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Was ist ein Motorrad-Grundkurs und warum ist er notwendig?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Ein Motorrad-Grundkurs beim Driving Team vermittelt essenzielle Fähigkeiten für sicheres Motorradfahren, darunter die korrekte Sitzposition, Fahrzeugbedienung, Kurvenfahren und schnelles Bremsen. Er ist gesetzlich vorgeschrieben, um sicherzustellen, dass alle Motorradfahrer in der Schweiz die notwendigen Kenntnisse für die Teilnahme am Strassenverkehr besitzen.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wer muss einen Motorrad-Grundkurs in der Schweiz absolvieren?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">In der Schweiz ist der Motorrad-Grundkurs Pflicht für alle, die einen Führerschein der Kategorie A1 oder A (beschränkt) anstreben. Dieser Kurs ist ein wesentlicher Schritt, um die nötige Befähigung für sicheres Motorradfahren zu erlangen.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viele Stunden umfasst der Motorrad-Grundkurs bei Driving Team?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Der Motorrad-Grundkurs beim Driving Team umfasst insgesamt 12 Stunden, aufgeteilt in 3 Kursteile à 4 Stunden. Diese Struktur gewährleistet eine umfassende Ausbildung in allen wichtigen Bereichen des Motorradfahrens.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Kann ich meinen eigenen Helm und Schutzkleidung mitbringen?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Ja, beim Driving Team ist es erforderlich, dass Teilnehmende ihre eigene Motorrad-Sicherheitsbekleidung, einschliesslich eines Motorradhelms, mitbringen. Solltest du keinen Helm oder Schutzkleidung besitzen, bieten wir eine begrenzte Anzahl an Helmen, Jacken und Hosen zur Miete an (CHF 10.- Umtriebsentschädigung pro Nutzung).</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Themen werden im Motorrad-Grundkurs behandelt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <div class="text-gray-600 mt-4 text-sm">
            <p class="mb-2">Der Kurs ist in drei Teile gegliedert:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Teil 1:</strong> Fahrzeugbeherrschung im Langsamfahrbereich, Parcours, Betriebssicherheit, Motorradbekleidung, gesetzliche Aspekte, Fahren im Verkehr.</li>
              <li><strong>Teil 2:</strong> Schnelle und sichere Bremsmanöver, Kreisverkehrsplätze, Rechtsvortritt, Berganfahren, Vortrittsregeln, Parkieren.</li>
              <li><strong>Teil 3:</strong> Sicheres Kurvenfahren, Mitnahme eines Sozius, Geschwindigkeitsgestaltung, Gruppenfahren.</li>
            </ul>
          </div>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie kann ich mich für einen Motorrad-Grundkurs anmelden?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Die Anmeldung für einen Motorrad-Grundkurs beim Driving Team ist einfach und unkompliziert. Klicke auf einen der «Jetzt anmelden»-Buttons auf dieser Seite. Solltest du Fragen haben, stehen wir dir jederzeit per E-Mail oder telefonisch zur Verfügung.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viel kostet der Motorrad-Grundkurs in Einsiedeln?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Beim Driving Team in Einsiedeln beträgt die Gebühr für jeden Kursteil des Motorrad-Grundkurses CHF 200.-. Die Bezahlung erfolgt bequem vor Ort in bar.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es eine Rückerstattungspolitik, falls ich nicht am Kurs teilnehmen kann?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Ja, beim Driving Team verstehen wir, dass Pläne sich ändern können. Frühzeitige Umbuchungen oder Absagen sind daher kostenlos möglich. Bei Umbuchungen oder Absagen weniger als 14 Tage vor Kursbeginn erheben wir eine Umtriebsentschädigung von CHF 80.-.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet der Motorrad-Grundkurs Einsiedeln statt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Der Treffpunkt befindet sich direkt vor dem Lokal der Fahrschule Bisig: Bennauerstrasse 48, 8836 Bennau. Dort wirst du zu Beginn des Kurses von unserem Instruktor begrüsst.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Was passiert bei schlechtem Wetter?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Bei Driving Team legen wir grossen Wert auf Sicherheit. Sollten die Wetterbedingungen, wie Temperaturen unter 5 Grad Celsius oder heftige Niederschläge, ein sicheres Fahren nicht zulassen, kann der Kurs verschoben werden. Wir informieren die Teilnehmenden rechtzeitig.</p>
        </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es spezielle Vorbereitungen, die ich vor dem Kurs treffen sollte?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Vor der Teilnahme am Motorrad-Grundkurs beim Driving Team ist es wichtig, dass du zumindest grundlegende Fähigkeiten im selbstständigen Fahren deines Motorrads besitzt. Es sind keine weiteren speziellen Vorbereitungen erforderlich. Solltest du dich jedoch unsicher fühlen oder das Fahren deines Motorrads noch nicht beherrschen, bieten wir individuelle Fahrstunden an. In diesen persönlichen 1-zu-1 Fahrstunden kannst du unter Anleitung unserer erfahrenen Motorradfahrlehrer die grundlegende Handhabung und das Fahren üben, um bestens auf den Grundkurs vorbereitet zu sein.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie geht es nach dem Abschluss des Motorrad-Grundkurses weiter?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Nach erfolgreichem Abschluss des Motorrad-Grundkurses empfehlen wir, das Erlernte kontinuierlich zu üben, um dich optimal auf die praktische Führerscheinprüfung vorzubereiten. Um deine Fähigkeiten weiter zu verbessern und dich bestmöglich auf die Prüfungssituation einzustellen, bieten wir spezielle Prüfungsvorbereitungskurse oder Fahrstunden an, die eine Prüfungssimulation mit unseren erfahrenen Motorradfahrlehrern umfassen. Diese zusätzliche Vorbereitung kann dir helfen, mehr Sicherheit im Umgang mit dem Motorrad zu gewinnen und die Prüfung erfolgreich zu bestehen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Bietet Driving Team weitere Trainings oder Kurse für Motorradfahrer an?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Ja, neben dem Motorrad-Grundkurs bietet Driving Team eine Vielzahl an zusätzlichen Kursen an, die auf die Bedürfnisse und Fähigkeiten von Motorradfahrern zugeschnitten sind. Dazu gehören Schräglagentrainings, die deine Fertigkeiten in Kurvenfahrten verbessern, Soziusfahrkurse, die sich auf das Fahren mit einem Beifahrer konzentrieren, sowie spezielle Prüfungsvorbereitungskurse, die darauf abzielen, dich bestmöglich auf die Motorradführerscheinprüfung vorzubereiten. Diese Kurse sind ideal, um deine Fahrtechnik zu verfeinern und deine Sicherheit auf der Strasse zu erhöhen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie erhalte ich die unlimitierte Kategorie A?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Um die unlimitierte Kategorie A in der Schweiz zu erhalten, musst du zunächst die praktische Prüfung für die beschränkte Kategorie A (35 kW) erfolgreich bestehen. Anschliessend sind zwei Jahre Fahrpraxis mit dieser Beschränkung erforderlich. Nach Ablauf dieser zwei Jahre muss eine weitere praktische Prüfung absolviert werden.</p>
          </details>
      </div>
    </section>

    <!-- Warum Section -->
    <WarumSection category="motorrad" />

    <!-- Standort & Map -->
    <LazyStandortMapSection location-key="einsiedeln" />

    <!-- Andere Standorte -->
    <section class="section-container py-8">
      <h3 class="text-lg font-bold mb-5 text-center text-gray-900">Motorrad Grundkurs an weiteren Standorten</h3>
      <div class="flex flex-wrap justify-center gap-3">
        <a href="/motorrad-grundkurs-zuerich/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">🏍️ Grundkurs Zürich</a>
        <a href="/motorrad-grundkurs-lachen/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">🏍️ Grundkurs Lachen</a>
        <a href="/motorrad-grundkurs-zug/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">🏍️ Grundkurs Zug</a>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt Motorrad Grundkurs Einsiedeln buchen!</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Einsiedeln" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt anmelden</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "Motorrad Grundkurs Einsiedeln", "description": "Motorrad Grundkurs in Einsiedeln. 3x4h, max. 5 Teilnehmer. In Kooperation mit Fahrschule Bisig.", "url": "https://drivingteam.ch/motorrad-grundkurs-einsiedeln/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "price": "600", "priceCurrency": "CHF" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Einsiedeln" } }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "AggregateRating", "itemReviewed": { "@type": "Course", "name": "Motorrad Grundkurs Einsiedeln", "url": "https://drivingteam.ch/motorrad-grundkurs-einsiedeln/" }, "ratingValue": 5.0, "bestRating": 5, "worstRating": 1, "ratingCount": 7, "reviewCount": 7 }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Was ist ein Motorrad-Grundkurs?", "acceptedAnswer": {"@type": "Answer", "text": "Der Motorrad-Grundkurs vermittelt essenzielle Fahrkenntnisse und ist für die Kategorien A1 und A (beschränkt) gesetzlich vorgeschrieben."}}, {"@type": "Question", "name": "Wo findet der Motorrad-Grundkurs Einsiedeln statt?", "acceptedAnswer": {"@type": "Answer", "text": "Der Kurs findet in Kooperation mit Fahrschule Bisig in Bennau (Bennauerstrasse 48, 8836 Bennau/SZ) statt."}}, {"@type": "Question", "name": "Wie viel kostet der Motorrad-Grundkurs in Einsiedeln?", "acceptedAnswer": {"@type": "Answer", "text": "Der komplette Kurs kostet CHF 600.- (3 Teile)."}}, {"@type": "Question", "name": "Wie viele Stunden umfasst der Kurs?", "acceptedAnswer": {"@type": "Answer", "text": "Insgesamt 12 Stunden, aufgeteilt in 3 Kursteile à 4 Stunden. Max. 5 Teilnehmer."}}, {"@type": "Question", "name": "Was passiert bei schlechtem Wetter?", "acceptedAnswer": {"@type": "Answer", "text": "Bei Temperaturen unter 5 Grad oder starkem Regen kann der Kurs angepasst oder verschoben werden."}}, {"@type": "Question", "name": "Welche Themen werden behandelt?", "acceptedAnswer": {"@type": "Answer", "text": "Teil 1: Fahrzeugbeherrschung. Teil 2: Bremsmanöver. Teil 3: Kurvenfahren und Gruppenfahren."}}, {"@type": "Question", "name": "Muss ich ein eigenes Motorrad mitbringen?", "acceptedAnswer": {"@type": "Answer", "text": "In der Regel ja. Ein Mietfahrzeug ist auf Anfrage verfügbar."}}, {"@type": "Question", "name": "Welche Sprachen werden angeboten?", "acceptedAnswer": {"@type": "Answer", "text": "Der Kurs wird auf Deutsch durchgeführt."}}, {"@type": "Question", "name": "Wie erhalte ich die unlimitierte Kategorie A?", "acceptedAnswer": {"@type": "Answer", "text": "Nach 2 Jahren Fahrpraxis mit beschränkter A (35 kW) folgt eine weitere Prüfung für die unlimitierte Kategorie A."}}]}) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Motorrad Grundkurs", "item": "https://drivingteam.ch/motorrad-grundkurs/" }, { "@type": "ListItem", "position": 3, "name": "Einsiedeln", "item": "https://drivingteam.ch/motorrad-grundkurs-einsiedeln/" }] }) },
]
useHead({ script: jsonLdScripts })

</script>
