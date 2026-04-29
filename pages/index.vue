<template>
  <div class="min-h-screen bg-white font-sans" :style="brandCssVars">

    <!-- ── Nav ──────────────────────────────────────────────────────────────── -->
    <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <img :src="logoPreview || '/simy-logo.png'" alt="Logo"
          class="h-8 max-w-[140px] object-contain transition-all duration-500"
          :style="{ filter: logoColorFilter }" />

        <!-- Desktop nav -->
        <div class="hidden min-[750px]:flex items-center gap-4">
          <a href="#branding-preview" class="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Farben testen</a>
          <a href="#features" class="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Features</a>
          <a href="#preise" class="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Preise</a>
          <a href="/login" class="text-sm font-medium transition-colors" style="color: var(--brand-primary);">Einloggen</a>
          <a :href="registerUrl" @click="saveLogoToSession"
            class="text-sm font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 whitespace-nowrap"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
            Kostenlos starten →
          </a>
        </div>

        <!-- Mobile: login + hamburger -->
        <div class="flex min-[750px]:hidden items-center gap-3">
          <a :href="registerUrl" @click="saveLogoToSession"
            class="text-xs font-bold px-3 py-2 rounded-xl text-white transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
            Starten →
          </a>
          <button @click="mobileMenuOpen = !mobileMenuOpen"
            class="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl transition-colors"
            :style="{ background: `rgba(var(--brand-rgb), 0.08)` }">
            <span class="block w-5 h-0.5 rounded-full transition-all duration-300"
              :style="{ background: primaryColor, transform: mobileMenuOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none' }"></span>
            <span class="block w-5 h-0.5 rounded-full transition-all duration-300"
              :style="{ background: primaryColor, opacity: mobileMenuOpen ? '0' : '1' }"></span>
            <span class="block w-5 h-0.5 rounded-full transition-all duration-300"
              :style="{ background: primaryColor, transform: mobileMenuOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none' }"></span>
          </button>
        </div>
      </div>

      <!-- Mobile dropdown -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="mobileMenuOpen" class="min-[750px]:hidden border-t px-6 py-4 space-y-1 bg-white/95"
          :style="{ borderColor: `rgba(var(--brand-rgb), 0.1)` }">
          <a href="#branding-preview" @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-colors"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.06)`"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = ''">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" :style="{ background: `rgba(var(--brand-rgb), 0.1)` }">🎨</span>
            Farben testen
          </a>
          <a href="#features" @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-colors"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.06)`"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = ''">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" :style="{ background: `rgba(var(--brand-rgb), 0.1)` }">⚡</span>
            Features
          </a>
          <a href="#preise" @click="mobileMenuOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-colors"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.06)`"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = ''">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" :style="{ background: `rgba(var(--brand-rgb), 0.1)` }">💰</span>
            Preise
          </a>
          <div class="border-t my-2" :style="{ borderColor: `rgba(var(--brand-rgb), 0.1)` }"></div>
          <a href="/login"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            :style="{ color: primaryColor }"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.06)`"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = ''">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs" :style="{ background: `rgba(var(--brand-rgb), 0.1)` }">→</span>
            Einloggen
          </a>
          <a :href="registerUrl" @click="saveLogoToSession; mobileMenuOpen = false"
            class="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 mt-2"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
            60 Tage kostenlos starten →
          </a>
        </div>
      </Transition>
    </nav>

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-12 pb-20 px-6">
      <div class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      <div class="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full opacity-8 pointer-events-none"
        style="background: radial-gradient(circle, var(--brand-accent), transparent)"></div>

      <div class="relative max-w-4xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-8 border"
          :style="{ background: `rgba(var(--brand-rgb), 0.07)`, color: primaryColor, borderColor: `rgba(var(--brand-rgb), 0.28)` }">
          <span class="w-2 h-2 rounded-full animate-pulse" :style="{ background: primaryColor }"></span>
          60 Tage kostenlos – keine Kreditkarte nötig
        </div>

        <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
          Deine Fahrschule.<br>
          <span :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }">
            Auf Autopilot.
          </span>
        </h1>

        <p class="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-4 leading-relaxed">
          Simy übernimmt Verwaltung, Abrechnung und Kommunikation –
          damit du wieder Zeit für das hast, was wirklich zählt: <strong class="text-gray-700">Unterrichten.</strong>
        </p>
        <p class="text-sm text-gray-400 mb-10">Monatlich kündbar · 1 Monat Kündigungsfrist<br> · Flexibel anpassbar</p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a :href="registerUrl" @click="saveLogoToSession"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all hover:scale-105"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 30px rgba(var(--brand-rgb), 0.35)` }">
            60 Tage gratis testen
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </a>
          <a href="#features"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg border-2 transition-all"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)`, color: primaryColor }"
            @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.05)`"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'">
            Alle Features
          </a>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap items-center justify-center gap-3 mt-12">
          <div v-for="badge in ['DSGVO-konform', 'Schweizer Server', 'PostFinance & TWINT', 'Keine IT-Kenntnisse nötig']" :key="badge"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-500"
            :style="{ background: `rgba(var(--brand-rgb), 0.07)`, borderColor: `rgba(var(--brand-rgb), 0.22)`, color: primaryColor }">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
            {{ badge }}
          </div>
        </div>
      </div>
    </section>

    <!-- ── Pain → Solution ──────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, rgba(var(--brand-rgb), 0.05) 0%, #FFFFFF 100%)` }">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Das Problem</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Wie viel Zeit verlierst du täglich?</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Fahrlehrer verbringen durchschnittlich <strong>2-3 Stunden täglich</strong> mit Administration – Zeit, die du mit Unterrichten verdienen oder dir einfach mal eine Pause gönnen könntest.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 mb-14">
          <div v-for="pain in pains" :key="pain.title"
            class="rounded-2xl p-6 border transition-colors duration-500"
            :style="{ background: `rgba(var(--brand-rgb), 0.06)`, borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <div class="text-3xl mb-3">{{ pain.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-1">{{ pain.title }}</h3>
            <p class="text-sm text-gray-500">{{ pain.text }}</p>
          </div>
        </div>

        <div class="text-center">
          <div class="inline-flex items-center gap-3 text-2xl font-black" style="color: var(--brand-primary);">
            Simy automatisiert das alles für dich.
          </div>
        </div>
      </div>
    </section>

    <!-- ── Branding Preview Section ────────────────────────────────────────── -->
    <section id="branding-preview" class="py-20 px-6 bg-white border-y border-gray-100">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
            :style="{ background: `rgba(var(--brand-rgb), 0.07)`, color: primaryColor, borderColor: `rgba(var(--brand-rgb), 0.28)` }">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
            Dein Branding
          </div>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Simy in deinen Farben</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Passe die Farben an – die ganze Seite wechselt live in dein Branding. So siehst du genau, wie Simy für deine Fahrschule aussieht.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-8 items-center">
          <!-- Left: Color pickers -->
          <div class="rounded-3xl border-2 p-8 bg-white shadow-lg" :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }">
            <p class="text-sm font-bold text-gray-700 mb-5">Deine Markenfarben</p>

            <!-- Logo Upload -->
            <div class="mb-5">
              <label class="block text-xs text-gray-500 mb-1.5">Logo <span class="text-gray-300">(optional)</span></label>
              <div v-if="!logoPreview"
                class="relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-gray-300"
                :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)` }">
                <input ref="logoInputRefSection" type="file" accept="image/*" @change="handleLogoUpload"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                <div class="flex items-center justify-center gap-2 text-gray-400">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <span class="text-sm font-medium">Logo hochladen</span>
                </div>
              </div>
              <div v-else class="space-y-2">
                <div class="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                  <img :src="logoPreview" alt="Logo" class="h-9 max-w-[120px] object-contain rounded">
                  <button @click="removeLogo" class="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0 flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    Entfernen
                  </button>
                </div>
                <!-- Color extraction feedback -->
                <Transition enter-active-class="transition-all duration-400" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                  <div v-if="extractingColors" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" :style="{ background: `rgba(var(--brand-rgb), 0.08)`, color: primaryColor }">
                    <svg class="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Farben werden aus dem Logo erkannt…
                  </div>
                  <div v-else-if="colorsExtracted" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                    Farben aus dem Logo automatisch übernommen ✓
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Color inputs -->
            <div class="space-y-3 mb-6">
              <div v-for="[model, label] in [['primary', 'Hauptfarbe'], ['secondary', 'Zweitfarbe'], ['accent', 'Akzentfarbe']]" :key="label">
                <label class="block text-xs text-gray-500 mb-1">{{ label }}</label>
                <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-11">
                  <input
                    :value="model === 'primary' ? primaryColor : model === 'secondary' ? secondaryColor : accentColor"
                    @input="(e) => { const v = (e.target as HTMLInputElement).value; if (model === 'primary') primaryColor = v; else if (model === 'secondary') secondaryColor = v; else accentColor = v }"
                    type="color" class="w-8 h-8 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                  <input
                    :value="model === 'primary' ? primaryColor : model === 'secondary' ? secondaryColor : accentColor"
                    @input="(e) => { const v = (e.target as HTMLInputElement).value; if (model === 'primary') primaryColor = v; else if (model === 'secondary') secondaryColor = v; else accentColor = v }"
                    type="text" class="flex-1 py-2 bg-transparent text-sm outline-none font-mono text-gray-700 uppercase">
                </div>
              </div>
            </div>

            <!-- Quick presets -->
            <div class="mb-6">
              <p class="text-xs text-gray-400 mb-2">Schnell ausprobieren:</p>
              <div class="flex gap-2 flex-wrap">
                <button v-for="preset in colorPresets" :key="preset.name"
                  @click="applyPreset(preset)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-105"
                  :style="{ background: preset.primary + '18', borderColor: preset.primary + '40', color: preset.primary }">
                  <span class="w-3 h-3 rounded-full" :style="{ background: preset.primary }"></span>
                  {{ preset.name }}
                </button>
              </div>
            </div>

            <a :href="registerUrl" @click="saveLogoToSession"
              class="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 shadow-lg"
              :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 24px rgba(var(--brand-rgb), 0.35)` }">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Kostenlos testen
            </a>
            <button @click="resetColors" class="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2 py-1">
              Auf Standard zurücksetzen
            </button>
          </div>

          <!-- Right: Live preview card -->
          <div class="space-y-4">
            <!-- Mini navbar preview -->
            <div class="rounded-2xl border border-gray-100 shadow-md overflow-hidden">
              <div class="bg-white px-5 py-3 flex items-center justify-between border-b border-gray-100">
                <img :src="logoPreview || '/simy-logo.png'" alt="Logo" class="h-6 max-w-[100px] object-contain transition-all duration-500" :style="{ filter: logoColorFilter }" />
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400 hidden sm:block">Einloggen</span>
                  <span class="text-xs font-bold px-3 py-1 rounded-lg text-white" :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
                    Starten →
                  </span>
                </div>
              </div>
              <div class="px-5 py-5" :style="{ background: `rgba(var(--brand-rgb), 0.04)` }">
                <div class="h-3 rounded-full mb-2 w-3/4" :style="{ background: `rgba(var(--brand-rgb), 0.15)` }"></div>
                <div class="h-2 rounded-full mb-2 w-full bg-gray-100"></div>
                <div class="h-2 rounded-full mb-4 w-5/6 bg-gray-100"></div>
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold" :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
                  60 Tage gratis testen →
                </div>
              </div>
            </div>

            <!-- Color strip + info -->
            <div class="rounded-2xl border border-gray-100 shadow-md p-5 bg-white">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Deine Farbpalette</p>
              <div class="flex gap-2 mb-4">
                <div class="flex-1 h-12 rounded-xl transition-colors duration-500 flex items-end pb-2 px-2" :style="{ background: primaryColor }">
                  <span class="text-white text-xs font-mono opacity-80">{{ primaryColor }}</span>
                </div>
                <div class="flex-1 h-12 rounded-xl transition-colors duration-500 flex items-end pb-2 px-2" :style="{ background: secondaryColor }">
                  <span class="text-white text-xs font-mono opacity-80">{{ secondaryColor }}</span>
                </div>
                <div class="flex-1 h-12 rounded-xl transition-colors duration-500 flex items-end pb-2 px-2" :style="{ background: accentColor }">
                  <span class="text-xs font-mono opacity-70" :style="{ color: primaryColor }">{{ accentColor }}</span>
                </div>
              </div>
              <div class="flex items-center gap-3 text-sm text-gray-500">
                <svg class="w-4 h-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                Farben werden beim Registrieren automatisch übernommen
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Features ──────────────────────────────────────────────────────────── -->
    <section id="features" class="py-20 px-6 bg-white">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Features</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Alles was deine Fahrschule braucht</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">Von der Lektionsbuchung bis zur Abrechnung – in einer einzigen Plattform.</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div v-for="feat in features" :key="feat.title"
            class="group rounded-2xl p-6 border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors duration-500"
              :style="{ background: `rgba(var(--brand-rgb), ${feat.alpha})` }">
              {{ feat.icon }}
            </div>
            <h3 class="font-bold text-gray-900 mb-1">{{ feat.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Automations ────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);">
      <div class="max-w-5xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.65);">Automatisierung</p>
        <h2 class="text-4xl font-extrabold text-white mb-4">Simy arbeitet. Du unterrichtest.</h2>
        <p class="text-lg max-w-2xl mx-auto mb-14" style="color: rgba(255,255,255,0.65);">Diese Aufgaben erledigt Simy <strong class="text-white">jeden Tag automatisch</strong> für dich – ohne dass du einen Finger rühren musst.</p>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="auto in automations" :key="auto.label"
            class="rounded-2xl p-5 border text-left"
            style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg"
              style="background: rgba(255,255,255,0.15);">
              {{ auto.icon }}
            </div>
            <p class="text-white font-bold text-sm mb-1">{{ auto.label }}</p>
            <p class="text-xs leading-relaxed" style="color: rgba(255,255,255,0.65);">{{ auto.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Email Demo ─────────────────────────────────────────────────────────── -->
    <section id="email-demo" class="py-12 md:py-20 px-4 md:px-6" :style="{ background: `linear-gradient(160deg, rgba(var(--brand-rgb), 0.04) 0%, rgba(var(--brand-2-rgb), 0.06) 100%)` }">
      <div class="max-w-6xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8 md:mb-12">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Live Demo</p>
          <h2 class="text-2xl md:text-4xl font-extrabold text-gray-900 mb-3 md:mb-4">So kommuniziert Simy mit deinen Schülern</h2>
          <p class="text-base md:text-lg text-gray-500 max-w-xl mx-auto">Gib deinen Schulnamen ein – und sieh sofort, wie die E-Mails deiner Fahrschule aussehen werden.</p>
        </div>

        <div class="grid lg:grid-cols-2 gap-6 md:gap-8 items-start">

          <!-- LEFT: Controls -->
          <div class="space-y-4 md:space-y-6">

            <!-- School name input -->
            <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              <label class="block text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Name deiner Fahrschule</label>
              <input
                v-model="schoolNameDemo"
                type="text"
                placeholder="z.B. Fahrschule Müller GmbH"
                class="w-full px-4 py-3 rounded-xl border-2 text-gray-900 font-medium text-sm transition-all outline-none"
                :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }"
                @focus="(e) => (e.target as HTMLInputElement).style.borderColor = primaryColor"
                @blur="(e) => (e.target as HTMLInputElement).style.borderColor = `rgba(var(--brand-rgb), 0.2)`"
              />
              <p class="text-xs text-gray-400 mt-2">Der Name erscheint live in der E-Mail-Vorschau →</p>
            </div>

            <!-- Template Tabs -->
            <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              <label class="block text-xs font-bold uppercase tracking-widest mb-3 md:mb-4" style="color: var(--brand-primary);">E-Mail Vorlage wählen</label>
              <div class="space-y-2">
                <button
                  v-for="tab in [
                    { id: 'reminder', icon: '📅', label: 'Lektionserinnerung', desc: '24h vor jeder Stunde automatisch versendet' },
                    { id: 'invoice', icon: '🧾', label: 'Rechnung', desc: 'Nach jeder Lektion mit Zahlungslink' },
                    { id: 'welcome', icon: '🎉', label: 'Willkommen', desc: 'Sobald ein neuer Schüler erfasst wird' },
                  ]"
                  :key="tab.id"
                  @click="activeTemplate = (tab.id as 'reminder' | 'invoice' | 'welcome')"
                  class="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl border-2 transition-all text-left"
                  :style="activeTemplate === tab.id
                    ? { borderColor: primaryColor, background: `rgba(var(--brand-rgb), 0.05)` }
                    : { borderColor: 'transparent', background: '#f9fafb' }"
                >
                  <span class="text-lg md:text-xl flex-shrink-0">{{ tab.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold" :style="activeTemplate === tab.id ? { color: primaryColor } : { color: '#374151' }">{{ tab.label }}</p>
                    <p class="text-xs text-gray-400 hidden sm:block truncate">{{ tab.desc }}</p>
                  </div>
                  <svg v-if="activeTemplate === tab.id" class="w-4 h-4 flex-shrink-0" :style="{ color: primaryColor }" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Send to inbox -->
            <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              <label class="block text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Diese E-Mail an mich senden</label>

              <!-- Success state -->
              <div v-if="demoSentCurrent" class="rounded-xl p-4 md:p-5 text-center" :style="{ background: `rgba(var(--brand-rgb), 0.06)`, border: `1px solid rgba(var(--brand-rgb), 0.15)` }">
                <p class="text-3xl mb-2">📬</p>
                <p class="font-bold text-gray-900 text-sm mb-1">Check dein Postfach!</p>
                <p class="text-xs text-gray-500 mb-4">Die Demo-E-Mail ist unterwegs an <strong>{{ demoEmail }}</strong></p>
                <a :href="registerUrl" @click="saveLogoToSession"
                  class="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
                  :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }">
                  Bereit für echte Emails? Jetzt registrieren →
                </a>
              </div>

              <!-- Input state -->
              <div v-else class="space-y-3">
                <input
                  v-model="demoEmail"
                  type="email"
                  placeholder="deine@email.ch"
                  class="w-full px-4 py-3 rounded-xl border-2 text-gray-900 text-sm transition-all outline-none"
                  :style="{ borderColor: `rgba(var(--brand-rgb), 0.2)` }"
                  @focus="(e) => (e.target as HTMLInputElement).style.borderColor = primaryColor"
                  @blur="(e) => (e.target as HTMLInputElement).style.borderColor = `rgba(var(--brand-rgb), 0.2)`"
                  @keyup.enter="sendDemoEmail"
                />
                <p v-if="demoError" class="text-xs text-red-500">{{ demoError }}</p>
                <button
                  @click="sendDemoEmail"
                  :disabled="!demoEmail || sendingDemo"                  class="w-full py-3 px-5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }"
                >
                  <svg v-if="sendingDemo" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>{{ sendingDemo ? 'Wird gesendet…' : 'Demo-E-Mail zusenden →' }}</span>
                </button>
                <p class="text-xs text-gray-400 text-center">Kein Spam. Nur diese eine Demo-E-Mail.</p>
              </div>
            </div>

          </div>

          <!-- RIGHT: Live Email Preview -->
          <div class="lg:sticky lg:top-24">
            <div class="rounded-2xl overflow-hidden shadow-xl md:shadow-2xl border" :style="{ borderColor: `rgba(var(--brand-rgb), 0.15)` }">
              <!-- Fake email client top bar -->
              <div class="bg-gray-800 px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3">
                <div class="flex gap-1.5 flex-shrink-0">
                  <span class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400"></span>
                  <span class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-400"></span>
                  <span class="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400"></span>
                </div>
                <div class="flex-1 bg-gray-700 rounded-md px-2 md:px-3 py-1 md:py-1.5 text-xs text-gray-400 min-w-0">
                  <span class="text-gray-500 mr-1 hidden sm:inline">Von:</span>
                  <span class="text-gray-300 truncate block sm:inline">{{ schoolNameDemo || 'Fahrschule Muster AG' }} via Simy</span>
                </div>
              </div>
              <!-- Subject line -->
              <div class="bg-white px-3 md:px-5 py-2.5 md:py-3 border-b border-gray-100 flex items-center gap-2 md:gap-3">
                <span class="text-base md:text-lg flex-shrink-0">{{ activeTemplate === 'reminder' ? '📅' : activeTemplate === 'invoice' ? '🧾' : '🎉' }}</span>
                <span class="text-xs md:text-sm font-semibold text-gray-700 truncate">
                  <template v-if="activeTemplate === 'reminder'">Erinnerung: Deine Fahrstunde morgen um 09:00 Uhr</template>
                  <template v-else-if="activeTemplate === 'invoice'">Deine Rechnung: CHF 295.– fällig bis 15.05.2025</template>
                  <template v-else>Willkommen bei {{ schoolNameDemo || 'Fahrschule Muster AG' }}!</template>
                </span>
              </div>
              <!-- Email body iframe -->
              <div class="bg-gray-50 overflow-hidden">
                <iframe
                  :srcdoc="demoEmailHtml"
                  class="w-full border-0 block"
                  style="height: 380px; pointer-events: none;"
                  sandbox="allow-same-origin"
                  title="E-Mail Vorschau"
                ></iframe>
              </div>
            </div>
            <!-- Hint -->
            <p class="text-center text-xs text-gray-400 mt-3">
              Farben folgen deiner Auswahl im
              <button @click="showColorPicker = true; if(showAutoPopup) showAutoPopup = false" class="font-semibold underline underline-offset-2 transition-colors hover:opacity-80" style="color: var(--brand-primary);">Branding-Tool</button>
              oben
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- ── Personas ───────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Für alle</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Vorteile für jeden in deiner Fahrschule</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="persona in personas" :key="persona.title"
            class="rounded-3xl p-8 border-2"
            :style="{ background: persona.bg, borderColor: persona.border }">
            <div class="text-4xl mb-4">{{ persona.icon }}</div>
            <h3 class="text-xl font-extrabold mb-1" :style="`color: ${persona.color}`">{{ persona.title }}</h3>
            <p class="text-sm text-gray-500 mb-5">{{ persona.subtitle }}</p>
            <ul class="space-y-2">
              <li v-for="benefit in persona.benefits" :key="benefit"
                class="flex items-start gap-2 text-sm text-gray-700">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" :style="`color: ${persona.color}`" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ benefit }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ── ROI Calculator ─────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `linear-gradient(180deg, rgba(var(--brand-rgb), 0.05) 0%, #FFFFFF 100%)` }">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-10">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Dein ROI</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-3">Was ist deine Zeit wert?</h2>
          <p class="text-gray-500">Rechne aus, wie viel du mit Simy verdienen kannst – allein durch die Zeit, die du zurückgewinnst.</p>
        </div>

        <div class="rounded-3xl border-2 p-8 md:p-10 bg-white" :style="{ borderColor: `rgba(var(--brand-rgb), 0.25)` }">
          <div class="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">Stundenlohn (CHF)</label>
              <input v-model.number="roi.hourlyRate" type="range" min="60" max="200" step="10"
                class="w-full" :style="{ accentColor: primaryColor }" />
              <div class="text-2xl font-black mt-2" style="color: var(--brand-primary);">CHF {{ roi.hourlyRate }}.–</div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">Admin-Zeit pro Tag (h)</label>
              <input v-model.number="roi.hoursPerDay" type="range" min="0.5" max="4" step="0.5"
                class="w-full" :style="{ accentColor: primaryColor }" />
              <div class="text-2xl font-black mt-2" style="color: var(--brand-primary);">{{ roi.hoursPerDay }} h/Tag</div>
            </div>
          </div>

          <div class="rounded-2xl p-6 text-center" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
            <p class="text-sm mb-1" style="color: rgba(255,255,255,0.65);">Dein monatliches Einsparungspotenzial</p>
            <div class="text-5xl font-black text-white">CHF {{ roiSaving }}.–</div>
            <p class="text-sm mt-2" style="color: rgba(255,255,255,0.65);">{{ roiHours }} Stunden × CHF {{ roi.hourlyRate }} × 22 Arbeitstage</p>
          </div>

          <p class="text-center text-xs text-gray-400 mt-4">
            Simy Starter ab CHF 69.– / Monat — Amortisation am ersten Tag.
          </p>
        </div>
      </div>
    </section>

    <!-- ── Pricing Teaser ─────────────────────────────────────────────────────── -->
    <section id="preise" class="py-20 px-6 bg-white">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">Preise</p>
        <h2 class="text-4xl font-extrabold text-gray-900 mb-3">Transparent. Flexibel. Fair.</h2>
        <p class="text-gray-500 text-lg mb-12">Monatlich kündbar, keine Jahresbindung. Starte mit 60 Tagen kostenlos.</p>

        <div class="grid md:grid-cols-3 gap-5 mb-10">
          <div v-for="plan in pricingPlans" :key="plan.name"
            class="rounded-3xl p-7 border-2 flex flex-col relative"
            :style="plan.highlighted
              ? `background: linear-gradient(145deg, ${primaryColor}, ${secondaryColor}); border-color: transparent; box-shadow: 0 25px 50px rgba(var(--brand-rgb), 0.3);`
              : 'border-color: #EEE8FF; background: white;'">
            <div v-if="plan.highlighted"
              class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide whitespace-nowrap"
              style="background: rgba(255,255,255,0.92); color: inherit;"
              :style="{ color: primaryColor }">
              ✦ Am beliebtesten
            </div>
            <h3 class="font-extrabold text-xl mb-1" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">{{ plan.name }}</h3>
            <p class="text-sm mb-4" :class="plan.highlighted ? '' : 'text-gray-400'"
              :style="plan.highlighted ? { color: 'rgba(255,255,255,0.65)' } : {}">{{ plan.tagline }}</p>
            <div class="flex items-baseline gap-1 mb-5">
              <span class="text-4xl font-black" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">CHF {{ plan.price }}</span>
              <span class="text-sm" :class="plan.highlighted ? '' : 'text-gray-400'"
                :style="plan.highlighted ? { color: 'rgba(255,255,255,0.65)' } : {}">/Monat</span>
            </div>
            <ul class="space-y-2 mb-6 flex-1">
              <li v-for="f in plan.featureList" :key="f" class="flex items-center gap-2 text-sm"
                :class="plan.highlighted ? '' : 'text-gray-600'"
                :style="plan.highlighted ? { color: 'rgba(255,255,255,0.9)' } : {}">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"
                  :style="{ color: plan.highlighted ? 'rgba(255,255,255,0.85)' : primaryColor }">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ f }}
              </li>
            </ul>
            <a :href="registerUrl" @click="saveLogoToSession"
              class="block text-center py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              :style="plan.highlighted
                ? { background: 'rgba(255,255,255,0.92)', color: primaryColor }
                : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white' }">
              60 Tage gratis starten
            </a>
          </div>
        </div>

        <a href="/upgrade" class="text-sm font-medium transition-colors" style="color: var(--brand-primary);">
          Alle Features & Preise vergleichen →
        </a>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" :style="{ background: `rgba(var(--brand-rgb), 0.04)` }">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary);">FAQ</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Häufige Fragen</h2>
        </div>
        <div class="space-y-3">
          <div v-for="faq in faqs" :key="faq.q"
            class="rounded-2xl border bg-white overflow-hidden"
            :style="{ borderColor: `rgba(var(--brand-rgb), 0.18)` }">
            <button @click="faq.open = !faq.open"
              class="w-full text-left px-6 py-4 flex items-center justify-between font-bold text-gray-900 transition-colors"
              @mouseenter="(e) => (e.currentTarget as HTMLElement).style.background = `rgba(var(--brand-rgb), 0.05)`"
              @mouseleave="(e) => (e.currentTarget as HTMLElement).style.background = ''">
              {{ faq.q }}
              <svg class="w-5 h-5 flex-shrink-0 transition-transform duration-200"
                :style="{ color: accentColor }"
                :class="faq.open ? 'rotate-45' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div v-if="faq.open" class="px-6 pt-4 pb-5 text-sm text-gray-500 leading-relaxed border-t" :style="{ borderColor: `rgba(var(--brand-rgb), 0.12)` }">
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Final CTA ──────────────────────────────────────────────────────────── -->
    <section class="py-24 px-6" style="background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Bereit, deine Fahrschule<br>auf Autopilot zu schalten?
        </h2>
        <p class="text-lg mb-10" style="color: rgba(255,255,255,0.65);">Starte heute mit 60 Tagen kostenlos – keine Kreditkarte, keine Bindung.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a :href="registerUrl" @click="saveLogoToSession"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all"
            :style="{ background: 'rgba(255,255,255,0.92)', color: primaryColor }">
            Jetzt kostenlos starten →
          </a>
          <a href="mailto:info@simy.ch"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg border-2 border-white/30 hover:bg-white/10 transition-all">
            Demo anfragen
          </a>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3 mt-6">
          <a href="mailto:info@simy.ch"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-105"
            style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85);">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            info@simy.ch
          </a>
          <a href="tel:+41797157027"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-105"
            style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85);">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            079 715 70 27
          </a>
        </div>
      </div>
    </section>

    <!-- ── Footer ──────────────────────────────────────────────────────────────── -->
    <footer class="py-10 px-6 border-t border-gray-100">
      <div class="max-w-6xl mx-auto text-sm text-gray-400">
        <!-- Top row: logo + links -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
          <div class="flex items-center gap-3">
            <img :src="logoPreview || '/simy-logo.png'" alt="Simy"
              class="h-7 opacity-60 max-w-[100px] object-contain transition-all duration-500"
              :style="{ filter: logoColorFilter }" />
            <span class="text-xs">© {{ currentYear }} Simy</span>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href="/login" class="hover:text-gray-700 transition-colors">Login</a>
            <a href="#features" class="hover:text-gray-700 transition-colors">Features</a>
            <a href="#preise" class="hover:text-gray-700 transition-colors">Preise</a>
            <a href="mailto:info@simy.ch" class="hover:text-gray-700 transition-colors">Kontakt</a>
            <a :href="registerUrl" @click="saveLogoToSession"
              class="font-bold transition-colors hover:opacity-80"
              style="color: var(--brand-primary);">Registrieren</a>
          </div>
        </div>
        <!-- Bottom row: address + legal -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-5 border-t border-gray-100 text-xs text-gray-300">
          <span>Weiherweg 2, 8610 Uster · Schweiz</span>
          <div class="flex items-center gap-4">
            <a href="/datenschutz" class="hover:text-gray-500 transition-colors">Datenschutz</a>
            <a href="/agb" class="hover:text-gray-500 transition-colors">AGB</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- ── Auto-Popup (after 10s) ───────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="opacity-0 translate-y-6"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-6"
    >
      <div v-if="showAutoPopup"
        class="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[70]">
        <div class="rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
          <div class="px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3">
            <div class="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 text-lg sm:text-xl">🎨</div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-bold text-xs sm:text-sm leading-snug">Simy in deinen Farben ausprobieren</p>
              <p class="text-xs mt-0.5 hidden sm:block" style="color: rgba(255,255,255,0.7);">Passe die Farben an und sieh die Seite live in deinem Branding</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <a href="#branding-preview" @click="showAutoPopup = false"
                class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all hover:scale-105"
                :style="{ background: 'rgba(255,255,255,0.92)', color: primaryColor }">
                <span class="hidden sm:inline">Ausprobieren →</span>
                <span class="sm:hidden">Los →</span>
              </a>
              <button @click="showAutoPopup = false"
                class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style="background: rgba(255,255,255,0.15); color: white;">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="h-0.5 bg-white/10">
            <div class="h-full bg-white/30" :style="{ width: `${popupProgress}%`, transition: 'width 50ms linear' }"></div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Floating Color Customizer ──────────────────────────────────────────── -->
    <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <!-- Expanded Panel -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-95"
      >
        <div v-if="showColorPicker" class="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72 origin-bottom-right">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <p class="font-bold text-gray-900 text-sm">Simy in deinen Farben</p>
              <p class="text-xs text-gray-400 mt-0.5">Live-Vorschau – jetzt ausprobieren!</p>
            </div>
            <button @click="showColorPicker = false"
              class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors flex-shrink-0 ml-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Logo Upload -->
          <div class="mb-4">
            <p class="text-xs text-gray-500 mb-1.5">Logo</p>
            <div v-if="!logoPreview"
              class="relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors hover:border-gray-300"
              :style="{ borderColor: `rgba(var(--brand-rgb), 0.3)` }">
              <input ref="logoInputRef" type="file" accept="image/*" @change="handleLogoUpload"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
              <div class="flex items-center justify-center gap-2 text-gray-400">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span class="text-xs font-medium">Logo hochladen</span>
              </div>
            </div>
            <div v-else class="space-y-1.5">
              <div class="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                <img :src="logoPreview" alt="Logo" class="h-8 max-w-[100px] object-contain rounded">
                <button @click="removeLogo" class="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div v-if="extractingColors" class="flex items-center gap-1.5 text-xs px-1" :style="{ color: primaryColor }">
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Farben werden erkannt…
              </div>
              <div v-else-if="colorsExtracted" class="flex items-center gap-1.5 text-xs text-green-600 px-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                Farben aus Logo übernommen ✓
              </div>
            </div>
          </div>

          <!-- Color Inputs -->
          <div class="space-y-2.5 mb-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Hauptfarbe</label>
              <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-10">
                <input v-model="primaryColor" type="color" class="w-7 h-7 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                <input v-model="primaryColor" type="text" placeholder="#6000BD" class="flex-1 py-2 bg-transparent text-xs outline-none font-mono text-gray-700 uppercase">
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Zweitfarbe</label>
              <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-10">
                <input v-model="secondaryColor" type="color" class="w-7 h-7 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                <input v-model="secondaryColor" type="text" placeholder="#8B2FE8" class="flex-1 py-2 bg-transparent text-xs outline-none font-mono text-gray-700 uppercase">
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Akzentfarbe</label>
              <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-2 overflow-hidden h-10">
                <input v-model="accentColor" type="color" class="w-7 h-7 border-0 bg-transparent cursor-pointer p-0.5 flex-shrink-0 rounded">
                <input v-model="accentColor" type="text" placeholder="#BEA3FF" class="flex-1 py-2 bg-transparent text-xs outline-none font-mono text-gray-700 uppercase">
              </div>
            </div>
          </div>

          <!-- Color Preview Strip -->
          <div class="flex gap-1.5 mb-4 h-9 rounded-xl overflow-hidden">
            <div class="flex-1 transition-colors duration-300" :style="{ background: primaryColor }"></div>
            <div class="flex-1 transition-colors duration-300" :style="{ background: secondaryColor }"></div>
            <div class="flex-1 transition-colors duration-300" :style="{ background: accentColor }"></div>
          </div>

          <!-- Logo preview in panel (with color filter applied) -->
          <div class="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 py-3 mb-4">
            <img :src="logoPreview || '/simy-logo.png'" alt="Logo"
              class="h-7 max-w-[120px] object-contain transition-all duration-500"
              :style="{ filter: logoColorFilter }" />
          </div>

          <!-- Preset colors -->
          <div class="mb-4">
            <p class="text-xs text-gray-400 mb-2">Schnell ausprobieren:</p>
            <div class="flex gap-2 flex-wrap">
              <button v-for="preset in colorPresets" :key="preset.name"
                @click="applyPreset(preset)"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:scale-105"
                :style="{ background: preset.primary + '18', borderColor: preset.primary + '40', color: preset.primary }">
                <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: preset.primary }"></span>
                {{ preset.name }}
              </button>
            </div>
          </div>

          <!-- CTA -->
          <a :href="registerUrl" @click="saveLogoToSession"
            class="flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm mb-2 transition-all hover:opacity-90"
            :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Mit diesen Farben starten
          </a>
          <button @click="resetColors" class="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
            Auf Standard zurücksetzen
          </button>
        </div>
      </Transition>

      <!-- Toggle Button -->
      <button @click="showColorPicker = !showColorPicker; if (showColorPicker) showAutoPopup = false"
        class="w-14 h-14 rounded-2xl text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 relative"
        :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }"
        :title="showColorPicker ? 'Schliessen' : 'Farben anpassen'">
        <svg v-if="!showColorPicker" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
        </svg>
        <svg v-else class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <span v-if="!showColorPicker"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-black shadow-md border-2 border-white"
          :style="{ color: primaryColor }">
          ✦
        </span>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { definePageMeta, useHead } from '#imports'

