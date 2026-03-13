<template>
  <div>
    <Head>
      <Title>Fahrschule Schweiz | Auto, Motorrad, Kurse | Driving Team</Title>
      <Meta name="description" content="Fahrschule Driving Team - Auto, Motorrad, LKW, Bus & Kurse. 95% Erfolgsquote, flexible Zeiten, ab CHF 100/Lektion. Jetzt buchen!" />
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

    <h1 class="sr-only">Willkommen bei der Fahrschule Driving Team</h1>

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
              <img src="/images/categories/auto-fahrschule.webp" alt="Auto Fahrschule Zürich - Kategorie B Fahrstunden mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="eager" fetchpriority="high" />
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
              <img src="/images/categories/motorrad-fahrschule.webp" alt="Motorrad Fahrschule Zürich - Kategorie A1, A35kW, A mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/categories/lastwagen-fahrschule.webp" alt="Lastwagen Fahrschule Zürich - Kategorie C1, C, CE mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/categories/taxi-fahrschule.webp" alt="Taxi Fahrschule Zürich - BPT 121 & 122 mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/categories/bus-fahrschule.webp" alt="Bus Fahrschule Zürich - Kategorie D1 & D mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/categories/anhaenger-fahrschule-new.webp" alt="Anhänger Fahrschule Zürich - Kategorie BE mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/categories/motorboot.webp" alt="Motorboot Fahrschule Zürichsee - Kategorie A mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/categories/kontrollfahrt.webp" alt="Kontrollfahrt Zürich - Fahrertest für alle Kategorien mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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

        <!-- Button zu Kursen -->
        <div class="text-center mt-10">
          <a
            href="#kurse"
            class="inline-flex items-center gap-2 bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition shadow-lg text-lg"
          >
            Alle Kurse unserer Fahrschule ↓
          </a>
        </div>
      </div>
    </section>

    <!-- Facts Section -->
    <StatsSection />

    <!-- Courses Section -->
    <section id="kurse" class="py-20 bg-white scroll-mt-20">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="sr-only">Unsere Fahrschule führt folgende Kurse durch</h2>
        
        <!-- Theorie & Grundkurse -->
        <div class="mb-16">
          <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span class="text-3xl">📚</span> Theorie & Grundkurse
          </h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            <!-- Auto Theorie -->
            <a href="/auto-theorie/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <img src="/images/courses/theorie.webp" alt="Auto Theorie" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/courses/nothelfer.webp" alt="Nothelferkurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
            <a href="/motorrad-grundkurs/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-700 group-hover:from-orange-600 group-hover:to-orange-800 transition-all duration-500"></div>
              <img src="/images/courses/motorrad-grundkurs.webp" alt="Motorrad Grundkurs" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
            <a href="/vku-kurse/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.3s">
              <div class="absolute inset-0 bg-gradient-to-br from-green-500 to-green-700 group-hover:from-green-600 group-hover:to-green-800 transition-all duration-500"></div>
              <img src="/images/courses/vku.webp" alt="VKU Kurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/czv-grundkurs.webp" alt="CZV Grundkurs" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/courses/czv-weiterbildung.webp" alt="CZV Weiterbildung" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
            <a href="/wab-kurse/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-700 group-hover:from-teal-600 group-hover:to-teal-800 transition-all duration-500"></div>
              <img src="/images/wab-kurs.webp" alt="WAB Kurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
              <img src="/images/motorrad-weiterbildung.webp" alt="Motorrad-Weiterbildung" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
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
      </div>
    </section>

    <!-- Internal Linking Hubs Section -->
    <section class="section-container py-16 bg-primary-50">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">Schnelle Navigation</h2>
        
        <div class="grid md:grid-cols-2 gap-8">
          <!-- Category Hub -->
          <div class="bg-white rounded-xl p-8 shadow-lg border-t-4 border-primary-600">
            <h3 class="text-2xl font-bold text-primary-600 mb-4">📊 Alle Kategorien vergleichen</h3>
            <p class="text-gray-600 mb-6">
              Unsicher welche Fahrschule zu dir passt? Vergleiche alle 7 Kategorien nach Kosten, Dauer und Anforderungen.
            </p>
            <ul class="space-y-2 mb-6 text-sm text-gray-600">
              <li>✓ Detaillierte Vergleichstabelle</li>
              <li>✓ Kosten & Dauer übersichtlich</li>
              <li>✓ Anforderungen pro Kategorie</li>
            </ul>
            <a href="/fahrschule-kategorien/" class="inline-block bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 transition" aria-label="Zu Fahrschule Kategorien Vergleich">
              Kategorien vergleichen →
            </a>
          </div>

          <!-- Location Hub -->
          <div class="bg-white rounded-xl p-8 shadow-lg border-t-4 border-green-600">
            <h3 class="text-2xl font-bold text-green-600 mb-4">📍 Fahrschule in deiner Nähe</h3>
            <p class="text-gray-600 mb-6">
              Finde unsere 7 Standorte in der Schweiz. Mit Öffnungszeiten, Kategorien und direktem Kontakt.
            </p>
            <ul class="space-y-2 mb-6 text-sm text-gray-600">
              <li>✓ Alle Standorte im Überblick</li>
              <li>✓ Verfügbare Kategorien pro Ort</li>
            </ul>
            <a href="/fahrschule-standorte/" class="inline-block bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition" aria-label="Zu Fahrschule Standorte">
              Standorte ansehen →
            </a>
          </div>
        </div>
      </div>
    </section>

    <ReviewsSection />

    <!-- FAQ Section -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-16">Die häufigsten Fragen & Antworten bezüglich der Fahrschule Driving Team</h2>
      
      <div class="max-w-4xl mx-auto space-y-4">
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieviele Fahrstunden benötige ich?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das ist eine sehr häufig gestellte Frage, die gleichzeitig sehr schwierig zu beantworten ist. Ein Fahrzeug fahren lernen kannst Du mit dem Erlernen einer neuen Sportart, eines neuen Instruments oder einer Fremdsprache vergleichen. Zu Beginn wirst Du die noch völlig unbekannte Sache als sehr schwierig empfinden und das von Dir gesteckte Ziel scheint noch unerreichbar zu sein. Wenn Du das Projekt Fahrprüfung jedoch seriös angehst, sprich die Tipps und Tricks des Fahrlehrers ernst nimmst und probierst umzusetzen, dann wirst Du Dein Ziel in nützlicher Zeit erreichen. Die meisten Auto-Fahrschüler:innen haben bis zur Fahrprüfung zwischen 15-30 Fahrlektionen. Wenn man keine Möglichkeit hat, um privat zu üben, dann bewegen sich die benötigten Fahrstunden in der Regel zwischen 30-50 Stück. </p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich meine Fahrausbildung beschleunigen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das Wichtigste ist sicher….Üben, Üben und nochmals Üben. Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrstunden, sondern zum Beispiel 1 Fahrlektion und 1 Mal privat repetieren oder 2 Fahrlektionen und 2 Mal repetieren. Ganz wichtig beim privat Üben ist, dass Du genau so fährst, wie es Dir Dein Fahrlehrer gezeigt hat. Nur so entwickelst Du Automatismen und fühlst Dich schnell sicherer auf der Strasse. Hast Du keine Möglichkeit um privat zu üben, dann musst Du Dir bewusst sein, dass es wahrscheinlich mehr Fahrstunden benötigt als sonst. Bist du noch innerhalb der 12-Monatigen Lernphase, dann empfehlen wir zu Beginn ca. 5-10 Fahrlektion bei der Fahrschule zu machen und anschliessend regelmässige private Lernfahrten mit parallelen Fahrlektion bei der Fahrschule. Wenn der Prüfungstermin dann näher rückt, macht es Sinn die  Fahrlektionen bei Fahrschule wieder in kürzeren Abständen durchzuführen, damit du so richtig gut vorbereitet bist und die Fahrprüfung beim ersten Mal bestehst.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieso dauert die Fahrstunde des Driving Teams 45 Minuten?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt und analog zu den meisten Schulen angepasst. Je nach Übungsgebiet, Ausbildungsstand des Fahrschülers und anstehendem Thema macht es Sinn eine 1.5 oder gar eine Doppellektion zu vereinbaren, vorallem dann, wenn jemand in der Fahrausbildung schnell vorwärts kommen möchte.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie rechtfertigen sich eure Preise?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke unserer Fahrschule umsetzen. Dies beginnt bei den  Fahrlehrer:innen, die nur langfristig eine seriöse und kundengerechte Arbeit abliefern können, wenn sie am Ende des Monats eine anständige Entlöhnung erhalten, gegen Krankheit und Unfall vollumfänglich versichert sind und eine solide Altersvorsorge auf sicher haben. Ebenso runden bezahlte Ferien, ein machbares Arbeitspensum, eine jährliche Gratifikation und flexible gestaltbare Arbeitszeiten die Work-Life-Balance in unserer Fahrschule ab. Eine weitere wichtige Voraussetzung, um eine professionelle Fahrschule betreiben zu können, ist eine moderne Infrastruktur. Unsere Fahrzeuge, egal ob Auto, Motorrad, Anhänger oder Motorboot, befinden sich stets in einem top gewarteten Zustand und auf dem neuesten Stand der Technik. Auch bei den Unterrichtslokalen sind wir uptodate. Moderne Fernseher, diverse Lernmittel und Whiteboards/ Flipcharts ermöglichen einen unterhaltsamen und lehrreichen Unterricht. Dank diesen optimalen Vorraussetzungen erreichen wir das Wichtigste und das sind zufriedene Kunden, die eine umfangreiche, speditive und praxisorientierte Ausbildung zur sicheren Fahrzeuglenkerin oder zum sicheren Fahrzeuglenker geniessen dürfen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wo bietet Ihr Fahrstunden an?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unsere Lokale befinden sich in Zürich-Altstetten und in Lachen/SZ. Dort finden alle Kurse wie Nothelfer, Theorie und Verkehrskunde statt. Das Tätigkeitsgebiet des Driving Team Zürich erstreckt sich von Baden (Limmattal) bis nach Thalwil und von Bülach bis nach Wettswil/ Bonstetten im Knonaueramt. Bei den Autofahrlektionen können wir nach Möglichkeit flexible Treffpunkte vereinbaren sprich euch nach Möglichkeit entgegen kommen. Bei der Anhänger- und Motorradausbildung beschränkt sich der Treffpunkt auf Zürich-Altstetten. Seit ein paar Jahren geben wir auch im Zürcher Oberland rundum Uster Auto- und Motorradfahrstunden. Beim Driving Team Lachen erstreckt sich das Tätigkeitsgebiet von Hinwil bis nach Schwyz und von Horgen bis nach Ziegelbrücke. Die Treffpunkte für die Autofahrstunden sind ebenfalls flexibel, das heisst wir holen euch, wenn möglich, zu Hause oder bei der Arbeit ab.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Ab welchem Alter kann ich bei eurer Fahrschule starten?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Für 50ccm Motorräder bzw. Roller kannst du dich bereits mit 15 Jahren anmelden. Der Nothelferkurs kannst du bereits vorher besuchen und 1 Monat vor deinem 15 Geburtstag kannst du das Lernfahrgesuch einreichen. Ab 16 Jahren darfst du dann bereits 125ccm fahren. Lernfahrten fürs Auto sind dann ab dem 17 Geburtstag erlaubt. Dafür brauchst allerdings einen Lernfahrausweis für die Kategorie B, den du wiederum separat per Lernfahrgesuch bestellen musst.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieviel kostet ungefähr die Fahrausbildung bis zur Auto Prüfung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die Gesamtkosten der Fahrausbildung bis zur Autoprüfung ist sehr unterschiedlich und hauptsächlich abhängig von der Anzahl der benötigten Auto Fahrstunden. Wenn man mit 15 Lektionen rechnet kommt man inkl. allen Kursen und Gebühren des Strassenverkehrsamtes auf ca. 2250.- und wenn man von 30 Lektionen ausgeht ergeben die Gesamtkosten ca. 3530.-.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Soll ich Fahrstunden mit einem geschalteten oder automatischen Fahrzeug nehmen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Das muss grundsätzlich jeder für sich entscheiden. Rechtlich gesehen ist es egal, mit was ihr die Prüfung ablegt, ihr dürft nach bestandener Prüfung so oder so beides fahren. Natürlich ist es so, wenn ihr noch nie mit einem geschalteten Fahrzeug gefahren seid, es doch sehr schwierig und auch gefährlich wäre, wenn ihr es das erste Mal alleine probieren würdet. In einer Notfallsituation oder in gewissen Ländern wäre es daher sehr sinnvoll, wenn ihr mindestens schon einmal ein paar Fahrlektionen in einem geschalteten Fahrzeug gehabt hättet. Ihr könnt diese direkt zu Beginn der Fahrausbildung absolvieren und dann anschliessend auf Automatik wechseln oder ihr beginnt gleich auf Automatik und meldet euch erst nach bestandener Fahrprüfung für geschaltete Fahrlektionen an.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was sind die Voraussetzungen, um private Lernfahrten durchführen zu dürfen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <div class="text-gray-600 mt-4">
            <p>Private Lernfahrten werden häufig unterschätzt. Daher empfehlen wir ganz klar die ersten Fahrversuche bei einer Fahrschule durchzuführen. So können wichtige Automatismen geschult werden, die ihr dann privat repetieren könnt. Ganz wichtig für die privaten Lernfahrten sind ebenfalls folgende Punkte:</p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
              <li>die Begleitperson muss im Besitz eines unbeschränkt gültigen Führerausweises der entsprechender Kategorie oder höher und in nüchternem (0,0 Promille) und fahrfähigem Zustand sein.</li>
              <li>beim Auto kommt dann noch dazu: Begleitperson muss mindestens 23 Jahre alt sein und die Fahrprüfung vor mindestens 3 Jahren bestanden haben.</li>
              <li>die Handbremse muss für die Begleitperson gut erreichbar und dosierbar sein und während der Fahrt auch Wirkung haben (trotz drücken des Gaspedals des Lernfahrers/der Lernfahrerin).</li>
            </ul>
          </div>        
          </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was ist die Admin- und Versicherungspauschale?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Diese Pauschale wird einmalig für die ganze Fahrausbildung verrechnet. Sie beinhaltet einerseits die Aufwände ausserhalb der Fahrlektionen, wie zum Beispiel die Anmeldung zur Führerprüfung. Andererseits benötigt ein Fahrschulfahrzeug eine spezielle Vollkaskoversicherung, welche jegliche Fahrzeuglenker:innen abdecken.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Was haben eure Fahrlehrer:innen für eine Ausbildung?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unsere Fahrlehrer:Innen haben alle eine vollumfängliche und intensive Ausbildung zum Fahrlehrer:In mit eidgenössischem Fachausweis absolviert. Für weitere Fahrzeugkategorien haben dann die jeweiligen Ausbildner noch Zusatzausbildungen in den betroffenen Bereichen genossen. Jedes Jahr müssen unsere Fahrlehrer:Innen mindestens einen Weiterbildungstag absolvieren und teamintern kommt noch eine weitere Weiterbildungseinheit dazu. Denn auch innerhalb des Driving Teams lernen wir jeden Tag von einander.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Warum sind eure Verkehrskundekurse so teuer?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unsere Verkehrskundekurse sind im oberen Preissegment, weil wir auch in diesem Bereich sehr bemüht sind zu den besten Fahrschulen zu gehören und euch einen möglichst grossen Nutzen für die Fahrstunden zu gewährleisten. Ihr erhält diverse für den Strassenverkehr wichtigen Unterlagen und es werden viele praxisnahe Themen diskutiert, angeschaut und geübt. Eines der Ziele ist ganz klar, dass Ihr durch den Besuch unseres Verkehrskundekurses neu erlerntes Wissen direkt in den Fahrstunden umsetzen könnt und somit auch am Ende weniger Fahrstunde benötigt. Das heisst, die Kosten des Verkehrskundekurses sind gut investiert, vorallem geht es am Schluss immer um eine sichere Fahrweise und dass wir keine Unfälle verursachen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich eure Fahrlektionen und Kurse bezahlen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wir sind Freunde des Online-Payments. Das heisst du kannst alle unsere Fahrlektionen und Kurse direkt online bezahlen. Möchtest du lieber bar bezahlen, ist das natürlich auch möglich. Für Firmen erstellen wir natürlich auch Rechnungen.</p>
        </details>
      </div>

      <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-8 text-center mt-12">
        <p class="text-lg text-gray-900 mb-4">Weitere Fragen? Schreibe uns!</p>
        <a href="mailto:info@drivingteam.ch" class="btn-primary">
          E-Mail schreiben
        </a>
      </div>
    </section>

    <PriceSection />
    <AusbildungsthemenSection />
    <GutscheinSection />
    <StandorteSection />
    <WarumSection />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: '{"@context":"https://schema.org","@type":"Organization","name":"Driving Team","url":"https://drivingteam.ch","logo":"https://drivingteam.ch/logo.webp","description":"Professionelle Fahrschule in der Schweiz - Auto, Motorrad, Lastwagen, Bus, Taxi, Anhänger, Motorboot Fahrstunden mit erfahrenen Fahrlehrern","contactPoint":{"@type":"ContactPoint","contactType":"Customer Service","telephone":"+41-44-431-0033","email":"info@drivingteam.ch"},"address":{"@type":"PostalAddress","streetAddress":"Gewerbestrasse 10","addressLocality":"Zürich","postalCode":"8000","addressCountry":"CH"},"sameAs":["https://www.instagram.com/fahrschule_driving_team_zurich/","https://www.instagram.com/fahrschule_drivingteam_lachen","https://www.facebook.com/drivingteam","https://www.facebook.com/drivingteamlachen/","https://www.youtube.com/channel/UC5nqMUHvHym4xW-ro1aX90Q","https://www.tiktok.com/@drivingteam.ch"]}' },
  { type: 'application/ld+json', innerHTML: '{"@context":"https://schema.org","@type":"LocalBusiness","name":"Driving Team Zürich","image":"https://drivingteam.ch/images/categories/auto-fahrschule.webp","description":"Professionelle Fahrschule Zürich - Fahrstunden für Auto, Motorrad, Lastwagen, Bus, Taxi, Anhänger & Motorboot","url":"https://drivingteam.ch/","telephone":"+41-44-431-0033","priceRange":"CHF 100-150","address":{"@type":"PostalAddress","streetAddress":"Gewerbestrasse 10","addressLocality":"Zürich","postalCode":"8000","addressCountry":"CH"},"areaServed":["Zürich","Lachen","Uster","St. Gallen","Dietikon","Aargau","Reichenburg"],"serviceType":["Auto Fahrschule","Motorrad Fahrschule","Lastwagen Fahrschule","Bus Fahrschule","Taxi Fahrschule","Anhänger Fahrschule","Motorboot Fahrschule"],"openingHoursSpecification":{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"opens":"08:00","closes":"18:00"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"150"}}' },
]
useHead({ script: jsonLdScripts })

// Homepage - exactly matching old drivingteam.ch structure
</script>
