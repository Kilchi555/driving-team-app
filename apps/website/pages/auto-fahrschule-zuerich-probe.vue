<template>
  <div class="erste-landing">
    <Head>
      <Title>Erste Fahrstunde Zürich | CHF 30.– Rabatt | Driving Team</Title>
      <Meta name="description" content="Erste Fahrstunde Kat. B Automatik oder Schaltung in Zürich-Altstetten mit CHF 30.– Rabatt (Code ERSTE30). Klarer Preis, online buchbar." />
      <Meta property="og:title" content="Erste Fahrstunde Zürich – CHF 30.– Rabatt | Driving Team" />
      <Meta property="og:description" content="Starte mit der ersten Fahrstunde – CHF 30.– Rabatt mit Code ERSTE30. Standort Bahnhof Altstetten." />
      <Meta property="og:url" content="https://drivingteam.ch/auto-fahrschule-zuerich-probe/" />
      <Link rel="canonical" href="https://drivingteam.ch/auto-fahrschule-zuerich-probe/" />
      <Meta name="robots" content="index, follow" />
    </Head>

    <section class="erste-hero">
      <img
        src="/images/categories/auto-fahrschule-hero.webp"
        alt="Erste Fahrstunde Auto Zürich mit Rabatt"
        class="erste-hero__img"
        fetchpriority="high"
        width="1920"
        height="1080"
      />
      <div class="erste-hero__shade" />
      <div class="erste-hero__inner">
        <p class="erste-brand">Driving Team</p>
        <h1 class="erste-h1">Erste Fahrstunde<br /><span>CHF 30.– Rabatt</span></h1>
        <p class="erste-sub">
          Kategorie B Automatik oder Schaltung in Zürich-Altstetten.
          Code <strong>ERSTE30</strong> — nur für die erste Lektion.
          Danach normal CHF 95.–.
        </p>
        <div class="erste-cta">
          <a
            :href="bookingUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="erste-btn"
          >
            Erste Stunde buchen
          </a>
          <a href="tel:+41444310033" class="erste-phone" @click="trackPhone">
            +41 44 431 00 33
          </a>
        </div>
      </div>
    </section>

    <UpcomingSlotsSection page="auto-fahrschule-zuerich-probe" category="B Automatik" />

    <section class="erste-body">
      <h2>So funktioniert’s</h2>
      <ul>
        <li>Online Termin wählen (B Automatik oder B Schaltung)</li>
        <li>Code <strong>ERSTE30</strong> eingeben → CHF 30.– weniger auf die erste Lektion</li>
        <li>Treffpunkt Bahnhof Zürich-Altstetten</li>
        <li>Gilt nur für die erste bestätigte Fahrstunde — nicht für Motorrad, LKW oder andere Kategorien</li>
      </ul>
      <p class="erste-note">
        Effektiver Preis der ersten Lektion: <strong>CHF 65.–</strong> statt CHF 95.–.
      </p>
      <a :href="bookingUrl" target="_blank" rel="noopener noreferrer" class="erste-btn erste-btn--ink">
        Jetzt mit Code buchen
      </a>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const bookingUrl =
  'https://app.simy.ch/booking/availability/driving-team?category=B&code=ERSTE30&utm_content=ag_probe'

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': ['DrivingSchool', 'LocalBusiness'],
        name: 'Erste Fahrstunde Zürich – Driving Team',
        description:
          'Erste Fahrstunde Kategorie B in Zürich-Altstetten mit CHF 30.– Rabatt (Code ERSTE30). Online buchbar.',
        url: 'https://drivingteam.ch/auto-fahrschule-zuerich-probe/',
        telephone: '+41444310033',
        image: 'https://drivingteam.ch/images/categories/auto-fahrschule-hero.webp',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Vulkanstrasse 130b',
          addressLocality: 'Zürich',
          postalCode: '8048',
          addressCountry: 'CH',
        },
        priceRange: 'CHF 65–95',
        offers: {
          '@type': 'Offer',
          name: 'Erste Auto Fahrstunde mit Code ERSTE30',
          price: '65',
          priceCurrency: 'CHF',
          availability: 'https://schema.org/InStock',
          url: bookingUrl,
          description: 'CHF 30.– Rabatt auf die erste Lektion (statt CHF 95.–)',
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
            name: 'Erste Fahrstunde',
            item: 'https://drivingteam.ch/auto-fahrschule-zuerich-probe/',
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
        referrer_page: '/auto-fahrschule-zuerich-probe/',
        utm_content: 'ag_probe',
      }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* ignore */ }
}
</script>

<style scoped>
.erste-landing {
  --ink: #0f1c2e;
  --accent: #c4a35a;
  --paper: #f7f4ef;
  font-family: "Segoe UI", "Helvetica Neue", sans-serif;
  color: var(--ink);
  background: var(--paper);
}

.erste-hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  align-items: end;
  overflow: hidden;
}

.erste-hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.erste-hero__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(15, 28, 46, 0.25) 0%, rgba(15, 28, 46, 0.78) 70%, rgba(15, 28, 46, 0.92) 100%);
}

.erste-hero__inner {
  position: relative;
  z-index: 1;
  padding: clamp(2rem, 6vw, 4.5rem);
  max-width: 42rem;
}

.erste-brand {
  margin: 0 0 0.75rem;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
}

.erste-h1 {
  margin: 0 0 0.75rem;
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
}

.erste-h1 span {
  color: var(--accent);
}

.erste-sub {
  margin: 0 0 1.75rem;
  font-size: 1.1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  max-width: 30rem;
}

.erste-sub strong {
  color: #fff;
  letter-spacing: 0.04em;
}

.erste-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem 1.25rem;
  align-items: center;
}

.erste-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.95rem 1.4rem;
  border-radius: 0.35rem;
  background: var(--accent);
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.erste-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.erste-btn--ink {
  background: var(--ink);
  color: #fff;
  margin-top: 1.25rem;
}

.erste-phone {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 600;
}

.erste-body {
  padding: clamp(2.5rem, 6vw, 4rem) clamp(1.25rem, 5vw, 3rem);
  max-width: 40rem;
  margin: 0 auto;
}

.erste-body h2 {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
}

.erste-body ul {
  margin: 0 0 1rem;
  padding-left: 1.1rem;
  line-height: 1.7;
  color: #334155;
}

.erste-note {
  margin: 0;
  color: #334155;
  line-height: 1.5;
}
</style>
