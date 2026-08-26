<template>
  <div v-if="pending" class="site-loading">Lädt…</div>
  <div v-else-if="error || !landing" class="site-error">
    <h1>Seite nicht gefunden</h1>
    <p>Diese Website ist noch nicht veröffentlicht oder existiert nicht.</p>
  </div>
  <div v-else class="lp" :class="[`lp-template-${templateVariant}`, { 'lp-nav-open': mobileNavOpen }]" :style="cssVars">
    <header class="lp-nav" :class="{ 'lp-nav--pages': pageLinks.length }">
      <div class="lp-nav-inner">
        <div class="lp-brand">
          <NuxtLink :to="homeHref" class="lp-brand-link">
            <img
              v-if="landing.brand.logo_url"
              :src="landing.brand.logo_url"
              :alt="landing.brand.name"
              class="lp-logo"
              width="160"
              height="52"
              decoding="async"
            />
            <span v-else class="lp-brand-name">{{ landing.brand.name }}</span>
          </NuxtLink>
        </div>
        <nav v-if="sectionLinks.length" class="lp-nav-links" aria-label="Bereiche">
          <div
            v-for="n in sectionLinks"
            :key="n.href"
            class="lp-nav-item"
            :class="{ 'has-dd': (n.children || []).length >= 2 }"
          >
            <a :href="n.href">
              {{ n.label }}
              <span v-if="(n.children || []).length >= 2" class="lp-nav-caret" aria-hidden="true" />
            </a>
            <div v-if="(n.children || []).length >= 2" class="lp-nav-dd">
              <a v-for="c in n.children" :key="c.href + c.label" :href="c.href">{{ c.label }}</a>
            </div>
          </div>
        </nav>
        <div class="lp-nav-actions">
          <a
            v-if="whatsappUrl"
            class="lp-nav-wa"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            @click="trackCta('whatsapp')"
          >WhatsApp</a>
          <a class="lp-nav-cta" :href="landing.bookingUrl" @click="trackCta('book')">{{ bookLabel }}</a>
          <button
            v-if="hasDrawer"
            type="button"
            class="lp-nav-toggle"
            :aria-expanded="mobileNavOpen"
            aria-label="Menü"
            @click="mobileNavOpen = !mobileNavOpen"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
      <nav v-if="hasDrawer && mobileNavOpen" class="lp-nav-drawer" aria-label="Menü">
        <template v-for="n in sectionLinks" :key="`s-${n.href}`">
          <a :href="n.href" @click="mobileNavOpen = false">{{ n.label }}</a>
          <a
            v-for="c in n.children || []"
            :key="`sc-${c.href}-${c.label}`"
            class="lp-nav-drawer-sub"
            :href="c.href"
            @click="mobileNavOpen = false"
          >{{ c.label }}</a>
        </template>
        <div v-if="sectionLinks.length && pageLinks.length" class="lp-nav-drawer-sep" />
        <NuxtLink v-for="n in pageLinks" :key="`m-${n.slug}`" :to="n.href" @click="mobileNavOpen = false">{{ n.title }}</NuxtLink>
        <a :href="landing.bookingUrl" @click="mobileNavOpen = false; trackCta('book')">{{ bookLabel }}</a>
        <a v-if="whatsappUrl" :href="whatsappUrl" target="_blank" rel="noopener noreferrer" @click="trackCta('whatsapp')">WhatsApp</a>
      </nav>
    </header>

    <nav v-if="landing" class="lp-crumbs" aria-label="Brotkrumen">
      <NuxtLink :to="homeHref">{{ landing.brand?.name || 'Home' }}</NuxtLink>
      <span aria-hidden="true">/</span>
      <span>{{ pageTitle }}</span>
    </nav>

    <template v-for="(block, idx) in renderBlocks" :key="idx">
      <!-- HERO -->
      <section v-if="block.type === 'hero'" class="lp-hero" :class="{ 'lp-hero--photo': !!heroImage(block) || !!heroVideo(block) }">
        <div class="lp-hero-media" aria-hidden="true">
          <WebsiteHeroMedia
            :src="heroImage(block)"
            :video-url="heroVideo(block)"
            :alt="heroAlt(block)"
            :clip-start="heroVideoStart(block)"
            :clip-duration="heroVideoDuration(block)"
          />
        </div>
        <div class="lp-hero-inner">
          <p class="lp-brand-signal">{{ block.content.brand }}</p>
          <h1 class="lp-h1">{{ block.content.headline }}</h1>
          <p class="lp-hero-sub">{{ block.content.subheadline }}</p>
          <div class="lp-cta-row">
            <a class="lp-btn-primary" :href="block.content.cta_primary_url || landing.bookingUrl" @click="trackCta('hero')">{{ block.content.cta_primary_text || bookLabel }}</a>
            <a v-if="block.content.cta_secondary_url" class="lp-btn-ghost" :href="block.content.cta_secondary_url">
              {{ block.content.cta_secondary_text }}
            </a>
          </div>
          <ul v-if="heroTrust(block).length" class="lp-trust">
            <li v-for="(item, i) in heroTrust(block)" :key="i">
              <span class="lp-trust-icon" aria-hidden="true">
                <WebsiteIcon :name="trustIcon(item, i)" :size="16" />
              </span>
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- SERVICES -->
      <section v-else-if="block.type === 'services'" id="angebot" class="lp-section">
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <p class="lp-lead">{{ block.content.description }}</p>
        <div v-if="block.content.services?.length" class="lp-services">
          <article v-for="svc in block.content.services" :key="svc.id" class="lp-service">
            <img
              v-if="svc.image_url"
              class="lp-service-photo"
              :src="offerPhotoSrc(svc.image_url)"
              :srcset="offerPhotoSrcset(svc.image_url)"
              sizes="(max-width: 700px) 100vw, 360px"
              :alt="svc.name"
              width="600"
              height="400"
              loading="lazy"
            />
            <div class="lp-service-top">
              <h3>{{ svc.name }}</h3>
              <span v-if="svc.price_label" class="lp-price">{{ svc.price_label }}</span>
            </div>
            <p>{{ svc.description }}</p>
            <p v-if="svc.duration_minutes" class="lp-meta">{{ svc.duration_minutes }} Min</p>
            <a
              v-if="svc.book_url || landing.bookingUrl"
              class="lp-service-book"
              :href="svc.book_url || landing.bookingUrl"
              @click="trackCta('service')"
            >{{ bookLabel }}</a>
          </article>
        </div>
        <div v-else class="lp-empty">Angebote werden bald ergänzt.</div>
      </section>

      <!-- PRODUCTS -->
      <section
        v-else-if="block.type === 'products' && (block.content.products || []).length"
        id="produkte"
        class="lp-section lp-section-alt lp-reveal"
      >
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <p class="lp-lead">{{ block.content.description }}</p>
        <div class="lp-services">
          <article v-for="p in block.content.products" :key="p.id" class="lp-service">
            <img
              v-if="p.image_url"
              class="lp-service-photo"
              :src="offerPhotoSrc(p.image_url)"
              :srcset="offerPhotoSrcset(p.image_url)"
              sizes="(max-width: 700px) 100vw, 360px"
              :alt="p.name"
              width="600"
              height="400"
              loading="lazy"
            />
            <div class="lp-service-top">
              <h3>{{ p.name }}</h3>
              <span v-if="p.price_label" class="lp-price">{{ p.price_label }}</span>
            </div>
            <p v-if="p.category" class="lp-meta">{{ p.category }}</p>
            <p v-if="p.description">{{ p.description }}</p>
            <a v-if="p.shop_url" class="lp-service-book" :href="p.shop_url" @click="trackCta('product')">{{ p.cta_label || 'Im Shop kaufen →' }}</a>
          </article>
        </div>
        <div v-if="block.content.cta_url" class="lp-section-cta">
          <a class="lp-btn-primary" :href="block.content.cta_url">{{ block.content.cta_text || 'Zum Shop' }}</a>
        </div>
      </section>

      <!-- TEAM -->
      <section
        v-else-if="block.type === 'team' && (block.content.members || []).length"
        id="team"
        class="lp-section lp-section-center lp-reveal"
      >
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <p class="lp-lead">{{ block.content.description }}</p>
        <div class="lp-team">
          <article v-for="m in block.content.members" :key="m.id" class="lp-team-card">
            <div class="lp-team-avatar" aria-hidden="true">
              <img
                v-if="m.photo_url"
                :src="offerPhotoSrc(m.photo_url, 400)"
                :alt="m.name"
                width="72"
                height="72"
                loading="lazy"
              />
              <span v-else>{{ initials(m.name) }}</span>
            </div>
            <h3>{{ m.name }}</h3>
            <p class="lp-meta">{{ m.role_label }}</p>
            <p v-if="m.languages?.length" class="lp-team-meta">{{ m.languages.join(' · ') }}</p>
            <p v-if="m.categories?.length" class="lp-team-meta">{{ m.categories.slice(0, 3).join(', ') }}</p>
          </article>
        </div>
      </section>

      <!-- COURSES -->
      <section
        v-else-if="block.type === 'courses' && (block.content.items || []).length"
        id="kurse"
        class="lp-section lp-section-alt lp-reveal"
      >
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <p class="lp-lead">{{ block.content.description }}</p>
        <div class="lp-courses">
          <article v-for="c in block.content.items" :key="c.id" class="lp-course">
            <p v-if="c.category" class="lp-meta">{{ c.category }}</p>
            <h3>{{ c.title }}</h3>
            <p v-if="c.starts_at">{{ formatCourseDate(c.starts_at) }}</p>
            <p v-if="c.location" class="lp-meta">{{ c.location }}</p>
            <div class="lp-course-meta">
              <span
                v-if="c.spots_left != null"
                class="lp-spots"
                :class="{ tight: c.spots_left <= 2, full: c.spots_left <= 0 }"
              >
                {{ c.spots_left <= 0 ? 'Ausgebucht' : `${c.spots_left} Plätze frei` }}
              </span>
              <span v-if="c.price_chf != null" class="lp-price">CHF {{ c.price_chf }}.–</span>
            </div>
            <a
              v-if="c.href && (c.spots_left == null || c.spots_left > 0)"
              class="lp-service-book"
              :href="c.href"
            >Platz sichern →</a>
          </article>
        </div>
        <div v-if="block.content.cta_url" class="lp-section-cta">
          <a class="lp-btn-primary" :href="block.content.cta_url">{{ block.content.cta_text || 'Alle Kurse' }}</a>
        </div>
      </section>

      <!-- BOOKING SLOTS -->
      <section
        v-else-if="block.type === 'slots' && displaySlots(block).length"
        id="termine"
        ref="slotsSectionEl"
        class="lp-section lp-reveal"
      >
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <p class="lp-lead">{{ block.content.description }}</p>
        <div class="lp-slots">
          <a
            v-for="s in displaySlots(block)"
            :key="s.id"
            class="lp-slot"
            :href="s.book_url"
          >
            <span class="lp-slot-day">{{ s.day_label }}</span>
            <span class="lp-slot-time">{{ s.time_label }}</span>
            <span class="lp-slot-cat">{{ s.label }}</span>
            <span class="lp-slot-cta">Buchen →</span>
          </a>
        </div>
        <div class="lp-section-cta">
          <a class="lp-btn-primary" :href="block.content.cta_url || landing.bookingUrl">
            {{ block.content.cta_text || 'Alle Termine' }}
          </a>
        </div>
      </section>

      <!-- GALLERY -->
      <section
        v-else-if="block.type === 'gallery' && galleryImages(block).length > 1"
        class="lp-section lp-reveal"
      >
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <div class="lp-gallery">
          <figure v-for="(img, gi) in galleryImages(block).slice(0, 6)" :key="gi">
            <img
              :src="gallerySrc(img.url)"
              :srcset="gallerySrcset(img.url)"
              sizes="(max-width: 700px) 100vw, 600px"
              :alt="img.alt || ''"
              loading="lazy"
              decoding="async"
              width="600"
              height="400"
            />
          </figure>
        </div>
      </section>

      <!-- PROCESS -->
      <section v-else-if="block.type === 'process'" class="lp-section lp-reveal">
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <ol class="lp-process">
          <li v-for="step in block.content.steps" :key="step.n">
            <span class="lp-process-n">{{ step.n }}</span>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- TESTIMONIALS -->
      <section
        v-else-if="block.type === 'testimonials' && displayTestimonials.length"
        class="lp-section lp-section-alt lp-reviews lp-section-center lp-reveal"
      >
        <p class="lp-eyebrow">{{ googleReviews?.source === 'google_places' ? 'Google Bewertungen' : block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>

        <div
          v-if="googleReviews?.source === 'google_places' && googleReviews.averageRating"
          class="lp-rating-summary"
        >
          <p class="lp-rating-score">{{ formatRating(googleReviews.averageRating) }}</p>
          <div class="lp-rating-detail">
            <div class="lp-stars" aria-hidden="true">
              <span
                v-for="n in 5"
                :key="n"
                class="lp-star"
                :class="{ on: n <= Math.round(googleReviews.averageRating) }"
              >★</span>
            </div>
            <p v-if="googleReviews.totalReviewCount">
              {{ googleReviews.totalReviewCount }} Bewertungen auf Google
            </p>
            <p v-else>Aktuelle Stimmen von Google</p>
          </div>
        </div>
        <p v-else class="lp-lead">{{ block.content.description }}</p>

        <div class="lp-quotes">
          <blockquote
            v-for="tm in displayTestimonials"
            :key="tm.id || tm.author"
            class="lp-quote"
          >
            <span class="lp-quote-mark" aria-hidden="true">“</span>
            <div v-if="tm.rating" class="lp-stars" :aria-label="`${tm.rating} von 5 Sternen`">
              <span
                v-for="n in 5"
                :key="n"
                class="lp-star"
                :class="{ on: n <= Math.round(tm.rating) }"
              >★</span>
            </div>
            <p>{{ tm.text }}</p>
            <footer>
              <span class="lp-quote-avatar" aria-hidden="true">{{ initials(tm.author) }}</span>
              <span class="lp-quote-who">
                <strong>{{ tm.author }}</strong>
                <span v-if="tm.relativeTime" class="lp-quote-meta">{{ tm.relativeTime }}</span>
                <span v-else-if="tm.sourceLabel" class="lp-quote-meta">{{ tm.sourceLabel }}</span>
              </span>
            </footer>
            <a
              v-if="tm.link"
              class="lp-quote-link"
              :href="tm.link"
              target="_blank"
              rel="nofollow noopener noreferrer"
            >Auf Google lesen</a>
          </blockquote>
        </div>
      </section>

      <!-- FAQ -->
      <section v-else-if="block.type === 'pages' && block.content.items?.length" class="lp-section lp-reveal">
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <p class="lp-lead">{{ block.content.description }}</p>
        <div class="lp-pages">
          <a
            v-for="p in pageBlockItems(block)"
            :key="pageCardHref(p)"
            :href="pageCardHref(p)"
            class="lp-page-card"
          >
            <span class="lp-page-type">{{ pageTypeLabel(p.type) }}</span>
            <strong>{{ p.title }}</strong>
          </a>
        </div>
      </section>

      <section v-else-if="block.type === 'faq'" class="lp-section lp-section-center">
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <div class="lp-faq">
          <div v-for="(col, ci) in faqColumns(block)" :key="ci" class="lp-faq-col">
            <details
              v-for="(item, i) in col"
              :key="item.q || `${ci}-${i}`"
              class="lp-faq-item"
              :open="ci === 0 && i === 0"
            >
              <summary>{{ item.q }}</summary>
              <p>{{ item.a }}</p>
            </details>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section v-else-if="block.type === 'cta'" class="lp-final lp-reveal">
        <h2>{{ block.content.headline }}</h2>
        <p>{{ block.content.subheadline }}</p>
        <div class="lp-cta-row lp-cta-row--center">
          <a class="lp-btn-primary lp-btn-lg" :href="block.content.cta_url">{{ block.content.cta_text }}</a>
          <a
            v-if="block.content.whatsapp_url || whatsappUrl"
            class="lp-btn-ghost lp-btn-ghost--on-dark"
            :href="block.content.whatsapp_url || whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ block.content.whatsapp_text || 'WhatsApp' }}</a>
        </div>
      </section>

      <!-- CONTACT (+ optional map section) -->
      <template v-else-if="block.type === 'contact'">
        <section
          v-if="pickupCheck(block)"
          id="treffpunkt"
          class="lp-section lp-section-center lp-pickup-check lp-reveal"
        >
          <p class="lp-eyebrow">Treffpunkt</p>
          <h2 class="lp-h2">{{ pickupCheck(block).title }}</h2>
          <p class="lp-lead">{{ pickupCheck(block).subtitle }}</p>
          <form class="lp-pickup-form" @submit.prevent="checkPickupPlz">
            <input
              v-model="pickupPlz"
              type="text"
              inputmode="numeric"
              autocomplete="postal-code"
              maxlength="4"
              pattern="[1-9][0-9]{3}"
              :placeholder="pickupCheck(block).placeholder || 'PLZ'"
              aria-label="Postleitzahl"
            />
            <button class="lp-btn-primary" type="submit" :disabled="pickupChecking || pickupPlz.length !== 4">
              {{ pickupChecking ? 'Prüfen…' : (pickupCheck(block).cta || 'Prüfen') }}
            </button>
          </form>
          <p v-if="pickupMsg" class="lp-pickup-result" :class="pickupResultClass">{{ pickupMsg }}</p>
          <div v-if="pickupResult?.in_radius === true" class="lp-section-cta">
            <a
              v-if="pickupCheck(block).book_url || landing?.bookingUrl"
              class="lp-btn-primary"
              :href="pickupCheck(block).book_url || landing?.bookingUrl"
            >Jetzt buchen</a>
          </div>
          <div v-else-if="pickupResult && pickupResult.in_radius !== true" class="lp-section-cta">
            <button type="button" class="lp-btn-ghost" @click="askPickupLead">Anfrage senden</button>
          </div>
        </section>

        <section
          v-if="block.content.map_embed_url"
          id="standort"
          class="lp-section lp-map-section lp-reveal"
        >
          <p class="lp-eyebrow">{{ block.content.map_eyebrow || 'Standort' }}</p>
          <h2 class="lp-h2">{{ block.content.map_title || 'So finden Sie uns' }}</h2>
          <p v-if="block.content.address || block.content.city" class="lp-lead">
            <span v-if="block.content.address">{{ block.content.address }}</span>
            <template v-if="mapCityLine(block.content)">
              <span v-if="block.content.address"> · </span>{{ mapCityLine(block.content) }}
            </template>
          </p>
          <WebsiteLocationMap
            :embed-url="block.content.map_embed_url"
            :open-url="block.content.map_url"
            title="Karte"
          />
          <div v-if="block.content.map_url" class="lp-section-cta">
            <a
              class="lp-btn-ghost"
              :href="block.content.map_url"
              target="_blank"
              rel="noopener noreferrer"
            >In Google Maps öffnen</a>
          </div>
        </section>

        <footer id="kontakt" class="lp-footer">
          <div class="lp-footer-inner">
            <div v-if="block.content.form_enabled !== false" class="lp-lead-form">
              <h3>{{ block.content.form_title || 'Nachricht schreiben' }}</h3>
              <p>{{ block.content.form_subtitle }}</p>
              <form class="lp-form" @submit.prevent="submitLead">
                <input
                  type="text"
                  name="company"
                  tabindex="-1"
                  autocomplete="off"
                  aria-hidden="true"
                  class="lp-honeypot"
                  v-model="leadForm.company"
                />
                <input v-model="leadForm.first_name" type="text" required placeholder="Vorname" autocomplete="given-name" />
                <input v-model="leadForm.email" type="email" required placeholder="E-Mail" autocomplete="email" />
                <input v-model="leadForm.phone" type="tel" placeholder="Telefon" autocomplete="tel" />
                <textarea v-model="leadForm.message" rows="3" placeholder="Ihre Nachricht (optional)" />
                <button type="submit" class="lp-btn-primary" :disabled="leadSending">
                  {{ leadSending ? 'Senden…' : 'Absenden' }}
                </button>
                <p v-if="leadMsg" class="lp-form-msg" :class="{ ok: leadOk }">{{ leadMsg }}</p>
              </form>
            </div>

            <div class="lp-footer-grid">
              <div class="lp-contact-identity">
                <p class="lp-contact-kicker">Kontakt</p>
                <strong class="lp-contact-name">{{ block.content.name }}</strong>
                <p v-if="showHqAddress(block)" class="lp-contact-address">
                  <span v-if="block.content.address">{{ block.content.address }}</span>
                  <template v-if="mapCityLine(block.content)">
                    <span v-if="block.content.address"><br /></span>{{ mapCityLine(block.content) }}
                  </template>
                </p>
                <ul v-if="meetingPoints(block).length" class="lp-meeting-points">
                  <li v-for="p in meetingPoints(block)" :key="p.id || p.name">
                    <strong>{{ p.name }}</strong>
                    <span v-if="p.address">{{ p.address }}</span>
                  </li>
                </ul>
                <div v-if="contactChannels(block).length" class="lp-contact-channels">
                  <a
                    v-for="ch in contactChannels(block)"
                    :key="ch.key"
                    class="lp-contact-channel"
                    :href="ch.href"
                    :target="ch.external ? '_blank' : undefined"
                    :rel="ch.external ? 'noopener noreferrer' : undefined"
                  >
                    <span class="lp-contact-channel-icon" aria-hidden="true" v-html="ch.icon" />
                    <span class="lp-contact-channel-copy">
                      <span class="lp-contact-channel-label">{{ ch.label }}</span>
                      <span class="lp-contact-channel-value">{{ ch.value }}</span>
                    </span>
                  </a>
                </div>
                <nav v-if="socialLinks(block).length" class="lp-social" aria-label="Social Media">
                  <a
                    v-for="s in socialLinks(block)"
                    :key="s.key || s.href"
                    :href="s.href"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ s.label }}</a>
                </nav>
              </div>

              <div v-if="(block.content.hours || []).length" class="lp-hours">
                <strong>{{ block.content.hours_title || 'Öffnungszeiten' }}</strong>
                <ul>
                  <li v-for="h in block.content.hours" :key="h.day">
                    <span>{{ h.label }}</span>
                    <span>{{ h.display }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="lp-legal-row">
              <NuxtLink
                v-for="l in (block.content.legal_links || defaultLegalLinks)"
                :key="l.href"
                :to="legalHref(l.href)"
              >{{ l.label }}</NuxtLink>
            </div>

            <p
              v-for="(credit, ci) in photoCredits"
              :key="`${credit.photographer}-${ci}`"
              class="lp-photo-credit"
            >
              Photo by
              <a
                v-if="credit.photographer_url"
                :href="credit.photographer_url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ credit.photographer }}</a>
              <span v-else>{{ credit.photographer }}</span>
              on
              <a
                :href="credit.unsplash_url || 'https://unsplash.com/?utm_source=simy&utm_medium=referral'"
                target="_blank"
                rel="noopener noreferrer"
              >Unsplash</a>
            </p>
            <p v-if="!hidePoweredBy" class="lp-powered">Website mit Simy</p>
          </div>
        </footer>
      </template>
    </template>

    <nav v-if="stickyActions.length" class="lp-sticky-bar" aria-label="Schnellkontakt">
      <a
        v-for="a in stickyActions"
        :key="a.key"
        :href="a.href"
        :target="a.external ? '_blank' : undefined"
        :rel="a.external ? 'noopener noreferrer' : undefined"
        :class="['lp-sticky-btn', `lp-sticky-btn--${a.key}`]"
        @click="trackCta(a.key)"
      >{{ a.label }}</a>
    </nav>
  </div>
</template>

<script setup lang="ts">
import '~/assets/css/website-landing-fonts.css'
import WebsiteIcon from '~/components/website/WebsiteIcon.vue'
import { isWebsiteIconKey, trustIconForLabel, type WebsiteIconKey } from '~/utils/website-icons'
import { heroPreloadAttrs, offerPhotoSrc, offerPhotoSrcset, websiteImageProxyUrl } from '~/utils/website-responsive-image'
import { websiteOverflowPages, websitePageCardHref, websitePageLinks, websiteStandardLinks } from '~/utils/website-nav'
import { websiteFontCssVars, websiteFontHeadLinks } from '~/utils/website-fonts'
import { isWebsitePickupMeetingPoint } from '~/utils/website-wizard-content'

definePageMeta({
  layout: 'site',
  ssr: true,
})

const route = useRoute()
const subdomain = computed(() => String(route.params.subdomain || '').toLowerCase())
const pageSlug = computed(() => String(route.params.slug || '').toLowerCase())
const preview = computed(() => route.query.preview === '1')
const mobileNavOpen = ref(false)
const leadForm = ref({ first_name: '', email: '', phone: '', message: '', company: '' })
const leadSending = ref(false)
const leadMsg = ref('')
const leadOk = ref(false)
const pickupPlz = ref('')
const pickupChecking = ref(false)
const pickupMsg = ref('')
const pickupResult = ref<{ in_radius?: boolean | null; minutes?: number | null; radius_minutes?: number | null; plz?: string } | null>(null)
const liveSlots = ref<any[] | null>(null)
const slotsSectionEl = ref<HTMLElement | null>(null)

if (import.meta.server && preview.value) {
  const ev = useRequestEvent()
  ev?.node?.res?.setHeader?.('Cache-Control', 'private, no-store')
}

if (pageSlug.value === 'index' || pageSlug.value === '') {
  await navigateTo(`/s/${subdomain.value}${preview.value ? '?preview=1' : ''}`, { redirectCode: 301 })
}

const { data, pending, error } = await useAsyncData(
  () => `site-${subdomain.value}-${pageSlug.value}-${preview.value ? 'p' : 'l'}`,
  () =>
    $fetch(
      `/api/public/website/${encodeURIComponent(subdomain.value)}/${encodeURIComponent(pageSlug.value)}`,
      {
        query: preview.value ? { preview: '1' } : undefined,
      },
    ),
  { watch: [subdomain, pageSlug, preview] },
)

const websiteId = computed(() => data.value?.website?.id || null)
const { trackPageview, trackCta } = useWebsitePublicAnalytics(websiteId, preview)

const homeHref = computed(() => `/s/${subdomain.value}${preview.value ? '?preview=1' : ''}`)
const pageTitle = computed(
  () => data.value?.page?.title || landing.value?.seo?.title || pageSlug.value,
)
const sectionLinks = computed(() =>
  websiteStandardLinks({
    blocks: landing.value?.blocks,
    pages: (data.value as any)?.nav || [],
    homeHref: homeHref.value,
    onHome: false,
    slots: landing.value?.nav_slots || null,
  }),
)
const pageLinks = computed(() =>
  websiteOverflowPages(
    websitePageLinks((data.value as any)?.nav || [], pageSlug.value),
    sectionLinks.value,
  ),
)
const hasDrawer = computed(() => sectionLinks.value.length + pageLinks.value.length > 0)

const { data: googleReviews } = await useAsyncData(
  () => `site-reviews-${subdomain.value}-${preview.value ? 'p' : 'l'}`,
  async () => {
    try {
      return await $fetch<{
        source: string
        averageRating: number | null
        totalReviewCount: number | null
        reviews: Array<{
          id: string
          author: string
          text: string
          rating: number
          link?: string
          relativeTime?: string
          sourceLabel?: string
        }>
      }>(`/api/public/website/${encodeURIComponent(subdomain.value)}/reviews`, {
        query: {
          ...(preview.value ? { preview: '1' } : {}),
          limit: 8,
        },
      })
    } catch {
      return null
    }
  },
  { watch: [subdomain, preview] },
)

const landing = computed(() => {
  const raw = data.value?.landing
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).blocks)) return raw as any
  return null
})