definePageMeta({ layout: false })

useHead({
  title: 'Simy – Die smarte Fahrschul-Software der Schweiz',
  meta: [
    { name: 'description', content: 'Simy automatisiert Verwaltung, Abrechnung und Kommunikation für Fahrschulen. 60 Tage kostenlos testen – keine Kreditkarte nötig.' }
  ],
})

const currentYear = computed(() => new Date().getFullYear())

// ─── Brand Color Live Preview ────────────────────────────────────────────────
const DEFAULT_PRIMARY = '#6000BD'
const DEFAULT_SECONDARY = '#8B2FE8'
const DEFAULT_ACCENT = '#BEA3FF'

const primaryColor = ref(DEFAULT_PRIMARY)
const secondaryColor = ref(DEFAULT_SECONDARY)
const accentColor = ref(DEFAULT_ACCENT)
const showColorPicker = ref(false)
const mobileMenuOpen = ref(false)

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '96, 0, 189'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

// CSS filter to shift the Simy logo from its original purple to any target color
const logoColorFilter = computed(() => {
  if (logoPreview.value) return 'none'
  if (primaryColor.value === DEFAULT_PRIMARY) return 'none'
  const [tH, tS, tL] = hexToHsl(primaryColor.value)
  const [oH, oS, oL] = hexToHsl(DEFAULT_PRIMARY)
  const hRot = Math.round(tH - oH)
  const sat  = Math.round(oS > 0 ? (tS / oS) * 100 : 100)
  const bri  = Math.round(oL > 0 ? (tL / oL) * 100 : 100)
  return `hue-rotate(${hRot}deg) saturate(${sat}%) brightness(${bri}%)`
})

