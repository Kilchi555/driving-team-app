<template>
  <div>
    <Head>
      <Title>Kontakt | Driving Team - Fahrschule Zürich</Title>
      <Meta name="description" content="Kontaktiere Driving Team - Fahrschule in Zürich. Telefon, Email, Öffnungszeiten und Standorte." />
      <Link rel="canonical" href="https://drivingteam.ch/contact" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Kontaktiere uns</h1>
        <p class="text-xl text-blue-100">Wir sind für dich da und beantworten gerne deine Fragen!</p>
      </div>
    </section>

    <!-- Contact Info -->
    <section class="section-container">
      <div class="grid md:grid-cols-3 gap-8 mb-16">
        <!-- Phone -->
        <div class="bg-white border-2 border-blue-200 rounded-lg p-8 text-center hover:shadow-lg transition">
          <p class="text-5xl mb-4">📞</p>
          <h3 class="heading-sm mb-4">Telefon</h3>
          <p class="text-gray-600 mb-4">Ruf uns an – wir freuen uns auf dich!</p>
          <a href="tel:+41444310033" class="text-blue-600 font-bold text-xl hover:underline">
            +41 44 431 00 33
          </a>
        </div>

        <!-- Email -->
        <div class="bg-white border-2 border-blue-200 rounded-lg p-8 text-center hover:shadow-lg transition">
          <p class="text-5xl mb-4">📧</p>
          <h3 class="heading-sm mb-4">Email</h3>
          <p class="text-gray-600 mb-4">Schreib uns eine E-Mail</p>
          <a href="mailto:info@drivingteam.ch" class="text-blue-600 font-bold text-xl hover:underline">
            info@drivingteam.ch
          </a>
        </div>

        <!-- Visit -->
        <div class="bg-white border-2 border-blue-200 rounded-lg p-8 text-center hover:shadow-lg transition">
          <p class="text-5xl mb-4">📍</p>
          <h3 class="heading-sm mb-4">Besuche uns</h3>
          <p class="text-gray-600 mb-4">Komm vorbei!</p>
          <p class="text-blue-600 font-bold">
            Bahnhofstrasse 145<br>
            8048 Zürich
          </p>
        </div>
      </div>

      <!-- Hours -->
      <div class="max-w-2xl mx-auto bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-16">
        <h2 class="heading-sm mb-6">Öffnungszeiten</h2>
        <div class="grid grid-cols-2 gap-6">
          <div>
            <p class="font-semibold text-gray-900">Zürich</p>
            <p class="text-gray-700">Mo, Mi, Do: 09:00 - 12:00 / 13:00 - 17:00</p>
            <p class="text-gray-700">Di & Fr: 09:00 - 13:30</p>
          </div>
          <div>
            <p class="font-semibold text-gray-900">Lachen/SZ</p>
            <p class="text-gray-700">Mo - Fr: 08:30 - 12:00 / 13:30 - 17:00</p>
            <p class="text-gray-700">Sa: Nach Vereinbarung</p>
          </div>
        </div>
      </div>

      <!-- Locations -->
      <h2 class="heading-md mb-12 text-center">Unsere Standorte</h2>
      <div class="grid md:grid-cols-2 gap-8 mb-16">
        <div v-for="location in locations" :key="location.city" class="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg transition">
          <p class="text-4xl mb-4">{{ location.emoji }}</p>
          <h3 class="font-bold text-xl mb-2">{{ location.city }}</h3>
          <p class="text-gray-700 mb-2">{{ location.address }}</p>
          <p class="text-gray-600 text-sm mb-4">{{ location.description }}</p>
          <a href="tel:+41444310033" class="text-blue-600 font-semibold hover:underline">
            Kontakt →
          </a>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-12 text-center">Häufige Fragen</h2>
        <div class="max-w-3xl mx-auto space-y-4">
          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Wie kann ich einen Termin buchen?
              <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Klicke auf "Jetzt Termin buchen" und füll das Anmeldeformular aus. Du erhältst dann eine Bestätigung per Email.</p>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Was sind eure Geschäftsstunden?
              <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">In Zürich sind wir Mo, Mi, Do 09:00-12:00 und 13:00-17:00 Uhr da, Di & Fr 09:00-13:30. In Lachen Mo-Fr 08:30-12:00 und 13:30-17:00 Uhr.</p>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Bietet ihr auch Abendkurse an?
              <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Ja, wir bieten Fahrstunden bis 19:00 Uhr an. Kontaktiere uns für Abendtermine!</p>
          </details>

          <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Kann ich auch am Wochenende fahren?
              <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Wochenendtermine sind auf Anfrage möglich. Kontaktiere uns per Telefon oder Email!</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section-container">
      <div class="bg-blue-600 text-white rounded-lg p-12 text-center">
        <h2 class="heading-md mb-6 text-white">Bereit zu starten?</h2>
        <p class="text-xl text-blue-100 mb-8">Buche jetzt deinen ersten Termin oder kontaktiere uns mit Fragen!</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/booking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
            📅 Termin buchen
          </a>
          <a href="tel:+41444310033" class="btn-secondary border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg">
            📞 Jetzt anrufen
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const locations = [
  {
    city: 'Zürich (Altstetten)',
    emoji: '🏢',
    address: 'Bahnhofstrasse 145, 8048 Zürich',
    description: 'Hauptstandort mit modernen Fahrzeugen und geräumigen Unterrichtsräumen'
  },
  {
    city: 'Lachen/SZ',
    emoji: '🏘️',
    address: 'Kantonsstrasse 12, 8853 Lachen',
    description: 'Zweiter Standort mit Schwerpunkt Motorrad und Auto'
  },
  {
    city: 'Uster',
    emoji: '🚗',
    address: 'Nach Absprache',
    description: 'Fahrstunden in der Region Uster möglich'
  },
  {
    city: 'St. Gallen',
    emoji: '🏞️',
    address: 'Nach Absprache',
    description: 'Fahrstunden in der Region St. Gallen'
  }
]
</script>
