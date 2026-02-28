<template>
  <div>
    <Head>
      <Title>Kategorie B - Auto Fahrschule Zürich</Title>
      <Meta name="description" content="Kategorie B Auto Ausbildung beim Driving Team Zürich. Vollständige Fahrausbildung von der Theorie bis zur bestandenen Prüfung." />
      <Meta name="keywords" content="Kategorie B, Auto, Fahrschule, Zürich" />
      <Link rel="canonical" href="https://drivingteam.ch/kategorie-b/" />
    </Head>
    
    <div class="min-h-screen bg-white">
      <section class="bg-gradient-to-r from-blue-600 to-blue-700 py-16 px-4 md:px-8">
        <div class="max-w-4xl mx-auto text-white text-center">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">Kategorie B - Auto</h1>
          <p class="text-xl mb-6">Deine Auto Fahrausbildung beim Driving Team</p>
          <a href="/booking?category=auto" class="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
            Jetzt anmelden
          </a>
        </div>
      </section>

      <section class="max-w-4xl mx-auto py-16 px-4">
        <h2 class="text-3xl font-bold mb-6">Kategorie B - Auto Fahrausbildung</h2>
        <p class="text-lg text-gray-700 mb-6">
          Die Kategorie B ist die häufigste Fahrkategorie für Personenwagen. Mit dieser Lizenz darfst du Autos bis 3,5 Tonnen fahren.
        </p>

        <h3 class="text-2xl font-bold mt-10 mb-4">Anforderungen und Voraussetzungen</h3>
        <ul class="list-disc pl-6 space-y-3 text-gray-700">
          <li>Mindestalter: 18 Jahre</li>
          <li>Schweizer Wohnsitz oder Aufenthaltsbewilligung</li>
          <li>Theoretische und praktische Prüfung erforderlich</li>
          <li>Nothelferkurs und VKU Kurs obligatorisch</li>
        </ul>

        <h3 class="text-2xl font-bold mt-10 mb-4">Ausbildungsprogramm</h3>
        <p class="text-gray-700 mb-4">
          Wir bieten ein umfassendes Ausbildungsprogramm, das alle notwendigen Fähigkeiten für sicheres Autofahren vermittelt.
        </p>

        <h3 class="text-2xl font-bold mt-10 mb-4">Häufig gestellte Fragen</h3>
        <div class="space-y-4">
          <details class="border-b pb-4">
            <summary class="font-bold cursor-pointer">Wieviele Fahrstunden brauche ich?</summary>
            <p class="mt-3 text-gray-700">Das hängt von deinem Lernfortschritt ab. Die meisten Schüler benötigen zwischen 30-50 Fahrstunden.</p>
          </details>
          <details class="border-b pb-4">
            <summary class="font-bold cursor-pointer">Kann ich mit Automatik fahren?</summary>
            <p class="mt-3 text-gray-700">Ja, wir bieten Unterricht auf Automatikautos und Schaltwagen an. Die Wahl liegt bei dir.</p>
          </details>
          <details class="border-b pb-4">
            <summary class="font-bold cursor-pointer">Wie lange dauert die komplette Ausbildung?</summary>
            <p class="mt-3 text-gray-700">Je nach Trainingsfrequenz dauert die Ausbildung typischerweise 2-4 Monate.</p>
          </details>
        </div>

        <div class="mt-12 bg-blue-50 p-8 rounded-lg">
          <a href="/booking?category=auto" class="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition">
            Auto Kurs buchen
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default'
})
</script>
