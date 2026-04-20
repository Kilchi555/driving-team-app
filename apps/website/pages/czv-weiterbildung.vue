<template>
  <div>
    <Head>
      <Title>CZV Weiterbildung – 5 Kurse in 5 Jahren | Driving Team</Title>
      <Meta name="description" content="CZV Weiterbildungskurse beim Driving Team. Prävention, Traffic Health, ARV1, Radwechsel & Brandbekämpfung. CHF 190.- pro Kurs inkl. SARI-Bestätigung." />
      <Meta property="og:title" content="CZV Weiterbildungskurse – 5 Kurse in 5 Jahren | Driving Team" />
      <Meta property="og:description" content="Obligatorische CZV Weiterbildung für Berufschauffeure. 5 Kurse in 5 Jahren, CHF 190.- pro Kurs inkl. SARI-Bestätigung." />
      <Meta property="og:url" content="https://drivingteam.ch/czv-weiterbildung/" />
      <Link rel="canonical" href="https://drivingteam.ch/czv-weiterbildung/" />
      
      
          <Meta property="og:image" content="https://drivingteam.ch/images/czv-grundkurs-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-orange-600 to-orange-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/courses/czv-weiterbildung-hero.webp" sizes="100vw" alt="CZV Weiterbildung – Fortbildung für Berufsfahrer mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" loading="eager" fetchpriority="high" width="828" height="550" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-6">CZV Weiterbildungskurse</h1>
          <p class="text-base xs:text-xl text-orange-100 mb-4">Für die Erneuerung des Fähigkeitsausweises musst du 5 Tage Weiterbildung innerhalb von 5 Jahren nachweisen. Die CZV-Ziele sind:</p>
          <ul class="text-base xs:text-xl text-orange-100 space-y-2 mb-8 list-disc pl-6">
            <li>Verbesserung der Verkehrssicherheit</li>
            <li>Aufwertung des Chauffeurberufs</li>
            <li>Umweltverträgliche und energieeffiziente Verwendung des Fahrzeugs</li>
          </ul>
          <button @click="showPicker = true" class="btn-primary bg-white text-orange-600 hover:bg-orange-50 text-lg">
            ✉️ Kurs anfragen
          </button>
        </div>
      </div>
    </section>

    <!-- Hinweis -->
    <section class="section-container">
      <div class="max-w-3xl mx-auto bg-orange-50 border border-orange-200 rounded-lg p-6">
        <p class="text-gray-700 text-center"><strong>Aktuell nehmen wir nur Firmenanfragen an.</strong> Bitte kontaktiere uns direkt für Firmen-Buchungen.</p>
      </div>
    </section>

    <!-- Kurse -->
    <section class="bg-gray-50 py-8">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Unsere CZV Weiterbildungskurse</h2>
        <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 overflow-hidden">
            <img src="/images/courses/unfallstelle-pannendreieck.webp" alt="Prävention und Verhalten bei Unfällen Kurs" class="w-full h-48 object-cover rounded-lg mb-4" />
            <h3 class="font-bold text-xl text-gray-900 mb-3">🚨 Prävention und Verhalten bei Unfällen</h3>
            <p class="text-gray-600 text-sm mb-4">In unserem CZV Weiterbildungskurs zum Thema Prävention und Verhalten bei Unfällen geht es in erster Linie um das allerwichtigste im Strassenverkehr: Massnahmen um Unfälle zu vermeiden und im zweiten Teil das richtige Verhalten nach einem Unfall.</p>
            <div class="border-t pt-4 space-y-2">
              <p class="text-sm text-gray-700"><strong>Kosten:</strong> CHF 190.- inkl. Kaffee & Gipfeli, Mittagessen und Kursbestätigung (SARI)</p>
              <p class="text-sm text-gray-700"><strong>Max. Teilnehmer:</strong> 16</p>
            </div>
            <button @click="openModal('Prävention und Verhalten bei Unfällen')" class="btn-primary mt-4 inline-block text-sm">Anfrage senden</button>
          </div>

          <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 overflow-hidden">
            <img src="/images/courses/traffic-health.webp" alt="Traffic Health Kurs" class="w-full h-48 object-cover rounded-lg mb-4" />
            <h3 class="font-bold text-xl text-gray-900 mb-3">💪 Traffic Health</h3>
            <p class="text-gray-600 text-sm mb-4">Gesund und sicher im Strassenverkehr. Keren Lopata, der Fitnesscoach von diversen Schweizer Promis, erklärt euch einfach umsetzbare und gesunde Ernährung und zeigt Kraftübungen ohne grossen Aufwand.</p>
            <div class="border-t pt-4 space-y-2">
              <p class="text-sm text-gray-700"><strong>Kosten:</strong> CHF 190.- inkl. Kaffee & Gipfeli, Mittagessen und Kursbestätigung (SARI)</p>
              <p class="text-sm text-gray-700"><strong>Max. Teilnehmer:</strong> 16</p>
            </div>
            <button @click="openModal('Traffic Health – Gesund und sicher im Strassenverkehr')" class="btn-primary mt-4 inline-block text-sm">Anfrage senden</button>
          </div>

          <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 overflow-hidden">
            <img src="/images/courses/arv-1.webp" alt="ARV1 Kurs" class="w-full h-48 object-cover rounded-lg mb-4" />
            <h3 class="font-bold text-xl text-gray-900 mb-3">📋 ARV1 und Rundumkontrolle</h3>
            <p class="text-gray-600 text-sm mb-4">In diesem Kurs erhältst du das nötige Rüstzeug, um in der Praxis die wichtigsten Regeln in Sachen Arbeits-, Lenk- und Ruhzeit und Betriebssicherheit zu kennen und anzuwenden.</p>
            <div class="border-t pt-4 space-y-2">
              <p class="text-sm text-gray-700"><strong>Kosten:</strong> CHF 190.- inkl. Kaffee & Gipfeli, Mittagessen und Kursbestätigung (SARI)</p>
              <p class="text-sm text-gray-700"><strong>Max. Teilnehmer:</strong> 16</p>
            </div>
            <button @click="openModal('ARV1 und Rundumkontrolle')" class="btn-primary mt-4 inline-block text-sm">Anfrage senden</button>
          </div>

          <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 overflow-hidden">
            <img src="/images/courses/brand-bekampfung.webp" alt="Brandbekämpfung Kurs" class="w-full h-48 object-cover rounded-lg mb-4" />
            <h3 class="font-bold text-xl text-gray-900 mb-3">🔧 Radwechsel & Brandbekämpfung</h3>
            <p class="text-gray-600 text-sm mb-4">In dieser CZV Weiterbildung bereiten wir dich auf den Fall vor, falls du mal Schneeketten montieren oder einen Radwechsel durchführen musst. In der zweiten Tageshälfte üben wir den Umgang mit Löschmitteln.</p>
            <div class="border-t pt-4 space-y-2">
              <p class="text-sm text-gray-700"><strong>Kosten:</strong> CHF 190.- inkl. Kaffee & Gipfeli, Mittagessen und Kursbestätigung (SARI)</p>
              <p class="text-sm text-gray-700"><strong>Max. Teilnehmer:</strong> 16</p>
            </div>
            <button @click="openModal('Radwechsel & Brandbekämpfung')" class="btn-primary mt-4 inline-block text-sm">Anfrage senden</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Gruppen / Firmen -->
    <section class="section-container">
      <div class="max-w-3xl mx-auto bg-primary-50 rounded-lg p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Für Gruppen oder Firmen</h2>
        <p class="text-gray-700">Seid ihr eine Gruppe von Chauffeuren bzw. Chauffeusen oder eine Firma mit mindestens 10 Kursteilnehmer:innen, dann können wir euch euren speziell zusammengestellten CZV-Weiterbildungskurs anbieten. Kontaktiert uns direkt für ein individuelles Angebot.</p>
        <div class="flex flex-col md:flex-row gap-4 mt-6">
          <button @click="openModal('CZV Weiterbildung – Firmenanfrage')" class="btn-primary">✉️ Anfrage senden</button>
          <a href="tel:+41444310033" class="btn-primary bg-gray-600 hover:bg-gray-700">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>

    <InstructorProfileSection :instructors="instructors" />

    <!-- FAQ -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-3 text-center">CZV – Häufige Fragen</h2>
        <p class="text-center text-gray-500 text-sm mb-10">Alles was du zur CZV Weiterbildungspflicht wissen musst</p>

        <!-- Grundlagen -->
        <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 max-w-3xl mx-auto">Grundlagen & Pflicht</p>
        <div class="max-w-3xl mx-auto space-y-2 mb-8">
          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was ist die CZV und für wen gilt sie?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Die <strong>Chauffeurzulassungsverordnung (CZV)</strong> regelt die Aus- und Weiterbildung von Berufschauffeuren im Personen- und Gütertransport (Kategorien C/CE und D). Die Schweiz hat diese EU-Richtlinie 2007 ins nationale Recht übernommen. Sie gilt für alle, die mit diesen Kategorien beruflich fahren.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Warum gibt es CZV-Weiterbildungen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Mit der Weiterbildung soll erreicht werden, dass Berufschauffeure Erfahrungen aus der Praxis mit Fachpersonen diskutieren, Defizite beheben, Fachwissen vertiefen und insbesondere eine verkehrsgerechte und umweltschonende Fahrweise regelmässig reflektieren. Ziel ist die Verbesserung der Verkehrssicherheit und Aufwertung des Chauffeurberufs.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wie viele Weiterbildungstage sind obligatorisch?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm"><strong>5 Weiterbildungstage innerhalb von 5 Jahren</strong> – jeder Kurstag dauert mindestens 7 Stunden. Die Kurse müssen bei einer von der asa anerkannten Weiterbildungsstätte besucht werden. Halbtageskurse werden seit 2010 nicht mehr angerechnet.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Gilt die Weiterbildungspflicht auch, wenn ich den Fähigkeitsausweis ohne Prüfung erhalten habe?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Ja. Alle Inhaber eines Fähigkeitsausweises – unabhängig davon, ob er mit oder ohne Prüfung erworben wurde – müssen die 5-Tage-Weiterbildungspflicht erfüllen, um den Ausweis zu erneuern.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Kann ich CZV-Kurse im Ausland besuchen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Nein. Personen mit Wohnsitz in der Schweiz und einem Schweizer Arbeitgeber müssen die Weiterbildungskurse bei einer von der <strong>asa anerkannten Weiterbildungsstätte in der Schweiz</strong> besuchen. Auslandskurse werden nicht angerechnet.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Kann ich denselben Kurs mehrmals besuchen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Grundsätzlich ja – es ist aber wenig sinnvoll. Mit über 1'000 anerkannten Kursangeboten in der Schweiz findest du problemlos 5 verschiedene, interessante Themen.</p>
          </details>
        </div>

        <!-- Ausweis & Nachweis -->
        <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 max-w-3xl mx-auto">Fähigkeitsausweis & Nachweis</p>
        <div class="max-w-3xl mx-auto space-y-2 mb-8">
          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wie erfolgt der Nachweis der CZV Weiterbildung?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Nach jedem absolvierten Kurstag stellt die Weiterbildungsstätte eine <strong>Kursbestätigung via SARI</strong> aus. Diese wird bei der asa registriert. Sobald du 5 Kurstage nachgewiesen hast, kannst du auf <a href="https://cambus.ch" target="_blank" class="text-primary-600 hover:underline">www.cambus.ch</a> den neuen Fähigkeitsausweis bestellen.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was ist das SARI?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">SARI steht für <strong>System für Administration, Registrierung und Information</strong>. Es ist das offizielle System der asa, über das Weiterbildungsstätten Kursbestätigungen für absolvierte CZV-Weiterbildungskurse erfassen und ausstellen. Als Teilnehmer erhältst du am Kurstag deine Bestätigung direkt ausgehändigt.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wo kann ich meinen aktuellen Weiterbildungsstand abfragen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Du kannst deinen persönlichen Weiterbildungsstand jederzeit online über das Infoportal der asa abfragen: <a href="https://cambus.ch" target="_blank" class="text-primary-600 hover:underline">www.cambus.ch</a> → «Kennen Sie den Stand Ihrer CZV-Weiterbildung».</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Können überzählige Weiterbildungstage auf die nächste Periode übertragen werden?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Nein. Überzählige Weiterbildungstage können <strong>nicht</strong> auf die nächste Weiterbildungsperiode übertragen werden. Plane daher, genau 5 Kurse innerhalb der 5-Jahres-Frist zu besuchen.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was passiert, wenn mein Fähigkeitsausweis ausläuft und ich noch nicht 5 Kurse habe?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Auf Gesuch hin kann die zuständige Behörde den Ausweis <strong>einmalig für höchstens einen Monat</strong> verlängern. Das Gesuch kann frühestens einen Monat vor Ablauf auf <a href="https://cambus.ch" target="_blank" class="text-primary-600 hover:underline">www.cambus.ch</a> eingereicht werden. Ist der Ausweis bereits abgelaufen, absolvierst du einfach die fehlenden Kurse und bestellst danach die neue Karte.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Kann ich CZV-Kurse, die vor meiner CZV-Prüfung besucht wurden, anrechnen lassen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Nein. Kurse, die <strong>vor der bestandenen CZV-Prüfung</strong> absolviert wurden, zählen nicht zur Weiterbildungsperiode und können nicht angerechnet werden.</p>
          </details>
        </div>

        <!-- Buchung & Kursablauf -->
        <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 max-w-3xl mx-auto">Buchung & Kursablauf</p>
        <div class="max-w-3xl mx-auto space-y-2">
          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Gibt es eine Prüfung an den Weiterbildungskursen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Nein, es gibt <strong>keine formelle Prüfung</strong>. Am Ende eines Kurstages gibt es in der Regel eine Lernerfolgskontrolle – jedoch kein Bestehen oder Durchfallen.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wie werden Absagen geregelt?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Das Driving Team behält sich vor, Kurse bei ungenügender Teilnehmerzahl, Verhinderung der Lehrperson oder aus Sicherheitsgründen abzusagen oder zu verschieben. Frühzeitige Umbuchungen oder Absagen sind <strong>kostenlos</strong>. Umbuchungen weniger als 14 Tage vor Kursbeginn werden mit CHF 80.– verrechnet. Bei unentschuldigtem Fernbleiben oder Absagen innerhalb von 24 Stunden werden die vollen Kurskosten in Rechnung gestellt.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Wie läuft die Bezahlung ab?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Du erhältst ca. <strong>30 Tage vor Kursbeginn</strong> eine Rechnung, die innerhalb von 14 Tagen beglichen werden muss. Bitte prüfe auch deinen Spam-Ordner, falls das E-Mail nicht angekommen ist. Kontaktiere uns bei Problemen direkt.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:shadow-sm transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">
              Was ist im Kurspreis von CHF 190.– inbegriffen?
              <span class="text-primary-500 group-open:rotate-180 transition text-sm ml-4 shrink-0">▼</span>
            </summary>
            <p class="text-gray-600 mt-3 text-sm">Im Preis von <strong>CHF 190.–</strong> sind enthalten: Kaffee & Gipfeli am Morgen, Mittagessen sowie die offizielle <strong>Kursbestätigung (SARI)</strong>, die für die Verlängerung des Fähigkeitsausweises benötigt wird.</p>
          </details>
        </div>
      </div>
    </section>

    <PriceSection category="lastwagen" />

    <GutscheinSection/>

    <!-- Unsere Gebiete -->
  <StandorteSection />

    <!-- Warum Driving Team -->
    <WarumSection category="chauffeur" />

    <!-- Inquiry Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal"
          class="fixed inset-x-0 bottom-0 top-16 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto"
          @click.self="closeModal"
        >
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto animate-scale-in">
            <!-- Close Button -->
            <button
              @click="closeModal"
              class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition shadow"
            >
              ✕
            </button>
            <div class="p-6">
              <GeneralInquiryForm
                :tenant_id="tenantId"
                mode="general"
                :custom_title="modalTitle"
                @submitted="onFormSubmitted"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Course Picker Modal (from hero button) -->
    <CoursePickerModal
      v-model="showPicker"
      :tenant-id="tenantId"
      :courses="pickerCourses"
    />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "CZV Weiterbildungskurse", "description": "Obligatorische CZV Weiterbildung für Berufschauffeure. 5 Kurse in 5 Jahren.", "url": "https://drivingteam.ch/czv-weiterbildung/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "price": "190", "priceCurrency": "CHF" } }) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "CZV Kurse", "item": "https://drivingteam.ch/czv-kurse/" }, { "@type": "ListItem", "position": 3, "name": "CZV Weiterbildung", "item": "https://drivingteam.ch/czv-weiterbildung/" }] }) },
]
useHead({ script: jsonLdScripts })