const heroAttribution = computed(() => {
  const a = landing.value?.brand?.hero_attribution
  if (!a?.photographer) return null
  return a as {
    photographer?: string | null
    photographer_url?: string | null
    unsplash_url?: string | null
  }
})

const photoCredits = computed(() => {
  const raw = (landing.value?.brand as any)?.stock_credits
  const list = Array.isArray(raw) ? raw : heroAttribution.value ? [heroAttribution.value] : []
  const seen = new Set<string>()
  return list.filter((c: any) => {
    const key = String(c?.photographer || c?.unsplash_url || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
})

// On app.simy.ch/s/... prefer verified custom domain (SEO)
if (import.meta.server && !preview.value) {
  const custom = data.value?.website?.custom_domain
  const verified = data.value?.website?.custom_domain_verified
  const host = useRequestHeaders(['host', 'x-forwarded-host'])
  const rawHost = String(host['x-forwarded-host'] || host.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
  const onAppHost =
    !rawHost ||
    rawHost === 'app.simy.ch' ||
    rawHost === 'www.app.simy.ch' ||
    rawHost.endsWith('.vercel.app') ||
    rawHost === 'localhost' ||
    rawHost.startsWith('127.0.0.1')
  if (custom && verified && onAppHost) {
    await navigateTo(`https://${custom}/${pageSlug.value}`, { redirectCode: 301, external: true })
  }
}

const displayTestimonials = computed(() => {
  if (googleReviews.value?.source === 'google_places' && googleReviews.value.reviews?.length) {
    return googleReviews.value.reviews
  }
  const block = landing.value?.blocks?.find((b: any) => b.type === 'testimonials')
  return (block?.content?.testimonials || []).filter((t: any) => t?.text)
})

const renderBlocks = computed(() => {
  const blocks = [...(landing.value?.blocks || [])]
  const hasTestimonials = blocks.some((b: any) => b.type === 'testimonials')
  if (!hasTestimonials && displayTestimonials.value.length) {
    const idx = blocks.findIndex((b: any) => b.type === 'services')
    const shell = {
      type: 'testimonials',
      content: {
        eyebrow: 'Google Bewertungen',
        title: 'Das sagen Kunden',
        description: 'Aktuelle Stimmen von Google.',
        testimonials: [],
      },
    }
    blocks.splice(idx >= 0 ? idx + 1 : 1, 0, shell)
  }
  return blocks
})

const heroTrust = (block: any) => {
  const items = [...(block?.content?.trust || [])]
  if (googleReviews.value?.source === 'google_places' && googleReviews.value.averageRating) {
    const ratingItem = {
      value: `${googleReviews.value.averageRating}★`,
      label: 'Google',
      icon: 'star' as WebsiteIconKey,
    }
    const ratingIdx = items.findIndex((i: any) => /bewertung|★|google/i.test(`${i.value}${i.label}`))
    if (ratingIdx >= 0) items[ratingIdx] = { ...items[ratingIdx], ...ratingItem }
    else items.splice(1, 0, ratingItem)
  }
  return items
}

const trustIcon = (item: any, index: number): WebsiteIconKey => {
  if (isWebsiteIconKey(item?.icon)) return item.icon
  return trustIconForLabel(String(item?.label || ''), index)
}

const bookLabel = computed(() => {
  const hero = landing.value?.blocks?.find((b: any) => b.type === 'hero')
  return hero?.content?.cta_primary_text || 'Jetzt buchen'
})

const templateVariant = computed(() => {
  const t = landing.value?.brand?.template
  return t === 'bold' || t === 'editorial' ? t : 'classic'
})

const hidePoweredBy = computed(() => landing.value?.brand?.hide_powered_by !== false)

const whatsappUrl = computed(() => {
  const contact = landing.value?.blocks?.find((b: any) => b.type === 'contact')
  const hero = landing.value?.blocks?.find((b: any) => b.type === 'hero')
  return contact?.content?.whatsapp_url || hero?.content?.whatsapp_url || null
})

const meetingPoints = (block: any) =>
  (Array.isArray(block?.content?.meeting_points) ? block.content.meeting_points : []).filter(
    (p: any) => p?.name && isWebsitePickupMeetingPoint(p),
  )

const showHqAddress = (block: any) => {
  if (block?.content?.show_hq_address === false) return false
  return !!(block?.content?.address || block?.content?.city)
}

const socialLinks = (block: any) =>
  (Array.isArray(block?.content?.social) ? block.content.social : []).filter(
    (s: any) => s?.href && s?.label,
  )

const pickupCheck = (block: any) =>
  block?.content?.pickup_check?.enabled ? block.content.pickup_check : null

const pickupResultClass = computed(() => {
  if (pickupResult.value?.in_radius === true) return 'ok'
  if (pickupResult.value?.in_radius === false) return 'no'
  return ''
})

async function checkPickupPlz() {
  const plz = String(pickupPlz.value || '').replace(/\D/g, '').slice(0, 4)
  pickupPlz.value = plz
  pickupMsg.value = ''
  pickupResult.value = null
  if (!/^[1-9]\d{3}$/.test(plz)) {
    pickupMsg.value = 'Bitte eine gültige Schweizer PLZ eingeben.'
    return
  }
  pickupChecking.value = true
  try {
    const res = await $fetch<{
      in_radius?: boolean | null
      minutes?: number | null
      radius_minutes?: number | null
      plz?: string
    }>(`/api/public/website/${encodeURIComponent(subdomain.value)}/pickup-check`, {
      method: 'POST',
      query: preview.value ? { preview: '1' } : undefined,
      body: { plz },
    })
    pickupResult.value = res
    if (res.in_radius === true) {
      pickupMsg.value =
        res.minutes != null
          ? `Ja — ${plz} liegt im Radius (ca. ${res.minutes} Min.). Bei der Buchung die Adresse angeben.`
          : `Ja — ${plz} liegt im Radius. Bei der Buchung die Adresse angeben.`
    } else if (res.in_radius === false) {
      pickupMsg.value = `${plz} liegt ausserhalb. Wählen Sie einen festen Treffpunkt oder senden Sie uns eine Anfrage.`
    } else {
      pickupMsg.value = `${plz} können wir nicht automatisch prüfen. Schreib uns kurz — wir schauen es an.`
    }
  } catch (e: any) {
    pickupMsg.value = e?.data?.statusMessage || e?.message || 'Prüfung fehlgeschlagen'
  } finally {
    pickupChecking.value = false
  }
}

function askPickupLead() {
  const plz = pickupResult.value?.plz || pickupPlz.value
  leadForm.value.message = plz
    ? `Anfrage eigener Treffpunkt: PLZ ${plz} — bitte prüfen, ob im Radius.`
    : 'Anfrage eigener Treffpunkt — bitte Radius prüfen.'
  document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' })
}

const contactPhone = computed(() => {
  const contact = landing.value?.blocks?.find((b: any) => b.type === 'contact')
  return contact?.content?.phone || landing.value?.brand?.phone || null
})

const telHref = computed(() => {
  const raw = String(contactPhone.value || '').replace(/[^\d+]/g, '')
  return raw ? `tel:${raw}` : null
})

const stickyActions = computed(() => {
  const out: Array<{ key: string; href: string; label: string; external?: boolean }> = []
  if (telHref.value) out.push({ key: 'call', href: telHref.value, label: 'Anrufen' })
  if (whatsappUrl.value) out.push({ key: 'wa', href: whatsappUrl.value, label: 'WhatsApp', external: true })
  if (landing.value?.bookingUrl) out.push({ key: 'book', href: landing.value.bookingUrl, label: 'Buchen' })
  return out
})

const previewQs = computed(() => (preview.value ? '?preview=1' : ''))

const defaultLegalLinks = computed(() => [
  { label: 'Impressum', href: `/s/${subdomain.value}/impressum${previewQs.value}` },
  { label: 'Datenschutz', href: `/s/${subdomain.value}/datenschutz${previewQs.value}` },
])

function legalHref(href: string) {
  const qs = previewQs.value
  if (!href) return defaultLegalLinks.value[0].href
  if (href.startsWith('http')) {
    try {
      const u = new URL(href)
      if (u.pathname.includes('/impressum')) return `/s/${subdomain.value}/impressum${qs}`
      if (u.pathname.includes('/datenschutz')) return `/s/${subdomain.value}/datenschutz${qs}`
    } catch {
      /* ignore */
    }
  }
  if (href.includes('impressum')) return `/s/${subdomain.value}/impressum${qs}`
  if (href.includes('datenschutz')) return `/s/${subdomain.value}/datenschutz${qs}`
  return href
}

/** Avoid "8000 Zürich Zürich" when address already contains city/zip. */
function mapCityLine(c: { address?: string; postal_code?: string; city?: string }) {
  const zip = String(c.postal_code || '').trim()
  const city = String(c.city || '').trim()
  if (!zip && !city) return ''
  const line = [zip, city].filter(Boolean).join(' ')
  const addr = String(c.address || '')
  if (line && addr.includes(line)) return ''
  if (city && addr.includes(city) && (!zip || addr.includes(zip))) return ''
  return line
}

const CONTACT_ICONS = {
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>',
  email:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m22 6-10 7L2 6"/></svg>',
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9.5 8.3L5 21l1.3-3.9A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.5 10.5c.5 2 2.5 4 4.5 4.5"/><path d="M14.5 9.5 16 8"/><path d="m9.5 8.5 1.2 1.2"/></svg>',
} as const

function contactChannels(block: any) {
  const c = block?.content || {}
  const channels = c.channels || {}
  const out: Array<{
    key: string
    label: string
    value: string
    href: string
    external?: boolean
    icon: string
  }> = []
  if (channels.phone !== false && c.phone) {
    out.push({
      key: 'phone',
      label: 'Telefon',
      value: String(c.phone),
      href: `tel:${c.phone}`,
      icon: CONTACT_ICONS.phone,
    })
  }
  if (channels.email !== false && c.email) {
    out.push({
      key: 'email',
      label: 'E-Mail',
      value: String(c.email),
      href: `mailto:${c.email}`,
      icon: CONTACT_ICONS.email,
    })
  }
  if (channels.whatsapp !== false && c.whatsapp_url) {
    out.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      value: 'Nachricht senden',
      href: String(c.whatsapp_url),
      external: true,
      icon: CONTACT_ICONS.whatsapp,
    })
  }
  return out
}

function initials(name: string) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
}

function formatRating(value: number | string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toFixed(1).replace(/\.0$/, '')
}

function formatCourseDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-CH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function displaySlots(block: any) {
  if (liveSlots.value?.length) return liveSlots.value
  return block?.content?.items || []
}

const FAQ_SHOW = 10
function faqColumns(block: any) {
  const items = (Array.isArray(block?.content?.items) ? block.content.items : [])
    .filter((item: any) => item?.q)
    .slice(0, FAQ_SHOW)
  const mid = Math.ceil(items.length / 2)
  return [items.slice(0, mid), items.slice(mid)]
}

function galleryImages(block: any) {
  const logo = String(landing.value?.brand?.logo_url || '').trim()
  const imgs = Array.isArray(block?.content?.images) ? block.content.images : []
  return imgs.filter((img: any) => {
    const url = String(img?.url || '').trim()
    if (!url) return false
    if (logo && (url === logo || url.split('?')[0] === logo.split('?')[0])) return false
    const alt = String(img?.alt || '').toLowerCase()
    if (alt.includes('logo')) return false
    return true
  })
}

async function refreshSlotsQuietly() {
  if (!subdomain.value) return
  try {
    const res = await $fetch<{ slots: any[] }>(
      `/api/public/website/${encodeURIComponent(subdomain.value)}/next-slots`,
      {
        query: {
          ...(preview.value ? { preview: '1' } : {}),
          _t: Date.now(),
        },
      },
    )
    if (Array.isArray(res?.slots)) liveSlots.value = res.slots
  } catch {
    /* keep SSR teaser */
  }
}

async function submitLead() {
  if (leadSending.value) return
  leadSending.value = true
  leadMsg.value = ''
  try {
    const res = await $fetch<{ message?: string }>(
      `/api/public/website/${encodeURIComponent(subdomain.value)}/lead`,
      {
        method: 'POST',
        query: preview.value ? { preview: '1' } : undefined,
        body: { ...leadForm.value, category: 'contact', ...(preview.value ? { preview: '1' } : {}) },
      },
    )
    leadOk.value = true
    leadMsg.value = res?.message || 'Danke — wir melden uns.'
    leadForm.value = { first_name: '', email: '', phone: '', message: '', company: '' }
  } catch (e: any) {
    leadOk.value = false
    leadMsg.value = e?.data?.statusMessage || e?.message || 'Senden fehlgeschlagen'
  } finally {
    leadSending.value = false
  }
}

const heroImage = (block: any) =>
  block?.content?.image_url ||
  landing.value?.brand?.hero_image_url ||
  data.value?.website?.hero_image_url ||
  null

const heroAlt = (block: any) =>
  block?.content?.image_alt ||
  `${landing.value?.brand?.name || data.value?.tenant?.name || 'Website'} — ${block?.content?.headline || 'Hero'}`

const heroVideo = (block: any) =>
  block?.content?.video_url || landing.value?.brand?.hero_video_url || null
const heroVideoStart = (block: any) =>
  block?.content?.video_start ?? landing.value?.brand?.hero_video_start ?? 0
const heroVideoDuration = (block: any) =>
  block?.content?.video_duration ?? landing.value?.brand?.hero_video_duration ?? 0

const gallerySrc = (url: string) => (url ? websiteImageProxyUrl(url, 800, 'webp', 'inside') : '')
const gallerySrcset = (url: string) =>
  url
    ? [400, 800].map((w) => `${websiteImageProxyUrl(url, w, 'webp', 'inside')} ${w}w`).join(', ')
    : ''
function pageTypeLabel(type: string) {
  if (type === 'location') return 'Standort'
  if (type === 'category') return 'Angebot'
  if (type === 'prices') return 'Preise'
  return 'Seite'
}
function pageCardHref(p: { href?: string; url?: string; slug?: string; title?: string }) {
  return websitePageCardHref(p, subdomain.value, (data.value as any)?.nav || [])
}
function pageBlockItems(block: any) {
  return (block?.content?.items || []).filter((p: any) => pageCardHref(p))
}

const ssrRequestOrigin = import.meta.server
  ? (() => {
      const headers = useRequestHeaders(['x-forwarded-host', 'host', 'x-forwarded-proto'])
      const host = String(headers['x-forwarded-host'] || headers.host || 'app.simy.ch')
        .split(',')[0]
        .trim()
      const proto = String(headers['x-forwarded-proto'] || 'https')
      return { host, proto }
    })()
  : null

const ogImage = computed(() => {
  if (subdomain.value) {
    const q = pageSlug.value && pageSlug.value !== 'index' ? `?slug=${encodeURIComponent(pageSlug.value)}` : ''
    const path = `/api/public/website/${encodeURIComponent(subdomain.value)}/og.png${q}`
    if (import.meta.server && ssrRequestOrigin) {
      return `${ssrRequestOrigin.proto}://${ssrRequestOrigin.host}${path}`
    }
    if (import.meta.client && typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    return `https://app.simy.ch${path}`
  }
  return (
    landing.value?.brand?.hero_image_url ||
    data.value?.website?.hero_image_url ||
    landing.value?.brand?.logo_url ||
    data.value?.website?.logo_url ||
    ''
  )
})

const heroPreload = computed(
  () =>
    landing.value?.brand?.hero_image_url ||
    data.value?.website?.hero_image_url ||
    '',
)

const cssVars = computed(() => {
  const b = landing.value?.brand
  return {
    '--lp-primary': b?.primary || '#0F766E',
    '--lp-secondary': b?.secondary || '#134E4A',
    '--lp-accent': b?.accent || '#F59E0B',
    ...websiteFontCssVars((b as any)?.font_pair),
  }
})

const seoTitle = computed(
  () =>
    landing.value?.seo?.title ||
    data.value?.website?.seo_title ||
    data.value?.tenant?.name ||
    'Website',
)
const seoDescription = computed(
  () =>
    landing.value?.seo?.description ||
    data.value?.website?.seo_description ||
    '',
)
const canonical = computed(() => {
  const custom = data.value?.website?.custom_domain
  const verified = data.value?.website?.custom_domain_verified
  if (custom && verified) return `https://${custom}/${pageSlug.value}`
  const baked = String(landing.value?.siteUrl || '').replace(/\/$/, '')
  if (baked) return `${baked}/${pageSlug.value}`
  return `https://app.simy.ch/s/${subdomain.value}/${pageSlug.value}`
})

const jsonLd = computed(() => {
  const schema = landing.value?.schema
  if (!schema || typeof schema !== 'object') return null

  const baked = String(landing.value?.siteUrl || '').replace(/\/$/, '')
  const homeCanon = canonical.value.replace(/\/[^/]*$/, '') || baked
  let clone =
    baked && homeCanon && baked !== homeCanon
      ? JSON.parse(JSON.stringify(schema).split(baked).join(homeCanon))
      : JSON.parse(JSON.stringify(schema))

  if (
    googleReviews.value?.source === 'google_places' &&
    googleReviews.value.averageRating
  ) {
    const graph = Array.isArray(clone['@graph']) ? clone['@graph'] : []
    const business = graph.find((n: any) => {
      const t = n?.['@type']
      return (
        t === 'LocalBusiness' ||
        t === 'DrivingSchool' ||
        (Array.isArray(t) && (t.includes('LocalBusiness') || t.includes('DrivingSchool')))
      )
    })
    if (business) {
      business.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: googleReviews.value.averageRating,
        reviewCount: Math.max(
          1,
          googleReviews.value.totalReviewCount || googleReviews.value.reviews?.length || 1,
        ),
      }
    }
  }
  return clone
})

const faviconHref = computed(
  () =>
    data.value?.website?.favicon_url ||
    landing.value?.brand?.logo_url ||
    data.value?.website?.logo_url ||
    '/simy-favicon.png',
)

useHead(() => ({
  title: seoTitle.value,
  htmlAttrs: { lang: 'de-CH' },
  meta: [
    { name: 'description', content: seoDescription.value },
    { name: 'keywords', content: landing.value?.seo?.keywords || data.value?.website?.seo_keywords || '' },
    { name: 'robots', content: preview.value ? 'noindex,nofollow' : 'index,follow' },
    { property: 'og:locale', content: 'de_CH' },
    { property: 'og:site_name', content: landing.value?.brand?.name || data.value?.tenant?.name || 'Website' },
    { property: 'og:title', content: seoTitle.value },
    { property: 'og:description', content: seoDescription.value },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical.value },
    ...(ogImage.value
      ? [
          { property: 'og:image', content: ogImage.value },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
        ]
      : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: seoTitle.value },
    { name: 'twitter:description', content: seoDescription.value },
    ...(ogImage.value ? [{ name: 'twitter:image', content: ogImage.value }] : []),
    { name: 'theme-color', content: String(cssVars.value['--lp-primary']) },
  ],
  link: [
    { rel: 'canonical', href: canonical.value },
    { rel: 'icon', href: faviconHref.value },
    { rel: 'apple-touch-icon', href: faviconHref.value },
    ...websiteFontHeadLinks((landing.value?.brand as any)?.font_pair),
    ...(heroPreload.value
      ? [
          {
            rel: 'preload',
            as: 'image',
            href: heroPreloadAttrs(heroPreload.value)?.href || heroPreload.value,
            imagesrcset: heroPreloadAttrs(heroPreload.value)?.imagesrcset || undefined,
            imagesizes: heroPreloadAttrs(heroPreload.value)?.imagesizes || '100vw',
            fetchpriority: 'high',
          } as any,
        ]
      : []),
    { rel: 'alternate', type: 'application/xml', href: `/s/${subdomain.value}/sitemap.xml`, title: 'Sitemap' },
  ],
  script: jsonLd.value
    ? [
        {
          type: 'application/ld+json',
          children: JSON.stringify(jsonLd.value),
        },
      ]
    : [],
}))

