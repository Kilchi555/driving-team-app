<template>
  <div>
    <Head>
      <Title>Fahrschule St.Gallen | Fahrstunden in St.Gallen</Title>
      <Meta name="description" content="Fahrschule St.Gallen - Auto, Motorrad und weitere Fahrstunden in St.Gallen." />
      <Meta name="keywords" content="Fahrschule St.Gallen, Fahrstunden St.Gallen" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-stgallen/" />
    </Head>
    
    <div class="min-h-screen bg-white">
      <section class="bg-gradient-to-r from-blue-600 to-blue-700 py-16 px-4 md:px-8">
        <div class="max-w-4xl mx-auto text-white text-center">
          <h1 class="text-4xl md:text-5xl font-bold mb-4">Fahrschule St.Gallen</h1>
          <p class="text-xl mb-6">Fahrstunden in St.Gallen und Region</p>
          <a href="/booking" class="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
            Jetzt anmelden
          </a>
        </div>
      </section>

      <section class="max-w-4xl mx-auto py-16 px-4">
        <h2 class="text-3xl font-bold mb-6">Fahrschule St.Gallen</h2>
        <p class="text-lg text-gray-700 mb-6">
          Professionelle Fahrstunden in St.Gallen und Umgebung mit erfahrenen Fahrlehrern.
        </p>

        <h3 class="text-2xl font-bold mt-10 mb-4">Angebote</h3>
        <ul class="list-disc pl-6 space-y-3 text-gray-700">
          <li>Auto Fahrstunden</li>
          <li>Motorrad Fahrstunden</li>
          <li>Alle Fahrkategorien</li>
        </ul>

        <div class="mt-12 bg-blue-50 p-8 rounded-lg">
          <h3 class="text-2xl font-bold mb-4">Kontakt</h3>
          <p class="text-gray-700 mb-4">
            Telefon: <a href="tel:+41444310033" class="text-blue-600 font-bold">+41 44 431 00 33</a>
          </p>
          <a href="/booking" class="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition">
            Fahrstunden buchen
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
