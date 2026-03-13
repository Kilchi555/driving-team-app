<template>
  <div>
    <Head>
      <Title>Fahrstunden Preise mit 1 Klick | Fahrschule Driving Team</Title>
      <Meta name="description" content="Alle Preise unserer Fahrschule auf einen Blick. Transparente Fahrstunden-Preise für Auto, Motorrad, Motorboot, VKU, Nothelfer und mehr. Driving Team Zürich und Lachen." />
      <Meta property="og:title" content="Fahrschule Preise – Transparente Übersicht | Driving Team" />
      <Meta property="og:description" content="Alle Preise auf einen Blick. Auto, Motorrad, Motorboot, VKU, Nothelfer und mehr. Driving Team Zürich & Lachen." />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-preise/" />
      
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 relative overflow-hidden">
      <img src="/images/categories/auto-fahrschule-hero.webp" alt="Preise" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-4">Unsere Preise</h1>
          <p class="text-xl text-white mb-2">Fahrschule Driving Team</p>
          <p class="text-primary-200 text-sm">Preisänderungen und Irrtümer vorbehalten. Eine Lektion dauert 45 Minuten. Preise in CHF, ohne externe Kosten wie Sehtest, Lernfahrgesuch, Prüfungsgebühr etc.</p>
        </div>
      </div>
    </section>

    <!-- Price Calculator Button -->
    <section class="section-container py-12">
      <div class="max-w-5xl mx-auto flex justify-center">
        <PriceCalculator />
      </div>
    </section>

    <!-- Preise -->
    <section class="section-container py-16">
      <div class="space-y-4 max-w-6xl mx-auto">
        
        <!-- Motorrad Kategorie A -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🏍️</div>
              <div class="text-base md:text-lg text-gray-600">Motorrad Kategorie A</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorrad Einzellektion 45min</p>
                <p class="text-gray-600 text-sm">Einzellektionen sind gut wenn man ein spezifisches Thema üben möchte.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 95.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorrad Doppellektion 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich Doppellektionen zu buchen, da so 2-3 Themen geübt werden können.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">In dieser Kategorie verrechnen wir keine Admin- und Versicherungspauschale, da die Fahrzeuge privat versichert sind und die Prüfungstermine von den Fahrschüler:innen organisiert werden.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 0.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">Fahrlektion mit Fahrschul-Motorrad</p>
                <p class="text-gray-600 text-sm">Nur Doppellektionen und nur Fahrlektionen vor dem Grundkurs.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 115.–</p>
            </div>
          </div>
        </details>

        <!-- Auto Kategorie B -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🚗</div>
              <div class="text-base md:text-lg text-gray-600">Auto Kategorie B</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Auto Einzellektion 45min</p>
                <p class="text-gray-600 text-sm">Einzellektionen sind gut wenn man ein spezifisches Thema üben möchte.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 95.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Auto Doppellektion 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich Doppellektionen zu buchen, da so 2-3 Themen geübt werden können.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Admin- und Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">Einmalig für die ganze Ausbildung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 120.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Fahrlektion mit privatem Auto</p>
                <p class="text-gray-600 text-sm">Nur wenn der Führerausweis bereits vorhanden ist.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 85.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                <p class="text-gray-600 text-sm">Wir reservieren uns am Prüfungstag 135min für dich.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 285.–</p>
            </div>
          </div>
        </details>

        <!-- Anhänger Kategorie BE -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🚗</div>
              <div class="text-base md:text-lg text-gray-600">Anhänger Kategorie BE</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Anhänger Doppellektion 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich Doppellektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 240.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">Einmalig für die ganze Ausbildung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 120.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Mit eigenem Zugfahrzeug</p>
                <p class="text-gray-600 text-sm">Das Zugfahrzeug muss ca. gleich breit wie unser Anhänger sein.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 100.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Mit ein eigener Kombination</p>
                <p class="text-gray-600 text-sm">Die Anhängerkombination muss den Prüfungsanforderungen entsprechen und betriebssicher sein.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 90.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                <p class="text-gray-600 text-sm">Wir reservieren uns am Prüfungstag 135min für dich.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 360.–</p>
            </div>
          </div>
        </details>

        <!-- Motorwagen Kategorie C1 -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🚛</div>
              <div class="text-base md:text-lg text-gray-600">Motorwagen Kategorie C1</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorwagen Einzellektion 45min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 150.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorwagen Doppellektion 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 300.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">Einmalig für die ganze Ausbildung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 160.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Fahrlektion mit eigenem Fahrzeug</p>
                <p class="text-gray-600 text-sm">Gesamtgewicht mehr als 4t, mindestens 5m lang und einem geschlossenen Aufbau, der so gross ist wie die Führerkabine.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 130.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                <p class="text-gray-600 text-sm">Wir reservieren uns am Prüfungstag 195min für dich.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 649.–</p>
            </div>
          </div>
        </details>

        <!-- Lastwagen Kategorie C -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🚚</div>
              <div class="text-base md:text-lg text-gray-600">Lastwagen Kategorie C</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Lastwagen Einzellektion 45min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 170.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Lastwagen Doppellektion 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 340.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">Einmalig für die ganze Ausbildung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 200.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Fahrlektion mit eigenem Fahrzeug</p>
                <p class="text-gray-600 text-sm">Betriebsgewicht mehr als 12t, mindestens 8m lang und 2.30m breit und einem geschlossenen Aufbau, der so gross ist wie die Führerkabine.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 150.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                <p class="text-gray-600 text-sm">Wir reservieren uns am Prüfungstag 195min für dich.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 737.–</p>
            </div>
          </div>
        </details>

        <!-- Gesellschaftswagen Kategorie D1 -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🚌</div>
              <div class="text-base md:text-lg text-gray-600">Gesellschaftswagen Kategorie D1</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Gesellschaftswagen 45min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 150.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Gesellschaftswagen 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 300.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">Einmalig für die ganze Ausbildung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 160.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Fahrlektion mit eigenem Fahrzeug</p>
                <p class="text-gray-600 text-sm">Ein Gesellschaftswagen mit einer Länge von mindestens 10 m und einer Breite von mindestens 2,30 m.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 130.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                <p class="text-gray-600 text-sm">Wir reservieren uns am Prüfungstag 195min für dich.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 649.–</p>
            </div>
          </div>
        </details>

        <!-- Bus Kategorie D -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🚌</div>
              <div class="text-base md:text-lg text-gray-600">Bus Kategorie D</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Bus Einzellektion 45min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 200.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Bus Doppellektion 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich 3er Lektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 400.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">Einmalig für die ganze Ausbildung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 300.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Fahrlektion mit eigenem Fahrzeug</p>
                <p class="text-gray-600 text-sm">Ein Gesellschaftswagen mit einer Länge von mindestens 10 m und einer Breite von mindestens 2,30 m.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 180.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                <p class="text-gray-600 text-sm">Wir reservieren uns am Prüfungstag 195min für dich.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 1066.–</p>
            </div>
          </div>
        </details>

        <!-- Motorboot -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">⛵</div>
              <div class="text-base md:text-lg text-gray-600">Motorboot</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorboot Einzellektion 45min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich Doppellektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 95.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorboot Doppellektion 90min</p>
                <p class="text-gray-600 text-sm">Wir empfehlen grundsätzlich Doppellektionen zu buchen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Versicherungspauschale</p>
                <p class="text-gray-600 text-sm">Einmalig für die ganze Ausbildung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 120.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Fahrlektion mit eigenem Motorboot</p>
                <p class="text-gray-600 text-sm">Das Motorboot muss eingelöst, betriebssicher und auf dem oberen Zürichsee sein.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 85.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                <p class="text-gray-600 text-sm">Wir reservieren uns am Prüfungstag 150min für dich.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 317.–</p>
            </div>
          </div>
        </details>

        <!-- Kurse -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🎓</div>
              <div class="text-base md:text-lg text-gray-600">Kurse</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Nothelferkurs inkl. Kursbestätigung</p>
                <p class="text-gray-600 text-sm">Der Nothelferkurs dauert Total 10 Stunden.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 99.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Theorie Einzellektion à 45min</p>
                <p class="text-gray-600 text-sm">Persönlich vor Ort in einem unserer Fahrschullokalen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 85.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Online Theorie-Kurs</p>
                <p class="text-gray-600 text-sm">Gruppenkurs inkl. Kursdokumentation.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 49.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Verkehrskunde VKU Zürich</p>
                <p class="text-gray-600 text-sm">2 x 4 Stunden am Abend oder Samstag Vormittag.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Verkehrskunde VKU Lachen</p>
                <p class="text-gray-600 text-sm">2 x 4 Stunden am Abend oder Samstag Vormittag.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 250.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorrad Grundkurs Zürich</p>
                <p class="text-gray-600 text-sm">3 x 4 Stunden inkl. Kursbestätigung. Nur Teil 3 kostet 190.–</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 499.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorrad Grundkurs Lachen</p>
                <p class="text-gray-600 text-sm">3 x 4 Stunden inkl. Kursbestätigung. Nur Teil 3 kostet 210.–</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 570.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Anhängerkurs Kategorie BE</p>
                <p class="text-gray-600 text-sm">Gruppenkurs 3 Stunden für Firmen oder Vereine.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">LKW Theoriekurs</p>
                <p class="text-gray-600 text-sm">Gruppenkurs 8 x 2 Stunden exkl. Lehrmittel.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 800.–</p>
            </div>
          </div>
        </details>

        <!-- Weiterbildung -->
        <details class="group bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer">
          <summary class="flex items-center justify-between p-4 md:p-6 font-bold text-gray-900 hover:bg-gray-50">
            <div>
              <div class="text-2xl md:text-3xl mb-1">🔄</div>
              <div class="text-base md:text-lg text-gray-600">Weiterbildung</div>
            </div>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="px-6 pb-6 space-y-3 border-t border-gray-100">
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">CZV Weiterbildung pro Person</p>
                <p class="text-gray-600 text-sm">Gruppenkurs 7 Stunden für Firmen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">FL-Weiterbildung Kat.B Motorboot</p>
                <p class="text-gray-600 text-sm">Unser beliebtester Kurs im schönen Hafen von Lachen im Hotel Marina.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 540.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">FL-Weiterbildung Kat.B Lastwagen</p>
                <p class="text-gray-600 text-sm">Begib dich in Tuggen/SZ hinter das Lenkrad eines 12 Tonnen Lastwagens.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 490.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">FL-Weiterbildung Kat. B Anhänger</p>
                <p class="text-gray-600 text-sm">Mach dich bereit für deine Anhängerausbildung inkl. Broschüre zum Mitnehmen.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 490.–</p>
            </div>
            <div class="flex justify-between items-start py-3 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-900">Motorrad Prüfungsvorbereitung</p>
                <p class="text-gray-600 text-sm">Gruppenkurs 3 Stunden für eine solide Prüfungsvorbereitung.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
            <div class="flex justify-between items-start py-3">
              <div>
                <p class="font-semibold text-gray-900">Motorrad Schräglagenkurs</p>
                <p class="text-gray-600 text-sm">Gruppenkurs 3 Stunden für ein sicheres Kurvenfahren.</p>
              </div>
              <p class="font-bold text-primary-600 text-lg whitespace-nowrap ml-4">CHF 190.–</p>
            </div>
          </div>
        </details>

      </div>
    </section>

    <!-- FAQ Section -->
    <section class="section-container py-16">
      <h2 class="heading-md mb-12 text-center">Die häufigsten Fragen & Antworten bezüglich der Fahrschule Driving Team</h2>
      
      <div class="faq-masonry">
        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Wieviele Fahrstunden benötige ich?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Das ist eine sehr häufig gestellte Frage, die gleichzeitig sehr schwierig zu beantworten ist. Ein Fahrzeug fahren lernen kannst Du mit dem Erlernen einer neuen Sportart, eines neuen Instruments oder einer Fremdsprache vergleichen. Zu Beginn wirst Du die noch völlig unbekannte Sache als sehr schwierig empfinden und das von Dir gesteckte Ziel scheint noch unerreichbar zu sein. Wenn Du das Projekt Fahrprüfung jedoch seriös angehst, sprich die Tipps und Tricks des Fahrlehrers ernst nimmst und probierst umzusetzen, dann wirst Du Dein Ziel in nützlicher Zeit erreichen. Die meisten Auto-Fahrschüler:innen haben bis zur Fahrprüfung zwischen 15-30 Fahrlektionen. Wenn man keine Möglichkeit hat, um privat zu üben, dann bewegen sich die benötigten Fahrstunden in der Regel zwischen 30-50 Stück.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Wie kann ich meine Fahrausbildung beschleunigen?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Das Wichtigste ist sicher Üben, Üben und nochmals Üben. Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrstunden, sondern zum Beispiel 1 Fahrlektion und 1 Mal privat repetieren oder 2 Fahrlektionen und 2 Mal repetieren. Ganz wichtig beim privat Üben ist, dass Du genau so fährst, wie es Dir Dein Fahrlehrer gezeigt hat. Nur so entwickelst Du Automatismen und fühlst Dich schnell sicherer auf der Strasse. Hast Du keine Möglichkeit um privat zu üben, dann musst Du Dir bewusst sein, dass es wahrscheinlich mehr Fahrstunden benötigt als sonst. Bist du noch innerhalb der 12-Monatigen Lernphase, dann empfehlen wir zu Beginn ca. 5-10 Fahrlektion bei der Fahrschule zu machen und anschliessend regelmässige private Lernfahrten mit parallelen Fahrlektion bei der Fahrschule.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Wieso dauert die Fahrstunde 45 Minuten?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt und analog zu den meisten Schulen angepasst. Je nach Übungsgebiet, Ausbildungsstand des Fahrschülers und anstehendem Thema macht es Sinn eine 1.5 oder gar eine Doppellektion zu vereinbaren, vorallem dann, wenn jemand in der Fahrausbildung schnell vorwärts kommen möchte.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Wie rechtfertigen sich eure Preise?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke unserer Fahrschule umsetzen. Dies beginnt bei den Fahrlehrer:innen, die nur langfristig eine seriöse und kundengerechte Arbeit abliefern können, wenn sie am Ende des Monats eine anständige Entlöhnung erhalten, gegen Krankheit und Unfall vollumfänglich versichert sind und eine solide Altersvorsorge auf sicher haben. Eine weitere wichtige Voraussetzung ist eine moderne Infrastruktur mit top gewarteten Fahrzeugen und modernen Unterrichtslokalen. Dank diesen optimalen Voraussetzungen erreichen wir das Wichtigste: zufriedene Kunden mit einer umfangreichen, speditivien und praxisorientierten Ausbildung.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Wo bietet Ihr Fahrstunden an?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Unsere Lokale befinden sich in Zürich-Altstetten und in Lachen/SZ. Das Tätigkeitsgebiet des Driving Team Zürich erstreckt sich von Baden (Limmattal) bis nach Thalwil und von Bülach bis nach Wettswil/Bonstetten. Bei den Autofahrlektionen können wir nach Möglichkeit flexible Treffpunkte vereinbaren. Beim Driving Team Lachen erstreckt sich das Tätigkeitsgebiet von Hinwil bis nach Schwyz und von Horgen bis nach Ziegelbrücke.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Soll ich Fahrstunden mit Schaltung oder Automatik nehmen?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Das muss grundsätzlich jeder für sich entscheiden. Rechtlich gesehen ist es egal, mit was ihr die Prüfung ablegt, ihr dürft nach bestandener Prüfung so oder so beides fahren. Natürlich ist es so, wenn ihr noch nie mit einem geschalteten Fahrzeug gefahren seid, es doch sehr schwierig wäre. Ihr könnt diese direkt zu Beginn der Fahrausbildung absolvieren und dann anschliessend auf Automatik wechseln oder ihr beginnt gleich auf Automatik.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Was sind die Voraussetzungen, um private Lernfahrten durchführen zu dürfen?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Private Lernfahrten werden häufig unterschätzt. Daher empfehlen wir ganz klar die ersten Fahrversuche bei einer Fahrschule durchzuführen. So können wichtige Automatismen geschult werden, die ihr dann privat repetieren könnt. Ganz wichtig für die privaten Lernfahrten sind ebenfalls folgende Punkte: Die Begleitperson muss im Besitz eines unbeschränkt gültigen Führerausweises der entsprechender Kategorie oder höher und in nüchternem (0,0 Promille) und fahrfähigem Zustand sein. Beim Auto kommt dann noch dazu: Begleitperson muss mindestens 23 Jahre alt sein und die Fahrprüfung vor mindestens 3 Jahren bestanden haben.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Was ist die Admin- und Versicherungspauschale?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet einerseits die Aufwände ausserhalb der Fahrlektionen, wie zum Beispiel die Anmeldung zur Führerprüfung. Andererseits benötigt ein Fahrschulfahrzeug eine spezielle Vollkaskoversicherung, welche jegliche Fahrzeuglenker:innen abdecken.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Was haben eure Fahrlehrer:innen für eine Ausbildung?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Unsere Fahrlehrer:innen haben alle eine vollumfängliche und intensive Ausbildung zum Fahrlehrer:in mit eidgenössischem Fachausweis absolviert. Für weitere Fahrzeugkategorien haben dann die jeweiligen Ausbildner noch Zusatzausbildungen in den betroffenen Bereichen genossen. Jedes Jahr müssen unsere Fahrlehrer:innen mindestens einen Weiterbildungstag absolvieren und teamintern kommt noch eine weitere Weiterbildungseinheit dazu.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Warum sind eure Verkehrskundekurse so teuer?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Unsere Verkehrskundekurse sind im oberen Preissegment, weil wir auch in diesem Bereich sehr bemüht sind zu den besten Fahrschulen zu gehören und euch einen möglichst grossen Nutzen für die Fahrstunden zu gewährleisten. Ihr erhält diverse für den Strassenverkehr wichtigen Unterlagen und es werden viele praxisnahe Themen diskutiert, angeschaut und geübt. Das heisst, die Kosten des Verkehrskundekurses sind gut investiert.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Wie kann ich eure Rechnungen auf dem Smartphone bezahlen?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Wir versenden dir die Rechnung per E-Mail mit einer PDF-Datei im Anhang. Öffne diese PDF-Datei, geh dann auf «Teilen» und öffne die PDF-Datei mit deinem Mobile-Banking App. So kannst du unsere Rechnung unkompliziert bezahlen.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Ab welchem Alter kann ich bei eurer Fahrschule starten?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Für 50ccm Motorräder bzw. Roller kannst du dich bereits mit 15 Jahren anmelden. Der Nothelferkurs kannst du bereits vorher besuchen und 1 Monat vor deinem 15. Geburtstag kannst du das Lernfahrgesuch einreichen. Ab 16 Jahren darfst du dann bereits 125ccm fahren. Lernfahrten fürs Auto sind ab dem 17. Geburtstag erlaubt.</p>
        </details>

        <details class="group bg-white border border-gray-200 rounded-lg p-6">
          <summary class="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
            Wieviel kostet ungefähr die Fahrausbildung bis zur Auto Prüfung?
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <p class="mt-4 text-gray-700">Die Gesamtkosten der Fahrausbildung bis zur Autoprüfung ist sehr unterschiedlich und hauptsächlich abhängig von der Anzahl der benötigten Auto Fahrstunden. Wenn man mit 15 Lektionen rechnet kommt man inkl. allen Kursen und Gebühren des Strassenverkehrsamtes auf ca. CHF 2250.– und wenn man von 30 Lektionen ausgeht ergeben die Gesamtkosten ca. CHF 3530.–</p>
        </details>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt Fahrstunden buchen</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Online buchen</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", "name": "Fahrschule Preise Driving Team", "description": "Transparente Preisübersicht für alle Fahrschule-Leistungen.", "url": "https://drivingteam.ch/fahrschule-preise/" }) },
]
useHead({ script: jsonLdScripts })

</script>