// Pageview analytics (skip preview / SSR)
onMounted(() => {
  trackPageview()

  // Soft-refresh teaser slots when section is visible / every 3 min
  refreshSlotsQuietly()
  const timer = setInterval(refreshSlotsQuietly, 180000)
  let observer: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) refreshSlotsQuietly()
      },
      { rootMargin: '120px' },
    )
    nextTick(() => {
      if (slotsSectionEl.value) observer?.observe(slotsSectionEl.value)
    })
  }
  onBeforeUnmount(() => {
    clearInterval(timer)
    observer?.disconnect()
  })
})
</script>

<style scoped>
.lp {
  --lp-ink: #0c1222;
  --lp-muted: #5b6577;
  --lp-line: rgba(12, 18, 34, 0.08);
  --lp-bg: #f7f4ef;
  color: var(--lp-ink);
  --lp-font-display: Syne;
  --lp-font-body: Manrope;
  font-family: var(--lp-font-body), ui-sans-serif, system-ui, sans-serif;
  background: #fff;
}

.site-loading,
.site-error {
  min-height: 60vh;
  display: grid;
  place-content: center;
  gap: 0.5rem;
  text-align: center;
  font-family: var(--lp-font-body), sans-serif;
  padding: 2rem;
}
.site-error h1 {
  font-family: var(--lp-font-display), sans-serif;
  font-size: 1.75rem;
}

