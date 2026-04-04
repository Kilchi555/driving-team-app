<template>
  <div>
    <Head>
      <Title>Auto Fahrschule Zürich | Kategorie B ab CHF 95.- | Driving Team</Title>
      <Meta name="description" content="Auto Fahrschule Zürich ✓ Kategorie B Fahrstunden ab CHF 95.- ✓ 85% Erfolgsquote ✓ Prüfungszentrum Albisgütli ✓ Flexible Zeiten ✓ Professionelle Fahrlehrer. Jetzt online buchen!" />
      <Meta name="keywords" content="Auto Fahrschule Zürich, Auto Fahrstunden Zürich, Kategorie B Zürich, Fahrschule Zürich Auto, Autofahrschule Zürich, Führerschein Zürich, Fahrprüfung Albisgütli, Fahrstunden Zürich-Altstetten" />
      <Meta property="og:title" content="Auto Fahrschule Zürich | Kategorie B | Driving Team" />
      <Meta property="og:description" content="Professionelle Auto Fahrschule in Zürich. Kategorie B ab CHF 95.-/Lektion. 85% Erfolgsquote. Prüfungsgebiet Albisgütli. Flexible Zeiten. Jetzt buchen!" />
      <Meta property="og:url" content="https://drivingteam.ch/auto-fahrschule-zuerich/" />
      <Meta property="og:type" content="website" />
      <Link rel="canonical" href="https://drivingteam.ch/auto-fahrschule-zuerich/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta property="og:locale" content="de_CH" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Auto Fahrschule Zürich | Kategorie B ab CHF 95.- | Driving Team" />
      <Meta name="twitter:description" content="Professionelle Auto Fahrschule in Zürich. Kategorie B ab CHF 95.-/Lektion. 85% Erfolgsquote. Prüfungsgebiet Albisgütli. Flexible Zeiten. Jetzt buchen!" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Breadcrumb -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Auto Fahrschule', href: '/auto-fahrschule/' }, { label: 'Zürich' }]" />

    <!-- ====== HERO ====== -->
    <section class="relative py-20 md:py-32 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900"></div>
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
      <img
        src="/images/categories/auto-fahrschule-hero.webp"
        alt="Auto Fahrschule Zürich – Kategorie B Fahrstunden mit Driving Team"
        class="absolute inset-0 w-full h-full object-cover opacity-20"
        fetchpriority="high"
        loading="eager"
        width="1920"
        height="1080"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-primary-900/60 via-primary-800/30 to-transparent"></div>

      <div class="section-container relative z-10">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="text-white">
            <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/20">
              <span class="text-xl">🚗</span>
              <span class="text-sm font-semibold">Auto Fahrschule Zürich</span>
            </div>

            <h1 class="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
              Auto Fahrschule<br/>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100">Zürich</span>
            </h1>

            <p class="text-lg text-white/90 mb-8 leading-relaxed max-w-lg">
              Professionelle Kategorie-B-Ausbildung im Herzen von Zürich-Altstetten. Wir kennen das Prüfungsgebiet Albisgütli wie unsere Westentasche – und bringen dich beim ersten Versuch durch die Prüfung.
            </p>

            <div class="flex gap-8 mb-10">
              <div>
                <p class="text-4xl font-black text-yellow-300">85%</p>
                <p class="text-sm text-white/70">Erfolgsquote</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">4.9★</p>
                <p class="text-sm text-white/70">368 Bewertungen</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">CHF 95</p>
                <p class="text-sm text-white/70">pro Lektion</p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4">
              <a
                href="https://www.simy.ch/booking/availability/driving-team?service=B"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 bg-white text-primary-600 hover:bg-yellow-50 font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 hover:shadow-2xl shadow-lg text-lg"
              >
                ✨ Jetzt Termin buchen
              </a>
              <a
                href="#pruefungsgebiet"
                class="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 font-bold py-4 px-8 rounded-xl transition border border-white/30 text-lg"
              >
                🗺️ Prüfungsgebiet
              </a>
            </div>
          </div>

          <!-- Right: Trust-Cards -->
          <div class="hidden md:grid grid-cols-2 gap-4">
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">🏆</p>
              <p class="font-bold mb-1">Hohe Erfolgsquote</p>
              <p class="text-sm text-white/70">85% bestehen beim ersten Versuch</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">📍</p>
              <p class="font-bold mb-1">Prüfungsgebiet</p>
              <p class="text-sm text-white/70">Wir üben genau dort, wo die Prüfung stattfindet</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">🌍</p>
              <p class="font-bold mb-1">Mehrsprachig</p>
              <p class="text-sm text-white/70">Unterricht in Deutsch, Englisch & Albanisch</p>
            </div>
            <div class="bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 backdrop-blur-md border border-yellow-300/40 rounded-2xl p-6 text-white hover:border-yellow-300/60 transition">
              <p class="text-4xl mb-3">📱</p>
              <p class="font-bold mb-1">Online buchbar</p>
              <p class="text-sm text-white/70">Termin & Zahlung ganz einfach per App</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== INTRO: ZÜRICH-SPEZIFISCH ====== -->
    <section class="py-14 bg-gradient-to-b from-primary-50 to-white">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          Auto Fahrstunden in Zürich – genau im Prüfungsgebiet
        </h2>
        <div class="space-y-4 text-gray-700 text-lg leading-relaxed">
          <p>
            Bei der <strong>Auto Fahrschule Driving Team</strong> absolvierst du deine Kategorie-B-Ausbildung direkt in Zürich – mit Treffpunkt am Bahnhof Altstetten. Das bedeutet: Du lernst von Anfang an die Strassen, die du bei der Prüfung am <strong>Prüfungszentrum Albisgütli</strong> fahren wirst.
          </p>
          <p>
            <strong>Unser Vorteil:</strong> Unsere Fahrlehrer kennen die häufigsten Prüfungsrouten in- und auswendig – von Wollishofen über Leimbach bis nach Uitikon. So bist du am Prüfungstag nicht überrascht.
          </p>
        </div>
      </div>
    </section>

    <!-- ====== WHY US: FEATURES ====== -->
    <FeatureSection
      title="Warum die Auto Fahrschule Driving Team in Zürich?"
      subtitle="Wir sind deine Fahrschule in Zürich-Altstetten – mit einem Team aus erfahrenen, eidgenössisch diplomierten Fahrlehrern und einer überdurchschnittlichen Erfolgsquote. Das kannst du von uns erwarten:"
      :extras="['Unterricht auch in <strong>Englisch &amp; Albanisch</strong> möglich!']"
    />

    <!-- ====== PRÜFUNGSGEBIET ALBISGÜTLI ====== -->
    <section id="pruefungsgebiet" class="py-16 bg-gray-50">
      <div class="section-container">
        <div class="text-center mb-12">
          <div class="inline-block mb-4 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
            🗺️ Prüfungsvorbereitung
          </div>
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Prüfungszentrum Albisgütli – wir kennen jede Route
          </h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Die praktische Autoprüfung in Zürich findet am Prüfungszentrum Albisgütli statt. Wir üben genau dort – damit du keine Überraschungen erlebst.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <!-- Routen -->
          <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 class="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
              <span class="text-2xl">🛣️</span> Häufige Prüfungsrouten
            </h3>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-primary-600 font-bold mt-0.5">→</span>
                <div>
                  <p class="font-semibold text-gray-800">Enge / Wollishofen / Kilchberg</p>
                  <p class="text-sm text-gray-500">Kurvenreiche Stadtroute mit Tempoübergängen</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-primary-600 font-bold mt-0.5">→</span>
                <div>
                  <p class="font-semibold text-gray-800">Leimbach / Adliswil / Thalwil</p>
                  <p class="text-sm text-gray-500">Autobahn-Einfahrt und Überland-Abschnitte</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-primary-600 font-bold mt-0.5">→</span>
                <div>
                  <p class="font-semibold text-gray-800">Sihlcity / Wettswil / Ringlikon</p>
                  <p class="text-sm text-gray-500">Bergstrecken und enge Ortsdurchfahrten</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-primary-600 font-bold mt-0.5">→</span>
                <div>
                  <p class="font-semibold text-gray-800">Uitikon Waldegg / Birmensdorf</p>
                  <p class="text-sm text-gray-500">Gemischte Strecke mit Rechtsvortritt</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-primary-600 font-bold mt-0.5">→</span>
                <div>
                  <p class="font-semibold text-gray-800">Wiedikon / Albisrieden / Altstetten</p>
                  <p class="text-sm text-gray-500">Stadtverkehr, Tram, Fussgänger, Lichtsignale</p>
                </div>
              </li>
            </ul>
          </div>

          <!-- Tätigkeitsgebiet -->
          <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 class="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
              <span class="text-2xl">📍</span> Unser Tätigkeitsgebiet
            </h3>
            <p class="text-gray-600 mb-5 text-sm leading-relaxed">
              Wir bieten Auto Fahrstunden in Zürich und der ganzen Region an. Flexibler Treffpunkt möglich – du musst nicht extra zum Standort fahren.
            </p>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Zürich-Altstetten</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Albisrieden</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Schlieren</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Höngg</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Urdorf / Uitikon</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Dietikon</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Zürich-Wiedikon</div>
              <div class="flex items-center gap-2 text-gray-700"><span class="text-primary-600">✓</span> Wettswil / Bonstetten</div>
            </div>
            <div class="mt-5">
              <a href="https://www.google.com/maps/search/?api=1&query=Altstetterplatz%201%2C%208048%20Z%C3%BCrich-Altstetten" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm">
                🗺️ In Google Maps öffnen →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== PREISE ====== -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <div class="text-center mb-10">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Auto Fahrstunden Preise Zürich</h2>
          <p class="text-gray-600">Transparent und fair – keine versteckten Kosten</p>
        </div>

        <div class="bg-white rounded-2xl border-2 border-primary-100 shadow-xl overflow-hidden">
          <div class="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-5">
            <h3 class="text-white font-bold text-lg">🚗 Kategorie B (Auto) – Zürich</h3>
          </div>
          <div class="divide-y divide-gray-100">
            <div class="flex items-center justify-between px-8 py-4 hover:bg-primary-50 transition">
              <span class="font-semibold text-gray-800">Fahrstunde 45 Minuten</span>
              <span class="inline-block bg-green-100 text-green-700 font-bold px-4 py-2 rounded-lg">CHF 95.-</span>
            </div>
            <div class="flex items-center justify-between px-8 py-4 hover:bg-primary-50 transition">
              <span class="font-semibold text-gray-800">Fahrstunde 90 Minuten</span>
              <span class="font-bold text-gray-900">CHF 190.-</span>
            </div>
            <div class="flex items-center justify-between px-8 py-4 hover:bg-primary-50 transition">
              <span class="font-semibold text-gray-800">Admin- & Versicherungspauschale <span class="text-sm text-gray-500 font-normal">(einmalig)</span></span>
              <span class="font-bold text-gray-900">CHF 120.-</span>
            </div>
            <div class="flex items-center justify-between px-8 py-4 hover:bg-primary-50 transition">
              <span class="font-semibold text-gray-800">WarmUp + Prüfungsfahrt</span>
              <span class="font-bold text-gray-900">CHF 285.-</span>
            </div>
          </div>
          <div class="bg-primary-50 px-8 py-4">
            <p class="text-sm text-gray-600">
              💡 <strong>Gesamtkosten Richtgrösse:</strong> Mit 15 Lektionen ca. CHF 2'250.– | Mit 25 Lektionen ca. CHF 3'300.– (inkl. Kurse & Gebühren)
            </p>
          </div>
        </div>

        <div class="mt-6 grid sm:grid-cols-3 gap-4">
          <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p class="text-2xl mb-2">💚</p>
            <p class="font-bold text-gray-900 text-sm">Empfehlungs-Rabatt</p>
            <p class="text-xs text-gray-600 mt-1">Du bekommst bares Geld für jede erfolgreiche Empfehlung</p>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p class="text-2xl mb-2">💳</p>
            <p class="font-bold text-gray-900 text-sm">Online zahlen</p>
            <p class="text-xs text-gray-600 mt-1">Twint, Debitkarte, Kreditkarte</p>
          </div>
          <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
            <p class="text-2xl mb-2">📱</p>
            <p class="font-bold text-gray-900 text-sm">Kundenlogin</p>
            <p class="text-xs text-gray-600 mt-1">Fahrstunden & Zahlungen per App verwalten</p>
          </div>
        </div>

        <div class="mt-8 text-center">
          <a href="/fahrschule-preise/" class="text-primary-600 hover:text-primary-700 font-semibold text-sm underline">
            Alle Preise & Kategorien anschauen →
          </a>
        </div>
      </div>
    </section>

    <!-- ====== WEG ZUR AUTOPRÜFUNG IN ZÜRICH ====== -->
    <section class="py-16 bg-gray-50">
      <div class="section-container">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Weg zum Auto Führerschein in Zürich – Schritt für Schritt
          </h2>
          <p class="text-gray-600 max-w-2xl mx-auto">
            Vom Lernfahrgesuch beim StVA Zürich bis zur bestandenen Prüfung am Albisgütli – wir begleiten dich durch jeden Schritt.
          </p>
        </div>

        <div class="max-w-4xl mx-auto space-y-4">
          <details class="bg-white rounded-xl border-l-4 border-primary-600 shadow-sm group" open>
            <summary class="flex items-start gap-4 p-6 cursor-pointer list-none select-none">
              <div class="flex items-center justify-center h-10 w-10 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">1</div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">Nothelferkurs absolvieren</h3>
                <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
              </div>
            </summary>
            <div class="px-6 pb-5 ml-14 text-sm text-gray-600 leading-relaxed">
              <p>Obligatorisch für alle Führerschein-Kategorien. Ab 14 Jahren möglich, 6 Jahre gültig. Wir vermitteln dir geprüfte Anbieter in Zürich.</p>
              <a href="/nothelferkurs/" class="inline-block mt-2 text-primary-600 hover:text-primary-700 font-semibold">→ Nothelferkurs Infos</a>
            </div>
          </details>

          <details class="bg-white rounded-xl border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 p-6 cursor-pointer list-none select-none">
              <div class="flex items-center justify-center h-10 w-10 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">2</div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">Lernfahrgesuch StVA Kanton Zürich</h3>
                <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
              </div>
            </summary>
            <div class="px-6 pb-5 ml-14 text-sm text-gray-600 leading-relaxed">
              <p>Das Gesuch beim Strassenverkehrsamt Kanton Zürich einreichen. Frühestens 2 Monate vor dem 17. Geburtstag möglich. Inklusive Sehtest (CHF 30.-) und Passfoto.</p>
              <a href="/documents/lernfahrgesuche/Gesuch-LFA-ZH.pdf" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs hover:bg-primary-200 transition">Lernfahrgesuch ZH herunterladen (PDF)</a>
            </div>
          </details>

          <details class="bg-white rounded-xl border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 p-6 cursor-pointer list-none select-none">
              <div class="flex items-center justify-center h-10 w-10 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">3</div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">Theorie Autoprüfung Zürich</h3>
                <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
              </div>
            </summary>
            <div class="px-6 pb-5 ml-14 text-sm text-gray-600 leading-relaxed">
              <p>Die Theorieprüfung findet am Prüfungszentrum Albisgütli statt. Mit dem PIN aus dem Lernfahrausweis online anmelden. Gebühr: CHF 40.-. Der Lernfahrausweis gilt danach 24 Monate.</p>
            </div>
          </details>

          <details class="bg-white rounded-xl border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 p-6 cursor-pointer list-none select-none">
              <div class="flex items-center justify-center h-10 w-10 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">4</div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">VKU Verkehrskundekurs Zürich</h3>
                <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
              </div>
            </summary>
            <div class="px-6 pb-5 ml-14 text-sm text-gray-600 leading-relaxed">
              <p>Obligatorischer 8-stündiger Kurs (2 × 4 Stunden). Voraussetzung für die praktische Prüfung. Wir empfehlen: gleich zu Beginn buchen und das Gelernte direkt in den Fahrstunden anwenden.</p>
              <a href="/vku-kurs-zuerich/" class="inline-block mt-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs hover:bg-primary-200 transition">VKU Kurs Zürich buchen</a>
            </div>
          </details>

          <details class="bg-white rounded-xl border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 p-6 cursor-pointer list-none select-none">
              <div class="flex items-center justify-center h-10 w-10 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">5</div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">Auto Fahrstunden in Zürich</h3>
                <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
              </div>
            </summary>
            <div class="px-6 pb-5 ml-14 text-sm text-gray-600 leading-relaxed">
              <p>Du buchst online, wir treffen uns am Bahnhof Altstetten. Wir fahren systematisch durch alle Ausbildungsthemen: Vorschulung → Grundschulung → Hauptschulung → Perfektionsschulung. Optimal: 2–4 Fahrstunden pro Woche plus private Übungen.</p>
            </div>
          </details>

          <details class="bg-white rounded-xl border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 p-6 cursor-pointer list-none select-none">
              <div class="flex items-center justify-center h-10 w-10 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">6</div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">Praktische Prüfung am Albisgütli</h3>
                <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
              </div>
            </summary>
            <div class="px-6 pb-5 ml-14 text-sm text-gray-600 leading-relaxed">
              <p>WarmUp-Fahrt (45 min.) + Prüfungsfahrt (45 min.) im Strassenverkehrsamt Albisgütli, Zürich. CHF 285.- inkl. WarmUp. Nach bestandener Prüfung erhältst du den Führerschein auf Probe (3 Jahre).</p>
            </div>
          </details>

          <details class="bg-white rounded-xl border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 p-6 cursor-pointer list-none select-none">
              <div class="flex items-center justify-center h-10 w-10 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">7</div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">WAB Weiterbildungskurs Zürich</h3>
                <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
              </div>
            </summary>
            <div class="px-6 pb-5 ml-14 text-sm text-gray-600 leading-relaxed">
              <p>Innerhalb der ersten 12 Monate nach der Prüfung obligatorisch. 2 Kurstage. Nach 3 Jahren Probezeit erhältst du den unbefristeten Führerschein.</p>
              <a href="/wab-kurse-zuerich/" class="inline-block mt-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs hover:bg-primary-200 transition">WAB Kurs Zürich buchen</a>
            </div>
          </details>
        </div>
      </div>
    </section>

    <!-- ====== INSTRUKTOREN ====== -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- ====== MAP ====== -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <!-- ====== REVIEWS ====== -->
    <ReviewsSection category="zuerich" />

    <!-- ====== CTA ====== -->
    <section class="py-20 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h2 class="text-4xl md:text-5xl font-black mb-6">Bereit für deine Auto Fahrschule in Zürich?</h2>
        <p class="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          Professionelle Kategorie-B-Ausbildung. Direkt im Prüfungsgebiet Albisgütli. Online buchbar, flexibel und mit 85% Erfolgsquote.
        </p>
        <a
          href="https://www.simy.ch/booking/availability/driving-team?service=B"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block bg-white text-primary-600 hover:bg-primary-50 font-bold py-4 px-12 rounded-xl transition text-lg transform hover:scale-105 shadow-2xl"
        >
          ✨ Jetzt Auto Fahrstunde buchen
        </a>
      </div>
    </section>

    <!-- ====== FAQ ====== -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Häufige Fragen zur Auto Fahrschule Zürich</h2>
          <p class="text-gray-600">Alles was du wissen musst – spezifisch für Zürich</p>
        </div>
        <div class="space-y-3">
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>💰 Was kostet eine Auto Fahrstunde bei euch in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Eine 45-minütige Auto Fahrstunde (Kategorie B) kostet CHF 95.-. Hinzu kommt einmalig eine Admin- & Versicherungspauschale von CHF 120.- für die gesamte Fahrausbildung. Der WarmUp + die Prüfungsfahrt am Albisgütli kostet CHF 285.-.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>📍 Wo genau finden die Auto Fahrstunden in Zürich statt?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Treffpunkt ist der Bahnhof Altstetten (Altstetterplatz 1, 8048 Zürich). Das Tätigkeitsgebiet erstreckt sich von Baden bis Thalwil und von Bülach bis Wettswil. Nach Möglichkeit können flexible Treffpunkte vereinbart werden.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🏆 Wo findet die Auto Fahrprüfung in Zürich statt?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Die praktische Fahrprüfung Kategorie B findet am Prüfungszentrum Albisgütli in Zürich statt. Wir üben von Anfang an im Prüfungsgebiet – du wirst alle wichtigen Strecken kennen, bevor du zur Prüfung antrittst.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>📊 Wie viele Auto Fahrstunden brauche ich bis zur Prüfung in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Durchschnittlich benötigen unsere Schüler in Zürich 15–25 Fahrstunden. Mit regelmässigen privaten Übungen (2–4x pro Woche) und konsequenter Umsetzung der Fahrlehrer-Tipps ist auch weniger möglich.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🌍 Kann ich die Auto Fahrstunden in Zürich auch auf Englisch machen?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Ja! Wir bieten Auto Fahrstunden in Zürich auf Deutsch, Englisch und Albanisch an. Das ist besonders für internationale Einwohner in Zürich praktisch. Einfach bei der Buchung gewünschte Sprache angeben.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>📝 Was brauche ich für den Lernfahrausweis Kanton Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <div class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">
              <p class="mb-2">Für den Lernfahrausweis Kategorie B beim StVA Zürich benötigst du:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Ausgefülltes Lernfahrgesuch (Kat. B)</li>
                <li>Nothelferkurs-Ausweis (nicht älter als 6 Jahre)</li>
                <li>Aktuelles Passfoto (farbig)</li>
                <li>Gültiger Schweizer Ausweis oder Pass</li>
                <li>Sehtest-Bestätigung</li>
              </ul>
              <p class="mt-2 text-gray-500 italic">Frühestens 2 Monate vor dem 17. Geburtstag möglich.</p>
            </div>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>💡 Automatik oder Schaltung für die Prüfung in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Rechtlich gesehen ist beides möglich – mit beiden Getriebe-Typen darfst du nach bestandener Prüfung auch das andere fahren. Unsere Fahrzeuge in Zürich sind Seat Leon und Audi A3. Wir bieten sowohl Schaltung als auch Automatik an.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🎓 Was passiert nach der bestandenen Prüfung?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Du erhältst zunächst einen Führerschein auf Probe (3 Jahre). Innerhalb der ersten 12 Monate musst du den WAB Weiterbildungskurs (2 Tage) absolvieren. Nach 3 Jahren Probezeit ohne Vergehen kannst du den unbefristeten Führerschein beantragen.</p>
          </details>
        </div>

        <div class="mt-8 bg-primary-50 border-2 border-primary-200 rounded-xl p-6 text-center">
          <p class="text-gray-900 font-semibold mb-3">Noch Fragen zur Auto Fahrschule in Zürich?</p>
          <a href="tel:+41444310033" class="inline-flex items-center gap-2 bg-primary-600 text-white hover:bg-primary-700 font-bold py-3 px-6 rounded-lg transition">
            📞 +41 44 431 00 33
          </a>
        </div>
      </div>
    </section>

    <!-- ====== KOSTENRECHNER ====== -->
    <section class="py-16 bg-gradient-to-r from-primary-50 to-blue-50">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-3">Auto Führerschein Kosten berechnen – Zürich</h2>
        <p class="text-gray-600 mb-8">Berechne in wenigen Schritten, was deine Auto Fahrausbildung in Zürich kosten wird.</p>
        <PriceCalculator
          preSelectCategory="auto"
          title="💰 Auto Kostenrechner Zürich"
        />
      </div>
    </section>

    <!-- ====== INTERNAL LINKS ====== -->
    <section class="py-12 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Nützliche Links für deine Auto Fahrausbildung in Zürich</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <a href="/auto-fahrschule/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🚗</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Auto Fahrschule</p>
              <p class="text-xs text-gray-500">Alle Infos Kat. B</p>
            </div>
          </a>
          <a href="/vku-kurs-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">📋</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">VKU Kurs Zürich</p>
              <p class="text-xs text-gray-500">Verkehrskundekurs buchen</p>
            </div>
          </a>
          <a href="/nothelferkurs/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🏥</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Nothelferkurs</p>
              <p class="text-xs text-gray-500">Erste Hilfe, obligatorisch</p>
            </div>
          </a>
          <a href="/wab-kurse-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🎓</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">WAB Kurs Zürich</p>
              <p class="text-xs text-gray-500">Weiterbildung nach Prüfung</p>
            </div>
          </a>
          <a href="/fahrschule-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">📍</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Fahrschule Zürich-Altstetten</p>
              <p class="text-xs text-gray-500">Unser Hauptstandort</p>
            </div>
          </a>
          <a href="/kostenrechner/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">💰</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Kostenrechner</p>
              <p class="text-xs text-gray-500">Führerscheinkosten berechnen</p>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- ====== WARUM ====== -->
    <WarumSection category="auto" />

    <!-- ====== ANDERE STANDORTE ====== -->
    <StandorteSection exclude="zuerich" />

    <!-- ====== FINALE CTA ====== -->
    <CtaSection title="Auto Führerschein Zürich – Jetzt starten!" />
  </div>
