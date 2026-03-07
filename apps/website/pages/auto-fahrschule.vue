<template>
  <div>
    <Head>
      <Title>Auto Fahrschule | Zürich | Driving Team</Title>
      <Meta name="description" content="Auto Fahrschule Zürich - 95% Pass Rate, ab CHF 100/Lektion. Flexible Zeiten, erfahrene Fahrlehrer. Jetzt buchen!" />
      <Meta property="og:title" content="Auto Fahrschule Kategorie B | Driving Team" />
      <Meta property="og:description" content="Auto Fahrschule in Zürich für Kategorie B Ausbildung" />
      <Link rel="canonical" href="https://drivingteam.ch/auto-fahrschule/" />
      
      <!-- JSON-LD Schema Markup -->
      <!-- Course Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "Auto Fahrschule - Kategorie B",
        "description": "Professionelle Auto Fahrausbildung für Kategorie B. 95% Erfolgsquote, flexible Fahrstunden, erfahrene Fahrlehrer in Zürich",
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
        "keywords": "Auto Fahrschule, Kategorie B Fahrstunden, Auto Führerschein, Fahrausbildung Zürich"
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
            "name": "Auto Fahrschule",
            "item": "https://drivingteam.ch/auto-fahrschule/"
          }
        ]
      }
      </Script>
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-500 to-primary-700 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/categories/auto-fahrschule.webp" alt="Auto Fahrschule Zürich - Kategorie B Fahrstunden mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-6">Auto Fahrschule Kategorie B</h1>
          <p class="hidden xs:block text-xl text-primary-100 mb-8">Träumst du davon, die Freiheit auf vier Rädern zu erleben? Dann bist du bei unserer Auto Fahrschule genau richtig! Wir wissen, dass der Weg zum Auto Führerschein der Kategorie B nicht nur sicher, sondern auch angenehm sein sollte.</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <WhyWeBenefitsSection :benefits="autoBenefits" />

    <!-- Voraussetzungen -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">Voraussetzungen</h2>
        <div class="max-w-3xl mx-auto bg-white rounded-lg p-8 shadow-sm">
          <ul class="space-y-4">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Nothelferkurs frühestens mit 14 Jahren</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Lernfahrgesuch wahrehitsgetreu inkl. Sehtest (2 Jahre gültig) eingereicht</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Gültiger Lernfahrausweis und Mindestalter 17 Jahre um mit Lernfahrten beginnen zu dürfen</p>
            </li>
        
          </ul>
          <div class="mt-6 p-4 bg-primary-50 rounded-lg">
            <p class="text-sm text-primary-800">Wenn du bereits im Besitz eines gültigen Lernfahr- oder Fahrausweises einer anderen Kategorie (z.B. Motorrad) bist, musst du den Nothelferkurs, den Verkehrskundekurs und die Theorie nicht erneut absolvieren.</p>
          </div>
        </div>
      </div>
    </section>

    <cta-section />

    <!-- Process Steps -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Weg zur Autoprüfung - In 7 Schritten zur Autoprüfung</h2>
        
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
                <p class="text-gray-600 mb-2">Dein Start zum Führerschein: Gesuch und Nothelferkurs</p>
                <p class="text-sm text-gray-600">Der erste wichtige Schritt auf dem Weg zu deinem Führerschein ist die Einreichung des Lernfahrgesuchs für die Kategorie B (Auto) beim Strassenverkehrsamt. Parallel dazu musst du den Nothelferkurs absolvieren.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Gut zu wissen: Falls du bereits einen Nothelferausweis besitzt, ist dieser ab dem Ausstellungsdatum sechs Jahre gültig. Bist du schon im Besitz eines gültigen Lernfahr- oder Führerscheins einer anderen Kategorie, entfällt die Pflicht, den Nothelferkurs erneut zu besuchen.</p>
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
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Lernfahrgesuch Auto</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-gray-600 mb-2">Schritt Zwei: Dein Lernfahrgesuch einreichen und Sehtest machen</p>
                <p class="text-sm text-gray-600">Als nächsten Schritt für deinen Führerschein musst du das Lernfahrgesuch vollständig und wahrheitsgetreu ausfüllen. Achte darauf, die Kategorie B (Auto) anzukreuzen. Mit diesem Formular gehst du dann zum Strassenverkehrsamt. Danach bringst du das ausgefüllte Anmeldeformular zusammen mit deinem Nothilfeausweis, einem aktuellen farbigen Passfoto und deinem gültigen ID/Pass persönlich zum Strassenverkehrsamt.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Wichtig: Du kannst das Gesuch frühestens zwei Monate vor deinem 17. Geburtstag stellen.</p>
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
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Auto Theorieprüfung</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-gray-600 mb-2">Deine Theorieprüfung für den Führerschein</p>
                <p class="text-sm text-gray-600">Nachdem du dein Lernfahrgesuch eingereicht hast, erhältst du eine Anmeldebestätigung mit einem PIN-Code. Dieser Code ist dein Schlüssel zur Anmeldung für die Theorieprüfung – ein wichtiger Meilenstein auf dem Weg zu deinem Führerschein. Um dich optimal vorzubereiten, empfehlen wir dir, mit einem Theoriebuch zu lernen und anschliessend die Fragen mit einer Lern-CD oder App zu üben. Sobald du die Theorieprüfung erfolgreich bestanden hast, erhältst du den Lernfahrausweis für die Kategorie B (Auto), welcher 24 Monate gültig ist.</p>
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
                <p class="text-gray-600 mb-2">Der Verkehrskundekurs (VKU): Dein Weg zur praktischen Prüfung</p>
                <p class="text-sm text-gray-600">Im insgesamt achtstündigen Verkehrskundekurs (VKU) wirst du von unseren Fahrlehrern ausführlich auf den Alltag im Strassenverkehr vorbereitet. Der Abschluss des VKU ist obligatorisch und eine Voraussetzung für die praktische Fahrprüfung. Wir empfehlen dir, den Verkehrskundekurs (VKU) gleich zu Beginn deiner praktischen Fahrausbildung zu besuchen. So kannst du das erlernte Wissen direkt in deinen Autofahrstunden umsetzen.</p>
                <p class="text-sm text-gray-500 mt-2 italic">2 Kursteile à 4 Stunden</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href="/vku-kurs-zuerich/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="VKU Verkehrskundekurs in Zürich buchen">VKU Kurs Zürich</a>
                  <a href="/vku-kurs-lachen/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="VKU Verkehrskundekurs in Lachen buchen">VKU Kurs Lachen</a>
                </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">5</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Auto Fahrstunden</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-gray-600 mb-2">Die ersten Fahrstunden mit deinem Fahrlehrer</p>
                <p class="text-sm text-gray-600">Wir empfehlen dir dringend, die ersten Autofahrstunden auf jeden Fall bei einem Fahrlehrer oder einer Fahrlehrerin zu absolvieren. Falsch erlernte Automatismen lassen sich später nur mit erhöhtem Zeit- und Kostenaufwand korrigieren. Wenn du deinen Lernfahrausweis mit 17, 18 oder 19 Jahren beantragt hast, darfst du frühestens ein Jahr nach Gültigkeitsbeginn deines Lernfahrausweises zur Autofahrprüfung antreten.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">6</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Praktische Autofahrprüfung</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-gray-600 mb-2">Erfolgreich zur praktischen Führerscheinprüfung</p>
                <p class="text-sm text-gray-600">Um die praktische Autofahrprüfung zu bestehen, braucht es heute wegen des erhöhten Verkehrsaufkommens mehr denn je. Trotz dieser hohen Anforderungen hast du mit seriösen und umfangreichen Autofahrstunden gute Chancen. Es ist stets unser Ziel, dass unsere Fahrschüler:innen so wenig Fahrstunden wie möglich machen müssen und gleichzeitig so viele Fahrstunden wie nötig. Nach bestandener Autofahrprüfung erhältst du einen auf drei Jahre befristeten Führerschein auf Probe.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">7</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">WAB Kurs</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-gray-600 mb-2">Nach dem Führerschein: Weiterbildung und unbefristeter Ausweis</p>
                <p class="text-sm text-gray-600">Wie überall im Leben hat man auch beim Autofahren nie ausgelernt. In den ersten 12 Monaten nach deiner praktischen Fahrprüfung musst du den obligatorischen WAB Kurs (Weiterbildungskurs) absolvieren, der zwei Kurstage umfasst. Nach drei Jahren Probezeit, und sofern du alle Auflagen erfüllt hast, kannst du dann den unbefristeten Führerschein beantragen.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href="/wab-kurse-zuerich/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="WAB Weiterbildungskurs in Zürich buchen">WAB Kurs Zürich</a>
                  <a href="/wab-kurse-schwyz/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="WAB Weiterbildungskurs in Schwyz buchen">WAB Kurs Schwyz</a>
                  <a href="/wab-course-english/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="WAB Course in English - Weiterbildung">WAB Course English</a>
                </div>
            </div>
          </details>
        </div>

        <div class="text-center mt-12">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary text-lg" aria-label="Auto Fahrstunden jetzt buchen - Flexible Fahrschule Zürich">
            Jetzt Auto Fahrstunden buchen
          </a>
        </div>
      </div>
    </section>

    <ReviewsSection category="default" />


    <PriceSection category="auto" />


    <!-- FAQ Section -->
    <section class="section-container">
      <h2 class="heading-md mb-12 text-center">Häufig gestellte Fragen</h2>
      <div class="max-w-3xl mx-auto space-y-4 mb-12">
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieviele Fahrstunden benötige ich?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das ist unterschiedlich und hängt von deinem Alter, Erfahrung und Lerntempo ab. Im Durchschnitt benötigen unsere Schüler 15-20 Fahrstunden. Wir beraten dich gerne individuell.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich meine Fahrausbildung beschleunigen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrlektionen, sondern z.B. 1 Fahrlektion und 1 Mal privat repetieren mit einer Begleitperson.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieso dauert die Fahrstunde 45 Minuten?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Nach 45 Minuten lässt die Konzentration nach. Dies ist auch an Schulen Standard. Je nach Übungsgebiet können Fahrstunden auch länger ausfallen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet der Führerschein Kategorie B insgesamt?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Gesamtkosten für einen Führerschein der Kategorie B betragen in der Schweiz durchschnittlich CHF 3'500–3'600. Dies beinhaltet den Nothelferkurs (ca. CHF 100), Sehtest (CHF 50), Lernfahrausweis (CHF 80), Theorieprüfung (CHF 40), VKU-Kurs (CHF 200–300), Fahrstunden (durchschnittlich 15–20 à CHF 100–120), praktische Prüfung (CHF 130) und WAB-Kurs (CHF 350). Die genauen Kosten hängen von der Anzahl der benötigten Fahrstunden ab.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was sind die Voraussetzungen für den Führerschein?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Um einen Führerschein der Kategorie B zu erhalten, benötigst du: Mindestalter von 18 Jahren (oder 17 Jahre beim begleiteten Fahren), einen bestandenen Nothelferkurs (obligatorisch), einen bestandenen Sehtest, einen gültigen Lernfahrausweis und die Anmeldung in einer Fahrschule. Du musst zudem in der Schweiz wohnhaft sein und einen gültigen Ausweis haben.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie lange dauert die komplette Fahrausbildung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Dauer der Fahrausbildung hängt von deinem Tempo und Lernfortschritt ab. Die Theorieausbildung dauert typischerweise 6–8 Wochen mit 12 Unterrichtsabenden à 90 Minuten. Die praktische Ausbildung mit 15–20 Fahrstunden dauert 2–4 Monate. Insgesamt solltest du mit 4–6 Monaten rechnen, wenn du zügig voranschreitest und regelmässig trainingst.</p>
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
          <p class="text-gray-600 mt-4">Ja! In der Schweiz gibt es die Möglichkeit des begleiteten Fahrens ab 17 Jahren. Dafür benötigst du einen speziellen Lernfahrausweis (ab 17 Jahren möglich). Du darfst dann fahren, wenn eine Begleitperson (mindestens 24 Jahre alt, mit gültigem Führerschein) im Fahrzeug sitzt. Dies ermöglicht dir, bereits früher praktische Fahrerfahrung zu sammeln.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet eine Fahrstunde bei euch?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Eine Fahrstunde (45 Minuten) kostet bei uns CHF 100–120, je nach Kurs- und Zeittyp. Wir bieten auch günstigere Abo-Preise an: Bei 5 Fahrstunden sparst du gegenüber Einzellektionen. Zusätzlich fallen eine Versicherungspauschale (CHF 120 einmalig) und der WarmUp + Prüfungsfahrt Kurs (CHF 285) an. Kontaktiere uns für aktuelle Preise und individuelle Angebote.</p>
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
            "name": "Wieviele Fahrstunden benötige ich?",
            "acceptedAnswer": {"@type": "Answer", "text": "Das ist unterschiedlich und hängt von deinem Alter, Erfahrung und Lerntempo ab. Im Durchschnitt benötigen unsere Schüler 15-20 Fahrstunden. Wir beraten dich gerne individuell."}
          },
          {
            "@type": "Question",
            "name": "Wie kann ich meine Fahrausbildung beschleunigen?",
            "acceptedAnswer": {"@type": "Answer", "text": "Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrlektionen, sondern z.B. 1 Fahrlektion und 1 Mal privat repetieren mit einer Begleitperson."}
          },
          {
            "@type": "Question",
            "name": "Wieso dauert die Fahrstunde 45 Minuten?",
            "acceptedAnswer": {"@type": "Answer", "text": "Nach 45 Minuten lässt die Konzentration nach. Dies ist auch an Schulen Standard. Je nach Übungsgebiet können Fahrstunden auch länger ausfallen."}
          },
          {
            "@type": "Question",
            "name": "Was kostet der Führerschein Kategorie B insgesamt?",
            "acceptedAnswer": {"@type": "Answer", "text": "Die Gesamtkosten für einen Führerschein der Kategorie B betragen in der Schweiz durchschnittlich CHF 3'500–3'600. Dies beinhaltet den Nothelferkurs (ca. CHF 100), Sehtest (CHF 50), Lernfahrausweis (CHF 80), Theorieprüfung (CHF 40), VKU-Kurs (CHF 200–300), Fahrstunden (durchschnittlich 15–20 à CHF 100–120), praktische Prüfung (CHF 130) und WAB-Kurs (CHF 350)."}
          },
          {
            "@type": "Question",
            "name": "Was sind die Voraussetzungen für den Führerschein?",
            "acceptedAnswer": {"@type": "Answer", "text": "Um einen Führerschein der Kategorie B zu erhalten, benötigst du: Mindestalter von 18 Jahren (oder 17 Jahre beim begleiteten Fahren), einen bestandenen Nothelferkurs (obligatorisch), einen bestandenen Sehtest, einen gültigen Lernfahrausweis und die Anmeldung in einer Fahrschule."}
          }
        ]
      }
      </Script>
    </section>

    <!-- CTA Section -->
  
    <CtaSection title="Jetzt mit der Auto Fahrschule starten!" />
    <GutscheinSection />
    <CtaSection title="Jetzt mit der Auto Fahrschule starten!" />
    <StandorteSection />
    <WarumSection category="auto" />
  </div>
</template>

<script setup lang="ts">
// Auto Fahrschule page

const autoBenefits = [
  {
    title: 'Blutiger Anfänger?',
    description: 'Wir begleiten dich von der ersten Stunde an und bringen dir alles bei, was du für deinen Führerschein der Kategorie B benötigst.'
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
    description: 'Bereite dich optimal auf die Autoprüfung vor, damit am grossen Tag nichts schiefgeht.'
  },
  {
    title: 'Auffrischungskurs?',
    description: 'Auch wenn du bereits im Besitz des Auto Führerausweises bist und deine Fahrfähigkeiten auffrischen möchtest, bist du in unseren Auto Fahrstunden bestens aufgehoben.'
  }
]
</script>
