<template>
  <div>
    <Head>
      <Title>Preise | Driving Team Zürich</Title>
      <Meta name="description" content="Fahrschule Preise - Transparente & faire Preisgestaltung. Keine versteckten Gebühren. Auto, Motorrad, Taxi & Lastwagen Fahrschule." />
      <Link rel="canonical" href="https://drivingteam.ch/preise/" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Transparente & faire Preise</h1>
        <p class="text-xl text-blue-100 mb-8">Keine versteckten Gebühren. Was du siehst, ist was du bezahlst.</p>
        <button @click="goToBooking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
          Kostenlos Angebot anfordern
        </button>
      </div>
    </section>

    <!-- Pricing Table -->
    <section class="section-container">
      <h2 class="heading-md mb-12 text-center">Unsere Kategorien & Preise</h2>
      
      <div class="grid md:grid-cols-2 gap-8 mb-16">
        <div v-for="cat in categories" :key="cat.slug" class="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
          <div class="bg-blue-50 p-6 border-b-2 border-blue-200">
            <p class="text-4xl mb-2">{{ cat.icon }}</p>
            <h3 class="heading-sm">{{ cat.name }}</h3>
            <p class="text-gray-600 text-sm mt-2">{{ cat.description }}</p>
          </div>
          <div class="p-6">
            <div class="space-y-3 mb-6">
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-gray-700">45-Min. Fahrstunde</span>
                <span class="font-bold text-lg">CHF 85–95</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-gray-700">Theoriekurs</span>
                <span class="font-bold text-lg">CHF 200–300</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-gray-700">Prüfungsvorbereitung</span>
                <span class="font-bold text-lg">CHF 150–250</span>
              </div>
              <div class="flex justify-between items-center py-2">
                <span class="text-gray-700 font-semibold">Admin-Pauschale</span>
                <span class="font-bold text-lg text-blue-600">CHF 300</span>
              </div>
            </div>
            <button @click="goToBooking" class="btn-primary w-full">
              Mehr Info
            </button>
          </div>
        </div>
      </div>

      <!-- Important Info -->
      <div class="max-w-3xl mx-auto bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-12">
        <h3 class="heading-sm mb-4">Wichtige Informationen</h3>
        <ul class="space-y-3 text-gray-900">
          <li class="flex gap-3">
            <span class="text-blue-600 font-bold">✓</span>
            <span><strong>Transparente Preise:</strong> Keine versteckten Gebühren oder Überraschungen</span>
          </li>
          <li class="flex gap-3">
            <span class="text-blue-600 font-bold">✓</span>
            <span><strong>Admin-Pauschale:</strong> Einmalig CHF 300 für die ganze Fahrausbildung</span>
          </li>
          <li class="flex gap-3">
            <span class="text-blue-600 font-bold">✓</span>
            <span><strong>Individuelle Angebote:</strong> Preise können je nach Voraussetzungen variieren</span>
          </li>
          <li class="flex gap-3">
            <span class="text-blue-600 font-bold">✓</span>
            <span><strong>Ratenzahlung:</strong> Flexible Zahlungsoptionen möglich</span>
          </li>
        </ul>
      </div>

      <!-- FAQ -->
      <h2 class="heading-md mb-8 text-center">Preis-FAQ</h2>
      <div class="max-w-3xl mx-auto space-y-4 mb-12">
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich bezahlen?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wir akzeptieren EC-Karten, Kreditkarten, Banküberweisungen und Barzahlungen. Die Rechnungen werden per E-Mail versendet und können über dein Mobile Banking bezahlt werden.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was kostet die gesamte Fahrausbildung bis zur Prüfung?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Gesamtkosten hängen von der Anzahl der benötigten Fahrstunden ab. Mit durchschnittlich 15-20 Fahrstunden à CHF 90 + CHF 300 Admin-Pauschale ergibt sich ein Gesamtbudget von CHF 1.650–2.100. Kontaktiere uns für ein individuelles Angebot.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Brauche ich extra Fahrstunden wenn ich durchfalle?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wir bieten Nachholstunden zu reduzierten Preisen an. Allerdings bestehen unsere Fahrschüler die Prüfung in der Regel beim ersten Versuch dank unserer gründlichen Vorbereitung.</p>
        </details>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-blue-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Möchtest du wissen, wieviel deine Ausbildung kostet?</h2>
        <p class="text-xl text-blue-100 mb-8">Kontaktiere uns – wir erstellen dir ein unverbindliches Angebot!</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button @click="goToBooking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
            Kostenlos anfragen
          </button>
          <a href="tel:+41444310033" class="btn-secondary border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg">
            📞 Jetzt anrufen
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { categories } from '~/data'

const goToBooking = () => {
  window.location.href = '/booking'
}
</script>
