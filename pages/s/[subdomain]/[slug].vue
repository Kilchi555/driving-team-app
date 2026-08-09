<template>
  <div v-if="pending" class="site-loading">Lädt…</div>
  <div v-else-if="error || !landing" class="site-error">
    <h1>Seite nicht gefunden</h1>
    <p>Diese Website ist noch nicht veröffentlicht oder existiert nicht.</p>
  </div>
  <div v-else class="lp" :style="cssVars">
    <header class="lp-nav">
      <div class="lp-nav-inner">
        <div class="lp-brand">
          <NuxtLink :to="homeHref" class="lp-brand-link">
            <img v-if="landing.brand.logo_url" :src="landing.brand.logo_url" :alt="landing.brand.name" class="lp-logo" width="36" height="36" />
            <span class="lp-brand-name">{{ landing.brand.name }}</span>
          </NuxtLink>
        </div>
        <nav v-if="navLinks.length" class="lp-nav-links" aria-label="Seiten">
          <NuxtLink v-for="n in navLinks" :key="n.slug" :to="n.href">{{ n.title }}</NuxtLink>
        </nav>
        <a class="lp-nav-cta" :href="landing.bookingUrl">{{ bookLabel }}</a>
      </div>
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
              alt=""
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
          </article>
        </div>
        <div v-else class="lp-empty">Angebote werden bald ergänzt.</div>
        <div class="lp-section-cta">
          <a class="lp-btn-primary" :href="landing.bookingUrl">{{ bookLabel }}</a>
        </div>
      </section>

      <!-- TESTIMONIALS -->
      <section
        v-else-if="block.type === 'testimonials' && displayTestimonials.length"
        class="lp-section lp-section-alt"
      >
        <p class="lp-eyebrow">{{ googleReviews?.source === 'google_places' ? 'Google Bewertungen' : block.content.eyebrow }}</p>
        <h2 class="lp-h2">{{ block.content.title }}</h2>
        <p class="lp-lead">
          <template v-if="googleReviews?.source === 'google_places'">
            <span v-if="googleReviews.averageRating">{{ googleReviews.averageRating }}★</span>
            <span v-if="googleReviews.averageRating && googleReviews.totalReviewCount"> · </span>
            <span v-if="googleReviews.totalReviewCount">{{ googleReviews.totalReviewCount }} Bewertungen auf Google</span>
            <span v-if="!googleReviews.averageRating && !googleReviews.totalReviewCount">Aktuelle Stimmen von Google.</span>
          </template>
          <template v-else>{{ block.content.description }}</template>
        </p>
        <div class="lp-quotes">
          <blockquote
            v-for="tm in displayTestimonials"
            :key="tm.id || tm.author"
            class="lp-quote"
          >
            <div v-if="tm.rating" class="lp-stars" aria-hidden="true">
              <span v-for="n in Math.round(tm.rating)" :key="n">★</span>
            </div>
            <p>“{{ tm.text }}”</p>
            <footer>
              — {{ tm.author }}
              <span v-if="tm.relativeTime" class="lp-quote-meta"> · {{ tm.relativeTime }}</span>
              <span v-else-if="tm.sourceLabel" class="lp-quote-meta"> · {{ tm.sourceLabel }}</span>
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
      <section v-else-if="block.type === 'faq'" class="lp-section">
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
      <section v-else-if="block.type === 'cta'" class="lp-final">
        <h2>{{ block.content.headline }}</h2>
        <p>{{ block.content.subheadline }}</p>
        <a class="lp-btn-primary lp-btn-lg" :href="block.content.cta_url">{{ block.content.cta_text }}</a>
      </section>

      <!-- CONTACT -->
      <footer v-else-if="block.type === 'contact'" class="lp-footer">
        <div class="lp-footer-inner">
          <div>
            <strong>{{ block.content.name }}</strong>
            <p v-if="block.content.address || block.content.city">
              <span v-if="block.content.address">{{ block.content.address }}</span>
              <span v-if="block.content.postal_code || block.content.city">
                {{ block.content.postal_code }} {{ block.content.city }}
              </span>
            </p>
          </div>
          <div class="lp-footer-contact">
            <a v-if="block.content.phone" :href="`tel:${block.content.phone}`">{{ block.content.phone }}</a>
            <a v-if="block.content.email" :href="`mailto:${block.content.email}`">{{ block.content.email }}</a>
          </div>
          <p class="lp-powered">Website mit Simy</p>
        </div>
      </footer>
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
const pageSlug = computed(() => String(route.params.slug || '').toLowerCase())
const preview = computed(() => route.query.preview === '1')

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

const homeHref = computed(() => `/s/${subdomain.value}${preview.value ? '?preview=1' : ''}`)
const navLinks = computed(() => {
  const items = (data.value as any)?.nav || []
  return items.filter((n: any) => !n.is_home && n.slug !== pageSlug.value).slice(0, 6)
})

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

const heroImage = (block: any) =>
  block?.content?.image_url ||
  landing.value?.brand?.hero_image_url ||
  data.value?.website?.hero_image_url ||
  null

