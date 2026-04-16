<template>
  <div class="min-h-screen bg-white font-sans">

    <!-- ── Nav ──────────────────────────────────────────────────────────────── -->
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <img src="/simy-logo.png" alt="Simy" class="h-8" />
        <a href="/login"
          class="text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors">
          Einloggen →
        </a>
      </div>
    </nav>

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-20 pb-16 px-6">
      <!-- Background gradient blobs -->
      <div class="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
        style="background: radial-gradient(circle, #6000BD, transparent)"></div>
      <div class="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-10"
        style="background: radial-gradient(circle, #BEA3FF, transparent)"></div>

      <div class="relative max-w-3xl mx-auto text-center">
        <!-- Trial / Status Banner -->
        <div v-if="trialStatus.status !== 'active'" class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-8"
          :class="trialStatus.status === 'expired'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'">
          <span class="w-2 h-2 rounded-full animate-pulse"
            :class="trialStatus.status === 'expired' ? 'bg-red-500' : 'bg-amber-500'"></span>
          {{ trialStatus.message }}
        </div>

        <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
          Deine Fahrschule.<br>
          <span style="background: linear-gradient(135deg, #6000BD, #BEA3FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Auf Autopilot.
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-xl mx-auto mb-4">
          30 Tage kostenlos testen — alle Features inklusive, keine Kreditkarte nötig.
        </p>
        <p class="text-sm text-gray-400">
          Monatlich kündbar · 1 Monat Kündigungsfrist · Keine Bindung
        </p>
      </div>
    </section>

    <!-- ── Plan Selector ────────────────────────────────────────────────────── -->
    <section class="px-6 pb-6">
      <div class="max-w-5xl mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-purple-400 text-center mb-8">
          1 — Plan wählen
        </p>
        <div class="grid md:grid-cols-3 gap-5">
          <div
            v-for="plan in plans"
            :key="plan.id"
            @click="selectedPlan = plan.id"
            :class="[
              'relative rounded-3xl p-7 flex flex-col cursor-pointer transition-all duration-300 border-2 group',
              selectedPlan === plan.id
                ? plan.highlighted
                  ? 'border-transparent text-white shadow-2xl'
                  : 'border-purple-500 bg-purple-50 shadow-xl'
                : 'border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-purple-200',
            ]"
            :style="selectedPlan === plan.id && plan.highlighted
              ? 'background: linear-gradient(145deg, #6000BD, #8B2FE8); box-shadow: 0 25px 50px rgba(96,0,189,0.35);'
              : ''"
          >
            <!-- Popular badge -->
            <div v-if="plan.highlighted"
              class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide"
              :style="selectedPlan === plan.id
                ? 'background: #BEA3FF; color: #3D007A;'
                : 'background: linear-gradient(135deg, #6000BD, #BEA3FF); color: white;'">
              ✦ Am Beliebtesten
            </div>

            <!-- Checkmark -->
            <div v-if="selectedPlan === plan.id"
              class="absolute top-5 right-5 w-6 h-6 rounded-full flex items-center justify-center"
              :style="plan.highlighted ? 'background: rgba(255,255,255,0.2)' : 'background: #6000BD'">
              <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>

            <!-- Header -->
            <p :class="['text-xs font-bold uppercase tracking-widest mb-1',
              selectedPlan === plan.id && plan.highlighted ? 'text-purple-200' : 'text-purple-500']">
              {{ plan.name }}
            </p>
            <p :class="['text-sm mb-5',
              selectedPlan === plan.id && plan.highlighted ? 'text-purple-100' : 'text-gray-400']">
              {{ plan.tagline }}
            </p>

            <!-- Price -->
            <div class="mb-6">
              <span :class="['text-4xl font-black',
                selectedPlan === plan.id && plan.highlighted ? 'text-white' : 'text-gray-900']">
                <span v-if="pricesLoading" class="inline-block w-20 h-10 rounded-lg animate-pulse"
                  :style="plan.highlighted ? 'background:rgba(255,255,255,0.15)' : 'background:#f3f4f6'"></span>
                <span v-else>{{ formatChf(planPriceAmount(plan.id)) }}</span>
              </span>
              <span :class="['text-sm ml-1',
                selectedPlan === plan.id && plan.highlighted ? 'text-purple-200' : 'text-gray-400']">
                /Monat
              </span>
            </div>

            <!-- Features -->
            <ul class="space-y-2.5 flex-1 mb-6">
              <li v-for="feature in plan.features" :key="feature"
                class="flex items-start gap-2.5 text-sm">
                <svg class="w-4 h-4 mt-0.5 shrink-0 flex-none"
                  :style="selectedPlan === plan.id && plan.highlighted ? 'color:#BEA3FF' : 'color:#6000BD'"
                  fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span :class="selectedPlan === plan.id && plan.highlighted ? 'text-purple-50' : 'text-gray-600'">
                  {{ feature }}
                </span>
              </li>
            </ul>

            <!-- Seats badge -->
            <div class="text-xs font-medium rounded-xl px-3 py-2 text-center"
              :style="selectedPlan === plan.id && plan.highlighted
                ? 'background: rgba(255,255,255,0.12); color: #E9D5FF;'
                : 'background: #F5F3FF; color: #6000BD;'">
              {{ plan.includedSeats === null ? '∞ Fahrlehrer inkl.' : `${plan.includedSeats} Fahrlehrer inkl.` }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Add-ons ───────────────────────────────────────────────────────────── -->
    <section class="px-6 py-10">
      <div class="max-w-5xl mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-purple-400 text-center mb-8">
          2 — Add-ons (optional)
        </p>
        <div class="grid md:grid-cols-3 gap-4">

          <!-- Fahrlehrer Seats -->
          <div :class="['rounded-2xl border-2 p-5 transition-all bg-white',
            addonSeats > 0 ? 'border-purple-400 shadow-lg shadow-purple-100' : 'border-gray-100 shadow-sm']">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="font-bold text-gray-900 text-sm">Fahrlehrer Seat</p>
                <p class="text-xs text-gray-400 mt-0.5">Zusätzlicher Account</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg"
                style="background:#F5F3FF; color:#6000BD;">
                {{ pricesLoading ? '…' : formatChf(addonPriceAmount('seats')) }}/Seat
              </span>
            </div>
            <div v-if="selectedPlan === 'enterprise'" class="text-xs text-gray-400 italic text-center py-2">
              Unbegrenzt im Enterprise inklusive
            </div>
            <div v-else class="flex items-center justify-center gap-4">
              <button @click="addonSeats = Math.max(0, addonSeats - 1)"
                class="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 font-bold hover:border-purple-400 hover:text-purple-600 transition-all text-lg">−</button>
              <span class="text-2xl font-black w-8 text-center" style="color:#6000BD">{{ addonSeats }}</span>
              <button @click="addonSeats++"
                class="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold transition-all text-lg text-white"
                style="background:#6000BD; border-color:#6000BD;">+</button>
            </div>
          </div>

          <!-- Kursbuchungsseite -->
          <div @click="toggleCourses"
            :class="['rounded-2xl border-2 p-5 transition-all bg-white cursor-pointer',
              addonCourses ? 'border-purple-400 shadow-lg shadow-purple-100'
              : planIncludesCourses ? 'border-gray-100 opacity-60'
              : 'border-gray-100 shadow-sm hover:border-purple-200']">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="font-bold text-gray-900 text-sm">Kursbuchungsseite</p>
                <p class="text-xs text-gray-400 mt-0.5">Online-Buchung für Schüler</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg"
                style="background:#F5F3FF; color:#6000BD;">
                {{ pricesLoading ? '…' : formatChf(addonPriceAmount('courses')) }}/Mt.
              </span>
            </div>
            <div v-if="planIncludesCourses" class="text-xs text-center py-1 font-medium" style="color:#6000BD">
              ✓ Im {{ selectedPlanDef?.name }}-Plan inkl.
            </div>
            <div v-else class="flex items-center justify-center">
              <div class="flex items-center gap-2.5 text-sm font-medium"
                :class="addonCourses ? 'text-purple-700' : 'text-gray-400'">
                <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  :style="addonCourses ? 'background:#6000BD; border-color:#6000BD' : 'border-color:#D1D5DB'">
                  <svg v-if="addonCourses" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                {{ addonCourses ? 'Ausgewählt' : 'Hinzufügen' }}
              </div>
            </div>
          </div>

          <!-- Affiliate -->
          <div @click="toggleAffiliate"
            :class="['rounded-2xl border-2 p-5 transition-all bg-white cursor-pointer',
              addonAffiliate ? 'border-purple-400 shadow-lg shadow-purple-100'
              : planIncludesAffiliate ? 'border-gray-100 opacity-60'
              : 'border-gray-100 shadow-sm hover:border-purple-200']">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="font-bold text-gray-900 text-sm">Affiliate-System</p>
                <p class="text-xs text-gray-400 mt-0.5">Empfehlungen & Partner</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg"
                style="background:#F5F3FF; color:#6000BD;">
                {{ pricesLoading ? '…' : formatChf(addonPriceAmount('affiliate')) }}/Mt.
              </span>
            </div>
            <div v-if="planIncludesAffiliate" class="text-xs text-center py-1 font-medium" style="color:#6000BD">
              ✓ Im Enterprise-Plan inkl.
            </div>
            <div v-else class="flex items-center justify-center">
              <div class="flex items-center gap-2.5 text-sm font-medium"
                :class="addonAffiliate ? 'text-purple-700' : 'text-gray-400'">
                <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  :style="addonAffiliate ? 'background:#6000BD; border-color:#6000BD' : 'border-color:#D1D5DB'">
                  <svg v-if="addonAffiliate" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                {{ addonAffiliate ? 'Ausgewählt' : 'Hinzufügen' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Order Summary + CTA ───────────────────────────────────────────────── -->
    <section class="px-6 pb-16">
      <div class="max-w-md mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-purple-400 text-center mb-6">
          3 — Bestätigen
        </p>

        <div class="rounded-3xl border border-purple-100 bg-white shadow-xl shadow-purple-100/50 overflow-hidden">
          <!-- Summary lines -->
          <div class="p-6 space-y-3 text-sm border-b border-gray-50">
            <div class="flex justify-between items-center">
              <span class="font-semibold text-gray-800">{{ selectedPlanDef?.name }}-Plan</span>
              <span class="font-bold text-gray-900">{{ pricesLoading ? '…' : planPrice }}</span>
            </div>
            <div v-if="addonSeats > 0 && selectedPlan !== 'enterprise'"
              class="flex justify-between items-center text-gray-500">
              <span>{{ addonSeats }} × Fahrlehrer Seat</span>
              <span>{{ formatChf(addonSeats * addonPriceAmount('seats')) }}</span>
            </div>
            <div v-if="addonCourses && !planIncludesCourses"
              class="flex justify-between items-center text-gray-500">
              <span>Kursbuchungsseite</span>
              <span>{{ formatChf(addonPriceAmount('courses')) }}</span>
            </div>
            <div v-if="addonAffiliate && !planIncludesAffiliate"
              class="flex justify-between items-center text-gray-500">
              <span>Affiliate-System</span>
              <span>{{ formatChf(addonPriceAmount('affiliate')) }}</span>
            </div>
          </div>

          <!-- Total -->
          <div class="px-6 py-4 flex justify-between items-center"
            style="background: linear-gradient(135deg, #F5F3FF, #EDE9FE)">
            <div>
              <p class="text-xs text-purple-500 font-medium">Total pro Monat</p>
              <p class="text-2xl font-black" style="color:#6000BD">
                {{ pricesLoading ? '…' : totalPrice }}
              </p>
            </div>
            <div class="text-right text-xs text-purple-400">
              <p>Monatlich kündbar</p>
              <p>1 Mt. Kündigungsfrist</p>
            </div>
          </div>

          <!-- CTA -->
          <div class="p-6">
            <button
              @click="startCheckout"
              :disabled="!!loading"
              class="w-full py-4 px-6 rounded-2xl font-bold text-base text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              style="background: linear-gradient(135deg, #6000BD, #8B2FE8); box-shadow: 0 8px 24px rgba(96,0,189,0.35);"
              onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 12px 32px rgba(96,0,189,0.45)'"
              onmouseout="this.style.transform=''; this.style.boxShadow='0 8px 24px rgba(96,0,189,0.35)'"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Weiterleitung zu Stripe…
              </span>
              <span v-else>Jetzt starten →</span>
            </button>
            <p class="text-center text-xs text-gray-400 mt-3">
              🔒 Sichere Zahlung via Stripe · 30 Tage Testphase
            </p>
          </div>
        </div>

        <div v-if="error"
          class="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm text-center">
          {{ error }}
        </div>
      </div>
    </section>

    <!-- ── Social Proof ──────────────────────────────────────────────────────── -->
    <section class="px-6 py-12 border-t border-gray-50">
      <div class="max-w-4xl mx-auto">
        <div class="grid md:grid-cols-3 gap-6 text-center mb-12">
          <div>
            <p class="text-4xl font-black" style="color:#6000BD">30</p>
            <p class="text-sm text-gray-500 mt-1">Tage gratis testen</p>
          </div>
          <div>
            <p class="text-4xl font-black" style="color:#6000BD">3h</p>
            <p class="text-sm text-gray-500 mt-1">Zeitersparnis pro Woche</p>
          </div>
          <div>
            <p class="text-4xl font-black" style="color:#6000BD">0</p>
            <p class="text-sm text-gray-500 mt-1">Kreditkarte für Trial nötig</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Feature Comparison ────────────────────────────────────────────────── -->
    <section class="px-6 pb-20">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl font-bold text-gray-900 text-center mb-10">Was ist in jedem Plan?</h2>
        <div class="rounded-3xl border border-purple-100 overflow-hidden shadow-sm">
          <table class="w-full text-sm">
            <thead>
              <tr style="background: linear-gradient(135deg, #F5F3FF, #EDE9FE)">
                <th class="text-left py-4 px-6 font-semibold text-gray-500 w-1/2">Feature</th>
                <th v-for="plan in plans" :key="plan.id"
                  class="text-center py-4 px-4 font-bold"
                  :style="plan.highlighted ? 'color:#6000BD' : 'color:#374151'">
                  {{ plan.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparisonRows" :key="row.label"
                :class="['transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-purple-50/30']">
                <td class="py-3.5 px-6 text-gray-700 font-medium">{{ row.label }}</td>
                <td v-for="plan in plans" :key="plan.id" class="text-center py-3.5 px-4">
                  <template v-if="typeof row.values[plan.id] === 'boolean'">
                    <span v-if="row.values[plan.id]"
                      class="inline-flex items-center justify-center w-6 h-6 rounded-full"
                      style="background:#F5F3FF">
                      <svg class="w-3.5 h-3.5" style="color:#6000BD" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </span>
                    <svg v-else class="w-4 h-4 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </template>
                  <span v-else class="font-semibold text-gray-700">{{ row.values[plan.id] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────────────────────── -->
    <footer class="border-t border-gray-100 py-8 px-6 text-center">
      <img src="/simy-logo.png" alt="Simy" class="h-7 mx-auto mb-4 opacity-40" />
      <p class="text-xs text-gray-400">
        Alle Preise in CHF exkl. MwSt. · Zahlungsabwicklung via Stripe · Jederzeit kündbar
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFetch, useHead } from '#imports'
import { PLANS } from '~/utils/planFeatures'
import { useTrialFeatures } from '~/composables/useTrialFeatures'
import type { PricingResponse } from '~/server/api/stripe/prices.get'


definePageMeta({ layout: 'minimal' })

const { getTrialStatus } = useTrialFeatures()
const trialStatus = computed(() => getTrialStatus())

const plans = PLANS
const selectedPlan = ref<string>('starter')
const addonSeats = ref(0)
const addonCourses = ref(false)
const addonAffiliate = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const { data: pricing, pending: pricesLoading } = await useFetch<PricingResponse>('/api/stripe/prices')

const planPriceAmount = (planId: string): number =>
  pricing.value?.plans?.[planId]?.unitAmount ?? 0

const addonPriceAmount = (addonKey: string): number =>
  pricing.value?.addons?.[addonKey]?.unitAmount ?? 0

const formatChf = (rappen: number): string => {
  if (rappen === 0) return 'CHF –'
  const amount = rappen / 100
  return `CHF ${Number.isInteger(amount) ? amount : amount.toFixed(2)}.–`
}

const selectedPlanDef = computed(() => plans.find(p => p.id === selectedPlan.value))
const planIncludesCourses = computed(() => ['professional', 'enterprise'].includes(selectedPlan.value))
const planIncludesAffiliate = computed(() => selectedPlan.value === 'enterprise')

const planPrice = computed(() => formatChf(planPriceAmount(selectedPlan.value)))

const totalPrice = computed(() => {
  let total = planPriceAmount(selectedPlan.value)
  if (selectedPlan.value !== 'enterprise') total += addonSeats.value * addonPriceAmount('seats')
  if (addonCourses.value && !planIncludesCourses.value) total += addonPriceAmount('courses')
  if (addonAffiliate.value && !planIncludesAffiliate.value) total += addonPriceAmount('affiliate')
  return formatChf(total)
})

watch(selectedPlan, () => {
  if (planIncludesCourses.value) addonCourses.value = false
  if (planIncludesAffiliate.value) addonAffiliate.value = false
  if (selectedPlan.value === 'enterprise') addonSeats.value = 0
})

const toggleCourses = () => { if (!planIncludesCourses.value) addonCourses.value = !addonCourses.value }
const toggleAffiliate = () => { if (!planIncludesAffiliate.value) addonAffiliate.value = !addonAffiliate.value }

const startCheckout = async () => {
  loading.value = true
  error.value = null
  try {
    const session = await $fetch<{ id: string; url: string }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: {
        plan: selectedPlan.value,
        addons: {
          seats: selectedPlan.value !== 'enterprise' ? addonSeats.value : 0,
          courses: addonCourses.value && !planIncludesCourses.value,
          affiliate: addonAffiliate.value && !planIncludesAffiliate.value,
        },
      },
    })
    if (session?.url) { window.location.href = session.url; return }
    throw new Error('Keine Checkout-URL erhalten')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Checkout konnte nicht gestartet werden.'
  } finally {
    loading.value = false
  }
}

const comparisonRows: { label: string; values: Record<string, string | boolean> }[] = [
  { label: 'Fahrlehrer inkl.', values: { starter: '1', professional: '5', enterprise: '∞' } },
  { label: 'Onlineterminbuchung', values: { starter: true, professional: true, enterprise: true } },
  { label: 'Kundenverwaltung', values: { starter: true, professional: true, enterprise: true } },
  { label: 'Rechnungen & Zahlungen', values: { starter: true, professional: true, enterprise: true } },
  { label: 'Auswertungen & Statistiken', values: { starter: true, professional: true, enterprise: true } },
  { label: 'Kursbuchungsseite', values: { starter: false, professional: true, enterprise: true } },
  { label: 'Prüfungsverwaltung', values: { starter: true, professional: true, enterprise: true } },
  { label: 'Affiliate-System', values: { starter: false, professional: false, enterprise: true } },
  { label: 'Kassenverwaltung', values: { starter: true, professional: false, enterprise: false } },
  { label: 'Gutscheine & Rabatte', values: { starter: true, professional: false, enterprise: false } },
  { label: 'Support', values: { starter: 'E-Mail', professional: 'Priorität', enterprise: 'Dediziert' } },
]

useHead({
  title: 'Plan wählen – Simy',
  meta: [
    { name: 'description', content: 'Starte deine Fahrschule mit Simy. 30 Tage kostenlos testen.' },
    { name: 'robots', content: 'noindex' },
  ],
})
</script>
