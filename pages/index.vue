<template>
  <div class="min-h-screen bg-white font-sans">

    <!-- ── Nav ──────────────────────────────────────────────────────────────── -->
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <img src="/simy-logo.png" alt="Simy" class="h-8" />
        <div class="flex items-center gap-4">
          <a href="#preise" class="hidden sm:block text-sm font-medium text-gray-500 hover:text-purple-700 transition-colors">Preise</a>
          <a href="/login" class="text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors">Einloggen</a>
          <a href="/tenant-register"
            class="text-sm font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, #6000BD, #8B2FE8);">
            Kostenlos starten →
          </a>
        </div>
      </div>
    </nav>

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-24 pb-20 px-6">
      <div class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style="background: radial-gradient(circle, #6000BD, transparent)"></div>
      <div class="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full opacity-8 pointer-events-none"
        style="background: radial-gradient(circle, #BEA3FF, transparent)"></div>

      <div class="relative max-w-4xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-8 border"
          style="background: #F3EBFF; color: #6000BD; border-color: #DDD0FF;">
          <span class="w-2 h-2 rounded-full animate-pulse" style="background: #6000BD;"></span>
          60 Tage kostenlos – keine Kreditkarte nötig
        </div>

        <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
          Deine Fahrschule.<br>
          <span style="background: linear-gradient(135deg, #6000BD, #BEA3FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Auf Autopilot.
          </span>
        </h1>

        <p class="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-4 leading-relaxed">
          Simy übernimmt Verwaltung, Abrechnung und Kommunikation –
          damit du wieder Zeit für das hast, was wirklich zählt: <strong class="text-gray-700">Unterrichten.</strong>
        </p>
        <p class="text-sm text-gray-400 mb-10">Monatlich kündbar · 1 Monat Kündigungsfrist · Keine versteckten Kosten</p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all hover:scale-105"
            style="background: linear-gradient(135deg, #6000BD, #8B2FE8); box-shadow: 0 8px 30px rgba(96,0,189,0.35);">
            60 Tage gratis testen
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </a>
          <a href="#features"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg border-2 border-purple-200 text-purple-700 hover:bg-purple-50 transition-all">
            Alle Features
          </a>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-gray-400">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
            DSGVO-konform
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
            Schweizer Server
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
            PostFinance & TWINT
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
            Keine IT-Kenntnisse nötig
          </div>
        </div>
      </div>
    </section>

    <!-- ── Pain → Solution ──────────────────────────────────────────────────── -->
    <section class="py-20 px-6" style="background: linear-gradient(180deg, #F8F4FF 0%, #FFFFFF 100%);">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD;">Das Problem</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Wie viel Zeit verlierst du täglich?</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Fahrlehrer verbringen durchschnittlich <strong>2-3 Stunden täglich</strong> mit Administration – Zeit, die du mit Unterrichten verdienen könntest.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-6 mb-14">
          <div v-for="pain in pains" :key="pain.title"
            class="rounded-2xl p-6 border border-red-100 bg-red-50">
            <div class="text-3xl mb-3">{{ pain.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-1">{{ pain.title }}</h3>
            <p class="text-sm text-gray-500">{{ pain.text }}</p>
          </div>
        </div>

        <div class="text-center">
          <div class="inline-flex items-center gap-3 text-2xl font-black" style="color: #6000BD;">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
            Simy automatisiert das alles für dich.
          </div>
        </div>
      </div>
    </section>

    <!-- ── Features ──────────────────────────────────────────────────────────── -->
    <section id="features" class="py-20 px-6 bg-white">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD;">Features</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Alles was deine Fahrschule braucht</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">Von der Lektionsbuchung bis zur Abrechnung – in einer einzigen Plattform.</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div v-for="feat in features" :key="feat.title"
            class="group rounded-2xl p-6 border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-xl"
              :style="`background: ${feat.bg}`">
              {{ feat.icon }}
            </div>
            <h3 class="font-bold text-gray-900 mb-1">{{ feat.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Automations ────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, #6000BD 0%, #8B2FE8 100%);">
      <div class="max-w-5xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3 text-purple-200">Automatisierung</p>
        <h2 class="text-4xl font-extrabold text-white mb-4">Simy arbeitet. Du unterrichtest.</h2>
        <p class="text-purple-200 text-lg max-w-2xl mx-auto mb-14">Diese Aufgaben erledigt Simy <strong class="text-white">jeden Tag automatisch</strong> für dich – ohne dass du einen Finger rühren musst.</p>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="auto in automations" :key="auto.label"
            class="rounded-2xl p-5 border text-left"
            style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg"
              style="background: rgba(190,163,255,0.2);">
              {{ auto.icon }}
            </div>
            <p class="text-white font-bold text-sm mb-1">{{ auto.label }}</p>
            <p class="text-purple-200 text-xs leading-relaxed">{{ auto.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Personas ───────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD;">Für alle</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Vorteile für jeden in deiner Fahrschule</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="persona in personas" :key="persona.title"
            class="rounded-3xl p-8 border-2"
            :style="`background: ${persona.bg}; border-color: ${persona.border};`">
            <div class="text-4xl mb-4">{{ persona.icon }}</div>
            <h3 class="text-xl font-extrabold mb-1" :style="`color: ${persona.color}`">{{ persona.title }}</h3>
            <p class="text-sm text-gray-500 mb-5">{{ persona.subtitle }}</p>
            <ul class="space-y-2">
              <li v-for="benefit in persona.benefits" :key="benefit"
                class="flex items-start gap-2 text-sm text-gray-700">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" :style="`color: ${persona.color}`" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ benefit }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ── ROI Calculator ─────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" style="background: linear-gradient(180deg, #F8F4FF 0%, #FFFFFF 100%);">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-10">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD;">Dein ROI</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-3">Was ist deine Zeit wert?</h2>
          <p class="text-gray-500">Rechne aus, wie viel du mit Simy verdienen kannst – allein durch die Zeit, die du zurückgewinnst.</p>
        </div>

        <div class="rounded-3xl border-2 p-8 md:p-10" style="border-color: #DDD0FF; background: white;">
          <div class="grid sm:grid-cols-2 gap-6 mb-8">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">Stundenlohn (CHF)</label>
              <input v-model.number="roi.hourlyRate" type="range" min="60" max="200" step="10"
                class="w-full accent-purple-600" />
              <div class="text-2xl font-black mt-2" style="color: #6000BD;">CHF {{ roi.hourlyRate }}.–</div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">Admin-Zeit pro Tag (h)</label>
              <input v-model.number="roi.hoursPerDay" type="range" min="0.5" max="4" step="0.5"
                class="w-full accent-purple-600" />
              <div class="text-2xl font-black mt-2" style="color: #6000BD;">{{ roi.hoursPerDay }} h/Tag</div>
            </div>
          </div>

          <div class="rounded-2xl p-6 text-center" style="background: linear-gradient(135deg, #6000BD, #8B2FE8);">
            <p class="text-purple-200 text-sm mb-1">Dein monatliches Einsparungspotenzial</p>
            <div class="text-5xl font-black text-white">CHF {{ roiSaving }}.–</div>
            <p class="text-purple-200 text-sm mt-2">{{ roiHours }} Stunden × CHF {{ roi.hourlyRate }} × 22 Arbeitstage</p>
          </div>

          <p class="text-center text-xs text-gray-400 mt-4">
            Simy Starter ab CHF 69.– / Monat — Amortisation am ersten Tag.
          </p>
        </div>
      </div>
    </section>

    <!-- ── Pricing Teaser ─────────────────────────────────────────────────────── -->
    <section id="preise" class="py-20 px-6 bg-white">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD;">Preise</p>
        <h2 class="text-4xl font-extrabold text-gray-900 mb-3">Transparent. Flexibel. Fair.</h2>
        <p class="text-gray-500 text-lg mb-12">Monatlich kündbar, keine Jahresbindung. Starte mit 60 Tagen kostenlos.</p>

        <div class="grid md:grid-cols-3 gap-5 mb-10">
          <div v-for="plan in pricingPlans" :key="plan.name"
            class="rounded-3xl p-7 border-2 flex flex-col relative"
            :style="plan.highlighted
              ? 'background: linear-gradient(145deg, #6000BD, #8B2FE8); border-color: transparent; box-shadow: 0 25px 50px rgba(96,0,189,0.3);'
              : 'border-color: #EEE8FF; background: white;'">
            <div v-if="plan.highlighted"
              class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide"
              style="background: #BEA3FF; color: #3D007A;">
              ✦ Am beliebtesten
            </div>
            <h3 class="font-extrabold text-xl mb-1" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">{{ plan.name }}</h3>
            <p class="text-sm mb-4" :class="plan.highlighted ? 'text-purple-200' : 'text-gray-400'">{{ plan.tagline }}</p>
            <div class="flex items-baseline gap-1 mb-5">
              <span class="text-4xl font-black" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">CHF {{ plan.price }}</span>
              <span class="text-sm" :class="plan.highlighted ? 'text-purple-200' : 'text-gray-400'">/Monat</span>
            </div>
            <ul class="space-y-2 mb-6 flex-1">
              <li v-for="f in plan.featureList" :key="f" class="flex items-center gap-2 text-sm"
                :class="plan.highlighted ? 'text-purple-100' : 'text-gray-600'">
                <svg class="w-4 h-4 flex-shrink-0" :class="plan.highlighted ? 'text-purple-300' : 'text-purple-500'" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ f }}
              </li>
            </ul>
            <a href="/tenant-register"
              class="block text-center py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              :style="plan.highlighted
                ? 'background: #BEA3FF; color: #3D007A;'
                : 'background: linear-gradient(135deg, #6000BD, #8B2FE8); color: white;'">
              60 Tage gratis starten
            </a>
          </div>
        </div>

        <a href="/upgrade" class="text-sm font-medium transition-colors" style="color: #6000BD;">
          Alle Features & Preise vergleichen →
        </a>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6" style="background: #F8F4FF;">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD;">FAQ</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Häufige Fragen</h2>
        </div>
        <div class="space-y-3">
          <div v-for="faq in faqs" :key="faq.q"
            class="rounded-2xl border bg-white overflow-hidden"
            style="border-color: #EEE8FF;">
            <button @click="faq.open = !faq.open"
              class="w-full text-left px-6 py-4 flex items-center justify-between font-bold text-gray-900 hover:bg-purple-50 transition-colors">
              {{ faq.q }}
              <svg class="w-5 h-5 text-purple-400 flex-shrink-0 transition-transform duration-200"
                :class="faq.open ? 'rotate-45' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div v-if="faq.open" class="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t" style="border-color: #EEE8FF;">
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Final CTA ──────────────────────────────────────────────────────────── -->
    <section class="py-24 px-6" style="background: linear-gradient(135deg, #6000BD 0%, #8B2FE8 100%);">
      <div class="max-w-3xl mx-auto text-center">
        <div class="absolute -z-0 inset-0 opacity-10" style="background: radial-gradient(circle at 30% 50%, white, transparent)"></div>
        <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Bereit, deine Fahrschule<br>auf Autopilot zu schalten?
        </h2>
        <p class="text-purple-200 text-lg mb-10">Starte heute mit 60 Tagen kostenlos – keine Kreditkarte, keine Bindung.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-purple-900 font-black text-lg shadow-xl hover:scale-105 transition-all"
            style="background: #BEA3FF;">
            Jetzt kostenlos starten →
          </a>
          <a href="mailto:info@simy.ch"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg border-2 border-white/30 hover:bg-white/10 transition-all">
            Demo anfragen
          </a>
        </div>
        <p class="text-purple-300 text-xs mt-6">Fragen? <a href="mailto:info@simy.ch" class="underline hover:text-white">info@simy.ch</a> · <a href="tel:+41797157027" class="underline hover:text-white">079 715 70 27</a></p>
      </div>
    </section>

    <!-- ── Footer ──────────────────────────────────────────────────────────────── -->
    <footer class="py-10 px-6 border-t border-gray-100">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <div class="flex items-center gap-3">
          <img src="/simy-logo.png" alt="Simy" class="h-7 opacity-60" />
          <span>© {{ currentYear }} Simy · Weiherweg 2, 8610 Uster</span>
        </div>
        <div class="flex items-center gap-4">
          <a href="/login" class="hover:text-gray-700 transition-colors">Login</a>
          <a href="/upgrade" class="hover:text-gray-700 transition-colors">Preise</a>
          <a href="mailto:info@simy.ch" class="hover:text-gray-700 transition-colors">Kontakt</a>
          <a href="/tenant-register" class="font-bold hover:text-purple-700 transition-colors" style="color: #6000BD;">Registrieren</a>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { definePageMeta, useHead } from '#imports'

definePageMeta({ layout: false })

useHead({
  title: 'Simy – Die smarte Fahrschul-Software der Schweiz',
  meta: [
    { name: 'description', content: 'Simy automatisiert Verwaltung, Abrechnung und Kommunikation für Fahrschulen. 60 Tage kostenlos testen – keine Kreditkarte nötig.' }
  ],
})

const currentYear = computed(() => new Date().getFullYear())

const roi = reactive({ hourlyRate: 90, hoursPerDay: 2 })
const roiHours = computed(() => roi.hoursPerDay)
const roiSaving = computed(() => Math.round(roi.hourlyRate * roi.hoursPerDay * 22 / 10) * 10)

const pains = [
  { icon: '⏰', title: 'Manuelle Terminverwaltung', text: 'Stundenlanges Planen von Lektionen, Prüfungen und Ressourcen – alles per Hand oder mit Excel.' },
  { icon: '💸', title: 'Vergessene Rechnungen', text: 'Offene Posten, die durch die Lappen gehen. Mahnungen manuell schreiben. Zahlungen mühsam nachverfolgen.' },
  { icon: '📱', title: 'Chaotische Kommunikation', text: 'WhatsApp, SMS, E-Mail – Schüler fragen überall an, Erinnerungen verpasst, No-Shows häufen sich.' },
]

const features = [
  { icon: '📅', title: 'Kalender & Terminplanung', desc: 'Intelligente Lektionsplanung mit Ressourcen-Management, Live-Sync und automatischen Erinnerungen.', bg: '#E0E7FF' },
  { icon: '💳', title: 'Zahlungen & Rechnungen', desc: 'Automatische Rechnungen, Online-Zahlung mit TWINT & PostFinance, Mahnungen und Gutschriften.', bg: '#D1FAE5' },
  { icon: '👥', title: 'Schülerverwaltung', desc: 'Alle Schülerdaten, Lernfortschritte, Dokumente und Notizen zentral an einem Ort.', bg: '#FEE2E2' },
  { icon: '📊', title: 'Auswertungen & Statistiken', desc: 'Umsatz, Auslastung, No-Show-Rate, Top-Schüler – alle KPIs auf einen Blick.', bg: '#EDE9FE' },
  { icon: '🎓', title: 'Prüfungsverwaltung', desc: 'Prüfungsdaten erfassen, Experten zuweisen, Ergebnisse tracken. Alles dokumentiert.', bg: '#FEF3C7' },
  { icon: '🚗', title: 'Fahrzeug-Management', desc: 'Fahrzeuge verwalten, Revisionsdaten tracken, Fahrtenbuch führen – automatisch und übersichtlich.', bg: '#ECFEFF' },
  { icon: '📣', title: 'Affiliate-System', desc: 'Schüler empfehlen Freunde und erhalten Rabatte. Du gewinnst neue Kunden ohne Marketingaufwand.', bg: '#FFE4E6' },
  { icon: '🏫', title: 'Kursbuchungsseite', desc: 'Deine Schüler buchen Kurse online – mit eigenem Link, Branding und integrierter Zahlung.', bg: '#F0FDF4' },
  { icon: '🔔', title: 'Automatische Erinnerungen', desc: 'Lektionserinnerungen, Zahlungsfristen, Prüfungserinnerungen – Simy erinnert statt du.', bg: '#FFF7ED' },
]

const automations = [
  { icon: '📧', label: 'Lektionserinnerungen', desc: 'Automatisch per SMS oder E-Mail 24h vor der Lektion.' },
  { icon: '🧾', label: 'Rechnungsversand', desc: 'Nach jeder Lektion wird automatisch eine Rechnung erstellt und versendet.' },
  { icon: '🔁', label: 'Mahnungen', desc: 'Offene Rechnungen werden automatisch gemahnt – du erfährst es nur wenn nötig.' },
  { icon: '📈', label: 'Wochenbericht', desc: 'Jeden Montag dein persönlicher Bericht mit Umsatz, Lektionen und Auslastung.' },
  { icon: '🎯', label: 'Zieltracking', desc: 'Fortschrittsziele für Schüler werden automatisch aktualisiert und gemeldet.' },
  { icon: '🗓️', label: 'Verfügbarkeit', desc: 'Schüler sehen nur freie Slots und buchen direkt online.' },
  { icon: '💬', label: 'Willkommensnachrichten', desc: 'Neue Schüler erhalten sofort alle Infos – ohne dein Zutun.' },
  { icon: '🏆', label: 'Prüfungsbestaetigung', desc: 'Bestandene Prüfungen automatisch dokumentiert und dem Schüler gemeldet.' },
]

const personas = [
  {
    icon: '🧑‍💼',
    title: 'Admin / Inhaber',
    subtitle: 'Du behältst den Überblick',
    color: '#6000BD',
    bg: '#F3EBFF',
    border: '#DDD0FF',
    benefits: [
      'Umsatz & Auslastung in Echtzeit',
      'Alle Fahrlehrer im Überblick',
      'Automatische Rechnungen & Mahnungen',
      'DSGVO-konforme Datenverwaltung',
      'Zahlungseingänge auf einen Blick',
      'Eigenes Branding & Domain',
    ],
  },
  {
    icon: '👨‍🏫',
    title: 'Fahrlehrer / Staff',
    subtitle: 'Du fokussierst dich aufs Unterrichten',
    color: '#059669',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    benefits: [
      'Stundenplan immer aktuell',
      'Schülerinfos jederzeit verfügbar',
      'Automatische Erinnerungen an Schüler',
      'Notizen & Fortschritts-Tracking',
      'Einfache Stundenverwaltung',
      'Mobile-optimiert für unterwegs',
    ],
  },
  {
    icon: '🧑‍🎓',
    title: 'Schüler',
    subtitle: 'Deine Schüler lieben die Einfachheit',
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    benefits: [
      'Online buchen rund um die Uhr',
      'Automatische Lektionserinnerungen',
      'Bezahlen per TWINT & PostFinance',
      'Lernfortschritt immer im Blick',
      'Prüfungsinfos sofort sichtbar',
      'Kein App-Download nötig',
    ],
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    tagline: 'Für Einzelfahrlehrer',
    price: '69',
    highlighted: true,
    featureList: ['1 Fahrlehrer', 'Alle Kernfeatures', 'Zahlungen & Rechnungen', 'Auswertungen', 'Prüfungsverwaltung', 'Support per E-Mail'],
  },
  {
    name: 'Professional',
    tagline: 'Für kleine Teams',
    price: '129',
    highlighted: false,
    featureList: ['Bis 3 Fahrlehrer', 'Alle Starter-Features', 'Multi-Staff Kalender', 'Erweiterte Auswertungen', 'Prioritäts-Support'],
  },
  {
    name: 'Enterprise',
    tagline: 'Für grosse Fahrschulen',
    price: '249',
    highlighted: false,
    featureList: ['Unbegrenzte Fahrlehrer', 'Alle Professional-Features', 'Dediziertes Onboarding', 'API-Zugang', 'SLA-Garantie'],
  },
]

const faqs = reactive([
  { q: 'Brauche ich eine Kreditkarte für den Trial?', a: 'Nein, der 60-Tage-Trial ist vollständig kostenlos und ohne Kreditkarte. Du wirst erst nach dem Trial zur Kasse gebeten – und kannst jederzeit kündigen.', open: false },
  { q: 'Wie funktioniert die Kündigung?', a: 'Du kannst monatlich kündigen. Die Kündigungsfrist beträgt 1 Monat auf Ende des laufenden Monats. Keine Jahresbindung, keine versteckten Kosten.', open: false },
  { q: 'Welche Zahlungsmethoden unterstützt Simy?', a: 'Für deine Schüler unterstützen wir TWINT, PostFinance, Kreditkarte und Banküberweisung – alles integriert und ohne extra Setup.', open: false },
  { q: 'Kann ich von einem Plan upgraden?', a: 'Ja, jederzeit. Dein Upgrade wird sofort aktiv und anteilig verrechnet. Du verlierst keine Daten.', open: false },
  { q: 'Sind meine Daten sicher?', a: 'Ja. Simy betreibt alle Daten auf Schweizer Servern, ist DSGVO-konform und verwendet Ende-zu-Ende-Verschlüsselung für sensible Daten.', open: false },
])
</script>
