<template>
  <div>
    <Head>
      <Title>Fahrschule Kategorien Vergleich | Auto, Motorrad, LKW | Driving Team</Title>
      <Meta name="description" content="Fahrschule Kategorien Vergleich - Auto, Motorrad, Lastwagen, Bus, Taxi, Anhänger, Motorboot. Kosten, Dauer, Anforderungen. Welche passt zu dir?" />
      <Meta property="og:title" content="Fahrschule Kategorien - Vergleich aller Kategorien" />
      <Meta property="og:description" content="Vergleich aller Fahrschule Kategorien: Kosten, Dauer, Anforderungen. Finde die richtige Ausbildung für dich." />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-kategorien/" />
      
      <!-- JSON-LD Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Fahrschule Kategorien Vergleich",
        "description": "Vergleich aller Fahrschule Kategorien mit Kosten, Dauer und Anforderungen",
        "url": "https://drivingteam.ch/fahrschule-kategorien/",
        "hasPart": [
          {"@type": "Course", "name": "Auto Fahrschule - Kategorie B"},
          {"@type": "Course", "name": "Motorrad Fahrschule - Kategorie A1/A35kW/A"},
          {"@type": "Course", "name": "Lastwagen Fahrschule - Kategorie C1/C/CE"},
          {"@type": "Course", "name": "Bus Fahrschule - Kategorie D1/D"},
          {"@type": "Course", "name": "Taxi Fahrschule - Kategorie BPT"},
          {"@type": "Course", "name": "Anhänger Fahrschule - Kategorie BE"},
          {"@type": "Course", "name": "Motorboot Fahrschule - Kategorie A"}
        ]
      }
      </Script>
      
      <!-- BreadcrumbList Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/"},
          {"@type": "ListItem", "position": 2, "name": "Fahrschule Kategorien", "item": "https://drivingteam.ch/fahrschule-kategorien/"}
        ]
      }
      </Script>
    </Head>

    <h1 class="sr-only">Fahrschule Kategorien Vergleich</h1>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-500 to-primary-700 text-white py-16 md:py-24">
      <div class="section-container">
        <div class="max-w-4xl">
          <h2 class="text-3xl md:text-5xl font-bold mb-6">Welche Fahrschule passt zu dir?</h2>
          <p class="text-lg md:text-xl text-primary-100 mb-8">
            Vergleiche alle Fahrschule Kategorien: Kosten, Dauer, Anforderungen und Unterschiede. 
            Finde die richtige Ausbildung für deine Fahrkarriere.
          </p>
        </div>
      </div>
    </section>

    <!-- Comparison Table Section -->
    <section class="section-container py-16">
      <h2 class="text-3xl font-bold mb-12 text-center">Fahrschule Kategorien im Überblick</h2>
      
      <!-- Desktop Table (hidden on mobile) -->
      <div class="hidden md:block overflow-x-auto mb-12">
        <table class="w-full">
          <thead>
            <tr class="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <th class="px-6 py-4 text-left font-bold">Kategorie</th>
              <th class="px-6 py-4 text-left font-bold">Mindestalter</th>
              <th class="px-6 py-4 text-left font-bold">Fahrstunden (ca.)</th>
              <th class="px-6 py-4 text-left font-bold">Kosten (ca.)</th>
              <th class="px-6 py-4 text-left font-bold">Dauer (ca.)</th>
              <th class="px-6 py-4 text-center font-bold">Link</th>
            </tr>
          </thead>
          <tbody>
            <!-- Auto -->
            <tr class="border-b border-gray-200 hover:bg-primary-50 transition">
              <td class="px-6 py-4 font-semibold text-gray-900">🚗 Auto (B)</td>
              <td class="px-6 py-4 text-gray-600">18 Jahre</td>
              <td class="px-6 py-4 text-gray-600">15-25</td>
              <td class="px-6 py-4 text-gray-600">CHF 2'500–3'500</td>
              <td class="px-6 py-4 text-gray-600">6-12 Monate</td>
              <td class="px-6 py-4 text-center"><a href="/auto-fahrschule/" class="text-primary-600 hover:text-primary-700 font-bold">→</a></td>
            </tr>
            
            <!-- Motorrad -->
            <tr class="border-b border-gray-200 hover:bg-red-50 transition">
              <td class="px-6 py-4 font-semibold text-gray-900">🏍️ Motorrad (A1/A35/A)</td>
              <td class="px-6 py-4 text-gray-600">15/18/20+</td>
              <td class="px-6 py-4 text-gray-600">10-15</td>
              <td class="px-6 py-4 text-gray-600">CHF 1'500–2'000</td>
              <td class="px-6 py-4 text-gray-600">6-18 Monate</td>
              <td class="px-6 py-4 text-center"><a href="/motorrad-fahrschule/" class="text-primary-600 hover:text-primary-700 font-bold">→</a></td>
            </tr>
            
            <!-- Lastwagen -->
            <tr class="border-b border-gray-200 hover:bg-yellow-50 transition">
              <td class="px-6 py-4 font-semibold text-gray-900">🚛 Lastwagen (C1/C/CE)</td>
              <td class="px-6 py-4 text-gray-600">18+</td>
              <td class="px-6 py-4 text-gray-600">20-30</td>
              <td class="px-6 py-4 text-gray-600">CHF 4'000–7'000</td>
              <td class="px-6 py-4 text-gray-600">3-6 Monate</td>
              <td class="px-6 py-4 text-center"><a href="/lastwagen-fahrschule/" class="text-primary-600 hover:text-primary-700 font-bold">→</a></td>
            </tr>
            
            <!-- Bus -->
            <tr class="border-b border-gray-200 hover:bg-green-50 transition">
              <td class="px-6 py-4 font-semibold text-gray-900">🚌 Bus (D1/D)</td>
              <td class="px-6 py-4 text-gray-600">21+</td>
              <td class="px-6 py-4 text-gray-600">20-52</td>
              <td class="px-6 py-4 text-gray-600">CHF 4'000–12'000</td>
              <td class="px-6 py-4 text-gray-600">3-12 Monate</td>
              <td class="px-6 py-4 text-center"><a href="/bus-fahrschule/" class="text-primary-600 hover:text-primary-700 font-bold">→</a></td>
            </tr>
            
            <!-- Taxi -->
            <tr class="border-b border-gray-200 hover:bg-purple-50 transition">
              <td class="px-6 py-4 font-semibold text-gray-900">🚕 Taxi (BPT)</td>
              <td class="px-6 py-4 text-gray-600">19 Jahre</td>
              <td class="px-6 py-4 text-gray-600">10-20</td>
              <td class="px-6 py-4 text-gray-600">CHF 1'000–2'000</td>
              <td class="px-6 py-4 text-gray-600">3-12 Monate</td>
              <td class="px-6 py-4 text-center"><a href="/taxi-fahrschule/" class="text-primary-600 hover:text-primary-700 font-bold">→</a></td>
            </tr>
            
            <!-- Anhänger -->
            <tr class="border-b border-gray-200 hover:bg-orange-50 transition">
              <td class="px-6 py-4 font-semibold text-gray-900">🚘 Anhänger (BE)</td>
              <td class="px-6 py-4 text-gray-600">18 Jahre</td>
              <td class="px-6 py-4 text-gray-600">8-15</td>
              <td class="px-6 py-4 text-gray-600">CHF 1'000–2'000</td>
              <td class="px-6 py-4 text-gray-600">1-3 Monate</td>
              <td class="px-6 py-4 text-center"><a href="/anhaenger-fahrschule/" class="text-primary-600 hover:text-primary-700 font-bold">→</a></td>
            </tr>
            
            <!-- Motorboot -->
            <tr class="border-b border-gray-200 hover:bg-cyan-50 transition">
              <td class="px-6 py-4 font-semibold text-gray-900">⛵ Motorboot (A)</td>
              <td class="px-6 py-4 text-gray-600">18 Jahre</td>
              <td class="px-6 py-4 text-gray-600">20-30</td>
              <td class="px-6 py-4 text-gray-600">CHF 2'000–3'000</td>
              <td class="px-6 py-4 text-gray-600">2-6 Monate</td>
              <td class="px-6 py-4 text-center"><a href="/motorboot/" class="text-primary-600 hover:text-primary-700 font-bold">→</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards (shown only on mobile) -->
      <div class="md:hidden space-y-4 mb-12">
        <!-- Auto Card -->
        <div class="bg-white rounded-lg border-l-4 border-primary-600 p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">🚗 Auto</h3>
            <span class="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded">B</span>
          </div>
          <div class="space-y-1 text-sm text-gray-600 mb-3">
            <p><span class="font-semibold">Alter:</span> 18 Jahre</p>
            <p><span class="font-semibold">Fahrstunden:</span> 15-25</p>
            <p><span class="font-semibold">Kosten:</span> CHF 2'500–3'500</p>
            <p><span class="font-semibold">Dauer:</span> 6-12 Monate</p>
          </div>
          <a href="/auto-fahrschule/" class="text-primary-600 font-bold hover:text-primary-700">Mehr erfahren →</a>
        </div>

        <!-- Motorrad Card -->
        <div class="bg-white rounded-lg border-l-4 border-red-600 p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">🏍️ Motorrad</h3>
            <span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">A1/A35/A</span>
          </div>
          <div class="space-y-1 text-sm text-gray-600 mb-3">
            <p><span class="font-semibold">Alter:</span> 15/18/20+</p>
            <p><span class="font-semibold">Fahrstunden:</span> 10-15</p>
            <p><span class="font-semibold">Kosten:</span> CHF 1'500–2'000</p>
            <p><span class="font-semibold">Dauer:</span> 6-18 Monate</p>
          </div>
          <a href="/motorrad-fahrschule/" class="text-primary-600 font-bold hover:text-primary-700">Mehr erfahren →</a>
        </div>

        <!-- Lastwagen Card -->
        <div class="bg-white rounded-lg border-l-4 border-yellow-600 p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">🚛 Lastwagen</h3>
            <span class="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded">C1/C/CE</span>
          </div>
          <div class="space-y-1 text-sm text-gray-600 mb-3">
            <p><span class="font-semibold">Alter:</span> 18+</p>
            <p><span class="font-semibold">Fahrstunden:</span> 20-30</p>
            <p><span class="font-semibold">Kosten:</span> CHF 4'000–7'000</p>
            <p><span class="font-semibold">Dauer:</span> 3-6 Monate</p>
          </div>
          <a href="/lastwagen-fahrschule/" class="text-primary-600 font-bold hover:text-primary-700">Mehr erfahren →</a>
        </div>

        <!-- Bus Card -->
        <div class="bg-white rounded-lg border-l-4 border-green-600 p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">🚌 Bus</h3>
            <span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">D1/D</span>
          </div>
          <div class="space-y-1 text-sm text-gray-600 mb-3">
            <p><span class="font-semibold">Alter:</span> 21+</p>
            <p><span class="font-semibold">Fahrstunden:</span> 20-52</p>
            <p><span class="font-semibold">Kosten:</span> CHF 4'000–12'000</p>
            <p><span class="font-semibold">Dauer:</span> 3-12 Monate</p>
          </div>
          <a href="/bus-fahrschule/" class="text-primary-600 font-bold hover:text-primary-700">Mehr erfahren →</a>
        </div>

        <!-- Taxi Card -->
        <div class="bg-white rounded-lg border-l-4 border-purple-600 p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">🚕 Taxi</h3>
            <span class="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">BPT</span>
          </div>
          <div class="space-y-1 text-sm text-gray-600 mb-3">
            <p><span class="font-semibold">Alter:</span> 19 Jahre</p>
            <p><span class="font-semibold">Fahrstunden:</span> 10-20</p>
            <p><span class="font-semibold">Kosten:</span> CHF 1'000–2'000</p>
            <p><span class="font-semibold">Dauer:</span> 3-12 Monate</p>
          </div>
          <a href="/taxi-fahrschule/" class="text-primary-600 font-bold hover:text-primary-700">Mehr erfahren →</a>
        </div>

        <!-- Anhänger Card -->
        <div class="bg-white rounded-lg border-l-4 border-orange-600 p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">🚘 Anhänger</h3>
            <span class="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">BE</span>
          </div>
          <div class="space-y-1 text-sm text-gray-600 mb-3">
            <p><span class="font-semibold">Alter:</span> 18 Jahre</p>
            <p><span class="font-semibold">Fahrstunden:</span> 8-15</p>
            <p><span class="font-semibold">Kosten:</span> CHF 1'000–2'000</p>
            <p><span class="font-semibold">Dauer:</span> 1-3 Monate</p>
          </div>
          <a href="/anhaenger-fahrschule/" class="text-primary-600 font-bold hover:text-primary-700">Mehr erfahren →</a>
        </div>

        <!-- Motorboot Card -->
        <div class="bg-white rounded-lg border-l-4 border-cyan-600 p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-lg">⛵ Motorboot</h3>
            <span class="text-xs bg-cyan-100 text-cyan-600 px-2 py-1 rounded">A</span>
          </div>
          <div class="space-y-1 text-sm text-gray-600 mb-3">
            <p><span class="font-semibold">Alter:</span> 18 Jahre</p>
            <p><span class="font-semibold">Fahrstunden:</span> 20-30</p>
            <p><span class="font-semibold">Kosten:</span> CHF 2'000–3'000</p>
            <p><span class="font-semibold">Dauer:</span> 2-6 Monate</p>
          </div>
          <a href="/motorboot/" class="text-primary-600 font-bold hover:text-primary-700">Mehr erfahren →</a>
        </div>
      </div>

      <p class="text-center text-gray-600 text-sm italic">
        * Alle Angaben sind ungefähre Richtwerte. Die tatsächlichen Kosten und Dauer hängen von deinem persönlichen Lernfortschritt ab.
      </p>
    </section>

    <!-- Detailed Cards Section -->
    <section class="section-container py-16 bg-gray-50">
      <h2 class="text-3xl font-bold mb-12 text-center">Detaillierte Kategorien-Übersicht</h2>
      
      <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <!-- Auto Card -->
        <div class="bg-white rounded-xl p-8 shadow-sm border-l-4 border-primary-600">
          <h3 class="text-2xl font-bold text-primary-600 mb-4">🚗 Auto Fahrschule</h3>
          <p class="text-gray-600 mb-4">Kategorie B - Der Klassiker für Anfänger und Umsteiger</p>
          <ul class="space-y-2 mb-6 text-sm">
            <li class="flex gap-2"><span class="text-primary-600">✓</span> <span>18+ Jahre</span></li>
            <li class="flex gap-2"><span class="text-primary-600">✓</span> <span>Durchschnittlich 15-25 Fahrstunden</span></li>
            <li class="flex gap-2"><span class="text-primary-600">✓</span> <span>CHF 2'500–3'500 Gesamtkosten</span></li>
            <li class="flex gap-2"><span class="text-primary-600">✓</span> <span>6-12 Monate Ausbildungsdauer</span></li>
          </ul>
          <a href="/auto-fahrschule/" class="inline-block bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition" aria-label="Mehr zur Auto Fahrschule erfahren">
            Mehr erfahren →
          </a>
        </div>

        <!-- Motorrad Card -->
        <div class="bg-white rounded-xl p-8 shadow-sm border-l-4 border-red-600">
          <h3 class="text-2xl font-bold text-red-600 mb-4">🏍️ Motorrad Fahrschule</h3>
          <p class="text-gray-600 mb-4">Kategorie A1/A35kW/A - Sicher auf zwei Rädern</p>
          <ul class="space-y-2 mb-6 text-sm">
            <li class="flex gap-2"><span class="text-red-600">✓</span> <span>15/18/20+ Jahre (je nach Kategorie)</span></li>
            <li class="flex gap-2"><span class="text-red-600">✓</span> <span>10-15 Fahrstunden durchschnittlich</span></li>
            <li class="flex gap-2"><span class="text-red-600">✓</span> <span>CHF 1'500–2'000 Gesamtkosten</span></li>
            <li class="flex gap-2"><span class="text-red-600">✓</span> <span>6-18 Monate Ausbildungsdauer</span></li>
          </ul>
          <a href="/motorrad-fahrschule/" class="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition" aria-label="Mehr zur Motorrad Fahrschule erfahren">
            Mehr erfahren →
          </a>
        </div>

        <!-- Lastwagen Card -->
        <div class="bg-white rounded-xl p-8 shadow-sm border-l-4 border-yellow-600">
          <h3 class="text-2xl font-bold text-yellow-600 mb-4">🚛 Lastwagen Fahrschule</h3>
          <p class="text-gray-600 mb-4">Kategorie C1/C/CE - Professionelle Lkw-Ausbildung</p>
          <ul class="space-y-2 mb-6 text-sm">
            <li class="flex gap-2"><span class="text-yellow-600">✓</span> <span>18+§ Jahre (je nach Kategorie)</span></li>
            <li class="flex gap-2"><span class="text-yellow-600">✓</span> <span>20-30 Fahrstunden + CZV Kurse</span></li>
            <li class="flex gap-2"><span class="text-yellow-600">✓</span> <span>CHF 4'000–7'000 Gesamtkosten</span></li>
            <li class="flex gap-2"><span class="text-yellow-600">✓</span> <span>3-6 Monate Ausbildungsdauer</span></li>
          </ul>
          <a href="/lastwagen-fahrschule/" class="inline-block bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition" aria-label="Mehr zur Lastwagen Fahrschule erfahren">
            Mehr erfahren →
          </a>
        </div>

        <!-- Bus Card -->
        <div class="bg-white rounded-xl p-8 shadow-sm border-l-4 border-green-600">
          <h3 class="text-2xl font-bold text-green-600 mb-4">🚌 Bus Fahrschule</h3>
          <p class="text-gray-600 mb-4">Kategorie D1/D - Professionelle Busfahrer-Ausbildung</p>
          <ul class="space-y-2 mb-6 text-sm">
            <li class="flex gap-2"><span class="text-green-600">✓</span> <span>21+ Jahre (je nach Kategorie)</span></li>
            <li class="flex gap-2"><span class="text-green-600">✓</span> <span>20-52 Fahrstunden + Kurse</span></li>
            <li class="flex gap-2"><span class="text-green-600">✓</span> <span>CHF 4'000–12'000 Gesamtkosten</span></li>
            <li class="flex gap-2"><span class="text-green-600">✓</span> <span>3-12 Monate Ausbildungsdauer</span></li>
          </ul>
          <a href="/bus-fahrschule/" class="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition" aria-label="Mehr zur Bus Fahrschule erfahren">
            Mehr erfahren →
          </a>
        </div>

        <!-- Taxi Card -->
        <div class="bg-white rounded-xl p-8 shadow-sm border-l-4 border-purple-600">
          <h3 class="text-2xl font-bold text-purple-600 mb-4">🚕 Taxi Fahrschule</h3>
          <p class="text-gray-600 mb-4">BPT 121/122 - Professionelle Taxifahrer-Ausbildung</p>
          <ul class="space-y-2 mb-6 text-sm">
            <li class="flex gap-2"><span class="text-purple-600">✓</span> <span>19+ Jahre + Auto Führerschein</span></li>
            <li class="flex gap-2"><span class="text-purple-600">✓</span> <span>10-20 Fahrstunden + Theorie</span></li>
            <li class="flex gap-2"><span class="text-purple-600">✓</span> <span>CHF 1'000–2'000 Gesamtkosten</span></li>
            <li class="flex gap-2"><span class="text-purple-600">✓</span> <span>3-12 Monate Ausbildungsdauer</span></li>
          </ul>
          <a href="/taxi-fahrschule/" class="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition" aria-label="Mehr zur Taxi Fahrschule erfahren">
            Mehr erfahren →
          </a>
        </div>

        <!-- Anhänger Card -->
        <div class="bg-white rounded-xl p-8 shadow-sm border-l-4 border-orange-600">
          <h3 class="text-2xl font-bold text-orange-600 mb-4">🚘 Anhänger Fahrschule</h3>
          <p class="text-gray-600 mb-4">Kategorie BE - Sicheres Fahren mit Anhänger</p>
          <ul class="space-y-2 mb-6 text-sm">
            <li class="flex gap-2"><span class="text-orange-600">✓</span> <span>18+ Jahre + Auto Führerschein</span></li>
            <li class="flex gap-2"><span class="text-orange-600">✓</span> <span>8-15 Fahrstunden durchschnittlich</span></li>
            <li class="flex gap-2"><span class="text-orange-600">✓</span> <span>CHF 1'000–2'000 Gesamtkosten</span></li>
            <li class="flex gap-2"><span class="text-orange-600">✓</span> <span>1-3 Monate Ausbildungsdauer</span></li>
          </ul>
          <a href="/anhaenger-fahrschule/" class="inline-block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition" aria-label="Mehr zur Anhänger Fahrschule erfahren">
            Mehr erfahren →
          </a>
        </div>

        <!-- Motorboot Card -->
        <div class="bg-white rounded-xl p-8 shadow-sm border-l-4 border-cyan-600">
          <h3 class="text-2xl font-bold text-cyan-600 mb-4">⛵ Motorboot Fahrschule</h3>
          <p class="text-gray-600 mb-4">Kategorie A - Sicher auf dem Wasser</p>
          <ul class="space-y-2 mb-6 text-sm">
            <li class="flex gap-2"><span class="text-cyan-600">✓</span> <span>18+ Jahre</span></li>
            <li class="flex gap-2"><span class="text-cyan-600">✓</span> <span>20-30 Fahrstunden durchschnittlich</span></li>
            <li class="flex gap-2"><span class="text-cyan-600">✓</span> <span>CHF 2'000–3'000 Gesamtkosten</span></li>
            <li class="flex gap-2"><span class="text-cyan-600">✓</span> <span>2-6 Monate Ausbildungsdauer</span></li>
          </ul>
          <a href="/motorboot/" class="inline-block bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition" aria-label="Mehr zur Motorboot Fahrschule erfahren">
            Mehr erfahren →
          </a>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <CtaSection title="Finde die richtige Fahrschule für dich!" />
  </div>
</template>

<script setup lang="ts">
// Fahrschule Kategorien Vergleich Page
</script>
