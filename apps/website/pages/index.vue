<template>
  <div>
    <Head>
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
    </Head>

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
              <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 group-hover:from-blue-600 group-hover:to-blue-800 transition-all duration-500"></div>
              <img src="/images/categories/auto-fahrschule.webp" alt="Auto Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Auto</h3>
                  <p class="text-blue-100 font-semibold">Kategorie B</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Auto Führerschein Klasse B. Professionelle Fahrerausbildung für alle Altersgruppen in Zürich.</p>
                </div>
              </div>
            </a>

            <!-- Motorrad -->
            <a href="/motorrad-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.1s">
              <div class="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 group-hover:from-red-600 group-hover:to-red-800 transition-all duration-500"></div>
              <img src="/images/categories/motorrad-fahrschule.webp" alt="Motorrad Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
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
              <img src="/images/categories/lastwagen-fahrschule.webp" alt="Lastwagen Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
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
              <img src="/images/categories/taxi-fahrschule.webp" alt="Taxi Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
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
              <img src="/images/categories/bus-fahrschule.webp" alt="Bus Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
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
              <img src="/images/categories/anhaenger-fahrschule-new.webp" alt="Anhänger Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
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
              <img src="/images/categories/motorboot.webp" alt="Motorboot Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
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
              <div class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 group-hover:from-indigo-600 group-hover:to-indigo-800 transition-all duration-500"></div>
              <img src="/images/categories/kontrollfahrt.webp" alt="Kontrollfahrt" class="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-all duration-500" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Kontrollfahrt</h3>
                  <p class="text-indigo-100 font-semibold">Alle Kategorien</p>
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
            <div class="mb-4 text-6xl font-black text-blue-400 group-hover:scale-125 transition-transform duration-500">20+</div>
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
              <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 group-hover:from-blue-600 group-hover:to-blue-800 transition-all duration-500"></div>
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
              <div class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 group-hover:from-indigo-600 group-hover:to-indigo-800 transition-all duration-500"></div>
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

    <!-- Testimonials Section -->
    <section class="bg-gray-50 py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-16">Das sagen unsere Kunden</h2>
        
        <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div class="bg-white rounded-lg p-8 shadow-sm border-l-4 border-blue-600">
            <p class="text-gray-700 mb-4 italic">
              "Ich habe dank Keni meine Anhängerprüfung erfolgreich bestanden. Er hat sich viel Zeit für mich genommen und mir die Manöver anschaulich erklärt. Zudem hat er mir viele hilfreiche Hinweise gegeben."
            </p>
            <p class="font-semibold text-gray-900">⭐⭐⭐⭐⭐</p>
          </div>

          <div class="bg-white rounded-lg p-8 shadow-sm border-l-4 border-blue-600">
            <p class="text-gray-700 mb-4 italic">
              "Eine sehr gute Fahrschule und ein cooles Team. Sehr empfehlenswert! Pascal ist ein sehr kompetenter und humorvoller Fahrlehrer. Er hat mich gut auf die Motorrad-Prüfung vorbereitet."
            </p>
            <p class="font-semibold text-gray-900">⭐⭐⭐⭐⭐</p>
          </div>

          <div class="bg-white rounded-lg p-8 shadow-sm border-l-4 border-blue-600">
            <p class="text-gray-700 mb-4 italic">
              "Sehr gute Fahrschule! Mein Fahrlehrer war Rijad, und ich hatte stets eine ausgezeichnete Zeit während meiner Fahrstunden. Rijad gab mir immer präzise und hilfreiche Tipps."
            </p>
            <p class="font-semibold text-gray-900">⭐⭐⭐⭐⭐</p>
          </div>

          <div class="bg-white rounded-lg p-8 shadow-sm border-l-4 border-blue-600">
            <p class="text-gray-700 mb-4 italic">
              "Das Driving Team Zürich ist eine moderne, tolle, sehr kompetente Fahrschule. Die Fahrlehrer sind sehr nett und geduldig. Das Lokal ist gut zu erreichen und schön eingerichtet."
            </p>
            <p class="font-semibold text-gray-900">⭐⭐⭐⭐⭐</p>
          </div>

          <div class="bg-white rounded-lg p-8 shadow-sm border-l-4 border-blue-600">
            <p class="text-gray-700 mb-4 italic">
              "Sehr gute Fahrschule! Ich hatte mit Keni Fahrstunden, welcher diese lustig und spannend gestaltete. Dadurch konnte ich immer positiv denken und nahm es nicht so streng. Durch ihn konnte ich mich super entwickeln!"
            </p>
            <p class="font-semibold text-gray-900">⭐⭐⭐⭐⭐</p>
          </div>

          <div class="bg-white rounded-lg p-8 shadow-sm border-l-4 border-blue-600">
            <p class="text-gray-700 mb-4 italic">
              "Super Fahrschule!! Ich hatte meine Fahrstunden mit Keni. Er hat mich für die praktische Fahrprüfung sehr gut vorbereitet, die ich dann an meinem 18. Geburtstag bestanden habe. TOLL! Hat sehr viel Spaß gemacht."
            </p>
            <p class="font-semibold text-gray-900">⭐⭐⭐⭐⭐</p>
          </div>

          <div class="bg-white rounded-lg p-8 shadow-sm border-l-4 border-blue-600">
            <p class="text-gray-700 mb-4 italic">
              "Die Fahrschule war ausgezeichnet, und mein Fahrlehrer Vito war äusserst hilfreich bei meiner Vorbereitung auf die Fahrprüfung. Ich bin ihm sehr dankbar für seine Unterstützung."
            </p>
            <p class="font-semibold text-gray-900">⭐⭐⭐⭐⭐</p>
          </div>
        </div>
      </div>
    </section>

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

      <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center mt-12">
        <p class="text-lg text-gray-900 mb-4">Weitere Fragen?</p>
        <a href="tel:+41444310033" class="btn-primary">
          📞 +41 44 431 00 33
        </a>
      </div>
    </section>

    <!-- Gift Voucher Section -->
    <section class="relative py-24 overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800">
      <!-- Decorative background elements -->
      <div class="absolute inset-0 opacity-20">
        <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div class="section-container relative z-10">
        <div class="max-w-4xl mx-auto">
          <!-- Header -->
          <div class="text-center mb-16">
            <div class="inline-block mb-4">
              <span class="text-6xl">🎁</span>
            </div>
            <h2 class="text-4xl md:text-5xl font-black text-white mb-4">Jetzt Gutschein bestellen</h2>
            <p class="text-xl md:text-2xl text-blue-100 font-semibold">Schenke Sicherheit und bestelle jetzt einen Gutschein!</p>
          </div>

          <!-- Main Card -->
          <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <!-- Card Header with accent -->
            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-8">
              <p class="text-white text-lg font-semibold text-center">
                Möchtest du jemandem Sicherheit schenken?
              </p>
            </div>

            <!-- Card Content -->
            <div class="px-8 md:px-12 py-12">
              <p class="text-gray-700 text-lg mb-8 leading-relaxed">
                Dann schreibe uns eine E-Mail und der Gutschein für Fahrstunden wird schon bald bei dir sein! Die Rechnung wird separat per E-Mail verschickt.
              </p>

              <div class="bg-blue-50 rounded-xl p-8 mb-8 border-l-4 border-blue-600">
                <p class="text-gray-900 font-bold mb-6 text-lg">
                  Folgende Punkte müssen in deiner E-Mail mindestens vorhanden sein:
                </p>
                
                <ul class="space-y-4">
                  <li class="flex items-start gap-4 group">
                    <span class="text-blue-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Vorname und Nachname des Gutscheinempfängers</span>
                  </li>
                  <li class="flex items-start gap-4 group">
                    <span class="text-blue-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Anzahl der gewünschten Fahrstunden</span>
                  </li>
                  <li class="flex items-start gap-4 group">
                    <span class="text-blue-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Kategorie (Auto, Motorrad, etc.)</span>
                  </li>
                  <li class="flex items-start gap-4 group">
                    <span class="text-blue-600 font-bold text-2xl flex-shrink-0">✓</span>
                    <span class="text-gray-700 text-lg pt-1">Deine Kontaktdaten für Rückfragen</span>
                  </li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div class="text-center">
                <a href="mailto:info@drivingteam.ch?subject=Gutschein%20bestellen" class="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-10 py-4 rounded-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
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
        
        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          <!-- Individual Lessons -->
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Einzellektion</h3>
            <p class="text-gray-600 mb-6">Kategorie B à 45 Minuten</p>
            <div class="mb-6">
              <span class="text-4xl font-black text-blue-600">CHF 95</span>
              <span class="text-gray-600 ml-2">pro Lektion</span>
            </div>
            <ul class="space-y-3 text-gray-700">
              <li class="flex items-start gap-2">
                <span class="text-blue-600 font-bold">✓</span>
                <span>Effiziente Fahrausbildung</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-600 font-bold">✓</span>
                <span>Freundliche Fahrlehrer</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-600 font-bold">✓</span>
                <span>Online buchbar & zahlbar</span>
              </li>
            </ul>
            <p class="text-sm text-gray-600 mt-6 pt-6 border-t border-blue-200">
              <strong>exkl. Versicherungspauschale:</strong> CHF 120.- (einmalig)<br>
              <strong>exkl. WarmUp + Prüfungsfahrt:</strong> CHF 285.-
            </p>
          </div>

          <!-- Package -->
          <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-indigo-400">
            <div class="mb-4">
              <span class="inline-block bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold">EMPFOHLEN</span>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Paket</h3>
            <p class="text-gray-600 mb-6">10er Lektionen Paket</p>
            <div class="mb-6">
              <span class="text-4xl font-black text-indigo-600">CHF 900</span>
              <span class="text-gray-600 ml-2">10 Lektionen</span>
            </div>
            <ul class="space-y-3 text-gray-700">
              <li class="flex items-start gap-2">
                <span class="text-indigo-600 font-bold">✓</span>
                <span>10% Rabatt</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-indigo-600 font-bold">✓</span>
                <span>Flexible Nutzung</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-indigo-600 font-bold">✓</span>
                <span>Beste Prüfungsvorbereitung</span>
              </li>
            </ul>
            <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="mt-8 w-full block text-center bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition">
              Jetzt Paket buchen
            </a>
          </div>

          <!-- All Categories -->
          <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Alle Kategorien</h3>
            <p class="text-gray-600 mb-6">Auto, Motorrad, Taxi & mehr</p>
            <div class="mb-6">
              <span class="text-xl font-black text-green-600">Individuelle</span>
              <span class="text-gray-600 block">Preisgestaltung</span>
            </div>
            <ul class="space-y-3 text-gray-700">
              <li class="flex items-start gap-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>Motorrad, Anhänger, Bus</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>Lastwagen & Motorboot</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-green-600 font-bold">✓</span>
                <span>Jetzt Angebot anfordern</span>
              </li>
            </ul>
            <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="mt-8 w-full block text-center bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
              Kategorie wählen
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Curriculum Section -->
    <section class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Fahrschule Themen - Unser Curriculum</h2>
        <p class="text-center text-gray-600 text-lg mb-12 max-w-2xl mx-auto">In unserer Fahrschule in Zürich werden folgende Themen systematisch angeschaut und bis zur Prüfungsreife geübt:</p>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Vorschulung -->
          <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">🚗</span> Vorschulung
            </h3>
            <ul class="space-y-2 text-gray-700 text-sm">
              <li>• Vorbereitung im Stand</li>
              <li>• Blick- und Lenktechnik</li>
              <li>• Gas, Bremsen, Schaltung</li>
              <li>• Blicksystematik</li>
              <li>• Armaturen & Fahrzeugsicherung</li>
            </ul>
          </div>

          <!-- Grundschulung -->
          <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">📍</span> Grundschulung
            </h3>
            <ul class="space-y-2 text-gray-700 text-sm">
              <li>• Berganfahren</li>
              <li>• Einspuren & Abbiegen</li>
              <li>• Mehrfachblick</li>
              <li>• Kreisverkehr</li>
              <li>• Lichtsignale & Lückenbenützung</li>
            </ul>
          </div>

          <!-- Hauptschulung -->
          <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">🛣️</span> Hauptschulung
            </h3>
            <ul class="space-y-2 text-gray-700 text-sm">
              <li>• Rechtsvortritt & Stop/Kein Vortritt</li>
              <li>• Bus & Tram</li>
              <li>• Bergstrassen</li>
              <li>• Stadtverkehr</li>
              <li>• Komplexe Verkehrssituationen</li>
            </ul>
          </div>

          <!-- Perfektionsschulung & Manöver -->
          <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">⭐</span> Perfektion & Manöver
            </h3>
            <ul class="space-y-2 text-gray-700 text-sm">
              <li>• Autobahn & Wegweiser</li>
              <li>• Selbständiges Fahren</li>
              <li>• Parkieren & Wenden</li>
              <li>• Schnelle & sichere Bremsung</li>
              <li>• Prüfungsvorbereitung</li>
            </ul>
          </div>
        </div>

        <div class="text-center mt-12">
          <p class="text-gray-600 mb-6">Unsere Fahrlehrer folgen einem methodisch und didaktischem Lehrplan für effiziente Fahrausbildung</p>
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary">
            Jetzt Fahrstunden buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Locations Section -->
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Unsere Standorte</h2>
        <p class="text-center text-gray-600 text-lg mb-12">Fahrschule Driving Team - Fahrstunden in deiner Region</p>
        
        <div class="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          <!-- Zürich -->
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Zürich</h3>
            <p class="text-sm text-gray-600 mb-4">Zürich-Altstetten & Umgebung</p>
            <p class="text-xs text-gray-500">Baden, Limmattal, Bülach, Knonaueramt, Uster Oberland</p>
            <a href="/fahrschule-zuerich/" class="text-blue-600 font-semibold text-sm mt-4 inline-block hover:text-blue-800">Mehr erfahren →</a>
          </div>

          <!-- Lachen -->
          <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Lachen</h3>
            <p class="text-sm text-gray-600 mb-4">Lachen/SZ & Umgebung</p>
            <p class="text-xs text-gray-500">Hinwil, Schwyz, Horgen, Ziegelbrücke</p>
            <a href="/fahrschule-lachen/" class="text-green-600 font-semibold text-sm mt-4 inline-block hover:text-green-800">Mehr erfahren →</a>
          </div>

          <!-- Uster -->
          <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Uster</h3>
            <p class="text-sm text-gray-600 mb-4">Zürcher Oberland</p>
            <p class="text-xs text-gray-500">Auto & Motorrad Fahrstunden</p>
            <a href="/fahrschule-uster/" class="text-purple-600 font-semibold text-sm mt-4 inline-block hover:text-purple-800">Mehr erfahren →</a>
          </div>

          <!-- St.Gallen -->
          <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule St.Gallen</h3>
            <p class="text-sm text-gray-600 mb-4">Ostschweiz</p>
            <p class="text-xs text-gray-500">Alle Kategorien verfügbar</p>
            <a href="/fahrschule-st-gallen/" class="text-red-600 font-semibold text-sm mt-4 inline-block hover:text-red-800">Mehr erfahren →</a>
          </div>

          <!-- Dietikon -->
          <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Dietikon</h3>
            <p class="text-sm text-gray-600 mb-4">Limmattal</p>
            <p class="text-xs text-gray-500">Zentral gelegen & flexibel</p>
            <a href="/fahrschule-dietikon/" class="text-yellow-600 font-semibold text-sm mt-4 inline-block hover:text-yellow-800">Mehr erfahren →</a>
          </div>

          <!-- Aargau -->
          <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Aargau</h3>
            <p class="text-sm text-gray-600 mb-4">Kanton Aargau</p>
            <p class="text-xs text-gray-500">Professionelle Ausbildung</p>
            <a href="/fahrschule-aargau/" class="text-orange-600 font-semibold text-sm mt-4 inline-block hover:text-orange-800">Mehr erfahren →</a>
          </div>

          <!-- Reichenburg -->
          <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Fahrschule Reichenburg</h3>
            <p class="text-sm text-gray-600 mb-4">Kanton Schwyz</p>
            <p class="text-xs text-gray-500">Alle Fahrzeugkategorien</p>
            <a href="/fahrschule-reichenburg/" class="text-indigo-600 font-semibold text-sm mt-4 inline-block hover:text-indigo-800">Mehr erfahren →</a>
          </div>

          <!-- Kontakt -->
          <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <h3 class="text-lg font-bold text-white mb-3">Kontakt</h3>
            <div class="space-y-3 text-sm">
              <p class="text-gray-300">
                <strong>Telefon:</strong><br>
                <a href="tel:+41444310033" class="text-blue-300 hover:text-blue-100">+41 44 431 00 33</a>
              </p>
              <p class="text-gray-300">
                <strong>Email:</strong><br>
                <a href="mailto:info@drivingteam.ch" class="text-blue-300 hover:text-blue-100">info@drivingteam.ch</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Us Section -->
    <section class="bg-gray-50 py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-16">Warum die Fahrschule Driving Team?</h2>
        
        <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div>
            <h3 class="heading-sm mb-4">🚀 Coole Fahrschule</h3>
            <p class="text-gray-700 mb-4">Wenn Du junge, motivierte und unkomplizierte Fahrlehrer suchst, dann wirst Du in unserer Fahrschule garantiert fündig. Die Fahrschule Driving Team in Zürich steht für eine moderne, effiziente und zielgerichtete Fahrausbildung.</p>
          </div>

          <div>
            <h3 class="heading-sm mb-4">🌍 Fahrschule zu Land und Wasser</h3>
            <p class="text-gray-700 mb-4">Egal ob Du die Auto-, Motorrad-, Anhänger-, Taxi-, Motorboot- oder Lastwagen-Prüfung machen möchtest, mit unserer Fahrschule bestehst Du Deine Fahrprüfung garantiert.</p>
          </div>

          <div>
            <h3 class="heading-sm mb-4">✅ Fahrschule von A bis Z</h3>
            <p class="text-gray-700 mb-4">Wir bieten Dir die ganze Fahrausbildung vom Nothelferkurs über Theoriestunden, Verkehrskunde und Grundkurse bis hin zu praktischen Fahrstunden und bestandener Fahrprüfung.</p>
          </div>

          <div>
            <h3 class="heading-sm mb-4">🛡️ Ihre Sicherheit ist unser Antrieb</h3>
            <p class="text-gray-700 mb-4">Wir legen höchsten Wert auf Sicherheit und Professionalität in jedem Aspekt unserer Fahrschule.</p>
          </div>
        </div>

        <div class="text-center mt-12">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary text-lg">
            Jetzt unverbindliches Angebot anfordern
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Homepage - exactly matching old drivingteam.ch structure
</script>