const brandCssVars = computed(() => ({
  '--brand-primary': primaryColor.value,
  '--brand-secondary': secondaryColor.value,
  '--brand-accent': accentColor.value,
  '--brand-rgb': hexToRgb(primaryColor.value),
  '--brand-2-rgb': hexToRgb(secondaryColor.value),
}))

const registerUrl = computed(() => {
  const params = new URLSearchParams({
    primary_color: primaryColor.value,
    secondary_color: secondaryColor.value,
    accent_color: accentColor.value,
  })
  return `/tenant-register?${params.toString()}`
})

const colorPresets = [
  { name: 'Blau', primary: '#2563EB', secondary: '#1D4ED8', accent: '#93C5FD' },
  { name: 'Grün', primary: '#059669', secondary: '#047857', accent: '#6EE7B7' },
  { name: 'Rot', primary: '#DC2626', secondary: '#B91C1C', accent: '#FCA5A5' },
  { name: 'Orange', primary: '#EA580C', secondary: '#C2410C', accent: '#FED7AA' },
  { name: 'Gold', primary: '#CA8A04', secondary: '#A16207', accent: '#FDE68A' },
  { name: 'Türkis', primary: '#0891B2', secondary: '#0E7490', accent: '#67E8F9' },
]

function applyPreset(preset: { primary: string; secondary: string; accent: string }) {
  primaryColor.value = preset.primary
  secondaryColor.value = preset.secondary
  accentColor.value = preset.accent
}

