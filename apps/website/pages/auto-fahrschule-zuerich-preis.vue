<template>
  <div class="preis-landing">
    <Head>
      <Title>Fahrschule Zürich Preis | Ab CHF 95.– | Driving Team</Title>
      <Meta name="description" content="Klarer Preis: Auto Fahrstunde in Zürich ab CHF 95.– / 45 Min. Standort Altstetten, online buchbar. Keine versteckten Kosten." />
      <Meta property="og:title" content="Fahrschule Zürich Preis ab CHF 95.– | Driving Team" />
      <Meta property="og:description" content="Kategorie B Fahrstunden in Zürich ab CHF 95.–. Treffpunkt Bahnhof Altstetten. Online Termin buchen." />
      <Meta property="og:url" content="https://drivingteam.ch/auto-fahrschule-zuerich-preis/" />
      <Link rel="canonical" href="https://drivingteam.ch/auto-fahrschule-zuerich-preis/" />
      <Meta name="robots" content="index, follow" />
    </Head>

    <section class="preis-hero">
      <img
        src="/images/categories/auto-fahrschule-hero.webp"
        alt="Fahrschule Zürich Preis – Kategorie B ab CHF 95"
        class="preis-hero__img"
        fetchpriority="high"
        width="1920"
        height="1080"
      />
      <div class="preis-hero__shade" />
      <div class="preis-hero__inner">
        <p class="preis-brand">Driving Team</p>
        <h1 class="preis-h1">Ab CHF 95.–<span>pro Fahrstunde</span></h1>
        <p class="preis-sub">
          Kategorie B in Zürich-Altstetten — klarer Preis, online buchbar, Treffpunkt Bahnhof.
        </p>
        <div class="preis-cta">
          <a
            :href="bookingUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="preis-btn"
          >
            Jetzt Termin buchen
          </a>
          <a href="tel:+41444310033" class="preis-phone" @click="trackPhone">
            Anrufen
          </a>
        </div>
      </div>
    </section>

    <section class="preis-body">
      <h2>Was du zahlst</h2>
      <ul>
        <li><strong>CHF 95.–</strong> / 45 Min. Fahrstunde Kategorie B</li>
        <li>Treffpunkt Bahnhof Zürich-Altstetten</li>
        <li>Online buchen — Termin in wenigen Minuten</li>
      </ul>
      <a :href="bookingUrl" target="_blank" rel="noopener noreferrer" class="preis-btn preis-btn--ink">
        Online buchen
      </a>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const bookingUrl =
  'https://app.simy.ch/booking/availability/driving-team?category=B&utm_content=ag_preis'

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': ['DrivingSchool', 'LocalBusiness'],
        name: 'Auto Fahrschule Zürich – Preise | Driving Team',
        description:
          'Klarer Preis: Auto Fahrstunde Kategorie B in Zürich-Altstetten ab CHF 95.– / 45 Min. Online buchbar.',
        url: 'https://drivingteam.ch/auto-fahrschule-zuerich-preis/',
        telephone: '+41444310033',
        image: 'https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Vulkanstrasse 130b',
          addressLocality: 'Zürich',
          postalCode: '8048',
          addressCountry: 'CH',
        },
        priceRange: 'CHF 95.–',
        offers: {
          '@type': 'Offer',
          name: 'Auto Fahrstunde Kategorie B (45 Min)',
          price: '95',
          priceCurrency: 'CHF',
          availability: 'https://schema.org/InStock',
          url: bookingUrl,
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '414',
          bestRating: '5',
          worstRating: '1',
        },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://drivingteam.ch/' },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Auto Fahrschule Zürich',
            item: 'https://drivingteam.ch/auto-fahrschule-zuerich/',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Preis',
            item: 'https://drivingteam.ch/auto-fahrschule-zuerich-preis/',
          },
        ],
      }),
    },
  ],
})

function trackPhone() {
  if (typeof window === 'undefined') return
  try {
    const attr = (window as any).__marketingAttribution || {}
    fetch('/api/phone-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: attr.session_id || 'unknown',
        marketing_attribution: attr,
        referrer_page: '/auto-fahrschule-zuerich-preis/',
        utm_content: 'ag_preis',
      }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* ignore */ }
}
</script>

<style scoped>
.preis-landing {
  --ink: #12263a;
  --gold: #d4a017;
  --mist: #eef2f6;
  color: var(--ink);
  background: var(--mist);
  font-family: "Segoe UI", "Helvetica Neue", sans-serif;
}

.preis-hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  align-items: end;
  overflow: hidden;
}

.preis-hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preis-hero__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, rgba(18, 38, 58, 0.88) 0%, rgba(18, 38, 58, 0.55) 48%, rgba(18, 38, 58, 0.35) 100%),
    linear-gradient(180deg, transparent 40%, rgba(18, 38, 58, 0.85) 100%);
}

.preis-hero__inner {
  position: relative;
  z-index: 1;
  padding: clamp(2rem, 6vw, 4.5rem);
  max-width: 42rem;
}

.preis-brand {
  margin: 0 0 0.6rem;
  font-size: clamp(1.5rem, 3.8vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
}

.preis-h1 {
  margin: 0 0 0.85rem;
  font-size: clamp(2.4rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.05;
  color: #fff;
}

.preis-h1 span {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.45em;
  font-weight: 600;
  color: var(--gold);
}

.preis-sub {
  margin: 0 0 1.75rem;
  font-size: 1.1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  max-width: 28rem;
}

.preis-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem 1.1rem;
  align-items: center;
}

.preis-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.95rem 1.45rem;
  border-radius: 0.35rem;
  background: var(--gold);
  color: var(--ink);
  font-weight: 800;
  text-decoration: none;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.preis-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.preis-btn--ink {
  background: var(--ink);
  color: #fff;
  margin-top: 1.5rem;
}

.preis-phone {
  color: #fff;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.preis-body {
  padding: clamp(2.5rem, 6vw, 4rem) clamp(1.25rem, 5vw, 3rem);
  max-width: 40rem;
  margin: 0 auto;
}

.preis-body h2 {
  margin: 0 0 0.85rem;
  font-size: 1.5rem;
}

.preis-body ul {
  margin: 0;
  padding-left: 1.1rem;
  line-height: 1.7;
  color: #334155;
}
</style>