.lp-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.72);
  border-bottom: 1px solid color-mix(in srgb, var(--lp-line) 70%, transparent);
}
.lp-nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.7rem 1.25rem;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.75rem;
}
.lp-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}
.lp-nav .lp-logo {
  display: block;
  height: 40px;
  width: auto;
  max-height: 40px;
  max-width: min(168px, 46vw);
  border-radius: 0;
  object-fit: contain;
  object-position: left center;
}
.lp-brand-name {
  font-family: var(--lp-font-display), sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lp-brand-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: inherit;
  text-decoration: none;
  min-width: 0;
}
.lp-nav-links {
  display: none;
  gap: 2rem;
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-end;
  padding-right: 1.5rem;
  overflow: visible;
}
.lp-nav-item {
  position: relative;
  flex-shrink: 0;
}
.lp-nav-links a {
  color: var(--lp-muted);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
}
.lp-nav-item > a {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}
.lp-nav-links a:hover {
  color: var(--lp-ink);
}
.lp-nav-caret {
  width: 0.35rem;
  height: 0.35rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-1px);
  opacity: 0.7;
}
.lp-nav-dd {
  display: none;
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 50%;
  transform: translateX(-50%);
  min-width: 13.5rem;
  padding: 0.4rem 0;
  background: #fff;
  border: 1px solid var(--lp-line);
  border-radius: 0.75rem;
  box-shadow: 0 10px 28px rgba(12, 18, 34, 0.1);
  z-index: 40;
}
.lp-nav-dd a {
  display: block;
  padding: 0.55rem 0.9rem;
  font-size: 0.84rem;
  color: var(--lp-ink);
  white-space: normal;
}
.lp-nav-dd a:hover {
  background: color-mix(in srgb, var(--lp-primary) 8%, #fff);
}
.lp-nav-item.has-dd:hover .lp-nav-dd,
.lp-nav-item.has-dd:focus-within .lp-nav-dd {
  display: block;
}
@media (min-width: 1100px) {
  .lp-nav-links {
    display: flex;
  }
}
.lp-nav-cta {
  flex-shrink: 0;
  white-space: nowrap;
  background: var(--lp-primary);
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
}

.lp-hero {
  position: relative;
  min-height: min(88vh, 820px);
  display: grid;
  align-items: end;
  overflow: hidden;
  color: #fff;
}
.lp-hero-bg,
.lp-hero-media {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 600px at 15% 10%, color-mix(in srgb, var(--lp-accent) 35%, transparent), transparent 60%),
    linear-gradient(145deg, var(--lp-secondary), var(--lp-primary) 55%, color-mix(in srgb, var(--lp-primary) 70%, #000));
  background-size: cover;
  background-position: center;
}
.lp-hero--photo .lp-hero-bg,
.lp-hero--photo .lp-hero-media {
  background-color: var(--lp-secondary);
  background-image: none;
}
.lp-hero-bg::after,
.lp-hero-media::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.35;
  pointer-events: none;
}
.lp-hero--photo .lp-hero-bg::after,
.lp-hero--photo .lp-hero-media::after {
  background:
    linear-gradient(
      180deg,
      rgba(12, 18, 34, 0.35) 0%,
      rgba(12, 18, 34, 0.55) 45%,
      rgba(12, 18, 34, 0.82) 100%
    ),
    radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: auto, 18px 18px;
  opacity: 1;
}
.lp-hero-media :deep(picture),
.lp-hero-media :deep(video) {
  position: absolute;
  inset: 0;
}
.lp-hero-media :deep(.lp-hero-img),
.lp-hero-media :deep(.lp-hero-video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lp-crumbs {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.75rem 1.25rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--lp-muted);
}
.lp-crumbs a {
  color: inherit;
  text-decoration: none;
}
.lp-crumbs a:hover {
  text-decoration: underline;
}
.lp-pages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.85rem;
  margin-top: 1.25rem;
}
.lp-page-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--lp-line);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  background: #fff;
  min-height: 88px;
  cursor: pointer;
}
.lp-page-card:hover {
  border-color: color-mix(in srgb, var(--lp-primary) 40%, var(--lp-line));
  box-shadow: 0 4px 14px rgba(12, 18, 34, 0.06);
}
.lp-page-type {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--lp-muted);
}
.lp-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 5.5rem 1.25rem 3.5rem;
  animation: lp-rise 0.75s ease both;
}
@keyframes lp-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-hero-inner { animation: none; }
}
.lp-brand-signal {
  font-family: var(--lp-font-display), sans-serif;
  font-weight: 750;
  font-size: clamp(2rem, 6vw, 3.75rem);
  line-height: 0.95;
  letter-spacing: -0.05em;
  margin: 0 0 1rem;
  max-width: 14ch;
}
.lp-h1 {
  font-family: var(--lp-font-display), sans-serif;
  font-weight: 650;
  font-size: clamp(1.35rem, 3.2vw, 2rem);
  line-height: 1.2;
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
  max-width: 22ch;
  opacity: 0.95;
}
.lp-hero-sub {
  max-width: 38rem;
  font-size: 1.05rem;
  line-height: 1.55;
  opacity: 0.9;
  margin: 0 0 1.5rem;
}
.lp-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.lp-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--lp-secondary);
  text-decoration: none;
  font-weight: 700;
  padding: 0.85rem 1.25rem;
  border-radius: 999px;
}
.lp-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  padding: 0.85rem 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.45);
}
.lp-btn-lg {
  padding: 1rem 1.5rem;
  font-size: 1.05rem;
}
.lp-trust {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1.35rem;
  max-width: 38rem;
  margin: 0;
  padding: 0.85rem 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}
