<template>
  <div>
    <Head>
      <Title>Motorrad Fahrstunden | 4 Schritte zur Motorradprüfung | Driving Team</Title>
      <Meta name="description" content="Motorrad Fahrstunden bei Driving Team – für alle Kategorien (A1, A 35kW, A). Prüfungsvorbereitung in Zürich, Lachen und Uster. Lektion CHF 95.-" />
      <Link rel="canonical" href="https://drivingteam.ch/motorrad-fahrstunden/" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Motorrad Fahrstunden</h1>
        <p class="text-xl text-blue-100 max-w-3xl mx-auto mb-8">4 Schritte zur Motorradprüfung</p>
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
          Jetzt Termin buchen
        </a>
      </div>
    </section>

    <!-- Intro -->
    <section class="section-container py-20">
      <div class="max-w-4xl mx-auto">
        <h2 class="heading-md mb-6">Motorrad Fahrstunden</h2>
        <p class="text-lg text-gray-700 mb-8">
          Unsere Motorrad Fahrlehrer:innen sind auch leidenschaftliche Motorradfahrer:innen. Lerne wie man sich sicher auf einem Motorrad im Strassenverkehr bewegt und lass dich von dieser Faszination anstecken!
        </p>

        <!-- Preis -->
        <div class="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 class="font-bold text-blue-800 mb-4">Preis Motorrad Fahrstunden</h3>
          <p class="text-2xl font-bold text-blue-800">CHF 95.–</p>
          <p class="text-gray-600">Lektion à 45 Minuten</p>
          <p class="text-gray-500 text-sm mt-2">keine Admin- und Versicherungspauschale</p>
        </div>

        <!-- Voraussetzungen -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 class="font-bold text-lg mb-4">Voraussetzungen</h3>
          <ul class="space-y-3">
            <li class="flex items-start gap-2 text-gray-700">
              <span class="text-green-600 font-bold mt-1">✓</span>
              gültiger Lern-/ Fahrausweis der Kategorie A1 / A35kW / A
            </li>
            <li class="flex items-start gap-2 text-gray-700">
              <span class="text-green-600 font-bold mt-1">✓</span>
              Motorrad-Sicherheitsbekleidung (mindestens Helm & Handschuhe, Motorradjacke, -hose und Schuhe empfehlenswert)
            </li>
            <li class="flex items-start gap-2 text-gray-700">
              <span class="text-green-600 font-bold mt-1">✓</span>
              eigenes betriebssicheres Motorrad/Roller
            </li>
          </ul>
          <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded p-4">
            <p class="text-gray-700 text-sm">
              <strong>Anfänger:in?</strong> Du bist noch nie Motorrad/Roller gefahren? Kein Problem! Wir begleiten dich sicher auf deinen ersten Metern.
              Fahrschul-Fahrzeuge für CHF 20.– pro Lektion auf Anfrage in Zürich vorhanden (nur für Fahrstunden vor dem Grundkurs).
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Anmeldung -->
    <section class="bg-gray-50 py-20">
      <div class="max-w-2xl mx-auto px-4">
        <h2 class="heading-md text-center mb-4">Motorrad Fahrstunden anmelden</h2>
        <p class="text-center text-gray-600 mb-12">Deine Anmeldung ist unverbindlich und wir behandeln deine Daten vertraulich.</p>
        <div class="bg-white border border-gray-200 rounded-lg p-8">
          <form class="space-y-6">
            <div class="grid md:grid-cols-2 gap-4">
              <input type="text" placeholder="Vorname*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
              <input type="text" placeholder="Name*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
            </div>
            <div class="grid md:grid-cols-3 gap-4">
              <input type="text" placeholder="Strasse*" class="md:col-span-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
              <input type="text" placeholder="Nr.*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
            </div>
            <div class="grid md:grid-cols-2 gap-4">
              <input type="text" placeholder="PLZ*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
              <input type="text" placeholder="Wohnort*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
            </div>
            <input type="email" placeholder="E-Mail*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
            <input type="tel" placeholder="Telefon*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Welcher Ort?</label>
              <select class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required>
                <option>Zürich-Altstetten</option>
                <option>Zürich-Albisgütli</option>
                <option>Lachen</option>
                <option>Uster</option>
              </select>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-700 mb-3">Ausbildungsstand</p>
              <div class="space-y-2">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Anfänger:in inkl. Motorrad-Miete Kat. 35kW in Zürich-Altstetten (CHF 20.– pro Lektion)</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Ich benötige zusätzlich zur Motorrad-Miete einen Helm (CHF 10.– pro Termin)</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Anfänger:in und ich komme mit meinem eigenen Motorrad</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Prüfungsvorbereitung</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Refresher</span>
                </label>
              </div>
            </div>
            <textarea placeholder="Weitere Angaben, bevorzugte Zeitfenster, etc." rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"></textarea>
            <div>
              <p class="text-sm font-medium text-gray-700 mb-3">Ich bin im Besitz eines Lernfahrausweis der Kategorie</p>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Kategorie A1, 50ccm</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Kategorie A1, 125ccm</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Kategorie A 35kW</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4" />
                  <span class="text-gray-700 text-sm">Kategorie A</span>
                </label>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <input type="checkbox" id="agb" class="w-4 h-4" required />
              <label for="agb" class="text-gray-700 text-sm">Ich akzeptiere die <a href="/agb" class="text-blue-600 hover:underline">AGB's</a></label>
            </div>
            <button type="submit" class="btn-primary w-full text-lg">
              Fahrstunden anfragen
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-blue-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Warum die Fahrschule Driving Team?</h2>
        <p class="text-blue-100 max-w-2xl mx-auto mb-8">Unsere Fahrschule wurde gegründet, um das traditionelle Bild des Fahrschulunterrichts zu verändern. Lernen am besten mit Begeisterung!</p>
        <a href="/motorrad-fahrschule" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
          Mehr zur Motorrad Fahrschule
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Motorrad Fahrstunden
</script>