function resetColors() {
  primaryColor.value = DEFAULT_PRIMARY
  secondaryColor.value = DEFAULT_SECONDARY
  accentColor.value = DEFAULT_ACCENT
}

// ─── Logo Preview ─────────────────────────────────────────────────────────────
const logoPreview = ref<string | null>(null)
const logoInputRef = ref<HTMLInputElement | null>(null)
const logoInputRefSection = ref<HTMLInputElement | null>(null)
const extractingColors = ref(false)
const colorsExtracted = ref(false)

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function getSaturation(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return 0
  const d = max - min
  return d / (l > 0.5 ? 2 - max - min : max + min)
}

async function extractColorsFromLogo(dataUrl: string): Promise<[string, string, string] | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 120
        canvas.height = 120
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, 120, 120)
        const data = ctx.getImageData(0, 0, 120, 120).data

        const pixels: [number, number, number][] = []
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue
          const lum = (r * 299 + g * 587 + b * 114) / 1000
          // skip near-white and near-black
          if (lum > 218 || lum < 22) continue
          // skip very desaturated (grey)
          if (getSaturation(r, g, b) < 0.08) continue
          pixels.push([r, g, b])
        }

        if (pixels.length < 10) { resolve(null); return }

        // K-means with k=3, 12 iterations
        const k = 3
        let centroids: [number, number, number][] = [
          pixels[0],
          pixels[Math.floor(pixels.length / 2)],
          pixels[pixels.length - 1],
        ]

        for (let iter = 0; iter < 12; iter++) {
          const clusters: [number, number, number][][] = Array.from({ length: k }, () => [])
          for (const px of pixels) {
            let minD = Infinity, best = 0
            centroids.forEach((c, i) => {
              const d = colorDistance(px[0], px[1], px[2], c[0], c[1], c[2])
              if (d < minD) { minD = d; best = i }
            })
            clusters[best].push(px)
          }
          centroids = clusters.map((cluster, i) => {
            if (cluster.length === 0) return centroids[i]
            const s = cluster.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
            return [Math.round(s[0] / cluster.length), Math.round(s[1] / cluster.length), Math.round(s[2] / cluster.length)] as [number, number, number]
          })
        }

        // Sort by saturation descending (most vibrant first)
        centroids.sort((a, b) => getSaturation(b[0], b[1], b[2]) - getSaturation(a[0], a[1], a[2]))

        resolve([
          rgbToHex(centroids[0][0], centroids[0][1], centroids[0][2]),
          rgbToHex(centroids[1][0], centroids[1][1], centroids[1][2]),
          rgbToHex(centroids[2][0], centroids[2][1], centroids[2][2]),
        ])
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

