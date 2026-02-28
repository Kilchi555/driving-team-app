<template>
  <div>
    <Head>
      <Title>Kategorie A - Motorrad Fahrschule Zürich</Title>
      <Meta name="description" content="Kategorie A Motorrad Ausbildung beim Driving Team. Alles von der Theorie bis zur bestandenen Fahrprüfung." />
      <Meta name="keywords" content="Kategorie A, Motorrad, Fahrschule, Zürich" />
      <Link rel="canonical" href="https://drivingteam.ch/kategorie-a/" />
    </Head>
    
    <div class="min-h-screen bg-white">
      <section class="bg-gradient-to-r from-red-600 to-red-700 py-16 px-4 md:px-8">
        <div class="max-w-4xl mx-auto text-white text-center">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">Kategorie A - Motorrad</h1>
          <p class="text-xl mb-6">Deine Motorrad Fahrausbildung beim Driving Team</p>
          <a href="/booking?category=motorrad" class="inline-block bg-white text-red-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
            Jetzt anmelden
          </a>
        </div>
      </section>

      <section class="max-w-4xl mx-auto py-16 px-4">
        <h2 class="text-3xl font-bold mb-6">Kategorie A - Motorrad Fahrausbildung</h2>
        <p class="text-lg text-gray-700 mb-6">
          Die Kategorie A ist die höchste Motorrad Fahrkategorie. Mit dieser Kategorie darfst du unbegrenzt starke Motorräder fahren.
        </p>

        <h3 class="text-2xl font-bold mt-10 mb-4">Anforderungen und Voraussetzungen</h3>
        <ul class="list-disc pl-6 space-y-3 text-gray-700">
          <li>Mindestalter: 24 Jahre (oder 20 Jahre mit 2 Jahren A2 Erfahrung)</li>
          <li>Schweizer Wohnsitz</li>
          <li>Gültige Ausweisdokumentation</li>
          <li>Theoretische und praktische Prüfung</li>
        </ul>

        <h3 class="text-2xl font-bold mt-10 mb-4">Ausbildungsinhalte</h3>
        <p class="text-gray-700 mb-4">
          Unsere Motorrad Ausbildung für Kategorie A ist umfassend und praxisorientiert. Du lernst alles, was du für sicheres Fahren brauchst.
        </p>

        <h3 class="text-2xl font-bold mt-10 mb-4">Häufig gestellte Fragen</h3>
        <div class="space-y-4">
          <details class="border-b pb-4">
            <summary class="font-bold cursor-pointer">Wie viele Fahrstunden brauche ich?</summary>
            <p class="mt-3 text-gray-700">Das hängt von deinen Vorkenntnissen ab. Im Durchschnitt empfehlen wir 30-50 Fahrstunden.</p>
          </details>
          <details class="border-b pb-4">
            <summary class="font-bold cursor-pointer">Kann ich die Prüfung nach dem Kurs ablegen?</summary>
            <p class="mt-3 text-gray-700">Ja, nach Abschluss der Ausbildung und bestandener theoretischer Prüfung kannst du die praktische Prüfung ablegen.</p>
          </details>
          <details class="border-b pb-4">
            <summary class="font-bold cursor-pointer">Kann ich auf größeren Motorrädern trainieren?</summary>
            <p class="mt-3 text-gray-700">Ja, wir haben verschiedene Motorräder mit unterschiedlichen Motorleistungen zur Verfügung.</p>
          </details>
        </div>

        <div class="mt-12 bg-red-50 p-8 rounded-lg">
          <a href="/booking?category=motorrad" class="inline-block bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition">
            Motorrad Kurs buchen
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
