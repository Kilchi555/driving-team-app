<template>
  <div v-if="pending" class="site-loading">Lädt…</div>
  <div v-else-if="error || !landing" class="site-error">
    <h1>Seite nicht gefunden</h1>
    <p>Diese Website ist noch nicht veröffentlicht oder existiert nicht.</p>
  </div>
  <div v-else class="lp" :class="[`lp-template-${templateVariant}`, { 'lp-nav-open': mobileNavOpen }]" :style="cssVars">
    <header class="lp-nav">
      <div class="lp-nav-inner">
        <div class="lp-brand">
          <img
            v-if="landing.brand.logo_url"
            :src="landing.brand.logo_url"
            :alt="landing.brand.name"
            class="lp-logo"
              height="52"
          />
          <span v-else class="lp-brand-name">{{ landing.brand.name }}</span>
        </div>
        <nav v-if="navLinks.length" class="lp-nav-links" aria-label="Seiten">
          <NuxtLink v-for="n in navLinks" :key="n.slug" :to="n.href">{{ n.title }}</NuxtLink>
        </nav>
        <div class="lp-nav-actions">
          <a
            v-if="whatsappUrl"
            class="lp-nav-wa"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
          >WA</a>
          <a class="lp-nav-cta" :href="landing.bookingUrl">{{ bookLabel }}</a>
          <button
            v-if="navLinks.length"
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
      <nav v-if="navLinks.length && mobileNavOpen" class="lp-nav-drawer" aria-label="Mobile Navigation">
        <NuxtLink v-for="n in navLinks" :key="`m-${n.slug}`" :to="n.href" @click="mobileNavOpen = false">{{ n.title }}</NuxtLink>
        <a :href="landing.bookingUrl" @click="mobileNavOpen = false">{{ bookLabel }}</a>
        <a v-if="whatsappUrl" :href="whatsappUrl" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </nav>
    </header>

    <template v-for="(block, idx) in renderBlocks" :key="idx">
      <!-- HERO -->
      <section v-if="block.type === 'hero'" class="lp-hero" :class="{ 'lp-hero--photo': !!heroImage(block) || !!heroVideo(block) }">
        <div class="lp-hero-media" aria-hidden="true">
          <video
            v-if="heroVideo(block)"
            class="lp-hero-video"
            :src="heroVideo(block)!"
            :poster="heroImage(block) || undefined"
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
          />
          <picture v-else-if="heroImage(block)">
            <source v-if="heroAvif(block)" type="image/avif" :srcset="heroAvif(block)!" />
            <img
              class="lp-hero-img"
              :src="heroImage(block)!"
              :alt="heroAlt(block)"
              width="1600"
              height="900"
              fetchpriority="high"
              decoding="async"
            />
          </picture>
        </div>
        <div class="lp-hero-inner">
          <p class="lp-brand-signal">{{ block.content.brand }}</p>
          <h1 class="lp-h1">{{ block.content.headline }}</h1>
          <p class="lp-hero-sub">{{ block.content.subheadline }}</p>
          <div class="lp-cta-row">
            <a class="lp-btn-primary" :href="block.content.cta_primary_url">{{ block.content.cta_primary_text }}</a>
            <a v-if="block.content.cta_secondary_url" class="lp-btn-ghost" :href="block.content.cta_secondary_url">
              {{ block.content.cta_secondary_text }}
            </a>
            <a
              v-if="block.content.whatsapp_url || whatsappUrl"
              class="lp-btn-ghost"
              :href="block.content.whatsapp_url || whatsappUrl"
              target="_blank"
              rel="noopener noreferrer"
            >WhatsApp</a>
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
            >{{ bookLabel }}</a>
          </article>
        </div>
        <div v-else class="lp-empty">Angebote werden bald ergänzt.</div>
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
              <img v-if="m.photo_url" :src="m.photo_url" :alt="m.name" width="72" height="72" />
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
            <img :src="img.url" :alt="img.alt || ''" loading="lazy" width="600" height="400" />
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
      <section v-else-if="block.type === 'faq'" class="lp-section lp-section-center">
        <p class="lp-eyebrow">{{ block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <div class="lp-faq">
          <details v-for="(item, i) in block.content.items" :key="i" class="lp-faq-item">
            <summary>{{ item.q }}</summary>
            <p>{{ item.a }}</p>
          </details>
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
          <div class="lp-map lp-map--section">
            <iframe
              :src="block.content.map_embed_url"
              title="Karte"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            />
          </div>
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
                <p v-if="block.content.address || block.content.city" class="lp-contact-address">
                  <span v-if="block.content.address">{{ block.content.address }}</span>
                  <template v-if="mapCityLine(block.content)">
                    <span v-if="block.content.address"><br /></span>{{ mapCityLine(block.content) }}
                  </template>
                </p>
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
              v-if="heroAttribution?.photographer"
              class="lp-photo-credit"
            >
              Photo by
              <a
                v-if="heroAttribution.photographer_url"
                :href="heroAttribution.photographer_url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ heroAttribution.photographer }}</a>
              <span v-else>{{ heroAttribution.photographer }}</span>
              on
              <a
                :href="heroAttribution.unsplash_url || 'https://unsplash.com/?utm_source=simy&utm_medium=referral'"
                target="_blank"
                rel="noopener noreferrer"
              >Unsplash</a>
            </p>
            <p v-if="!hidePoweredBy" class="lp-powered">Website mit Simy</p>
          </div>
        </footer>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import '~/assets/css/website-landing-fonts.css'
import WebsiteIcon from '~/components/website/WebsiteIcon.vue'
import { isWebsiteIconKey, trustIconForLabel, type WebsiteIconKey } from '~/utils/website-icons'
import { heroAvifCandidate } from '~/utils/website-landing-head'

definePageMeta({
  layout: 'site',
  ssr: true,
})

const route = useRoute()
const subdomain = computed(() => String(route.params.subdomain || '').toLowerCase())
const preview = computed(() => route.query.preview === '1')
const mobileNavOpen = ref(false)
const leadForm = ref({ first_name: '', email: '', message: '', company: '' })
const leadSending = ref(false)
const leadMsg = ref('')
const leadOk = ref(false)
const liveSlots = ref<any[] | null>(null)
const slotsSectionEl = ref<HTMLElement | null>(null)

// Preview must never hit CDN/SWR page cache
if (import.meta.server && preview.value) {
  const ev = useRequestEvent()
  ev?.node?.res?.setHeader?.('Cache-Control', 'private, no-store')
}

const { data, pending, error } = await useAsyncData(
  () => `site-${subdomain.value}-${preview.value ? 'p' : 'l'}`,
  () =>
    $fetch(`/api/public/website/${encodeURIComponent(subdomain.value)}`, {
      query: preview.value ? { preview: '1' } : undefined,
    }),
  { watch: [subdomain, preview] },
)

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

const navLinks = computed(() => {
  const items = (data.value as any)?.nav || []
  return items.filter((n: any) => !n.is_home && n.slug !== 'index').slice(0, 6)
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
    await navigateTo(`https://${custom}/`, { redirectCode: 301, external: true })
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

const defaultLegalLinks = computed(() => [
  { label: 'Impressum', href: `/s/${subdomain.value}/impressum` },
  { label: 'Datenschutz', href: `/s/${subdomain.value}/datenschutz` },
])

function legalHref(href: string) {
  if (!href) return defaultLegalLinks.value[0].href
  if (href.startsWith('http')) {
    try {
      const u = new URL(href)
      if (u.pathname.includes('/impressum')) return `/s/${subdomain.value}/impressum`
      if (u.pathname.includes('/datenschutz')) return `/s/${subdomain.value}/datenschutz`
    } catch {
      /* ignore */
    }
  }
  if (href.includes('impressum')) return `/s/${subdomain.value}/impressum`
  if (href.includes('datenschutz')) return `/s/${subdomain.value}/datenschutz`
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
        body: { ...leadForm.value, category: 'contact' },
      },
    )
    leadOk.value = true
    leadMsg.value = res?.message || 'Danke — wir melden uns.'
    leadForm.value = { first_name: '', email: '', message: '', company: '' }
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
  `${landing.value?.brand?.name || data.value?.tenant?.name || 'Website'} — Hero`

const heroVideo = (block: any) =>
  block?.content?.video_url || landing.value?.brand?.hero_video_url || null

const heroAvif = (block: any) => heroAvifCandidate(heroImage(block))

// Capture once in setup — must not call useRequestHeaders inside computed/useHead resolvers
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
  // Dedicated 1200×630 card (sharp) — absolute URL for crawlers
  if (subdomain.value) {
    const path = `/api/public/website/${encodeURIComponent(subdomain.value)}/og.png`
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
  // Only use custom domain as canonical when DNS/verify is complete —
  // otherwise Google may index a host that does not resolve yet.
  if (custom && verified) return `https://${custom}/`
  const baked = String(landing.value?.siteUrl || '').replace(/\/$/, '')
  if (baked) return `${baked}/`
  return `https://app.simy.ch/s/${subdomain.value}/`
})

const jsonLd = computed(() => {
  const schema = landing.value?.schema
  if (!schema || typeof schema !== 'object') return null

  const baked = String(landing.value?.siteUrl || '').replace(/\/$/, '')
  const canon = canonical.value.replace(/\/$/, '')
  let clone =
    baked && canon && baked !== canon
      ? JSON.parse(JSON.stringify(schema).split(baked).join(canon))
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
    {
      rel: 'preload',
      href: '/fonts/website/manrope-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    },
    {
      rel: 'preload',
      href: '/fonts/website/syne-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    },
    ...(heroPreload.value
      ? [{ rel: 'preload', as: 'image', href: heroPreload.value, fetchpriority: 'high' } as any]
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
  if (!preview.value && data.value?.website?.id) {
    const websiteId = data.value.website.id
    $fetch('/api/website/analytics/track', {
      method: 'POST',
      body: {
        website_id: websiteId,
        event_type: 'pageview',
        event_url: typeof window !== 'undefined' ? window.location.href : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    }).catch(() => {})
  }

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
  font-family: Manrope, ui-sans-serif, system-ui, sans-serif;
  background: #fff;
}

.site-loading,
.site-error {
  min-height: 60vh;
  display: grid;
  place-content: center;
  gap: 0.5rem;
  text-align: center;
  font-family: Manrope, sans-serif;
  padding: 2rem;
}
.site-error h1 {
  font-family: Syne, sans-serif;
  font-size: 1.75rem;
}

.lp-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid var(--lp-line);
}
.lp-nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.85rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.lp-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}
.lp-logo {
  height: 52px;
  width: auto;
  max-width: min(240px, 58vw);
  border-radius: 0;
  object-fit: contain;
}
.lp-brand-name {
  font-family: Syne, sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lp-nav-links {
  display: none;
  gap: 1rem;
  flex: 1;
  justify-content: center;
}
.lp-nav-links a {
  color: var(--lp-muted);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
}
.lp-nav-links a:hover {
  color: var(--lp-ink);
}
@media (min-width: 860px) {
  .lp-nav-links {
    display: flex;
  }
}
.lp-nav-cta {
  flex-shrink: 0;
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
.lp-hero-media picture,
.lp-hero-media video {
  position: absolute;
  inset: 0;
}
.lp-hero-img,
.lp-hero-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lp-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 5.5rem 1.25rem 3.5rem;
}
.lp-brand-signal {
  font-family: Syne, sans-serif;
  font-weight: 800;
  font-size: clamp(2rem, 6vw, 3.75rem);
  line-height: 0.95;
  letter-spacing: -0.03em;
  margin: 0 0 1rem;
  max-width: 14ch;
}
.lp-h1 {
  font-family: Syne, sans-serif;
  font-weight: 700;
  font-size: clamp(1.35rem, 3.2vw, 2rem);
  line-height: 1.2;
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
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem 1rem;
  max-width: 36rem;
  margin: 0;
  padding: 0;
}
.lp-trust li {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}
.lp-trust-icon {
  display: inline-flex;
  color: var(--lp-accent);
  margin-bottom: 0.15rem;
}
.lp-trust strong {
  font-family: Syne, sans-serif;
  font-size: 1.15rem;
}
.lp-trust span {
  font-size: 0.75rem;
  opacity: 0.85;
  line-height: 1.25;
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
  font-family: Syne, sans-serif;
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
  margin-top: 2rem;
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
  font-family: Syne, sans-serif;
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
  font-family: Syne, sans-serif;
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
  gap: 0.5rem;
  max-width: 46rem;
}
@media (min-width: 880px) {
  .lp-faq {
    max-width: 64rem;
    grid-template-columns: 1fr 1fr;
    column-gap: 2rem;
    row-gap: 0.15rem;
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
  font-family: Syne, sans-serif;
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
  font-family: Syne, sans-serif;
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
  font-family: Syne, sans-serif;
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
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem 0.65rem;
    max-width: none;
  }
  .lp-trust strong {
    font-size: 0.95rem;
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
  gap: 0.5rem;
  flex-shrink: 0;
}
.lp-nav-wa {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: #25d366;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  text-decoration: none;
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
@media (min-width: 860px) {
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

/* Deep-book + new sections */
.lp-service-book {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--lp-primary);
  text-decoration: none;
}
.lp-service-book:hover {
  text-decoration: underline;
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
  font-family: Syne, sans-serif;
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
  font-family: Syne, sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
}
.lp-slot-cat {
  font-size: 0.85rem;
  color: var(--lp-muted);
}
.lp-slot-cta {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--lp-primary);
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
  font-family: Syne, sans-serif;
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