async function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return
  if (file.size > 2 * 1024 * 1024) { alert('Datei zu gross! Max. 2 MB'); return }
  const reader = new FileReader()
  reader.onload = async (e) => {
    const dataUrl = e.target?.result as string
    logoPreview.value = dataUrl
    extractingColors.value = true
    colorsExtracted.value = false
    const colors = await extractColorsFromLogo(dataUrl)
    extractingColors.value = false
    if (colors) {
      primaryColor.value = colors[0]
      secondaryColor.value = colors[1]
      accentColor.value = colors[2]
      colorsExtracted.value = true
      setTimeout(() => { colorsExtracted.value = false }, 3500)
    }
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  logoPreview.value = null
  if (logoInputRef.value) logoInputRef.value.value = ''
}

function saveLogoToSession() {
  if (logoPreview.value) {
    sessionStorage.setItem('simy_preview_logo', logoPreview.value)
  } else {
    sessionStorage.removeItem('simy_preview_logo')
  }
}

// ─── Auto-Popup after 10s ─────────────────────────────────────────────────────
const showAutoPopup = ref(false)
const popupProgress = ref(100)
let popupTimer: ReturnType<typeof setTimeout> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  popupTimer = setTimeout(() => {
    if (!showColorPicker.value) {
      showAutoPopup.value = true
      // Progress bar counts down over 8 seconds then auto-closes
      const duration = 8000
      const interval = 50
      const steps = duration / interval
      let current = steps
      progressTimer = setInterval(() => {
        current--
        popupProgress.value = Math.round((current / steps) * 100)
        if (current <= 0) {
          showAutoPopup.value = false
          if (progressTimer) clearInterval(progressTimer)
        }
      }, interval)
    }
  }, 10000)
})