.lp-trust li {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.5rem;
  row-gap: 0.05rem;
  min-width: 0;
  padding: 0;
  background: none;
  border: 0;
  backdrop-filter: none;
}
.lp-trust-icon {
  grid-row: 1 / span 2;
  display: inline-flex;
  align-items: center;
  color: var(--lp-accent);
  margin: 0;
}
.lp-trust strong {
  font-family: var(--lp-font-body), sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.lp-trust span {
  font-size: 0.72rem;
  opacity: 0.78;
  line-height: 1.3;
}

.lp-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 4.5rem 1.75rem;
}
@media (min-width: 720px) {
  .lp-section {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
}
.lp-section-alt {
  max-width: none;
  background: var(--lp-bg);
  padding-left: max(1.75rem, calc((100% - 1100px) / 2 + 1.75rem));
  padding-right: max(1.75rem, calc((100% - 1100px) / 2 + 1.75rem));
}
.lp-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--lp-primary);
  margin: 0 0 0.75rem;
}
.lp-h2 {
  font-family: var(--lp-font-display), sans-serif;
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
}
.lp-lead {
  color: var(--lp-muted);
  max-width: 40rem;
  margin: 0 0 2rem;
  line-height: 1.55;
}

.lp-services {
  display: grid;
  gap: 1.5rem;
}
@media (min-width: 720px) {
  .lp-services {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem 2.5rem;
  }
}
.lp-service-photo {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: 0.85rem;
  margin: 0 0 0.85rem;
  background: var(--lp-line);
}
.lp-service {
  border-top: 1px solid var(--lp-line);
  padding: 1.35rem 0.35rem 1.1rem;
}
@media (min-width: 720px) {
  .lp-service {
    padding: 1.5rem 0.75rem 1.25rem;
  }
}
.lp-service-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
  margin-bottom: 0.35rem;
}
.lp-service h3 {
  margin: 0;
  font-size: 1rem;
}
.lp-price {
  font-weight: 700;
  color: var(--lp-primary);
  white-space: nowrap;
  font-size: 0.95rem;
}
.lp-service p {
  margin: 0;
  color: var(--lp-muted);
  line-height: 1.5;
  font-size: 0.88rem;
}
.lp-meta {
  margin-top: 0.45rem !important;
  font-size: 0.8rem;
}
.lp-empty {
  color: var(--lp-muted);
}
.lp-section-cta {
  margin-top: 1.5rem;
}
.lp-section .lp-btn-primary,
.lp-form .lp-btn-primary {
  background: var(--lp-primary);
  color: #fff;
}
.lp-section .lp-btn-ghost {
  color: var(--lp-ink);
  background: #fff;
  border: 1px solid var(--lp-line);
}