const heroVideo = (block: any) =>
  block?.content?.video_url || landing.value?.brand?.hero_video_url || null

const heroAvif = (block: any) => heroAvifCandidate(heroImage(block))

const ogImage = computed(() => {
  if (subdomain.value) {
    const q = pageSlug.value && pageSlug.value !== 'index' ? `?slug=${encodeURIComponent(pageSlug.value)}` : ''
    const path = `/api/public/website/${encodeURIComponent(subdomain.value)}/og.png${q}`
    if (import.meta.server) {
      const headers = useRequestHeaders(['x-forwarded-host', 'host', 'x-forwarded-proto'])
      const host = String(headers['x-forwarded-host'] || headers.host || 'app.simy.ch').split(',')[0]
      const proto = String(headers['x-forwarded-proto'] || 'https')
      return `${proto}://${host}${path}`
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
  if (custom && verified) return `https://${custom}/${pageSlug.value}`
  return (
    landing.value?.siteUrl ||
    `https://app.simy.ch/s/${subdomain.value}/${pageSlug.value}`
  )
})

const jsonLd = computed(() => {
  const schema = landing.value?.schema
  if (!schema || typeof schema !== 'object') return null
  if (
    googleReviews.value?.source !== 'google_places' ||
    !googleReviews.value.averageRating
  ) {
    return schema
  }

  const clone = JSON.parse(JSON.stringify(schema))
  const graph = Array.isArray(clone['@graph']) ? clone['@graph'] : []
  const business = graph.find((n: any) => n?.['@type'] === 'LocalBusiness')
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
  return clone
})

useHead(() => ({
  title: seoTitle.value,
  htmlAttrs: { lang: 'de-CH' },
  meta: [
    { name: 'description', content: seoDescription.value },
    { name: 'keywords', content: landing.value?.seo?.keywords || data.value?.website?.seo_keywords || '' },
    { name: 'robots', content: preview.value ? 'noindex,nofollow' : 'index,follow' },
    { property: 'og:title', content: seoTitle.value },
    { property: 'og:description', content: seoDescription.value },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical.value },
    ...(ogImage.value ? [{ property: 'og:image', content: ogImage.value }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: seoTitle.value },
    { name: 'twitter:description', content: seoDescription.value },
    ...(ogImage.value ? [{ name: 'twitter:image', content: ogImage.value }] : []),
    { name: 'theme-color', content: String(cssVars.value['--lp-primary']) },
  ],
  link: [
    { rel: 'canonical', href: canonical.value },
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
  if (preview.value || !data.value?.website?.id) return
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
  border-radius: 8px;
  object-fit: cover;
}
.lp-brand-name {
  font-family: Syne, sans-serif;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  max-width: 28rem;
  margin: 0;
  padding: 0;
}
.lp-trust li {
  display: grid;
  gap: 0.15rem;
}
.lp-trust-icon {
  display: inline-flex;
  color: var(--lp-accent);
  margin-bottom: 0.15rem;
}
.lp-trust strong {
  font-family: Syne, sans-serif;
  font-size: 1.35rem;
}
.lp-trust span {
  font-size: 0.8rem;
  opacity: 0.85;
}

.lp-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 4.5rem 1.25rem;
}
.lp-section-alt {
  max-width: none;
  background: var(--lp-bg);
  padding-left: max(1.25rem, calc((100% - 1100px) / 2 + 1.25rem));
  padding-right: max(1.25rem, calc((100% - 1100px) / 2 + 1.25rem));
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
  gap: 1rem;
}
@media (min-width: 720px) {
  .lp-services {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.lp-service {
  border-top: 1px solid var(--lp-line);
  padding: 1.1rem 0 0.4rem;
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
  font-size: 1.1rem;
}
.lp-price {
  font-weight: 700;
  color: var(--lp-primary);
  white-space: nowrap;
}
.lp-service p {
  margin: 0;
  color: var(--lp-muted);
  line-height: 1.5;
}
.lp-meta {
  margin-top: 0.45rem !important;
  font-size: 0.85rem;
}
.lp-empty {
  color: var(--lp-muted);
}
.lp-section-cta {
  margin-top: 2rem;
}

.lp-quotes {
  display: grid;
  gap: 1.25rem;
}
@media (min-width: 800px) {
  .lp-quotes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.lp-quote {
  margin: 0;
  padding: 0;
  border: 0;
}
.lp-stars {
  color: #f59e0b;
  letter-spacing: 0.05em;
  margin-bottom: 0.45rem;
  font-size: 0.95rem;
}
.lp-quote p {
  font-size: 1.05rem;
  line-height: 1.55;
  margin: 0 0 0.6rem;
}
.lp-quote footer {
  color: var(--lp-muted);
  font-size: 0.9rem;
}
.lp-quote-meta {
  color: var(--lp-muted);
}
.lp-quote-link {
  display: inline-block;
  margin-top: 0.55rem;
  font-size: 0.85rem;
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
.lp-powered {
  margin: 0;
  color: var(--lp-muted);
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .lp-trust {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .lp-brand-signal {
    max-width: none;
  }
}
</style>