onUnmounted(() => {
  if (popupTimer) clearTimeout(popupTimer)
  if (progressTimer) clearInterval(progressTimer)
})

// ─── ROI Calculator ──────────────────────────────────────────────────────────
const roi = reactive({ hourlyRate: 90, hoursPerDay: 2 })
const roiHours = computed(() => roi.hoursPerDay)
const roiSaving = computed(() => Math.round(roi.hourlyRate * roi.hoursPerDay * 22 / 10) * 10)

// ─── Static Content ──────────────────────────────────────────────────────────
const pains = [
  { icon: '⏰', title: 'Manuelle Terminverwaltung', text: 'Zeitraubendes Planen von Lektionen – alles per Whatsapp, SMS oder Telefon.' },
  { icon: '💸', title: 'Vergessene Rechnungen', text: 'Offene Posten, die durch die Lappen gehen. Mahnungen manuell schreiben. Zahlungen mühsam nachverfolgen. Quittungen schreiben etc.' },
  { icon: '📱', title: 'Chaotische Kommunikation', text: 'WhatsApp, SMS, E-Mail – Schüler fragen überall und ständig an, Termine verpasst, No-Shows die man nicht verrechnen kann, Missverständnisse und Diskussionen häufen sich.' },
]

const features = computed(() => [
  { icon: '📅', title: 'Kalender & Terminplanung', desc: 'Intelligente Lektionsplanung direkt online und vollautomatisiert, Live-Sync und mit automatischen Erinnerungen.', alpha: 0.10 },
  { icon: '💳', title: 'Zahlungen & Rechnungen', desc: 'Online-Zahlung mit TWINT, Debit- und Kreditkarte inkl. PostFinance, Rechnungen mit 2 Klicks erstellt und versendet, Mahnungen und Gutschriften einfach erstellt..', alpha: 0.07 },
  { icon: '👥', title: 'Schülerverwaltung', desc: 'Alle Schülerdaten, Lernfortschritte, Dokumente und Notizen zentral an einem Ort.', alpha: 0.13 },
  { icon: '📊', title: 'Auswertungen & Statistiken', desc: 'Umsatz, Auslastung, No-Show-Rate, Top-Schüler – alle wichtigen Kennzahlen auf einen Blick.', alpha: 0.09 },
  { icon: '🎓', title: 'Prüfungsverwaltung', desc: 'Prüfungsdaten erfassen, Experten zuweisen und bewerten, Ergebnisse tracken. Alles dokumentiert.', alpha: 0.12 },
  { icon: '🚗', title: 'Fahrzeug-Management', desc: 'Fahrzeuge verwalten, Revisionsdaten tracken, Fahrtenbuch führen – automatisch und übersichtlich.', alpha: 0.07 },
  { icon: '📣', title: 'Affiliate-System', desc: 'Schüler empfehlen Freunde und erhalten Rabatte. Du gewinnst neue Kunden ohne komplizierten Marketingaufwand.', alpha: 0.11 },
  { icon: '🏫', title: 'Kursbuchungsseite', desc: 'Deine Schüler buchen und bezahlen Kurse direkt online – mit eigenem Link, Branding und integrierter Zahlung.', alpha: 0.08 },
  { icon: '🔔', title: 'Automatische Erinnerungen', desc: 'Lektionserinnerungen, Zahlungsfristen, Prüfungserinnerungen – Simy erinnert statt du.', alpha: 0.10 },
])

