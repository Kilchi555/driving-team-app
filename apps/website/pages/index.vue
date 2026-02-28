<template>
  <div>
    <Head>
      <Title>Fahrschule Zürich | Deine Driving Team Fahrschule in Zürich</Title>
      <Meta name="description" content="Fahrschule Driving Team - Auto, Motorrad, Taxi & Lastwagen Fahrschule in Zürich. Moderne Fahrschule mit erfahrenen Fahrlehrern. Jetzt Termin buchen!" />
      <Meta name="keywords" content="Fahrschule Zürich, Auto Fahrschule, Motorrad Fahrschule, Führerschein, Fahrausbildung" />
      <Meta property="og:title" content="Fahrschule Zürich | Driving Team" />
      <Meta property="og:description" content="Auto, Motorrad, Taxi & Lastwagen Fahrschule in Zürich" />
      <Meta property="og:image" content="https://drivingteam.ch/og-image.jpg" />
      <Link rel="canonical" href="https://drivingteam.ch/" />
      <Link rel="alternate" hreflang="de" href="https://drivingteam.ch/" />
    </Head>

    <style scoped>
      @keyframes fadeOutHero {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      
      @keyframes fadeInCategories {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      
      .hero-fade {
        animation: fadeOutHero 0.8s ease-out 2s forwards;
      }
      
      .categories-fade {
        animation: fadeInCategories 0.8s ease-in 2s forwards;
        opacity: 0;
      }
    </style>

    <!-- Hero Section -->
    <section class="hero-fade bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
      <div class="section-container">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-2xl md:text-3xl font-semibold mb-4 text-blue-200">Willkommen bei der Fahrschule Driving Team</h2>
          <h1 class="heading-lg text-white mb-6">Deine Auto Motorrad Taxi Lastwagen Motorboot Fahrschule Zürich</h1>
          <p class="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">Die moderne Fahrschule in Zürich für professionelle Fahrausbildung in allen Kategorien. Erfahrene Fahrlehrer, flexible Termine und faire Preise.</p>
          <a href="/booking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg inline-block">
            📅 Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Categories Section (MOVED TO TOP) -->
    <section class="categories-fade section-container py-20">
      <h2 class="heading-md text-center mb-16">Die Kategorien unserer Fahrschule...</h2>
      
      <div class="grid md:grid-cols-4 gap-6 mb-12">
        <a href="/auto-fahrschule/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">🚗</p>
          <h3 class="font-bold text-xl mb-2">Auto</h3>
          <p class="text-gray-600 text-sm">Kategorie B</p>
        </a>
        <a href="/motorrad-fahrschule/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">🏍️</p>
          <h3 class="font-bold text-xl mb-2">Motorrad</h3>
          <p class="text-gray-600 text-sm">Kategorie A/A2/AM</p>
        </a>
        <a href="/taxi-fahrschule/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">🚕</p>
          <h3 class="font-bold text-xl mb-2">Taxi</h3>
          <p class="text-gray-600 text-sm">Kategorie BPT</p>
        </a>
        <a href="/motorboot/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">⛵</p>
          <h3 class="font-bold text-xl mb-2">Motorboot</h3>
          <p class="text-gray-600 text-sm">Bootführerschein</p>
        </a>
        <a href="/motorrad-fahrschule/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">🏍️</p>
          <h3 class="font-bold text-xl mb-2">Motorrad</h3>
          <p class="text-gray-600 text-sm">Grundkurse</p>
        </a>
        <a href="/lastwagen-fahrschule/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">🚚</p>
          <h3 class="font-bold text-xl mb-2">Lastwagen</h3>
          <p class="text-gray-600 text-sm">Kategorie C/C1</p>
        </a>
        <a href="/bus-fahrschule/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">🚌</p>
          <h3 class="font-bold text-xl mb-2">Bus</h3>
          <p class="text-gray-600 text-sm">Kategorie D</p>
        </a>
        <a href="/anhaenger-fahrschule/" class="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-400 transition">
          <p class="text-5xl mb-4">🚛</p>
          <h3 class="font-bold text-xl mb-2">Anhänger</h3>
          <p class="text-gray-600 text-sm">Kategorie BE</p>
        </a>
      </div>
    </section>

    <!-- Facts Section -->
    <section class="bg-gray-50 py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-16">Ein paar Fakten zu der Fahrschule Driving Team...</h2>
        
        <div class="grid md:grid-cols-4 gap-8">
          <div class="text-center">
            <p class="text-5xl font-bold text-blue-600 mb-2">20+</p>
            <p class="text-gray-700">Jahre Erfahrung</p>
          </div>
          <div class="text-center">
            <p class="text-5xl font-bold text-blue-600 mb-2">8</p>
            <p class="text-gray-700">Fahrlehrer & Instruktoren</p>
          </div>
          <div class="text-center">
            <p class="text-5xl font-bold text-blue-600 mb-2">1000+</p>
            <p class="text-gray-700">Schüler pro Jahr</p>
          </div>
          <div class="text-center">
            <p class="text-5xl font-bold text-blue-600 mb-2">4.8 ⭐</p>
            <p class="text-gray-700">Google Bewertung</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Courses Section -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-16">Unsere Fahrschule führt folgende Kurse durch</h2>
      
      <div class="grid md:grid-cols-2 gap-8">
        <div class="bg-white border border-gray-200 rounded-lg p-8">
          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <span class="text-2xl">📚</span> Theorie & Grundkurse
          </h3>
          <ul class="space-y-3 text-gray-700">
            <li>✓ Auto Theorie</li>
            <li>✓ Nothelferkurse</li>
            <li>✓ Motorrad Grundkurse</li>
            <li>✓ VKU Kurse (Verkehrskunde)</li>
          </ul>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-8">
          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <span class="text-2xl">🎓</span> Weiterbildungen
          </h3>
          <ul class="space-y-3 text-gray-700">
            <li>✓ CZV Grundkurs & Weiterbildung</li>
            <li>✓ WAB Kurse (Auffrischungstraining)</li>
            <li>✓ Motorrad-Weiterbildung</li>
            <li>✓ Fahrlehrer-Weiterbildung</li>
          </ul>
        </div>
      </div>

      <div class="text-center mt-12">
        <a href="/booking" class="btn-primary">
          Kurs oder Fahrstunde buchen
        </a>
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
          <p class="text-gray-600 mt-4">Die Gesamtkosten der Fahrausbildung bis zur Autoprüfung ist sehr unterschiedlich und hauptsächlich abhängig von der Anzahl der benötigten Auto Fahrstunden. Kontaktiere uns für ein persönliches Angebot.</p>
        </details>
      </div>

      <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center mt-12">
        <p class="text-lg text-gray-900 mb-4">Weitere Fragen?</p>
        <a href="tel:+41444310033" class="btn-primary">
          📞 +41 44 431 00 33
        </a>
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
          <a href="/booking" class="btn-primary text-lg">
            Jetzt unverbindliches Angebot anfordern
          </a>
        </div>
      </div>
    </section>

    <!-- Contact Form Section -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-12">Unverbindliche Anfrage</h2>
      
      <div class="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-8">
        <form class="space-y-6">
          <div class="grid md:grid-cols-2 gap-4">
            <input type="text" placeholder="Vorname*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
            <input type="text" placeholder="Nachname*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
          </div>
          <input type="tel" placeholder="Telefonnummer*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
          <input type="email" placeholder="Email*" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" required />
          <textarea placeholder="Nachricht" rows="5" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"></textarea>
          <button type="submit" class="btn-primary w-full text-lg">
            Absenden
          </button>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Homepage - exactly matching old drivingteam.ch structure
</script>