</template>

<script setup lang="ts">
import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

definePageMeta({ layout: 'default' })

const instructors = getInstructorsByLocation('zuerich')

const jsonLdScripts = [
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["DrivingSchool", "LocalBusiness"],
      "@id": "https://drivingteam.ch/auto-fahrschule-zuerich/#driving-school",
      "name": "Auto Fahrschule Zürich – Driving Team",
      "description": "Professionelle Auto Fahrschule in Zürich-Altstetten. Kategorie B Fahrstunden ab CHF 95.-. Prüfungsgebiet Albisgütli. 85% Erfolgsquote.",
      "url": "https://drivingteam.ch/auto-fahrschule-zuerich/",
      "telephone": "+41444310033",
      "image": "https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Baslerstrasse 145",
        "addressLocality": "Zürich",
        "postalCode": "8048",
        "addressCountry": "CH"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 47.3905,
        "longitude": 8.4877
      },
      "areaServed": ["Zürich-Altstetten", "Albisrieden", "Schlieren", "Höngg", "Urdorf", "Uitikon", "Wettswil", "Dietikon"],
      "openingHoursSpecification": [
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "07:00", "closes": "20:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday"], "opens": "08:00", "closes": "17:00" }
      ],
      "priceRange": "CHF 95.-",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "368",
        "bestRating": "5",
        "worstRating": "1"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Auto Fahrstunden Zürich",
        "itemListElement": [
          {
            "@type": "Offer",
            "name": "Auto Fahrstunde Kategorie B (45 Min)",
            "price": "95",
            "priceCurrency": "CHF",
            "availability": "https://schema.org/InStock",
            "url": "https://www.simy.ch/booking/availability/driving-team?service=B"
          }
        ]
      },
      "sameAs": ["https://drivingteam.ch"]
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
        { "@type": "ListItem", "position": 2, "name": "Auto Fahrschule", "item": "https://drivingteam.ch/auto-fahrschule/" },
        { "@type": "ListItem", "position": 3, "name": "Auto Fahrschule Zürich", "item": "https://drivingteam.ch/auto-fahrschule-zuerich/" }
      ]
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Was kostet eine Auto Fahrstunde in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Eine 45-minütige Auto Fahrstunde (Kategorie B) kostet bei Driving Team in Zürich CHF 95.-. Hinzu kommt eine einmalige Admin- & Versicherungspauschale von CHF 120.- sowie CHF 285.- für WarmUp + Prüfungsfahrt am Albisgütli." } },
        { "@type": "Question", "name": "Wo findet die Auto Fahrprüfung in Zürich statt?", "acceptedAnswer": { "@type": "Answer", "text": "Die praktische Auto Fahrprüfung in Zürich findet am Prüfungszentrum Albisgütli statt. Driving Team übt von Anfang an im Prüfungsgebiet – alle häufigen Prüfungsrouten werden trainiert." } },
        { "@type": "Question", "name": "Wie viele Auto Fahrstunden brauche ich in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Durchschnittlich 15–25 Fahrstunden. Mit regelmässigen privaten Übungen 2–4x pro Woche lässt sich die Anzahl reduzieren. Driving Team hat eine 85% Erfolgsquote beim ersten Versuch." } },
        { "@type": "Question", "name": "Bietet die Auto Fahrschule Zürich Unterricht auf Englisch an?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, Driving Team in Zürich bietet Auto Fahrstunden auf Deutsch, Englisch und Albanisch an." } },
        { "@type": "Question", "name": "Was brauche ich für den Lernfahrausweis im Kanton Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Für den Lernfahrausweis Kategorie B beim StVA Zürich benötigst du: ausgefülltes Lernfahrgesuch, Nothelferkurs-Ausweis, Passfoto, gültiger ID/Pass und Sehtest. Frühestens 2 Monate vor dem 17. Geburtstag möglich." } }
      ]
    })
  }
]

useHead({ script: jsonLdScripts })
</script>
