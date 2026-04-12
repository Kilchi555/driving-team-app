<template>
  <div>
    <Head>
      <Title>Driving School Zurich – English Lessons from CHF 95 | Driving Team</Title>
      <Meta name="description" content="Driving School Zurich ✓ English lessons from CHF 95/session ✓ Category B car, motorcycle, trailer & more ✓ 85% first-time pass rate ✓ 368 reviews ✓ Zürich-Altstetten. Book online now!" />
      <Meta name="keywords" content="driving school zurich, driving lessons zurich, driving school zurich english, english driving school zurich, category B zurich, driving license zurich, fahrschule zurich english, driving instructor zurich" />
      <Meta property="og:title" content="Driving School Zurich – English Lessons from CHF 95 | Driving Team" />
      <Meta property="og:description" content="Professional driving school in Zurich with English instruction. Category B from CHF 95/session. 85% first-time pass rate. 4.9★ with 368 reviews. Book online." />
      <Meta property="og:url" content="https://drivingteam.ch/driving-school-zurich/" />
      <Meta property="og:type" content="website" />
      <Meta property="og:locale" content="en_CH" />
      <Link rel="canonical" href="https://drivingteam.ch/driving-school-zurich/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta property="og:image:alt" content="Driving School Zurich – English lessons with Driving Team" />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content="Driving School Zurich – English from CHF 95 | Driving Team" />
      <Meta name="twitter:description" content="English driving lessons in Zurich from CHF 95. 85% pass rate, 4.9★ reviews. Category B, motorcycle, trailer & more. Book online now." />
      <Meta name="twitter:image" content="https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Breadcrumb -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Driving School', href: '/auto-fahrschule/' }, { label: 'Driving School Zurich' }]" />

    <!-- Hero -->
    <section class="relative py-20 md:py-32 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900"></div>
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
      <img
        src="/images/categories/auto-fahrschule-hero.webp"
        alt="Driving School Zurich – English lessons with Driving Team"
        class="absolute inset-0 w-full h-full object-cover opacity-20"
        fetchpriority="high"
        loading="eager"
        width="1920"
        height="1080"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-primary-900/60 via-primary-800/30 to-transparent"></div>

      <div class="section-container relative z-10">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div class="text-white">
            <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/20">
              <span class="text-xl">🚗</span>
              <span class="text-sm font-semibold">Driving School Zurich · English</span>
            </div>

            <h1 class="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
              Driving School<br/>
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100">Zurich</span>
            </h1>

            <p class="text-lg text-white/90 mb-8 leading-relaxed max-w-lg">
              Professional driving lessons in Zurich — in English. Whether you're an expat, an international student, or a newcomer to Switzerland, we guide you through the Swiss driving licence process from start to finish.
            </p>

            <div class="flex gap-8 mb-10">
              <div>
                <p class="text-4xl font-black text-yellow-300">85%</p>
                <p class="text-sm text-white/70">Pass rate</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">{{ LOCATION_ZUERICH.rating.value }}★</p>
                <p class="text-sm text-white/70">{{ LOCATION_ZUERICH.rating.count }} reviews</p>
              </div>
              <div>
                <p class="text-4xl font-black text-yellow-300">CHF 95</p>
                <p class="text-sm text-white/70">per lesson</p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4">
              <a
                href="https://www.simy.ch/booking/availability/driving-team?service=B"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 bg-white text-primary-600 hover:bg-yellow-50 font-bold py-4 px-8 rounded-xl transition transform hover:scale-105 hover:shadow-2xl shadow-lg text-lg"
              >
                📅 Book a lesson
              </a>
              <a
                href="tel:+41444310033"
                class="inline-flex items-center justify-center gap-2 border-2 border-white/60 text-white hover:bg-white/10 font-bold py-4 px-8 rounded-xl transition text-lg"
              >
                📞 044 431 00 33
              </a>
            </div>
          </div>

          <!-- Info card -->
          <div class="hidden md:block">
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-white space-y-4">
              <h2 class="text-xl font-bold mb-4">What you need to know</h2>
              <div class="flex items-start gap-3">
                <span class="text-yellow-300 text-xl mt-0.5">✓</span>
                <p>Foreign licences are valid for <strong>12 months</strong> from registration — after that, you need a Swiss licence</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-yellow-300 text-xl mt-0.5">✓</span>
                <p>Lessons available in <strong>English</strong> — no German required</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-yellow-300 text-xl mt-0.5">✓</span>
                <p>Category B (car)</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-yellow-300 text-xl mt-0.5">✓</span>
                <p>Flexible meeting points in <strong>Zürich-Altstetten</strong> and surroundings</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-yellow-300 text-xl mt-0.5">✓</span>
                <p>Theory exam available in English in Canton Zurich</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Driving Team Zurich -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-4">Why Choose Driving Team Zurich?</h2>
      <p class="text-center text-gray-600 max-w-2xl mx-auto mb-14">We've helped hundreds of expats and international residents get their Swiss driving licence — fast, professionally, and entirely in English.</p>

      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-primary-50 rounded-xl p-6 text-center">
          <div class="text-4xl mb-4">🌍</div>
          <h3 class="font-bold text-gray-900 mb-2">English Instruction</h3>
          <p class="text-gray-600 text-sm">Our instructors teach in English. No language barrier, no stress — just focus on learning to drive safely.</p>
        </div>
        <div class="bg-primary-50 rounded-xl p-6 text-center">
          <div class="text-4xl mb-4">🏆</div>
          <h3 class="font-bold text-gray-900 mb-2">85% First-time Pass Rate</h3>
          <p class="text-gray-600 text-sm">Our structured training approach gives you the best possible preparation for the Swiss practical driving exam at Albisgütli.</p>
        </div>
        <div class="bg-primary-50 rounded-xl p-6 text-center">
          <div class="text-4xl mb-4">📍</div>
          <h3 class="font-bold text-gray-900 mb-2">Flexible Pick-up Points</h3>
          <p class="text-gray-600 text-sm">We come to you wherever possible — home, work, or train station. No fixed classroom required.</p>
        </div>
        <div class="bg-primary-50 rounded-xl p-6 text-center">
          <div class="text-4xl mb-4">📱</div>
          <h3 class="font-bold text-gray-900 mb-2">Book Online 24/7</h3>
          <p class="text-gray-600 text-sm">Book, manage and pay for your lessons online at any time. Full transparency with your own customer login.</p>
        </div>
        <div class="bg-primary-50 rounded-xl p-6 text-center">
          <div class="text-4xl mb-4">🚗</div>
          <h3 class="font-bold text-gray-900 mb-2">Car Category</h3>
          <p class="text-gray-600 text-sm">Car (B) in English</p>
        </div>
        <div class="bg-primary-50 rounded-xl p-6 text-center">
          <div class="text-4xl mb-4">⭐</div>
          <h3 class="font-bold text-gray-900 mb-2">{{ LOCATION_ZUERICH.rating.value }}★ on Google</h3>
          <p class="text-gray-600 text-sm">{{ LOCATION_ZUERICH.rating.count }} verified Google reviews — consistently rated one of Zurich's best driving schools by our students.</p>
        </div>
      </div>
    </section>

    <!-- Reviews -->
    <ReviewsSection category="en-zurich" title="What our students say" link-text="→ Read on Google" />

    <!-- Pricing -->
    <section class="bg-gray-50 py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-4">Our Prices in Zurich</h2>
        <p class="text-center text-gray-600 max-w-2xl mx-auto mb-14">Transparent pricing — no hidden fees. All prices in CHF, excl. external costs (theory exam, licence application, eye test).</p>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div class="text-3xl mb-3">🚗</div>
            <h3 class="font-bold text-gray-900 mb-1">Car – Category B in English</h3>
            <p class="text-3xl font-black text-primary-600 mb-3">CHF 95<span class="text-base font-normal text-gray-500">/lesson (45 min)</span></p>
            <ul class="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ Insurance fee: CHF 120 (once)</li>
              <li>✓ WarmUp + exam ride: CHF 285</li>
              <li>✓ Online booking & payment</li>
            </ul>
            <a href="https://www.simy.ch/booking/availability/driving-team?service=B" target="_blank" rel="noopener noreferrer" class="block text-center bg-primary-600 text-white font-semibold py-2.5 rounded-lg hover:bg-primary-700 transition text-sm">Book now</a>
          </div>

          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div class="text-3xl mb-3">🏍️</div>
            <h3 class="font-bold text-gray-900 mb-1">Motorcycle – Category A in English</h3>
            <p class="text-3xl font-black text-primary-600 mb-3">CHF 95<span class="text-base font-normal text-gray-500">/lesson (45 min)</span></p>
            <ul class="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ No insurance fee (private insurance)</li>
              <li>✓ School bike rental available</li>
              <li>✓ Basic course included in training</li>
            </ul>
            <a href="https://www.simy.ch/booking/availability/driving-team?service=A" target="_blank" rel="noopener noreferrer" class="block text-center bg-primary-600 text-white font-semibold py-2.5 rounded-lg hover:bg-primary-700 transition text-sm">Book now</a>
          </div>

          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div class="text-3xl mb-3">🚛</div>
            <h3 class="font-bold text-gray-900 mb-1">Trailer – Category BE in German</h3>
            <p class="text-3xl font-black text-primary-600 mb-3">CHF 120<span class="text-base font-normal text-gray-500">/lesson (45 min)</span></p>
            <ul class="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ Double lessons recommended</li>
              <li>✓ Insurance fee: CHF 120 (once)</li>
              <li>✓ WarmUp + exam ride: CHF 360</li>
            </ul>
            <a href="https://www.simy.ch/booking/availability/driving-team?service=BE" target="_blank" rel="noopener noreferrer" class="block text-center bg-primary-600 text-white font-semibold py-2.5 rounded-lg hover:bg-primary-700 transition text-sm">Book now</a>
          </div>

          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div class="text-3xl mb-3">⛵</div>
            <h3 class="font-bold text-gray-900 mb-1">Motorboat in English from Lachen/SZ</h3>
            <p class="text-3xl font-black text-primary-600 mb-3">CHF 95<span class="text-base font-normal text-gray-500">/lesson (45 min)</span></p>
            <ul class="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ Upper Lake Zurich</li>
              <li>✓ Insurance fee: CHF 120 (once)</li>
              <li>✓ WarmUp + exam ride: CHF 285</li>
            </ul>
            <a href="https://www.simy.ch/booking/availability/driving-team?service=boot" target="_blank" rel="noopener noreferrer" class="block text-center bg-primary-600 text-white font-semibold py-2.5 rounded-lg hover:bg-primary-700 transition text-sm">Book now</a>
          </div>

          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div class="text-3xl mb-3">🚕</div>
            <h3 class="font-bold text-gray-900 mb-1">Taxi – BPT in German</h3>
            <p class="text-3xl font-black text-primary-600 mb-3">CHF 100<span class="text-base font-normal text-gray-500">/lesson (45 min)</span></p>
            <ul class="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ CHF 90 with own vehicle</li>
              <li>✓ Insurance fee: CHF 120 (once)</li>
              <li>✓ WarmUp + exam ride: CHF 300</li>
            </ul>
            <a href="/taxi-fahrschule/" class="block text-center bg-primary-600 text-white font-semibold py-2.5 rounded-lg hover:bg-primary-700 transition text-sm">Learn more</a>
          </div>

          <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div class="text-3xl mb-3">📋</div>
            <h3 class="font-bold text-gray-900 mb-1">All prices</h3>
            <p class="text-sm text-gray-600 mb-4">Also available: truck (C/CE), bus (D), first-aid course (Nothelfer CHF 99), VKU course (CHF 190), WAB course in English (CHF 490).</p>
            <a href="/fahrschule-preise/" class="block text-center bg-gray-100 text-gray-800 font-semibold py-2.5 rounded-lg hover:bg-gray-200 transition text-sm">Full price list →</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Step by step guide -->
    <section class="section-container py-20">
      <h2 class="heading-md text-center mb-4">How to Get Your Swiss Driving Licence</h2>
      <p class="text-center text-gray-600 max-w-2xl mx-auto mb-14">The Swiss licensing process has several mandatory steps. Here's what you need to know as an expat or new resident in Zurich.</p>

      <div class="max-w-3xl mx-auto space-y-4">
        <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex gap-5">
          <div class="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
          <div>
            <h3 class="font-bold text-gray-900 mb-1">First Aid Course (Nothelferkurs)</h3>
            <p class="text-gray-600 text-sm">Mandatory for all new applicants aged 14+. Duration: 10 hours. Cost: CHF 99. Certificate is valid for 6 years. You can <a href="/nothelferkurs/" class="text-primary-600 hover:underline">book directly with us</a>.</p>
          </div>
        </div>
        <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex gap-5">
          <div class="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
          <div>
            <h3 class="font-bold text-gray-900 mb-1">Learner's Permit Application</h3>
            <p class="text-gray-600 text-sm">Submit the Lernfahrgesuch at the Strassenverkehrsamt (road traffic office) with eye test, photo and ID. Minimum age 17. Valid for 24 months.</p>
          </div>
        </div>
        <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex gap-5">
          <div class="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
          <div>
            <h3 class="font-bold text-gray-900 mb-1">Theory Exam (Theorieprüfung)</h3>
            <p class="text-gray-600 text-sm">40 questions, 45 minutes, max. 4 errors. Available in English in Canton Zurich. Pass to receive your learner's licence.</p>
          </div>
        </div>
        <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex gap-5">
          <div class="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">4</div>
          <div>
            <h3 class="font-bold text-gray-900 mb-1">VKU Traffic Theory Course</h3>
            <p class="text-gray-600 text-sm">Mandatory 8-hour course (2 × 4 hours) before the practical exam. Covers road safety, traffic rules and risk awareness. <a href="/vku-kurs-zuerich/" class="text-primary-600 hover:underline">VKU Zürich CHF 190 →</a></p>
          </div>
        </div>
        <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex gap-5">
          <div class="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">5</div>
          <div>
            <h3 class="font-bold text-gray-900 mb-1">Driving Lessons</h3>
            <p class="text-gray-600 text-sm">Typically 15–30 lessons depending on prior experience. We recommend starting with at least 5–10 lessons, then combining with supervised private practice.</p>
          </div>
        </div>
        <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex gap-5">
          <div class="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">6</div>
          <div>
            <h3 class="font-bold text-gray-900 mb-1">Practical Driving Exam</h3>
            <p class="text-gray-600 text-sm">Held at Albisgütli in Zurich. We accompany you with our WarmUp (135 min including exam ride, CHF 285). On a probationary licence for 3 years.</p>
          </div>
        </div>
        <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex gap-5">
          <div class="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">7</div>
          <div>
            <h3 class="font-bold text-gray-900 mb-1">WAB Advanced Training Course</h3>
            <p class="text-gray-600 text-sm">Mandatory within 12 months of passing your exam. Available in English! <a href="/wab-course-english/" class="text-primary-600 hover:underline">WAB Course in English →</a></p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="bg-gray-50 py-20">
      <div class="section-container">
        <h2 class="heading-md text-center mb-10">Frequently Asked Questions</h2>
        <div class="max-w-3xl mx-auto space-y-4">

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Can I take driving lessons in English in Zurich?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Yes — at Driving Team Zurich, you can take all driving lessons in English. Our instructors are experienced in teaching English-speaking students and will guide you through the full Swiss driving licence process without any language barrier.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              How long is my foreign driving licence valid in Switzerland?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Your foreign driving licence is valid in Switzerland for 12 months from the date you register as a resident. After that, you must exchange it for a Swiss licence. EU/EEA licences can usually be exchanged administratively. Licences from other countries (USA, UK, Australia, etc.) typically require a practical driving test.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              How much does a driving lesson cost in Zurich?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">A 45-minute driving lesson (category B – car) costs CHF 95 at Driving Team. A one-off insurance fee of CHF 120 applies for the whole course. Double lessons (90 min, CHF 190) are recommended for faster progress. The WarmUp including the exam ride costs CHF 285.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              How many driving lessons do I need in Switzerland?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">There is no fixed minimum. Most students need between 15 and 30 lessons. If you can practise privately with a qualified companion (min. 23 years old, licence held for 3+ years), you'll need fewer professional lessons. If you already have driving experience from abroad, you may need fewer lessons.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Is the Swiss theory exam available in English?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Yes. In Canton Zurich, the theory exam (Theorieprüfung) is available in English. The exam consists of 40 questions and a maximum of 4 errors are allowed. You can prepare with the official app or study materials, which are also available in English.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Where does the practical driving exam take place in Zurich?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">The practical driving exam in Zurich takes place at the Strassenverkehrsamt Albisgütli. Our instructors know this exam area inside out and will specifically train you on the most common exam routes in Zürich-Altstetten, Albisrieden, Schlieren and the surrounding areas.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              What is the VKU course and do I need it?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">The VKU (Verkehrskundeunterricht) is a mandatory 8-hour traffic theory course that must be completed before the practical exam. It covers traffic safety, risk awareness, and behaviour in difficult situations. It is taught in German, but our instructors can help you prepare for the content in English. Cost: CHF 190 in Zurich.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              Do I need a first aid certificate?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">Yes. The Nothelferkurs (first aid course) is mandatory for obtaining a Swiss driving licence. It takes 10 hours in total and is valid for 6 years. The course costs CHF 99 at Driving Team. You can complete it before applying for your learner's permit or alongside your driving lessons.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              What is the WAB course and when do I need it?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">The WAB (Weiterausbildung Autofahren) is a mandatory advanced driving training day that must be completed within 12 months of passing your practical exam. If you miss the deadline, your driving licence becomes invalid. We offer this course in English — <a href="/wab-course-english/" class="text-primary-600 hover:underline">see WAB Course in English</a>.</p>
          </details>

          <details class="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              What are the total costs to get a Swiss driving licence?
              <span class="text-primary-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <p class="text-gray-600 mt-4">With 15 lessons, total costs including all courses and official fees come to approximately CHF 2'250. With 30 lessons, expect around CHF 3'530. This includes: Nothelferkurs (CHF 99), learner's permit (CHF ~80), theory exam (CHF 40), VKU (CHF 190), driving lessons, insurance fee (CHF 120), WarmUp + exam (CHF 285), official exam fee (~CHF 130), and WAB course (CHF 490 in English).</p>
          </details>

        </div>
      </div>
    </section>

    <!-- Internal links -->
    <section class="section-container py-14">
      <h2 class="text-xl font-bold text-center mb-8 text-gray-900">More from Driving Team Zurich</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <a href="/motorrad-fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">🏍️</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Motorcycle School Zurich</p>
          <p class="text-xs text-gray-500 mt-1">Category A · from CHF 95</p>
        </a>
        <a href="/nothelferkurs/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">❤️</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">First Aid Course Zurich</p>
          <p class="text-xs text-gray-500 mt-1">Nothelferkurs · CHF 99</p>
        </a>
        <a href="/vku-kurs-zuerich/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">📚</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">VKU Course Zurich</p>
          <p class="text-xs text-gray-500 mt-1">Traffic theory · CHF 190</p>
        </a>
        <a href="/wab-course-english/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">🌍</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">WAB Course in English</p>
        </a>
        <a href="/driving-school-lachen/" class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-300 transition group">
          <div class="text-2xl mb-2">📍</div>
          <p class="font-semibold text-gray-900 group-hover:text-primary-700 text-sm">Driving School Lachen</p>
          <p class="text-xs text-gray-500 mt-1">English lessons · from CHF 95</p>
        </a>
      </div>
    </section>

    <!-- Blog articles for English speakers -->
    <section class="section-container py-8">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-sm text-gray-500 mb-3">Helpful reading:</p>
        <div class="flex flex-wrap gap-3 justify-center">
          <a href="/blog/drivers-license-convert/" class="text-sm text-primary-600 hover:underline">📖 Convert your foreign driving licence in 7 steps →</a>
          <a href="/blog/fuehrerschein-kategorien-schweiz/" class="text-sm text-primary-600 hover:underline">🚗 All Swiss licence categories explained →</a>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <CtaSection title="Ready to Start? Book Your First Lesson in Zurich!" />

    <!-- Locations -->
    <StandorteSection />
  </div>
