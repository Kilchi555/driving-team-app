<template>
  <div>
    <Head>
      <Title>Autoshkollë Shqipe Zürich – Mëso me Skenderin | Driving Team</Title>
      <Meta name="description" content="Autoshkollë shqipe në Zürich, Spreitenbach dhe Limmattal. Instruktor Skender Ismajli me përvojë që nga viti 2011. Kategoria B Automatik, Rimorkio BE, Taksi BPT. Rezervo tani!" />
      <Meta property="og:title" content="Autoshkollë Shqipe Zürich – Mëso me Skenderin | Driving Team" />
      <Meta property="og:description" content="Autoshkollë shqipe me instruktor Skender Ismajli në Zürich, Spreitenbach dhe Limmattal. Kategoria B, BE, Taksi. Që nga viti 2011." />
      <Meta property="og:url" content="https://drivingteam.ch/autoshkolle-shqipe/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <Link rel="canonical" href="https://drivingteam.ch/autoshkolle-shqipe/" />
      <Link rel="alternate" hreflang="sq" href="https://drivingteam.ch/autoshkolle-shqipe/" />
      <Link rel="alternate" hreflang="de" href="https://drivingteam.ch/auto-fahrschule/" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img
        :src="`/_vercel/image?url=%2Fimages%2Fcategories%2Fauto-fahrschule-hero.webp&w=828&q=60`"
        :srcset="`/_vercel/image?url=%2Fimages%2Fcategories%2Fauto-fahrschule-hero.webp&w=640&q=55 640w, /_vercel/image?url=%2Fimages%2Fcategories%2Fauto-fahrschule-hero.webp&w=828&q=60 828w, /_vercel/image?url=%2Fimages%2Fcategories%2Fauto-fahrschule-hero.webp&w=1080&q=60 1080w`"
        sizes="100vw"
        alt="Autoshkollë Shqipe Zürich – Driving Team"
        class="absolute inset-0 w-full h-full object-cover opacity-100"
        loading="eager"
        fetchpriority="high"
        width="828"
        height="550"
      />
      <div class="absolute inset-0 bg-black/50"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <div class="inline-block bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full mb-4">
            🇦🇱 Mësim në gjuhën shqipe
          </div>
          <h1 class="heading-lg text-white mb-4">Autoshkollë Shqipe Zürich</h1>
          <p class="text-base xs:text-xl text-white mb-2">Mëso të drejtosh me <strong>Skender Ismajlin</strong> – instruktor i certifikuar me përvojë që nga viti 2011.</p>
          <p class="text-base xs:text-xl text-white mb-8">Mësimet zhvillohen në Spreitenbach, Limmattal, Zürich-Altstetten dhe Wettingen/AG. Kategoria B Automatik, Rimorkio BE dhe Taksi BPT.</p>
          <a href="https://www.simy.ch/booking/availability/driving-team?service=B" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Rezervo tani
          </a>
        </div>
      </div>
    </section>

    <!-- Instructor Section -->
    <section class="bg-white py-16">
      <div class="section-container">
        <div class="max-w-4xl mx-auto">
          <div class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
            <div class="flex-shrink-0 text-center">
              <div class="w-28 h-28 rounded-full bg-primary-600 flex items-center justify-center text-white text-4xl font-black mx-auto mb-4">SI</div>
              <div class="flex justify-center gap-1 mb-1">
                <span v-for="i in 5" :key="i" class="text-yellow-400 text-xl">★</span>
              </div>
              <p class="text-xs text-gray-500">Instruktor i certifikuar</p>
            </div>
            <div>
              <h2 class="text-2xl md:text-3xl font-black text-gray-900 mb-2">Skender Ismajli</h2>
              <p class="text-primary-600 font-semibold mb-4">Instruktor i vozitjes · Që nga viti 2011</p>
              <p class="text-gray-700 mb-4">Skenderi është instruktor i certifikuar i vozitjes me mbi <strong>14 vite përvojë</strong>. Ai mëson shqip dhe është nga Kosova – kështu ju ndiheni rehat gjatë gjithë kursit.</p>
              <div class="flex flex-wrap gap-3 mb-4">
                <span class="bg-primary-100 text-primary-700 text-sm font-semibold px-3 py-1.5 rounded-full">🚗 Kategoria B Automatik</span>
                <span class="bg-primary-100 text-primary-700 text-sm font-semibold px-3 py-1.5 rounded-full">🚛 Rimorkio BE</span>
                <span class="bg-primary-100 text-primary-700 text-sm font-semibold px-3 py-1.5 rounded-full">🚕 Taksi BPT</span>
              </div>
              <div class="flex flex-wrap gap-2 text-sm text-gray-600">
                <span class="flex items-center gap-1">📍 Spreitenbach</span>
                <span>·</span>
                <span>Limmattal</span>
                <span>·</span>
                <span>Zürich-Altstetten</span>
                <span>·</span>
                <span>Wettingen/AG</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Pse të zgjedhësh Driving Team?</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div class="bg-white rounded-xl p-6 shadow-sm">
            <div class="text-3xl mb-3">🗣️</div>
            <h3 class="font-bold text-lg mb-2">Mësim në shqip</h3>
            <p class="text-gray-600 text-sm">Skenderi mëson plotësisht në gjuhën shqipe – asnjë barrierë gjuhësore.</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm">
            <div class="text-3xl mb-3">🏆</div>
            <h3 class="font-bold text-lg mb-2">85% sukses në provim</h3>
            <p class="text-gray-600 text-sm">Shkalla jonë e suksesit është shumë mbi mesataren kombëtare.</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm">
            <div class="text-3xl mb-3">📅</div>
            <h3 class="font-bold text-lg mb-2">Orare fleksibël</h3>
            <p class="text-gray-600 text-sm">Mësime në mëngjes, pasdite dhe në fundjavë sipas orarit tuaj.</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm">
            <div class="text-3xl mb-3">📍</div>
            <h3 class="font-bold text-lg mb-2">E gjithë Limmattal</h3>
            <p class="text-gray-600 text-sm">Spreitenbach, Zürich-Altstetten, Schlieren, Dietikon, Wettingen dhe rrethinat.</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm">
            <div class="text-3xl mb-3">🚗</div>
            <h3 class="font-bold text-lg mb-2">Makinë automatike</h3>
            <p class="text-gray-600 text-sm">Mësoni me transmision automatik – më e lehtë për shumicën e nxënësve.</p>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-sm">
            <div class="text-3xl mb-3">💰</div>
            <h3 class="font-bold text-lg mb-2">Çmime të drejta</h3>
            <p class="text-gray-600 text-sm">Ab CHF 95.- për orë mësimi. Transparente dhe pa kosto të fshehura.</p>
          </div>
        </div>
      </div>
    </section>

    <cta-section />

    <!-- Kategorien -->
    <section class="bg-white py-16">
      <div class="section-container">
        <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Çfarë ofrojmë</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">

          <!-- Kat B -->
          <div class="bg-gray-50 rounded-2xl p-8 border-t-4 border-primary-500">
            <div class="text-4xl mb-4">🚗</div>
            <h3 class="text-xl font-black mb-2">Kategoria B – Automatik</h3>
            <p class="text-gray-600 text-sm mb-4">Patent automobilistik me transmision automatik. Ideale për ata që dëshirojnë të mësojnë shpejt dhe pa stres.</p>
            <ul class="space-y-2 text-sm text-gray-700 mb-6">
              <li class="flex gap-2"><span class="text-primary-600 font-bold">✓</span> Ab CHF 95.- / 45 min</li>
              <li class="flex gap-2"><span class="text-primary-600 font-bold">✓</span> Makinë moderne automatike</li>
              <li class="flex gap-2"><span class="text-primary-600 font-bold">✓</span> Mësim plotësisht në shqip</li>
              <li class="flex gap-2"><span class="text-primary-600 font-bold">✓</span> Spreitenbach, Limmattal, Zürich</li>
            </ul>
            <a href="https://www.simy.ch/booking/availability/driving-team?service=B" target="_blank" rel="noopener noreferrer" class="btn-primary w-full text-center text-sm">Rezervo Kat. B</a>
          </div>

          <!-- BE -->
          <div class="bg-gray-50 rounded-2xl p-8 border-t-4 border-orange-500">
            <div class="text-4xl mb-4">🚛</div>
            <h3 class="text-xl font-black mb-2">Rimorkio BE</h3>
            <p class="text-gray-600 text-sm mb-4">Kategoria BE ju lejon të tërhiqni rimorkio dhe karavane. Kusht: tashmë keni patentën B.</p>
            <ul class="space-y-2 text-sm text-gray-700 mb-6">
              <li class="flex gap-2"><span class="text-orange-500 font-bold">✓</span> Rimorkio deri 750 kg dhe mbi 750 kg</li>
              <li class="flex gap-2"><span class="text-orange-500 font-bold">✓</span> Ideal për karavane dhe barkat</li>
              <li class="flex gap-2"><span class="text-orange-500 font-bold">✓</span> Mësim në shqip me Skenderin</li>
            </ul>
            <a href="https://www.simy.ch/booking/availability/driving-team?service=BE" target="_blank" rel="noopener noreferrer" class="inline-block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition text-sm">Rezervo Kat. BE</a>
          </div>

          <!-- Taksi -->
          <div class="bg-gray-50 rounded-2xl p-8 border-t-4 border-yellow-500">
            <div class="text-4xl mb-4">🚕</div>
            <h3 class="text-xl font-black mb-2">Taksi BPT 121 &amp; 122</h3>
            <p class="text-gray-600 text-sm mb-4">Patenta profesionale e taksistit. Skenderi ka përvojë të gjerë në trajnimin e shoferëve të taksive.</p>
            <ul class="space-y-2 text-sm text-gray-700 mb-6">
              <li class="flex gap-2"><span class="text-yellow-600 font-bold">✓</span> BPT 121 (Kat. B) dhe 122 (Van)</li>
              <li class="flex gap-2"><span class="text-yellow-600 font-bold">✓</span> Trajnim profesional</li>
              <li class="flex gap-2"><span class="text-yellow-600 font-bold">✓</span> Konsultim personal me shqip</li>
            </ul>
            <a href="/taxi-fahrschule/" class="inline-block w-full text-center bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition text-sm">Më shumë rreth Taksit</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Rruga drejt patentës B -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="text-xl md:text-3xl lg:text-4xl font-bold mb-12 text-center">Rruga drejt patentës B – 7 hapa</h2>
        <div class="space-y-6 max-w-4xl mx-auto">

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">1</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Kursi i ndihmës së parë (Nothelferkurs)</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-gray-600 mb-2">Hapi i parë: Kursi i detyrueshëm i ndihmës së parë</p>
              <p class="text-sm text-gray-600">Para se të filloni me orët e vozitjes, duhet të kryeni kursin e ndihmës së parë (Nothelferkurs). Ky kurs zgjat një ditë dhe mëson teknikat bazë të shpëtimit. Certifikata është e vlefshme 6 vjet.</p>
              <div class="mt-3">
                <a href="/nothelferkurs/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">Regjistrohu për Nothelferkurs</a>
              </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">2</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Kërkesa për lejen e mësimit (Lernfahrgesuch)</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-gray-600 mb-2">Paraqisni kërkesën në Zyrën e Trafiqit (Strassenverkehrsamt)</p>
              <p class="text-sm text-gray-600">Plotësoni formularin e Lernfahrgesuch dhe paraqiteni në Strassenverkehrsamt bashkë me certifikatën e Nothelferkursit, një foto pasaportë dhe ID/Pasaportën tuaj. Mosha minimale: 17 vjeç. Kërkesa mund të bëhet dy muaj para ditëlindjes së 17-të.</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <a href="/documents/lernfahrgesuche/Gesuch-LFA-ZH.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">Formulari Zürich (PDF)</a>
                <a href="/documents/lernfahrgesuche/Gesuch-LFA-AG.pdf" target="_blank" rel="noopener noreferrer" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">Formulari Aargau (PDF)</a>
              </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">3</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Provimi teorik</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Pasi të merrni konfirmimin me PIN-kodin tuaj, mund të regjistroheni për provimin teorik. Studioni me librin e teorisë dhe aplikacionin e mësimit. Pas kalimit të provimit teorik, merrni lejen e mësimit (Lernfahrausweis) e vlefshme 24 muaj.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">4</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Kursi i edukimit rrugor VKU</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Kursi VKU (Verkehrskunde) zgjat 8 orë (2 × 4 orë). Është i detyrueshëm dhe duhet kryer para provimit praktik. Skenderi dhe ekipi i Driving Team ju rekomandojnë ta bëni sa më shpejt që të mundet.</p>
              <div class="mt-3">
                <a href="/vku-kurs-zuerich/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">VKU Zürich</a>
              </div>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">5</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Orët e praktikës me Skenderin</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Orët e vozitjes me Skenderin zhvillohen plotësisht në gjuhën shqipe. Skenderi shpjegon me qetësi dhe durim – ju mësoni shpejt dhe pa stres. Mesatarisht nevojiten 15–20 orë. Mësimet e para bëhen gjithmonë me instruktor.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">6</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Provimi praktik i vozitjes</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Skenderi ju përgatit me kujdes për provimin praktik. Shkalla jonë e suksesit prej 85% flet vetë. Pas kalimit të provimit merrni patentën provizore për 3 vjet.</p>
            </div>
          </details>

          <details class="bg-white rounded-lg border-l-4 border-primary-600 shadow-sm group">
            <summary class="flex items-start gap-4 md:gap-6 p-4 md:p-8 cursor-pointer list-none select-none">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary-600 text-white font-bold text-sm md:text-lg">7</div>
              </div>
              <div class="flex-1 flex items-center justify-between">
                <h3 class="text-base md:text-lg lg:text-xl font-bold">Kursi WAB (pas patentës)</h3>
                <span class="text-gray-400 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-2 md:ml-4 text-lg">▼</span>
              </div>
            </summary>
            <div class="px-4 md:px-8 pb-4 md:pb-6 ml-14 md:ml-[72px]">
              <p class="text-sm text-gray-600">Brenda 12 muajve pas provimit duhet të kryeni kursin e detyrueshëm WAB (2 ditë kursi). Pas 3 viteve periudhë prove, mund të kërkoni patentën e përhershme.</p>
              <div class="mt-3">
                <a href="/wab-kurse-zuerich/" class="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition">WAB Kurs Zürich</a>
              </div>
            </div>
          </details>
        </div>

        <div class="text-center mt-12">
          <a href="https://www.simy.ch/booking/availability/driving-team?service=B" target="_blank" rel="noopener noreferrer" class="btn-primary text-lg">
            ✨ Rezervo orën e parë tani
          </a>
        </div>
      </div>
    </section>

    <ReviewsSection category="default" />

    <!-- FAQ -->
    <section class="section-container py-16">
      <h2 class="heading-md mb-12 text-center">Pyetje të shpeshta</h2>
      <div class="max-w-3xl mx-auto space-y-4 mb-12">

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Sa kushton patenta B në Zvicër?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Kostoja totale e patentës B është mesatarisht <strong>CHF 3'500–3'600</strong>. Kjo përfshin: Nothelferkurs (~CHF 120), Sehtest (~CHF 50), lejen e mësimit (CHF 80), provimin teorik (CHF 40), kursin VKU (CHF 200–300), orët e vozitjes (mesatarisht 15–20 × CHF 95–120), provimin praktik (CHF 130) dhe kursin WAB (CHF 350).</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Sa orë mësimi nevojiten për patentën B?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Mesatarisht <strong>15–20 orë mësimi</strong> me instruktor. Kjo varet nga mosha, eksperienca dhe tempi i mësimit tuaj. Skenderi ju vlerëson individualisht dhe ju tregon sinqerisht sa orë nevojiten.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Ku zhvillohen mësimet e vozitjes?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Skenderi mëson në të gjithë rajonin: <strong>Spreitenbach, Dietikon, Schlieren, Zürich-Altstetten, Wettingen dhe Limmattal</strong>. Mund të ndihmojë edhe me marrjen tuaj nga shtëpia.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            A mund të mësoj me makinë automatike?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Po, absolutisht! Skenderi specializohet pikërisht në <strong>Kategoria B Automatik</strong>. Shumë nxënës preferojnë automatiken pasi është më e thjeshtë dhe lejon koncentrim më të madh në trafikun rreth tyre. Patenta automatike ju lejon të drejtoni çdo makinë automatike.</p>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            Si mund të rezervoj orën e parë?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Rezervimi bëhet lehtë online: klikoni butonin "Rezervo tani" dhe zgjidhni orarin që ju konvenon. Mund edhe të na kontaktoni direkt nëpërmjet faqes sonë të kontaktit. Skenderi do t'ju përgjigjet shpejt.</p>
          <div class="mt-4">
            <a href="https://www.simy.ch/booking/availability/driving-team?service=B" target="_blank" rel="noopener noreferrer" class="btn-primary text-sm">Rezervo tani</a>
          </div>
        </details>

        <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            A ofron Driving Team edhe patentën e rimorkios (BE)?
            <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">Po! Skenderi ofron edhe trajnimin për <strong>Kategoria BE (Rimorkio/Anhänger)</strong>. Kjo kategori ju lejon të tërhiqni rimorkio, karavane dhe barkat. Kushti i vetëm: duhet tashmë të keni patentën B të vlefshme.</p>
        </details>
      </div>
    </section>

    <!-- CTA Final -->
    <section class="bg-primary-700 py-16 text-white text-center">
      <div class="section-container">
        <h2 class="text-3xl md:text-4xl font-black mb-4">Gati të fillosh?</h2>
        <p class="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">Rezervo orën tënde të parë me Skenderin sot. Mësim shqip, çmime transparente, 85% sukses.</p>
        <div class="flex flex-wrap justify-center gap-4">
          <a href="https://www.simy.ch/booking/availability/driving-team?service=B" target="_blank" rel="noopener noreferrer" class="bg-white text-primary-700 hover:bg-primary-50 font-bold py-4 px-8 rounded-xl transition text-lg">
            ✨ Rezervo tani – Kat. B
          </a>
          <a href="/kontakt/" class="border-2 border-white text-white hover:bg-white/10 font-bold py-4 px-8 rounded-xl transition text-lg">
            📞 Na kontakto
          </a>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': ['DrivingSchool', 'LocalBusiness'],
        name: 'Driving Team Autoshkollë Shqipe Zürich',
        description: 'Autoshkollë shqipe në Zürich dhe Limmattal me instruktor Skender Ismajli. Kategoria B Automatik, Rimorkio BE, Taksi BPT. Që nga viti 2011.',
        url: 'https://drivingteam.ch/autoshkolle-shqipe/',
        telephone: '+41 44 586 09 32',
        image: 'https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp',
        priceRange: 'Ab CHF 95.-',
        currenciesAccepted: 'CHF',
        paymentAccepted: 'Cash, Credit Card, Bank Transfer',
        inLanguage: ['sq', 'de'],
        areaServed: ['Spreitenbach', 'Zürich-Altstetten', 'Dietikon', 'Schlieren', 'Wettingen', 'Limmattal'],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Spreitenbach',
          addressRegion: 'AG',
          addressCountry: 'CH',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '85',
          bestRating: '5',
        },
        employee: {
          '@type': 'Person',
          name: 'Skender Ismajli',
          jobTitle: 'Instruktor i certifikuar i vozitjes',
          description: 'Instruktor i certifikuar me përvojë që nga viti 2011. Specializimi: Kategoria B Automatik, Rimorkio BE, Taksi BPT. Mëson shqip.',
          knowsLanguage: ['sq', 'de'],
          worksFor: {
            '@type': 'Organization',
            name: 'Driving Team Fahrschule',
          },
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Kurset e autoshkollës',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: { '@type': 'Service', name: 'Kategoria B Automatik' },
              price: '95.00',
              priceCurrency: 'CHF',
              description: '45 min orë mësimi Kategoria B me makinë automatike',
            },
            {
              '@type': 'Offer',
              itemOffered: { '@type': 'Service', name: 'Rimorkio BE' },
              description: 'Trajnim për Kategoria BE – rimorkio dhe karavane',
            },
            {
              '@type': 'Offer',
              itemOffered: { '@type': 'Service', name: 'Taksi BPT 121/122' },
              description: 'Patent profesionale e taksistit BPT 121 dhe 122',
            },
          ],
        },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Sa kushton patenta B në Zvicër?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Kostoja totale e patentës B është mesatarisht CHF 3\'500–3\'600, duke përfshirë Nothelferkurs, Sehtest, lejen e mësimit, provimin teorik, VKU, orët e vozitjes, provimin praktik dhe kursin WAB.',
            },
          },
          {
            '@type': 'Question',
            name: 'Sa orë mësimi nevojiten për patentën B?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Mesatarisht 15–20 orë mësimi me instruktor. Kjo varet nga mosha, eksperienca dhe tempi i mësimit.',
            },
          },
          {
            '@type': 'Question',
            name: 'Ku zhvillohen mësimet e vozitjes?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Skenderi mëson në Spreitenbach, Dietikon, Schlieren, Zürich-Altstetten, Wettingen dhe të gjithë rajonin e Limmattal.',
            },
          },
          {
            '@type': 'Question',
            name: 'A mund të mësoj me makinë automatike?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Po! Skenderi specializohet në Kategoria B Automatik. Shumë nxënës preferojnë automatiken pasi është më e thjeshtë dhe lejon koncentrim më të madh.',
            },
          },
          {
            '@type': 'Question',
            name: 'Si mund të rezervoj orën e parë?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Rezervimi bëhet lehtë online nëpërmjet sistemit tonë të rezervimit. Klikoni butonin "Rezervo tani" dhe zgjidhni orarin që ju konvenon.',
            },
          },
        ],
      }),
    },
  ],
})
</script>
