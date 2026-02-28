<template>
  <div>
    <Head>
      <Title>Preise | Driving Team Fahrschule Zürich</Title>
      <Meta name="description" content="Transparente Fahrschule Preise - Auto, Motorrad, Taxi & Lastwagen Fahrausbildung. Keine versteckten Gebühren, faire Preisgestaltung." />
      <Link rel="canonical" href="https://drivingteam.ch/preise/" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Transparente Preise</h1>
        <p class="text-xl text-blue-100 max-w-3xl mx-auto">Faire Preisgestaltung ohne versteckte Gebühren. Alle Preise sind in CHF und nachvollziehbar.</p>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-16">Fahrschule Preise nach Kategorie</h2>

      <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
        <!-- Auto -->
        <div class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg transition">
          <h3 class="heading-sm mb-6 text-blue-600">🚗 Auto (Kategorie B)</h3>
          <ul class="space-y-3 text-gray-700 mb-8">
            <li class="flex justify-between">
              <span>Fahrstunde (45 min)</span>
              <span class="font-bold">CHF 80–90</span>
            </li>
            <li class="flex justify-between">
              <span>10er Pass</span>
              <span class="font-bold">CHF 750–850</span>
            </li>
            <li class="flex justify-between">
              <span>Admin & Versicherung</span>
              <span class="font-bold">CHF 200</span>
            </li>
            <li class="flex justify-between border-t pt-3">
              <span>Durchschnitt Gesamt</span>
              <span class="font-bold text-lg">CHF 3500–4500</span>
            </li>
          </ul>
          <a href="/booking?category=auto" class="btn-primary w-full text-center">Termin buchen</a>
        </div>

        <!-- Motorrad -->
        <div class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg transition">
          <h3 class="heading-sm mb-6 text-blue-600">🏍️ Motorrad (A/A2/AM)</h3>
          <ul class="space-y-3 text-gray-700 mb-8">
            <li class="flex justify-between">
              <span>Fahrstunde (45 min)</span>
              <span class="font-bold">CHF 85–95</span>
            </li>
            <li class="flex justify-between">
              <span>Grundkurs (4 Tage)</span>
              <span class="font-bold">CHF 600–750</span>
            </li>
            <li class="flex justify-between">
              <span>Admin & Versicherung</span>
              <span class="font-bold">CHF 250</span>
            </li>
            <li class="flex justify-between border-t pt-3">
              <span>Durchschnitt Gesamt</span>
              <span class="font-bold text-lg">CHF 2500–3500</span>
            </li>
          </ul>
          <a href="/booking?category=motorrad" class="btn-primary w-full text-center">Termin buchen</a>
        </div>

        <!-- Taxi -->
        <div class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg transition">
          <h3 class="heading-sm mb-6 text-blue-600">🚕 Taxi (BPT)</h3>
          <ul class="space-y-3 text-gray-700 mb-8">
            <li class="flex justify-between">
              <span>BPT Schulung</span>
              <span class="font-bold">CHF 1500–2000</span>
            </li>
            <li class="flex justify-between">
              <span>Fahrstunden (pro Stunde)</span>
              <span class="font-bold">CHF 90–100</span>
            </li>
            <li class="flex justify-between">
              <span>Prüfungsvorbereitung</span>
              <span class="font-bold">CHF 200–400</span>
            </li>
            <li class="flex justify-between border-t pt-3">
              <span>Durchschnitt Gesamt</span>
              <span class="font-bold text-lg">CHF 3000–4500</span>
            </li>
          </ul>
          <a href="/booking?category=taxi" class="btn-primary w-full text-center">Termin buchen</a>
        </div>

        <!-- Lastwagen -->
        <div class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg transition">
          <h3 class="heading-sm mb-6 text-blue-600">🚚 Lastwagen (C/C1)</h3>
          <ul class="space-y-3 text-gray-700 mb-8">
            <li class="flex justify-between">
              <span>CZV Grundkurs</span>
              <span class="font-bold">CHF 1200–1600</span>
            </li>
            <li class="flex justify-between">
              <span>Fahrstunden (pro Stunde)</span>
              <span class="font-bold">CHF 95–110</span>
            </li>
            <li class="flex justify-between">
              <span>Admin & Gebühren</span>
              <span class="font-bold">CHF 300</span>
            </li>
            <li class="flex justify-between border-t pt-3">
              <span>Durchschnitt Gesamt</span>
              <span class="font-bold text-lg">CHF 4000–6000</span>
            </li>
          </ul>
          <a href="/booking?category=lastwagen" class="btn-primary w-full text-center">Termin buchen</a>
        </div>
      </div>

      <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 max-w-4xl mx-auto">
        <h3 class="heading-sm mb-4">💡 Wichtige Hinweise zu den Preisen</h3>
        <ul class="space-y-3 text-gray-700">
          <li>• Alle Preise sind in CHF (Schweizer Franken)</li>
          <li>• Die Kosten variieren je nach Anzahl der benötigten Fahrstunden</li>
          <li>• Kurse (Nothelferkurse, VKU, Motorrad Grundkurse) sind separat</li>
          <li>• Wir bieten flexible Zahlungspläne an</li>
          <li>• Kontaktiere uns für ein persönliches Angebot</li>
        </ul>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-blue-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Kostenloser Kostenvoranschlag</h2>
        <p class="text-xl text-blue-100 mb-8">Kontaktiere uns für ein unverbindliches Angebot!</p>
        <a href="tel:+41444310033" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
          📞 +41 44 431 00 33
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Preise page
</script>