</template>

<script setup lang="ts">
import { LOCATION_ZUERICH } from '~/business.config'
definePageMeta({ layout: 'default' })

const faqItems = [
  { q: 'Can I take driving lessons in English in Zurich?', a: 'Yes — at Driving Team Zurich, you can take all driving lessons in English. Our instructors guide you through the full Swiss driving licence process without any language barrier.' },
  { q: 'How long is my foreign driving licence valid in Switzerland?', a: 'Your foreign driving licence is valid for 12 months from registration as a resident. EU/EEA licences can be exchanged administratively; others typically require a practical test.' },
  { q: 'How much does a driving lesson cost in Zurich?', a: 'A 45-minute category B lesson costs CHF 95. One-off insurance fee: CHF 120. Double lessons (90 min): CHF 190. WarmUp including exam ride: CHF 285.' },
  { q: 'How many driving lessons do I need in Switzerland?', a: 'Most students need 15–30 lessons. With experience from abroad and private practice opportunities, you may need fewer.' },
  { q: 'Is the Swiss theory exam available in English?', a: 'Yes, in Canton Zurich the theory exam is available in English. It consists of 40 questions with a maximum of 4 errors allowed.' },
  { q: 'What is the WAB course and when do I need it?', a: 'The WAB is a mandatory advanced driving training day completed within 12 months of passing the practical exam. We offer this course in English.' },
  { q: 'Do I need a first aid certificate?', a: 'Yes. The Nothelferkurs (10 hours, CHF 99) is mandatory and valid for 6 years. Book it with us before or alongside your driving lessons.' },
  { q: 'What are the total costs to get a Swiss driving licence?', a: 'With 15 lessons: approx. CHF 2\'250. With 30 lessons: approx. CHF 3\'530. Including all courses, official fees, insurance, and exam.' },
]

