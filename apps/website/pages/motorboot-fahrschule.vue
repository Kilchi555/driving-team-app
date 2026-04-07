<template>
  <div>
    <Head>
      <Title>Motorboot Fahrschule Kategorie A | Driving Team Zürich</Title>
      <Meta name="description" content="Motorboot Fahrschule am Zürichsee. In 4 Schritten zur Motorbootprüfung. Erfahrener Bootsfahrlehrer Marc, flexible Fahrstundenzeiten. Jetzt anmelden!" />
      <Meta property="og:title" content="Motorboot Fahrschule – Bootführerschein am Zürichsee | Driving Team" />
      <Meta property="og:description" content="In 4 Schritten zur Motorbootprüfung am Zürichsee. Flexibel, professionell, erfahren." />
      <Meta property="og:url" content="https://drivingteam.ch/motorboot-fahrschule/" />
      <Link rel="canonical" href="https://drivingteam.ch/motorboot-fahrschule/" />
      
      
          <Meta property="og:image" content="https://drivingteam.ch/images/categories/motorboot-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/categories/motorboot-hero.webp" alt="Motorboot Fahrschule – Bootführerschein Kategorie A auf dem Zürichsee mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
          <h1 class="heading-lg text-white mb-6">Motorboot Fahrschule am Zürichsee</h1>
          <p class="text-xl text-white mb-4">Ohne Vorkenntnisse direkt loslegen! Sicher auf dem Wasser – wir bieten das <span class="font-bold text-white text-2xl">ganze Jahr</span> über professionelle Bootsausbildung auf dem oberen Zürichsee.</p>
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt anmelden
          </a>
      </div>
    </section>

    <!-- Benefits Section -->
    <WhyWeBenefitsSection :benefits="motorbootBenefits" />

    <!-- Voraussetzungen -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">Voraussetzungen</h2>
        <div class="max-w-3xl mx-auto bg-white rounded-lg p-8 shadow-sm">
          <ul class="space-y-4">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Mindestalter: 18 Jahre (für Prüfung und Führerschein)</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Ab 14 Jahren in Begleitung möglich</p>
            </li>
          
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Bestandene Motorboot Theorieprüfung vor Anmeldung zur praktischen Prüfung</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Ausreichend praktische Motorbootsfahrstunden</p>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold flex-shrink-0">✓</span>
              <p class="text-gray-700">Anmeldung beim Schifffahrtsamt des Wohnkantons</p>
            </li>
          </ul>
          <div class="mt-6 p-4 bg-primary-50 rounded-lg">
            <p class="text-sm text-primary-800">Die Motorboottheorie für Binnenschifffahrt beinhaltet Fragen zu Motorbooten, Segelbooten und Schifffahrtsregeln. Die Theorieprüfung ist 24 Monate lang gültig.</p>
          </div>
        </div>
      </div>
    </section>

    <cta-section title="Jetzt mit der Motorboot Fahrschule starten!" :hideCourseButton="true" />

    <!-- Process Steps -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-12 text-center">In 4 Schritten zu deiner Motorbootprüfung</h2>
        <div class="space-y-8 max-w-4xl mx-auto">
          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-6 p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg">1</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="heading-sm">Motorboot Fahrstunden</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-8 pb-6 ml-[72px]">
                <p class="text-sm text-gray-600">Deine Motorboot Fahrschule: Werde ein sicherer Schiffskapitän! Als Schiffsführer:in übernimmst du grosse Verantwortung. Du lernst, auf verschiedene Situationen richtig zu reagieren, Manöver korrekt durchzuführen und die Schifffahrtsregeln einzuhalten.</p>
                <div class="mt-3 p-3 bg-primary-50 rounded-lg">
                  <p class="text-xs font-semibold text-primary-800">Preise:</p>
                  <p class="text-xs text-primary-700">Lektion 90min – CHF 190.- | Admin- und Versicherungspauschale (einmalig) – CHF 120.-</p>
                  <p class="text-xs text-primary-700 mt-1">WarmUp inkl. Prüfungsfahrt – CHF 317.-</p>
                </div>
                <div class="mt-3">
                  <a href="/motorboot-fahrstunden-zuerich/" class="text-sm text-primary-600 font-semibold hover:underline">→ Bootsfahrschule Zürich (Zürichsee)</a>
                </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-6 p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg">2</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="heading-sm">Beim Schifffahrtsamt anmelden</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-8 pb-6 ml-[72px]">
                <p class="text-sm text-gray-600">Nach den ersten paar Motorbootsfahrstunden kannst du dich beim Schifffahrtsamt deines Wohnkantons anmelden. Wer dann die Theorie- und/oder die praktische Motorbootsprüfung in einem anderen Kanton absolvieren will, benötigt dazu eine Bewilligung des Schifffahrtsamtes im Wohnkanton.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Mindestalter: Ab 18 Jahren darf man den Lernfahrausweis bestellen und die Bootsprüfung absolvieren. In Begleitung darf ein Motorboot bereits ab 12 Jahren gefahren werden.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href="https://www.zh.ch/de/mobilitaet/schifffahrt/schiffsfuehrerpruefung.html" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Anmeldung Zürich</a>
                  <a href="https://www.sz.ch/verwaltung/baudepartement/verkehrsamt/schifffahrt/schiffsfuehrer_in.html/8756-8758-8802-9276-9293-9327-9350" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Anmeldung Schwyz</a>
                  <a href="https://www.sg.ch/content/dam/sgch/verkehr/strassenverkehr/formulare-und-merkblätter/verkehrszulassung-führer---formulare-und-gesuche/Gesuch%20um%20Erteilung%20eines%20Lernfahr-%20bzw.%20Führerausweises.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">📄 Anmeldung St.Gallen</a>
                </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-6 p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg">3</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="heading-sm">Motorboot Theorie</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-8 pb-6 ml-[72px]">
                <p class="text-sm text-gray-600">Während der praktischen Motorbootfahrstunden kannst du bereits viel über den theoretischen Inhalt des Motorbootfahrens lernen. Spätestens muss die Theorieprüfung vor Anmeldung zur praktischen Motorbootprüfung bestanden sein.</p>
                <p class="text-sm text-gray-600 mt-2">Die Motorboottheorie für die Binnenschifffahrt beinhaltet Fragen zum Motorboot sowie auch zum Segelschiff und ist daher nur einmal zu absolvieren.</p>
                <p class="text-sm text-gray-500 mt-2 italic">Gültigkeit der Theorieprüfung: 24 Monate</p>
                <a href="/motorboot-theorie/" class="text-sm text-primary-600 font-semibold hover:underline mt-2 block">→ Mehr zur Motorboot Theorie</a>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-6 p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-primary-600 text-white font-bold text-lg">4</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="heading-sm">Praktische Motorboot Prüfung</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-8 pb-6 ml-[72px]">
                <p class="text-sm text-gray-600">Die praktische Motorbootprüfung dauert ca. 60 Minuten und wird mit dem Fahrschulboot durchgeführt. Der Prüfungsexperte möchte sehen, dass du in jeder Lage selbstständig korrekte Entscheidungen triffst.</p>
                <p class="text-sm text-gray-600 mt-2">Wenn du dann noch mit solidem theoretischen Wissen über das Motorbootfahren überzeugen kannst, hast du den Schiffsführerausweis bereits sicher in der Tasche.</p>
                <p class="text-sm text-gray-500 mt-2 italic font-medium">...immer mindestens eine Handbreite Wasser unter dem Kiel!</p>
            </div>
          </details>
        </div>
        <div class="text-center mt-12">
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary text-lg">
            🚀 Jetzt anmelden!
          </a>
        </div>
      </div>
    </section>

    <ReviewsSection category="motorboot" />

    <!-- FAQ -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-6 text-center">Häufige Fragen – Motorboot Fahrschule</h2>
        <div class="max-w-3xl mx-auto space-y-4 mb-12">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Wie viele Fahrstunden benötige ich?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Das hängt davon ab, wie schnell du dich mit dem Motorboot vertraut machen kannst. Vor allem das Manövrieren braucht einige Erfahrung bis man es beherrscht. Die meisten brauchen mindestens 8–10 Doppellektionen. Der bisher schnellste Fahrschüler hat innert 5 Wochen die Prüfung bestanden.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Benötige ich eine zusätzliche Theorieprüfung?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Die Theorieprüfung für Binnengewässer ist für die Segel- und Motorbootprüfung die gleiche. Du musst sie also nur einmal bestehen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Darf ich mit einem eigenen Boot Lernfahrten machen?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Ja, in Begleitung mit jemanden, der den Bootsführerschein besitzt, darfst du das. Für die Prüfungsvorbereitung und für die Fahrprüfung empfehlen wir jedoch dringend, dies mit dem Motorbootsfahrlehrer durchzuführen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Was ist das Mindestalter?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">In Begleitung darf ein Motorboot bereits ab 12 Jahren gefahren werden. Bereits ab einem Alter von 18 Jahren darf man den Lernfahrausweis für die Motorbootkategorie bestellen und die Bootsprüfung absolvieren.</p>
          </details>

          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Was ist die Admin- und Versicherungspauschale?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet einerseits die Aufwände ausserhalb der Fahrlektionen, wie zum Beispiel die Anmeldung zur Führerprüfung. Andererseits hat unser Motorboot eine spezielle Vollkaskoversicherung, welche jegliche Lenker:innen abdecken.</p>
          </details>

          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Wie lange dauert die Bootfahrausbildung?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Das hängt ganz von dir ab. Vom Erhalt des Lernfahrausweises bis zur bestandenen praktischen Führerprüfung war der bisher schnellste Fahrschüler innert 5 Wochen fertig. Es gibt jedoch auch Beispiele, da haben es Leute geschafft, fast 2 Lernfahrausweise zu nutzen und dann unter Zeitdruck an die Fahrprüfung zu gehen. Es ist also sehr unterschiedlich.</p>
          </details>
        </div>
        <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-8 text-center">
          <p class="text-lg text-gray-900 mb-4">Weitere Fragen? Wir helfen gerne weiter!</p>
          <a href="tel:+41444310033" class="btn-primary">📞 Jetzt anrufen!</a>
        </div>
        
      </div>
    </section>

    <!-- Lehrmittel -->
    <section class="section-container">
      <h2 class="heading-md mb-8 text-center">Zuhause Theorie lernen</h2>
      <p class="text-center text-gray-600 mb-10">Mit diesen Lehrmitteln kannst du ganz bequem von Zuhause auf die Theorieprüfung lernen.</p>
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        <a href="https://www.boatdriver.ch/e-learning-praxis-motorboot" target="_blank" rel="nofollow noopener noreferrer" class="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition block">
          <p class="text-3xl mb-3">💻</p>
          <h3 class="font-bold text-gray-800 mb-2">BoatDriver Online</h3>
          <p class="text-sm text-gray-600">Alle offiziellen Prüfungsfragen. Von Bootsfahrschulen empfohlen. Über 100'000 zufriedene Kunden.</p>
          <p class="text-sm text-primary-600 mt-2 font-semibold">→ Jetzt bestellen</p>
        </a>
        <a href="https://www.boatdriver.ch/boatdriver-praxisbuch-motorboot-kat-a-d-10226" target="_blank" rel="nofollow noopener noreferrer" class="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition block">
          <p class="text-3xl mb-3">📚</p>
          <h3 class="font-bold text-gray-800 mb-2">BoatDriver Praxis (Buch)</h3>
          <p class="text-sm text-gray-600">Praxis-Handbuch für eine sichere Vorbereitung zur Schweizerischen Motorbootprüfung.</p>
          <p class="text-sm text-primary-600 mt-2 font-semibold">→ Jetzt bestellen</p>
        </a>
        <a href="https://boatdriver.ch/" target="_blank" rel="nofollow noopener noreferrer" class="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition block">
          <p class="text-3xl mb-3">⚓</p>
          <h3 class="font-bold text-gray-800 mb-2">Yacht-Bordbuch</h3>
          <p class="text-sm text-gray-600">Handbuch fürs Cockpit.</p>
          <p class="text-sm text-primary-600 mt-2 font-semibold">→ Jetzt bestellen</p>
        </a>
        <a href="https://www.boatdriver.ch/boatdriver-map-2" target="_blank" rel="nofollow noopener noreferrer" class="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition block">
          <p class="text-3xl mb-3">🗺️</p>
          <h3 class="font-bold text-gray-800 mb-2">BoatDriver Map Zürichsee</h3>
          <p class="text-sm text-gray-600">Wasserfeste Seekarte mit Tiefenangaben und Hafenplänen – Zürichsee, Walensee, Linthkanal.</p>
          <p class="text-sm text-primary-600 mt-2 font-semibold">→ Jetzt bestellen</p>
        </a>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-6 text-center">Warum die Motorboot Fahrschule Driving Team?</h2>
        <p class="text-center text-gray-600 mb-10 max-w-3xl mx-auto">Unsere Motorboot Fahrschule wurde gegründet, um das traditionelle Bild des Fahrschulunterrichts zu verändern. Wir wissen, dass Lernen am besten funktioniert, wenn es mit Begeisterung geschieht.</p>
        <div class="grid md:grid-cols-3 gap-8 mb-12">
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">⚓</p>
            <h3 class="font-bold text-lg mb-2">Erfahrener Bootsfahrlehrer</h3>
            <p class="text-gray-600">Fahrlehrer Marc ist geduldig und kann die Inhalte sehr verständlich vermitteln.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">⏰</p>
            <h3 class="font-bold text-lg mb-2">Flexible Zeiten</h3>
            <p class="text-gray-600">Fahrstunden auch abends und samstags möglich – wir passen uns deinem Zeitplan an.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">🚤</p>
            <h3 class="font-bold text-lg mb-2">Modernes Fahrschulboot</h3>
            <p class="text-gray-600">Top modernes Motorboot für deine optimale Ausbildung am Zürichsee.</p>
          </div>
        </div>
        <h3 class="font-bold text-xl mb-6 text-center">Unsere Gebiete</h3>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="/fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Zürich</a>
          <a href="/fahrschule-lachen/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Lachen</a>
          <a href="/bootsfahrschule/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Bootsfahrschule Lachen</a>
          <a href="/fahrschule-uster/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Uster</a>
          <a href="/fahrschule-aargau/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Aargau</a>
          <a href="/fahrschule-dietikon/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Dietikon</a>
          <a href="/fahrschule-reichenburg/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule Reichenburg</a>
          <a href="/fahrschule-stgallen/" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-primary-400 hover:text-primary-600 transition shadow-sm">Fahrschule St.Gallen</a>
        </div>
      </div>
    </section>

    <CtaSection title="Jetzt mit der Motorboot Fahrschule starten!" :hideCourseButton="true" />
    <GutscheinSection />
    <PriceSection category="motorboot" />
    <CtaSection title="Jetzt anmelden – Motorboot Fahrschule!" :hideCourseButton="true" />
    <StandorteSection />

    <!-- Related/See Also Section -->
    <section class="section-container py-12 bg-gray-50">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-bold mb-6">Interessierst du dich auch für andere Kategorien?</h2>
        <p class="text-gray-600 mb-8">
          Vergleiche die Motorboot Fahrschule mit anderen Fahrzeugklassen oder finde einen Standort in deiner Nähe.
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
    
    <!-- Price Calculator Section -->
    <section class="section-container py-16 bg-gradient-to-r from-cyan-50 to-blue-50">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold mb-3">Deine Kosten kalkulieren</h2>
        <p class="text-gray-600 mb-8">Berechne in wenigen Schritten, was deine Motorboot Fahrausbildung ungefähr kosten wird.</p>
        <PriceCalculator 
          preSelectCategory="motorboot"
          title="🛥️ Motorboot Kostenrechner"
          description="Schritt {{ currentStep }} von {{ totalSteps }} – Berechne deine Motorboot-Fahrschul-Kosten"
        />
      </div>
    </section>
    
    <WarumSection category="motorboot" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "Motorboot Fahrschule – Kategorie A am Zürichsee", "description": "Motorboot Fahrausbildung am Zürichsee. Kategorie A, erfahrener Bootsfahrlehrer, flexible Fahrstundenzeiten, ohne Vorkenntnisse möglich.", "url": "https://drivingteam.ch/motorboot-fahrschule/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "priceCurrency": "CHF", "price": "190", "url": "https://drivingteam.ch/motorboot-fahrschule/" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Zürichsee" } }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Motorboot Fahrschule", "item": "https://drivingteam.ch/motorboot-fahrschule/" }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{ "@type": "Question", "name": "Wie viele Fahrstunden benötige ich für den Motorbootführerschein?", "acceptedAnswer": { "@type": "Answer", "text": "Das hängt davon ab, wie schnell du dich mit dem Motorboot vertraut machen kannst. Die meisten Fahrschüler benötigen mindestens 8–10 Doppellektionen. Der bisher schnellste Fahrschüler hat innert 5 Wochen die Prüfung bestanden." } }, { "@type": "Question", "name": "Brauche ich Vorkenntnisse für die Motorboot Fahrschule?", "acceptedAnswer": { "@type": "Answer", "text": "Nein, du brauchst keine Vorkenntnisse! Unsere Kurse sind für absolute Anfänger geeignet. Wir begleiten dich von der ersten Stunde an." } }, { "@type": "Question", "name": "Was ist das Mindestalter für den Motorbootführerschein?", "acceptedAnswer": { "@type": "Answer", "text": "In Begleitung darf ein Motorboot bereits ab 12 Jahren gefahren werden. Ab 18 Jahren darf man den Lernfahrausweis für die Motorbootkategorie bestellen und die Bootsprüfung absolvieren." } }, { "@type": "Question", "name": "Benötige ich eine Theorieprüfung für die Motorbootprüfung?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, die bestandene Motorboot Theorieprüfung ist vor der Anmeldung zur praktischen Prüfung erforderlich. Die Theorieprüfung für Binnengewässer gilt gleichzeitig für Segel- und Motorbootprüfung und ist 24 Monate lang gültig." } }, { "@type": "Question", "name": "Kann ich mit einem eigenen Boot Lernfahrten machen?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, in Begleitung mit jemanden der den Bootsführerschein besitzt darfst du das. Für die Prüfungsvorbereitung und die Fahrprüfung empfehlen wir jedoch dringend, dies mit dem Motorbootsfahrlehrer durchzuführen." } }, { "@type": "Question", "name": "Was ist die Admin- und Versicherungspauschale?", "acceptedAnswer": { "@type": "Answer", "text": "Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet die Aufwände ausserhalb der Fahrlektionen sowie eine spezielle Vollkaskoversicherung für unser Motorboot." } }] }) },
]
useHead({ script: jsonLdScripts })

const motorbootBenefits = [
  {
    title: 'Sicherer Bootsfahrer?',
    description: 'Wir begleiten dich von der ersten Stunde an und bringen dir alles bei, was du für deinen Motorbootführerschein benötigst.'
  },
  {
    title: 'Individuelle Förderung?',
    description: 'Buche massgeschneiderte Fahrlektionen, um deine Bootsfahrfähigkeiten gezielt zu verbessern.'
  },
  {
    title: 'Auf dem Wasser sicher?',
    description: 'Lerne mit einem erfahrenen Bootsfahrlehrer am schönen Zürichsee.'
  },
  {
    title: 'Prüfungssimulation?',
    description: 'Bereite dich optimal auf die Motorbootprüfung vor, damit am grossen Tag nichts schiefgeht.'
  },
  {
    title: 'Flexible Zeiten?',
    description: 'Fahrstunden auch abends und samstags möglich – wir passen uns deinem Zeitplan an.'
  }
]
</script>
