<template>
  <div>
    <Head>
      <Title>Über uns | Driving Team - Fahrschule Zürich</Title>
      <Meta name="description" content="Lerne unser Team von erfahrenen Fahrlehrern kennen. Moderne Fahrschule mit Leidenschaft für Fahrausbildung." />
      <Link rel="canonical" href="https://drivingteam.ch/about" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Das ist das Driving Team</h1>
        <p class="text-xl text-blue-100">Erfahrene, leidenschaftliche und freundliche Fahrlehrer für deine sichere Ausbildung</p>
      </div>
    </section>

    <!-- Mission -->
    <section class="section-container">
      <div class="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div>
          <h2 class="heading-md mb-6">Unsere Mission</h2>
          <p class="text-lg text-gray-700 mb-4">
            Wir wurden gegründet, um das traditionelle Bild des Fahrschulunterrichts zu verändern. Wir wissen, dass Lernen am besten funktioniert, wenn es mit Begeisterung geschieht.
          </p>
          <p class="text-lg text-gray-700 mb-4">
            Deshalb haben wir eine Fahrschule gegründet, die moderne, effiziente und zielgerichtete Fahrausbildung mit einem persönlichen Touch verbindet.
          </p>
          <p class="text-lg text-gray-700">
            Jeder unserer Fahrlehrer ist nicht nur ein Experte im Strassenverkehr, sondern auch ein motivierter Coach, der dich auf deinem Weg zum Führerschein begleitet.
          </p>
        </div>
        <div class="bg-blue-50 rounded-lg p-8 border-2 border-blue-200">
          <h3 class="heading-sm mb-6">Unsere Werte</h3>
          <ul class="space-y-4">
            <li class="flex gap-3">
              <span class="text-2xl">🎯</span>
              <div>
                <p class="font-bold">Fokussiert</p>
                <p class="text-sm text-gray-600">Zielgerichtete Vorbereitung auf deine Prüfung</p>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="text-2xl">😊</span>
              <div>
                <p class="font-bold">Freundlich</p>
                <p class="text-sm text-gray-600">Persönlicher Umgang und individuelle Betreuung</p>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="text-2xl">⚡</span>
              <div>
                <p class="font-bold">Modern</p>
                <p class="text-sm text-gray-600">Aktuelle Fahrzeuge und Unterrichtsmethoden</p>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="text-2xl">🏆</span>
              <div>
                <p class="font-bold">Professionell</p>
                <p class="text-sm text-gray-600">Eidgenössisch ausgebildete Fahrlehrer</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        <div class="bg-blue-50 rounded-lg p-6 text-center border-2 border-blue-200">
          <p class="heading-md text-blue-600">47+</p>
          <p class="text-gray-700">Bewertungen</p>
          <p class="text-yellow-500">⭐⭐⭐⭐⭐</p>
        </div>
        <div class="bg-blue-50 rounded-lg p-6 text-center border-2 border-blue-200">
          <p class="heading-md text-blue-600">100%</p>
          <p class="text-gray-700">Erfolgsquote</p>
          <p class="text-green-600 font-bold">✓</p>
        </div>
        <div class="bg-blue-50 rounded-lg p-6 text-center border-2 border-blue-200">
          <p class="heading-md text-blue-600">7</p>
          <p class="text-gray-700">Kategorien</p>
          <p class="text-blue-600 font-bold">Auto bis Motorboot</p>
        </div>
        <div class="bg-blue-50 rounded-lg p-6 text-center border-2 border-blue-200">
          <p class="heading-md text-blue-600">10+</p>
          <p class="text-gray-700">Standorte</p>
          <p class="text-blue-600 font-bold">In der Schweiz</p>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-12 text-center">Unser Team</h2>
        <div class="grid md:grid-cols-3 gap-8 mb-12">
          <div v-for="member in team" :key="member.name" class="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition">
            <div class="bg-gradient-to-br from-blue-400 to-blue-600 h-40 flex items-center justify-center text-6xl">
              {{ member.emoji }}
            </div>
            <div class="p-6">
              <h3 class="font-bold text-lg mb-1">{{ member.name }}</h3>
              <p class="text-blue-600 font-semibold text-sm mb-3">{{ member.role }}</p>
              <p class="text-gray-600 text-sm mb-3">{{ member.bio }}</p>
              <div class="flex gap-2">
                <span v-for="cat in member.categories" :key="cat" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {{ cat }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section-container">
      <div class="bg-blue-600 text-white rounded-lg p-12 text-center">
        <h2 class="heading-md mb-6 text-white">Lerne dich jetzt von unserem Team kennen!</h2>
        <p class="text-xl text-blue-100 mb-8">Buche deine erste Fahrstunde und lerne einen unserer Fahrlehrer persönlich kennen.</p>
        <a href="/booking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
          Jetzt Termin buchen
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const team = [
  {
    name: 'Pascal',
    role: 'Gründer & Fahrlehrer',
    emoji: '👨‍🏫',
    bio: 'Mit über 15 Jahren Erfahrung ist Pascal der Gründer des Driving Team. Spezialisiert auf Auto und Motorrad.',
    categories: ['Auto', 'Motorrad', 'Anhänger']
  },
  {
    name: 'Keni',
    role: 'Senior Fahrlehrer',
    emoji: '🏍️',
    bio: 'Motorrad-Spezialist mit Leidenschaft für Fahrausbildung. Bekannt für seine Geduld und professionelle Methoden.',
    categories: ['Motorrad', 'Auto', 'Anhänger']
  },
  {
    name: 'Rijad',
    role: 'Fahrlehrer',
    emoji: '🚗',
    bio: 'Freundlicher und motivierter Fahrlehrer. Spezialisiert auf Anfänger und intensive Prüfungsvorbereitung.',
    categories: ['Auto', 'Anhänger']
  },
  {
    name: 'Vito',
    role: 'Fahrlehrer',
    emoji: '🚚',
    bio: 'Erfahrener Fahrlehrer für alle Kategorien. Besonders hilfreich bei schwierigen Manövern.',
    categories: ['Auto', 'Lastwagen', 'Taxi']
  }
]
</script>
