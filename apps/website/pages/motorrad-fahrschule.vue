<template>
  <div>
    <Head>
      <Title>Motorrad Fahrschule | A1, A35kW, A | Driving Team</Title>
      <Meta name="description" content="Motorrad Fahrschule Zürich - Kategorie A1, A35kW, A. Expert Training, moderne Bikes. Fahrstunden & Grundkurse. Jetzt anmelden!" />
      <Meta property="og:title" content="Motorrad Fahrschule | Driving Team | Zürich & Lachen/SZ" />
      <Meta property="og:description" content="Motorrad Fahrschule für alle Kategorien in Zürich und Umgebung" />
      <Link rel="canonical" href="https://drivingteam.ch/motorrad-fahrschule/" />
      
      <!-- JSON-LD Schema Markup -->
      <!-- Course Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "Motorrad Fahrschule - Kategorie A1, A35kW, A",
        "description": "Professionelle Motorrad Fahrausbildung für Kategorie A1, A35kW und A. Expert Training, moderne Bikes, flexible Fahrstunden in Zürich und Lachen",
        "provider": {
          "@type": "Organization",
          "name": "Driving Team",
          "url": "https://drivingteam.ch"
        },
        "offers": {
          "@type": "Offer",
          "price": "100-120",
          "priceCurrency": "CHF",
          "url": "https://simy.ch/booking/availability/driving-team",
          "availability": "InStock"
        },
        "educationLevel": "Intermediate",
        "learningResourceType": "Driving Course",
        "keywords": "Motorrad Fahrschule, Kategorie A Fahrstunden, Motorrad Führerschein, Fahrausbildung Zürich"
      }
      </Script>
      
      <!-- Breadcrumb Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://drivingteam.ch/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Motorrad Fahrschule",
            "item": "https://drivingteam.ch/motorrad-fahrschule/"
          }
        ]
      }
      </Script>
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/categories/motorrad-fahrschule.webp" alt="Motorrad Fahrschule Zürich - Kategorie A1, A35kW, A mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-6">Motorrad Fahrschule Kategorie A1 | A35kW | A</h1>
          <p class="hidden xs:block text-xl text-primary-100 mb-8">Bist du bereit, die Strasse mit deinem Motorrad zu erobern? Unsere Motorrad Fahrschule bietet dir professionelle Ausbildung für alle Kategorien (A1, A35kW, A) mit erfahrenen Fahrlehrern in Zürich und Lachen/SZ.</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Fahrstunden buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <WhyWeBenefitsSection :benefits="motorradBenefits" />

    <!-- Voraussetzungen -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">Voraussetzungen</h2>
        <div class="max-w-3xl mx-auto bg-white rounded-lg p-8 shadow-sm">
          <ul class="space-y-4">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Gültiger Lern-/ Fahrausweis der Kategorie A1 | A35kW | A</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Motorrad Sicherheitsbekleidung (mindestens Helm & Handschuhe | Motorradjacke, -hose und -schuhe sind empfehlenswert)</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Eigenes betriebssicheres Motorrad/Roller</p>
            </li>
          </ul>
          <div class="mt-6 p-4 bg-primary-50 rounded-lg">
            <p class="text-sm text-primary-800">Du bist noch nie Motorrad gefahren? Kein Problem! Wir begleiten dich sicher auf deinen ersten Metern. Fahrschul-Motorrad für 20.- pro Lektion auf Anfrage in Zürich vorhanden (nur für Fahrstunden vor dem Grundkurs).</p>
          </div>
        </div>
      </div>
    </section>

    <cta-section />

    <!-- Process Steps -->
    <section class="section-container py-16">
      <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Allgemeiner Ausbildungsablauf</h2>
      
      <div class="space-y-8 max-w-4xl mx-auto">
        <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
          <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">1</div>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <h3 class="text-base md:text-lg lg:text-xl font-bold">Nothelferkurs</h3>
              <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
            </div>
          </summary>
          <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Bevor du das Lernfahrgesuch beim Strassenverkehrsamt einreichen kannst, musst du den Nothelferkurs absolvieren. Falls du bereits im Besitz eines Nothelferausweises bist, ist dieser ab Ausstellungsdatum sechs Jahre gültig.</p>
              <p class="text-sm text-gray-500 mt-2 italic">Für Inhaber:innen der Kategorie B Auto ist dies nicht notwendig – weiter mit Schritt 2.</p>
              <div class="mt-3">
                <a href="/nothelferkurs/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Nothelferkurs anmelden - Erste Hilfe Ausbildung">Jetzt Nothelferkurs anmelden</a>
              </div>
          </div>
        </details>

        <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
          <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">2</div>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <h3 class="text-base md:text-lg lg:text-xl font-bold">Lernfahrgesuch Motorrad | Roller</h3>
              <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
            </div>
          </summary>
          <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Fülle das Lernfahrgesuch vollständig und wahrheitsgetreu aus und gehe damit zu einem Optiker oder Augenarzt, um den Sehtest eintragen zu lassen. Anschliessend musst du mit dem ausgefüllten Anmeldeformular, Nothelferausweis, einem farbigen Passfoto und ID/Pass persönlich beim Strassenverkehrsamt vorbeigehen.</p>
              <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                <p class="text-xs font-semibold text-gray-700 mb-1">Neue Regeln seit 01.01.2021:</p>
                <ul class="text-xs text-gray-600 space-y-1">
                  <li>• Kategorie A1 bis maximal 50ccm, 45km/h und 4kW ab 15 Jahren</li>
                  <li>• Kategorie A1 bis maximal 125ccm ab 16 Jahren</li>
                  <li>• Kategorie A beschränkt bis 35kW ab 18 Jahren</li>
                  <li>• Kategorie A unbeschränkt: 2 Jahre Fahrpraxis mit A beschränkt + 2. Fahrprüfung</li>
                </ul>
              </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-ZH.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Zürich herunterladen - PDF">Lernfahrgesuch Zürich (PDF)</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-SZ.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Schwyz herunterladen - PDF">Lernfahrgesuch Schwyz (PDF)</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-SG.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch St.Gallen herunterladen - PDF">Lernfahrgesuch St.Gallen (PDF)</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-AG.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Aargau herunterladen - PDF">Lernfahrgesuch Aargau (PDF)</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-GL.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Glarus herunterladen - PDF">Lernfahrgesuch Glarus (PDF)</a>
                </div>
          </div>
        </details>

        <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
          <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">3</div>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <h3 class="text-base md:text-lg lg:text-xl font-bold">Theorieprüfung</h3>
              <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
            </div>
          </summary>
          <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Nach erfolgter Anmeldung erhältst du eine Bestätigung mit PIN-Code, mit dem du dich an die Theorieprüfung anmelden kannst. Um dich optimal vorzubereiten, empfehlen wir dir, mit einem Theoriebuch zu lernen und anschliessend die Fragen mit einer Lern-CD oder App zu üben. Denn eine solide theoretische Grundlage spart Fahrstunden!</p>
              <p class="text-sm text-gray-500 mt-2 italic">Für Inhaber:innen der Kategorie B (Auto) ist dies nicht notwendig – weiter mit Schritt 5 (Fahrstunden).</p>
          </div>
        </details>

        <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
          <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">4</div>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <h3 class="text-base md:text-lg lg:text-xl font-bold">Verkehrskunde VKU</h3>
              <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
            </div>
          </summary>
          <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Im total achtstündigen Verkehrskundekurs VKU wirst du von unseren Fahrlehrern ausführlich auf den Alltag im Strassenverkehr vorbereitet. Der Abschluss des VKU ist obligatorisch und eine Voraussetzung für die praktische Fahrprüfung. Wir empfehlen dir, den VKU gleich zu Beginn der praktischen Fahrausbildung zu besuchen.</p>
              <p class="text-sm text-gray-500 mt-2 italic">Nicht notwendig für Inhaber:innen der Kategorie B (Auto) – weiter mit Schritt 5 Fahrstunden. | 2 Kursteile à 4 Stunden</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <a href="/vku-kurs-zuerich/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">VKU Zürich</a>
                <a href="/vku-kurs-lachen/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">VKU Lachen</a>
              </div>
          </div>
        </details>

        <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
          <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">5</div>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <h3 class="text-base md:text-lg lg:text-xl font-bold">Motorrad | Roller Fahrstunden</h3>
              <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
            </div>
          </summary>
          <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Wir legen dir ans Herz, deine ersten Motorrad Fahrstunden gleich zu Beginn bei unseren qualifizierten Motorrad Fahrlehrer:innen in Angriff zu nehmen. Falsch erlernte Angewohnheiten und Automatismen lassen sich später nur mit erhöhtem Zeit- und Kostenaufwand korrigieren.</p>
              <p class="text-sm text-gray-600 mt-2">Unser Fahrschul-Motorrad steht dir zur Verfügung und kann für nur 20 CHF pro Lektion gemietet werden. Für die Prüfungsvorbereitung empfehlen wir, den letzten Schliff bei deinem Motorrad Fahrlehrer zu holen.</p>
              <div class="mt-3 p-3 bg-primary-50 rounded-lg">
                <p class="text-xs font-semibold text-primary-800">Preise:</p>
                <p class="text-xs text-primary-700">Motorrad | Roller Doppellektion CHF 190.- (90 Minuten) | Aus Gründen der Effizienz machen wir nur Doppellektionen.</p>
                <p class="text-xs text-primary-700 mt-1">Admin- und Versicherungspauschale: keine (Da Motorrad | Roller bereits versichert ist und Prüfungstermin machen die Fahrschüler:innen selber.)</p>
              </div>
          </div>
        </details>

        <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
          <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">6</div>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <h3 class="text-base md:text-lg lg:text-xl font-bold">Motorrad | Roller Grundkurs</h3>
              <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
            </div>
          </summary>
          <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Wenn du die Kategorie A1 nach dem 01.01.2021 erworben hast und jetzt die Kategorie A35kW absolvieren möchtest, musst du den Grundkurs nicht mehr besuchen. Um dein Fahrzeug besser und sicherer unter Kontrolle zu haben, empfehlen wir dir den Grundkurs trotzdem zu besuchen. Mögliche Themen sind zum Beispiel Manöver, Kurvenfahren, eine schnelle & sichere Bremsung und vieles mehr.</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <a href="/motorrad-grundkurs-zuerich/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">Grundkurs Zürich</a>
                <a href="/motorrad-grundkurs-lachen/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">Grundkurs Lachen</a>
                <a href="/motorrad-grundkurs-einsiedeln/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">Grundkurs Einsiedeln</a>
                <a href="/motorrad-grundkurs-zug/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">Grundkurs Zug</a>
              </div>
          </div>
        </details>

        <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
          <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">7</div>
            </div>
            <div class="flex-1 flex items-center justify-between">
              <h3 class="text-base md:text-lg lg:text-xl font-bold">Praktische Motorradprüfung</h3>
              <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
            </div>
          </summary>
          <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Um die praktische Motorradprüfung zu bestehen, braucht es heute mehr denn je. Trotz diesen hohen Anforderungen hast du mit einer seriösen und umfangreichen Fahrausbildung gute Erfolgschancen.</p>
              <p class="text-sm text-gray-600 mt-2">Die Motorradfahrprüfung beginnt in der Regel mit dem Manöverteil wie z. B. Spurgasse, versetzter Slalom und die 8-fahren. Anschliessend möchte der Verkehrsexperte sehen, wie du dein Motorrad von 50km/h möglichst schnell und sicher zum Stillstand bringst.</p>
              <p class="text-sm text-gray-600 mt-2">Bei der Kategorie A35kW oder A unlimitiert musst du noch beweisen, dass es für dich kein Problem darstellt, mit einer zweiten Person auf deinem Motorrad im Strassenverkehr unterwegs zu sein.</p>
          </div>
        </details>
      </div>

      <div class="text-center mt-12">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary text-lg" aria-label="Motorrad Fahrstunden jetzt buchen - Flexible Fahrschule Zürich">
            Jetzt Motorrad Fahrstunden buchen
          </a>
      </div>
    </section>

    <ReviewsSection category="motorrad" />

    <PriceSection category="motorrad" />

    <CtaSection title="Jetzt mit der Motorrad Fahrschule starten!" />


    <!-- Motorrad Kurse -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-center">Motorrad Kurse</h2>
        <p class="text-center text-gray-600 mb-10 max-w-3xl mx-auto">Wie überall im Leben hat man auch beim Motorradfahren nie ausgelernt. Mehrmals im Jahr veranstalten wir Events und Trainings, bei denen du deine Fähigkeiten vertiefen kannst.</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <a href="/motorrad-grundkurs-zuerich/" class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary-200 p-6 text-center">
            <p class="text-3xl mb-3">🏍️</p>
            <p class="font-bold text-gray-900 text-sm">Grundkurs</p>
            <p class="text-xs text-primary-600 font-semibold mt-1">Zürich</p>
          </a>
          <a href="/motorrad-grundkurs-lachen/" class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary-200 p-6 text-center">
            <p class="text-3xl mb-3">🏍️</p>
            <p class="font-bold text-gray-900 text-sm">Grundkurs</p>
            <p class="text-xs text-primary-600 font-semibold mt-1">Lachen</p>
          </a>
          <a href="/motorrad-grundkurs-einsiedeln/" class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary-200 p-6 text-center">
            <p class="text-3xl mb-3">🏍️</p>
            <p class="font-bold text-gray-900 text-sm">Grundkurs</p>
            <p class="text-xs text-primary-600 font-semibold mt-1">Einsiedeln</p>
          </a>
          <a href="/motorrad-grundkurs-zug/" class="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary-200 p-6 text-center">
            <p class="text-3xl mb-3">🏍️</p>
            <p class="font-bold text-gray-900 text-sm">Grundkurs</p>
            <p class="text-xs text-primary-600 font-semibold mt-1">Zug</p>
          </a>
        </div>
        <div class="text-center mt-8">
          <a href="/motorrad-weiterbildung/" class="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-700 transition shadow-md">
            🏍️ Motorrad-Weiterbildung für erfahrene Fahrer
          </a>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="section-container">
      <h2 class="heading-md mb-12 text-center">Häufig gestellte Fragen</h2>
      <div class="max-w-3xl mx-auto space-y-4 mb-12">
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Welche Kategorien gibt es für Motorräder?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">A1 (bis 50ccm ab 15 J. / bis 125ccm ab 16 J.), A35kW beschränkt (ab 18 J.) und A unbeschränkt (nach 2 Jahren A35kW-Praxis). Wir bieten Ausbildung für alle Kategorien an.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Ist der Grundkurs obligatorisch?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der Grundkurs ist für alle drei Kategorien obligatorisch. Seit 01.01.2021 gilt: Wer die Kategorie A1 nach diesem Datum erworben hat und jetzt A35kW machen möchte, muss den Grundkurs nicht mehr besuchen. Wir empfehlen ihn dennoch für mehr Sicherheit.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Kann ich ein Fahrschul-Motorrad mieten?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Ja! In Zürich-Altstetten können Anfänger:innen unser Fahrschul-Motorrad (Kat. 35kW) für 20.- pro Lektion mieten. Helm und Sicherheitsausrüstung müssen selber organisiert werden.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet die Motorrad Fahrausbildung insgesamt?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Gesamtkosten für einen Motorrad-Führerschein betragen in der Schweiz durchschnittlich CHF 1'500–2'500, abhängig von der Anzahl benötigter Fahrstunden. Dies beinhaltet den Nothelferkurs (ca. CHF 100), Sehtest (CHF 20), Lernfahrausweis (CHF 40), Theorieprüfung (CHF 40), Grundkurs (CHF ca.500), Fahrstunden (durchschnittlich 10–15 à CHF 95), praktische Prüfung (CHF 100) und den Fahrausweis (CHF 60). Die genauen Kosten hängen von deiner Kategorie und der Anzahl benötigter Fahrstunden ab.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was sind die Voraussetzungen für die Motorrad Führerausweis?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Um einen Motorrad Füphrerausweis zu erhalten, benötigst du das erforderliche Mindestalter (A1: ab 15/16 J., A35kW: ab 18 J., A: ab 20 J. mit 2 Jahren A35kW), einen bestandenen Nothelferkurs (obligatorisch), einen bestandenen Sehtest, einen gültigen Lernfahrausweis und die Anmeldung in einer Fahrschule. Du musst in der Schweiz wohnhaft sein und einen gültigen Ausweis haben.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie lange dauert die komplette Fahrausbildung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Dauer der Motorrad-Fahrausbildung hängt von deinem Tempo und Lernfortschritt ab. Die Theorieausbildung dauert typischerweise 4–6 Wochen. Der Grundkurs dauert 1–2 Tage. Die praktische Ausbildung mit 10–15 Fahrstunden dauert 2–4 Wochen. Insgesamt solltest du mit 2–3 Monaten rechnen, wenn du zügig voranschreitest und regelmässig trainierst.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was ist der VKU Kurs und ist er obligatorisch?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der VKU (Verkehrskundeunterricht) ist ein obligatorischer 8-stündiger Kurs, den du absolvieren musst, bevor du zur praktischen Prüfung antreten kannst. Der Kurs findet an zwei Tagen zu je 4 Stunden statt und behandelt Themen wie Verkehrssicherheit, Verhaltensregeln und praktisches Wissen. Er ist eine wichtige Vorbereitung auf die Prüfung und kostet etwa CHF 200–300.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Kann ich bereits mit 17 Jahren fahren?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das hängt von der Kategorie ab. Für A1 kannst du bereits ab 15 Jahren fahren (oder ab 16 mit 125ccm). Für A35kW benötigst du ein Mindestalter von 18 Jahren. Für die unbeschränkte Kategorie A brauchst du mindestens 20 Jahre und 2 Jahre Erfahrung mit A35kW. Es gibt auch die Möglichkeit des begleiteten Fahrens ab 17 Jahren für A35kW.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet eine Fahrstunde bei euch?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Eine Motorrad-Fahrstunde (45 Minuten) kostet bei uns CHF 100–120, je nach Kategorie und Zeittyp. Wir bieten auch günstigere Abo-Preise an: Bei 5 Fahrstunden sparst du gegenüber Einzellektionen. Zusätzlich fallen eine Versicherungspauschale (CHF 120 einmalig) an. Kontaktiere uns für aktuelle Preise und individuelle Angebote.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was tun bei Durchfall der praktischen Prüfung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wenn du die praktische Prüfung nicht bestehst, ist das kein Problem – viele benötigen einen zweiten Versuch! Wir helfen dir gerne mit zusätzlichen Fahrstunden, um deine Schwachstellen zu verbessern. Dein Lernfahrausweis bleibt 24 Monate gültig, du kannst die Prüfung beliebig oft wiederholen. Eine Wiederholungsprüfung kostet CHF 130 und kann frühestens nach einer Woche erneut angemeldet werden.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Muss ich einen Erste-Hilfe-Kurs machen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Ja, der Nothelferkurs (Erste-Hilfe-Kurs) ist obligatorisch und eine Voraussetzung für den Führerschein. Der Kurs dauert etwa 3–4 Stunden und vermittelt essenzielle Notfallmassnahmen. Dein Nothelferkurs-Zertifikat ist ab dem Ausstellungsdatum 6 Jahre gültig. Der Kurs kostet etwa CHF 100–150 und kann bei verschiedenen Organisationen absolviert werden.</p>
        </details>
      </div>

      <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-8 text-center">
        <p class="text-lg text-gray-900 mb-4">Weitere Fragen? Wir helfen gerne weiter!</p>
        <a href="tel:+41444310033" class="btn-primary">
          📞 Jetzt anrufen!
        </a>
      </div>
      
      <!-- FAQPage Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Welche Kategorien gibt es für Motorräder?",
            "acceptedAnswer": {"@type": "Answer", "text": "A1 (bis 50ccm ab 15 J. / bis 125ccm ab 16 J.), A35kW beschränkt (ab 18 J.) und A unbeschränkt (nach 2 Jahren A35kW-Praxis). Wir bieten Ausbildung für alle Kategorien an."}
          },
          {
            "@type": "Question",
            "name": "Ist der Grundkurs obligatorisch?",
            "acceptedAnswer": {"@type": "Answer", "text": "Der Grundkurs ist für alle drei Kategorien obligatorisch. Seit 01.01.2021 gilt: Wer die Kategorie A1 nach diesem Datum erworben hat und jetzt A35kW machen möchte, muss den Grundkurs nicht mehr besuchen. Wir empfehlen ihn dennoch für mehr Sicherheit."}
          },
          {
            "@type": "Question",
            "name": "Kann ich ein Fahrschul-Motorrad mieten?",
            "acceptedAnswer": {"@type": "Answer", "text": "Ja! In Zürich-Altstetten können Anfänger:innen unser Fahrschul-Motorrad (Kat. 35kW) für 20.- pro Lektion mieten. Helm und Sicherheitsausrüstung müssen selber organisiert werden."}
          },
          {
            "@type": "Question",
            "name": "Was kostet die Motorrad Fahrausbildung insgesamt?",
            "acceptedAnswer": {"@type": "Answer", "text": "Die Gesamtkosten für einen Motorrad-Führerschein betragen in der Schweiz durchschnittlich CHF 1'500–2'500, abhängig von der Anzahl benötigter Fahrstunden. Dies beinhaltet den Nothelferkurs (ca. CHF 100), Sehtest (CHF 20), Lernfahrausweis (CHF 40), Theorieprüfung (CHF 40), Grundkurs (CHF ca.500), Fahrstunden (durchschnittlich 10–15 à CHF 95), praktische Prüfung (CHF 100) und den Fahrausweis (CHF 60)."}
          },
          {
            "@type": "Question",
            "name": "Was sind die Voraussetzungen für die Motorrad Führerausweis?",
            "acceptedAnswer": {"@type": "Answer", "text": "Um einen Motorrad Führerschein zu erhalten, benötigst du das erforderliche Mindestalter (A1: ab 15/16 J., A35kW: ab 18 J., A: ab 20 J. mit 2 Jahren A35kW), einen bestandenen Nothelferkurs (obligatorisch), einen bestandenen Sehtest, einen gültigen Lernfahrausweis und die Anmeldung in einer Fahrschule."}
          }
        ]
      }
      </Script>
    </section>

    <!-- Why Choose Us -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-center">Warum die Motorrad Fahrschule Driving Team?</h2>
        <p class="text-center text-gray-600 mb-10 max-w-3xl mx-auto">Unsere Motorrad Fahrschule wurde gegründet, um das traditionelle Bild des Fahrschulunterrichts zu verändern. Wir wissen, dass Lernen am besten funktioniert, wenn es mit Begeisterung geschieht. Deshalb haben wir eine Fahrschule aufgebaut, die nicht nur Wissen vermittelt, sondern auch Freude am Fahren weckt.</p>
        <div class="grid md:grid-cols-3 gap-8 mb-12">
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">🏆</p>
            <h3 class="font-bold text-lg mb-2">Motorrad-Spezialisten</h3>
            <p class="text-gray-600">Unsere Motorrad-Fahrlehrer haben jahrelange Erfahrung und sind selbst begeisterte Motorrad-Fahrer.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">⚡</p>
            <h3 class="font-bold text-lg mb-2">Fahrschul-Motorrad verfügbar</h3>
            <p class="text-gray-600">Kein eigenes Motorrad? Kein Problem – unser Fahrschul-Motorrad steht dir in Zürich-Altstetten zur Verfügung.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">✅</p>
            <h3 class="font-bold text-lg mb-2">Sicherheit First</h3>
            <p class="text-gray-600">Sicherheit ist unsere höchste Priorität bei jeder Fahrstunde. Wir bereiten dich bestmöglich auf alle Situationen vor.</p>
          </div>
        </div>

        <!-- Unsere Gebiete -->
        <h3 class="font-bold text-xl mb-6 text-center">Unsere Gebiete</h3>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="/fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Zürich</a>
          <a href="/fahrschule-lachen/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Lachen</a>
          <a href="/fahrschule-uster/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Uster</a>
          <a href="/fahrschule-aargau/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Aargau</a>
          <a href="/fahrschule-dietikon/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Dietikon</a>
          <a href="/fahrschule-reichenburg/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Reichenburg</a>
          <a href="/fahrschule-stgallen/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule St.Gallen</a>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <CtaSection title="Jetzt mit der Motorrad Fahrschule starten!" />
    
    <ReviewsSection category="default" />
    <GutscheinSection />
    <StandorteSection />
    
    <!-- Related/See Also Section -->
    <section class="section-container py-12 bg-gray-50">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-bold mb-6">Interessierst du dich auch für andere Kategorien?</h2>
        <p class="text-gray-600 mb-8">
          Vergleiche die Motorrad Fahrschule mit anderen Fahrzeugklassen oder finde einen Standort in deiner Nähe.
        </p>
        <div class="flex flex-wrap gap-4">
          <a href="/fahrschule-kategorien/" class="inline-block bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 transition" aria-label="Alle Fahrschule Kategorien vergleichen">
            📊 Alle Kategorien vergleichen
          </a>
          <a href="/fahrschule-standorte/" class="inline-block bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition" aria-label="Fahrschule Standorte ansehen">
            📍 Standorte finden
          </a>
          <a href="/auto-fahrschule/" class="inline-block border-2 border-primary-600 text-primary-600 px-6 py-2 rounded hover:bg-primary-50 transition" aria-label="Auto Fahrschule ansehen">
            🚗 Auto Fahrschule
          </a>
        </div>
      </div>
    </section>
    
    <WarumSection category="motorrad" />
  </div>
</template>

<script setup lang="ts">
const motorradBenefits = [
  {
    title: 'Blutiger Anfänger?',
    description: 'Wir begleiten dich von der ersten Stunde an und bringen dir alles bei, was du für deinen A1 Führerschein oder die grösseren Kategorien A35kW oder A benötigst.'
  },
  {
    title: 'Individuelle Förderung?',
    description: 'Buche massgeschneiderte Privatstunden, um deine Fahrfähigkeiten gezielt zu verbessern.'
  },
  {
    title: 'Gemeinsam Lernen?',
    description: 'Unsere Gruppenkurse bieten eine motivierende Atmosphäre.'
  },
  {
    title: 'Prüfungssimulation?',
    description: 'Bereite dich optimal auf die Motorradprüfung vor, damit am grossen Tag nichts schiefgeht.'
  },
  {
    title: 'Auffrischungskurs?',
    description: 'Auch wenn du bereits im Besitz des Motorrad Führerausweises bist und deine Fahrfähigkeiten auffrischen möchtest, bist du in unseren Motorrad Fahrstunden bestens aufgehoben.'
  }
]
</Script>
