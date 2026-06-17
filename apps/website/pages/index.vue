<template>
  <div>
    <Head>
      <Title>Fahrschule Zürich | Auto, Motorrad, Anhänger & Lastwagen | Driving Team</Title>
      <Meta name="description" content="Fahrschule Zürich – Driving Team. Ab CHF 95.–, 85% Prüfungserfolg, diplom. Fahrlehrer. Auto, Motorrad, Anhänger, Lastwagen, Taxi. Standort Zürich-Altstetten. Jetzt online Termin buchen!" />
      <Meta name="keywords" content="Fahrschule Zürich, Auto Fahrschule Zürich, Fahrstunden Zürich, Fahrlehrer Zürich, Motorrad Fahrschule Zürich, Anhänger Fahrschule Zürich, Lastwagen Fahrschule Zürich, Taxi Fahrschule Zürich, Fahrschule Zürich-Altstetten" />
      <Meta name="author" content="Driving Team" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      
      <!-- Open Graph -->
      <Meta property="og:title" content="Fahrschule Zürich | Driving Team – Auto, Motorrad, Anhänger & mehr" />
      <Meta property="og:description" content="Professionelle Fahrschule in Zürich-Altstetten. Auto, Motorrad, Anhänger, Lastwagen, Taxi, Motorboot. 85% Erfolgsquote, flexible Zeiten, ab CHF 95.–." />
      <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta property="og:image:alt" content="Driving Team Fahrschule Zürich" />
      <Meta property="og:type" content="website" />
      <Meta property="og:locale" content="de_CH" />
      <Meta property="og:url" content="https://drivingteam.ch/" />
      
      <!-- Twitter Card -->
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Fahrschule Zürich | Driving Team – alle Kategorien" />
      <Meta name="twitter:description" content="Auto, Motorrad, Taxi & Lastwagen Fahrschule in Zürich-Altstetten – professionelle Fahrausbildung, 85% Prüfungserfolg, ab CHF 95.–" />
      
      <!-- Canonical & Language -->
      <Link rel="canonical" href="https://drivingteam.ch/" />
      <Meta name="date" :content="new Date().toISOString()" />
      
    </Head>

    <!-- Immersive Hero Intro Section WITH Categories -->
    <section class="hero-intro-section relative flex flex-col items-center justify-center overflow-hidden bg-white">
      <div class="absolute inset-0 bg-white"></div>

      <div class="relative z-10 w-full flex flex-col items-center justify-center text-center text-gray-900 px-2 md:px-6">
        <!-- Hero Headline -->
        <div class="mb-3">
          <h1 class="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-3 mt-6">
            Fahrschule <span class="text-primary-600">Zürich</span>
          </h1>
          <p class="text-sm md:text-base text-gray-500 font-medium mb-4">
            Zürich-Altstetten · alle Kategorien · ab CHF 95.–
          </p>
        </div>
        <!-- Trust Bar + Booking CTA -->
        <div class="flex flex-row items-center justify-center gap-3 mb-6 px-4">
          <a
            href="https://app.simy.ch/booking/availability/driving-team"
            target="_blank"
            rel="noopener noreferrer"
            class="flex-shrink-0 inline-flex items-center gap-2 bg-primary-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-primary-700 active:scale-95 transition shadow-md text-sm"
          >
            Termin buchen
          </a>
          <a
            href="tel:+41444310033"
            class="flex-shrink-0 inline-flex items-center gap-2 bg-white border-2 border-primary-600 text-primary-600 font-bold py-2.5 px-5 rounded-xl hover:bg-primary-50 active:scale-95 transition shadow-md text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.47 11.47 0 00.57 3.58 1 1 0 01-.24 1.01l-2.21 2.2z"/>
            </svg>
            Anrufen
          </a>
        </div>
        <p class="text-sm font-semibold text-gray-500 -mt-3 mb-4">
          „Bestehe deine Fahrprüfung<br>mit uns beim <span class="text-primary-600">1. Versuch!"</span>
        </p>
        <div class="w-full max-w-7xl">
          <h2 class="sr-only">Fahrschule Zürich – alle Führerschein-Kategorien</h2>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8 px-2 md:px-4">
            <!-- Auto -->
            <a href="/auto-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <NuxtImg
                src="/images/categories/auto-fahrschule.webp"
                width="400"
                height="268"
                sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw"
                format="webp"
                quality="75"
                alt="Auto Fahrschule Zürich - Kategorie B Fahrstunden und Prüfungsvorbereitung mit Driving Team in Zürich-Altstetten"
                class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500"
                loading="eager"
                fetchpriority="high"
              />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Auto</h3>
                  <p class="text-white font-semibold">Kategorie B</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Auto Führerausweis Kategorie B. Professionelle Fahrausbildung für alle Altersgruppen in Zürich.</p>
                </div>
              </div>
            </a>

            <!-- Motorrad -->
            <a href="/motorrad-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.1s">
              <div class="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 group-hover:from-red-600 group-hover:to-red-800 transition-all duration-500"></div>
              <NuxtImg src="/images/categories/motorrad-fahrschule.webp" width="360" height="238" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="75" alt="Motorrad Fahrschule Zürich - Kategorie A1, A35kW und A Fahrstunden mit erfahrenen Fahrlehrern" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="eager" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Motorrad</h3>
                  <p class="text-red-100 font-semibold">Kategorie A1/A35kW/A</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Motorrad Fahrschule für die Kategorien A1, A35kW und A. Sicher fahren auf zwei Rädern mit erfahrenen Fahrlehrern.</p>
                </div>
              </div>
            </a>

            <!-- Lastwagen -->
            <a href="/lastwagen-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-yellow-500 to-yellow-700 group-hover:from-yellow-600 group-hover:to-yellow-800 transition-all duration-500"></div>
              <NuxtImg src="/images/categories/lastwagen-fahrschule.webp" width="360" height="235" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Lastwagen Fahrschule Zürich - Kategorie C1, C und CE mit professioneller Ausbildung" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Lastwagen</h3>
                  <p class="text-yellow-100 font-semibold">Kategorie C1/C/CE</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Lastwagen Führerausweis Kategorie C1, C und CE. Professionelle Ausbildung für LKW-Fahrer in Zürich & Lachen.</p>
                </div>
              </div>
            </a>

            <!-- Taxi -->
            <a href="/taxi-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.3s">
              <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-700 group-hover:from-purple-600 group-hover:to-purple-800 transition-all duration-500"></div>
              <NuxtImg src="/images/categories/taxi-fahrschule.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Taxi Fahrschule Zürich - BPT 121 und 122 Ausbildung mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Taxi</h3>
                  <p class="text-purple-100 font-semibold">Kategorie BPT</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Taxi Führerausweis BPT. Zertifizierte Ausbildung für professionelle Taxifahrer in Zürich und Lachen.</p>
                </div>
              </div>
            </a>

            <!-- Bus -->
            <a href="/bus-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.4s">
              <div class="absolute inset-0 bg-gradient-to-br from-green-500 to-green-700 group-hover:from-green-600 group-hover:to-green-800 transition-all duration-500"></div>
              <NuxtImg src="/images/categories/bus-fahrschule.webp" width="360" height="202" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Bus Fahrschule Zürich - Kategorie D1 und D Fahrstunden und Ausbildung" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Bus</h3>
                  <p class="text-green-100 font-semibold">Kategorie D1/D</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Bus Führerausweis D1/D. Fahrausbildung für Busfahrer und Fahrzeuglenker.</p>
                </div>
              </div>
            </a>

            <!-- Anhänger -->
            <a href="/anhaenger-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.5s">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-700 group-hover:from-orange-600 group-hover:to-orange-800 transition-all duration-500"></div>
              <NuxtImg src="/images/categories/anhaenger-fahrschule-new.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Anhänger Fahrschule Zürich - Kategorie BE mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Anhänger</h3>
                  <p class="text-orange-100 font-semibold">Kategorie BE</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Anhänger Führerausweis Kategorie BE. Sichere Ausbildung zum Fahren mit Anhänger in Zürich.</p>
                </div>
              </div>
            </a>

            <!-- Motorboot -->
            <a href="/motorboot-fahrschule/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.6s">
              <div class="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-700 group-hover:from-cyan-600 group-hover:to-cyan-800 transition-all duration-500"></div>
              <NuxtImg src="/images/categories/motorboot.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Motorboot Fahrschule Zürichsee - Kategorie A mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Motorboot</h3>
                  <p class="text-cyan-100 font-semibold">Bootführerschein</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Motorboot Führerschein. Sichere Motorboot-Fahrausbildung auf dem See ab Lachen/SZ.</p>
                </div>
              </div>
            </a>

            <!-- Kontrollfahrt -->
            <a href="/kontrollfahrt/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2" style="animation-delay: 0.7s">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <NuxtImg src="/images/categories/kontrollfahrt.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Kontrollfahrt Zürich - Fahrertest für alle Kategorien mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-8 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 class="font-black text-2xl text-white mb-2">Kontrollfahrt</h3>
                  <p class="text-white font-semibold">Alle Kategorien</p>
                </div>
                <div class="absolute inset-0 p-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Kontrollfahrten für alle Führerausweis-Kategorien. Professionelle Vorbereitung auf die Kontrollfahrt.</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <!-- Button zu Kursen -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <a
            href="#kurse"
            class="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition text-sm mb-4"
          >
            Alle Kurse ansehen ↓
          </a>
        </div>

        <!-- Trust & Category Section -->
        <div class="w-full max-w-xl mx-auto mt-8 pb-10 px-4">

          <!-- Stat Cards -->
          <div class="grid grid-cols-3 gap-2 mb-5">
            <div class="flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-md py-4 px-2">
              <span class="text-2xl font-black text-white leading-none">85%</span>
              <span class="text-white/80 text-[10px] font-medium mt-1.5 text-center leading-tight">Prüfungs&shy;erfolg 1. Versuch</span>
            </div>
            <div class="flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-md py-4 px-2">
              <span class="text-2xl font-black text-white leading-none">2</span>
              <span class="text-white/80 text-[10px] font-medium mt-1.5 text-center leading-tight">Standorte Zürich & Lachen</span>
            </div>
            <div class="flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-md py-4 px-2">
              <span class="text-2xl font-black text-white leading-none">95.–</span>
              <span class="text-white/80 text-[10px] font-medium mt-1.5 text-center leading-tight">ab CHF pro Lektion</span>
            </div>
          </div>

          <!-- Category Chips -->
          <div class="flex flex-wrap justify-center gap-2">
            <a href="/auto-fahrschule/" class="group flex items-center gap-1.5 bg-white border border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-full px-3.5 py-1.5 transition-all duration-200 shadow-sm">
              <span class="text-sm">🚗</span>
              <span class="text-xs font-semibold text-gray-600 group-hover:text-primary-700">Auto</span>
            </a>
            <a href="/motorrad-fahrschule/" class="group flex items-center gap-1.5 bg-white border border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-full px-3.5 py-1.5 transition-all duration-200 shadow-sm">
              <span class="text-sm">🏍️</span>
              <span class="text-xs font-semibold text-gray-600 group-hover:text-primary-700">Motorrad</span>
            </a>
            <a href="/lastwagen-fahrschule/" class="group flex items-center gap-1.5 bg-white border border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-full px-3.5 py-1.5 transition-all duration-200 shadow-sm">
              <span class="text-sm">🚛</span>
              <span class="text-xs font-semibold text-gray-600 group-hover:text-primary-700">Lastwagen</span>
            </a>
            <a href="/anhaenger-fahrschule/" class="group flex items-center gap-1.5 bg-white border border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-full px-3.5 py-1.5 transition-all duration-200 shadow-sm">
              <span class="text-sm">🚐</span>
              <span class="text-xs font-semibold text-gray-600 group-hover:text-primary-700">Anhänger</span>
            </a>
            <a href="/vku-kurse/" class="group flex items-center gap-1.5 bg-white border border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-full px-3.5 py-1.5 transition-all duration-200 shadow-sm">
              <span class="text-sm">📋</span>
              <span class="text-xs font-semibold text-gray-600 group-hover:text-primary-700">VKU</span>
            </a>
            <a href="/nothelferkurs-buchen/driving-team" class="group flex items-center gap-1.5 bg-white border border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-full px-3.5 py-1.5 transition-all duration-200 shadow-sm">
              <span class="text-sm">🚑</span>
              <span class="text-xs font-semibold text-gray-600 group-hover:text-primary-700">Nothelfer</span>
            </a>
          </div>

          <!-- Zürich Coverage Area -->
          <div class="mt-6 text-center">
            <p class="text-xs text-gray-400 leading-relaxed">
              Prüfungsgebiet <strong class="text-gray-600">Albisgütli</strong> · Fahrgebiet
              Altstetten · Wiedikon · Albisrieden · Höngg · Schlieren · Dietikon · Wettswil · Thalwil
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Facts Section -->
    <StatsSection />

    <ReviewsSection category="zuerich" />


    <!-- Courses Section -->
    <section class="py-20 bg-white scroll-mt-20">
      <div class="max-w-7xl mx-auto px-4">
          <div class="mb-16">
          <h2 class="text-2xl md:text-3xl font-bold text-gray-900 max-w-3xl mx-auto mb-6 text-center">
            Fahrschule Zürich – alle Kategorien
          </h2>
          <div class="max-w-3xl mx-auto space-y-6 text-gray-600 text-center">
            <p class="text-base md:text-lg leading-relaxed">
              Driving Team ist <strong>deine Fahrschule in Zürich</strong> – mit Hauptstandort in <strong>Zürich-Altstetten</strong>, direkt beim Bahnhof, gut erreichbar aus dem ganzen Stadtgebiet. Wir bilden in allen Führerschein-Kategorien aus: Auto (Kat. B), Motorrad (A1/A35kW/A), Anhänger (BE), Lastwagen (C1/C/CE), Taxi (BPT) und Bus (D1/D). Zweiter Standort in <a href="/fahrschule-lachen/" class="text-primary-600 hover:underline font-medium">Lachen/SZ</a> mit Auto, Anhänger und Motorboot.
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p class="font-bold text-gray-800">Prüfungsort</p>
                <p class="text-gray-500 text-xs mt-0.5">StVA Albisgütli, Zürich</p>
              </div>
              <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p class="font-bold text-gray-800">Treffpunkt</p>
                <p class="text-gray-500 text-xs mt-0.5">Bahnhof Zürich-Altstetten</p>
              </div>
              <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p class="font-bold text-gray-800">Fahrzeuge</p>
                <p class="text-gray-500 text-xs mt-0.5">Modern & vollversichert</p>
              </div>
              <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p class="font-bold text-gray-800">Sprachen</p>
                <p class="text-gray-500 text-xs mt-0.5">DE · EN · AL</p>
              </div>
            </div>

            <ul class="space-y-3 inline-block text-left mx-auto mt-2">
              <li class="flex items-center gap-3 text-base md:text-lg text-gray-700">
                <span class="text-primary-600 font-bold">✓</span>
                <span>Fahrlehrer mit eidg. Fachausweis – seit 2014</span>
              </li>
              <li class="flex items-center gap-3 text-base md:text-lg text-gray-700">
                <span class="text-primary-600 font-bold">✓</span>
                <span>Flexible Zeiten Mo–Sa, flexible Treffpunkte</span>
              </li>
              <li class="flex items-center gap-3 text-base md:text-lg text-gray-700">
                <span class="text-primary-600 font-bold">✓</span>
                <span>Ab CHF 95.–/Lektion · online buchbar</span>
              </li>
              <li class="flex items-center gap-3 text-base md:text-lg text-gray-700">
                <span class="text-primary-600 font-bold">✓</span>
                <span>4.9 ★ Google Bewertung (368 Rezensionen)</span>
              </li>
            </ul>
            <div class="mt-6">
              <PriceCalculator title="Kostenrechner Fahrausbildung" />
            </div>
          </div>
        </div>
        <h2 class="sr-only">Unsere Fahrschule führt folgende Kurse durch</h2>
        
        <!-- Theorie & Grundkurse -->
        <div  id="kurse" class="mb-16">
          <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span class="text-3xl">📚</span> Theorie & Grundkurse
          </h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            <!-- Auto Theorie -->
            <a href="/auto-theorie/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48">
              <div class="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 group-hover:from-primary-600 group-hover:to-primary-800 transition-all duration-500"></div>
              <NuxtImg src="/images/courses/theorie.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Auto Theorie" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Auto Theorie</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Professionelle Theoriekurse für alle Kategorien in Zürich & Lachen. Moderne Unterrichtsmethoden für sicheres Fahren.</p>
                </div>
              </div>
            </a>

            <!-- Nothelferkurse -->
            <a href="/nothelferkurs/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.1s">
              <div class="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 group-hover:from-red-600 group-hover:to-red-800 transition-all duration-500"></div>
              <NuxtImg src="/images/courses/nothelfer.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Nothelferkurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Nothelferkurse</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Lebensrettende Nothelferkurse für den Führerausweis. Zertifiziert und praxisorientiert in Zürich & Lachen.</p>
                </div>
              </div>
            </a>

            <!-- Motorrad Grundkurs -->
            <a href="/motorrad-grundkurs/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-700 group-hover:from-orange-600 group-hover:to-orange-800 transition-all duration-500"></div>
              <NuxtImg
                src="/images/courses/motorrad-grundkurs.webp"
                width="320"
                height="188"
                sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw"
                format="webp"
                quality="70"
                alt="Motorrad Grundkurs"
                class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500"
                loading="lazy"
              />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Motorrad Grundkurs</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Fundierter Motorrad Grundkurs für A1, A35kW und A Kategorien. Sicher auf zwei Rädern in Zürich & Lachen.</p>
                </div>
              </div>
            </a>

            <!-- VKU Kurse -->
            <a href="/vku-kurse/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.3s">
              <div class="absolute inset-0 bg-gradient-to-br from-green-500 to-green-700 group-hover:from-green-600 group-hover:to-green-800 transition-all duration-500"></div>
              <NuxtImg src="/images/courses/vku.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="VKU Kurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">VKU Kurse</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Verkehrskundeunterricht für sichere Fahrer:innen. Praxisorientierte VKU Kurse in Zürich und Lachen.</p>
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
              <NuxtImg src="/images/czv-grundkurs.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="CZV Grundkurs" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">CZV Grundkurs</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">CZV Grundkurs für Berufsfahrer. Fachlich kompetent und zeiteffizient in Zürich & Lachen.</p>
                </div>
              </div>
            </a>

            <!-- CZV Weiterbildung -->
            <a href="/czv-weiterbildung/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.1s">
              <div class="absolute inset-0 bg-gradient-to-br from-pink-500 to-pink-700 group-hover:from-pink-600 group-hover:to-pink-800 transition-all duration-500"></div>
              <NuxtImg src="/images/courses/czv-weiterbildung.webp" width="360" height="238" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="CZV Weiterbildung" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">CZV Weiterbildung</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Kontinuierliche CZV Weiterbildung für Berufs-Chauffeuren. Professionelle Schulung im Driving Team.</p>
                </div>
              </div>
            </a>

            <!-- WAB Kurse -->
            <a href="/wab-kurse/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.2s">
              <div class="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-700 group-hover:from-teal-600 group-hover:to-teal-800 transition-all duration-500"></div>
              <NuxtImg src="/images/wab-kurs.webp" width="360" height="300" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="WAB Kurse" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">WAB Kurse</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Weiterausbildungskurs nach der Fahrprüfung (WAB). Von den Fahrexperten der Transportschule in Pfäffikon/ZH und Tuggen/SZ durchgeführt.</p>
                </div>
              </div>
            </a>

            <!-- Motorrad-Weiterbildung -->
            <a href="/motorrad-weiterbildung/" class="category-card group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-40 md:h-48" style="animation-delay: 0.3s">
              <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-700 group-hover:from-purple-600 group-hover:to-purple-800 transition-all duration-500"></div>
              <NuxtImg src="/images/motorrad-weiterbildung.webp" width="360" height="239" sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 48vw" format="webp" quality="70" alt="Motorrad-Weiterbildung" class="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500" loading="lazy" />
              <div class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500"></div>
              <div class="relative p-6 h-full flex flex-col justify-center items-center z-10 text-center">
                <div class="opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <h4 class="font-black text-lg md:text-xl text-white">Motorrad-Weiterbildung</h4>
                </div>
                <div class="absolute inset-0 p-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p class="text-white text-sm font-semibold leading-snug">Motorrad Weiterbildung für Anfänger:innen sowie erfahrene Motorradfahrer:innen. Sicherheit und Fahrtechnik auf höchstem Niveau.</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Link zu Lachen Section -->
    <section class="py-12 bg-gray-50 border-t border-gray-200">
      <div class="max-w-5xl mx-auto px-4 text-center">
        <p class="text-lg text-gray-700 mb-6">Unsere Standorte: <b>Zürich-Altstetten</b> und <b>Lachen/SZ</b></p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/fahrstunden-zuerich/" class="inline-flex items-center gap-2 bg-primary-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-700 transition">
            🚗 Fahrstunden Zürich
          </a>
          <a href="/fahrschule-lachen/" class="inline-flex items-center gap-2 bg-white border-2 border-green-700 text-green-700 font-bold py-3 px-8 rounded-lg hover:bg-green-50 transition">
            → Fahrschule Lachen
          </a>
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
              Unsicher welche Kategorie zu dir passt? Vergleiche alle 7 Kategorien nach Kosten, Dauer und Anforderungen.
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
              Finde unsere 8 Standorte in der Schweiz.
            </p>
            <ul class="space-y-2 mb-6 text-sm text-gray-600">
              <li>✓ Alle Standorte im Überblick</li>
              <li>✓ Verfügbare Kategorien pro Ort</li>
            </ul>
            <a href="/fahrschule-standorte/" class="inline-block bg-green-700 text-white px-6 py-2 rounded hover:bg-green-800 transition" aria-label="Zu Fahrschule Standorte">
              Standorte ansehen →
            </a>
          </div>
        </div>
      </div>
    </section>
    <!-- FAQ Section -->
    <section class="section-container py-20">
      <h2 class="text-3xl text-center mb-16">Die häufigsten <b>Fragen & Antworten</b> bezüglich der Fahrschule Driving Team</h2>
      
      <div class="max-w-4xl mx-auto space-y-4">
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wieviele Fahrstunden benötige ich in der Fahrschule Zürich & Lachen?
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
            Wieso dauert die Fahrstunde des Driving Teams in 45 Minuten?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Da die Konzentration bei den meisten Menschen nach dieser Zeit nachlässt, haben wir dies als Grundeinheit festgelegt und analog zu den meisten Schulen angepasst. Je nach Übungsgebiet, Ausbildungsstand des Fahrschülers und anstehendem Thema macht es Sinn eine 1.5 oder gar eine Doppellektion zu vereinbaren, vor allem dann, wenn jemand in der Fahrausbildung schnell vorwärts kommen möchte. Im Stadtverkehr von Zürich ist man auch schnell nach 45 bis 60min ausgelaugt. Auf ländlichen Gebiet wie Lachen braucht man auch schnell mal 90min, wenn man irgendwo hinkommen möchte.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie rechtfertigen sich eure Preise?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unser stetiges Bestreben nach Professionalität möchten wir bis in die hinterste Ecke unserer Fahrschule umsetzen. Dies beginnt bei den  Fahrlehrer:innen, die nur langfristig eine seriöse und kundengerechte Arbeit abliefern können, wenn sie am Ende des Monats eine anständige Entlöhnung erhalten, gegen Krankheit und Unfall vollumfänglich versichert sind und eine solide Altersvorsorge auf sicher haben. Ebenso runden bezahlte Ferien, ein machbares Arbeitspensum, eine jährliche Gratifikation und flexible gestaltbare Arbeitszeiten die Work-Life-Balance in unserer Fahrschule ab. Eine weitere wichtige Voraussetzung, um eine professionelle Fahrschule betreiben zu können, ist eine moderne Infrastruktur. Unsere Fahrzeuge, egal ob Auto, Motorrad, Anhänger oder Motorboot, befinden sich stets in einem top gewarteten Zustand und auf dem neuesten Stand der Technik. Auch bei den Unterrichtslokalen sind wir uptodate. Moderne Fernseher, diverse Lernmittel und Whiteboards/ Flipcharts ermöglichen einen unterhaltsamen und lehrreichen Unterricht. Das Ergebnis: Fahrlehrer:innen, die gerne kommen — und Schüler:innen, die die Prüfung bestehen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wo bietet Ihr Fahrstunden an?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Unsere Lokale befinden sich in Zürich-Altstetten und in Lachen/SZ. Dort finden alle Kurse wie Nothelfer, Theorie und Verkehrskunde statt. Das Tätigkeitsgebiet des Driving Team Zürich erstreckt sich von Baden (Limmattal) bis nach Thalwil und von Bülach bis nach Wettswil/ Bonstetten im Knonaueramt. Bei den Autofahrlektionen können wir nach Möglichkeit flexible Treffpunkte vereinbaren sprich euch nach Möglichkeit entgegen kommen. Bei der Anhänger- und Motorradausbildung ist der Treffpunkt Altstetterplatz 12, 8048 Zürich (Bahnhof Zürich-Altstetten). Seit ein paar Jahren geben wir auch im Zürcher Oberland rundum Uster Auto- und Motorradfahrstunden. Beim Driving Team Lachen erstreckt sich das Tätigkeitsgebiet von Hinwil bis nach Schwyz und von Horgen bis nach Ziegelbrücke. Die Treffpunkte für die Autofahrstunden sind ebenfalls flexibel, das heisst wir holen euch, wenn möglich, zu Hause oder bei der Arbeit ab.</p>
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
          <p class="text-gray-600 mt-4">Unsere Verkehrskundekurse sind im oberen Preissegment, weil wir auch in diesem Bereich sehr bemüht sind zu den besten Fahrschulen zu gehören und euch einen möglichst grossen Nutzen für die Fahrstunden zu gewährleisten. Ihr erhält diverse für den Strassenverkehr wichtigen Unterlagen und es werden viele praxisnahe Themen diskutiert, angeschaut und geübt. Eines der Ziele ist ganz klar, dass Ihr durch den Besuch unseres Verkehrskundekurses neu erlerntes Wissen direkt in den Fahrstunden umsetzen könnt und somit auch am Ende weniger Fahrstunde benötigt. Das heisst, die Kosten des Verkehrskundekurses sind gut investiert, vor allem geht es am Schluss immer um eine sichere Fahrweise und dass wir keine Unfälle verursachen.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie kann ich eure Fahrlektionen und Kurse bezahlen?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Wir sind Freunde des Online-Payments. Das heisst du kannst alle unsere Fahrlektionen und Kurse direkt online bezahlen. Möchtest du lieber bar bezahlen, ist das natürlich auch möglich. Für Firmen erstellen wir natürlich auch Rechnungen.</p>
        </details>

        <!-- Zürich-spezifische FAQs -->
        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Welches sind die häufigsten Prüfungsrouten ab Zürich-Albisgütli?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Die praktische Fahrprüfung in Zürich findet am Strassenverkehrsamt Albisgütli statt. Häufige Prüfungsrouten führen nach: Enge/Wollishofen/Kilchberg, Leimbach/Adliswil/Thalwil, Sihlcity/Wettswil/Ringlikon, Uitikon Waldegg/Birmensdorf sowie Wiedikon/Albisrieden/Altstetten. Wir üben alle Routen mit euch – damit es bei der Prüfung keine bösen Überraschungen gibt.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Sind Fahrstunden in englischer oder albanischer Sprache möglich?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Ja, absolut! Wir bieten Fahrstunden auch auf Englisch und Albanisch an. Gerade in Zürich, wo viele internationale Einwohner leben, ist das ein echter Vorteil. Einfach beim Buchen oder per E-Mail angeben, in welcher Sprache du den Unterricht möchtest.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Wie lange ist der Lernfahrausweis gültig?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Der Lernfahrausweis ist 24 Monate ab Ausstellungsdatum gültig. Du kannst ihn kostenlos beim Strassenverkehrsamt einmalig um weitere 24 Monate verlängern, sofern du noch keine Fahrprüfung abgelegt hast. Wir empfehlen, die Ausbildung innerhalb von 12 Monaten zu absolvieren, damit das Gelernte frisch bleibt.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Welche Kategorien bietet die Fahrschule Zürich Driving Team an?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Am Hauptstandort Zürich-Altstetten bieten wir Fahrstunden für: Kategorie B (Auto), A1/A35kW/A (Motorrad), BE (Anhänger), C1/C/CE (Lastwagen), BPT 121/122 (Taxi), D1/D (Bus) und Motorboot (ab Lachen/SZ). Dazu Kurse wie Nothelfer, VKU, CZV, WAB und Motorrad-Grundkurs.</p>
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
    <InstructorProfileSection :instructors="instructors" />
    <AusbildungsthemenSection />
    <GutscheinSection />
    <StandorteSection />
    <WarumSection />

    <!-- Blog-Artikel Lesetipps -->
    <section class="section-container py-10">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Ratgeber & Tipps</p>
        <div class="flex flex-wrap gap-3 justify-center">
          <a href="/blog/fuehrerschein-kategorien-schweiz" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-all duration-200">🚗 Führerschein-Kategorien Schweiz</a>
          <a href="/blog/fuehrerschein-kosten-schweiz" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-all duration-200">💰 Kosten Schweiz 2026</a>
          <a href="/blog/bf17-begleitetes-fahren-schweiz" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-all duration-200">🚗 BF17 Begleitetes Fahren</a>
          <a href="/blog/theorieprufung-tipps-zuerich" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-all duration-200">📚 Theorieprüfung vorbereiten</a>
        </div>
      </div>
    </section>

    <!-- Quick Links Bar -->
    <div class="sticky top-[72px] z-40 bg-white border-b border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div class="relative">
        <!-- Fade-out gradients for scroll indication -->
        <div class="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10" />
        <div class="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />
        <div class="overflow-x-auto scrollbar-hide px-4">
          <div class="flex items-center gap-1 py-2.5 min-w-max mx-auto">
            <a href="/fahrschule-preise/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" /></svg>
              Preise & Pakete
            </a>
            <a href="/kostenrechner/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Kosten berechnen
            </a>
            <a href="/blog/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Ratgeber
            </a>
            <a href="/weiterbildungen/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              Weiterbildungen
            </a>
            <a href="/faq/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              FAQ
            </a>
            <a href="/kontakt/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Beratung
            </a>
            <a href="/team/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Fahrlehrer
            </a>
            <a href="/fahrschule-standorte/" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Standorte
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'
import { BUSINESS, buildHomepageSchema, buildLocationSchema, LOCATION_ZUERICH } from '~/business.config'