const automations = [
  { icon: '📧', label: 'Lektionserinnerungen', desc: 'Automatisch E-Mail mindestens 24h vor der Lektion.' },
  { icon: '🧾', label: 'Rechnungsversand', desc: 'Pendente Zahlung wird direkt bei der Buchung im Kundenportal erstellt und automatisch erinnert.' },
  { icon: '🔁', label: 'Mahnungen', desc: 'Offene Rechnungen kannst du mit wenigen Klicks mahnen.' },
  { icon: '📈', label: 'Wochenbericht', desc: 'Jeden Montag dein persönlicher Bericht mit Umsatz, Lektionen und Auslastung.' },
  { icon: '🎯', label: 'Zieltracking', desc: 'Fortschrittsziele für Schüler werden automatisch aktualisiert und gemeldet.' },
  { icon: '🗓️', label: 'Verfügbarkeit', desc: 'Schüler sehen nur freie Slots und buchen direkt online.' },
  { icon: '💬', label: 'Willkommensnachrichten', desc: 'Neue Schüler erhalten sofort alle Infos – ohne dein Zutun.' },
  { icon: '🏆', label: 'Prüfungsbestätigung', desc: 'Bestandene Prüfungen dokumentiert und dem Schüler gemeldet.' },
]

const personas = computed(() => [
  {
    icon: '🧑‍💼',
    title: 'Admin / Inhaber',
    subtitle: 'Du behältst den Überblick',
    color: primaryColor.value,
    bg: `rgba(var(--brand-rgb), 0.07)`,
    border: `rgba(var(--brand-rgb), 0.22)`,
    benefits: [
      'Umsatz & Auslastung in Echtzeit',
      'Alle Fahrlehrer im Überblick',
      'Automatische Rechnungen & Mahnungen',
      'DSGVO-konforme Datenverwaltung',
      'Zahlungseingänge auf einen Blick',
      'Eigenes Branding & Domain',
    ],
  },
  {
    icon: '👨‍🏫',
    title: 'Fahrlehrer / Staff',
    subtitle: 'Du fokussierst dich aufs Unterrichten',
    color: secondaryColor.value,
    bg: `rgba(var(--brand-2-rgb), 0.07)`,
    border: `rgba(var(--brand-2-rgb), 0.22)`,
    benefits: [
      'Stundenplan immer aktuell',
      'Schülerinfos jederzeit verfügbar',
      'Automatische Erinnerungen an Schüler',
      'Notizen & Fortschritts-Tracking',
      'Einfache Stundenverwaltung',
      'Mobile-optimiert für unterwegs',
    ],
  },
  {
    icon: '🧑‍🎓',
    title: 'Schüler',
    subtitle: 'Deine Schüler lieben die Einfachheit',
    color: accentColor.value,
    bg: `rgba(var(--brand-rgb), 0.05)`,
    border: `rgba(var(--brand-rgb), 0.15)`,
    benefits: [
      'Online buchen rund um die Uhr',
      'Automatische Lektionserinnerungen',
      'Bezahlen per TWINT, Debit- und Kreditkarte inkl. PostFinance',
      'Lernfortschritt immer im Blick',
      'Prüfungsinfos sofort sichtbar',
      'Kein App-Download nötig',
    ],
  },
])

