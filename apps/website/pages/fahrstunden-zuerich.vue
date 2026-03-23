<template>
  <div>
    <Head>
      <Title>Fahrstunden Zürich ab CHF 95.- | Auto, Motorrad, Anhänger | Driving Team</Title>
      <Meta name="description" content="Fahrstunden Zürich ab CHF 95.-/Lektion ✓ Auto, Motorrad, Anhänger ✓ 85% Erfolgsquote ✓ Flexible Zeiten ✓ Online buchen! Professionelle Instruktoren in Zürich-Altstetten." />
      <Meta name="keywords" content="Fahrstunden Zürich, Fahrstunden Zürich Kosten, Auto Fahrstunden Zürich, Motorrad Fahrstunden Zürich, Anhänger Fahrstunden Zürich, Fahrstunden Zürich buchen, Fahrstunden Zürich Preis" />
      <Meta property="og:title" content="Fahrstunden Zürich ab CHF 95.- | Auto & Motorrad | Driving Team" />
      <Meta property="og:description" content="Professionelle Fahrstunden in Zürich ab CHF 95.-/Lektion. Auto, Motorrad, Anhänger. Flexible Zeiten, 85% Erfolgsquote. Jetzt online buchen!" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrstunden-zuerich/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/zuerich-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <Meta name="date" :content="new Date().toISOString()" />
    </Head>

    <!-- Breadcrumb Navigation -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrstunden', href: '/' }, { label: 'Zürich' }]" />
    
    <!-- ====== HERO SECTION - PREMIUM DESIGN ====== -->
    <section class="relative py-20 md:py-32 overflow-hidden">
      <!-- Background Gradient with Shapes -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900"></div>
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      
      <!-- Background Image -->
      <img src="/images/locations/zuerich-hero.webp" alt="Fahrstunden Zürich ab CHF 95.- – Auto, Motorrad, Anhänger mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-20" />
      <div class="absolute inset-0 bg-gradient-to-t from-primary-900/60 via-primary-800/40 to-transparent"></div>

      <!-- Content -->
      <div class="section-container relative z-10">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <!-- Text Content -->
          <div class="text-white">
            <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/20 hover:bg-white/20 transition">
              <span class="text-2xl">🎯</span>
              <span class="text-sm font-semibold">Fahrstunden Zürich</span>
            </div>
            
            <h1 class="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Fahrstunden<br/>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100">ab CHF 95.</span>
            </h1>
            
            <p class="text-lg text-white/90 mb-8 leading-relaxed max-w-lg">
              Auto, Motorrad & Anhänger in Zürich. Flexible Zeiten, erfahrene Instruktor:innen, 85% Erfolgsquote. Buche jetzt online Deine erste Fahrstunde.
            </p>
            
            <!-- Stats Row -->
            <div class="flex gap-8 mb-10">
              <div class="group">
                <p class="text-4xl font-black text-yellow-300 group-hover:scale-110 transition">85%</p>
                <p class="text-sm text-white/70">Erfolgsquote</p>
              </div>
              <div class="group">
                <p class="text-4xl font-black text-yellow-300 group-hover:scale-110 transition">6/7</p>
                <p class="text-sm text-white/70">Tage verfügbar</p>
              </div>
              <div class="group">
                <p class="text-4xl font-black text-yellow-300 group-hover:scale-110 transition">5+</p>
                <p class="text-sm text-white/70">Kategorien</p>
              </div>
            </div>
            
            <!-- CTA Buttons -->
            <div class="flex flex-col sm:flex-row gap-4">
              <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 bg-white text-primary-600 hover:bg-yellow-50 font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 hover:shadow-2xl shadow-lg text-lg">
                <span>✨</span> Jetzt buchen
              </a>
              <a href="#preise" class="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 font-bold py-4 px-8 rounded-xl transition border border-white/30 text-lg">
                <span>💰</span> Preise
              </a>
            </div>
          </div>

          <!-- Right Side - Feature Cards Grid -->
          <div class="hidden md:grid grid-cols-2 gap-4">
            <div class="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 hover:border-white/40 transition transform hover:scale-105">
              <p class="text-5xl mb-3 group-hover:scale-125 transition origin-left">🚗</p>
              <p class="font-bold mb-1 text-lg">Auto</p>
              <p class="text-sm text-white/70">CHF 95.-/45min</p>
            </div>
            <div class="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 hover:border-white/40 transition transform hover:scale-105">
              <p class="text-5xl mb-3 group-hover:scale-125 transition origin-left">🏍️</p>
              <p class="font-bold mb-1 text-lg">Motorrad</p>
              <p class="text-sm text-white/70">CHF 95.-/45min</p>
            </div>
            <div class="group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/15 hover:border-white/40 transition transform hover:scale-105">
              <p class="text-5xl mb-3 group-hover:scale-125 transition origin-left">🚐</p>
              <p class="font-bold mb-1 text-lg">Anhänger</p>
              <p class="text-sm text-white/70">CHF 120.-/45min</p>
            </div>
            <div class="group bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 backdrop-blur-md border border-yellow-300/40 rounded-2xl p-6 text-white hover:border-yellow-300/60 transition transform hover:scale-105">
              <p class="text-5xl mb-3 group-hover:scale-125 transition origin-left">⭐</p>
              <p class="font-bold mb-1 text-lg">4.9/5.0</p>
              <p class="text-sm text-white/70">368 Bewertungen</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== PRICING TABLE - PREMIUM ====== -->
    <section id="preise" class="py-20 bg-gradient-to-b from-white to-gray-50">
      <div class="max-w-6xl mx-auto px-4">
        <div class="text-center mb-16">
          <div class="inline-block mb-4 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
            💰 Transparente Preise
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-gray-900 mb-4">Fahrstunden-Preise Zürich</h2>
          <p class="text-lg text-gray-600 max-w-2xl mx-auto">
            Fair, wettbewerbsfähig, zielorientiert.
          </p>
        </div>
        
        <!-- Pricing Table -->
        <div class="overflow-x-auto rounded-2xl border border-gray-200 shadow-xl">
          <table class="w-full">
            <thead>
              <tr class="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                <th class="px-6 py-5 text-left font-bold text-lg">Kategorie</th>
                <th class="px-6 py-5 text-center font-bold text-lg">45 Min</th>
                <th class="px-6 py-5 text-center font-bold text-lg">90 Min</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr class="hover:bg-primary-50 transition">
                <td class="px-6 py-5 font-bold text-gray-900">🚗 Auto (B)</td>
                <td class="px-6 py-5 text-center"><span class="inline-block bg-green-100 text-green-700 font-bold px-4 py-2 rounded-lg">CHF 95.-</span></td>
                <td class="px-6 py-5 text-center"><span class="font-bold text-gray-900">CHF 190.-</span></td>
              </tr>
              <tr class="hover:bg-red-50 transition">
                <td class="px-6 py-5 font-bold text-gray-900">🏍️ Motorrad (A1/A35/A)</td>
                <td class="px-6 py-5 text-center"><span class="inline-block bg-red-100 text-red-700 font-bold px-4 py-2 rounded-lg">CHF 95.-</span></td>
                <td class="px-6 py-5 text-center"><span class="font-bold text-gray-900">CHF 190.-</span></td>
              </tr>
              <tr class="hover:bg-orange-50 transition">
                <td class="px-6 py-5 font-bold text-gray-900">🚐 Anhänger (BE)</td>
                <td class="px-6 py-5 text-center"><span class="inline-block bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-lg">CHF 120.-</span></td>
                <td class="px-6 py-5 text-center"><span class="font-bold text-gray-900">CHF 240.-</span></td>
              </tr>
              <tr class="bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-150 hover:to-gray-100 transition">
                <td colspan="2" class="px-6 py-5 font-bold text-gray-900">⚙️ Admin-/Versicherungspauschale</td>
                <td colspan="3" class="px-6 py-5 text-center font-bold text-primary-600">CHF 120.- (einmalig, für gesamte Ausbildung)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-10 grid md:grid-cols-3 gap-6">
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <p class="text-3xl mb-2">💚</p>
            <p class="font-bold text-gray-900 mb-2">Empfehlungs-Rabatte</p>
            <p class="text-sm text-gray-600">Empfehle einen Freund und erhalte 50.- Rabatt auf deine nächste Fahrstunde.</p>
          </div>
          <div class="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
            <p class="text-3xl mb-2">💳</p>
            <p class="font-bold text-gray-900 mb-2">Online Zahlung</p>
            <p class="text-sm text-gray-600">Online mit Twint, Debit- oder Kreditkarte.</p>
          </div>
          <div class="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
            <p class="text-3xl mb-2">✨</p>
            <p class="font-bold text-gray-900 mb-2">Keine Versteckten Kosten</p>
            <p class="text-sm text-gray-600">Alles ist in den Preisen enthalten: Fahrzeug, Benzin, Instruktor:in, Bestätigung etc.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== CATEGORIES - BEAUTIFUL CARDS ====== -->
    <section class="py-20 bg-white">
      <div class="max-w-6xl mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-black text-gray-900 mb-4">Welche Fahrstunden-Kategorie passt zu Dir?</h2>
          <p class="text-lg text-gray-600">Wähle die passende Fahrzeugklasse und starte noch heute</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Auto Card -->
          <div class="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-200 hover:border-primary-600 transition">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-primary-600 transform scale-x-0 group-hover:scale-x-100 transition origin-left"></div>
            <div class="relative p-8">
              <p class="text-6xl mb-6 group-hover:scale-125 transition origin-top-left">🚗</p>
              <h3 class="text-2xl font-bold text-gray-900 mb-3">Auto Fahrstunden</h3>
              <p class="text-gray-600 mb-6">Kategorie B Fahrstunden in Zürich mit modernen Fahrzeugen.</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-3 text-gray-700"><span class="text-primary-600 font-bold">✓</span> Automatik & Schaltung</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-primary-600 font-bold">✓</span> Flexible Zeiten</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-primary-600 font-bold">✓</span> CHF 95.-/Lektion</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-primary-600 font-bold">✓</span> 85% Erfolgsquote</li>
              </ul>
              <p class="text-3xl font-black text-primary-600 mb-4">CHF 95.-</p>
              <a href="/auto-fahrschule/" class="block w-full text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition">
                Auto Fahrstunden →
              </a>
            </div>
          </div>

          <!-- Motorrad Card -->
          <div class="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-200 hover:border-red-600 transition">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition origin-left"></div>
            <div class="relative p-8">
              <p class="text-6xl mb-6 group-hover:scale-125 transition origin-top-left">🏍️</p>
              <h3 class="text-2xl font-bold text-gray-900 mb-3">Motorrad Fahrstunden</h3>
              <p class="text-gray-600 mb-6">A1, A35kW oder A Kategorien in Zürich lernen.</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-3 text-gray-700"><span class="text-red-600 font-bold">✓</span> A1, A35kW, A</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-red-600 font-bold">✓</span> Erfahrene Instruktoren</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-red-600 font-bold">✓</span> CHF 95.-/Lektion</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-red-600 font-bold">✓</span> Moderne Fahrzeuge</li>
              </ul>
              <p class="text-3xl font-black text-red-600 mb-4">CHF 95.-</p>
              <a href="/motorrad-fahrschule/" class="block w-full text-center bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition">
                Motorrad Fahrstunden →
              </a>
            </div>
          </div>

          <!-- Anhänger Card -->
          <div class="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-200 hover:border-orange-600 transition">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition origin-left"></div>
            <div class="relative p-8">
              <p class="text-6xl mb-6 group-hover:scale-125 transition origin-top-left">🚐</p>
              <h3 class="text-2xl font-bold text-gray-900 mb-3">Anhänger Fahrstunden</h3>
              <p class="text-gray-600 mb-6">Kategorie BE für sicheres Fahren mit Anhängerzug.</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-3 text-gray-700"><span class="text-orange-600 font-bold">✓</span> Kategorie BE</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-orange-600 font-bold">✓</span> Professionelle Schulung</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-orange-600 font-bold">✓</span> CHF 120.-/Lektion</li>
                <li class="flex items-center gap-3 text-gray-700"><span class="text-orange-600 font-bold">✓</span> Kleine Gruppen möglich</li>
              </ul>
              <p class="text-3xl font-black text-orange-600 mb-4">CHF 120.-</p>
              <a href="/anhaenger-fahrschule/" class="block w-full text-center bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition">
                Anhänger Fahrstunden →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Us -->
    <FeatureSection
      title="Warum Fahrstunden bei Driving Team Zürich?"
      subtitle="Professionelle Fahrausbildung mit 85% Erfolgsquote. Erfahrene Instruktoren, moderne Fahrzeuge, flexible Zeiten – alles zum besten Preis in Zürich."
      :extras="['Fahrstunden in Englisch & Albanisch verfügbar!']"
    />

    <!-- Team -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- Location Info -->
    <div class="bg-gray-50">
      <StandortMapSection location-key="zuerich" />
    </div>

    <!-- ====== FAQ - 15+ QUESTIONS ====== -->
    <section class="py-20 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <div class="text-center mb-16">
          <div class="inline-block mb-4 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
            ❓ FAQ
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-gray-900 mb-4">Häufig gestellte Fragen</h2>
          <p class="text-lg text-gray-600">Alles was du über Fahrstunden in Zürich wissen musst</p>
        </div>
        
        <div class="space-y-4">
          <!-- Q1 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>💰 Wie viel kosten Fahrstunden in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Auto Fahrstunden kosten CHF 95.- pro 45-Minuten-Lektion in Zürich. Motorrad kostet CHF 95.- und Anhänger CHF 120.-. Hinzu kommt eine einmalige Pauschale von CHF 120.- für die Admin und Versicherung über die gesamte Fahrausbildung (nicht Motorrad).</p>
          </details>

          <!-- Q2 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>📅 Kann ich Fahrstunden in Zürich flexibel buchen?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Ja! Wir bieten Fahrstunden 6 Tage die Woche an – Morgen, Mittag, Abend. Buche einfach online über unser Buchungssystem. Wähle Datum, Uhrzeit und deine Kategorie. Du erhältst sofort eine Bestätigung. Da wir ein Fahrlehrer-Team sind findest du immer einen freien Termin</p>
          </details>

          <!-- Q3 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🚀 Wie buche ich meine erste Fahrstunde in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Sehr einfach: Klick auf "Jetzt buchen", registriere Dich in unserem System, wähle Dein Wunschdatum und -uhrzeit aus. Bestätige die Buchung. Du erhältst sofort eine Bestätigung per Email mit allen Details und Treffpunkt.</p>
          </details>

          <!-- Q4 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>📊 Wie viele Fahrstunden brauche ich in Zürich bis zur Prüfung?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Das hängt stark von dir ab. Durchschnittlich benötigen Auto-Fahrschüler in Zürich zwischen 15-30 Fahrstunden. Mit regelmässigen privaten Übungen (2-4x pro Woche) und den Tipps unserer Instruktoren erreichst du dein Ziel schneller.</p>
          </details>

          <!-- Q5 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>❌ Kann ich eine Fahrstunde in Zürich stornieren?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Ja, Stornierungen sind möglich. Bitte sage die Fahrstunde direkt im App mindestens 24 Stunden vor der geplanten Fahrstunde ab, falls du absagen möchtest. Bei kurzfristigen Absagen (unter 24 Stunden) können wir die Fahrstunde verrechnen.</p>
          </details>

          <!-- Q6 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🌍 Sind Fahrstunden in anderen Sprachen in Zürich verfügbar?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Ja! Wir bieten Fahrstunden in Englisch und Albanisch an. Falls du eine andere Sprache brauchst, sprich uns einfach an – wir versuchen, eine Lösung für dich zu finden.</p>
          </details>

          <!-- Q7 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🚗 Welche Fahrzeuge werden bei den Fahrstunden in Zürich verwendet?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Wir nutzen moderne, gut gewartete Fahrzeuge mit Doppelbedienung der Marke Seat und Audi. Alle Autos sind regelmässig gewartet und Vollkasko versichert. Bei Bedarf findest du auch ein Schaltgetriebe-Fahrzeug für deine Fahrstunden in Zürich.</p>
          </details>

          <!-- Q8 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🎯 Was sollte ich zur ersten Fahrstunde in Zürich mitbringen?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <div class="text-gray-600 px-6 pb-5 text-sm leading-relaxed space-y-2">
              <p>Zur ersten Fahrstunde in Zürich solltest du folgende Dinge mitbringen:</p>
              <ul class="list-disc pl-5 space-y-1"><li>Deinen Lernfahrausweis (sehr wichtig!)</li><li>Bequeme Kleidung und geeignete Schuhe (keine Flip-Flops oder Sandalen)</li><li>Eine Brille (falls du eine benötigst)</li></ul>
            </div>
          </details>

          <!-- Q9 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🏆 Wie bereite ich mich optimal auf die Fahrprüfung vor (Fahrstunden Zürich)?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <div class="text-gray-600 px-6 pb-5 text-sm leading-relaxed space-y-2">
              <p>Mit diesen Tipps bist du bestens vorbereitet:</p>
              <ul class="list-disc pl-5 space-y-1"><li>Regelmässige Fahrstunden: 2-4x pro Woche sind optimal</li><li>Private Lernfahrten mit einem erfahrenen Begleiter</li><li>Theorie lernen: Verkehrsregeln gut kennen und verstehen</li><li>Die Tipps deines Fahrlehrers ernst nehmen und konsequent anwenden</li></ul>
            </div>
          </details>

          <!-- Q10 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>💡 Soll ich Fahrstunden mit Automatik oder Schaltung machen?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Das muss jeder für sich selbst entscheiden. Rechtlich gesehen darfst du nach bestandener Prüfung mit beiden fahren. Wir empfehlen: Wenn möglich, ein paar Fahrstunden auf Schaltung machen – das hilft dir in Notfallsituationen und im Ausland.</p>
          </details>

          <!-- Q11 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>📍 Wo genau finden die Fahrstunden in Zürich statt?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Unsere Fahrstunden in Zürich finden hauptsächlich in Zürich-Altstetten statt – unserem Hauptstandort. Das Tätigkeitsgebiet erstreckt sich von Baden über Thalwil bis nach Dübendorf. Flexible Treffpunkte sind möglich – wir holen dich gerne zu Hause oder bei der Arbeit nach Möglichkeitab.</p>
          </details>

          <!-- Q12 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🎓 Welche Ausbildung haben eure Fahrlehrer in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Alle unsere Fahrlehrer:innen in Zürich haben eine vollumfängliche Ausbildung mit eidgenössischem Fachausweis absolviert. Zusätzlich besuchen sie jedes Jahr mindestens einen Weiterbildungstag. Kompetenz ist unsere Stärke!</p>
          </details>

          <!-- Q13 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>💳 Welche Zahlungsarten akzeptiert ihr für Fahrstunden in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Wir akzeptieren online Zahlung. Alle gängigen Zahlungsarten werden unterstützt. Du kannst die Fahrstunden direkt nach der Buchung online bezahlen.</p>
          </details>

          <!-- Q14 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>⏰ Wie lange dauert eine Fahrstunde in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Eine Standard-Fahrstunde in Zürich dauert 45 Minuten. Dahinter steckt eine psychologische Komponente – die Konzentration lässt nach dieser Zeit nach. Du kannst aber auch 90-Minuten buchen, wenn du möchtest. Je nach Übungsgebiet und Ausbildungsstand kann dies Sinn machen.</p>
          </details>

          <!-- Q15 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🎁 Gibt es Rabatte für Fahrstunden-Pakete in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Nein, aber für eine nachweisbare Empfehlung bekommst du 50.- Rabatt auf deine nächste Fahrstunde. </p>
          </details>

          <!-- Q16 -->
          <details class="group bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition cursor-pointer">
            <summary class="font-bold text-gray-900 flex justify-between items-center px-6 py-5 select-none group-open:bg-primary-50">
              <span>🏅 Wie hoch ist eure Erfolgsquote bei Fahrstunden in Zürich?</span>
              <span class="text-primary-600 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 px-6 pb-5 text-sm leading-relaxed">Wir sind stolz auf unsere 85% Erfolgsquote bei der Fahrprüfung! Das ist deutlich über dem Schweizer Durchschnitt. Unsere Erfolgsgeheimnis: Professionelle Fahrlehrer:innen, regelmässige Übungen und persönliches Coaching.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Warum Section - Fahrstunden Zürich Keywords -->
    <WarumSection category="fahrstunden-zuerich" />

    <!-- Reviews - Social Proof VOR Booking CTA! -->
    <ReviewsSection category="zuerich" />

    <!-- Booking CTA - Nach Social Proof für höhere Conversion -->
    <section class="py-20 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h2 class="text-4xl md:text-5xl font-black mb-6">Bereit für Deine erste Fahrstunde in Zürich?</h2>
        <p class="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          Buche jetzt ganz einfach online. Flexible Zeiten, professionelle Instruktoren, 85% Erfolgsquote. Los geht's!
        </p>
        <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="inline-block bg-white text-primary-600 hover:bg-primary-50 font-bold py-4 px-12 rounded-xl transition text-lg transform hover:scale-105 shadow-2xl">
          → Fahrstunde buchen
        </a>
      </div>
    </section>

    <!-- Other Locations -->
    <StandorteSection exclude="zuerich" />

    <!-- Final CTA -->
    <CtaSection title="Fahrstunden Zürich – Deine Fahrschule!" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Fahrstunden Zürich - Driving Team",
    "description": "Professionelle Fahrstunden in Zürich ab CHF 95.-/Lektion. Auto, Motorrad, Anhänger mit erfahrenen Fahrlehrern.",
    "url": "https://drivingteam.ch/fahrstunden-zuerich/",
    "telephone": "+41444310033",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Baslerstrasse 145",
      "addressLocality": "Zürich",
      "postalCode": "8048",
      "addressCountry": "CH"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 47.3905,
      "longitude": 8.4877
    },
    "priceRange": "CHF 95-150",
    "sameAs": ["https://drivingteam.ch"]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    "itemReviewed": {
      "@type": "LocalBusiness",
      "name": "Fahrstunden Zürich - Driving Team",
      "url": "https://drivingteam.ch/fahrstunden-zuerich/"
    },
    "ratingValue": 4.9,
    "bestRating": 5,
    "worstRating": 1,
    "ratingCount": 366,
    "reviewCount": 366
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://drivingteam.ch/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Fahrstunden Zürich",
        "item": "https://drivingteam.ch/fahrstunden-zuerich/"
      }
    ]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Wie viel kosten Fahrstunden in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Auto Fahrstunden kosten ab CHF 95.-/45min. Motorrad ab CHF 120.- und Anhänger ab CHF 140.-. Pauschale CHF 150.- einmalig." } },
      { "@type": "Question", "name": "Kann ich Fahrstunden in Zürich flexibel buchen?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, 7 Tage die Woche. Buche online Morgen, Mittag oder Abend." } },
      { "@type": "Question", "name": "Wie buche ich meine erste Fahrstunde in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Klick auf 'Jetzt buchen', registriere Dich, wähle Datum/Uhrzeit, bestätige. Sofort Bestätigung per Email." } },
      { "@type": "Question", "name": "Wie viele Fahrstunden brauche ich in Zürich?", "acceptedAnswer": { "@type": "Answer", "text": "Durchschnittlich 15-30 Fahrstunden. Mit regelmässigen Übungen erreichst du dein Ziel schneller." } },
      { "@type": "Question", "name": "Kann ich eine Fahrstunde in Zürich stornieren?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, mit mindestens 24 Stunden Vorankündigung. Bei Kurzfristigen Absagen können Kosten anfallen." } }
    ]
  }) }
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

definePageMeta({
  layout: 'default'
})

const instructors = getInstructorsByLocation('zuerich')
</script>
