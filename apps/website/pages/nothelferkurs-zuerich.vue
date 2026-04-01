<template>
  <div>
    <Head>
      <Title>Nothelferkurs Zürich | CHF 120.- | 10 Stunden | Obligatorisch | Driving Team</Title>
      <Meta name="description" content="Nothelferkurs Zürich ✓ CHF 120.- inkl. Nothelferausweis ✓ 10 Stunden ✓ Zürich-Altstetten ✓ Obligatorisch für jeden Führerschein ✓ Ab 14 Jahren ✓ 6 Jahre gültig. Jetzt buchen!" />
      <Meta name="keywords" content="Nothelferkurs Zürich, Nothelferkurs Zürich buchen, Nothelferkurs Zürich-Altstetten, Nothelferkurs Kosten Zürich, Erste Hilfe Kurs Zürich Führerschein, Nothelfer Zürich, Nothelferkurs Preis Zürich" />
      <Meta property="og:title" content="Nothelferkurs Zürich | CHF 120.- inkl. Ausweis | Driving Team" />
      <Meta property="og:description" content="Nothelferkurs in Zürich-Altstetten. CHF 120.- inkl. Nothelferausweis. 10 Stunden. Obligatorisch für alle Fahrzeugkategorien. Flexible Termine, sofort buchbar." />
      <Meta property="og:url" content="https://drivingteam.ch/nothelferkurs-zuerich/" />
      <Meta property="og:type" content="website" />
      <Link rel="canonical" href="https://drivingteam.ch/nothelferkurs-zuerich/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/courses/nothelfer-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta property="og:locale" content="de_CH" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Nothelferkurs Zürich | CHF 120.- | 10 Stunden | Driving Team" />
      <Meta name="twitter:description" content="Nothelferkurs in Zürich-Altstetten. CHF 120.- inkl. Nothelferausweis. 10 Stunden. Obligatorisch für alle Führerschein-Kategorien. Sofort buchbar." />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Breadcrumb -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Nothelferkurs', href: '/nothelferkurs/' }, { label: 'Zürich' }]" />

    <!-- ====== HERO ====== -->
    <section class="relative py-20 md:py-28 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-900"></div>
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <img
        src="/images/courses/nothelfer-hero.webp"
        alt="Nothelferkurs Zürich – Obligatorisch für den Führerschein bei Driving Team"
        class="absolute inset-0 w-full h-full object-cover opacity-20"
        fetchpriority="high"
        loading="eager"
        width="1920"
        height="1080"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-red-900/60 via-red-800/30 to-transparent"></div>

      <div class="section-container relative z-10">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="text-white">
            <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/20">
              <span class="text-xl">🏥</span>
              <span class="text-sm font-semibold">Nothelferkurs Zürich</span>
            </div>

            <h1 class="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
              Nothelferkurs<br/>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100">Zürich</span>
            </h1>

            <p class="text-lg text-white/90 mb-8 leading-relaxed max-w-lg">
              Obligatorisch für jeden Führerschein in der Schweiz. 10 Stunden, CHF 120.- inkl. Nothelferausweis. Direkt in <strong>Zürich-Altstetten</strong> buchbar – sofort online.
            </p>

            <div class="flex gap-8 mb-10">
              <div>
                <p class="text-4xl font-black text-yellow-300">CHF 120</p>
                <p class="text-sm text-white/70">inkl. Ausweis</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">10h</p>
                <p class="text-sm text-white/70">in 2 Teilen</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">6</p>
                <p class="text-sm text-white/70">Jahre gültig</p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4">
              <NuxtLink
                to="/nothelferkurs-buchen/nothelfer/"
                class="inline-flex items-center justify-center gap-2 bg-white text-red-600 hover:bg-yellow-50 font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 hover:shadow-2xl shadow-lg text-lg"
              >
                📅 Jetzt Nothelferkurs buchen
              </NuxtLink>
             
            </div>
          </div>

          <!-- Right: Info-Cards -->
          <div class="hidden md:grid grid-cols-2 gap-4">
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">✅</p>
              <p class="font-bold mb-1">Obligatorisch</p>
              <p class="text-sm text-white/70">Pflicht für den Führerschein der Kategorie Auto</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">📍</p>
              <p class="font-bold mb-1">Zürich-Altstetten</p>
              <p class="text-sm text-white/70">Direkt bei Nothelfer am Bahnhof hinter dem Bahnhof Altstetten</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 transition">
              <p class="text-4xl mb-3">💰</p>
              <p class="font-bold mb-1">CHF 120.- fix</p>
              <p class="text-sm text-white/70">Inkl. Nothelferausweis, keine Zusatzkosten</p>
            </div>
            <div class="bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 backdrop-blur-md border border-yellow-300/40 rounded-2xl p-6 text-white hover:border-yellow-300/60 transition">
              <p class="text-4xl mb-3">📅</p>
              <p class="font-bold mb-1">Flexible Termine</p>
              <p class="text-sm text-white/70">Mehrere Kursdaten pro Monat in Zürich</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== WICHTIGE INFO-BOX ====== -->
    <section class="py-10 bg-amber-50 border-b border-amber-200">
      <div class="max-w-3xl mx-auto px-4">
        <div class="flex items-start gap-4 bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
          <span class="text-3xl flex-shrink-0">⚠️</span>
          <div>
            <h2 class="font-bold text-gray-900 mb-2">Wann brauchst du den Nothelferkurs?</h2>
            <p class="text-gray-700 text-sm leading-relaxed">
              Der Nothelferkurs ist in der Schweiz <strong>obligatorisch für alle Fahrzeugkategorien</strong> – also nicht nur für das Auto. Ohne gültigen Nothelferausweis kannst du das Lernfahrgesuch beim Strassenverkehrsamt <strong>nicht einreichen</strong>. Der Ausweis ist <strong>ab Ausstellungsdatum 6 Jahre gültig</strong>. Wer bereits eine Kategorie besitzt, muss den Kurs nicht wiederholen.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== BUCHUNG ====== -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <div class="text-center mb-10">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nothelferkurs Zürich buchen</h2>
          <p class="text-gray-600 max-w-xl mx-auto">Wähle deinen Anbieter und melde dich direkt an. Unkompliziert, schnell, sofort bestätigt.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <NuxtLink
            to="/nothelferkurs-buchen/nothelfer/"
            class="group block bg-white rounded-2xl p-7 shadow-sm border-2 border-gray-200 hover:border-red-400 hover:shadow-lg transition"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">🏥</span>
              <div>
                <h3 class="font-bold text-xl text-gray-900">Nothelfer am Bahnhof</h3>
                <p class="text-sm text-red-600 font-semibold">Zürich-Altstetten</p>
              </div>
            </div>
            <p class="text-gray-600 text-sm mb-5">Flexible Kurse direkt beim Bahnhof Altstetten. Professionelle Instruktoren, kleine Gruppen.</p>
            <div class="flex items-center justify-between">
              <span class="text-2xl font-black text-gray-900">CHF 120.-</span>
              <span class="text-red-600 font-semibold group-hover:translate-x-1 transition">Jetzt buchen →</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ====== DETAILS ====== -->
    <section class="py-14 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-gray-900 mb-10 text-center">Details zum Nothelferkurs in Zürich</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div class="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">🕐</p>
            <p class="font-bold text-gray-900 mb-1">Dauer</p>
            <p class="text-2xl font-black text-red-600">10h</p>
            <p class="text-xs text-gray-500 mt-1">in 2 Teilen aufgeteilt</p>
          </div>
          <div class="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">💰</p>
            <p class="font-bold text-gray-900 mb-1">Preis</p>
            <p class="text-2xl font-black text-red-600">CHF 120.-</p>
            <p class="text-xs text-gray-500 mt-1">inkl. Nothelferausweis</p>
          </div>
          <div class="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">📅</p>
            <p class="font-bold text-gray-900 mb-1">Gültigkeit</p>
            <p class="text-2xl font-black text-red-600">6 Jahre</p>
            <p class="text-xs text-gray-500 mt-1">ab Ausstellungsdatum</p>
          </div>
          <div class="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">👤</p>
            <p class="font-bold text-gray-900 mb-1">Mindestalter</p>
            <p class="text-2xl font-black text-red-600">14 Jahre</p>
            <p class="text-xs text-gray-500 mt-1">Deutschkenntnisse von Vorteil</p>
          </div>
        </div>

        <!-- Kursinhalt -->
        <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 class="text-xl font-bold text-gray-900 mb-6">Was lernst du im Nothelferkurs?</h3>
          <div class="grid sm:grid-cols-2 gap-3">
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">🚨</span>
              <p class="text-gray-700 text-sm">Grundsätzliches Verhalten in Notsituationen</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">🚧</span>
              <p class="text-gray-700 text-sm">Sicherung der Unfallstelle & Bergung verletzter Personen</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">📞</span>
              <p class="text-gray-700 text-sm">Effiziente Alarmierung der Rettungsdienste</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">🏥</span>
              <p class="text-gray-700 text-sm">Überlebensgrundlage bis Eintreffen der Sanitäter</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">🩹</span>
              <p class="text-gray-700 text-sm">Wundbehandlung, Verbrennungen, Druckverband</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">⚡</span>
              <p class="text-gray-700 text-sm">Instruktion am Übungs-Defibrillator (AED)</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">❤️</span>
              <p class="text-gray-700 text-sm">Herzmassage mit Beatmung an Übungspuppen</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-red-500 text-xl flex-shrink-0">🧠</span>
              <p class="text-gray-700 text-sm">Bewusstseinslage prüfen & stabile Seitenlage</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== ABLAUF ====== -->
    <section class="py-16 bg-white">
      <div class="max-w-3xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-gray-900 mb-10 text-center">Ablauf des Nothelferkurses in Zürich</h2>
        <div class="space-y-4">
          <div class="flex items-start gap-5 p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div class="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full font-black flex-shrink-0">1</div>
            <div>
              <h3 class="font-bold text-gray-900 mb-1">Teil 1 – Abendkurs (ca. 3 Stunden)</h3>
              <p class="text-sm text-gray-600">Theoriegrundlagen: Alarmierung, Verhalten an der Unfallstelle, Grundprinzipien der Ersten Hilfe. Findet typischerweise am Abend statt.</p>
            </div>
          </div>
          <div class="flex items-start gap-5 p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div class="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full font-black flex-shrink-0">2</div>
            <div>
              <h3 class="font-bold text-gray-900 mb-1">Teil 2 – Tageskurs (ca. 7 Stunden)</h3>
              <p class="text-sm text-gray-600">Praxis: Herzmassage, Beatmung, Defibrillator, Wundversorgung, stabile Seitenlage. Am Ende: Abschluss und Ausstellung des Nothelferausweises.</p>
            </div>
          </div>
          <div class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>Wichtig:</strong> Die Reihenfolge der Kursteile muss eingehalten werden – Teil 1 vor Teil 2. Das ist gesetzlich vorgeschrieben.
          </div>
        </div>
      </div>
    </section>

    <!-- ====== WARUM NOTHELFERKURS ====== -->
    <section class="py-14 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">Warum brauchst du den Nothelferkurs?</h2>
        <div class="grid md:grid-cols-3 gap-5">
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">🚗</p>
            <h3 class="font-bold text-gray-900 mb-2">Kategorie B (Auto)</h3>
            <p class="text-sm text-gray-600">Obligatorisch. Ohne Nothelferausweis kein Lernfahrgesuch möglich. Frühestens ab 14 Jahren.</p>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">🏍️</p>
            <h3 class="font-bold text-gray-900 mb-2">Motorrad A1/A35/A</h3>
            <p class="text-sm text-gray-600">Ebenfalls obligatorisch – ausser du hast bereits einen eine andere Kategorie abgeschlossen.</p>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p class="text-3xl mb-3">🚐</p>
            <h3 class="font-bold text-gray-900 mb-2">Alle anderen Kategorien</h3>
            <p class="text-sm text-gray-600">Anhänger BE, Lastwagen C, Taxi, Bus – für alle gilt: Nothelferauskurs nicht mehr notwendig, wenn bereits eine andere Kategorie vorhanden ist.</p>
          </div>
        </div>
        
      </div>
    </section>

    <!-- ====== CTA ====== -->
    <section class="py-16 bg-gradient-to-r from-red-600 to-red-800 text-white">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h2 class="text-3xl md:text-4xl font-black mb-4">Nothelferkurs Zürich jetzt buchen</h2>
        <p class="text-red-100 mb-8 text-lg">CHF 120.- inkl. Nothelferausweis. Sofort online buchbar.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink
            to="/nothelferkurs-buchen/nothelfer/"
            class="inline-flex items-center justify-center gap-2 bg-white text-red-600 hover:bg-red-50 font-bold py-4 px-8 rounded-xl transition text-lg transform hover:scale-105 shadow-2xl"
          >
            📅 Jetzt buchen
          </NuxtLink>
         
        </div>
      </div>
    </section>

    <!-- ====== FAQ ====== -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Häufige Fragen zum Nothelferkurs Zürich</h2>
        </div>
        <div class="space-y-3">
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>💰 Was kostet der Nothelferkurs in Zürich?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Der Nothelferkurs in Zürich kostet bei Nothelfer am Bahnhof Altstetten CHF 120.- und beinhaltet den Nothelferausweis. Bitte bringe den Betrag in bar zum ersten Kurstag mit – keine andere Zahlungsweise möglich.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>📍 Wo findet der Nothelferkurs in Zürich statt?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Der Nothelferkurs findet in Zürich-Altstetten (beim Bahnhof Altstetten) statt. Nach der Buchung erhältst du den genauen Treffpunkt und alle Details per E-Mail.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>🕐 Wie lange dauert der Nothelferkurs?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Der Nothelferkurs dauert insgesamt 10 Stunden und ist in zwei Teile aufgeteilt: Teil 1 (ca. 3h, meist abends) und Teil 2 (ca. 7h, ganztägig). Beide Teile müssen in der Reihenfolge absolviert werden.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>📅 Wie lange ist der Nothelferausweis gültig?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Der Nothelferausweis ist ab Ausstellungsdatum <strong>6 Jahre gültig</strong>. Du kannst ihn also frühzeitig absolvieren – ideal schon mit 14 Jahren, damit er bis zur Autoprüfung noch gültig ist.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>👤 Ab welchem Alter darf ich den Nothelferkurs machen?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Ab 14 Jahren. Keine weiteren Voraussetzungen. Wir empfehlen, den Kurs frühestens mit 14 Jahren zu machen – so ist der Ausweis für das Lernfahrgesuch noch gültig.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>🔄 Muss ich den Nothelferkurs für jede Kategorie neu machen?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Nein. Ein gültiger Nothelferausweis gilt für alle Fahrzeugkategorien. Wer z.B. bereits Auto fährt und jetzt Motorrad lernen möchte, braucht den Kurs nicht zu wiederholen – solange der Ausweis noch nicht abgelaufen ist.</p>
          </details>

          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-red-50">
              <span>🗣️ Wird der Kurs auf Deutsch durchgeführt?</span>
              <span class="text-red-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Ja, der Kurs ist auf Deutsch. Du musst Hochdeutsch verstehen, aber nicht flüssig sprechen. Falls nötig, darfst du eine Begleitperson als Übersetzer mitbringen.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- ====== INTERNE LINKS ====== -->
    <section class="py-12 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-xl font-bold text-gray-900 mb-5">Nächste Schritte nach dem Nothelferkurs</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <a href="/auto-fahrschule-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🚗</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Auto Fahrschule Zürich</p>
              <p class="text-xs text-gray-500">Kategorie B Fahrstunden</p>
            </div>
          </a>
          <a href="/motorrad-fahrschule-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🏍️</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Motorrad Fahrschule Zürich</p>
              <p class="text-xs text-gray-500">A1, A35kW, A in Zürich</p>
            </div>
          </a>
          <a href="/vku-kurs-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">📋</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">VKU Kurs Zürich</p>
              <p class="text-xs text-gray-500">Verkehrskundeunterricht buchen</p>
            </div>
          </a>
          <a href="/fahrschule-zuerich/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">📍</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Fahrschule Zürich-Altstetten</p>
              <p class="text-xs text-gray-500">Unser Hauptstandort</p>
            </div>
          </a>
          <a href="/nothelferkurs/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">🏥</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Nothelferkurs allgemein</p>
              <p class="text-xs text-gray-500">Alle Standorte & Infos</p>
            </div>
          </a>
          <a href="/kostenrechner/" class="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition">
            <span class="text-2xl">💰</span>
            <div>
              <p class="font-semibold text-gray-900 text-sm">Kostenrechner</p>
              <p class="text-xs text-gray-500">Führerschein Kosten berechnen</p>
            </div>
          </a>
        </div>
      </div>
    </section>

    <StandorteSection exclude="zuerich" />
    <CtaSection title="Nothelferkurs Zürich – Jetzt anmelden!" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const jsonLdScripts = [
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Nothelferkurs Zürich",
      "description": "Obligatorischer Nothelferkurs für den Führerschein in Zürich-Altstetten. 10 Stunden, CHF 120.-, Nothelferausweis inklusive. 6 Jahre gültig. Ab 14 Jahren.",
      "url": "https://drivingteam.ch/nothelferkurs-zuerich/",
      "image": "https://drivingteam.ch/images/courses/nothelfer-hero.webp",
      "provider": {
        "@type": "Organization",
        "name": "Driving Team Fahrschule",
        "url": "https://drivingteam.ch",
        "telephone": "+41444310033",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Baslerstrasse 145",
          "addressLocality": "Zürich",
          "postalCode": "8048",
          "addressCountry": "CH"
        }
      },
      "offers": {
        "@type": "Offer",
        "price": "120",
        "priceCurrency": "CHF",
        "availability": "https://schema.org/InStock",
        "url": "https://drivingteam.ch/nothelferkurs-buchen/nothelfer/"
      },
      "educationalLevel": "Beginner",
      "timeRequired": "PT10H",
      "hasCourseInstance": [
        {
          "@type": "CourseInstance",
          "courseMode": "onsite",
          "location": {
            "@type": "Place",
            "name": "Zürich-Altstetten",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Zürich",
              "postalCode": "8048",
              "addressCountry": "CH"
            }
          }
        }
      ]
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
        { "@type": "ListItem", "position": 2, "name": "Nothelferkurs", "item": "https://drivingteam.ch/nothelferkurs/" },
        { "@type": "ListItem", "position": 3, "name": "Nothelferkurs Zürich", "item": "https://drivingteam.ch/nothelferkurs-zuerich/" }
      ]
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Was kostet der Nothelferkurs in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Der Nothelferkurs in Zürich kostet CHF 120.- inkl. Nothelferausweis. Barzahlung am ersten Kurstag." } },
        { "@type": "Question", "name": "Wo findet der Nothelferkurs in Zürich statt?", "acceptedAnswer": { "@type": "Answer", "text": "Bei Nothelfer am Bahnhof Altstetten, hinter dem Bahnhof Zürich-Altstetten. Wird durch Driving Team organisiert und gebucht." } },
        { "@type": "Question", "name": "Wie lange dauert der Nothelferkurs?", "acceptedAnswer": { "@type": "Answer", "text": "10 Stunden total, aufgeteilt in zwei Teile: Teil 1 (ca. 3h abends) und Teil 2 (ca. 7h tagsüber)." } },
        { "@type": "Question", "name": "Wie lange ist der Nothelferausweis gültig?", "acceptedAnswer": { "@type": "Answer", "text": "6 Jahre ab Ausstellungsdatum." } },
        { "@type": "Question", "name": "Muss ich den Nothelferkurs für jede Führerschein-Kategorie neu machen?", "acceptedAnswer": { "@type": "Answer", "text": "Nein. Ein gültiger Nothelferausweis gilt für alle Fahrzeugkategorien (Auto, Motorrad, LKW, etc.)." } }
      ]
    })
  }
]

useHead({ script: jsonLdScripts })
</script>