.lp-quotes {
  display: grid;
  gap: 0.85rem;
  text-align: left;
  align-items: start;
}
@media (min-width: 800px) {
  .lp-quotes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}
.lp-rating-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 0 auto 2rem;
  text-align: left;
}
.lp-rating-score {
  margin: 0;
  font-family: var(--lp-font-display), sans-serif;
  font-size: clamp(2.75rem, 6vw, 3.75rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
  color: var(--lp-ink);
}
.lp-rating-detail {
  display: grid;
  gap: 0.2rem;
}
.lp-rating-detail p {
  margin: 0;
  color: var(--lp-muted);
  font-size: 0.9rem;
}
.lp-quote {
  position: relative;
  margin: 0;
  padding: 1.1rem 1.15rem 1rem;
  border-top: 2px solid color-mix(in srgb, var(--lp-primary) 55%, #d1d5db);
  background: transparent;
  overflow: hidden;
}
.lp-quote-mark {
  display: none;
}
.lp-stars {
  display: inline-flex;
  gap: 0.08rem;
  margin-bottom: 0.45rem;
  font-size: 0.88rem;
  letter-spacing: 0;
  line-height: 1;
}
.lp-star {
  color: color-mix(in srgb, #d1d5db 80%, #fff);
}
.lp-star.on {
  color: #e5a100;
}
.lp-quote > p {
  position: relative;
  font-size: 0.98rem;
  line-height: 1.5;
  margin: 0 0 0.85rem;
  color: var(--lp-ink);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lp-quote footer {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--lp-muted);
  font-size: 0.88rem;
}
.lp-quote-avatar {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-family: var(--lp-font-display), sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--lp-primary);
  background: color-mix(in srgb, var(--lp-primary) 14%, #fff);
}
.lp-quote-who {
  display: grid;
  gap: 0.02rem;
  min-width: 0;
}
.lp-quote-who strong {
  color: var(--lp-ink);
  font-weight: 650;
  font-size: 0.88rem;
}
.lp-quote-meta {
  color: var(--lp-muted);
  font-size: 0.75rem;
}
.lp-quote-link {
  display: inline-block;
  margin-top: 0.55rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lp-primary);
  text-decoration: none;
}
.lp-quote-link:hover {
  text-decoration: underline;
}

.lp-faq {
  display: grid;
  gap: 0;
  max-width: 46rem;
}
.lp-faq-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
@media (min-width: 880px) {
  .lp-faq {
    max-width: 64rem;
    grid-template-columns: 1fr 1fr;
    column-gap: 2rem;
    align-items: start;
  }
}
.lp-faq-item {
  border-bottom: 1px solid var(--lp-line);
  padding: 0.85rem 0;
}
.lp-faq-item summary {
  cursor: pointer;
  font-weight: 700;
  list-style: none;
}
.lp-faq-item summary::-webkit-details-marker {
  display: none;
}
.lp-faq-item p {
  margin: 0.65rem 0 0.25rem;
  color: var(--lp-muted);
  line-height: 1.55;
}

.lp-final {
  margin: 0;
  padding: 4.5rem 1.25rem;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, var(--lp-secondary), var(--lp-primary));
}
.lp-final h2 {
  font-family: var(--lp-font-display), sans-serif;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  margin: 0 0 0.75rem;
}
.lp-final p {
  margin: 0 auto 1.5rem;
  max-width: 34rem;
  opacity: 0.92;
}
.lp-final .lp-btn-primary {
  background: #fff;
  color: var(--lp-secondary);
}

.lp-footer {
  border-top: 1px solid var(--lp-line);
  background: #fff;
}
.lp-footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.25rem 2.5rem;
  display: grid;
  gap: 1rem;
}
.lp-footer-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.lp-footer-contact a {
  color: var(--lp-primary);
  text-decoration: none;
  font-weight: 600;
}
.lp-contact-identity {
  display: grid;
  gap: 0.35rem;
  align-content: start;
}
.lp-contact-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lp-primary);
}
.lp-contact-name {
  font-family: var(--lp-font-display), sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.lp-contact-address {
  margin: 0;
  color: var(--lp-muted);
  line-height: 1.4;
  font-size: 0.88rem;
}
.lp-contact-channels {
  display: grid;
  gap: 0.3rem;
  margin-top: 0.35rem;
}
.lp-contact-channel {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  align-items: center;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--lp-line);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  background: color-mix(in srgb, var(--lp-bg) 70%, #fff);
  transition: border-color 0.15s ease, background 0.15s ease;
}
.lp-contact-channel:hover {
  border-color: color-mix(in srgb, var(--lp-primary) 40%, #d1d5db);
  background: #fff;
}
.lp-contact-channel-icon {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--lp-primary) 12%, #fff);
  color: var(--lp-primary);
  flex-shrink: 0;
}
.lp-contact-channel-icon :deep(svg) {
  width: 0.85rem;
  height: 0.85rem;
}
.lp-contact-channel-copy {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  min-width: 0;
  overflow: hidden;
}
.lp-contact-channel-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--lp-muted);
  flex-shrink: 0;
}
.lp-contact-channel-value {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--lp-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lp-hours {
  padding: 1rem 1.1rem;
  border-radius: 16px;
  border: 1px solid var(--lp-line);
  background: #fff;
}
.lp-hours > strong {
  font-family: var(--lp-font-display), sans-serif;
  font-size: 1rem;
}
.lp-powered {
  margin: 0;
  color: var(--lp-muted);
  font-size: 0.8rem;
}
.lp-photo-credit {
  margin: 0;
  color: var(--lp-muted);
  font-size: 0.75rem;
}
.lp-photo-credit a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 640px) {
  .lp-trust {
    gap: 0.7rem 1rem;
    max-width: none;
  }
  .lp-trust strong {
    font-size: 0.88rem;
  }
  .lp-trust span {
    font-size: 0.68rem;
  }
  .lp-brand-signal {
    max-width: none;
  }
}