const jsonLdScripts = [
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['DrivingSchool', 'LocalBusiness'],
      '@id': 'https://drivingteam.ch/driving-school-zurich/#driving-school',
      name: 'Driving School Zurich – Driving Team',
      description: 'Professional driving school in Zurich with English instruction. Category B from CHF 95/session. 85% first-time pass rate.',
      url: 'https://drivingteam.ch/driving-school-zurich/',
      telephone: '+41444310033',
      image: 'https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Baslerstrasse 145',
        addressLocality: 'Zürich',
        postalCode: '8048',
        addressCountry: { '@type': 'Country', name: 'CH' }
      },
      geo: { '@type': 'GeoCoordinates', latitude: 47.3905, longitude: 8.4877 },
      areaServed: ['Zürich-Altstetten', 'Albisrieden', 'Schlieren', 'Höngg', 'Urdorf', 'Dietikon'],
      inLanguage: 'en',
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: ['http://schema.org/Monday','http://schema.org/Tuesday','http://schema.org/Wednesday','http://schema.org/Thursday','http://schema.org/Friday'], opens: 'T07:00', closes: 'T20:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: ['http://schema.org/Saturday'], opens: 'T08:00', closes: 'T17:00' }
      ],
      priceRange: 'CHF 95',
      aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.9, reviewCount: 368, bestRating: 5, worstRating: 1 },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Driving Lessons Zurich',
        itemListElement: [
          { '@type': 'Offer', name: 'Car Driving Lesson Category B (45 min)', price: 95, priceCurrency: 'CHF', availability: 'https://schema.org/InStock', url: 'https://www.simy.ch/booking/availability/driving-team?service=B' },
          { '@type': 'Offer', name: 'Motorcycle Driving Lesson Category A (45 min)', price: 95, priceCurrency: 'CHF', availability: 'https://schema.org/InStock' },
          { '@type': 'Offer', name: 'Trailer Driving Lesson Category BE (45 min)', price: 120, priceCurrency: 'CHF', availability: 'https://schema.org/InStock' },
        ]
      },
      sameAs: ['https://drivingteam.ch/']
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    })
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://drivingteam.ch/' },
        { '@type': 'ListItem', position: 2, name: 'Driving School', item: 'https://drivingteam.ch/auto-fahrschule/' },
        { '@type': 'ListItem', position: 3, name: 'Driving School Zurich', item: 'https://drivingteam.ch/driving-school-zurich/' }
      ]
    })
  }
]
useHead({ script: jsonLdScripts })
</script>
