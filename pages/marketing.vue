<template>
  <div v-if="isLoading" class="flex items-center justify-center min-h-[100svh]">
    <LoadingLogo size="2xl" />
  </div>

  <div v-else-if="currentUser" class="min-h-[100svh] bg-gray-50" style="padding-top: env(safe-area-inset-top, 0px)">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="navigateTo('/dashboard')" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Marketing Dashboard</h1>
            <p class="text-xs text-gray-500">drivingteam.ch – GA4, Google Ads, Search Console</p>
          </div>
        </div>
        <!-- Date range selector -->
        <div class="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            v-for="d in [7, 30, 90]"
            :key="d"
            @click="changeDays(d)"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            ]"
          >{{ d }}T</button>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">

      <!-- Weekly Review -->
      <div v-if="weeklyReview" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="font-bold text-gray-900">Wöchentliches Review</h2>
            <p class="text-xs text-gray-500 mt-0.5">KW {{ weeklyReview.week_number }} · {{ formatDate(weeklyReview.generated_at) }}</p>
          </div>
          <span class="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">Automatisch</span>
        </div>
        <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top 5 Massnahmen</p>
            <ol class="space-y-2">
              <li v-for="(action, i) in weeklyReview.top_actions" :key="i" class="flex gap-3 items-start">
                <span class="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white" :style="{ background: primaryColor }">{{ i + 1 }}</span>
                <span class="text-sm text-gray-700 leading-snug">{{ action }}</span>
              </li>
            </ol>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Low Hanging Fruits</p>
            <ul class="space-y-2">
              <li v-for="(fruit, i) in weeklyReview.low_hanging_fruits" :key="i" class="flex gap-3 items-start">
                <span class="shrink-0 w-2 h-2 rounded-full bg-amber-400 mt-2"></span>
                <span class="text-sm text-gray-700 leading-snug">{{ fruit }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div v-if="weeklyReview.summary" class="px-5 pb-4">
          <p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{{ weeklyReview.summary }}</p>
        </div>
      </div>

      <!-- No review yet -->
      <div v-else class="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        Kein wöchentliches Review vorhanden. Der Cron Job läuft jeden Montag und erstellt automatisch ein Review.
      </div>

      <!-- Quick Links -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          @click="navigateTo('/admin/google-business-profile')"
          class="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{ background: primaryColor + '15' }">
            <svg class="w-5 h-5" :style="{ color: primaryColor }" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 20.25a.75.75 0 00.75.75h4.5a.75.75 0 00.75-.75v-6.75H9v6.75zM12 2.25C8.27 2.25 5.25 5.27 5.25 9c0 2.39 1.19 4.5 3 5.79V15a.75.75 0 00.75.75h6a.75.75 0 00.75-.75v-.21c1.81-1.29 3-3.4 3-5.79 0-3.73-3.02-6.75-6.75-6.75z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">Google Business</p>
            <p class="text-xs text-gray-400">Bewertungen · Posts</p>
          </div>
        </button>
        <button
          @click="navigateTo('/admin/marketing/campaigns')"
          class="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{ background: primaryColor + '15' }">
            <svg class="w-5 h-5" :style="{ color: primaryColor }" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">Google Ads</p>
            <p class="text-xs text-gray-400">Kampagnen · Keywords</p>
          </div>
        </button>
        <button
          @click="navigateTo('/admin/marketing/leads')"
          class="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{ background: primaryColor + '15' }">
            <svg class="w-5 h-5" :style="{ color: primaryColor }" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">Leads</p>
            <p class="text-xs text-gray-400">Anfragen · Pipeline</p>
          </div>
        </button>
        <button
          @click="navigateTo('/admin/marketing/ai')"
          class="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{ background: primaryColor + '15' }">
            <svg class="w-5 h-5" :style="{ color: primaryColor }" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">AI Content</p>
            <p class="text-xs text-gray-400">Posts · Texte</p>
          </div>
        </button>
      </div>

      <!-- KPI Cards -->
      <div v-if="data" class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Sessions</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ totalSessions.toLocaleString('de-CH') }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ days }} Tage</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Marketing-Conversions</p>
          <p class="text-2xl font-bold mt-1" :style="{ color: primaryColor }">{{ marketingConversions }}</p>
          <p class="text-xs text-gray-400 mt-0.5">CVR {{ marketingCvrFormatted }}% (exkl. Unassigned)</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Ads Spend</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">CHF {{ data.summary.googleSpend.toFixed(0) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ data.summary.totalAdClicks }} Klicks</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Buchungs-Rate</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ data.summary.bookingCompletionRate }}%</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ data.summary.completedBookings }} abgeschl.</p>
        </div>
      </div>

      <!-- Traffic by Channel + Conversion Funnel -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Channel Breakdown -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h3 class="font-semibold text-gray-800 mb-4 text-sm">Traffic nach Kanal</h3>
          <div class="space-y-3">
            <div v-for="ch in channelStats" :key="ch.channel" class="flex items-center gap-3">
              <div class="w-24 text-xs truncate shrink-0" :class="ch.isMarketing ? 'text-gray-600' : 'text-gray-400'">
                {{ ch.channel.replace('Organic ', '').replace('Paid ', 'Paid ') }}
              </div>
              <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all" :style="{ width: ch.pct + '%', background: ch.isMarketing ? primaryColor : '#d1d5db' }"></div>
              </div>
              <div class="text-xs font-semibold w-10 text-right" :class="ch.isMarketing ? 'text-gray-700' : 'text-gray-400'">{{ ch.sessions }}</div>
              <div class="text-xs w-12 text-right" :class="ch.isMarketing ? 'text-gray-500' : 'text-gray-300'">{{ ch.cvr }}%</div>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <div class="w-2 h-2 rounded-full shrink-0" :style="{ background: primaryColor }"></div>
            <p class="text-xs text-gray-400">Marketing-Kanäle · grau = bestehende Schüler / nicht zuordenbar</p>
          </div>
        </div>

        <!-- Booking Funnel -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h3 class="font-semibold text-gray-800 mb-4 text-sm">Buchungs-Funnel</h3>
          <div v-if="data" class="space-y-3">
            <div v-for="step in funnelSteps" :key="step.label" class="flex items-center gap-3">
              <div class="w-36 text-xs text-gray-600 shrink-0">{{ step.label }}</div>
              <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full" :style="{ width: step.pct + '%', background: step.color }"></div>
              </div>
              <div class="text-xs font-semibold text-gray-700 w-10 text-right">{{ step.value }}</div>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-4">Website → Buchungsapp → Abschluss</p>
        </div>
      </div>

      <!-- SEO Opportunities -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">SEO-Chancen: Keywords auf Position 4–15</h3>
          <p class="text-xs text-gray-500 mt-0.5">Diese Keywords stehen fast auf Seite 1. Mit kleinem Aufwand sind Top-3-Platzierungen möglich.</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="kw in seoOpportunities" :key="kw.query" class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ kw.query }}</p>
              <p class="text-xs text-gray-400 truncate">{{ kw.page }}</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ Number(kw.avg_pos).toFixed(1) }}</p>
              <p class="text-xs text-gray-400">Pos.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ kw.impressions }}</p>
              <p class="text-xs text-gray-400">Impr.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ kw.clicks }}</p>
              <p class="text-xs text-gray-400">Klicks</p>
            </div>
            <div class="shrink-0">
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full"
                :class="Number(kw.avg_pos) <= 8 ? 'bg-green-100 text-green-700' : Number(kw.avg_pos) <= 12 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'"
              >{{ Number(kw.avg_pos) <= 8 ? 'Hoch' : Number(kw.avg_pos) <= 12 ? 'Mittel' : 'Niedrig' }}</span>
            </div>
          </div>
          <div v-if="seoOpportunities.length === 0" class="px-5 py-6 text-center text-sm text-gray-400">Keine Daten — Cron Job noch nicht ausgeführt</div>
        </div>
      </div>

      <!-- Google Ads Campaigns -->
      <div v-if="data && data.googleAds.length > 0" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">Google Ads Kampagnen</h3>
          <p class="text-xs text-gray-500 mt-0.5">Letzte {{ days }} Tage</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="camp in adsCampaigns" :key="camp.name" class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ camp.name }}</p>
            </div>
            <div class="text-center shrink-0 w-16">
              <p class="text-sm font-bold text-gray-700">CHF {{ camp.spend.toFixed(0) }}</p>
              <p class="text-xs text-gray-400">Spend</p>
            </div>
            <div class="text-center shrink-0 w-12">
              <p class="text-sm font-bold text-gray-700">{{ camp.clicks }}</p>
              <p class="text-xs text-gray-400">Klicks</p>
            </div>
            <div class="text-center shrink-0 w-16">
              <p class="text-sm font-bold text-gray-700">{{ camp.clicks > 0 ? 'CHF ' + (camp.spend / camp.clicks).toFixed(2) : '—' }}</p>
              <p class="text-xs text-gray-400">CPC</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Booking Attribution -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">Buchungs-Attribution: Woher kamen echte Buchungen?</h3>
          <p class="text-xs text-gray-500 mt-0.5">Verknüpft Website-Klicks (booking_redirects) mit Buchungsabschlüssen (booking_events) · letzte {{ days }} Tage</p>
        </div>

        <!-- Sources Summary -->
        <div v-if="attribution" class="px-5 pt-4 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900">{{ attribution.funnel.totalClicks }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Buchungs-Klicks</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900">{{ attribution.funnel.totalOpened }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Buchungsseite geöffnet</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-amber-500">{{ attribution.funnel.totalAbandoned }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Abgebrochen</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold" :style="{ color: primaryColor }">{{ attribution.funnel.totalCompleted }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Buchungen abgeschlossen</p>
          </div>
        </div>

        <!-- Source breakdown bar -->
        <div v-if="attribution?.sourcesSummary?.length" class="px-5 py-3 space-y-2 border-t border-gray-50">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nach Quelle</p>
          <div v-for="src in attribution.sourcesSummary" :key="src.label" class="flex items-center gap-3">
            <div class="w-36 text-xs text-gray-600 truncate shrink-0">{{ src.label }}</div>
            <div class="flex-1 bg-gray-100 rounded-full h-2">
              <div class="h-2 rounded-full" :style="{ width: Math.round((src.clicks / attribution.funnel.totalClicks) * 100) + '%', background: src.label.includes('cpc') || src.label.includes('CPC') ? '#f59e0b' : primaryColor }"></div>
            </div>
            <div class="text-xs text-gray-600 w-10 text-right">{{ src.clicks }}</div>
            <div class="text-xs font-bold w-16 text-right" :style="{ color: src.completed > 0 ? primaryColor : '#9ca3af' }">
              {{ src.completed > 0 ? src.completed + ' gebucht' : '—' }}
            </div>
          </div>
        </div>

        <!-- Detail table: per page -->
        <div class="border-t border-gray-100">
          <p class="px-5 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail pro Seite</p>
          <div class="divide-y divide-gray-50 overflow-x-auto">
            <div v-for="row in attribution?.bySourceAndPage?.slice(0, 15)" :key="row.source + row.page" class="px-5 py-3 hover:bg-gray-50">
              <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-semibold px-1.5 py-0.5 rounded" :class="row.medium === 'cpc' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'">
                      {{ row.medium === 'cpc' ? 'Google Ads' : row.source === 'organic/direct' ? 'Organisch' : row.source }}
                    </span>
                    <span v-if="row.campaign" class="text-xs text-gray-400">{{ row.campaign }}</span>
                  </div>
                  <p class="text-sm font-medium text-gray-800 mt-1 truncate">{{ row.page }}</p>
                  <p v-if="row.topKeywords?.length" class="text-xs text-gray-400 mt-0.5">
                    Keywords: {{ row.topKeywords.join(', ') }}
                  </p>
                </div>
                <div class="shrink-0 flex gap-4 text-center">
                  <div>
                    <p class="text-sm font-semibold text-gray-700">{{ row.clicks }}</p>
                    <p class="text-xs text-gray-400">Klicks</p>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-amber-500">{{ row.abandoned }}</p>
                    <p class="text-xs text-gray-400">Abbruch</p>
                  </div>
                  <div>
                    <p class="text-sm font-bold" :style="{ color: row.completed > 0 ? primaryColor : '#d1d5db' }">{{ row.completed }}</p>
                    <p class="text-xs text-gray-400">Gebucht</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!attribution || attribution.bySourceAndPage.length === 0" class="px-5 py-6 text-center text-sm text-gray-400">
              Keine Daten
            </div>
          </div>
        </div>

        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p class="text-xs text-gray-400">{{ attribution?.note }}</p>
        </div>
      </div>

      <!-- LTV nach Akquisitionskanal -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">Umsatz nach Akquisitionskanal (LTV)</h3>
          <p class="text-xs text-gray-500 mt-0.5">Welcher Kanal hat wieviel Umsatz gebracht · basiert auf der Herkunft des Kunden bei seiner ersten Buchung</p>
        </div>

        <!-- Summary -->
        <div v-if="ltv" class="px-5 pt-4 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900">{{ ltv.summary.total_attributed_customers }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Attributierte Kunden</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold" :style="{ color: primaryColor }">CHF {{ ltv.summary.total_revenue_chf.toFixed(0) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Gesamtumsatz</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-amber-500">CHF {{ ltv.summary.ads_revenue_chf.toFixed(0) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">via Google Ads</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-500">CHF {{ ltv.summary.organic_revenue_chf.toFixed(0) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">via Organisch</p>
          </div>
        </div>

        <!-- Kanal-Tabelle -->
        <div v-if="ltv?.byChannel?.length" class="border-t border-gray-50">
          <div class="px-5 py-3 grid grid-cols-5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
            <div class="col-span-2">Kanal</div>
            <div class="text-right">Kunden</div>
            <div class="text-right">Ø LTV</div>
            <div class="text-right">Umsatz</div>
          </div>
          <div v-for="ch in ltv.byChannel" :key="ch.label" class="px-5 py-3 hover:bg-gray-50 grid grid-cols-5 items-center border-b border-gray-50 last:border-0">
            <div class="col-span-2 flex items-center gap-2">
              <span class="text-xs font-semibold px-1.5 py-0.5 rounded"
                :class="ch.is_ads ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'">
                {{ ch.is_ads ? 'Ads' : 'Organisch' }}
              </span>
              <span class="text-sm text-gray-700 truncate">{{ ch.label }}</span>
            </div>
            <div class="text-right text-sm font-medium text-gray-700">{{ ch.customers }}</div>
            <div class="text-right text-sm text-gray-500">CHF {{ ch.avg_ltv_chf.toFixed(0) }}</div>
            <div class="text-right text-sm font-bold" :style="{ color: ch.total_revenue_chf > 0 ? primaryColor : '#9ca3af' }">
              CHF {{ ch.total_revenue_chf.toFixed(0) }}
            </div>
          </div>
        </div>

        <!-- User-Liste -->
        <div v-if="ltv?.users?.length" class="border-t border-gray-100">
          <p class="px-5 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Einzelne Kunden</p>
          <div class="divide-y divide-gray-50">
            <div v-for="u in ltv.users" :key="u.user_id" class="px-5 py-3 hover:bg-gray-50 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800">{{ u.name }}</p>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span class="text-xs px-1.5 py-0.5 rounded font-semibold"
                    :class="u.is_ads ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'">
                    {{ u.is_ads ? 'Google Ads' : 'Organisch' }}
                  </span>
                  <span v-if="u.acquisition_campaign" class="text-xs text-gray-400">{{ u.acquisition_campaign }}</span>
                  <span v-if="u.acquisition_referrer_page" class="text-xs text-gray-400">{{ u.acquisition_referrer_page }}</span>
                </div>
              </div>
              <div class="shrink-0 flex gap-4 text-center">
                <div>
                  <p class="text-sm font-semibold text-gray-700">{{ u.total_appointments }}</p>
                  <p class="text-xs text-gray-400">Termine</p>
                </div>
                <div>
                  <p class="text-sm font-bold" :style="{ color: u.total_revenue_chf > 0 ? primaryColor : '#d1d5db' }">
                    CHF {{ u.total_revenue_chf.toFixed(0) }}
                  </p>
                  <p class="text-xs text-gray-400">Umsatz</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!ltv || (!ltv.byChannel?.length && !ltv.users?.length)" class="px-5 py-8 text-center text-sm text-gray-400">
          Noch keine Daten · Attribution wird ab jetzt bei jeder Neukunden-Buchung gespeichert
        </div>

        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p class="text-xs text-gray-400">{{ ltv?.note }}</p>
        </div>
      </div>

      <!-- Google Ads Keywords -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">Google Ads: Spend nach Conversion-Typ</h3>
          <p class="text-xs text-gray-500 mt-0.5">Welches Keyword hat wieviel Spend generiert und zu welcher Conversion geführt · letzte {{ days }} Tage</p>
        </div>

        <!-- Campaign summary -->
        <div v-if="adsKeywords?.summary" class="px-5 pt-4 pb-3 grid grid-cols-2 md:grid-cols-5 gap-3 border-b border-gray-50">
          <div class="text-center">
            <p class="text-xl font-bold text-gray-900">CHF {{ adsKeywords.summary.total_cost_chf?.toFixed(0) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Gesamtspend</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-bold" :style="{ color: primaryColor }">{{ adsKeywords.summary.total_online_bookings }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Online-Buchungen</p>
            <p class="text-xs text-gray-300">CHF {{ adsKeywords.summary.cost_per_booking_chf?.toFixed(0) }}/Buch.</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-bold text-blue-500">{{ adsKeywords.summary.total_phone_clicks }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Anruf-Klicks</p>
            <p class="text-xs text-gray-300" v-if="adsKeywords.summary.total_phone_clicks > 0">
              CHF {{ (adsKeywords.summary.total_cost_chf / adsKeywords.summary.total_phone_clicks).toFixed(0) }}/Anruf
            </p>
          </div>
          <div class="text-center">
            <p class="text-xl font-bold text-purple-500">{{ adsKeywords.summary.total_form_submissions }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Kontaktformulare</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-bold text-green-500">CHF {{ adsKeywords.summary.total_revenue_chf?.toFixed(0) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Gemessener Umsatz</p>
            <p class="text-xs text-gray-300">(nur Online-Buchungen)</p>
          </div>
        </div>

        <!-- Keyword table -->
        <div v-if="adsKeywords?.keywords?.length">
          <div class="px-5 py-2 grid grid-cols-8 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
            <div class="col-span-2">Keyword</div>
            <div class="text-right">Spend</div>
            <div class="text-right">CPC</div>
            <div class="text-right" title="Online-Buchungen">📅 Buch.</div>
            <div class="text-right" title="Anruf-Klicks">📞 Anrufe</div>
            <div class="text-right" title="Kontaktformulare">✉️ Form.</div>
            <div class="text-right">Umsatz</div>
          </div>
          <div
            v-for="kw in adsKeywords.keywords.slice(0, 20)"
            :key="kw.keyword + kw.campaign"
            class="px-5 py-3 hover:bg-gray-50 grid grid-cols-8 items-center border-b border-gray-50 last:border-0"
          >
            <div class="col-span-2">
              <p class="text-sm font-medium text-gray-800 truncate">{{ kw.keyword }}</p>
              <p class="text-xs text-gray-400 truncate">{{ kw.campaign }}</p>
            </div>
            <div class="text-right text-sm text-gray-700">CHF {{ kw.cost_chf?.toFixed(0) }}</div>
            <div class="text-right text-xs text-gray-400">{{ kw.cpc_chf?.toFixed(2) }}</div>
            <div class="text-right">
              <span class="text-sm font-semibold" :style="{ color: kw.online_bookings > 0 ? primaryColor : '#d1d5db' }">{{ kw.online_bookings || '—' }}</span>
            </div>
            <div class="text-right">
              <span class="text-sm font-semibold" :class="kw.phone_clicks > 0 ? 'text-blue-500' : 'text-gray-200'">{{ kw.phone_clicks || '—' }}</span>
            </div>
            <div class="text-right">
              <span class="text-sm font-semibold" :class="kw.form_submissions > 0 ? 'text-purple-500' : 'text-gray-200'">{{ kw.form_submissions || '—' }}</span>
            </div>
            <div class="text-right text-sm font-bold" :style="{ color: kw.revenue_chf > 0 ? '#10b981' : '#d1d5db' }">
              {{ kw.revenue_chf > 0 ? 'CHF ' + kw.revenue_chf.toFixed(0) : '—' }}
            </div>
          </div>
        </div>

        <div v-else class="px-5 py-6 text-center">
          <p class="text-sm text-gray-400">Noch keine Keyword-Daten · Cron läuft täglich 04:30</p>
        </div>

        <div class="px-5 py-3 bg-amber-50 border-t border-amber-100 space-y-1">
          <p class="text-xs text-amber-800 font-semibold">Einmaliger Setup für Keyword-Tracking:</p>
          <p class="text-xs text-amber-700">In Google Ads → Kampagnen → Einstellungen → "Finale URL-Suffix":</p>
          <code class="block text-xs bg-amber-100 px-2 py-1 rounded text-amber-900 break-all">utm_source=google&amp;utm_medium=cpc&amp;utm_campaign={campaignname}&amp;utm_term={keyword}</code>
        </div>
      </div>

      <!-- CTR Bugs: Top Ranks, 0 Clicks -->
      <div v-if="ctrBugs.length > 0" class="bg-white rounded-xl border border-amber-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-amber-100 bg-amber-50">
          <h3 class="font-semibold text-amber-800">CTR-Bugs: Gute Position, kaum Klicks</h3>
          <p class="text-xs text-amber-600 mt-0.5">Diese Seiten ranken auf Seite 1 aber werden nicht geklickt — Title oder Meta-Description optimieren</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="bug in ctrBugs" :key="bug.query + bug.page" class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ bug.query }}</p>
              <p class="text-xs text-gray-400 truncate">{{ bug.page }}</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-amber-600">{{ Number(bug.avg_pos).toFixed(1) }}</p>
              <p class="text-xs text-gray-400">Pos.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ bug.impressions }}</p>
              <p class="text-xs text-gray-400">Impr.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-red-500">{{ bug.clicks }}</p>
              <p class="text-xs text-gray-400">Klicks</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useTenantBranding } from '~/composables/useTenantBranding'
import LoadingLogo from '~/components/LoadingLogo.vue'

definePageMeta({ middleware: 'auth' })

const { primaryColor } = useTenantBranding()
const { currentUser, isLoading, fetchCurrentUser } = useCurrentUser()

const days = ref(30)
const data = ref<any>(null)
const weeklyReview = ref<any>(null)
const seoOpportunities = ref<any[]>([])
const ctrBugs = ref<any[]>([])
const attribution = ref<any>(null)
const ltv = ref<any>(null)
const adsKeywords = ref<any>(null)
const fetchingData = ref(false)

onMounted(async () => {
  await fetchCurrentUser()
  if (currentUser.value) {
    await Promise.all([fetchMarketingData(), fetchWeeklyReview(), fetchSeoData(), fetchAttribution(), fetchLtv(), fetchAdsKeywords()])
  }
})

async function changeDays(d: number) {
  days.value = d
  await Promise.all([fetchMarketingData(), fetchAttribution(), fetchAdsKeywords()])
}

async function fetchMarketingData() {
  fetchingData.value = true
  try {
    data.value = await $fetch(`/api/admin/marketing-analytics?days=${days.value}`)
  } catch (e) {
    console.error('marketing fetch failed', e)
  } finally {
    fetchingData.value = false
  }
}

async function fetchWeeklyReview() {
  try {
    weeklyReview.value = await $fetch('/api/admin/marketing-weekly-review')
  } catch { /* no review yet */ }
}

async function fetchAttribution() {
  try {
    attribution.value = await $fetch(`/api/admin/marketing-attribution?days=${days.value}`)
  } catch (e) { console.error('attribution fetch failed', e) }
}

async function fetchLtv() {
  try {
    ltv.value = await $fetch('/api/admin/marketing-ltv')
  } catch (e) { console.error('ltv fetch failed', e) }
}

async function fetchAdsKeywords() {
  try {
    adsKeywords.value = await $fetch(`/api/admin/marketing-ads-keywords?days=${days.value}`)
  } catch (e) { console.error('ads keywords fetch failed', e) }
}

async function fetchSeoData() {
  try {
    const res = await $fetch<any>('/api/admin/marketing-seo-opportunities')
    seoOpportunities.value = res.opportunities ?? []
    ctrBugs.value = res.ctrBugs ?? []
  } catch { /* no data */ }
}

// ── Computed ─────────────────────────────────────────────────────────────────

const totalSessions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4.reduce((sum: number, r: any) => sum + (r.sessions ?? 0), 0)
})

const MARKETING_CHANNELS = ['Organic Search', 'Paid Search', 'Referral', 'Organic Social', 'Email', 'Affiliates']

const totalConversions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4.reduce((sum: number, r: any) => sum + (r.conversions ?? 0), 0)
})

// Marketing-only: exclude Unassigned (existing students via app) and Direct (ambiguous)
const marketingConversions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4
    .filter((r: any) => MARKETING_CHANNELS.includes(r.channel))
    .reduce((sum: number, r: any) => sum + (r.conversions ?? 0), 0)
})

