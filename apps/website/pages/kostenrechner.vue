<template>
  <div>
    <Head>
      <Title>Kostenrechner Fahrschule | Driving Team</Title>
      <Meta name="description" content="Berechne deine Fahrstunden-Kosten in 3 Schritten. Auto, Motorrad, Lastwagen, Motorboot und mehr. Unverbindliche Kostenschätzung der Fahrschule Driving Team." />
      <Meta property="og:title" content="Kostenrechner – Was kostet meine Fahrausbildung?" />
      <Meta property="og:description" content="Berechne jetzt schnell und einfach deine Fahrschul-Kosten. Kategorie wählen, Fahrstunden eingeben, fertig." />
      <Meta property="og:url" content="https://drivingteam.ch/kostenrechner/" />
      <Link rel="canonical" href="https://drivingteam.ch/kostenrechner/" />
      <Meta name="robots" content="index, follow" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 md:py-24 text-center">
      <div class="section-container">
        <p class="text-4xl mb-4">💰</p>
        <h1 class="heading-lg text-white mb-4">Kostenrechner</h1>
        <p class="text-xl text-primary-100 max-w-2xl mx-auto">Berechne in 3 Schritten, was deine Fahrausbildung ungefähr kosten wird.</p>
      </div>
    </section>

    <!-- Calculator (auto-opens on load) -->
    <section class="section-container py-16 flex justify-center">
      <div class="text-center space-y-6">
        <PriceCalculator :auto-open="true" />
        <p class="text-sm text-gray-500 max-w-md mx-auto">
          Die Kalkulation öffnet sich automatisch. Du kannst sie auch jederzeit über den Button starten.
        </p>
      </div>
    </section>

    <!-- Info section -->
    <section class="bg-gray-50 py-16">
      <div class="section-container max-w-4xl mx-auto">
        <h2 class="heading-md text-center mb-10">Was ist in den Kosten enthalten?</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <p class="text-3xl mb-3">🚗</p>
            <h3 class="font-bold mb-2">Fahrstunden</h3>
            <p class="text-sm text-gray-600">Kosten pro Lektion multipliziert mit der Anzahl Fahrstunden.</p>
          </div>
          <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <p class="text-3xl mb-3">🛡️</p>
            <h3 class="font-bold mb-2">Fahrschulpauschale</h3>
            <p class="text-sm text-gray-600">Einmalige Verwaltungs- und Versicherungspauschale der Fahrschule.</p>
          </div>
          <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100 text-center">
            <p class="text-3xl mb-3">🏛️</p>
            <h3 class="font-bold mb-2">Externe Kosten</h3>
            <p class="text-sm text-gray-600">Gebühren des Strassenverkehrsamts, Theorieprüfung, VKU, Nothelfer etc.</p>
          </div>
        </div>
        <p class="text-center text-xs text-gray-400 mt-8">
          ⚠️ Alle Angaben sind unverbindlich. Die tatsächlichen Kosten können je nach individuellem Lernfortschritt variieren.
        </p>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16 text-center">
      <div class="section-container">
        <h2 class="heading-md text-white mb-4">Bereit loszulegen?</h2>
        <p class="text-primary-100 mb-8 text-lg">Buche jetzt deine erste Fahrstunde – ganz einfach online.</p>
        <a
          href="https://simy.ch/booking/availability/driving-team"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg"
        >
          Jetzt Termin buchen →
        </a>
      </div>
    </section>
  </div>
</template>