import { ref } from 'vue'
import { instructorData } from '../instructor-data'
import type { CourseOption } from '~/components/CoursePickerModal.vue'

const tenantId = '64259d68-195a-4c68-8875-f1b44d962830'
const showModal = ref(false)
const showPicker = ref(false)
const modalTitle = ref('CZV Weiterbildung anfragen')

// Get Peter from all locations as CZV instructor
const instructors = [
  instructorData.lachen.find(i => i.id === 'peter-lachen')
].filter(Boolean) as any[]

// Courses shown in picker when clicking hero button
const pickerCourses: CourseOption[] = [
  {
    id: 'praevention',
    label: 'Prävention und Verhalten bei Unfällen',
    description: 'CZV-Ziel: Sicheres Verhalten bei Verkehrsunfällen',
    icon: '🦺',
    courseType: 'czv_weiterbildung',
    formType: 'inquiry',
  },
  {
    id: 'traffic-health',
    label: 'Traffic Health – Gesund im Strassenverkehr',
    description: 'CZV-Ziel: Gesundheitsbewusstsein für Berufschauffeure',
    icon: '❤️',
    courseType: 'czv_weiterbildung',
    formType: 'inquiry',
  },
  {
    id: 'arv1',
    label: 'ARV1 und Rundumkontrolle',
    description: 'CZV-Ziel: Fahrzeugkontrolle und Arbeitszeitgesetz',
    icon: '🔧',
    courseType: 'czv_weiterbildung',
    formType: 'inquiry',
  },
  {
    id: 'brand',
    label: 'Radwechsel & Brandbekämpfung',
    description: 'CZV-Ziel: Notfallmassnahmen und Pannenhilfe',
    icon: '🔥',
    courseType: 'czv_weiterbildung',
    formType: 'inquiry',
  },
]

function openModal(title = 'CZV Weiterbildung anfragen') {
  modalTitle.value = title
  showModal.value = true
  document.body.style.overflow = 'hidden'
}

function closeModal() {
  showModal.value = false
  document.body.style.overflow = ''
}

function onFormSubmitted() {
  // Let the form's internal success modal display (3s), then close the page modal
  setTimeout(() => {
    closeModal()
  }, 3500)
}
</script>

<style scoped>
@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-scale-in { animation: scale-in 0.2s ease-out; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
