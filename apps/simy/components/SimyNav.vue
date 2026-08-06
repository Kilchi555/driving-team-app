<template>
  <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">

    <!-- ── Main bar ─────────────────────────────────────────────────────────── -->
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

      <!-- Logo -->
      <a href="/" class="flex-shrink-0">
        <img
          :src="effectiveLogo || '/simy-logo.png'"
          alt="Simy – All-in-One Software Schweiz"
          class="h-8 max-w-[120px] object-contain transition-all duration-500"
          :style="{ filter: logoColorFilter }"
        />
      </a>

      <!-- Desktop nav: Branchen · Features · Preise · Kunden -->
      <div class="hidden md:flex items-center gap-1 text-sm font-medium">

        <!-- Branchen dropdown -->
        <div class="relative group">
          <button class="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
            Branchen
            <svg class="w-3.5 h-3.5 text-gray-400 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div class="bg-white border border-gray-100 rounded-2xl shadow-xl p-2 min-w-[280px]">
              <a
                v-for="v in branchenLinks"
                :key="v.href"
                :href="v.href"
                class="nav-dropdown-item"
              >
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)">
                  <SimyIcon :name="v.icon" :size="16" />
                </span>
                <span>{{ v.label }}</span>
              </a>

              <div class="border-t border-gray-100 mt-1 pt-1">
                <a href="/branchen" class="nav-dropdown-item font-semibold" style="color: var(--brand-primary)">
                  <span class="nav-dropdown-icon"><SimyIcon name="spark" :size="16" /></span><span>Alle Branchen</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Features dropdown (inkl. Marketing) -->
        <div class="relative group">
          <button class="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
            Features
            <svg class="w-3.5 h-3.5 text-gray-400 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div class="bg-white border border-gray-100 rounded-2xl shadow-xl p-2 min-w-[220px]">
              <a href="/features/kalender" class="nav-dropdown-item">
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)"><SimyIcon name="calendar" :size="16" /></span><span>Kalender & Planung</span>
              </a>
              <a href="/features/rechnungen" class="nav-dropdown-item">
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)"><SimyIcon name="wallet" :size="16" /></span><span>Rechnungen & Kasse</span>
              </a>
              <a href="/features/kalender" class="nav-dropdown-item">
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)"><SimyIcon name="link" :size="16" /></span><span>Online-Buchung</span>
              </a>
              <div class="border-t border-gray-100 my-1" />
              <a href="/marketing" class="nav-dropdown-item">
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)"><SimyIcon name="rocket" :size="16" /></span><span>Marketing</span>
              </a>
              <a href="/marketing/google-ads" class="nav-dropdown-item">
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)"><SimyIcon name="megaphone" :size="16" /></span><span>Google Ads</span>
              </a>
              <a href="/marketing/seo" class="nav-dropdown-item">
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)"><SimyIcon name="search" :size="16" /></span><span>SEO</span>
              </a>
              <div class="border-t border-gray-100 my-1" />
              <a href="/vergleich" class="nav-dropdown-item font-semibold">
                <span class="nav-dropdown-icon" style="color: var(--brand-primary)"><SimyIcon name="shuffle" :size="16" /></span><span>Vergleiche</span>
              </a>
              <a href="/vergleich/calendly-alternative" class="nav-dropdown-item pl-9 text-gray-500 !text-[13px]">
                Calendly Alternative
              </a>
              <a href="/vergleich/terminli" class="nav-dropdown-item pl-9 text-gray-500 !text-[13px]">
                vs Terminli
              </a>
            </div>
          </div>
        </div>

        <a href="/preise" class="px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">Preise</a>
        <a href="/kunden" class="px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">Kunden</a>
      </div>

      <!-- CTAs -->
      <div class="flex items-center gap-3">
        <a href="https://app.simy.ch/login" class="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors px-3 py-2">
          Einloggen
        </a>
        <a :href="registerCta"
          class="text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 whitespace-nowrap"
          :style="ctaStyle">
          30 Tage gratis →
        </a>
        <!-- Mobile menu button -->
        <button @click="mobileOpen = !mobileOpen" class="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="Menü">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Scroll-link pill bar (mobile + tablet, only when links provided) ── -->
    <div
      v-if="scrollLinks?.length"
      class="md:hidden border-t border-gray-100 bg-white/95 overflow-x-auto no-scrollbar"
    >
      <div class="flex items-center gap-2 px-4 py-2 w-max">
        <a
          v-for="link in scrollLinks"
          :key="link.href"
          :href="link.href"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150"
          :class="activeSection === link.href.slice(1) ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600'"
          :style="activeSection === link.href.slice(1) ? activePillStyle : {}"
          @click.prevent="scrollTo(link.href); mobileOpen = false"
          @mouseenter="(e) => activeSection !== link.href.slice(1) && Object.assign((e.currentTarget as HTMLElement).style, { background: `rgba(var(--brand-rgb), 0.12)`, color: effectivePrimary })"
          @mouseleave="(e) => activeSection !== link.href.slice(1) && Object.assign((e.currentTarget as HTMLElement).style, { background: '', color: '' })"
        >
          {{ link.label }}
        </a>
      </div>
    </div>

    <!-- ── Mobile full menu ────────────────────────────────────────────────── -->
    <Transition name="slide-down">
      <div v-if="mobileOpen" class="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1 overflow-y-auto" style="max-height: calc(100dvh - 64px)">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 px-3 pt-2 pb-1">Branchen</p>
        <a
          v-for="v in branchenLinks"
          :key="v.href"
          :href="v.href"
          class="mobile-nav-link"
          @click="mobileOpen=false"
        >{{ v.label }}</a>
        <a href="/branchen" class="mobile-nav-link font-semibold" style="color: var(--brand-primary)" @click="mobileOpen=false">Alle Branchen</a>

        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 px-3 pt-3 pb-1">Features</p>
        <a href="/features/kalender" class="mobile-nav-link" @click="mobileOpen=false">Kalender & Planung</a>
        <a href="/features/rechnungen" class="mobile-nav-link" @click="mobileOpen=false">Rechnungen & Kasse</a>
        <a href="/features/kalender" class="mobile-nav-link" @click="mobileOpen=false">Online-Buchung</a>
        <a href="/marketing" class="mobile-nav-link" @click="mobileOpen=false">Marketing</a>
        <a href="/marketing/google-ads" class="mobile-nav-link pl-7 text-gray-400" @click="mobileOpen=false">Google Ads</a>
        <a href="/marketing/seo" class="mobile-nav-link pl-7 text-gray-400" @click="mobileOpen=false">SEO</a>
        <a href="/vergleich" class="mobile-nav-link" @click="mobileOpen=false">Vergleiche</a>
        <a href="/vergleich/calendly-alternative" class="mobile-nav-link pl-7 text-gray-400" @click="mobileOpen=false">Calendly Alternative</a>

        <a href="/preise" class="mobile-nav-link" @click="mobileOpen=false">Preise</a>
        <a href="/kunden" class="mobile-nav-link" @click="mobileOpen=false">Kunden</a>

        <div class="pt-3 border-t border-gray-100">
          <a :href="registerCta"
            class="block w-full text-center py-3 rounded-xl text-white font-bold text-sm"
            :style="ctaStyle">
            30 Tage gratis starten →
          </a>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { VERTICALS } from '~/data/verticals'
