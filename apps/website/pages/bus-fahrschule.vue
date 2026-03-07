<template>
  <div>
    <Head>
      <Title>Bus Fahrschule | D1, D | Driving Team</Title>
      <Meta name="description" content="Bus Fahrschule Zürich - D1 & D Kategorien. 52-24 Fahrstunden, expert instruction. Jetzt anmelden!" />
      <Link rel="canonical" href="https://drivingteam.ch/bus-fahrschule/" />
      
      <!-- JSON-LD Schema Markup -->
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "Bus Fahrschule - Kategorie D1 & D",
        "description": "Professionelle Bus Fahrausbildung für Kategorie D1 & D. 52-24 Fahrstunden, erfahrene Fahrlehrer, flexible Zeiten",
        "provider": {"@type": "Organization", "name": "Driving Team", "url": "https://drivingteam.ch"},
        "offers": {"@type": "Offer", "priceCurrency": "CHF", "url": "https://simy.ch/booking/availability/driving-team"},
        "educationLevel": "Advanced",
        "keywords": "Bus Fahrschule, Kategorie D, Bus Führerschein, professionelle Fahrausbildung"
      }
      </script>
      <script type="application/ld+json">
      {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/"},
        {"@type": "ListItem", "position": 2, "name": "Bus Fahrschule", "item": "https://drivingteam.ch/bus-fahrschule/"}
      ]}
      </script>
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/categories/bus-fahrschule.webp" alt="Bus Fahrschule Zürich - Kategorie D1 & D mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
          <h1 class="heading-lg text-white mb-6">Bus Fahrschule Kategorie D1 & D</h1>
          <p class="hidden xs:block text-xl text-primary-100 mb-8">Möchtest du deinen Bus Führerschein machen? Bei unserer Bus Fahrschule wirst du von einem erfahrenen Fahrlehrer unterrichtet, der seine Begeisterung für grosse Fahrzeuge mit dir teilt. Freu dich auf lehrreiche und spannende Fahrstunden!</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt anmelden
          </a>
      </div>
    </section>

    <!-- Benefits Section -->
    <WhyWeBenefitsSection :benefits="busBenefits" />

    <!-- Obligatorische Fahrstunden -->
    <section class="section-container">
      <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-8">Obligatorische Fahrstunden für den Busführerschein</h2>
      <p class="text-gray-600 mb-6">Die Anzahl der benötigten Fahrstunden für deinen Bus Führerschein hängt von deinen Vorkenntnissen ab:</p>
      <div class="grid md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gray-50 rounded-lg p-6">
          <p class="font-bold text-primary-600 text-lg mb-2">52 Fahrstunden</p>
          <p class="text-gray-700">à 45 Minuten</p>
          <p class="text-sm text-gray-500 mt-2">Ohne Kategorie C</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-6">
          <p class="font-bold text-primary-600 text-lg mb-2">24 Fahrstunden</p>
          <p class="text-gray-700">à 45 Minuten</p>
          <p class="text-sm text-gray-500 mt-2">Mit Kategorie C (Lastwagen)</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-6">
          <p class="font-bold text-primary-600 text-lg mb-2">Keine Mindestanzahl</p>
          <p class="text-gray-700">bei genug Erfahrung</p>
          <p class="text-sm text-gray-500 mt-2">Mit Kat. C + über 500 Std. Erfahrung in den letzten 2 Jahren</p>
        </div>
      </div>
    </section>

    <!-- Voraussetzungen -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">Voraussetzungen</h2>
        <div class="max-w-3xl mx-auto bg-white rounded-lg p-8 shadow-sm">
          <ul class="space-y-4">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Gültiger Auto-Führerschein Kategorie B oder C</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Mindestalter: 24 Jahre (D1 ab 18 Jahren mit Bedingungen)</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Gültiger Lernfahrausweis der Kategorie D1 oder D</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Bestandener Sehtest (spezielle Anforderungen für Busfahrer)</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Ärztliche Grunduntersuchung gemäss VZV-Anforderungen</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Gültiger Schweizer Ausweis oder Pass</p>
            </li>
          </ul>
          <div class="mt-6 p-4 bg-primary-50 rounded-lg">
            <p class="text-sm text-primary-800">Für Bus-Fahrschule Kategorie D1: Du kannst bereits ab 18 Jahren beginnen, benötigst aber spezifische medizinische Anforderungen. Der CZV Grundkurs ist obligatorisch vor der Prüfung.</p>
          </div>
        </div>
      </div>
    </section>

    <cta-section />

    <!-- Process Steps -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Weg zur Busprüfung – 6 Schritte zu deinem Traumberuf</h2>
        <div class="space-y-8 max-w-4xl mx-auto">
          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">1</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Lernfahrgesuch Bus</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Fülle das Lernfahrgesuch vollständig und wahrheitsgetreu aus. Anschliessend gehst du damit zu einem Optiker oder Arzt, um einen Sehtest durchführen zu lassen.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Voraussetzungen: Mindestens 21 Jahre alt, Kategorie B seit mindestens 2 Jahren.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-ZH.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Lernfahrgesuch Zürich</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-SZ.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Lernfahrgesuch Schwyz</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-AG.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Lernfahrgesuch Aargau</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-GL.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Lernfahrgesuch Glarus</a>
                  <a href="https://drivingteam.ch/wp-content/uploads/2023/03/Gesuch-LFA-SG.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Lernfahrgesuch St.Gallen</a>
                </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">2</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Verkehrsmedizinische Kontrolluntersuchung</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Nachdem du dein Gesuchsformular eingereicht hast, erhältst du vom Strassenverkehrsamt ein Schreiben mit einer Aufforderung zur medizinischen Kontrolluntersuchung. Fällt diese positiv aus, sendet dir das Strassenverkehrsamt deinen Lernfahrausweis (24 Monate gültig) zu.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Hinweis: Bist du bereits Berufschauffeur? Dann musst du diesen Schritt eventuell nicht machen.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">3</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Bus Fahrstunden</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Sobald du deinen Lernfahrausweis hast, darfst du mit den Bus Fahrstunden beginnen. Wir empfehlen dir, uns direkt zu kontaktieren, damit du deine Ausbildung gleich richtig startest.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">4</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Bus Theorie</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Die Bus Theorie kannst du jederzeit parallel zu den Fahrstunden lernen. Möchtest du sie lieber gemeinsam mit unserem Bus Fahrlehrer vertiefen und üben? Kein Problem – wir sorgen dafür, dass du optimal vorbereitet bist.</p>
                <p class="text-sm text-gray-500 mt-2 italic">40 Fragen, 45 Minuten, max. 4 Fehlerpunkte. Die Theorieprüfung der Kategorie D wird gerne unterschätzt!</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-6 p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg">5</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Bus Fahrprüfung</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-8 pb-6 ml-[72px]">
                <p class="text-sm text-gray-600">Du absolvierst die Prüfung mit einem modernen Bus von Schuler Reisen. Unser erfahrener Bus Fahrlehrer begleitet dich persönlich. Ihr trefft euch frühzeitig, um letzte Details zu klären und eine entspannte Aufwärmrunde zu drehen. Die Bus Fahrprüfung dauert ca. 120 Minuten.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-gray-400 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-400 text-white font-bold text-sm md:text-lg">6</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">CZV Grundkurs (für Berufschauffeure)</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Wer beruflich Bus fahren möchte, braucht einen Fähigkeitsausweis (CZV). Du brauchst sehr gute Deutschkenntnisse und die bestandene Theorieprüfung der Kat. D. Wir bieten optimale Prüfungsvorbereitung, zeitgemässe Lehrmittel und Unterricht am Modell.</p>
                <a href="/czv-grundkurs/" class="text-sm text-primary-600 font-semibold hover:underline mt-2 block">→ Mehr zum CZV Grundkurs</a>
            </div>
          </details>
        </div>
        <div class="text-center mt-12">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary text-lg">
            🚀 Jetzt anmelden!
          </a>
        </div>
      </div>
    </section>

    <!-- Themen -->
    <section class="section-container">
      <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">Themen | Bus Fahrstunden</h2>
      <p class="text-center text-gray-600 mb-8">Folgende Themen werden in den Bus Fahrstunden angeschaut und bis zur Prüfungsreife geübt:</p>
      <div class="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-12">
        <div class="bg-gray-50 rounded-lg p-4"><p class="text-gray-700">✓ Ausweise, Gewichte, Masse, Vorschriften</p></div>
        <div class="bg-gray-50 rounded-lg p-4"><p class="text-gray-700">✓ Rundumkontrolle</p></div>
        <div class="bg-gray-50 rounded-lg p-4"><p class="text-gray-700">✓ Fahrzeugbedienung, Vorausschauende Fahrweise</p></div>
        <div class="bg-gray-50 rounded-lg p-4"><p class="text-gray-700">✓ Blicktechniken, Einspuren, Abbiegen, Vortritt</p></div>
        <div class="bg-gray-50 rounded-lg p-4"><p class="text-gray-700">✓ Stadtverkehr, Überlandfahrten, Bergstrassen</p></div>
        <div class="bg-gray-50 rounded-lg p-4"><p class="text-gray-700">✓ Wenden, Rückwärtsfahren, Sichern des Fahrzeuges</p></div>
        <div class="bg-gray-50 rounded-lg p-4"><p class="text-gray-700">✓ Autobahn, Betriebssicherheit, Fahrzeugtechnik</p></div>
      </div>
    </section>

    <!-- Preise -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-10 text-center">Preise | Bus Fahrschule</h2>
        <div class="max-w-sm mx-auto bg-primary-600 rounded-lg p-8 shadow-md text-white">
          <h3 class="font-bold text-xl text-center mb-2">Kategorie D</h3>
          <p class="text-center text-3xl font-bold mb-1">CHF 200.-</p>
          <p class="text-center text-sm text-primary-200 mb-4">à 45 Minuten</p>
          <ul class="space-y-3 text-sm text-primary-100 mb-6">
            <li class="flex gap-2"><span>✓</span> Effiziente Fahrausbildung</li>
            <li class="flex gap-2"><span>✓</span> Freundliche Fahrlehrer:innen</li>
            <li class="flex gap-2"><span>✓</span> Rechnung per E-Mail</li>
            <li class="flex gap-2"><span>i</span> unlimited</li>
          </ul>
          <div class="border-t border-primary-500 pt-4 space-y-2">
            <p class="text-sm text-primary-200">Versicherungspauschale: <strong class="text-white">CHF 200.-</strong> (einmalig)</p>
            <p class="text-sm text-primary-200">WarmUp inkl. Prüfungsfahrt: <strong class="text-white">CHF 1'066.-</strong></p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section-container">
      <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Häufig gestellte Fragen</h2>
      <div class="max-w-3xl mx-auto space-y-4 mb-12">
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Ab welchem Alter kann ich den Bus Führerschein machen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Bereits ab einem Alter von 21 Jahren darf man den Lernfahrausweis für die Kategorie D bestellen, wenn man die Kategorie B mindestens seit 2 Jahren besitzt.</p>
        </details>
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie lange dauert die Ausbildung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das hängt von dir ab. Der bisher schnellste Fahrschüler hat den Lernfahrausweis bis zur bestandenen Prüfung innert 7 Wochen geschafft.</p>
        </details>
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Muss ich zuerst die Theorie machen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Nein. Du benötigst lediglich den Lernfahrausweis, um mit den Bus Fahrstunden zu starten. Es macht Sinn, die Bus Theorie parallel zu den praktischen Fahrstunden zu lernen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet der Bus Führerschein insgesamt?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Gesamtkosten für einen Bus-Führerschein betragen in der Schweiz durchschnittlich CHF 4'500–6'500, abhängig von der Anzahl der benötigten Fahrstunden. Dies beinhaltet den Nothelferkurs (ca. CHF 100), Sehtest (CHF 50), Lernfahrausweis (CHF 80), Theorieprüfung (CHF 40), Fahrstunden (durchschnittlich 25–35 à CHF 200), praktische Prüfung (CHF 200–250), sowie die Versicherungspauschale (CHF 200) und WarmUp-Kurs (CHF 1'066). Die genauen Kosten hängen von deinen Vorkenntnissen ab.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was sind die Voraussetzungen für den Führerschein?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Um einen Bus-Führerschein (Kategorie D) zu erhalten, benötigst du: Mindestalter 21 Jahren, einen gültigen Auto-Führerschein (Kategorie B) seit mindestens 2 Jahren, einen bestandenen Nothelferkurs (obligatorisch), einen bestandenen Sehtest, einen gültigen Lernfahrausweis und die Anmeldung in einer Fahrschule. Du musst in der Schweiz wohnhaft sein und einen gültigen Ausweis haben.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie lange dauert die komplette Fahrausbildung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Dauer der Bus-Fahrausbildung hängt von deinem Tempo und Lernfortschritt ab. Die Theorieausbildung dauert typischerweise 8–10 Wochen mit Unterrichtsabenden. Die praktische Ausbildung mit 25–35 Fahrstunden dauert 3–6 Wochen. Insgesamt solltest du mit 2–3 Monaten rechnen, wenn du zügig voranschreitest und regelmässig trainierst.</p>
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
          <p class="text-gray-600 mt-4">Nein. Für den Bus-Führerschein (Kategorie D) benötigst du ein Mindestalter von 21 Jahren und musst bereits seit mindestens 2 Jahren im Besitz eines Auto-Führerscheins sein. Es ist kein begleitetes Fahren ab 17 Jahren möglich wie bei der Auto-Kategorie B.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet eine Fahrstunde bei euch?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Eine Bus-Fahrstunde (45 Minuten) kostet bei uns CHF 200. Wir bieten auch günstigere Abo-Preise an: Bei 5 Fahrstunden sparst du gegenüber Einzellektionen. Zusätzlich fallen eine Versicherungspauschale (CHF 200 einmalig) und der WarmUp-Kurs mit Prüfungsfahrt (CHF 1'066) an. Kontaktiere uns für aktuelle Preise und individuelle Angebote.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was tun bei Durchfall der praktischen Prüfung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wenn du die praktische Prüfung nicht bestehst, ist das kein Problem – viele benötigen einen zweiten Versuch! Wir helfen dir gerne mit zusätzlichen Fahrstunden, um deine Schwachstellen zu verbessern. Dein Lernfahrausweis bleibt 24 Monate gültig, du kannst die Prüfung beliebig oft wiederholen. Eine Wiederholungsprüfung kostet CHF 200 und kann frühestens nach einer Woche erneut angemeldet werden.</p>
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
        <a href="tel:+41444310033" class="btn-primary">📞 Jetzt anrufen!</a>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-white">Starte deine Bus-Fahrer-Karriere!</h2>
        <p class="hidden xs:block text-xl text-primary-100 mb-8">Mit professioneller Ausbildung von Driving Team in Zürich</p>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            📅 Jetzt anmelden
          </a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">
            📞 +41 44 431 00 33
          </a>
        </div>
      </div>
    </section>
    
    <ReviewsSection category="default" />
    <GutscheinSection />
    <PriceSection category="bus" />
    <CtaSection title="Jetzt mit der Bus Fahrschule starten!" :hideCourseButton="true" />
    <StandorteSection />
    <WarumSection category="bus" />
  </div>
</template>

<script setup lang="ts">
const busBenefits = [
  {
    title: 'Dein Traumberuf Busfahrer?',
    description: 'Wir begleiten dich von der ersten Stunde an und bringen dir alles bei, was du für deinen D Führerschein benötigst.'
  },
  {
    title: 'Individuelle Förderung?',
    description: 'Buche massgeschneiderte Fahrlektionen, um deine Fahrfähigkeiten gezielt zu verbessern.'
  },
  {
    title: 'Grossen Fahrzeugen vertrauen?',
    description: 'Lerne mit modernen Fahrschul-Bussen, um perfekt auf die Prüfung vorbereitet zu sein.'
  },
  {
    title: 'Prüfungssimulation?',
    description: 'Bereite dich optimal auf die Busprüfung vor, damit am grossen Tag nichts schiefgeht.'
  },
  {
    title: 'Professionelle Karriere?',
    description: 'Starte deine Karriere als professioneller Busfahrer mit fundierter Ausbildung.'
  }
]
</script>