const marketingSessions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4
    .filter((r: any) => MARKETING_CHANNELS.includes(r.channel))
    .reduce((sum: number, r: any) => sum + (r.sessions ?? 0), 0)
})

const cvrFormatted = computed(() => {
  if (!totalSessions.value) return '0'
  return ((totalConversions.value / totalSessions.value) * 100).toFixed(1)
})

const marketingCvrFormatted = computed(() => {
  if (!marketingSessions.value) return '0'
  return ((marketingConversions.value / marketingSessions.value) * 100).toFixed(1)
})

const channelStats = computed(() => {
  if (!data.value?.ga4) return []
  const map = new Map<string, { sessions: number; conversions: number }>()
  for (const r of data.value.ga4) {
    const ch = r.channel ?? 'Unbekannt'
    const existing = map.get(ch) ?? { sessions: 0, conversions: 0 }
    map.set(ch, { sessions: existing.sessions + (r.sessions ?? 0), conversions: existing.conversions + (r.conversions ?? 0) })
  }
  const total = [...map.values()].reduce((s, v) => s + v.sessions, 0) || 1
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      sessions: v.sessions,
      conversions: v.conversions,
      cvr: v.sessions > 0 ? ((v.conversions / v.sessions) * 100).toFixed(1) : '0',
      pct: Math.round((v.sessions / total) * 100),
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 7)
    .map(ch => ({
      ...ch,
      isMarketing: MARKETING_CHANNELS.includes(ch.channel),
    }))
})

const adsCampaigns = computed(() => {
  if (!data.value?.googleAds) return []
  const map = new Map<string, { spend: number; clicks: number }>()
  for (const r of data.value.googleAds) {
    const name = r.campaign_name ?? 'Unbekannt'
    const existing = map.get(name) ?? { spend: 0, clicks: 0 }
    map.set(name, {
      spend: existing.spend + (r.cost_micros ?? 0) / 1_000_000,
      clicks: existing.clicks + (r.clicks ?? 0),
    })
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.spend - a.spend)
})

const funnelSteps = computed(() => {
  if (!data.value) return []
  const f = data.value.bookingFunnel
  const max = Math.max(f.websiteClicks, 1)
  return [
    { label: 'Website-Klicks', value: f.websiteClicks, pct: 100, color: primaryColor.value },
    { label: 'Buchungsapp geöffnet', value: f.bookingPageViews, pct: Math.round((f.bookingPageViews / max) * 100), color: '#f59e0b' },
    { label: 'Buchung abgeschlossen', value: f.completions, pct: Math.round((f.completions / max) * 100), color: '#10b981' },
  ]
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>