import { registerUrl } from '~/data/pricing'
import {
  SIMY_BRAND,
  SIMY_BRAND_STORAGE_KEY,
  simyLogoColorFilter,
} from '~/utils/brand'
import { VERTICAL_ICON_BY_SLUG, type SimyIconName } from '~/utils/icons'

interface ScrollLink {
  label: string
  href: string
  icon?: string
}

const props = defineProps<{
  logoSrc?: string | null
  scrollLinks?: ScrollLink[]
  primaryColor?: string
  secondaryColor?: string
}>()

const registerCta = registerUrl()

const branchenLinks = [
  { href: '/fahrschule', label: 'Fahrschule', icon: VERTICAL_ICON_BY_SLUG.fahrschule as SimyIconName },
  ...VERTICALS.map((v) => ({
    href: `/${v.slug}`,
    label: v.navLabel,
    icon: (VERTICAL_ICON_BY_SLUG[v.slug] || 'spark') as SimyIconName,
  })),
]

// Effective branding: prop takes priority, then localStorage, then default
const storedBrand = ref<{ primary?: string; secondary?: string; logo?: string }>({})

onMounted(() => {
  try {
    const raw = localStorage.getItem(SIMY_BRAND_STORAGE_KEY)
    if (raw) storedBrand.value = JSON.parse(raw) as { primary?: string; secondary?: string; logo?: string }
  } catch { /* ignore */ }
})

const effectivePrimary = computed(() => props.primaryColor || storedBrand.value.primary || SIMY_BRAND.primary)
const effectiveSecondary = computed(() => props.secondaryColor || storedBrand.value.secondary || SIMY_BRAND.secondary)
const effectiveLogo = computed(() => props.logoSrc || storedBrand.value.logo || null)

const logoColorFilter = computed(() =>
  simyLogoColorFilter(effectivePrimary.value, { hasCustomLogo: !!effectiveLogo.value }),
)

const mobileOpen = ref(false)
const activeSection = ref('')

const ctaStyle = computed(() => ({
  background: `linear-gradient(135deg, ${effectivePrimary.value}, ${effectiveSecondary.value})`
}))

const activePillStyle = computed(() => ({
  background: effectivePrimary.value,
  color: 'white'
}))

function scrollTo(href: string) {
  const id = href.startsWith('#') ? href.slice(1) : href
  const el = document.getElementById(id)
  if (!el) return
  const navHeight = 64 + (props.scrollLinks?.length ? 40 : 0)
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 8
  window.scrollTo({ top, behavior: 'smooth' })
}

// Highlight active section while scrolling (mobile pill bar)
onMounted(() => {
  if (!props.scrollLinks?.length) return

  const ids = props.scrollLinks.map(l => l.href.slice(1))
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeSection.value = entry.target.id
      }
    },
    { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
  )
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  })
  onUnmounted(() => observer.disconnect())
})
</script>

<style scoped>
.nav-dropdown-item {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.5rem 0.75rem; border-radius: 0.625rem;
  font-size: 0.875rem; font-weight: 500; color: #374151;
  text-decoration: none; transition: background 0.15s;
}
.nav-dropdown-item:hover { background: #f9fafb; }
.nav-dropdown-icon {
  font-size: 1rem; width: 1.25rem; height: 1.25rem;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: var(--brand-primary);
}
.mobile-nav-link {
  display: block; padding: 0.5rem 0.75rem; border-radius: 0.5rem;
  font-size: 0.9rem; font-weight: 500; color: #374151; text-decoration: none;
}
.mobile-nav-link:hover { background: #f9fafb; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
