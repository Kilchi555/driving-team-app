<template>
  <div>
    <Head>
      <Title>Motorrad Grundkurs Lachen | 3 x 4h für Motorrad & Roller | Driving Team</Title>
      <Meta name="description" content="Motorrad Grundkurs Lachen – 3 x 4h praxisorientierter Grundkurs für alle Motorrad-Kategorien. Kompletter Kurs CHF 570.-. Max. 5 Teilnehmer. Jetzt anmelden!" />
      <Meta property="og:title" content="Motorrad Grundkurs Lachen – CHF 570.- | Driving Team" />
      <Meta property="og:description" content="Motorrad Grundkurs in Lachen SZ. 3x4h für alle Kategorien, CHF 570.-, max. 5 Teilnehmer." />
      <Link rel="canonical" href="https://drivingteam.ch/motorrad-grundkurs-lachen/" />
      
      
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/courses/motorrad-grundkurs.png" alt="Motorrad Grundkurs" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-4">Motorrad Grundkurs Lachen</h1>
          <p class="hidden xs:block text-xl text-primary-100 mb-2">Kompletter Kurs in Lachen nur für <strong>CHF 570.–</strong> anstatt 630.-</p>
          <p class="hidden xs:block text-primary-100 mb-8">Praxisorientierter Motorrad Grundkurs: 3 Kursteile à 4 Stunden. Max. 5 Teilnehmer. Inkl. Kursbestätigung & Getränk.</p>
          <a href="https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Lachen" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt anmelden
          </a>
        </div>
      </div>
    </section>

    <!-- Kursübersicht -->
    <CourseOverviewSection
      title="Motorrad Grundkurs Lachen"
      description="Wir gestalten den Motorrad Grundkurs in Lachen praxisorientiert, sodass du intensiv üben und stark davon profitieren kannst. Unsere Motorradfahrlehrer:innen zeigen und erklären dir alle relevanten Themen."
      :requirements="[
        'Gültiger Lernfahrausweis der Kategorie A1/A',
        'Selbständiges Fahren von A nach B möglich',
        'Eigenes Motorrad/Roller inkl. Sicherheitsbekleidung mitbringen'
      ]"
      :details="[
        '🏍️ Kompletter Kurs: <strong>CHF 570.-</strong> (Kosten pro Kursteil CHF 190.-)',
        '👥 Maximal <strong>5 Teilnehmer</strong>',
        '📜 Inkl. <strong>Kursbestätigung & Getränk</strong>',
        '📍 Treffpunkt: <strong>Herrengasse 17, 8853 Lachen/SZ</strong>'
      ]"
      :important-notes="[
        'Für Kategorie A1 sind neu ebenfalls die Kursteile 1, 2 & 3 zu absolvieren. (Für Inhaber der Kategorie B ist dann keine praktische Prüfung notwendig.)',
        'Wenn du die Kategorie A1 OHNE GESCHWINDIGKEITSBESCHRÄNKUNG (45km/h) bereits seit mindestens 31.12.2020 besitzt und die Kategorie A beschränkt (35kW) machen willst, dann melde dich nur für den Kursteil 3 an.'
      ]"
      :stats="{ requirements: 3, details: 4, hours: '12h' }"
    />

    <!-- Standort & Map -->
    <StandortMapSection location-key="lachen" />

    <!-- Kategorien -->
    <ClientOnly>
      <MotorradKategorienSection />
    </ClientOnly>

    <!-- Kurs Themen -->
    <KursteileSection />

    <!-- Reviews -->
    <ReviewsSection category="motorrad-grundkurs" />

    <!-- FAQ -->
    <section class="section-container">
      <h2 class="heading-md mb-10 text-center">Die häufigen Fragen bezüglich Motorrad Grundkurs</h2>
      <div class="max-w-3xl mx-auto space-y-4">
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Was ist ein Motorrad-Grundkurs und warum ist er notwendig?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Ein Motorrad-Grundkurs bei Driving Team Lachen vermittelt essenzielle Fähigkeiten für sicheres Motorradfahren, darunter die korrekte Sitzposition, Fahrzeugbedienung, Kurvenfahren und schnelles Bremsen. Er ist gesetzlich vorgeschrieben, um sicherzustellen, dass alle Motorradfahrer in der Schweiz die notwendigen Kenntnisse für die Teilnahme am Strassenverkehr besitzen. Dieser Kurs senkt das Unfallrisiko und steigert die Sicherheit auf den Strassen.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wer muss einen Motorrad-Grundkurs in der Schweiz absolvieren?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">In der Schweiz ist der Motorrad-Grundkurs Pflicht für alle, die einen Führerschein der Kategorie A1 oder A (beschränkt) anstreben. Dieser Kurs ist ein wesentlicher Schritt, um die nötige Befähigung für sicheres Motorradfahren zu erlangen und den Weg zum Motorradführerschein erfolgreich zu meistern.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viele Stunden umfasst der Motorrad-Grundkurs bei Driving Team in Lachen?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Der Motorrad-Grundkurs bei Driving Team in Lachen umfasst insgesamt 12 Stunden, aufgeteilt in 3 Kursteile à 4 Stunden. Diese Struktur gewährleistet eine umfassende Ausbildung in allen wichtigen Bereichen des Motorradfahrens, von der Handhabung bis zur Verkehrssicherheit.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Motorräder stellt Driving Team für den Grundkurs zur Verfügung?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Für den Motorrad-Grundkurs bei Driving Team in Lachen müssen Teilnehmende in der Regel ihr eigenes Fahrzeug mitbringen.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Kann ich meinen eigenen Helm und Schutzkleidung mitbringen?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Ja, beim Driving Team Lachen ist es erforderlich, dass Teilnehmende ihre eigene Motorrad-Sicherheitsbekleidung, einschliesslich eines Motorradhelms, mitbringen. Der Helm ist gesetzlich vorgeschrieben, während weitere Schutzausrüstung wie Motorradbekleidung, Schuhe, Kombis oder Handschuhe dringend empfohlen, aber nicht zwingend erforderlich ist.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Themen werden im Motorrad-Grundkurs behandelt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <div class="text-gray-600 mt-4 text-sm">
            <p class="mb-2">Der Kurs ist in drei Teile gegliedert:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Teil 1:</strong> Fahrzeugbeherrschung im Langsamfahrbereich, Parcours, Betriebssicherheit, Motorradbekleidung, gesetzliche Aspekte, Fahren im Verkehr (Abbiegen, Sicherheitsabstand).</li>
              <li><strong>Teil 2:</strong> Schnelle und sichere Bremsmanöver, Kreisverkehrsplätze, Rechtsvortritt, Berganfahren, Vortrittsregeln, Parkieren.</li>
              <li><strong>Teil 3:</strong> Sicheres Kurvenfahren, Mitnahme eines Sozius, Geschwindigkeitsgestaltung, Gruppenfahren.</li>
            </ul>
          </div>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie kann ich mich für einen Motorrad-Grundkurs anmelden?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Die Anmeldung für einen Motorrad-Grundkurs bei Driving Team in Lachen ist einfach und unkompliziert. Klicke auf einen der «Jetzt anmelden»-Buttons auf dieser Seite. Solltest du Fragen haben, stehen wir dir jederzeit per E-Mail oder telefonisch zur Verfügung.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viel kostet der Motorrad-Grundkurs bei Driving Team in Lachen?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Bei Driving Team in Lachen beträgt die Gebühr für jeden Kursteil des Motorrad-Grundkurses CHF 190.-. Diese Investition in deine Sicherheit stellt sicher, dass du bestens für die Teilnahme am Strassenverkehr vorbereitet bist.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Zahlungsmethoden werden akzeptiert?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Nach deiner Anmeldung zum Motorrad-Grundkurs bei Driving Team in Lachen erhältst du eine Rechnung, die innerhalb von 14 Tagen beglichen werden muss. Bitte beachte, dass die Zahlung fristgerecht erfolgen sollte, um deinen Platz im Kurs zu sichern.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es eine Rückerstattungspolitik, falls ich nicht am Kurs teilnehmen kann?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Ja, bei Driving Team in Lachen verstehen wir, dass Pläne sich ändern können. Frühzeitige Umbuchungen oder Absagen sind daher kostenlos möglich. Bei Umbuchungen oder Absagen weniger als 14 Tage vor Kursbeginn erheben wir eine Umtriebsentschädigung von CHF 80.-. Für unentschuldigtes Fernbleiben oder Absagen weniger als 24 Stunden vor Kursbeginn müssen leider die vollen Kurskosten verrechnet werden.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet der Motorrad-Grundkurs statt?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Der Treffpunkt für den Motorrad-Grundkurs von Driving Team befindet sich direkt vor unserem Lokal in Lachen: Herrengasse 17, 8853 Lachen/SZ (2 Gehminuten vom Bhf Lachen). Dort wirst du zu Beginn des Kurses von unseren Instruktoren begrüsst.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Was passiert bei schlechtem Wetter? Wird der Kurs verschoben?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Bei Driving Team in Lachen legen wir grossen Wert auf Sicherheit. Sollten die Wetterbedingungen, wie Temperaturen unter 5 Grad Celsius oder heftige Niederschläge, ein sicheres Fahren nicht zulassen, kann das Kursprogramm angepasst oder der Kurs verschoben werden. In solchen Fällen informieren wir die Teilnehmenden rechtzeitig über alle Änderungen.</p>
        </details>
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
          <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Sprachen werden für den Motorrad-Grundkurs angeboten?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
          <p class="text-gray-600 mt-4 text-sm">Der Motorrad-Grundkurs bei Driving Team in Lachen wird grundsätzlich in Deutsch durchgeführt.</p>
        </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es spezielle Vorbereitungen, die ich vor dem Kurs treffen sollte?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Vor der Teilnahme am Motorrad-Grundkurs bei Driving Team Lachen ist es wichtig, dass du zumindest grundlegende Fähigkeiten im selbstständigen Fahren deines Motorrads besitzt. Es sind keine weiteren speziellen Vorbereitungen erforderlich. Solltest du dich jedoch unsicher fühlen oder das Fahren deines Motorrads noch nicht beherrschen, bieten wir individuelle Fahrstunden an. In diesen persönlichen 1-zu-1 Fahrstunden kannst du unter Anleitung unserer erfahrenen Motorradfahrlehrer die grundlegende Handhabung und das Fahren üben, um bestens auf den Grundkurs vorbereitet zu sein.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie geht es nach dem Abschluss des Motorrad-Grundkurses weiter?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Nach erfolgreichem Abschluss des Motorrad-Grundkurses bei Driving Team Lachen empfehlen wir, das Erlernte kontinuierlich zu üben, um dich optimal auf die praktische Führerscheinprüfung vorzubereiten. Um deine Fähigkeiten weiter zu verbessern und dich bestmöglich auf die Prüfungssituation einzustellen, bieten wir spezielle Prüfungsvorbereitungskurse oder Fahrstunden an, die eine Prüfungssimulation mit unseren erfahrenen Motorradfahrlehrern umfassen. Diese zusätzliche Vorbereitung kann dir helfen, mehr Sicherheit im Umgang mit dem Motorrad zu gewinnen und die Prüfung erfolgreich zu bestehen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Bietet Driving Team weitere Trainings oder Kurse für Motorradfahrer an?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Ja, neben dem Motorrad-Grundkurs bietet Driving Team Lachen eine Vielzahl an zusätzlichen Kursen an, die auf die Bedürfnisse und Fähigkeiten von Motorradfahrern zugeschnitten sind. Dazu gehören Schräglagentrainings, die deine Fertigkeiten in Kurvenfahrten verbessern, Soziusfahrkurse, die sich auf das Fahren mit einem Beifahrer konzentrieren, sowie spezielle Prüfungsvorbereitungskurse, die darauf abzielen, dich bestmöglich auf die Motorradführerscheinprüfung vorzubereiten. Diese Kurse sind ideal, um deine Fahrtechnik zu verfeinern und deine Sicherheit auf der Strasse zu erhöhen.</p>
          </details>
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie erhalte ich die unlimitierte Kategorie A?<span class="text-primary-500 group-open:rotate-180 transition hover:text-primary-700">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm">Um die unlimitierte Kategorie A in der Schweiz zu erhalten, musst du zunächst die praktische Prüfung für die beschränkte Kategorie A (35 kW) erfolgreich bestehen. Anschliessend sind zwei Jahre Fahrpraxis mit dieser Beschränkung erforderlich. Nach Ablauf dieser zwei Jahre muss eine weitere praktische Prüfung absolviert werden. Bestehst du auch diese, wird dir die unlimitierte Kategorie A ohne Leistungsbeschränkung erteilt.</p>
          </details>
      </div>
    </section>

    <!-- Warum Section -->

    <WarumSection category="motorrad" />

    <!-- Standort & Map -->
    <StandortMapSection location-key="lachen" />

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt Motorrad Grundkurs Lachen buchen!</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://www.simy.ch/customer/courses/driving-team/?category=PGS&location=Lachen" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt anmelden</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "Motorrad Grundkurs Lachen", "description": "Motorrad Grundkurs in Lachen SZ. 3x4h für alle Kategorien, max. 5 Teilnehmer.", "url": "https://drivingteam.ch/motorrad-grundkurs-lachen/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "price": "570", "priceCurrency": "CHF" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Lachen SZ" } }] }) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Motorrad Grundkurs", "item": "https://drivingteam.ch/motorrad-grundkurs/" }, { "@type": "ListItem", "position": 3, "name": "Lachen", "item": "https://drivingteam.ch/motorrad-grundkurs-lachen/" }] }) },
]
useHead({ script: jsonLdScripts })

</script>
