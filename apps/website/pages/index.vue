<template>
  <div>
    <NuxtHead>
      <Title>Fahrschule Zürich | Deine Driving Team Fahrschule in Zürich - Auto, Motorrad, Taxi</Title>
      <Meta name="description" content="Fahrschule Driving Team Zürich - moderne Fahrausbildung für Auto, Motorrad, Taxi, Lastwagen & Anhänger. Erfahrene Fahrlehrer, flexible Fahrstunden, hohe Prüfungserfolgsquote. Jetzt buchen!" />
      <Meta name="keywords" content="Fahrschule Zürich, Auto Fahrschule Zürich, Motorrad Fahrschule, Taxi Fahrschule, Lastwagen Fahrschule, Führerschein, Fahrausbildung, Fahrstunden Zürich, Prüfungsvorbereitung" />
      <Meta name="author" content="Driving Team" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      
      <!-- Open Graph -->
      <Meta property="og:title" content="Fahrschule Zürich | Driving Team - Auto & Motorrad Fahrschule" />
      <Meta property="og:description" content="Moderne Fahrschule in Zürich für Auto, Motorrad, Taxi & Lastwagen. Professionelle Fahrerausbildung mit erfahrenen Fahrlehrern. Flexible Fahrstunden, hohe Prüfungserfolgsquote." />
      <Meta property="og:image" content="https://drivingteam.ch/og-image.jpg" />
      <Meta property="og:type" content="website" />
      <Meta property="og:locale" content="de_CH" />
      
      <!-- Twitter Card -->
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Fahrschule Zürich | Driving Team" />
      <Meta name="twitter:description" content="Auto, Motorrad, Taxi & Lastwagen Fahrschule in Zürich - professionelle Fahrausbildung mit hoher Prüfungserfolgsquote" />
      
      <!-- Canonical & Language -->
      <Link rel="canonical" href="https://drivingteam.ch/" />
      <Link rel="alternate" hreflang="de" href="https://drivingteam.ch/" />
      <Link rel="alternate" hreflang="de-ch" href="https://drivingteam.ch/" />
    </NuxtHead>

    <!-- Welcome Title -->
    <div class="w-full bg-white py-8 md:py-12 text-center border-b border-gray-200">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900">Herzlich Willkommen bei der Fahrschule Driving Team</h1>
    </div>

    <!-- Immersive Hero Intro Section WITH Categories -->
    <section class="hero-intro-section relative flex flex-col items-center justify-center overflow-hidden bg-white">
      <div class="absolute inset-0 bg-white"></div>

      <div class="relative z-10 w-full flex flex-col items-center justify-center text-center text-gray-900 px-2 md:px-6 py-6">
        <!-- Categories Grid - Integrated into Hero -->
        <div class="w-full max-w-7xl">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8 px-2 md:px-4">
            <!-- Auto -->
            <a href="/auto-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <img src="/images/categories/auto-fahrschule.webp" alt="Auto Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Auto</h3>
                  <p class="text-primary-100 font-semibold">Kategorie B</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Auto Führerschein Klasse B. Professionelle Fahrerausbildung für alle Altersgruppen in Zürich.</p>
                </div>
              </div>
            </a>

            <!-- Motorrad -->
            <a href="/motorrad-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.1s">
              <div class="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 group-hover:from-red-600 group-hover:to-red-800 transition-all duration-500"></div>
              <img src="/images/categories/motorrad-fahrschule.webp" alt="Motorrad Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Motorrad</h3>
                  <p class="text-red-100 font-semibold">Kategorie A1/A35kW/A</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Motorrad Fahrschule für A1, A35kW und A. Sicher fahren auf zwei Rädern mit erfahrenen Fahrlehrern.</p>
                </div>
              </div>
            </a>

            <!-- Lastwagen -->
            <a href="/lastwagen-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-yellow-500 to-yellow-700 group-hover:from-yellow-600 group-hover:to-yellow-800 transition-all duration-500"></div>
              <img src="/images/categories/lastwagen-fahrschule.webp" alt="Lastwagen Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Lastwagen</h3>
                  <p class="text-yellow-100 font-semibold">Kategorie C1/C/CE</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Lastwagen Führerschein C1, C und CE. Professionelle Ausbildung für Lkw-Fahrer in Zürich.</p>
                </div>
              </div>
            </a>

            <!-- Taxi -->
            <a href="/taxi-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.3s">
              <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-700 group-hover:from-purple-600 group-hover:to-purple-800 transition-all duration-500"></div>
              <img src="/images/categories/taxi-fahrschule.webp" alt="Taxi Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Taxi</h3>
                  <p class="text-purple-100 font-semibold">Kategorie BPT</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Taxi Führerschein BPT. Zertifizierte Ausbildung für professionelle Taxifahrer.</p>
                </div>
              </div>
            </a>

            <!-- Bus -->
            <a href="/bus-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.4s">
              <div class="absolute inset-0 bg-gradient-to-br from-green-500 to-green-700 group-hover:from-green-600 group-hover:to-green-800 transition-all duration-500"></div>
              <img src="/images/categories/bus-fahrschule.webp" alt="Bus Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Bus</h3>
                  <p class="text-green-100 font-semibold">Kategorie D1/D</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Bus Führerschein D1/D. Fahrausbildung für Busfahrer und Fahrzeuglenker.</p>
                </div>
              </div>
            </a>

            <!-- Anhänger -->
            <a href="/anhaenger-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.5s">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-700 group-hover:from-orange-600 group-hover:to-orange-800 transition-all duration-500"></div>
              <img src="/images/categories/anhaenger-fahrschule-new.webp" alt="Anhänger Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Anhänger</h3>
                  <p class="text-orange-100 font-semibold">Kategorie BE</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Anhänger Führerschein BE. Sichere Ausbildung zum Fahren mit Anhänger in Zürich.</p>
                </div>
              </div>
            </a>

            <!-- Motorboot -->
            <a href="/motorboot/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.6s">
              <div class="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-700 group-hover:from-cyan-600 group-hover:to-cyan-800 transition-all duration-500"></div>
              <img src="/images/categories/motorboot.webp" alt="Motorboot Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Motorboot</h3>
                  <p class="text-cyan-100 font-semibold">Bootführerschein</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Motorboot Führerschein. Sichere Bootsausbildung auf See und Binnengewässer.</p>
                </div>
              </div>
            </a>

            <!-- Kontrollfahrt -->
            <a href="/kontrollfahrt/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.7s">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <img src="/images/categories/kontrollfahrt.webp" alt="Kontrollfahrt" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Kontrollfahrt</h3>
                  <p class="text-primary-100 font-semibold">Alle Kategorien</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Kontrollfahrten für alle Führerschein-Kategorien. Professionelle Vorbereitung auf die Prüfung.</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Facts Section -->
    <section class="bg-gray-900 text-white py-20 md:py-32">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid md:grid-cols-4 gap-8">
          <div class="text-center group">
            <div class="mb-4 text-6xl font-black text-primary-400 group-hover:scale-125 transition-transform duration-500">20+</div>
            <p class="text-gray-300 text-lg">Jahre Erfahrung</p>
          </div>
          <div class="text-center group">
            <div class="mb-4 text-6xl font-black text-green-400 group-hover:scale-125 transition-transform duration-500">8</div>
            <p class="text-gray-300 text-lg">Fahrlehrer & Instruktoren</p>
          </div>
          <div class="text-center group">
            <div class="mb-4 text-6xl font-black text-yellow-400 group-hover:scale-125 transition-transform duration-500">1000+</div>
            <p class="text-gray-300 text-lg">Schüler pro Jahr</p>
          </div>
          <div class="text-center group">
            <div class="mb-4 text-6xl font-black text-red-400 group-hover:scale-125 transition-transform duration-500">4.9 ⭐</div>
            <p class="text-gray-300 text-lg">Google Bewertung</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Courses Section -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">Unsere Fahrschule führt folgende Kurse durch</h2>
        
        <!-- Theorie & Grundkurse -->
        <div class="mb-16">
          <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span class="text-3xl">📚</span> Theorie & Grundkurse
          </h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            <!-- Auto Theorie -->
            <a href="/auto-theorie/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <img src="/images/courses/theorie.png" alt="Auto Theorie" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Auto Theorie</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Professionelle Theoriekurse für die Auto-Führerscheinprüfung in Zürich. Moderne Unterrichtsmethoden für sicheres Fahren.</p>
                </div>
              </div>
            </a>

            <!-- Nothelferkurse -->
            <a href="/nothelferkurs/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.1s">
              <div class="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 group-hover:from-red-600 group-hover:to-red-800 transition-all duration-500"></div>
              <img src="/images/courses/nothelfer.png" alt="Nothelferkurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Nothelferkurse</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Lebensrettende Nothelferkurse für den Führerschein. Zertifiziert und praxisorientiert im Zentrum Zürich.</p>
                </div>
              </div>
            </a>

            <!-- Motorrad Grundkurs -->
            <a href="/motorrad-grundkurs-zuerich/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-700 group-hover:from-orange-600 group-hover:to-orange-800 transition-all duration-500"></div>
              <img src="/images/courses/motorrad-grundkurs.png" alt="Motorrad Grundkurs" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Motorrad Grundkurs</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Fundierter Motorrad Grundkurs für A1, A35kW und A Kategorien. Sicher auf zwei Rädern durchs Zürcher Oberland.</p>
                </div>
              </div>
            </a>

            <!-- VKU Kurse -->
            <a href="/vku-kurs-zuerich/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.3s">
              <div class="absolute inset-0 bg-gradient-to-br from-green-500 to-green-700 group-hover:from-green-600 group-hover:to-green-800 transition-all duration-500"></div>
              <img src="/images/courses/vku.png" alt="VKU Kurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">VKU Kurse</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Verkehrskundeunterricht für sichere Fahrer. Praxisorientierte VKU Kurse in Zürich und Lachen.</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <!-- Weiterbildungen -->
        <div class="mb-12">
          <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span class="text-3xl">🎓</span> Weiterbildungen
          </h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            <!-- CZV Grundkurs -->
            <a href="/czv-grundkurs/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">CZV Grundkurs</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">CZV Grundkurs für Berufskraftfahrer. Fachlich kompetent und zeiteffizient in Zürich-Altstetten.</p>
                </div>
              </div>
            </a>

            <!-- CZV Weiterbildung -->
            <a href="/czv-weiterbildung/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.1s">
              <div class="absolute inset-0 bg-gradient-to-br from-pink-500 to-pink-700 group-hover:from-pink-600 group-hover:to-pink-800 transition-all duration-500"></div>
              <img src="/images/courses/czv-weiterbildung.png" alt="CZV Weiterbildung" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">CZV Weiterbildung</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Kontinuierliche CZV Weiterbildung für Fahrzeuglenker. Professionelle Schulung im Driving Team.</p>
                </div>
              </div>
            </a>

            <!-- WAB Kurse -->
            <a href="/wab-kurse-zuerich/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-700 group-hover:from-teal-600 group-hover:to-teal-800 transition-all duration-500"></div>
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">WAB Kurse</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Weiterbildung Allgemeine Fahrkompetenz (WAB). Expert trainiert in Zürich und Schwyz.</p>
                </div>
              </div>
            </a>

            <!-- Motorrad-Weiterbildung -->
            <a href="/motorrad-weiterbildung/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.3s">
              <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-700 group-hover:from-purple-600 group-hover:to-purple-800 transition-all duration-500"></div>
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Motorrad-Weiterbildung</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Motorrad Weiterbildung für erfahrene Fahrer. Sicherheit und Fahrtechnik auf höchstem Niveau.</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div class="text-center mt-12">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary">
            Kurs oder Fahrstunde buchen
          </a>
        </div>
      </div>
    </section>

    <ReviewsSection />

    <!-- FAQ Section -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-16">Die häufigsten Fragen & Antworten bezüglich der Fahrschule Driving Team</h2>
      
      <div class="max-w-4xl mx-auto space-y-4">
        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieviele Fahrstunden benötige ich?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das ist eine sehr häufig gestellte Frage, die gleichzeitig sehr schwierig zu beantworten ist. Ein Fahrzeug fahren lernen kannst Du mit dem Erlernen einer neuen Sportart, eines neuen Instruments oder einer neuen Sprache vergleichen. Jeder Mensch ist unterschiedlich talentiert und verfügt über unterschiedliche Vorkenntnisse. Durchschnittlich benötigt ein Fahrschüler zwischen 40-60 Fahrstunden bis zur bestandenen Fahrprüfung.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich meine Fahrausbildung beschleunigen?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das Wichtigste ist sicher Üben, Üben und nochmals Üben. Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrstunden, sondern zum Beispiel 1 Fahrlektion und 1 Mal privat repetieren mit einem Bekannten.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieso dauert die Fahrstunde des Driving Teams 45 Minuten?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt und analog zu den meisten Schulen angepasst.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie rechtfertigen sich eure Preise?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke unserer Fahrschule umsetzen. Dies beginnt bei den Fahrlehrern, die nur langfristig eine seriöse und kundengerechte Fahrausbildung gewährleisten können.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wo bietet Ihr Fahrstunden an?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unsere Lokale befinden sich in Zürich-Altstetten und in Lachen/SZ. Das Tätigkeitsgebiet des Driving Team Zürich erstreckt sich von Zürich bis nach Schwyz und Zug.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Ab welchem Alter kann ich bei eurer Fahrschule starten?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Für 50ccm Motorräder bzw. Roller kannst du dich bereits mit 15 Jahren anmelden. Der Nothelferkurs kannst du bereits vorher besuchen und 1 Monat vor deinem 15 Geburtstag kannst du das Lernfahrgesuch einreichen.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieviel kostet ungefähr die Fahrausbildung bis zur Auto Prüfung?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Gesamtkosten der Fahrausbildung bis zur Autoprüfung ist sehr unterschiedlich und hauptsächlich abhängig von der Anzahl der benötigten Auto Fahrstunden. Wenn man mit 15 Lektionen rechnet kommt man auf ca. CHF 4000-5000.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Soll ich Fahrstunden mit einem geschalteten oder automatischen Fahrzeug nehmen?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das muss grundsätzlich jeder für sich entscheiden. Rechtlich gesehen ist es egal, mit was ihr die Prüfung ablegt, ihr dürft nach bestandener Prüfung so oder so beides fahren. Natürlich ist es so, wenn ihr mit einem Automatikgetriebe fahrt, habt ihr dann als Führerscheininhaber die Einschränkung nur Automatic fahren zu dürfen.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was sind die Voraussetzungen, um private Lernfahrten durchführen zu dürfen?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Private Lernfahrten werden häufig unterschätzt. Daher empfehlen wir ganz klar die ersten Fahrversuche bei einer Fahrschule durchzuführen. So können wichtige Automatismen geschult werden.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was ist die Admin- und Versicherungspauschale?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet einerseits die Aufwände ausserhalb der Fahrlektionen, wie zum Beispiel die Anmeldung zur Führerprüfung. Andererseits auch die Versicherung des Fahrzeugs während der Fahrstunden.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was haben eure Fahrlehrer:innen für eine Ausbildung?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unsere Fahrlehrer:Innen haben alle eine vollumfängliche und intensive Ausbildung zum Fahrlehrer:In mit eidgenössischem Fachausweis absolviert. Für weitere Fahrzeugkategorien haben dann die jeweiligen Fahrlehrer:Innen weitere Zusatzausbildungen.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Warum sind eure Verkehrskundekurse so teuer?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unsere Verkehrskundekurse sind im oberen Preissegment, weil wir auch in diesem Bereich sehr bemüht sind zu den besten Fahrschulen zu gehören und euch einen möglichst grossen Nutzen für die Fahrstunden zu bieten.</p>
        </details>

        <details class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich eure Rechnungen auf dem Smartphone bezahlen?
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wir versenden dir die Rechnung per E-Mail mit einer PDF-Datei im Anhang. Öffne diese PDF-Datei, geh dann auf «Teilen» und öffne die PDF-Datei mit deinem Mobile-Banking App. So kannst du unsere Rechnungen direkt via Mobile-Banking zahlen.</p>
        </details>
      </div>

      <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-8 text-center mt-12">
        <p class="text-lg text-gray-900 mb-4">Weitere Fragen?</p>
        <a href="tel:+41444310033" class="btn-primary">
          📞 +41 44 431 00 33
        </a>
      </div>
    </section>

    <!-- Gift Voucher Section -->
    <section class="relative py-24 overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800">
      <!-- Decorative background elements -->
      <div class="absolute inset-0 opacity-20">
        <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div class="section-container relative z-10">
        <div class="max-w-4xl mx-auto">
          <!-- Header -->
          <div class="text-center mb-16">
            <div class="inline-block mb-4">
              <span class="text-6xl">🎁</span>
            </div>
            <h2 class="text-4xl md:text-5xl font-black text-white mb-4">Jetzt Gutschein bestellen</h2>
            <p class="text-xl md:text-2xl text-primary-100 font-semibold">Schenke Sicherheit und bestelle jetzt einen Gutschein!</p>
          </div>

          <!-- Main Card -->
          <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <!-- Card Header with accent -->
            <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-8">
              <p class="text-white text-lg font-semibold text-center">
                Möchtest du jemandem Sicherheit schenken?
              </p>
            </div>

            <!-- Card Content -->
            <div class="px-8 md:px-12 py-12">
              <p class="text-gray-700 text-lg mb-8 leading-relaxed">
                Dann schreibe uns eine E-Mail und der Gutschein für Fahrstunden wird schon bald bei dir sein! Die Rechnung wird separat per E-Mail verschickt.
              </p>

              <div class="bg-primary-50 rounded-xl p-8 mb-8 border-l-4 border-primary-600">
                <p class="text-gray-900 font-bold mb-6 text-lg">
                  Folgende Punkte müssen in deiner E-Mail mindestens vorhanden sein:
                </p>
                
                <ul class="space-y-4">
                  <li class="flex items-start gap-4 group">
                    <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Vorname und Nachname des Gutscheinempfängers</span>
                  </li>
                  <li class="flex items-start gap-4 group">
                    <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Anzahl der gewünschten Fahrstunden</span>
                  </li>
                  <li class="flex items-start gap-4 group">
                    <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Kategorie (Auto, Motorrad, etc.)</span>
                  </li>
                  <li class="flex items-start gap-4 group">
                    <span class="text-primary-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Deine Kontaktdaten für Rückfragen</span>
                  </li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div class="text-center">
                <a href="mailto:info@drivingteam.ch?subject=Gutschein%20bestellen" class="inline-flex items-center gap-3 bg-gradient-to-r from-primary-600 to-primary-600 text-white font-bold px-10 py-4 rounded-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <span>📧</span>
                  <span>Jetzt E-Mail schreiben</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

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
        <div class="text-center mb-12">
          <a href="/fahrschule-preise" class="inline-block bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition shadow-lg">
            ➜ Alle Preise & Kategorien anschauen
          </a>
        </div>
      </div>
    </section>
    <CurriculumSection />
    <StandorteSection />
    <WarumSection />
  </div>
</template>

<script setup lang="ts">
// Homepage - exactly matching old drivingteam.ch structure
</script>
