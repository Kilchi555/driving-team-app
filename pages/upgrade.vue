<template>
  <div class="min-h-screen bg-white font-sans" :style="brandCssVars">

    <!-- ── Nav ──────────────────────────────────────────────────────────────── -->
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b" style="border-color: rgba(var(--brand-rgb), 0.12)">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <img :src="logoPreview || '/simy-logo.png'" alt="Simy" class="h-8 max-w-[140px] object-contain" />
        <a href="/login"
          class="text-sm font-medium transition-colors hover:opacity-80"
          style="color: var(--brand-primary);">
          Einloggen →
        </a>
      </div>
    </nav>

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-20 pb-16 px-6">
      <!-- Background gradient blobs -->
      <div class="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
        style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      <div class="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-10"
        style="background: radial-gradient(circle, var(--brand-accent), transparent)"></div>

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
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
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
        <p class="text-xs font-bold uppercase tracking-widest text-center mb-8" style="color: var(--brand-primary); opacity: 0.6;">
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
                  : 'shadow-xl'
                : 'border-gray-100 bg-white shadow-sm hover:shadow-lg',
            ]"
            :style="selectedPlan === plan.id && plan.highlighted
              ? { background: `linear-gradient(145deg, var(--brand-primary), var(--brand-secondary))`, boxShadow: `0 25px 50px rgba(var(--brand-rgb), 0.35)`, borderColor: 'transparent' }
              : selectedPlan === plan.id
                ? { borderColor: primaryColor, background: `rgba(var(--brand-rgb), 0.05)` }
                : { borderColor: '' }"
          >
            <!-- Popular badge -->
            <div v-if="plan.highlighted"
              class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide"
              :style="selectedPlan === plan.id
                ? { background: `rgba(255,255,255,0.25)`, color: 'white' }
                : { background: `linear-gradient(135deg, var(--brand-primary), var(--brand-accent))`, color: 'white' }">
              ✦ Am Beliebtesten
            </div>

            <!-- Checkmark -->
            <div v-if="selectedPlan === plan.id"
              class="absolute top-5 right-5 w-6 h-6 rounded-full flex items-center justify-center"
              :style="plan.highlighted ? 'background: rgba(255,255,255,0.2)' : `background: var(--brand-primary)`">
              <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>

            <!-- Header -->
            <p :class="['text-xs font-bold uppercase tracking-widest mb-1',
              selectedPlan === plan.id && plan.highlighted ? 'text-white/70' : '']"
              :style="!(selectedPlan === plan.id && plan.highlighted) ? { color: primaryColor } : {}">
              {{ plan.name }}
            </p>
            <p :class="['text-sm mb-5',
              selectedPlan === plan.id && plan.highlighted ? 'text-white/60' : 'text-gray-400']">
              {{ plan.tagline }}
            </p>

            <!-- Price -->
            <div class="mb-6">
              <span :class="['text-4xl font-black',
                selectedPlan === plan.id && plan.highlighted ? 'text-white' : 'text-gray-900']">
                <span v-if="pricesLoading" class="inline-block w-20 h-10 rounded-lg animate-pulse"
                  :style="plan.highlighted ? 'background:rgba(255,255,255,0.15)' : 'background:#f3f4f6'"></span>
                <span v-else-if="!pricesAvailable" class="text-2xl text-gray-400">Auf Anfrage</span>
                <span v-else>{{ formatChf(planPriceAmount(plan.id)) }}</span>
              </span>
              <span v-if="pricesAvailable" :class="['text-sm ml-1',
                selectedPlan === plan.id && plan.highlighted ? 'text-white/60' : 'text-gray-400']">
                /Monat
              </span>
            </div>

            <!-- Features -->
            <ul class="space-y-2.5 flex-1 mb-6">
              <li v-for="feature in plan.features" :key="feature"
                class="flex items-start gap-2.5 text-sm">
                <svg class="w-4 h-4 mt-0.5 shrink-0 flex-none"
                  :style="selectedPlan === plan.id && plan.highlighted ? 'color: rgba(255,255,255,0.8)' : 'color: var(--brand-primary)'"
                  fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span :class="selectedPlan === plan.id && plan.highlighted ? 'text-white/90' : 'text-gray-600'">
                  {{ feature }}
                </span>
              </li>
            </ul>

            <!-- Seats badge -->
            <div class="text-xs font-medium rounded-xl px-3 py-2 text-center"
              :style="selectedPlan === plan.id && plan.highlighted
                ? 'background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.85);'
                : `background: rgba(var(--brand-rgb), 0.08); color: var(--brand-primary);`">
              {{ plan.includedSeats === null ? '∞ Fahrlehrer inkl.' : `${plan.includedSeats} Fahrlehrer inkl.` }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Add-ons ───────────────────────────────────────────────────────────── -->
    <section class="px-6 py-10">
      <div class="max-w-5xl mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-center mb-8" style="color: var(--brand-primary); opacity: 0.6;">
          2 — Add-ons (optional)
        </p>
        <div class="grid md:grid-cols-3 gap-4">

          <!-- Fahrlehrer Seats -->
          <div :class="['rounded-2xl border-2 p-5 transition-all bg-white',
            addonSeats > 0 ? 'shadow-lg' : 'border-gray-100 shadow-sm']"
            :style="addonSeats > 0 ? { borderColor: primaryColor, boxShadow: `0 10px 25px rgba(var(--brand-rgb), 0.12)` } : {}">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="font-bold text-gray-900 text-sm">Fahrlehrer Seat</p>
                <p class="text-xs text-gray-400 mt-0.5">Zusätzlicher Account</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg"
                style="background: rgba(var(--brand-rgb), 0.08); color: var(--brand-primary);">
                {{ pricesLoading ? '…' : pricesAvailable ? formatChf(addonPriceAmount('seats')) : '–' }}/Seat
              </span>
            </div>
            <div v-if="selectedPlan === 'enterprise'" class="text-xs text-gray-400 italic text-center py-2">
              Unbegrenzt im Enterprise inklusive
            </div>
            <div v-else class="flex items-center justify-center gap-4">
              <button @click="addonSeats = Math.max(0, addonSeats - 1)"
                class="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 font-bold transition-all text-lg hover:border-current"
                :style="{ '--hover-color': primaryColor }"
                @mouseenter="(e) => { (e.currentTarget as HTMLElement).style.borderColor = primaryColor; (e.currentTarget as HTMLElement).style.color = primaryColor }"
                @mouseleave="(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.color = '' }">−</button>
              <span class="text-2xl font-black w-8 text-center" style="color: var(--brand-primary)">{{ addonSeats }}</span>
              <button @click="addonSeats++"
                class="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold transition-all text-lg text-white"
                :style="{ background: primaryColor, borderColor: primaryColor }">+</button>
            </div>
          </div>

          <!-- Kursbuchungsseite -->
          <div @click="toggleCourses"
            :class="['rounded-2xl border-2 p-5 transition-all bg-white cursor-pointer',
              addonCourses ? 'shadow-lg'
              : planIncludesCourses ? 'border-gray-100 opacity-60'
              : 'border-gray-100 shadow-sm']"
            :style="addonCourses ? { borderColor: primaryColor, boxShadow: `0 10px 25px rgba(var(--brand-rgb), 0.12)` } : {}">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="font-bold text-gray-900 text-sm">Kursbuchungsseite</p>
                <p class="text-xs text-gray-400 mt-0.5">Online-Buchung für Schüler</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg"
                style="background: rgba(var(--brand-rgb), 0.08); color: var(--brand-primary);">
                {{ pricesLoading ? '…' : pricesAvailable ? formatChf(addonPriceAmount('courses')) : '–' }}/Mt.
              </span>
            </div>
            <div v-if="planIncludesCourses" class="text-xs text-center py-1 font-medium" style="color: var(--brand-primary)">
              ✓ Im {{ selectedPlanDef?.name }}-Plan inkl.
            </div>
            <div v-else class="flex items-center justify-center">
              <div class="flex items-center gap-2.5 text-sm font-medium"
                :class="addonCourses ? '' : 'text-gray-400'"
                :style="addonCourses ? { color: primaryColor } : {}">
                <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  :style="addonCourses ? `background: var(--brand-primary); border-color: var(--brand-primary)` : 'border-color:#D1D5DB'">
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
              addonAffiliate ? 'shadow-lg'
              : planIncludesAffiliate ? 'border-gray-100 opacity-60'
              : 'border-gray-100 shadow-sm']"
            :style="addonAffiliate ? { borderColor: primaryColor, boxShadow: `0 10px 25px rgba(var(--brand-rgb), 0.12)` } : {}">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="font-bold text-gray-900 text-sm">Affiliate-System</p>
                <p class="text-xs text-gray-400 mt-0.5">Empfehlungen & Partner</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg"
                style="background: rgba(var(--brand-rgb), 0.08); color: var(--brand-primary);">
                {{ pricesLoading ? '…' : pricesAvailable ? formatChf(addonPriceAmount('affiliate')) : '–' }}/Mt.
              </span>
            </div>
            <div v-if="planIncludesAffiliate" class="text-xs text-center py-1 font-medium" style="color: var(--brand-primary)">
              ✓ Im Enterprise-Plan inkl.
            </div>
            <div v-else class="flex items-center justify-center">
              <div class="flex items-center gap-2.5 text-sm font-medium"
                :class="addonAffiliate ? '' : 'text-gray-400'"
                :style="addonAffiliate ? { color: primaryColor } : {}">
                <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  :style="addonAffiliate ? `background: var(--brand-primary); border-color: var(--brand-primary)` : 'border-color:#D1D5DB'">
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
        <p class="text-xs font-bold uppercase tracking-widest text-center mb-6" style="color: var(--brand-primary); opacity: 0.6;">
          3 — Bestätigen
        </p>

        <div class="rounded-3xl border bg-white shadow-xl overflow-hidden" style="border-color: rgba(var(--brand-rgb), 0.15); box-shadow: 0 20px 40px rgba(var(--brand-rgb), 0.1)">
          <!-- Summary lines -->
          <div class="p-6 space-y-3 text-sm border-b border-gray-50">
            <div class="flex justify-between items-center">
              <span class="font-semibold text-gray-800">{{ selectedPlanDef?.name }}-Plan</span>
              <span class="font-bold text-gray-900">{{ pricesLoading ? '…' : pricesAvailable ? planPrice : '–' }}</span>
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
            style="background: linear-gradient(135deg, rgba(var(--brand-rgb), 0.06), rgba(var(--brand-rgb), 0.1))">
            <div>
              <p class="text-xs font-medium" style="color: var(--brand-primary); opacity: 0.7">Total pro Monat</p>
              <p class="text-2xl font-black" style="color: var(--brand-primary)">
                {{ pricesLoading ? '…' : pricesAvailable ? totalPrice : '–' }}
              </p>
            </div>
            <div class="text-right text-xs text-gray-400">
              <p>Monatlich kündbar</p>
              <p>1 Mt. Kündigungsfrist</p>
            </div>
          </div>

          <!-- Prices not available banner -->
          <div v-if="!pricesLoading && !pricesAvailable" class="px-6 py-3 text-xs text-center text-amber-700 bg-amber-50 border-t border-amber-100">
            ⚠️ Preise konnten nicht geladen werden. Bitte kontaktiere uns unter info@simy.ch.
          </div>

          <!-- CTA -->
          <div class="p-6">
            <button
              @click="startCheckout"
              :disabled="!!loading || !pricesAvailable"
              class="w-full py-4 px-6 rounded-2xl font-bold text-base text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              :style="{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))`, boxShadow: `0 8px 24px rgba(var(--brand-rgb), 0.35)` }"
              @mouseenter="(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px rgba(var(--brand-rgb), 0.45)` }"
              @mouseleave="(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(var(--brand-rgb), 0.35)` }"
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
            <p class="text-4xl font-black" style="color: var(--brand-primary)">30</p>
            <p class="text-sm text-gray-500 mt-1">Tage gratis testen</p>
          </div>
          <div>
            <p class="text-4xl font-black" style="color: var(--brand-primary)">3h</p>
            <p class="text-sm text-gray-500 mt-1">Zeitersparnis pro Woche</p>
          </div>
          <div>
            <p class="text-4xl font-black" style="color: var(--brand-primary)">0</p>
            <p class="text-sm text-gray-500 mt-1">Kreditkarte für Trial nötig</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Feature Comparison ────────────────────────────────────────────────── -->
    <section class="px-6 pb-20">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl font-bold text-gray-900 text-center mb-10">Was ist in jedem Plan?</h2>
        <div class="rounded-3xl border overflow-hidden shadow-sm" style="border-color: rgba(var(--brand-rgb), 0.12)">
          <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[500px]">
            <thead>
              <tr style="background: linear-gradient(135deg, rgba(var(--brand-rgb), 0.06), rgba(var(--brand-rgb), 0.10))">
                <th class="text-left py-4 px-6 font-semibold text-gray-500 w-1/2">Feature</th>
                <th v-for="plan in plans" :key="plan.id"
                  class="text-center py-4 px-4 font-bold"
                  :style="plan.highlighted ? 'color: var(--brand-primary)' : 'color:#374151'">
                  {{ plan.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparisonRows" :key="row.label"
                :class="['transition-colors', i % 2 === 0 ? 'bg-white' : '']"
                :style="i % 2 !== 0 ? { background: `rgba(var(--brand-rgb), 0.025)` } : {}">
                <td class="py-3.5 px-6 text-gray-700 font-medium">{{ row.label }}</td>
                <td v-for="plan in plans" :key="plan.id" class="text-center py-3.5 px-4">
                  <template v-if="typeof row.values[plan.id] === 'boolean'">
                    <span v-if="row.values[plan.id]"
                      class="inline-flex items-center justify-center w-6 h-6 rounded-full"
                      style="background: rgba(var(--brand-rgb), 0.08)">
                      <svg class="w-3.5 h-3.5" style="color: var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20">
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
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────────────────────── -->
    <footer class="border-t border-gray-100 py-8 px-6 text-center">
      <img :src="logoPreview || '/simy-logo.png'" alt="Simy" class="h-7 mx-auto mb-4 opacity-40" />
      <p class="text-xs text-gray-400 mb-4">
        Alle Preise in CHF exkl. MwSt. · Zahlungsabwicklung via Stripe · Jederzeit kündbar
      </p>
      <button
        @click="openBillingPortal"
        :disabled="portalLoading"
        class="inline-flex items-center gap-2 text-xs text-gray-500 transition-colors disabled:opacity-50 hover:opacity-80"
        :style="{ '--hover-color': primaryColor }"
        @mouseenter="(e) => (e.currentTarget as HTMLElement).style.color = primaryColor"
        @mouseleave="(e) => (e.currentTarget as HTMLElement).style.color = ''"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
        {{ portalLoading ? 'Öffne Portal…' : 'Zahlungsmethode / Rechnungen verwalten (Stripe Portal)' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLazyFetch, useHead, useRoute } from '#imports'
import { PLANS } from '~/utils/planFeatures'
import { useTrialFeatures } from '~/composables/useTrialFeatures'
import type { PricingResponse } from '~/server/api/stripe/prices.get'

definePageMeta({ layout: 'minimal' })

// ─── Branding ─────────────────────────────────────────────────────────────────
const DEFAULT_PRIMARY = '#6000BD'
const DEFAULT_SECONDARY = '#8B2FE8'
const DEFAULT_ACCENT = '#BEA3FF'

const primaryColor = ref(DEFAULT_PRIMARY)
const secondaryColor = ref(DEFAULT_SECONDARY)
const accentColor = ref(DEFAULT_ACCENT)
const logoPreview = ref<string | null>(null)

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

const brandCssVars = computed(() => {
  const rgb = hexToRgb(primaryColor.value)
  const rgb2 = hexToRgb(secondaryColor.value)
  return {
    '--brand-primary': primaryColor.value,
    '--brand-secondary': secondaryColor.value,
    '--brand-accent': accentColor.value,
    '--brand-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    '--brand-2-rgb': `${rgb2.r}, ${rgb2.g}, ${rgb2.b}`,
  }
})

const route = useRoute()

onMounted(() => {
  const q = route.query
  if (q.primary_color) primaryColor.value = decodeURIComponent(String(q.primary_color))
  if (q.secondary_color) secondaryColor.value = decodeURIComponent(String(q.secondary_color))
  if (q.accent_color) accentColor.value = decodeURIComponent(String(q.accent_color))
  const stored = sessionStorage.getItem('simy_preview_logo')
  if (stored) {
    logoPreview.value = stored
    sessionStorage.removeItem('simy_preview_logo')
  }
})

const { getTrialStatus } = useTrialFeatures()
const trialStatus = computed(() => getTrialStatus())

const plans = PLANS
const selectedPlan = ref<string>('starter')
const addonSeats = ref(0)
const addonCourses = ref(false)
const addonAffiliate = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const { data: pricing, pending: pricesLoading, error: pricesError } = useLazyFetch<PricingResponse>('/api/stripe/prices')

const pricesAvailable = computed(() =>
  !pricesError.value && !!pricing.value && Object.keys(pricing.value.plans ?? {}).length > 0
)

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
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const token = authSession?.access_token

    const session = await $fetch<{ id: string; url: string }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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

const portalLoading = ref(false)
const openBillingPortal = async () => {
  portalLoading.value = true
  error.value = null
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await $fetch<{ url: string }>('/api/stripe/customer-portal', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res?.url) window.location.href = res.url
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Billing-Portal konnte nicht geöffnet werden.'
  } finally {
    portalLoading.value = false
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
