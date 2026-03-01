<template>
  <!-- Prices Section -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">Unsere Preise</h2>

      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-8">
        <!-- Kategorie B - Auto -->
        <div class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
          <h3 class="text-2xl font-bold text-gray-900 mb-4">Einzellektion</h3>
          <p class="text-gray-600 mb-6">Kategorie B à 45 Minuten</p>
          <div class="mb-6">
            <span class="text-4xl font-black text-primary-600">CHF 95</span>
            <span class="text-gray-600 ml-2">pro Lektion</span>
          </div>
          <ul class="space-y-3 text-gray-700">
            <li class="flex items-start gap-2">
              <span class="text-primary-600 font-bold">✓</span>
              <span>Effiziente Fahrausbildung</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-primary-600 font-bold">✓</span>
              <span>Freundliche Fahrlehrer</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-primary-600 font-bold">✓</span>
              <span>Online buchbar & zahlbar</span>
            </li>
          </ul>
          <p class="text-sm text-gray-600 mt-6 pt-6 border-t border-primary-200">
            <strong>exkl. Versicherungspauschale:</strong> CHF 120.- (einmalig)<br>
            <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 285.-
          </p>
        </div>

        <!-- Kategorie A - Motorrad -->
        <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
          <h3 class="text-2xl font-bold text-gray-900 mb-4">Motorrad Lektion</h3>
          <p class="text-gray-600 mb-6">Kategorie A à 45 Minuten</p>
          <div class="mb-6">
            <span class="text-4xl font-black text-red-600">CHF 95</span>
            <span class="text-gray-600 ml-2">pro Lektion</span>
          </div>
          <ul class="space-y-3 text-gray-700">
            <li class="flex items-start gap-2">
              <span class="text-red-600 font-bold">✓</span>
              <span>Professionelle Ausbildung</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-600 font-bold">✓</span>
              <span>Erfahrene Motorrad-Lehrer</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-600 font-bold">✓</span>
              <span>Sicheres Fahren auf zwei Rädern</span>
            </li>
          </ul>
          <p class="text-sm text-gray-600 mt-6 pt-6 border-t border-red-200">
            <strong>exkl. Versicherungspauschale:</strong> CHF 0.- (privat versichert)<br>
            <strong>Fahrschul-Motorrad-Miete:</strong> CHF 115.-
          </p>
        </div>

        <!-- Kategorie BE - Anhänger -->
        <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
          <h3 class="text-2xl font-bold text-gray-900 mb-4">Anhänger Lektion</h3>
          <p class="text-gray-600 mb-6">Kategorie BE à 90 Minuten</p>
          <div class="mb-6">
            <span class="text-4xl font-black text-amber-600">CHF 240</span>
            <span class="text-gray-600 ml-2">Doppellektion</span>
          </div>
          <ul class="space-y-3 text-gray-700">
            <li class="flex items-start gap-2">
              <span class="text-amber-600 font-bold">✓</span>
              <span>Empfohlene Doppellektionen</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-amber-600 font-bold">✓</span>
              <span>Spezialisierte Ausbildung</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-amber-600 font-bold">✓</span>
              <span>Sichere Anhängerprüfung</span>
            </li>
          </ul>
          <p class="text-sm text-gray-600 mt-6 pt-6 border-t border-amber-200">
            <strong>exkl. Versicherungspauschale:</strong> CHF 120.- (einmalig)<br>
            <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 360.-
          </p>
        </div>
      </div>

      <!-- Link to Full Price List -->
      <div class="text-center">
        <a href="/fahrschule-preise" class="inline-block bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition shadow-lg">
          ➜ Alle Preise & Kategorien anschauen
        </a>
      </div>
    </div>
  </section>
</template>
