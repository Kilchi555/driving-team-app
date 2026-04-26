<template>
  <div>
    <Head>
      <Title>Fahrschule Zürich – Standort, Kurse & Team | Driving Team</Title>
      <Meta name="description" content="Fahrschule Driving Team in Zürich ✓ Auto, Motorrad, Anhänger, Lastwagen ✓ Hauptstandort Zürich-Altstetten ✓ 85% Erfolgsquote ✓ ab CHF 95.- ✓ Jetzt buchen!" />
      <Meta name="keywords" content="Fahrschule Zürich, Fahrstunden Zürich, Auto Fahrschule Zürich, Motorrad Fahrschule Zürich, Driving Team Zürich, Fahrschule Zürich-Altstetten" />
      <Meta property="og:title" content="Fahrschule Zürich – Standort & Kurse | Driving Team" />
      <Meta property="og:description" content="Professionelle Fahrschule in unserem Hauptstandort Zürich-Altstetten. Auto, Motorrad, Anhänger. Ab CHF 95.-/Lektion, 85% Erfolgsquote, flexible Zeiten." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-zuerich/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-zuerich/" />
      <Link rel="alternate" hreflang="de-CH" href="https://drivingteam.ch/fahrschule-zuerich/" />
      <Link rel="alternate" hreflang="en" href="https://drivingteam.ch/driving-school-zurich/" />
      <Link rel="alternate" hreflang="x-default" href="https://drivingteam.ch/fahrschule-zuerich/" />
      <Link rel="preload" as="image" href="/images/locations/zuerich-hero.webp" fetchpriority="high" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/zuerich-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <Meta name="date" :content="new Date().toISOString()" />
    </Head>

    <!-- Breadcrumb Navigation -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Zürich' }]" />
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/zuerich-hero.webp" alt="Fahrschule in Zürich-Altstetten – Auto, Motorrad, Anhänger mit der Fahrschule Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-6">Fahrschule Zürich – Driving Team</h1>
          <p class="text-base xs:text-xl text-white mb-8">Deine Fahrschule in Zürich. Professionelle Fahrstunden für Auto, Motorrad und Anhänger ab CHF 95.-. Unterricht auch auf Englisch & Albanisch verfügbar.</p>
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Intro Section — Altstetten Focus -->
    <section class="py-12 md:py-16 bg-gradient-to-b from-primary-50 to-white">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
          Ihre Fahrschule Zürich – Hauptstandort Altstetten
        </h2>
        <div class="space-y-4 text-gray-700">
          <p class="text-lg leading-relaxed">
            Wer in Zürich die Fahrprüfung ablegen möchte, ist bei der <strong>Fahrschule Zürich</strong> Driving Team genau richtig. Von unserem Hauptstandort in Zürich-Altstetten aus führen wir alle Kurse durch – von Nothelferkursen über Verkehrskundeunterricht bis zu Motorrad-Grundkursen – und hier starten Ihre Fahrstunden.
          </p>
          <p class="text-lg leading-relaxed">
            <strong>Zentral in Zürich</strong> • <strong>Flexible Zeiten</strong> • <strong>Professionelle Instruktoren</strong> • <strong>Ab CHF 95.–/Lektion</strong>
          </p>
        </div>
      </div>
    </section>

    <!-- 2. Features (weiß) — Warum wir -->
    <FeatureSection
      title="Warum die Fahrschule Driving Team in Zürich Altstetten?"
      subtitle="Unser Hauptstandort in Zürich-Altstetten. Hier finden alle Kurse (Nothelfer, VKU, Theorie) statt. Melde Dich an und du kannst folgende Punkte von uns erwarten…"
      :extras="['Unterricht auch in <strong>Englisch &amp; Albanisch</strong> möglich!']"
    />

      <!-- 3. Reviews (grau-50) — Was sagen andere -->
      <ReviewsSection category="zuerich" />

    <section class="py-10 bg-gray-50 text-center">
      <div class="section-container">
        <p class="text-gray-600 mb-4 text-sm">Neugierig was deine Fahrausbildung kosten wird?</p>
        <PriceCalculator title="Kostenrechner Fahrschule Zürich" />
      </div>
    </section>

    <!-- 3.5. Instructors (weiß mit gradient) — Unser Team -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- 4. Standort Map (grau-50) — Wo genau -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <!-- 5. Themen (weiß) — Was lernst du -->
    <AusbildungsthemenSection location="Zürich" />


    <!-- 6. CTA (primary) & Preise — Jetzt buchen -->
    <CtaSection title="Jetzt in Zürich-Altstetten starten!" />

    <PriceSection />


    <!-- 7. FAQ (weiß) — Letzte Fragen -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Die häufigsten Fragen & Antworten</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviele Fahrstunden benötige ich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das ist eine sehr häufig gestellte Frage, die gleichzeitig sehr schwierig zu beantworten ist. Auto fahren lernen kannst Du mit dem Erlernen einer neuen Sportart, eines neuen Instruments oder einer Fremdsprache vergleichen. Wenn Du das Projekt Fahrprüfung jedoch seriös angehst, sprich die Tipps und Tricks des Fahrlehrers ernst nimmst und probierst umzusetzen, dann wirst Du Dein Ziel in nützlicher Zeit erreichen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie kann ich meine Fahrausbildung beschleunigen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das Wichtigste ist sicher….Üben, Üben und nochmals Üben. Optimal wären 2-4 Fahrten pro Woche. Ganz wichtig beim privat Üben ist, dass Du genau so fährst, wie es Dir Dein Fahrlehrer gezeigt hat. Nur so entwickelst Du Automatismen und fühlst Dich schnell sicherer auf der Strasse.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieso dauert die Fahrstunde des Driving Teams 45 Minuten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt und analog zu den meisten Schulen angepasst. Je nach Übungsgebiet und Ausbildungsstand macht es Sinn eine 1.5 oder gar eine Doppellektion zu vereinbaren.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie rechtfertigen sich eure Preise?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke umsetzen. Dies beginnt bei den Fahrlehrer:innen, die nur langfristig seriös arbeiten können, wenn sie eine anständige Entlöhnung erhalten und vollumfänglich versichert sind. Unsere Fahrzeuge befinden sich stets in einem top gewarteten Zustand.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo bietet Ihr Fahrstunden an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unsere Lokale befinden sich in Zürich-Altstetten und in Lachen/SZ. Das Tätigkeitsgebiet erstreckt sich von Baden (Limmattal) bis nach Thalwil und von Bülach bis nach Wettswil/Bonstetten im Knonaueramt. Bei Autofahrlektionen können wir nach Möglichkeit flexible Treffpunkte vereinbaren.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Soll ich geschaltet oder automatisch fahren lernen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das muss grundsätzlich jeder für sich entscheiden. Rechtlich gesehen ist es egal, mit was ihr die Prüfung ablegt — ihr dürft nach bestandener Prüfung so oder so beides fahren.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was sind die Voraussetzungen für private Lernfahrten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <p class="mb-2">Private Lernfahrten werden häufig unterschätzt. Wichtige Voraussetzungen:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Die Begleitperson muss einen gültigen Führerausweis haben und nüchtern sein (0,0 Promille).</li>
                <li>Beim Auto: Begleitperson muss mindestens 23 Jahre alt sein und die Prüfung vor mind. 3 Jahren bestanden haben.</li>
                <li>Die Handbremse muss für die Begleitperson gut erreichbar sein.</li>
              </ul>
            </div>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was ist die Admin- und Versicherungspauschale?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet die Aufwände ausserhalb der Fahrlektionen (z.B. Anmeldung zur Führerprüfung) sowie die spezielle Vollkaskoversicherung des Fahrschulfahrzeugs.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was haben eure Fahrlehrer:innen für eine Ausbildung?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Alle unsere Fahrlehrer:innen haben eine vollumfängliche Ausbildung mit eidgenössischem Fachausweis absolviert und absolvieren jedes Jahr mindestens einen Weiterbildungstag.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welches sind die häufigsten Prüfungsrouten ab Zürich-Albisgütli?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <p class="mb-2">Grundsätzlich können die Verkehrsexperten die Route frei wählen. Häufige Routen:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Enge / Wollishofen / Kilchberg</li>
                <li>Leimbach / Adliswil / Thalwil</li>
                <li>Sihlcity / Wettswil / Ringlikon</li>
                <li>Uitikon Waldegg / Birmensdorf</li>
                <li>Wiedikon / Albisrieden / Altstetten</li>
              </ul>
            </div>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviel betragen die ungefähren Gesamtkosten für die Auto Prüfung?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die Gesamtkosten sind hauptsächlich abhängig von der Anzahl der benötigten Fahrstunden. Mit 15 Lektionen kommt man inkl. allen Kursen und Gebühren auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Kann ich Fahrstunden flexibel buchen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, wir bieten flexible Buchungen an. Du kannst Deine Fahrstunden nach Deinen Wünschen und Verfügbarkeiten mit uns abstimmen. Ob Abend-, Wochenend- oder Morgenfahrten – wir versuchen, Deine Vorstellungen umzusetzen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie lange gültig ist mein Lernfahrausweis?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Der Lernfahrausweis ist 24 Monate ab Ausstellungsdatum gültig. Mit diesem Dokument darfst Du mit einer geeigneten Begleitperson privat üben. Sollte Dein Lernfahrausweis auslaufen, kannst Du diesen noch ein 2 Mal beim Strassenverkehrsamt neu beantragen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Kann ich die Fahrstunden auch stornieren?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, Stornierungen sind möglich. Solltest Du einen Termin nicht wahrnehmen können, bitten wir Dich, uns mindestens 24 Stunden vorher in der App abzusagen. Bei kurzfristigen Absagen behalten wir uns vor, die Fahrstunde zu verrechnen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Sind Fahrstunden in englischer oder albanischer Sprache möglich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, absolut! Wir bieten Fahrstunden auch in Englisch und Albanisch an. Falls Du eine andere Sprache benötigst, sprich uns gerne an – wir versuchen, eine Lösung für Dich zu finden.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Fahrzeuge verwendet Ihr beim Unterricht?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Wir nutzen moderne, gut gewartete Fahrzeuge mit Doppelbedienung (Pedale für den Fahrlehrer). Unsere Autos sind regelmässig gewartet und Vollkasko versichert. Bei Bedarf finden wir auch für Fahrstunden mit Schaltgetriebe ein Lösung.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was sollte ich zur ersten Fahrstunde mitbringen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <p class="mb-2">Zur ersten Fahrstunde solltest Du folgende Dinge mitbringen:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Deinen Lernfahrausweis</li>
                <li>Bequeme Kleidung und geeignete Schuhe (keine Flip-Flops oder Sandalen)</li>
                <li>Gegebenenfalls eine Brille, wenn Du diese benötigst</li>
              </ul>
            </div>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie bereite ich mich optimal auf die Fahrprüfung vor?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <p class="mb-2">Mit diesen Tipps bist Du bestens vorbereitet:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Regelmässiges Üben: 2-4 Fahrstunden pro Woche sind optimal</li>
                <li>Private Lernfahrten mit einem erfahrenen Begleiter</li>
                <li>Theorie lernen: Verkehrsregeln gut kennen und verstehen</li>
                <li>Tipps des Fahrlehrers umsetzen: Ernst nehmen und konsequent anwenden</li>
              </ul>
            </div>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Bietet Ihr auch Nothelferkurse an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, wir bieten in Kooperation mit zertifizierten Anbietern auch Nothelferkurse an. Diese sind eine wichtige Voraussetzung für die Fahrprüfung. Auf der Website findest Du einen Link zu einem Online Nothelferkurs, der Du selbstständig absolvieren kannst.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Kategorien bietet Ihr in Zürich an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm leading-relaxed">
              <p class="mb-2">Wir bieten Fahrstunden für folgende Kategorien an:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li>Kategorie B (Auto)</li>
                <li>Kategorie A1, A35kW, A (Motorrad)</li>
                <li>Kategorie C1, C, CE (Lastwagen) ab Wädenswil/ZH</li>
                <li>Kategorie D1, D (Bus) ab Pfäffikon/SZ</li>
                <li>Kategorie BE (Anhänger)</li>
                <li>Kategorie A (Motorboot) ab Lachen/SZ</li>
                <li><a href="/taxi-fahrschule-zuerich/" class="text-primary-600 hover:underline">Kategorie T (Taxi) ab Zürich-Altstetten</a></li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </section>

    <!-- 8. Gutschein-->
    <div class="bg-gray-50">
      <GutscheinSection />
    </div>

    <!-- WarumSection -->
    <WarumSection category="zuerich" />

    <!-- Kategorien in Zürich – interne Verlinkung -->
    <section class="py-10 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-bold text-gray-900 mb-5">Kategorien-spezifische Seiten für Zürich</h2>
        <div class="flex flex-wrap gap-3">
          <a href="/auto-fahrschule-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-primary-200 text-primary-700 hover:border-primary-400 hover:bg-primary-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm" aria-label="Auto Fahrschule Zürich – Kategorie B im Prüfungsgebiet Albisgütli">
            🚗 Auto Fahrschule Zürich
          </a>
          <a href="/fahrstunden-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm" aria-label="Alle Fahrstunden in Zürich – Preise und Kategorien">
            🎯 Alle Fahrstunden Zürich
          </a>
          <a href="/vku-kurs-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm" aria-label="VKU Verkehrskundekurs Zürich buchen">
            📋 VKU Kurs Zürich
          </a>
          <a href="/wab-kurse-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm" aria-label="WAB Weiterbildungskurs Zürich">
            🎓 WAB Kurs Zürich
          </a>
          <a href="/nothelferkurs-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm" aria-label="Nothelferkurs Zürich buchen">
            ❤️ Nothelferkurs Zürich
          </a>
          <a href="/driving-school-zurich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm" aria-label="Driving School Zurich – English lessons">
            🌍 Driving School Zurich
          </a>
          <a href="/fahrschule-altstetten/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm" aria-label="Fahrschule Altstetten – Standort Baslerstrasse">
            📍 Fahrschule Altstetten
          </a>
        </div>
      </div>
    </section>

    <!-- 9. Finale CTA (primary) -->
    <CtaSection title="Bereit? Jetzt Termin in Zürich-Altstetten buchen!" />

    <!-- 10. Andere Standorte (weiß) -->
    <StandorteSection exclude="zuerich" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify(buildLocationSchema(LOCATION_ZUERICH)) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Fahrstunden Zürich Altstetten", "item": "https://drivingteam.ch/fahrschule-zuerich/" }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wieviele Fahrstunden benötige ich?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Das ist sehr unterschiedlich. Mit seriöser Vorbereitung und regelmässigem Üben mit Tips des Fahrlehrers erreichen die meisten Schüler ihr Ziel in nützlicher Zeit."
        }
      },
      {
        "@type": "Question",
        "name": "Wie kann ich meine Fahrausbildung beschleunigen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Optimal sind 2-4 Fahrten pro Woche. Wichtig beim privat Üben ist, dass Du genau so fährst, wie es Dir Dein Fahrlehrer gezeigt hat, um schnell Automatismen zu entwickeln."
        }
      },
      {
        "@type": "Question",
        "name": "Wieso dauert die Fahrstunde des Driving Teams 45 Minuten?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt. Je nach Übungsgebiet kann man auch 1.5 oder Doppellektionen buchen."
        }
      },
      {
        "@type": "Question",
        "name": "Wie rechtfertigen sich eure Preise?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Wir setzen auf Professionalität - von gut bezahlten und versicherten Fahrlehrern bis zu top gewarteten Fahrzeugen. Das rechtfertigt unsere Preise."
        }
      },
      {
        "@type": "Question",
        "name": "Wo bietet Ihr Fahrstunden an?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unsere Lokale befinden sich in Zürich-Altstetten und Lachen/SZ. Das Tätigkeitsgebiet erstreckt sich von Baden bis nach Thalwil und von Dübendorf bis ins Knonaueramt."
        }
      },
      {
        "@type": "Question",
        "name": "Soll ich geschaltet oder automatisch fahren lernen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Das muss jeder für sich entscheiden, ist meistens von den Fahrzeugen im privaten oder geschäftliche Umfeld abhängig. Rechtlich ist es egal - nach bestandener Prüfung darfst Du beides fahren."
        }
      },
      {
        "@type": "Question",
        "name": "Was sind die Voraussetzungen für private Lernfahrten?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die Begleitperson muss einen gültigen Führerausweis haben und nüchtern sein. Beim Auto muss sie mindestens 23 Jahre alt sein und die Prüfung vor min. 3 Jahren bestanden haben."
        }
      },
      {
        "@type": "Question",
        "name": "Was ist die Admin- und Versicherungspauschale?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet Aufwände ausserhalb der Fahrlektionen und die spezielle Vollkaskoversicherung des Fahrschulfahrzeugs."
        }
      },
      {
        "@type": "Question",
        "name": "Was haben eure Fahrlehrer:innen für eine Ausbildung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle Fahrlehrer:innen haben eine vollumfängliche Ausbildung mit eidgenössischem Fachausweis absolviert und absolvieren jedes Jahr mindestens einen Weiterbildungstag."
        }
      },
      {
        "@type": "Question",
        "name": "Welches sind die häufigsten Prüfungsrouten ab Zürich-Albisgütli?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Häufige Routen sind: Enge/Wollishofen/Kilchberg, Leimbach/Adliswil/Thalwil, Sihlcity/Wettswil/Ringlikon, Uitikon Waldegg/Birmensdorf, Wiedikon/Albisrieden/Altstetten."
        }
      },
      {
        "@type": "Question",
        "name": "Wieviel betragen die ungefähren Gesamtkosten für die Auto Prüfung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mit 15 Lektionen kommt man inkl. allen Kursen und Gebühren auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich Fahrstunden flexibel buchen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, wir bieten flexible Buchungen an. Ob Abend- oder Wochenendfahrten – wir versuchen, Deinen Vorstellungen gerne nachzukommen."
        }
      },
      {
        "@type": "Question",
        "name": "Wie lange gültig ist mein Lernfahrausweis?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der Lernfahrausweis ist 24 Monate ab Ausstellungsdatum gültig. Du kannst ihn kostenlos bei deinem Strassenverkehrsamt einmalig verlängern."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich die Fahrstunden auch stornieren?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, Stornierungen sind möglich. In der Simy App kannst du den Termin mindestens 24 Stunden vorher stornieren. Bei kurzfristigen Absagen behalten wir uns vor, die Fahrstunde in Rechnung zu stellen."
        }
      },
      {
        "@type": "Question",
        "name": "Sind Fahrstunden in englischer oder albanischer Sprache möglich?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, absolut! Wir bieten Fahrstunden auch in Englisch und Albanisch an."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Fahrzeuge verwendet Ihr beim Unterricht?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Wir fahren mit modernsten, stets top gewarteten Fahrzeugen mit Fahrschulpedalen."
        }
      },
      {
        "@type": "Question",
        "name": "Was sollte ich zur ersten Fahrstunde mitbringen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Bringe Deinen Lernfahrausweis, bequeme Kleidung, geeignete Schuhe und ggf. eine Brille/Sonnenbrille mit."
        }
      },
      {
        "@type": "Question",
        "name": "Wie bereite ich mich optimal auf die Fahrprüfung vor?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Regelmässiges Üben (2-4x pro Woche), private Lernfahrten, Theorie lernen und die Tipps des Fahrlehrers umsetzen."
        }
      },
      {
        "@type": "Question",
        "name": "Bietet Ihr auch Nothelferkurse an?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, wir bieten in Kooperation mit zertifizierten Anbietern Nothelferkurse an. Kontaktiere uns für Termine."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Kategorien bietet Ihr in Zürich an?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Wir bieten Fahrstunden für Kategorie B (Auto), A1/A35kW/A (Motorrad), BE (Anhänger), A (Motorboot ab Lachen/SZ) und C1/C/CE (Lastwagen ab Wädenswil/ZH) an."
        }
      }
    ]
  }) }
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'
import { buildLocationSchema, LOCATION_ZUERICH } from '~/business.config'

definePageMeta({
  layout: 'default'
})

const instructors = getInstructorsByLocation('zuerich')
</script>