const pricingPlans = [
  {
    name: 'Starter',
    tagline: 'Für Einzelfahrlehrer',
    price: '69',
    highlighted: true,
    featureList: ['1 Fahrlehrer', 'Alle Kernfeatures', 'Zahlungen & Rechnungen', 'Auswertungen', 'Prüfungsverwaltung', 'Support per E-Mail'],
  },
  {
    name: 'Professional',
    tagline: 'Für kleine Teams',
    price: '129',
    highlighted: false,
    featureList: ['Bis 3 Fahrlehrer', 'Alle Starter-Features', 'Multi-Staff Kalender', 'Erweiterte Auswertungen', 'Prioritäts-Support'],
  },
  {
    name: 'Enterprise',
    tagline: 'Für grosse Fahrschulen',
    price: '249',
    highlighted: false,
    featureList: ['Unbegrenzte Fahrlehrer', 'Alle Professional-Features', 'Dediziertes Onboarding', 'API-Zugang', 'SLA-Garantie'],
  },
]

const faqs = reactive([
  { q: 'Brauche ich eine Kreditkarte für den Trial?', a: 'Nein, der 60-Tage-Trial ist vollständig kostenlos und ohne Kreditkarte. Du wirst erst nach dem Trial zur Kasse gebeten – und kannst jederzeit kündigen.', open: false },
  { q: 'Wie funktioniert die Kündigung?', a: 'Du kannst monatlich kündigen. Die Kündigungsfrist beträgt 1 Monat auf Ende des laufenden Monats. Keine Jahresbindung, keine versteckten Kosten.', open: false },
  { q: 'Welche Zahlungsmethoden unterstützt Simy?', a: 'Für deine Schüler unterstützen wir TWINT, PostFinance, Kreditkarte und Banküberweisung – alles integriert und ohne extra Setup.', open: false },
  { q: 'Kann ich von einem Plan upgraden?', a: 'Ja, jederzeit. Dein Upgrade wird sofort aktiv und anteilig verrechnet. Du verlierst keine Daten.', open: false },
  { q: 'Sind meine Daten sicher?', a: 'Ja. Simy betreibt alle Daten auf Schweizer Servern, ist DSGVO-konform und verwendet Ende-zu-Ende-Verschlüsselung für sensible Daten.', open: false },
])

// ─── Interactive Email Demo ───────────────────────────────────────────────────
const schoolNameDemo = ref('Fahrschule Muster AG')
const demoEmail = ref('')
const activeTemplate = ref<'reminder' | 'invoice' | 'welcome'>('reminder')
const sendingDemo = ref(false)
const demoSentTemplates = ref<Set<string>>(new Set())
const demoError = ref('')

const demoSentCurrent = computed(() => demoSentTemplates.value.has(activeTemplate.value))

function getDemoReminderHtml(school: string, primary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">
        <tr><td style="background:${primary};padding:36px 30px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px 0;letter-spacing:1px;text-transform:uppercase;">Lektionserinnerung</p>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">${school}</h1>
        </td></tr>
        <tr><td style="padding:32px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo <strong>Anna</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Wir möchten dich an deine Fahrstunde <strong>morgen</strong> erinnern:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;width:40%;">📅 Datum</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Morgen, 09:00 Uhr</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">👤 Fahrlehrer</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Thomas Meier</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">📍 Treffpunkt</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Bahnhof Uster, Gleis 1</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">⏱ Dauer</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">90 Minuten</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="#" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                Termin bestätigen →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
            Diese Erinnerung wurde automatisch von Simy erstellt und versendet – ohne dass dein Fahrlehrer einen Finger rühren musste.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">${school} · Powered by <strong style="color:${primary}">Simy</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function getDemoInvoiceHtml(school: string, primary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">
        <tr><td style="background:${primary};padding:36px 30px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px 0;letter-spacing:1px;text-transform:uppercase;">Rechnung</p>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">${school}</h1>
        </td></tr>
        <tr><td style="padding:32px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo <strong>Anna</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Vielen Dank für deine Fahrstunde. Hier ist deine Rechnung:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:8px;">
            <tr><td style="padding:16px 24px 8px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">Fahrstunde (90 Min.)</td>
                  <td align="right" style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">CHF 115.–</td>
                </tr>
                <tr>
                  <td style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">VKU-Kurs Grundkurs</td>
                  <td align="right" style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">CHF 180.–</td>
                </tr>
                <tr>
                  <td style="color:#111827;font-size:15px;font-weight:700;padding:12px 0 8px 0;">Total</td>
                  <td align="right" style="color:${primary};font-size:18px;font-weight:800;padding:12px 0 8px 0;">CHF 295.–</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;margin:0 0 24px 0;text-align:right;">Fällig bis: 15.05.2025</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="#" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                Jetzt mit TWINT bezahlen →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
            Diese Rechnung wurde automatisch nach der Fahrstunde erstellt und versendet – du hast dafür keinen Aufwand.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">${school} · Powered by <strong style="color:${primary}">Simy</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function getDemoWelcomeHtml(school: string, primary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">
        <tr><td style="background:${primary};padding:36px 30px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px 0;letter-spacing:1px;text-transform:uppercase;">Willkommen</p>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">Willkommen bei ${school}!</h1>
        </td></tr>
        <tr><td style="padding:32px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo <strong>Anna</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Schön, dass du dich für uns entschieden hast! Alles was du brauchst – dein persönliches Schüler-Dashboard, Termine buchen und Zahlungen erledigen – findest du hier:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;width:40%;">✅ Konto erstellen</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Klick auf den Button unten</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">📅 Erste Stunde buchen</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Direkt im Dashboard</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">💳 Zahlung</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">TWINT, Karte oder Rechnung</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="#" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                Konto aktivieren →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
            Dieser Link ist 14 Tage gültig. Fragen? Melde dich jederzeit bei uns.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">${school} · Powered by <strong style="color:${primary}">Simy</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const demoEmailHtml = computed(() => {
  const school = schoolNameDemo.value.trim() || 'Fahrschule Muster AG'
  const primary = primaryColor.value
  const secondary = secondaryColor.value
  if (activeTemplate.value === 'reminder') return getDemoReminderHtml(school, primary)
  if (activeTemplate.value === 'invoice') return getDemoInvoiceHtml(school, primary)
  return getDemoWelcomeHtml(school, primary)
})

async function sendDemoEmail() {
  if (!demoEmail.value || sendingDemo.value || demoSentCurrent.value) return
  sendingDemo.value = true
  demoError.value = ''
  try {
    await $fetch('/api/demo/send-demo-email', {
      method: 'POST',
      body: {
        email: demoEmail.value,
        schoolName: schoolNameDemo.value.trim() || 'Fahrschule Muster AG',
        templateType: activeTemplate.value,
        primaryColor: primaryColor.value,
        secondaryColor: secondaryColor.value,
      },
    })
    demoSentTemplates.value = new Set([...demoSentTemplates.value, activeTemplate.value])
  } catch (err: any) {
    demoError.value = err?.data?.statusMessage || 'Fehler beim Senden. Bitte nochmals versuchen.'
  } finally {
    sendingDemo.value = false
  }
}
</script>
