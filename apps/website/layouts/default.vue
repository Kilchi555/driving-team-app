<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Premium Header/Navigation -->
    <header class="sticky top-0 bg-white z-50 shadow-md">
      <nav class="w-full px-4 lg:px-8 py-5 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 group flex-shrink-0" @click="showDesktopMenu = false">
          <img src="/images/logo.png" alt="Driving Team Logo" class="h-8 xl:h-12 w-auto object-contain" />
        </NuxtLink>

        <!-- Hamburger / Close Button -->
        <button @click="showDesktopMenu = !showDesktopMenu" class="1200:hidden text-gray-700 hover:text-primary-600 ml-auto">
          <svg v-if="!showDesktopMenu" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <!-- Main Navigation -->
        <div class="hidden 1200:flex gap-2 items-center">
          <!-- Fahrschule Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Fahrschule
            </button>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/fahrschule-zuerich/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📍 Fahrschule Zürich</a>
              <a href="/fahrschule-lachen/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📍 Fahrschule Lachen</a>
              <a href="/fahrschule-uster/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📍 Fahrschule Uster</a>
              <a href="/fahrschule-stgallen/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📍 Fahrschule St.Gallen</a>
              <a href="/fahrschule-dietikon/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📍 Fahrschule Dietikon</a>
              <a href="/fahrschule-aargau/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📍 Fahrschule Aargau</a>
              <a href="/fahrschule-reichenburg/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📍 Fahrschule Reichenburg</a>
            </div>
          </div>

          <!-- Kategorie Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Kategorie
            </button>
            <div class="absolute left-0 mt-0 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/auto-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">🚗 Auto (B)</a>
              <a href="/motorrad-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">🏍️ Motorrad (A)</a>
              <a href="/lastwagen-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">🚛 Lastwagen (C)</a>
              <a href="/taxi-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">🚕 Taxi (BPT)</a>
              <a href="/motorboot/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">⛵ Motorboot</a>
              <a href="/bus-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">🚌 Bus (D)</a>
              <a href="/anhaenger-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">🚗 Anhänger (BE)</a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/kontrollfahrt/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">✅ Kontrollfahrt</a>
            </div>
          </div>

          <!-- Kurse Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Kurse
            </button>
            <div class="absolute left-0 mt-0 w-64 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/auto-theorie/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 font-medium">📚 Auto Theorie</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-2 text-xs font-bold text-gray-500 uppercase">Motorrad Grundkurse</div>
              <a href="/motorrad-grundkurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/motorrad-grundkurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <a href="/motorrad-grundkurs-zug/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zug</a>
              <a href="/motorrad-grundkurs-einsiedeln/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Einsiedeln</a>
              <div class="border-t border-gray-100 my-1"></div>
              <a href="/nothelferkurs/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 font-medium">❤️ Nothelferkurse</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-2 text-xs font-bold text-gray-500 uppercase">VKU Kurse</div>
              <a href="/vku-kurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/vku-kurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-2 text-xs font-bold text-gray-500 uppercase">WAB Kurse</div>
              <a href="/wab-kurse-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/wab-kurse-schwyz/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Schwyz</a>
              <a href="/wab-course-english/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">🌍 English</a>
            </div>
          </div>

          <!-- Weiterbildungen Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Weiterbildungen
            </button>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/czv-grundkurs/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📖 CZV Grundkurs</a>
              <a href="/czv-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">📖 CZV Weiterbildung</a>
              <a href="/fahrlehrerweiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">👨‍🏫 Fahrlehrer-Weiterbildung</a>
              <a href="/motorrad-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">🏍️ Motorrad-Weiterbildung</a>
            </div>
          </div>

          <!-- Einzelne Links -->
          <a href="/uber-uns/" class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition hover:bg-gray-50 rounded-lg">Über uns</a>
          <a href="/fahrschule-preise/" class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition hover:bg-gray-50 rounded-lg">Preise</a>
          <a href="/blog/" class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition hover:bg-gray-50 rounded-lg">Blog</a>
        </div>

        <!-- CTA Button -->
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-6 lg:px-7 rounded-full transition shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0 ml-4 lg:ml-6">
          <span>Termin Buchen</span>
        </a>
      </nav>
    </header>

    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="showDesktopMenu"
        class="1200:hidden fixed inset-0 bg-black/40 z-40"
        @click="showDesktopMenu = false"
      />
    </Transition>

    <!-- Mobile Menu Panel -->
    <Transition name="slide-down">
      <div v-if="showDesktopMenu" class="1200:hidden fixed top-[72px] left-0 right-0 bg-white z-40 shadow-xl rounded-b-2xl max-h-[calc(100vh-72px)] overflow-y-auto">
        <div class="px-6 py-4">
        <!-- Mobile Menu Content -->
        <nav class="pb-4">

          <!-- Fahrschule -->
          <button @click="openSection = openSection === 'fahrschule' ? '' : 'fahrschule'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Fahrschule</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'fahrschule' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'fahrschule'" class="pl-2 py-2 space-y-1">
            <a href="/fahrschule-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Zürich</a>
            <a href="/fahrschule-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Lachen</a>
            <a href="/fahrschule-uster/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Uster</a>
            <a href="/fahrschule-stgallen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 St.Gallen</a>
            <a href="/fahrschule-dietikon/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Dietikon</a>
            <a href="/fahrschule-aargau/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Aargau</a>
            <a href="/fahrschule-reichenburg/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Reichenburg</a>
          </div>

          <!-- Kategorie -->
          <button @click="openSection = openSection === 'kategorie' ? '' : 'kategorie'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Kategorie</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'kategorie' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'kategorie'" class="pl-2 py-2 space-y-1">
            <a href="/auto-fahrschule/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🚗 Auto (B)</a>
            <a href="/motorrad-fahrschule/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🏍️ Motorrad (A)</a>
            <a href="/lastwagen-fahrschule/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🚛 Lastwagen (C)</a>
            <a href="/taxi-fahrschule/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🚕 Taxi (BPT)</a>
            <a href="/motorboot/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">⛵ Motorboot</a>
            <a href="/bus-fahrschule/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🚌 Bus (D)</a>
            <a href="/anhaenger-fahrschule/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🚗 Anhänger (BE)</a>
            <a href="/kontrollfahrt/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">✅ Kontrollfahrt</a>
          </div>

          <!-- Kurse -->
          <button @click="openSection = openSection === 'kurse' ? '' : 'kurse'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Kurse</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'kurse'" class="pl-2 py-2">
            <a href="/auto-theorie/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📚 Auto Theorie</a>
            <a href="/nothelferkurs/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">❤️ Nothelferkurse</a>

            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">Motorrad Grundkurse</p>
            <a href="/motorrad-grundkurs-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Zürich</a>
            <a href="/motorrad-grundkurs-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Lachen</a>
            <a href="/motorrad-grundkurs-zug/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Zug</a>
            <a href="/motorrad-grundkurs-einsiedeln/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Einsiedeln</a>

            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">VKU Kurse</p>
            <a href="/vku-kurs-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Zürich</a>
            <a href="/vku-kurs-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Lachen</a>

            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">WAB Kurse</p>
            <a href="/wab-kurse-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Zürich</a>
            <a href="/wab-kurse-schwyz/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">Schwyz</a>
            <a href="/wab-course-english/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5 pl-2" @click="showDesktopMenu = false">🌍 English</a>
          </div>

          <!-- Weiterbildungen -->
          <button @click="openSection = openSection === 'weiterbildungen' ? '' : 'weiterbildungen'" class="flex items-center justify-between w-full py-3 border-b border-gray-200 font-semibold text-gray-800">
            <span>Weiterbildungen</span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="openSection === 'weiterbildungen' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="openSection === 'weiterbildungen'" class="pl-2 py-2 space-y-1">
            <a href="/czv-grundkurs/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📖 CZV Grundkurs</a>
            <a href="/czv-weiterbildung/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📖 CZV Weiterbildung</a>
            <a href="/fahrlehrerweiterbildung/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">👨‍🏫 Fahrlehrer-Weiterbildung</a>
            <a href="/motorrad-weiterbildung/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">🏍️ Motorrad-Weiterbildung</a>
          </div>

          <!-- Direkte Links -->
          <a href="/team/" class="flex items-center justify-between py-3 border-b border-gray-200 font-semibold text-gray-800 hover:text-primary-600" @click="showDesktopMenu = false">Team & Geschichte</a>
          <a href="/fahrschule-preise/" class="flex items-center justify-between py-3 border-b border-gray-200 font-semibold text-gray-800 hover:text-primary-600" @click="showDesktopMenu = false">Preise</a>
          <a href="/blog/" class="flex items-center justify-between py-3 border-b border-gray-200 font-semibold text-gray-800 hover:text-primary-600" @click="showDesktopMenu = false">Blog</a>

          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="block bg-primary-600 text-white rounded-full py-3 px-4 text-center font-bold mt-6 hover:bg-primary-700" @click="showDesktopMenu = false">
            📅 Termin Buchen
          </a>
        </nav>
        </div>
      </div>
    </Transition>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white mt-20">
      <div class="section-container py-12">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          <!-- Kontakt -->
          <div>
            <h2 class="font-bold text-lg mb-5">Kontakt</h2>
            <ul class="space-y-3 text-sm text-gray-300">
              <li>
                <a href="tel:0444310033" class="hover:text-white transition">044 431 00 33</a>
              </li>
              <li>
                <a href="mailto:info@drivingteam.ch" class="hover:text-white transition">info@drivingteam.ch</a>
              </li>
              <li class="text-gray-400">Montag bis Freitag : 08:00 - 12:00 / 13:00 - 17:00</li>
            </ul>
          </div>

          <!-- Unsere Gebiete -->
          <div>
            <h3 class="font-bold text-lg mb-5">Unsere Gebiete</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/fahrschule-zuerich/" class="hover:text-white transition">Fahrschule Zürich</a></li>
              <li><a href="/fahrschule-lachen/" class="hover:text-white transition">Fahrschule Lachen</a></li>
              <li><a href="/fahrschule-uster/" class="hover:text-white transition">Fahrschule Uster</a></li>
              <li><a href="/fahrschule-aargau/" class="hover:text-white transition">Fahrschule Aargau</a></li>
              <li><a href="/fahrschule-reichenburg/" class="hover:text-white transition">Fahrschule Reichenburg</a></li>
              <li><a href="/fahrschule-stgallen/" class="hover:text-white transition">Fahrschule St.Gallen</a></li>
              <li><a href="/fahrschule-dietikon/" class="hover:text-white transition">Fahrschule Dietikon</a></li>
            </ul>
          </div>

          <!-- Navigation -->
          <div>
            <h3 class="font-bold text-lg mb-5">Navigation</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/auto-fahrschule/" class="hover:text-white transition">Auto</a></li>
              <li><a href="/anhaenger-fahrschule/" class="hover:text-white transition">Anhänger</a></li>
              <li><a href="/taxi-fahrschule/" class="hover:text-white transition">Taxi</a></li>
              <li><a href="/motorboot/" class="hover:text-white transition">Motorboot</a></li>
              <li><a href="/motorrad-fahrschule/" class="hover:text-white transition">Motorrad</a></li>
              <li><a href="/lastwagen-fahrschule/" class="hover:text-white transition">Lastwagen</a></li>
              <li><a href="/bus-fahrschule/" class="hover:text-white transition">Bus</a></li>
              <li><a href="/czv-weiterbildung/" class="hover:text-white transition">Weiterbildung</a></li>
            </ul>
          </div>

          <!-- Links -->
          <div>
            <h3 class="font-bold text-lg mb-5">Links</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/kontakt/" class="hover:text-white transition">Kontakt</a></li>
              <li><a href="/uber-uns/" class="hover:text-white transition">Team</a></li>
              <li><a href="/fahrschule-preise/" class="hover:text-white transition">Preise</a></li>
              <li><a href="/agb/" class="hover:text-white transition">AGB</a></li>
              <li><a href="/datenschutz/" class="hover:text-white transition">Datenschutz</a></li>
              <li><a href="https://www.ninakae.ch" target="_blank" rel="noopener noreferrer" class="hover:text-white transition">Fotos von Nina Kälin</a></li>
            </ul>
          </div>

        </div>

        <!-- Divider + Bottom bar -->
        <div class="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-gray-400 text-sm">Copyright © Driving Team | All rights reserved.</p>

          <div class="flex items-center gap-6 text-sm text-gray-300">
            <a href="https://www.facebook.com/drivingteamzurich" target="_blank" rel="noopener noreferrer" class="hover:text-white transition">Facebook</a>
            <a href="https://www.instagram.com/drivingteamzurich" target="_blank" rel="noopener noreferrer" class="hover:text-white transition">Instagram</a>
          </div>

          <p class="text-gray-500 text-xs">
            Designed by 
            <a href="https://www.simy.ch" target="_blank" rel="noopener noreferrer" class="hover:text-gray-300 transition">Simy IT Systems Kilchenmann</a>
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showDesktopMenu = ref(false)
const openSection = ref('')
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