/* Mobile nav */
.lp-nav-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  flex: 0 0 auto;
  margin-left: auto;
}
.lp-nav-wa {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: transparent;
  color: var(--lp-ink);
  border: 1px solid var(--lp-line);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
}
.lp-sticky-bar {
  display: none;
}
@media (max-width: 859px) {
  .lp {
    padding-bottom: 4.75rem;
  }
  .lp-nav-wa,
  .lp-nav-cta {
    display: none;
  }
  .lp-nav .lp-logo {
    height: 36px;
    max-height: 36px;
    max-width: min(152px, 62vw);
  }
  .lp-sticky-bar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 40;
    gap: 0.4rem;
    padding: 0.55rem 0.7rem calc(0.55rem + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(10px);
  }
  .lp-sticky-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.6rem;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 800;
    text-decoration: none;
    color: #fff;
    background: var(--lp-ink);
    cursor: pointer;
    pointer-events: auto;
  }
  .lp-sticky-btn--wa {
    background: #25d366;
  }
  .lp-sticky-btn--book {
    background: var(--lp-primary);
  }
}
.lp-nav-toggle {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0.4rem;
}
.lp-nav-toggle span {
  display: block;
  height: 2px;
  width: 100%;
  background: var(--lp-ink);
  border-radius: 2px;
}
@media (min-width: 1100px) {
  .lp-nav-toggle,
  .lp-nav-drawer {
    display: none !important;
  }
}
.lp-nav-drawer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1.25rem 1rem;
  border-top: 1px solid var(--lp-line);
  background: #fff;
}
.lp-nav-drawer a {
  padding: 0.75rem 0.25rem;
  color: var(--lp-ink);
  text-decoration: none;
  font-weight: 600;
  min-height: 44px;
}
.lp-nav-drawer-sub {
  padding-left: 1rem !important;
  font-weight: 500 !important;
  color: var(--lp-muted) !important;
}
.lp-nav-drawer-sep {
  height: 1px;
  margin: 0.35rem 0;
  background: var(--lp-line);
}

