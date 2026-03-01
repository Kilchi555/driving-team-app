<template>
  <div>
    <NuxtHead>
      <Title>Fahrschule St.Gallen | Auto Fahrstunden | Driving Team</Title>
      <Meta name="description" content="Fahrschule St.Gallen – Fahrstunden für Auto, Motorrad und mehr. Erfahrene Fahrlehrer, flexible Zeiten. Jetzt anmelden!" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-stgallen/" />
    </NuxtHead>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/stgallen-hero.jpg" alt="Fahrschule St. Gallen" class="absolute inset-0 w-full h-full object-cover opacity-100" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-6">Fahrschule St.Gallen</h1>
          <p class="text-xl text-primary-100 mb-8">Deine Fahrschule in St.Gallen. Melde Dich an und starte deine Fahrausbildung mit dem Driving Team.</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Angebot -->
    <section class="section-container">
      <h2 class="heading-md mb-10 text-center">Dein Fahrschul-Angebot in St.Gallen</h2>
      <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div class="bg-primary-50 rounded-lg p-6 flex items-start gap-3">
          <span class="text-primary-600 text-xl mt-1">✅</span>
          <div><h3 class="font-bold text-gray-900 mb-1">Individuelle Ausbildung</h3><p class="text-gray-600 text-sm">Auf Dich zugeschnittene Fahrstunden, welche Dich zur sicheren Fahrzeuglenkerin bzw. zum sicheren Fahrzeuglenker ausbilden.</p></div>
        </div>
        <div class="bg-primary-50 rounded-lg p-6 flex items-start gap-3">
          <span class="text-primary-600 text-xl mt-1">✅</span>
          <div><h3 class="font-bold text-gray-900 mb-1">Entspanntes Lernen</h3><p class="text-gray-600 text-sm">Angenehme Lernatmosphäre mit erfahrenen Fahrlehrerinnen und Fahrlehrern.</p></div>
        </div>
        <div class="bg-primary-50 rounded-lg p-6 flex items-start gap-3">
          <span class="text-primary-600 text-xl mt-1">✅</span>
          <div><h3 class="font-bold text-gray-900 mb-1">Flexible Treffpunkte</h3><p class="text-gray-600 text-sm">Nach Möglichkeit kommen wir zu Dir – flexible Treffpunkte in der Region St.Gallen.</p></div>
        </div>
        <div class="bg-primary-50 rounded-lg p-6 flex items-start gap-3">
          <span class="text-primary-600 text-xl mt-1">✅</span>
          <div><h3 class="font-bold text-gray-900 mb-1">Alle Kategorien</h3><p class="text-gray-600 text-sm">Auto, Motorrad, Anhänger und mehr – das Driving Team bietet alle Fahrzeugkategorien an.</p></div>
        </div>
      </div>
    </section>

    <!-- Andere Standorte -->
    <section class="bg-gray-50 py-12">
      <div class="section-container relative z-10">
        <h3 class="text-xl font-bold mb-6 text-center text-gray-900">Unsere weiteren Standorte</h3>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="/fahrschule-zuerich" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Zürich</a>
          <a href="/fahrschule-lachen" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Lachen</a>
          <a href="/fahrschule-uster" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Uster</a>
          <a href="/fahrschule-aargau" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Aargau</a>
          <a href="/fahrschule-reichenburg" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Reichenburg</a>
          <a href="/fahrschule-dietikon" class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition">📍 Fahrschule Dietikon</a>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt in St.Gallen starten!</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt Termin buchen</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>
