<template>
  <footer class="bg-gray-950 text-gray-400">
    <div class="max-w-6xl mx-auto px-6 py-16">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">

        <!-- Brand -->
        <div class="col-span-2">
          <a href="/" class="inline-block mb-4">
            <img
              :src="effectiveLogo || '/simy-logo.png'"
              alt="Simy – All-in-One Software Schweiz"
              class="h-8 max-w-[140px] object-contain"
              :style="{ filter: logoColorFilter }"
            />
          </a>
          <p class="text-sm leading-relaxed max-w-xs">
            All-in-One Software für Dienstleister: Terminbuchung, Rechnungen, Website und Marketing — mit Branchen-Vorlagen.
          </p>
          <div class="mt-5">
            <a :href="registerCta"
              class="inline-block text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
              30 Tage gratis →
            </a>
          </div>
        </div>

        <!-- Branchen -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Branchen</p>
          <ul class="space-y-2.5">
            <li><a href="/branchen" class="footer-link">Übersicht</a></li>
            <li><a href="/fahrschule" class="footer-link">Fahrschule</a></li>
            <li><a href="/coaching" class="footer-link">Coaching</a></li>
            <li><a href="/consulting" class="footer-link">Consulting</a></li>
            <li><a href="/personal-training" class="footer-link">Personal Training</a></li>
            <li><a href="/nachhilfe" class="footer-link">Nachhilfe</a></li>
            <li><a href="/musikschule" class="footer-link">Musikschule</a></li>
            <li><a href="/hundeschule" class="footer-link">Hundeschule</a></li>
            <li><a href="/massage" class="footer-link">Massage</a></li>
          </ul>
        </div>

        <!-- Features + Vergleiche -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Features</p>
          <ul class="space-y-2.5">
            <li><a href="/features/kalender" class="footer-link">Kalender & Planung</a></li>
            <li><a href="/features/rechnungen" class="footer-link">Rechnungen & Kasse</a></li>
            <li><a href="/features/kurse" class="footer-link">Kursbuchungsseite</a></li>
            <li><a href="/marketing" class="footer-link">Marketing</a></li>
            <li><a href="/vergleich" class="footer-link">Vergleiche</a></li>
            <li><a href="/vergleich/calendly-alternative" class="footer-link">Calendly Alternative</a></li>
            <li><a href="/vergleich/terminli" class="footer-link">vs Terminli</a></li>
            <li><a href="/vergleich/klara" class="footer-link">vs KLARA</a></li>
            <li><a href="/vergleich/simplybook" class="footer-link">vs SimplyBook</a></li>
          </ul>
        </div>

        <!-- Produkt -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Produkt</p>
          <ul class="space-y-2.5">
            <li><a href="/preise" class="footer-link">Preise</a></li>
            <li><a href="/demo" class="footer-link">Demo starten</a></li>
            <li><a href="/kunden" class="footer-link">Kundenstories</a></li>
            <li><a href="/ueber-uns" class="footer-link">Über uns</a></li>
            <li><a href="/partner" class="footer-link">Partner</a></li>
            <li><a href="/branchen" class="footer-link">Branchen-Übersicht</a></li>
            <li><a href="/kontakt" class="footer-link">Kontakt</a></li>
            <li><a href="https://app.simy.ch/login" class="footer-link">Login</a></li>
          </ul>
        </div>

        <!-- Rechtliches -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Rechtliches</p>
          <ul class="space-y-2.5">
            <li><a href="/agb" class="footer-link">AGB</a></li>
            <li><a href="/datenschutz" class="footer-link">Datenschutz</a></li>
            <li><a href="/impressum" class="footer-link">Impressum</a></li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs text-gray-600">© {{ new Date().getFullYear() }} Simy IT Systems · Pascal Kilchenmann · <a href="mailto:info@simy.ch" class="hover:text-gray-400 transition-colors">info@simy.ch</a></p>
        <div class="flex gap-4 text-xs">
          <span class="text-gray-700 flex items-center gap-1.5">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Swiss Made
          </span>
          <span class="text-gray-700">DSGVO-konform</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import {
  SIMY_BRAND,
  SIMY_BRAND_STORAGE_KEY,
  simyLogoColorFilter,
} from '~/utils/brand'

const props = defineProps<{
  logoSrc?: string | null
  primaryColor?: string
}>()

const { registerCta } = useRegisterCta()

const storedBrand = ref<{ primary?: string; logo?: string }>({})

onMounted(() => {
  try {
    const raw = localStorage.getItem(SIMY_BRAND_STORAGE_KEY)
    if (raw) storedBrand.value = JSON.parse(raw) as { primary?: string; logo?: string }
  } catch { /* ignore */ }
})

const effectiveLogo = computed(() => props.logoSrc || storedBrand.value.logo || null)
const effectivePrimary = computed(() => props.primaryColor || storedBrand.value.primary || SIMY_BRAND.primary)

const logoColorFilter = computed(() =>
  simyLogoColorFilter(effectivePrimary.value, { hasCustomLogo: !!effectiveLogo.value }),
)
</script>

<style scoped>
.footer-link { font-size: 0.875rem; color: #9ca3af; text-decoration: none; transition: color 0.15s; }
.footer-link:hover { color: #f9fafb; }
</style>
