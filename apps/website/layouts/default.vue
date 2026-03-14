<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Premium Header/Navigation -->
    <header class="sticky top-0 bg-white z-50 shadow-md">
      <nav class="w-full px-4 lg:px-8 py-5 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 group flex-shrink-0" @click="handleLogoClick">
          <img src="/images/logo.webp" alt="Driving Team Logo" width="340" height="57" class="h-8 xl:h-12 w-auto object-contain" loading="eager" />
        </NuxtLink>

        <!-- Hamburger / Close Button -->
        <button @click="showDesktopMenu = !showDesktopMenu" class="1200:hidden text-gray-700 hover:text-primary-600 ml-auto" :aria-label="showDesktopMenu ? 'Navigation schliessen' : 'Navigation öffnen'" :aria-expanded="showDesktopMenu" aria-controls="main-nav-menu">
          <svg v-if="!showDesktopMenu" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
            <div class="absolute left-0 mt-0 w-72 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/fahrschule-zuerich/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Zürich</a>
              <a href="/fahrschule-lachen/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Lachen</a>
              <a href="/fahrschule-pfaeffikon/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Pfäffikon/SZ</a>
              <a href="/fahrschule-uster/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Uster</a>
              <a href="/fahrschule-stgallen/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule St.Gallen</a>
              <a href="/fahrschule-dietikon/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Dietikon</a>
              <a href="/fahrschule-aargau/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Aargau</a>
              <a href="/fahrschule-reichenburg/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">📍 Fahrschule Reichenburg</a>
            </div>
          </div>

          <!-- Kategorie Dropdown -->
          <div class="relative group">
            <button class="px-4 py-2 text-gray-700 font-medium hover:text-primary-600 transition flex items-center gap-1 group-hover:bg-gray-50 rounded-lg">
              Kategorie
            </button>
            <div class="absolute left-0 mt-0 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/auto-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚗</span>
                  <div>
                    <div class="font-medium">Auto</div>
                    <div class="text-xs text-gray-500">Kategorie B</div>
                  </div>
                </div>
              </a>
              <a href="/motorrad-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🏍️</span>
                  <div>
                    <div class="font-medium">Motorrad</div>
                    <div class="text-xs text-gray-500">Kategorie A</div>
                  </div>
                </div>
              </a>
              <a href="/lastwagen-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚛</span>
                  <div>
                    <div class="font-medium">Lastwagen</div>
                    <div class="text-xs text-gray-500">Kategorie C</div>
                  </div>
                </div>
              </a>
              <a href="/taxi-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚕</span>
                  <div>
                    <div class="font-medium">Taxi</div>
                    <div class="text-xs text-gray-500">Kategorie BPT</div>
                  </div>
                </div>
              </a>
              <a href="/motorboot-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">⛵</span>
                  <div>
                    <div class="font-medium">Motorboot</div>
                    <div class="text-xs text-gray-500">Wasser</div>
                  </div>
                </div>
              </a>
              <a href="/bus-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚌</span>
                  <div>
                    <div class="font-medium">Bus</div>
                    <div class="text-xs text-gray-500">Kategorie D</div>
                  </div>
                </div>
              </a>
              <a href="/anhaenger-fahrschule/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚗</span>
                  <div>
                    <div class="font-medium">Anhänger</div>
                    <div class="text-xs text-gray-500">Kategorie BE</div>
                  </div>
                </div>
              </a>
              <div class="border-t border-gray-100 my-2"></div>
              <a href="/kontrollfahrt/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 whitespace-nowrap">✅ Kontrollfahrt</a>
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
              <div class="px-5 py-3 text-base font-bold text-gray-900">Motorrad Grundkurse</div>
              <a href="/motorrad-grundkurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/motorrad-grundkurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <a href="/motorrad-grundkurs-zug/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zug</a>
              <a href="/motorrad-grundkurs-einsiedeln/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Einsiedeln</a>
              <div class="border-t border-gray-100 my-1"></div>
              <a href="/nothelferkurs/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 font-medium">❤️ Nothelferkurse</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-3 text-base font-bold text-gray-900">VKU Kurse</div>
              <a href="/vku-kurs-zuerich/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Zürich</a>
              <a href="/vku-kurs-lachen/" class="block px-5 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2 text-sm">Lachen</a>
              <div class="border-t border-gray-100 my-1"></div>
              <div class="px-5 py-3 text-base font-bold text-gray-900">WAB Kurse</div>
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
            <div class="absolute left-0 mt-0 w-72 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition hidden group-hover:block z-50 py-2">
              <a href="/czv-grundkurs/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">📖</span>
                  <div class="font-medium">CZV Grundkurs</div>
                </div>
              </a>
              <a href="/czv-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">📈</span>
                  <div class="font-medium">CZV Weiterbildung</div>
                </div>
              </a>
              <a href="/fahrlehrerweiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">👨‍🏫</span>
                  <div class="font-medium">Fahrlehrer-Weiterbildung</div>
                </div>
              </a>
              <a href="/motorrad-weiterbildung/" class="block px-5 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition rounded-lg mx-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🏍️</span>
                  <div class="font-medium">Motorrad-Weiterbildung</div>
                </div>
              </a>
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
      <div id="main-nav-menu" v-if="showDesktopMenu" class="1200:hidden fixed top-[72px] left-0 right-0 bg-white z-40 shadow-xl rounded-b-2xl max-h-[calc(100vh-72px)] overflow-y-auto">
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
            <a href="/fahrschule-pfaeffikon/" class="block text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">📍 Pfäffikon/SZ</a>
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
            <a href="/auto-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚗 Auto</span>
              <span class="text-xs text-gray-400">Kategorie B</span>
            </a>
            <a href="/motorrad-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🏍️ Motorrad</span>
              <span class="text-xs text-gray-400">Kategorie A</span>
            </a>
            <a href="/lastwagen-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚛 Lastwagen</span>
              <span class="text-xs text-gray-400">Kategorie C</span>
            </a>
            <a href="/taxi-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚕 Taxi</span>
              <span class="text-xs text-gray-400">Kategorie BPT</span>
            </a>
            <a href="/motorboot-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>⛵ Motorboot</span>
              <span class="text-xs text-gray-400">Wasser</span>
            </a>
            <a href="/bus-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚌 Bus</span>
              <span class="text-xs text-gray-400">Kategorie D</span>
            </a>
            <a href="/anhaenger-fahrschule/" class="flex items-center justify-between text-sm text-gray-600 hover:text-primary-600 py-1.5" @click="showDesktopMenu = false">
              <span>🚗 Anhänger</span>
              <span class="text-xs text-gray-400">Kategorie BE</span>
            </a>
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

            <button @click="openSubSection = openSubSection === 'motorrad-kurse' ? '' : 'motorrad-kurse'" class="flex items-center justify-between w-full py-3 px-0 text-sm font-bold text-gray-900 hover:text-primary-600 mt-2">
              <span>Motorrad Grundkurse</span>
              <svg class="w-3 h-3 transition-transform duration-200" :class="openSubSection === 'motorrad-kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-show="openSubSection === 'motorrad-kurse'" class="pl-2 py-1 space-y-1">
              <a href="/motorrad-grundkurs-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zürich</a>
              <a href="/motorrad-grundkurs-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Lachen</a>
              <a href="/motorrad-grundkurs-zug/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zug</a>
              <a href="/motorrad-grundkurs-einsiedeln/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Einsiedeln</a>
            </div>

            <button @click="openSubSection = openSubSection === 'vku-kurse' ? '' : 'vku-kurse'" class="flex items-center justify-between w-full py-3 px-0 text-sm font-bold text-gray-900 hover:text-primary-600 mt-2">
              <span>VKU Kurse</span>
              <svg class="w-3 h-3 transition-transform duration-200" :class="openSubSection === 'vku-kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-show="openSubSection === 'vku-kurse'" class="pl-2 py-1 space-y-1">
              <a href="/vku-kurs-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zürich</a>
              <a href="/vku-kurs-lachen/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Lachen</a>
            </div>

            <button @click="openSubSection = openSubSection === 'wab-kurse' ? '' : 'wab-kurse'" class="flex items-center justify-between w-full py-3 px-0 text-sm font-bold text-gray-900 hover:text-primary-600 mt-2">
              <span>WAB Kurse</span>
              <svg class="w-3 h-3 transition-transform duration-200" :class="openSubSection === 'wab-kurse' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-show="openSubSection === 'wab-kurse'" class="pl-2 py-1 space-y-1">
              <a href="/wab-kurse-zuerich/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Zürich</a>
              <a href="/wab-kurse-schwyz/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">Schwyz</a>
              <a href="/wab-course-english/" class="block text-sm text-gray-600 hover:text-primary-600 py-1" @click="showDesktopMenu = false">🌍 English</a>
            </div>
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
    <!-- Weiterbildungen Modal -->
    <ClientOnly>
      <Transition name="fade">
        <div v-if="showWeiterbildungenModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 flex items-center justify-between">
              <h2 class="text-2xl font-bold text-white">Weiterbildungen</h2>
              <button @click="showWeiterbildungenModal = false" class="text-white hover:text-gray-200 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a v-for="item in weiterbildungen" :key="item.title" :href="item.link" @click="showWeiterbildungenModal = false" class="group p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition flex items-center gap-3">
                  <div class="text-3xl flex-shrink-0">{{ item.icon }}</div>
                  <h3 class="font-bold text-gray-900 group-hover:text-primary-600">{{ item.title }}</h3>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

    <!-- Kurse Modal (Motorrad, VKU, WAB) -->
    <ClientOnly>
      <Transition name="fade">
        <div v-if="showKurseModal && activeKursCategory" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 flex items-center justify-between">
              <h2 class="text-2xl font-bold text-white">{{ kurseModalTitle }}</h2>
              <button @click="closeKursModal" class="text-white hover:text-gray-200 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a v-for="item in currentKurseItems" :key="item.title" :href="item.link" @click="closeKursModal" class="group p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition flex items-center gap-3">
                  <div class="text-3xl flex-shrink-0">{{ item.icon }}</div>
                  <h3 class="font-bold text-gray-900 group-hover:text-primary-600">{{ item.title }}</h3>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

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
              <li><a href="/fahrschule-pfaeffikon/" class="hover:text-white transition">Fahrschule Pfäffikon/SZ</a></li>
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
              <li><a href="/motorboot-fahrschule/" class="hover:text-white transition">Motorboot</a></li>
              <li><a href="/motorrad-fahrschule/" class="hover:text-white transition">Motorrad</a></li>
              <li><a href="/lastwagen-fahrschule/" class="hover:text-white transition">Lastwagen</a></li>
              <li><a href="/bus-fahrschule/" class="hover:text-white transition">Bus</a></li>
              <li><a href="#" @click.prevent="showWeiterbildungenModal = true" class="hover:text-white transition cursor-pointer">Weiterbildung</a></li>
            </ul>
          </div>

          <!-- Kurse -->
          <div>
            <h3 class="font-bold text-lg mb-5">Kurse</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li><a href="/auto-theorie/" class="hover:text-white transition">Auto Theorie</a></li>
              <li><a href="#" @click.prevent="showKursModalFn('motorrad')" class="hover:text-white transition cursor-pointer">Motorrad Grundkurse</a></li>
              <li><a href="/nothelferkurs/" class="hover:text-white transition">Nothelferkurse</a></li>
              <li><a href="#" @click.prevent="showKursModalFn('vku')" class="hover:text-white transition cursor-pointer">VKU Kurse</a></li>
              <li><a href="#" @click.prevent="showKursModalFn('wab')" class="hover:text-white transition cursor-pointer">WAB Kurse</a></li>
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

          <div class="flex items-center gap-4">
            <!-- Instagram Zürich -->
            <a href="https://www.instagram.com/fahrschule_driving_team_zurich/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Zürich" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <!-- Instagram Lachen -->
            <a href="https://www.instagram.com/fahrschule_drivingteam_lachen" target="_blank" rel="noopener noreferrer" aria-label="Instagram Lachen" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <!-- Facebook Zürich -->
            <a href="https://www.facebook.com/drivingteam" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <!-- Facebook Lachen -->
            <a href="https://www.facebook.com/drivingteamlachen/" target="_blank" rel="noopener noreferrer" aria-label="Facebook Lachen" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <!-- YouTube -->
            <a href="https://www.youtube.com/channel/UC5nqMUHvHym4xW-ro1aX90Q" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <!-- TikTok -->
            <a href="https://www.tiktok.com/@drivingteam.ch" target="_blank" rel="noopener noreferrer" aria-label="TikTok" class="text-gray-400 hover:text-white transition">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
            </a>
          </div>

          <p class="text-gray-400 text-xs">
            Designed by 
            <a href="https://www.simy.ch" target="_blank" rel="noopener noreferrer" class="hover:text-white transition">Simy IT Systems Kilchenmann</a>
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showDesktopMenu = ref(false)
const openSection = ref('')
const openSubSection = ref('')
const showWeiterbildungenModal = ref(false)
const showKurseModal = ref(false)
const activeKursCategory = ref<string | null>(null)