const instructors = getInstructorsByLocation('zuerich')

const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify(buildHomepageSchema()) },
  { type: 'application/ld+json', innerHTML: JSON.stringify(buildLocationSchema(LOCATION_ZUERICH)) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question", "name": "Wieviele Fahrstunden benötige ich?", "acceptedAnswer": {"@type": "Answer", "text": "Durchschnittlich benötigen Auto-Fahrschüler:innen 15-30 Fahrlektionen. Ohne private Übungsmöglichkeiten sind es oft 30-50 Stunden. Seriöses Üben und das Umsetzen der Fahrlehrertipps sind entscheidend."}},
      {"@type": "Question", "name": "Wie kann ich meine Fahrausbildung beschleunigen?", "acceptedAnswer": {"@type": "Answer", "text": "2-4 Fahrten pro Woche sind optimal. Wichtig: Übe privat genau wie Dein Fahrlehrer es gezeigt hat. Dies entwickelt Automatismen und mehr Fahrsicherheit."}},
      {"@type": "Question", "name": "Wieso dauert die Fahrstunde des Driving Teams 45 Minuten?", "acceptedAnswer": {"@type": "Answer", "text": "Die Konzentration der meisten Menschen lässt nach dieser Zeit nach. Je nach Bedarf können 1.5er oder Doppellektionen vereinbart werden."}},
      {"@type": "Question", "name": "Wie rechtfertigen sich eure Preise?", "acceptedAnswer": {"@type": "Answer", "text": "Professionalität ist unser Anspruch: gut bezahlte Fahrlehrer, modernste Fahrzeuge in top Zustand, und hochwertige Lernmittel."}},
      {"@type": "Question", "name": "Wo bietet Ihr Fahrstunden an?", "acceptedAnswer": {"@type": "Answer", "text": "Zürich-Altstetten und Lachen/SZ. Das Tätigkeitsgebiet erstreckt sich von Baden bis Thalwil und Bülach bis Wettswil/Bonstetten. Flexible Treffpunkte möglich."}},
      {"@type": "Question", "name": "Ab welchem Alter kann ich bei eurer Fahrschule starten?", "acceptedAnswer": {"@type": "Answer", "text": "50ccm Motorräder ab 15 Jahren, 125ccm ab 16 Jahren, Auto (Kategorie B) ab 17 Jahren. Motorräder bis 35kW fahren ist ab dem 18. Geburtstag erlaubt."}},
      {"@type": "Question", "name": "Wieviel kostet ungefähr die Fahrausbildung bis zur Auto Prüfung?", "acceptedAnswer": {"@type": "Answer", "text": "Mit 15 Lektionen ca. CHF 2'250.–, mit 30 Lektionen ca. CHF 3'530.– (inkl. Kurse und Gebühren)."}},
      {"@type": "Question", "name": "Soll ich Fahrstunden mit einem geschalteten oder automatischen Fahrzeug nehmen?", "acceptedAnswer": {"@type": "Answer", "text": "Das muss jeder selber entscheiden. Rechtlich darfst Du nach bestandener Prüfung beides fahren. Ein paar Fahrstunden mit Schaltung sind empfohlen."}},
      {"@type": "Question", "name": "Was sind die Voraussetzungen, um private Lernfahrten durchführen zu dürfen?", "acceptedAnswer": {"@type": "Answer", "text": "Begleitperson: gültiger Führerschein, nüchtern (0,0 Promille), beim Auto mind. 23 Jahre alt und Prüfung vor mind. 3 Jahren bestanden. Handbremse muss erreichbar sein."}},
      {"@type": "Question", "name": "Was ist die Admin- und Versicherungspauschale?", "acceptedAnswer": {"@type": "Answer", "text": "Einmalige Pauschale für die ganze Fahrausbildung. Beinhaltet Verwaltungsaufwände und die Vollkaskoversicherung des Fahrschulfahrzeugs."}},
      {"@type": "Question", "name": "Was haben eure Fahrlehrer:innen für eine Ausbildung?", "acceptedAnswer": {"@type": "Answer", "text": "Alle haben einen eidgenössischen Fachausweis und absolvieren jährlich mindestens einen Weiterbildungstag. Kontinuierliches Lernen ist uns wichtig."}},
      {"@type": "Question", "name": "Warum sind eure Verkehrskundekurse so teuer?", "acceptedAnswer": {"@type": "Answer", "text": "Wir bieten hochwertige Inhalte und praxisnahe Themen, die direkt in den Fahrstunden umgesetzt werden können. Das reduziert letztlich die benötigten Fahrstunden."}},
      {"@type": "Question", "name": "Welches sind die häufigsten Prüfungsrouten ab Zürich-Albisgütli?", "acceptedAnswer": {"@type": "Answer", "text": "Häufige Prüfungsrouten ab dem Strassenverkehrsamt Albisgütli: Enge/Wollishofen/Kilchberg, Leimbach/Adliswil/Thalwil, Sihlcity/Wettswil/Ringlikon, Uitikon Waldegg/Birmensdorf sowie Wiedikon/Albisrieden/Altstetten."}},
      {"@type": "Question", "name": "Sind Fahrstunden in englischer oder albanischer Sprache möglich?", "acceptedAnswer": {"@type": "Answer", "text": "Ja, wir bieten Fahrstunden auch auf Englisch und Albanisch an. Einfach beim Buchen oder per E-Mail angeben."}},
      {"@type": "Question", "name": "Wie lange ist der Lernfahrausweis gültig?", "acceptedAnswer": {"@type": "Answer", "text": "Der Lernfahrausweis ist 24 Monate gültig und kann einmalig kostenlos verlängert werden. Wir empfehlen, die Ausbildung innerhalb von 12 Monaten abzuschliessen."}},
      {"@type": "Question", "name": "Welche Kategorien bietet die Fahrschule Zürich Driving Team an?", "acceptedAnswer": {"@type": "Answer", "text": "Am Hauptstandort Zürich-Altstetten: Kategorie B (Auto), A1/A35kW/A (Motorrad), BE (Anhänger), C1/C/CE (Lastwagen), BPT 121/122 (Taxi), D1/D (Bus) und Motorboot (ab Lachen/SZ)."}}
    ]
  }) }
]
useHead({ script: jsonLdScripts })
</script>

<style scoped>
.category-card {
  animation: categoryCardSlide 0.6s ease-out forwards;
  opacity: 0;
}
.category-card:hover img {
  transform: scale(1.1);
}
@keyframes categoryCardSlide {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
