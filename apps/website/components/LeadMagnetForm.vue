<template>
  <section :class="['py-16 px-4', bgClass]">
    <div class="max-w-2xl mx-auto text-center">

      <!-- Icon + Badge -->
      <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-white/30">
        <span>🎁</span> Kostenloser Ratgeber
      </div>

      <!-- Headline -->
      <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
        {{ headline }}
      </h2>
      <p class="text-white/80 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        {{ description }}
      </p>

      <!-- Benefits list -->
      <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
        <span v-for="benefit in benefits" :key="benefit" class="flex items-center gap-1.5 text-white/90 text-sm font-medium">
          <svg class="w-4 h-4 text-white/70 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          {{ benefit }}
        </span>
      </div>

      <!-- Form card -->
      <div class="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg mx-auto text-left">

        <!-- Success state -->
        <div v-if="state === 'success'" class="text-center py-4">
          <div class="text-5xl mb-4">🎉</div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Ratgeber ist unterwegs!</h3>
          <p class="text-gray-600 text-sm leading-relaxed">
            Schau in dein Postfach – <strong>{{ sentToEmail }}</strong>. Falls du keine E-Mail erhältst, prüfe den Spam-Ordner.
          </p>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit">
          <div class="flex flex-col sm:flex-row gap-3 mb-3">
            <div class="flex-1">
              <label for="lm-firstname" class="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Vorname</label>
              <input
                id="lm-firstname"
                v-model="firstName"
                type="text"
                placeholder="Dein Vorname"
                autocomplete="given-name"
                maxlength="60"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                :class="[focusRingClass, state === 'error' ? 'border-red-300' : '']"
                :disabled="state === 'loading'"
              />
            </div>
            <div class="flex-[1.6]">
              <label for="lm-email" class="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">E-Mail-Adresse</label>
              <input
                id="lm-email"
                v-model="email"
                type="email"
                placeholder="deine@email.ch"
                autocomplete="email"
                required
                class="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                :class="[focusRingClass, state === 'error' ? 'border-red-300' : '']"
                :disabled="state === 'loading'"
              />
            </div>
          </div>

          <!-- Error message -->
          <p v-if="errorMsg" class="text-red-600 text-xs mb-3 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {{ errorMsg }}
          </p>

          <button
            type="submit"
            :disabled="state === 'loading'"
            class="w-full py-3.5 px-6 rounded-xl font-bold text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            :class="buttonClass"
          >
            <span v-if="state === 'loading'" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Wird gesendet…
            </span>
            <span v-else>{{ ctaLabel }} →</span>
          </button>

          <p class="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
            <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
            Kein Spam. Nur wertvolle Infos. Jederzeit abmelden.
          </p>
        </form>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LeadMagnetCategory } from '~/server/api/leadmagnet/subscribe.post'

interface Props {
  category: LeadMagnetCategory
}

const props = defineProps<Props>()

// ─── Config per category ──────────────────────────────────────────────────────

const CONFIG: Record<LeadMagnetCategory, {
  headline: string
  description: string
  benefits: string[]
  ctaLabel: string
  bg: string
  button: string
  focusRing: string
}> = {
  auto: {
    headline: 'Dein kostenloser Führerausweis-Guide',
    description: 'Der komplette 7-Schritte-Plan mit Insider-Tipps: Wann VKU buchen, wie du Kosten sparst und was beim WAB-Kurs gilt.',
    benefits: ['7-Schritte-Plan', 'Kosten-Übersicht', 'Prüfungstipps', 'Probezeit-Regeln'],
    ctaLabel: 'Kostenlosen Guide senden',
    bg: 'bg-gradient-to-br from-primary-600 to-primary-700',
    button: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    focusRing: 'focus:ring-primary-500',
  },
  motorrad: {
    headline: 'Dein Motorrad-Führerschein Guide',
    description: 'Kategorien A1 bis A erklärt, Grundkurs-Aufbau, alle 7 Prüfungsübungen mit Profi-Tipps und die häufigsten Fehler – kompakt erklärt.',
    benefits: ['A1 → A35kW → A erklärt', '7 Prüfungsübungen', 'Grundkurs-Aufbau', 'Schutzausrüstung'],
    ctaLabel: 'Kostenlosen Guide senden',
    bg: 'bg-gradient-to-br from-primary-600 to-primary-700',
    button: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    focusRing: 'focus:ring-primary-500',
  },
  lastwagen: {
    headline: 'Dein Lastwagen-Ausweis Guide (Kat. C)',
    description: 'CZV-Fähigkeitsausweis, die 5 Prüfungsteile, Fahrtenschreiber-Pflicht und alles zum Unterschied C1 vs. C.',
    benefits: ['C1 vs. C erklärt', 'CZV-Prüfung: 5 Teile', 'Fahrtenschreiber-Infos', 'Kosten-Übersicht'],
    ctaLabel: 'Kostenlosen Guide senden',
    bg: 'bg-gradient-to-br from-primary-600 to-primary-700',
    button: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    focusRing: 'focus:ring-primary-500',
  },
  anhaenger: {
    headline: 'Dein Anhänger (Kat. BE) Guide',
    description: 'Die 750 kg-Regel erklärt, Prüfungsinhalt, Rückwärtsfahren-Tipps und wann du das BE wirklich brauchst.',
    benefits: ['750 kg-Regel klar', 'Prüfungsinhalt', 'Rückwärtsfahren-Tipps', 'Nur 3–5 Doppellektionen'],
    ctaLabel: 'Kostenlosen Guide senden',
    bg: 'bg-gradient-to-br from-primary-600 to-primary-700',
    button: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    focusRing: 'focus:ring-primary-500',
  },
  motorboot: {
    headline: 'Dein Motorboot-Führerschein Guide',
    description: 'Theorieprüfung, die 11 Prüfungsthemen, Prüfungsorte in Zürich und praktische Tipps für die Bootsprüfung.',
    benefits: ['11 Theoriethemen', '60-Fragen-Tipps', 'Prüfungsorte Zürich', 'Wetter-Regeln'],
    ctaLabel: 'Kostenlosen Guide senden',
    bg: 'bg-gradient-to-br from-primary-600 to-primary-700',
    button: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    focusRing: 'focus:ring-primary-500',
  },
}

const config = computed(() => CONFIG[props.category])
const headline = computed(() => config.value.headline)
const description = computed(() => config.value.description)
const benefits = computed(() => config.value.benefits)
const ctaLabel = computed(() => config.value.ctaLabel)
const bgClass = computed(() => config.value.bg)
const buttonClass = computed(() => config.value.button)
const focusRingClass = computed(() => config.value.focusRing)

// ─── Form state ───────────────────────────────────────────────────────────────

const firstName = ref('')
const email = ref('')
const state = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMsg = ref('')
const sentToEmail = ref('')

async function submit() {
  errorMsg.value = ''
  state.value = 'loading'
  try {
    await $fetch('/api/leadmagnet/subscribe', {
      method: 'POST',
      body: { firstName: firstName.value, email: email.value, category: props.category },
    })
    sentToEmail.value = email.value
    state.value = 'success'
  } catch (err: any) {
    state.value = 'error'
    errorMsg.value = err?.data?.statusMessage || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.'
  }
}
</script>