const handleLogoClick = () => {
  showDesktopMenu.value = false
  window.scrollTo(0, 0)
}

const weiterbildungen = [
  {
    title: 'CZV Grundkurs',
    icon: '📖',
    description: 'Grundkurs für Berufskraftfahrer. Fachlich kompetent und zeiteffizient.',
    link: '/czv-grundkurs/'
  },
  {
    title: 'CZV Weiterbildung',
    icon: '📈',
    description: 'Kontinuierliche Weiterbildung für Fahrzeuglenker. Professionelle Schulung.',
    link: '/czv-weiterbildung/'
  },
  {
    title: 'Fahrlehrer-Weiterbildung',
    icon: '👨‍🏫',
    description: 'Spezielle Weiterbildung für Fahrlehrerinnen und Fahrlehrer.',
    link: '/fahrlehrerweiterbildung/'
  },
  {
    title: 'Motorrad-Weiterbildung',
    icon: '🏍️',
    description: 'Weiterbildung für erfahrene Motorrad-Fahrer. Sicherheit & Fahrtechnik.',
    link: '/motorrad-weiterbildung/'
  }
]

const kurseCategories = {
  motorrad: {
    title: 'Motorrad Grundkurse',
    icon: '🏍️',
    items: [
      { title: 'Zürich', icon: '📍', link: '/motorrad-grundkurs-zuerich/' },
      { title: 'Lachen', icon: '📍', link: '/motorrad-grundkurs-lachen/' },
      { title: 'Zug', icon: '📍', link: '/motorrad-grundkurs-zug/' },
      { title: 'Einsiedeln', icon: '📍', link: '/motorrad-grundkurs-einsiedeln/' }
    ]
  },
  vku: {
    title: 'VKU Kurse',
    icon: '🛣️',
    items: [
      { title: 'Zürich', icon: '📍', link: '/vku-kurs-zuerich/' },
      { title: 'Lachen', icon: '📍', link: '/vku-kurs-lachen/' }
    ]
  },
  wab: {
    title: 'WAB Kurse',
    icon: '🚗',
    items: [
      { title: 'Zürich', icon: '📍', link: '/wab-kurse-zuerich/' },
      { title: 'Schwyz', icon: '📍', link: '/wab-kurse-schwyz/' },
      { title: '🌍 English', icon: '🌍', link: '/wab-course-english/' }
    ]
  }
}

const kurseModalTitle = computed(() => {
  if (activeKursCategory.value && kurseCategories[activeKursCategory.value as keyof typeof kurseCategories]) {
    return kurseCategories[activeKursCategory.value as keyof typeof kurseCategories].title
  }
  return ''
})

const currentKurseItems = computed(() => {
  if (activeKursCategory.value && kurseCategories[activeKursCategory.value as keyof typeof kurseCategories]) {
    return kurseCategories[activeKursCategory.value as keyof typeof kurseCategories].items
  }
  return []
})

const showKursModalFn = (category: string) => {
  activeKursCategory.value = category
  showKurseModal.value = true
}

const closeKursModal = () => {
  showKurseModal.value = false
  activeKursCategory.value = null
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
