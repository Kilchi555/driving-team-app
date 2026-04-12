<template>
  <div>
    <Head>
      <Title>Taxi Fahrschule Zürich | BPT Ausbildung Code 121/122 | Driving Team</Title>
      <Meta name="description" content="Taxi Fahrschule Zürich ✓ BPT zertifizierte Ausbildung Code 121/122 ✓ Prüfungsvorbereitung StVA Zürich ✓ Kat. B Erweiterung auf Taxi ✓ Flexible Termine. Jetzt anmelden!" />
      <Meta property="og:title" content="Taxi Fahrschule Zürich | BPT Ausbildung Code 121/122 | Driving Team" />
      <Meta property="og:description" content="BPT zertifizierte Taxi Fahrschule in Zürich – Ausbildung Code 121/122 in 5 Schritten zur Taxiprüfung" />
      <Meta property="og:url" content="https://drivingteam.ch/taxi-fahrschule/" />
      <Link rel="canonical" href="https://drivingteam.ch/taxi-fahrschule/" />
      
      
          <Meta property="og:image" content="https://drivingteam.ch/images/categories/taxi-fahrschule-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/categories/taxi-fahrschule-hero.webp" alt="Taxi Fahrschule – BPT 121 und 122 Ausbildung mit professionellem Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
          <h1 class="heading-lg text-white mb-6">Taxi Fahrschule Kategorie BPT</h1>
          <p class="hidden xs:block text-xl text-white mb-8">Träumst du davon, als Taxifahrer:in auf den Strassen unterwegs zu sein und Menschen sicher an ihr Ziel zu bringen? Dann bist du bei uns genau richtig! Wir bieten dir die massgeschneiderte Ausbildung für deinen Traumberuf als Taxifahrer:in.</p>
          <div class="flex flex-wrap gap-4">
            <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
              ✨ Taxi Fahrstunden anmelden
            </a>
          </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <WhyWeBenefitsSection :benefits="taxiBenefits" />

    <!-- Intro -->
    <section class="section-container">
      <div class="max-w-3xl mx-auto">
        <p class="text-lg text-gray-700 mb-4">In unserer spezialisierten Taxi Fahrschule lernst du weit mehr als nur das Fahren. Als professionelle:r Taxifahrer:in transportierst du zahlende Kundschaft von A nach B, wobei die Sicherheit stets oberstes Gebot ist.</p>
        <p class="text-lg text-gray-700 mb-4">Diese essenziellen Fähigkeiten und viele weitere wertvolle Tipps und Tricks vermitteln wir dir in unseren Taxifahrstunden. Unser Ziel ist es, dich nicht nur auf die Taxi Prüfung vorzubereiten, sondern auch auf die täglichen Herausforderungen des Berufs.</p>
        <p class="text-lg text-gray-700">Lass uns gemeinsam den Grundstein für deine erfolgreiche Karriere legen. Buche jetzt deine Taxifahrstunden und starte dein Abenteuer als professionelle:r Taxifahrer:in!</p>
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
              <p class="text-gray-700">Gültiger Auto-Führerschein Kategorie B (mindestens 1 Jahr im Besitz)</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Mindestalter: 21 Jahre</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Gültiger Lernfahrausweis der Kategorie BPT</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Bestandener Sehtest</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Gültiger Schweizer Ausweis oder Pass</p>
            </li>
          </ul>
          <div class="mt-6 p-4 bg-primary-50 rounded-lg">
            <p class="text-sm text-primary-800">Achtung: Für die Taxi-Ausbildung brauchst du mindestens 1 Jahr Fahrerfahrung mit dem Auto-Führerschein. Dein Auto-Führerschein darf nicht älter als 15 Jahre sein.</p>
          </div>
        </div>
      </div>
    </section>

    <CtaSection title="Jetzt mit der Taxi Fahrschule starten!" :hideCourseButton="true" />

    <!-- Process Steps -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Weg zur Taxiprüfung - 5 Schritte zu deinem Traumberuf</h2>
        
        <div class="space-y-8 max-w-4xl mx-auto">
          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">1</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Lernfahrgesuch Taxi</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Fülle im ersten Schritt zur Taxiprüfung das Lernfahrgesuch vollständig und wahrheitsgetreu aus und gehe damit zu einem Optiker oder Augenarzt, um den Sehtest eintragen zu lassen.</p>
                <p class="text-sm text-gray-600 mt-2">Gehe anschliessend mit dem ausgefüllten Anmeldeformular, einem farbigen Passfoto und ID/Pass persönlich beim Strassenverkehrsamt oder bei der Einwohnerkontrolle vorbei.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Bitte bedenke, dass du den Führerausweis der Kategorie B bereits mindestens 1 Jahr lang besitzen musst.</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <a href="/documents/lernfahrgesuche/Gesuch-LFA-ZH.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Zürich herunterladen - PDF">Lernfahrgesuch Zürich (PDF)</a>
                    <a href="/documents/lernfahrgesuche/Gesuch-LFA-SZ.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Schwyz herunterladen - PDF">Lernfahrgesuch Schwyz (PDF)</a>
                    <a href="/documents/lernfahrgesuche/Gesuch-LFA-SG.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch St.Gallen herunterladen - PDF">Lernfahrgesuch St.Gallen (PDF)</a>
                    <a href="/documents/lernfahrgesuche/Gesuch-LFA-GL.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Glarus herunterladen - PDF">Lernfahrgesuch Glarus (PDF)</a>
                    <a href="/documents/lernfahrgesuche/Gesuch-LFA-AG.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition" aria-label="Lernfahrgesuch Aargau herunterladen - PDF">Lernfahrgesuch Aargau (PDF)</a>
                  </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">2</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Ärztliche Untersuchung</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Nach Einreichung des Anmeldeformulars erhältst du eine Aufforderung für einen Gesundheits-Check. Diesen kannst du im Normalfall bei einem Arzt deiner Wahl durchführen.</p>
                <p class="text-sm text-gray-600 mt-2">Da es um berufsmässigen Personentransport geht, werden die Gesundheitsanforderungen höher eingestuft als bei der normalen Kategorie B. Der Arzt wird die Ergebnisse dem Strassenverkehrsamt weiterleiten und du wirst anschliessend bei positivem Verlauf zur Zusatztheorie (ARV) zugelassen.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">3</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Taxi Theorie | ARV 2</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Im berufsmässigen Personentransport bist du verpflichtet, die Anweisungen über Arbeits-, Lenk- und Ruhezeit einzuhalten. Diese Regelungen sind in der ARV festgehalten und werden mit der Taxi Theorie (ARV 2) geprüft.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Nicht erforderlich für Schüler-, Arbeits-, Behindertentransporte oder Ambulanzfahrzeuge (BPT 122) – weiter mit Schritt 4 Fahrausbildung.</p>
                <div class="mt-3">
                  <a href="/taxi-theorie/" class="text-sm text-primary-600 font-semibold hover:underline">→ Mehr zur Taxi Theorie</a>
                </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">4</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Taxi Fahrstunden</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Taxifahrer gehören zu den Profis im Strassenverkehr, und so sollen sie auch Auto fahren können. Eine solch professionelle Fahrweise erlernst du in unseren BPT Fahrlektionen.</p>
                <p class="text-sm text-gray-600 mt-2">Die Möglichkeit, erlernte Fertigkeiten privat üben zu können, erleichtert die ganze Ausbildung sehr. Gute Ortskenntnisse sind kein MUSS, um die BPT Führerprüfung zu bestehen, jedoch von Vorteil. Nach einer seriösen Fahrausbildung gehst du mit unserem Fahrzeug an die Taxiprüfung und hinterlässt somit bereits einen ersten wichtigen positiven Eindruck!</p>
                <p class="text-sm text-gray-500 mt-2 italic">Als Taxifahrer übernimmst du eine grosse Verantwortung. Eine gute Ausbildung ist dabei entscheidend.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">5</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">BPT Prüfung</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
                <p class="text-sm text-gray-600">Nach der Fahrausbildung bist du bereit für die praktische BPT Prüfung. Mit unserer gründlichen Vorbereitung hast du optimale Chancen, die Prüfung beim ersten Versuch zu bestehen.</p>
            </div>
          </details>
        </div>

        <div class="text-center mt-12">
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary text-lg" aria-label="Taxi Fahrschule BPT jetzt buchen - Professional Taxi Training">
            Jetzt Taxi Fahrstunden buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Themen -->
    <section class="section-container">
      <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">Themen | Taxi Fahrschule</h2>
      <div class="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Vorbereitung im Stand</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Fahrzeugbedienung</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Beobachtung im Strassenverkehr</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Vortritt</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Tram, Bus</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Parkieren, Wenden, Rückwärtsfahren</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Autobahn</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Stadtverkehr, Ortskenntnisse</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-gray-700 font-medium">Kundenorientiertes Arbeiten</p>
        </div>
      </div>
    </section>

    <!-- Preise -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-10 text-center">Preise | Taxi Fahrschule</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div class="bg-white rounded-lg p-6 shadow-sm text-center">
            <p class="text-3xl font-bold text-primary-600 mb-2">CHF 100.-</p>
            <p class="text-gray-700 font-semibold">Taxifahrlektion</p>
            <p class="text-gray-500 text-sm mt-1">45 Minuten</p>
          </div>
          <div class="bg-white rounded-lg p-6 shadow-sm text-center">
            <p class="text-3xl font-bold text-primary-600 mb-2">CHF 90.-</p>
            <p class="text-gray-700 font-semibold">Mit eigenem Fahrzeug</p>
            <p class="text-gray-500 text-sm mt-1">Pro Lektion 45min</p>
          </div>
          <div class="bg-white rounded-lg p-6 shadow-sm text-center">
            <p class="text-3xl font-bold text-primary-600 mb-2">CHF 120.-</p>
            <p class="text-gray-700 font-semibold">Admin- & Versicherungspauschale</p>
            <p class="text-gray-500 text-sm mt-1">Einmalig</p>
          </div>
          <div class="bg-white rounded-lg p-6 shadow-sm text-center border-2 border-primary-200">
            <p class="text-3xl font-bold text-primary-600 mb-2">CHF 300.-</p>
            <p class="text-gray-700 font-semibold">WarmUp inkl. Prüfungsfahrt</p>
            <p class="text-gray-500 text-sm mt-1">Total 135 Minuten</p>
          </div>
        </div>
        <p class="text-center text-sm text-gray-500 mt-6">Theorielektion 45min – CHF 85.-</p>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="section-container">
      <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Häufig gestellte Fragen</h2>
      <div class="max-w-3xl mx-auto space-y-4 mb-12">
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet die BPT Ausbildung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Eine Taxifahrlektion (45min) kostet CHF 100.- (CHF 90.- mit eigenem Fahrzeug). Die einmalige Admin- und Versicherungspauschale beträgt CHF 120.-. Das WarmUp inkl. Prüfungsfahrt (135min) kostet CHF 300.-.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Welche Voraussetzungen brauche ich?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Du musst den Führerausweis der Kategorie B bereits mindestens 1 Jahr lang besitzen. Zudem ist eine ärztliche Untersuchung erforderlich, da die Gesundheitsanforderungen beim berufsmässigen Personentransport höher sind.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was ist der Unterschied zwischen BPT 121 und 122?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">BPT 121 ist für Taxifahrer die zahlende Kundschaft befördern (z.B. Taxiunternehmen). Die Taxi Theorie ARV 2 ist dann zwingend. BPT 122 ist für Schüler-, Arbeits-, Behindertentransporte oder Ambulanzfahrzeuge – hier ist die ARV Theorie nicht erforderlich.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet der Taxi Führerschein insgesamt?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Gesamtkosten für einen Taxi-Führerschein betragen in der Schweiz durchschnittlich CHF 2'500–4'000, abhängig von der Anzahl der benötigten Fahrstunden und dem BPT-Typ. Dies beinhaltet Fahrstunden (durchschnittlich 15–25 à CHF 90–100), die Admin- und Versicherungspauschale (CHF 120), das WarmUp mit Prüfungsfahrt (CHF 300), sowie ggf. Theorielektionen und Fahrprüfungsgebühren. Die genauen Kosten hängen von deinen Vorkenntnissen und der BPT-Variante ab.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was sind die Voraussetzungen für den Führerschein?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Um eine BPT Ausbildung (Berufliche Grundausbildung für Personentransporte) zu erhalten, benötigst du: einen gültigen Auto-Führerschein (Kategorie B) seit mindestens 1 Jahr, eine bestandene ärztliche Untersuchung (höhere Gesundheitsanforderungen), Anmeldung in einer Fahrschule, sowie je nach BPT-Typ die Theorie ARV 2. Du musst in der Schweiz wohnhaft sein und einen gültigen Ausweis haben.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie lange dauert die komplette Fahrausbildung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Dauer der Taxi-Fahrausbildung hängt von deinem Tempo und Lernfortschritt ab. Die praktische Ausbildung mit 15–25 Fahrstunden dauert typischerweise 2–4 Wochen. Falls du die Theorie ARV 2 absolvieren musst (BPT 121), dauert diese etwa 2–3 Wochen mit Unterrichtsabenden. Insgesamt solltest du mit 3–8 Wochen rechnen, abhängig vom BPT-Typ und deiner Fahrerfahrung.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet eine Fahrstunde bei euch?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Eine Taxifahrstunde (45 Minuten) kostet bei uns CHF 100 mit Schulfahrzeug oder CHF 90 mit eigenem Fahrzeug. Wir bieten auch günstigere Abo-Preise an: Bei 5 Fahrstunden sparst du gegenüber Einzellektionen. Zusätzlich fallen eine einmalige Admin- und Versicherungspauschale (CHF 120) und der WarmUp-Kurs mit Prüfungsfahrt (CHF 300) an. Eine Theorielektion (45 Minuten) kostet CHF 85. Kontaktiere uns für aktuelle Preise und individuelle Angebote.</p>
        </details>
      </div>
      <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p class="text-sm text-gray-600">Weitere allgemeine Fragen zur Fahrausbildung (Nothelferkurs, VKU, begleitetes Fahren, Prüfung wiederholen) beantwortet unser <a href="/faq/" class="text-primary-600 font-semibold hover:underline">ausführliches FAQ →</a></p>
      </div>

      <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-8 text-center">
        <p class="text-lg text-gray-900 mb-4">Weitere Fragen? Wir helfen gerne weiter!</p>
        <a href="tel:+41444310033" class="btn-primary">
          📞 Jetzt anrufen!
        </a>
      </div>
      
    </section>

    <!-- Why Choose Us -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-center">Warum die Taxi Fahrschule Driving Team?</h2>
        <p class="text-center text-gray-600 mb-10 max-w-3xl mx-auto">Unsere Taxi Fahrschule wurde gegründet, um das traditionelle Bild des Fahrschulunterrichts zu verändern. Wir wissen, dass Lernen am besten funktioniert, wenn es mit Begeisterung geschieht. Deshalb haben wir eine Fahrschule aufgebaut, die nicht nur Wissen vermittelt, sondern auch Freude am Fahren weckt.</p>
        <div class="grid md:grid-cols-3 gap-8 mb-12">
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">🚕</p>
            <h3 class="font-bold text-lg mb-2">BPT Spezialisten</h3>
            <p class="text-gray-600">Unsere Fahrlehrer sind spezialisiert auf die BPT Ausbildung und kennen alle Anforderungen der Taxiprüfung genau.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">⚡</p>
            <h3 class="font-bold text-lg mb-2">Komplette Ausbildung</h3>
            <p class="text-gray-600">Von der Theorie über die ARV bis zur praktischen Fahrausbildung – alles aus einer Hand.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">✅</p>
            <h3 class="font-bold text-lg mb-2">Professioneller Abschluss</h3>
            <p class="text-gray-600">Nach der Ausbildung gehst du mit unserem Fahrzeug an die Taxiprüfung und hinterlässt einen professionellen Eindruck.</p>
          </div>
        </div>

        <!-- Unsere Gebiete -->
        <h3 class="font-bold text-xl mb-6 text-center">Unsere Gebiete</h3>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="/fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Zürich</a>
          <a href="/fahrschule-lachen/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Lachen</a>
          <a href="/fahrschule-uster/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Uster</a>
          <a href="/fahrschule-spreitenbach/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Aargau</a>
          <a href="/fahrschule-dietikon/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Dietikon</a>
          <a href="/fahrschule-reichenburg/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Reichenburg</a>
          <a href="/fahrschule-stgallen/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule St.Gallen</a>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Starte deine Taxi-Karriere!</h2>
        <p class="hidden xs:block text-xl text-white mb-8">Mit professioneller BPT Ausbildung von Driving Team</p>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            📅 Taxi Fahrstunden anmelden
          </a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">
            📞 +41 44 431 00 33
          </a>
        </div>
      </div>
    </section>
    
    <ReviewsSection category="default" />
    <GutscheinSection />
    <PriceSection category="taxi" />
    <CtaSection title="Jetzt mit der Taxi Fahrschule starten!" :hideCourseButton="true" />
    <StandorteSection />
    
    <!-- Related/See Also Section -->
    <section class="section-container py-12 bg-gray-50">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-bold mb-6">Interessierst du dich auch für andere Kategorien?</h2>
        <p class="text-gray-600 mb-8">
          Vergleiche die Taxi Fahrschule mit anderen Fahrzeugklassen oder finde einen Standort in deiner Nähe.
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
          <a href="/taxi-fahrschule-zuerich/" class="inline-block border-2 border-gray-400 text-gray-700 px-6 py-2 rounded hover:bg-gray-50 transition" aria-label="Taxi Fahrschule Zürich ansehen">
            🚕 Taxi Zürich
          </a>
        </div>
      </div>
    </section>
    
    <!-- Price Calculator Section -->
    <section class="section-container py-16 bg-gradient-to-r from-orange-50 to-red-50">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold mb-3">Deine Kosten kalkulieren</h2>
        <p class="text-gray-600 mb-8">Berechne in wenigen Schritten, was deine Taxi Fahrausbildung ungefähr kosten wird.</p>
        <PriceCalculator 
          preSelectCategory="motorwagen"
          title="🚕 Taxi Kostenrechner"
          description="Schritt {{ currentStep }} von {{ totalSteps }} – Berechne deine Taxi-Fahrschul-Kosten"
        />
      </div>
    </section>
    
    <WarumSection category="taxi" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "Taxi Fahrschule Kategorie BPT", "description": "Zertifizierte Taxi Fahrausbildung BPT (121/122) mit professioneller Prüfungsvorbereitung", "url": "https://drivingteam.ch/taxi-fahrschule/", "provider": { "@type": "Organization", "name": "Driving Team", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "priceCurrency": "CHF", "url": "https://www.simy.ch/booking/availability/driving-team" }, "educationLevel": "Advanced", "keywords": "Taxi Fahrschule, BPT Zertifizierung, Taxi Führerschein, professionelle Taxiausbildung" }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Taxi Fahrschule", "item": "https://drivingteam.ch/taxi-fahrschule/" }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Was kostet die BPT Ausbildung?", "acceptedAnswer": {"@type": "Answer", "text": "Eine Taxifahrlektion (45min) kostet CHF 100.- (CHF 90.- mit eigenem Fahrzeug). Die einmalige Admin- und Versicherungspauschale beträgt CHF 120.-. Das WarmUp inkl. Prüfungsfahrt (135min) kostet CHF 300.-."}}, {"@type": "Question", "name": "Welche Voraussetzungen brauche ich?", "acceptedAnswer": {"@type": "Answer", "text": "Du musst den Führerausweis der Kategorie B bereits mindestens 1 Jahr lang besitzen. Zudem ist eine ärztliche Untersuchung erforderlich, da die Gesundheitsanforderungen beim berufsmässigen Personentransport höher sind."}}, {"@type": "Question", "name": "Was ist der Unterschied zwischen BPT 121 und 122?", "acceptedAnswer": {"@type": "Answer", "text": "BPT 121 ist für Taxifahrer die zahlende Kundschaft befördern (z.B. Taxiunternehmen). Die Taxi Theorie ARV 2 ist dann zwingend. BPT 122 ist für Schüler-, Arbeits-, Behindertentransporte oder Ambulanzfahrzeuge – hier ist die ARV Theorie nicht erforderlich."}}, {"@type": "Question", "name": "Was kostet der Taxi Führerschein insgesamt?", "acceptedAnswer": {"@type": "Answer", "text": "Die Gesamtkosten für einen Taxi-Führerschein betragen in der Schweiz durchschnittlich CHF 2'500–4'000, abhängig von der Anzahl der benötigten Fahrstunden und dem BPT-Typ. Dies beinhaltet Fahrstunden (durchschnittlich 15–25 à CHF 90–100), die Admin- und Versicherungspauschale (CHF 120), das WarmUp mit Prüfungsfahrt (CHF 300), sowie ggf. Theorielektionen und Fahrprüfungsgebühren. Die genauen Kosten hängen von deinen Vorkenntnissen und der BPT-Variante ab."}}, {"@type": "Question", "name": "Was sind die Voraussetzungen für den Führerschein?", "acceptedAnswer": {"@type": "Answer", "text": "Um eine BPT Ausbildung (Berufliche Grundausbildung für Personentransporte) zu erhalten, benötigst du: einen gültigen Auto-Führerschein (Kategorie B) seit mindestens 1 Jahr, eine bestandene ärztliche Untersuchung (höhere Gesundheitsanforderungen), Anmeldung in einer Fahrschule, sowie je nach BPT-Typ die Theorie ARV 2. Du musst in der Schweiz wohnhaft sein und einen gültigen Ausweis haben."}}, {"@type": "Question", "name": "Wie lange dauert die komplette Fahrausbildung?", "acceptedAnswer": {"@type": "Answer", "text": "Die Dauer der Taxi-Fahrausbildung hängt von deinem Tempo und Lernfortschritt ab. Die praktische Ausbildung mit 15–25 Fahrstunden dauert typischerweise 2–4 Wochen. Falls du die Theorie ARV 2 absolvieren musst (BPT 121), dauert diese etwa 2–3 Wochen mit Unterrichtsabenden. Insgesamt solltest du mit 3–8 Wochen rechnen, abhängig vom BPT-Typ und deiner Fahrerfahrung."}}, {"@type": "Question", "name": "Was kostet eine Fahrstunde bei euch?", "acceptedAnswer": {"@type": "Answer", "text": "Eine Taxifahrstunde (45 Minuten) kostet bei uns CHF 100 mit Schulfahrzeug oder CHF 90 mit eigenem Fahrzeug. Wir bieten auch günstigere Abo-Preise an: Bei 5 Fahrstunden sparst du gegenüber Einzellektionen. Zusätzlich fallen eine einmalige Admin- und Versicherungspauschale (CHF 120) und der WarmUp-Kurs mit Prüfungsfahrt (CHF 300) an. Eine Theorielektion (45 Minuten) kostet CHF 85. Kontaktiere uns für aktuelle Preise und individuelle Angebote."}}]}) },
]
useHead({ script: jsonLdScripts })

const taxiBenefits = [
  {
    title: 'Dein Traumberuf Taxifahrer?',
    description: 'Wir begleiten dich von der ersten Stunde an und bringen dir alles bei, was du für deinen BPT Führerschein benötigst.'
  },
  {
    title: 'Individuelle Förderung?',
    description: 'Buche massgeschneiderte Fahrlektionen, um deine Fahrfähigkeiten gezielt zu verbessern.'
  },
  {
    title: 'Kundenorientiertes Fahren?',
    description: 'Lerne professionelle Umgangsformen und wie du dich als Taxifahrer:in richtig verhältst.'
  },
  {
    title: 'Prüfungssimulation?',
    description: 'Bereite dich optimal auf die Taxiprüfung vor, damit am grossen Tag nichts schiefgeht.'
  },
  {
    title: 'Komplette Ausbildung?',
    description: 'Von der Theorie über ARV bis zur praktischen Fahrausbildung – alles aus einer Hand.'
  }
]
</script>