/* Deep-book + new sections */
.lp-service-book {
  display: inline-flex;
  align-items: center;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  background: var(--lp-primary);
  text-decoration: none;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
}
.lp-service-book:hover {
  opacity: 0.92;
}
.lp-section-center {
  text-align: center;
}
.lp-section-center .lp-lead {
  margin-left: auto;
  margin-right: auto;
}
.lp-section-center .lp-faq {
  margin-left: auto;
  margin-right: auto;
  text-align: left;
}
.lp-team {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 200px));
  justify-content: center;
  gap: 1rem;
}
.lp-team-card {
  text-align: center;
  padding: 1rem 0.75rem;
}
.lp-team-card h3 {
  margin: 0.65rem 0 0.15rem;
  font-size: 1rem;
}
.lp-team-avatar {
  width: 72px;
  height: 72px;
  margin: 0 auto;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--lp-primary) 18%, #fff);
  display: grid;
  place-items: center;
  font-family: var(--lp-font-display), sans-serif;
  font-weight: 700;
  color: var(--lp-primary);
}
.lp-team-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lp-team-meta {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--lp-muted);
}
.lp-courses {
  display: grid;
  gap: 0.75rem;
}
.lp-course {
  padding: 1rem 0;
  border-bottom: 1px solid var(--lp-line);
}
.lp-course h3 {
  margin: 0.2rem 0;
}
.lp-course-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  margin-top: 0.45rem;
}
.lp-spots {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
}
.lp-spots.tight {
  background: #fffbeb;
  color: #b45309;
}
.lp-spots.full {
  background: #fef2f2;
  color: #b91c1c;
}
.lp-slots {
  display: grid;
  gap: 0.55rem;
}
@media (min-width: 640px) {
  .lp-slots {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.lp-slot {
  display: grid;
  gap: 0.15rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--lp-line);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background: #fff;
  transition: border-color 0.15s ease, transform 0.15s ease;
  min-height: 88px;
}
.lp-slot:hover {
  border-color: color-mix(in srgb, var(--lp-primary) 45%, #d1d5db);
  transform: translateY(-1px);
}
.lp-slot-day {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--lp-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.lp-slot-time {
  font-family: var(--lp-font-body), sans-serif;
  font-size: 1.15rem;
  font-weight: 750;
  letter-spacing: -0.02em;
}
.lp-slot-cat {
  font-size: 0.85rem;
  color: var(--lp-muted);
}
.lp-slot-cta {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: var(--lp-primary);
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
}
@media (max-width: 639px) {
  .lp-slots {
    gap: 0.4rem;
  }
  .lp-slot {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'day cta'
      'time cta'
      'cat cta';
    align-items: center;
    column-gap: 0.7rem;
    row-gap: 0.02rem;
    padding: 0.5rem 0.7rem;
    min-height: 0;
    border-radius: 10px;
  }
  .lp-slot-day {
    grid-area: day;
    font-size: 0.68rem;
  }
  .lp-slot-time {
    grid-area: time;
    font-family: var(--lp-font-body), sans-serif;
    font-size: 0.98rem;
    font-weight: 750;
  }
  .lp-slot-cat {
    grid-area: cat;
    font-size: 0.75rem;
  }
  .lp-slot-cta {
    grid-area: cta;
    margin-top: 0;
    font-size: 0.75rem;
  }
}
.lp-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}
@media (min-width: 720px) {
  .lp-gallery {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.lp-gallery figure {
  margin: 0;
  aspect-ratio: 4/3;
  overflow: hidden;
  border-radius: 12px;
  background: var(--lp-bg);
}
.lp-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lp-process {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}
@media (min-width: 800px) {
  .lp-process {
    grid-template-columns: repeat(3, 1fr);
  }
}
.lp-process li {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}
.lp-process-n {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--lp-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  flex-shrink: 0;
}
.lp-process h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}
.lp-process p {
  margin: 0;
  color: var(--lp-muted);
  line-height: 1.5;
}
.lp-cta-row--center {
  justify-content: center;
}
.lp-btn-ghost--on-dark {
  border-color: rgba(255, 255, 255, 0.45);
  color: #fff;
}
.lp-footer-grid {
  display: grid;
  gap: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--lp-line);
}
@media (min-width: 880px) {
  .lp-footer-grid {
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
  }
}
.lp-meeting-points {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}
.lp-meeting-points li {
  display: grid;
  gap: 0.1rem;
  font-size: 0.88rem;
  color: var(--lp-muted);
}
.lp-meeting-points strong {
  color: inherit;
  font-weight: 650;
}
.lp-social {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-top: 0.85rem;
  font-size: 0.86rem;
}
.lp-social a {
  color: var(--lp-muted);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
.lp-social a:hover {
  color: inherit;
}
.lp-pickup-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  margin: 1rem auto 0;
  max-width: 22rem;
}
.lp-pickup-form input {
  flex: 1 1 7rem;
  min-width: 0;
  border: 1px solid var(--lp-line);
  border-radius: 999px;
  padding: 0.7rem 1rem;
  font: inherit;
  text-align: center;
  letter-spacing: 0.12em;
}
.lp-pickup-result {
  margin: 0.85rem 0 0;
  text-align: center;
  color: var(--lp-muted);
  line-height: 1.45;
}
.lp-pickup-result.ok {
  color: var(--lp-primary);
  font-weight: 650;
}
.lp-pickup-result.no {
  color: inherit;
}
.lp-hours ul {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
  font-size: 0.88rem;
}
.lp-hours li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: var(--lp-muted);
}
.lp-map-section .lp-map {
  margin-top: 0.35rem;
}
.lp-map iframe {
  width: 100%;
  min-height: 180px;
  border: 0;
  border-radius: 12px;
  background: var(--lp-bg);
}
.lp-map--section iframe {
  min-height: 320px;
  border-radius: 16px;
}
@media (min-width: 880px) {
  .lp-map--section iframe {
    min-height: 420px;
  }
}
.lp-map-link {
  display: inline-block;
  margin-top: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lp-primary);
}
.lp-lead-form {
  padding: 0 0 1.25rem;
  border-top: none;
  text-align: center;
}
.lp-lead-form h3 {
  margin: 0 0 0.35rem;
  font-family: var(--lp-font-display), sans-serif;
}
.lp-lead-form > p {
  margin: 0 auto 0.85rem;
  color: var(--lp-muted);
  font-size: 0.9rem;
  max-width: 28rem;
}
.lp-form {
  display: grid;
  gap: 0.55rem;
  max-width: 28rem;
  margin: 0 auto;
  text-align: left;
}
.lp-form .lp-btn-primary {
  justify-self: center;
}
.lp-form input,
.lp-form textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  font: inherit;
  font-size: 16px;
  background: #fff;
  color: #111827;
}
.lp-honeypot {
  position: absolute !important;
  left: -9999px !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.lp-form-msg {
  margin: 0;
  font-size: 0.85rem;
  color: #b91c1c;
}
.lp-form-msg.ok {
  color: #047857;
}
.lp-legal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.5rem;
}
.lp-legal-row a {
  color: var(--lp-muted);
  font-size: 0.85rem;
  text-decoration: none;
}
.lp-legal-row a:hover {
  color: var(--lp-ink);
  text-decoration: underline;
}

/* Motion */
@keyframes lp-fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.lp-hero-inner {
  animation: lp-fade-up 0.7s ease both;
}
.lp-reveal {
  animation: lp-fade-up 0.55s ease both;
}
.lp-btn-primary {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.lp-btn-primary:hover {
  transform: translateY(-1px);
}
@media (prefers-reduced-motion: reduce) {
  .lp-hero-inner,
  .lp-reveal,
  .lp-btn-primary {
    animation: none !important;
    transition: none !important;
  }
}

/* Template variants */
.lp-template-bold {
  --lp-bg: #f3f4f6;
}
.lp-template-bold .lp-h1,
.lp-template-bold .lp-h2,
.lp-template-bold .lp-brand-name {
  letter-spacing: -0.03em;
}
.lp-template-bold .lp-btn-primary,
.lp-template-bold .lp-nav-cta {
  border-radius: 10px;
}
.lp-template-editorial {
  --lp-bg: #faf7f2;
}
.lp-template-editorial .lp-h1,
.lp-template-editorial .lp-h2 {
  font-weight: 800;
}
.lp-template-editorial .lp-section {
  border-top: 1px solid var(--lp-line);
}
</style>
