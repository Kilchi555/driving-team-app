<template>
  <div>
    <Head>
      <Title>Motorrad Grundkurs Zürich ✓ CHF 499.- | Max. 5 Pers.</Title>
      <Meta name="description" content="Motorrad Grundkurs Zürich ✓ CHF 499.- Komplettpreis ✓ 12 Stunden (3×4h) ✓ Max. 5 Teilnehmer ✓ Fahrschul-Motorrad verfügbar ✓ Obligatorisch für A1/A35kW/A. Jetzt buchen!" />
      <Meta name="keywords" content="Motorrad Grundkurs Zürich, Motorrad Grundkurs buchen Zürich, PGS Kurs Zürich, Motorrad Kurs Zürich, Motorrad Fahrkurs Zürich, Grundkurs Motorrad Zürich" />
      <Meta property="og:title" content="Motorrad Grundkurs Zürich | CHF 499.- | A1, A35kW, A | Driving Team" />
      <Meta property="og:description" content="Motorrad Grundkurs in Zürich-Altstetten. CHF 499.- Komplettpreis. 12 Stunden (3×4h). Max. 5 Teilnehmer. Fahrschul-Motorrad verfügbar. Obligatorisch für alle A-Kategorien." />
      <Meta property="og:url" content="https://drivingteam.ch/motorrad-grundkurs-zuerich/" />
      <Meta property="og:type" content="website" />
      <Meta property="og:locale" content="de_CH" />
      <Link rel="canonical" href="https://drivingteam.ch/motorrad-grundkurs-zuerich/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/categories/motorrad-grundkurs-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Motorrad Grundkurs Zürich | CHF 499.- | A1, A35kW, A | Driving Team" />
      <Meta name="twitter:description" content="Obligatorischer Motorrad Grundkurs in Zürich-Altstetten. CHF 499.- Komplettpreis. 12h (3×4h). Max. 5 Teilnehmer. Fahrschul-Motorrad auf Anfrage. Jetzt buchen!" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/courses/motorrad-grundkurs-hero.webp" alt="Motorrad Grundkurs – Sicheres Fahren auf zwei Rädern lernen mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-4">Motorrad Grundkurs Zürich</h1>
          <p class="hidden xs:block text-xl text-white mb-2">Kompletter Kurs in Zürich nur für <strong>CHF 499.–</strong> statt 570.-</p>
          <p class="hidden xs:block text-white mb-8">Praxisorientierter Motorrad Grundkurs: 3 Kursteile à 4 Stunden. Max. 5 Teilnehmer. Inkl. Kursbestätigung & Getränk.</p>
          <a href="https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Z%C3%BCrich" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt anmelden
          </a>
        </div>
      </div>
    </section>

    <!-- Kursübersicht -->
    <CourseOverviewSection
      title="Motorrad Grundkurs Zürich"
      description="Wir gestalten den Motorrad Grundkurs in Zürich praxisorientiert, sodass du intensiv üben und stark davon profitieren kannst. Unsere Motorradfahrlehrer:innen zeigen und erklären dir alle relevanten Themen."
      :requirements="[
        'Gültiger Lernfahrausweis der Kategorie A1 / A35kW / A',
        'Selbständiges Fahren von A nach B möglich',
        'Eigenes Motorrad/Roller (Fahrschul-Fahrzeuge für CHF 80.- pro Kursteil auf Anfrage vorhanden)',
        'Eigene Motorrad-Sicherheitsbekleidung inkl. Helm'
      ]"
      :details="[
        '🏍️ Kompletter Kurs: <strong>CHF 499.-</strong> (3 Kursteile à CHF 190.-)',
        '👥 Maximal <strong>5 Teilnehmer</strong>',
        '📜 Inkl. <strong>Kursbestätigung & Getränk</strong>',
        '📍 Treffpunkt: <strong>Driving Team Zürich, Baslerstrasse 145, 8048 Zürich</strong>'
      ]"
      :important-notes="[
        'Für Kategorie A1 sind neu ebenfalls die Kursteile 1, 2 & 3 zu absolvieren. (Für Inhaber der Kategorie B ist dann keine praktische Prüfung notwendig.)',
        'Wenn du die Kategorie A1 OHNE GESCHWINDIGKEITSBESCHRÄNKUNG (45km/h) bereits seit mindestens 31.12.2020 besitzt und die Kategorie A beschränkt (35kW) machen willst, dann melde dich nur für den Kursteil 3 an.'
      ]"
      :stats="{ requirements: 4, details: 4, hours: '12h' }"
    />

    <!-- Standort & Map -->
    <LazyStandortMapSection location-key="zuerich" />

    <!-- Kategorien -->
    <ClientOnly>
      <MotorradKategorienSection />
    </ClientOnly>

    <!-- Kurs Themen -->
    <KursteileSection />

    <!-- Reviews -->
    <ReviewsSection category="motorrad-grundkurs" />

    <!-- FAQ -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Die häufigen Fragen bezüglich Motorrad Grundkurs</h2>
        <div class="max-w-3xl mx-auto space-y-4">
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was ist ein Motorrad-Grundkurs und warum ist er notwendig?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Ein Motorrad-Grundkurs bei Driving Team Zürich vermittelt essenzielle Fähigkeiten für sicheres Motorradfahren, darunter die korrekte Sitzposition, Fahrzeugbedienung, Kurvenfahren und schnelles Bremsen. Er ist gesetzlich vorgeschrieben, um sicherzustellen, dass alle Motorradfahrer in der Schweiz die notwendigen Kenntnisse für die Teilnahme am Strassenverkehr besitzen. Dieser Kurs senkt das Unfallrisiko und steigert die Sicherheit auf den Strassen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wer muss einen Motorrad-Grundkurs in der Schweiz absolvieren?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">In der Schweiz ist der Motorrad-Grundkurs Pflicht für alle, die einen Führerschein der Kategorie A1 oder A (beschränkt) anstreben. Dieser Kurs ist ein wesentlicher Schritt, um die nötige Befähigung für sicheres Motorradfahren zu erlangen und den Weg zum Motorradführerschein erfolgreich zu meistern.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viele Stunden umfasst der Motorrad-Grundkurs bei Driving Team in Zürich?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Der Motorrad-Grundkurs bei Driving Team in Zürich umfasst insgesamt 12 Stunden, aufgeteilt in 3 Kursteile à 4 Stunden. Diese Struktur gewährleistet eine umfassende Ausbildung in allen wichtigen Bereichen des Motorradfahrens, von der Handhabung bis zur Verkehrssicherheit.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Motorräder stellt Driving Team für den Grundkurs zur Verfügung?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Für den Motorrad-Grundkurs bei Driving Team in Zürich müssen Teilnehmende in der Regel ihr eigenes Fahrzeug mitbringen. Solltest du jedoch ein Motorrad oder einen Roller benötigen, bieten wir gegen eine Gebühr von CHF 80.- pro Kursteil die Möglichkeit, ein Fahrzeug auszuleihen. Bitte kontaktiere uns im Voraus, um die Verfügbarkeit zu prüfen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Kann ich meinen eigenen Helm und Schutzkleidung mitbringen?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Ja, bei Driving Team in Zürich ist es erforderlich, dass Teilnehmende ihre eigene Motorrad-Sicherheitsbekleidung, einschliesslich eines Motorradhelms, mitbringen. Der Helm ist gesetzlich vorgeschrieben, während Schutzjacke, Hose, Kombis und Handschuhe dringend empfohlen werden. Solltest du keinen Helm oder Schutzkleidung besitzen, bieten wir eine begrenzte Anzahl zur Miete an (CHF 10.- Umtriebsentschädigung pro Nutzung).</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Themen werden im Motorrad-Grundkurs behandelt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <div class="text-gray-600 mt-4 text-sm">
              <p class="mb-2">Der Kurs ist in drei Teile gegliedert:</p>
              <ul class="list-disc pl-5 space-y-1">
                <li><strong>Teil 1:</strong> Fahrzeugbeherrschung im Langsamfahrbereich, Parcours, Betriebssicherheit, Motorradbekleidung, gesetzliche Aspekte, Fahren im Verkehr (Abbiegen, Sicherheitsabstand, Spurwechsel).</li>
                <li><strong>Teil 2:</strong> Schnelle und sichere Bremsmanöver, Fahren in Kreisverkehrsplätzen, Rechtsvortritt, Berganfahren, Vortrittsregeln, Parkieren.</li>
                <li><strong>Teil 3:</strong> Sicheres Kurvenfahren, Mitnahme eines Sozius, Geschwindigkeitsgestaltung, Gruppenfahren.</li>
              </ul>
            </div>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie kann ich mich für einen Motorrad-Grundkurs anmelden?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Die Anmeldung für einen Motorrad-Grundkurs bei Driving Team in Zürich ist einfach und unkompliziert. Auf unserer Website findest du mehrere «Jetzt anmelden»-Buttons. Klicke einfach auf einen davon, um zum Anmeldeformular zu gelangen. Solltest du Fragen haben, stehen wir dir jederzeit per E-Mail oder telefonisch zur Verfügung.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viel kostet der Motorrad-Grundkurs bei Driving Team in Zürich?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Bei Driving Team in Zürich beträgt die Gebühr für jeden Kursteil des Motorrad-Grundkurses CHF 190.-. Diese Investition in deine Sicherheit und Fähigkeiten als Motorradfahrer stellt sicher, dass du bestens für die Teilnahme am Strassenverkehr vorbereitet bist.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Zahlungsmethoden werden akzeptiert?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Nach deiner Anmeldung zum Motorrad-Grundkurs bei Driving Team in Zürich erhältst du eine Rechnung, die innerhalb von 14 Tagen beglichen werden muss. Bitte beachte, dass die Zahlung fristgerecht erfolgen sollte, um deinen Platz im Kurs zu sichern.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es eine Rückerstattungspolitik, falls ich nicht am Kurs teilnehmen kann?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Ja, bei Driving Team in Zürich verstehen wir, dass Pläne sich ändern können. Frühzeitige Umbuchungen oder Absagen sind daher kostenlos möglich. Bei Umbuchungen oder Absagen weniger als 14 Tage vor Kursbeginn erheben wir eine Umtriebsentschädigung von CHF 80.-. Für unentschuldigtes Fernbleiben oder Absagen weniger als 24 Stunden vor Kursbeginn müssen leider die vollen Kurskosten verrechnet werden. Bei Absenzen aus gesundheitlichen Gründen verzichten wir auf die Umbuchungsgebühren, sofern ein Arztzeugnis innerhalb einer Woche an info@drivingteam.ch gesendet wird.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet der Motorrad-Grundkurs statt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Der Treffpunkt für den Motorrad-Grundkurs von Driving Team befindet sich direkt vor unserem Lokal in Zürich: Baslerstrasse 145, 8048 Zürich. Dort wirst du zu Beginn des Kurses von unseren Instruktoren begrüsst und erhältst alle notwendigen Informationen zum Kursablauf.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was passiert bei schlechtem Wetter? Wird der Kurs verschoben?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Bei Driving Team in Zürich legen wir grossen Wert auf Sicherheit. Sollten die Wetterbedingungen, wie Temperaturen unter 5 Grad Celsius oder heftige Niederschläge, ein sicheres Fahren nicht zulassen, kann das Kursprogramm angepasst oder der Kurs verschoben werden. In solchen Fällen informieren wir die Teilnehmenden rechtzeitig.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Sprachen werden für den Motorrad-Grundkurs angeboten?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Der Motorrad-Grundkurs bei Driving Team in Zürich wird grundsätzlich in Deutsch durchgeführt. Auf Anfrage bieten wir jedoch auch Kurse in Englisch an. Bitte teile uns deine Sprachpräferenz bei der Anmeldung mit.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Sicherheitsausrüstung ist für den Kurs erforderlich?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Für den Motorrad-Grundkurs bei Driving Team in Zürich ist das Tragen eines Motorradhelms gesetzlich vorgeschrieben. Wir empfehlen dringend die komplette Schutzausrüstung: Schutzjacke, Hose (idealerweise ein Kombi), Handschuhe und spezielle Motorradschuhe. Diese Ausrüstung bietet den besten Schutz und sollte bei jeder Fahrt getragen werden.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es spezielle Vorbereitungen, die ich vor dem Kurs treffen sollte?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Vor der Teilnahme am Motorrad-Grundkurs bei Driving Team Zürich ist es wichtig, dass du zumindest grundlegende Fähigkeiten im selbstständigen Fahren deines Motorrads besitzt. Es sind keine weiteren speziellen Vorbereitungen erforderlich. Solltest du dich jedoch unsicher fühlen oder das Fahren deines Motorrads noch nicht beherrschen, bieten wir individuelle Fahrstunden an. In diesen persönlichen 1-zu-1 Fahrstunden kannst du unter Anleitung unserer erfahrenen Motorradfahrlehrer die grundlegende Handhabung und das Fahren üben, um bestens auf den Grundkurs vorbereitet zu sein.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie geht es nach dem Abschluss des Motorrad-Grundkurses weiter?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Nach erfolgreichem Abschluss des Motorrad-Grundkurses bei Driving Team Zürich empfehlen wir, das Erlernte kontinuierlich zu üben, um dich optimal auf die praktische Führerscheinprüfung vorzubereiten. Um deine Fähigkeiten weiter zu verbessern und dich bestmöglich auf die Prüfungssituation einzustellen, bieten wir spezielle Prüfungsvorbereitungskurse oder Fahrstunden an, die eine Prüfungssimulation mit unseren erfahrenen Motorradfahrlehrern umfassen. Diese zusätzliche Vorbereitung kann dir helfen, mehr Sicherheit im Umgang mit dem Motorrad zu gewinnen und die Prüfung erfolgreich zu bestehen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Bietet Driving Team weitere Trainings oder Kurse für Motorradfahrer an?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Ja, neben dem Motorrad-Grundkurs bietet Driving Team Zürich eine Vielzahl an zusätzlichen Kursen an, die auf die Bedürfnisse und Fähigkeiten von Motorradfahrern zugeschnitten sind. Dazu gehören Schräglagentrainings, die deine Fertigkeiten in Kurvenfahrten verbessern, Soziusfahrkurse, die sich auf das Fahren mit einem Beifahrer konzentrieren, sowie spezielle Prüfungsvorbereitungskurse, die darauf abzielen, dich bestmöglich auf die Motorradführerscheinprüfung vorzubereiten. Diese Kurse sind ideal, um deine Fahrtechnik zu verfeinern und deine Sicherheit auf der Strasse zu erhöhen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie erhalte ich die unlimitierte Kategorie A?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Um die unlimitierte Kategorie A in der Schweiz zu erhalten, musst du zunächst die praktische Prüfung für die beschränkte Kategorie A (35 kW) erfolgreich bestehen. Anschliessend sind zwei Jahre Fahrpraxis mit dieser Beschränkung erforderlich. Nach Ablauf dieser zwei Jahre musst du eine weitere praktische Prüfung absolvieren. Bestehst du auch diese, wird dir die unlimitierte Kategorie A ohne Leistungsbeschränkung erteilt.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Warum Section -->
    <WarumSection category="motorrad" />

    <!-- Weitere Angebote -->
    <section class="section-container py-12">
      <h2 class="text-xl font-bold text-center mb-8 text-gray-900">Weitere Angebote in Zürich & Umgebung</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <a href="/motorrad-fahrschule/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">🏍️</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Motorrad Fahrschule</p>
          <p class="text-xs text-gray-500 mt-1">Alle Infos Kat. A / A1</p>
        </a>
        <a href="/motorrad-grundkurs-lachen/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">📍</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Motorrad Grundkurs Lachen SZ</p>
          <p class="text-xs text-gray-500 mt-1">CHF 570.- Komplettpreis</p>
        </a>
        <a href="/nothelferkurs/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">❤️</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Nothelferkurs</p>
          <p class="text-xs text-gray-500 mt-1">Pflichtbestandteil · CHF 99</p>
        </a>
        <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">💰</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Alle Preise ansehen</p>
          <p class="text-xs text-gray-500 mt-1">Transparente Übersicht</p>
        </a>
      </div>
    </section>

    <!-- Standort & Map -->
    <LazyStandortMapSection location-key="zuerich" />

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt Motorrad Grundkurs Zürich buchen!</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Z%C3%BCrich" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt anmelden</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "Motorrad Grundkurs Zürich – PGS A1/A35kW/A", "description": "Obligatorischer Motorrad Grundkurs in Zürich-Altstetten für Kategorien A1, A35kW und A. 12 Stunden (3×4h), CHF 499.- Komplettpreis, max. 5 Teilnehmer, Fahrschul-Motorrad auf Anfrage verfügbar.", "url": "https://drivingteam.ch/motorrad-grundkurs-zuerich/", "timeRequired": "PT12H", "educationalLevel": "Beginner", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch", "telephone": "+41444310033", "address": { "@type": "PostalAddress", "streetAddress": "Baslerstrasse 145", "addressLocality": "Zürich", "postalCode": "8048", "addressCountry": "CH" } }, "offers": { "@type": "Offer", "price": "499", "priceCurrency": "CHF", "availability": "https://schema.org/InStock", "url": "https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Z%C3%BCrich" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Zürich-Altstetten", "address": { "@type": "PostalAddress", "streetAddress": "Baslerstrasse 145", "addressLocality": "Zürich", "postalCode": "8048", "addressCountry": "CH" } } }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "Was ist ein Motorrad-Grundkurs und warum ist er notwendig?", "acceptedAnswer": {"@type": "Answer", "text": "Ein Motorrad-Grundkurs bei Driving Team Zürich vermittelt essenzielle Fähigkeiten für sicheres Motorradfahren. Er ist gesetzlich vorgeschrieben für alle, die einen Führerschein der Kategorie A1 oder A (beschränkt) anstreben."}}, {"@type": "Question", "name": "Wer muss einen Motorrad-Grundkurs in der Schweiz absolvieren?", "acceptedAnswer": {"@type": "Answer", "text": "In der Schweiz ist der Motorrad-Grundkurs Pflicht für alle, die einen Führerschein der Kategorie A1 oder A (beschränkt) anstreben."}}, {"@type": "Question", "name": "Wie viele Stunden umfasst der Motorrad-Grundkurs bei Driving Team in Zürich?", "acceptedAnswer": {"@type": "Answer", "text": "Der Motorrad-Grundkurs bei Driving Team in Zürich umfasst insgesamt 12 Stunden, aufgeteilt in 3 Kursteile à 4 Stunden."}}, {"@type": "Question", "name": "Welche Motorräder stellt Driving Team für den Grundkurs zur Verfügung?", "acceptedAnswer": {"@type": "Answer", "text": "Teilnehmende bringen in der Regel ihr eigenes Fahrzeug mit. Ein Mietfahrzeug ist für CHF 80.- pro Kursteil verfügbar."}}, {"@type": "Question", "name": "Wie viel kostet der Motorrad-Grundkurs bei Driving Team in Zürich?", "acceptedAnswer": {"@type": "Answer", "text": "Bei Driving Team in Zürich beträgt die Gebühr CHF 499.- für den kompletten Kurs (3 Teile)."}}, {"@type": "Question", "name": "Welche Themen werden im Motorrad-Grundkurs behandelt?", "acceptedAnswer": {"@type": "Answer", "text": "Teil 1: Fahrzeugbeherrschung, Parcours, Betriebssicherheit. Teil 2: Bremsmanöver, Kreisverkehr, Vortrittsregeln. Teil 3: Kurvenfahren, Sozius, Gruppenfahren."}}, {"@type": "Question", "name": "Was passiert bei schlechtem Wetter?", "acceptedAnswer": {"@type": "Answer", "text": "Bei Temperaturen unter 5 Grad oder heftigem Niederschlag kann der Kurs angepasst oder verschoben werden."}}, {"@type": "Question", "name": "Wo findet der Motorrad-Grundkurs statt?", "acceptedAnswer": {"@type": "Answer", "text": "Der Treffpunkt befindet sich direkt vor unserem Lokal: Baslerstrasse 145, 8048 Zürich."}}, {"@type": "Question", "name": "Gibt es eine Rückerstattungspolitik?", "acceptedAnswer": {"@type": "Answer", "text": "Frühzeitige Absagen sind kostenlos. Bei Absagen weniger als 14 Tage vor Kursbeginn: CHF 80.- Umtriebsentschädigung."}}, {"@type": "Question", "name": "Welche Sprachen werden angeboten?", "acceptedAnswer": {"@type": "Answer", "text": "Der Kurs wird grundsätzlich auf Deutsch durchgeführt. Auf Anfrage auch auf Englisch."}}, {"@type": "Question", "name": "Wie erhalte ich die unlimitierte Kategorie A?", "acceptedAnswer": {"@type": "Answer", "text": "Nach der beschränkten Kategorie A (35 kW) sind 2 Jahre Fahrpraxis erforderlich, danach folgt eine weitere praktische Prüfung für die unlimitierte Kategorie A."}}]}) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Motorrad Grundkurs", "item": "https://drivingteam.ch/motorrad-grundkurs/" }, { "@type": "ListItem", "position": 3, "name": "Zürich", "item": "https://drivingteam.ch/motorrad-grundkurs-zuerich/" }] }) },
]
useHead({ script: jsonLdScripts })

</script>
