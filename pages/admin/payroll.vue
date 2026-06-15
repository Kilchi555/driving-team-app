<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Lohnbuchhaltung</h1>
        <p class="text-sm text-gray-500 mt-0.5">Mitarbeiter, Lohnabrechnungen & Rentabilität</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="selectedYear" @change="loadAll"
          class="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- ═══ EINZELFIRMA HINWEIS ═══ -->
    <div v-if="isEinzelfirma" class="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <div class="flex-1 text-sm text-amber-800">
          <p class="font-semibold">Einzelfirma: Inhaber ist kein Arbeitnehmer</p>
          <p class="text-xs text-amber-700 mt-0.5">
            Deine Entnahmen = Privatentnahmen (kein Lohnaufwand). AHV zahlst du als Selbständiger (10% auf Reingewinn). Angestellte Mitarbeiter normal abrechnen.
          </p>
        </div>
        <NuxtLink to="/admin/profile?tab=legal" class="text-xs text-amber-700 underline whitespace-nowrap">Rechtsform →</NuxtLink>
      </div>

      <!-- Selbständigen-AHV Rechner -->
      <div class="bg-white rounded-xl border border-amber-100 p-4">
        <p class="text-xs font-semibold text-amber-800 mb-3">Selbständigen-AHV Rechner (dein Jahresgewinn → AHV-Beitrag)</p>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="relative">
            <span class="absolute left-3 top-2 text-xs text-gray-400">CHF</span>
            <input v-model.number="selfAhvGrossChf" type="number" step="1000" min="0" placeholder="80000"
              class="border border-gray-200 rounded-xl pl-12 pr-4 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-amber-400"/>
            <span class="absolute right-3 top-2 text-xs text-gray-400">/Jahr</span>
          </div>
          <template v-if="selfAhvResult">
            <div class="flex items-center gap-4 text-xs flex-wrap">
              <span class="text-gray-500">Rate: <strong>{{ selfAhvResult.rate }}%</strong></span>
              <span class="text-gray-500">AHV 8.1%: <strong class="text-red-600">CHF {{ (selfAhvResult.ahv / 100).toLocaleString('de-CH') }}</strong></span>
              <span class="text-gray-500">IV 1.4%: <strong class="text-red-600">CHF {{ (selfAhvResult.iv / 100).toLocaleString('de-CH') }}</strong></span>
              <span class="text-gray-500">EO 0.5%: <strong class="text-red-600">CHF {{ (selfAhvResult.eo / 100).toLocaleString('de-CH') }}</strong></span>
              <span class="font-bold text-amber-800 border-l border-amber-200 pl-4">
                Total: CHF {{ (selfAhvResult.totalRappen / 100).toLocaleString('de-CH') }}/Jahr
                = CHF {{ (selfAhvResult.monthlyRappen / 100).toLocaleString('de-CH') }}/Mt.
              </span>
            </div>
          </template>
          <span v-else class="text-xs text-gray-400">Jahresgewinn eingeben</span>
        </div>
        <p class="text-xs text-gray-400 mt-2">Sinkende Skala unter CHF 58\'800 Einkommen (5.371%–10%). Genauer Beitrag wird von der Ausgleichskasse auf Basis der Steuererklärung berechnet.</p>
      </div>
    </div>

    <!-- ═══ GMBH/AG HINWEIS (einmalig) ═══ -->
    <div v-else-if="legalInfo && (legalInfo.legal_form === 'gmbh' || legalInfo.legal_form === 'ag')"
      class="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
      <span class="font-semibold">{{ legalInfo.legal_form === 'gmbh' ? 'GmbH' : 'AG' }}: </span>
      Als Geschäftsführer/Inhaber bist du angestellt — erfasse dich als Mitarbeiter im Tab "Mitarbeiter" mit marktkonformem Lohn.
      Dividenden aus dem Jahresgewinn sind nicht AHV-pflichtig.
      BVG obligatorisch ab Jahreslohn CHF 22\'680.
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      <button v-for="tab in tabs" :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-all"
        :class="activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
        {{ tab.label }}
        <span v-if="tab.id === 'employees' && employees.length > 0"
          class="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
          {{ employees.length }}
        </span>
      </button>
    </div>

    <!-- ═══ TAB: MITARBEITER ═══ -->
    <div v-if="activeTab === 'employees'" class="space-y-4">
      <div class="flex justify-end">
        <button @click="openEmployeeModal(null)"
          class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Mitarbeiter hinzufügen
        </button>
      </div>

      <div v-if="employees.length === 0" class="text-center py-16 text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <p class="font-medium">Noch keine Mitarbeiter erfasst</p>
        <p class="text-sm mt-1">Füge deinen ersten Mitarbeiter hinzu</p>
      </div>

      <div v-else class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th class="px-5 py-3 text-left">Name</th>
              <th class="px-5 py-3 text-left">Anstellung</th>
              <th class="px-5 py-3 text-right">Bruttolohn</th>
              <th class="px-5 py-3 text-right">Arbeitgeberkosten/Mt.</th>
              <th class="px-5 py-3 text-left">Seit</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="emp in employees" :key="emp.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-5 py-4">
                <div class="font-medium text-gray-900">{{ emp.first_name }} {{ emp.last_name }}</div>
                <div v-if="emp.email" class="text-xs text-gray-400 mt-0.5">{{ emp.email }}</div>
              </td>
              <td class="px-5 py-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="emp.employment_type === 'monthly' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'">
                  {{ emp.employment_type === 'monthly' ? 'Monatslohn' : 'Stundenlohn' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right font-medium text-gray-900">
                {{ chf(emp.gross_salary_rappen) }}
                <span v-if="emp.employment_type === 'hourly'" class="text-xs text-gray-400 font-normal">/h</span>
              </td>
              <td class="px-5 py-4 text-right text-sm text-gray-600">
                {{ chf(employerCost(emp)) }}
              </td>
              <td class="px-5 py-4 text-sm text-gray-500">
                {{ fmtDate(emp.start_date) }}
              </td>
              <td class="px-5 py-4 text-right">
                <button @click="openEmployeeModal(emp)"
                  class="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline">
                  Bearbeiten
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t border-gray-100 bg-gray-50">
            <tr>
              <td class="px-5 py-3 text-sm font-semibold text-gray-700" colspan="3">
                Total monatliche Lohnkosten
              </td>
              <td class="px-5 py-3 text-right font-bold text-gray-900">
                {{ chf(employees.reduce((s, e) => s + employerCost(e), 0)) }}
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ═══ TAB: LOHNABRECHNUNGEN ═══ -->
    <div v-if="activeTab === 'runs'" class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-600 font-medium">Monat:</label>
          <select v-model="selectedMonth"
            class="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option v-for="(m, i) in monthNames" :key="i+1" :value="i+1">{{ m }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <!-- Copy from previous month -->
          <button @click="copyFromLastMonth"
            :disabled="copying || calculating"
            :title="prevMonthLabel"
            class="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-xl transition-colors shadow-sm border border-gray-200">
            <svg v-if="copying" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            {{ copying ? 'Kopiere…' : `Vormonat kopieren` }}
          </button>

          <!-- Calculate current month -->
          <button @click="calculateMonth"
            :disabled="calculating || copying"
            class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            <svg v-if="calculating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            {{ calculating ? 'Berechnung läuft…' : `Abrechnung berechnen` }}
          </button>
        </div>
      </div>

      <!-- Month runs -->
      <div v-if="monthRuns.length > 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-700">
            {{ monthNames[selectedMonth - 1] }} {{ selectedYear }}
          </span>
          <span class="text-xs text-gray-500">{{ monthRuns.length }} Mitarbeiter</span>
        </div>
        <table class="w-full">
          <thead>
            <tr class="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th class="px-5 py-3 text-left">Mitarbeiter</th>
              <th class="px-5 py-3 text-right">Brutto</th>
              <th class="px-5 py-3 text-right">Abzüge Mitarbeiter</th>
              <th class="px-5 py-3 text-right">Netto / Auszahlung</th>
              <th class="px-5 py-3 text-right">Beiträge Firma</th>
              <th class="px-5 py-3 text-right">Gesamtkosten</th>
              <th class="px-5 py-3 text-center">Status</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="run in monthRuns" :key="run.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-5 py-4 font-medium text-gray-900">
                {{ run.employee?.first_name }} {{ run.employee?.last_name }}
              </td>
              <td class="px-5 py-4 text-right text-gray-700">{{ chf(run.gross_rappen) }}</td>
              <td class="px-5 py-4 text-right text-red-600 text-sm">
                -{{ chf(run.ahv_employee_rappen + run.alv_employee_rappen + run.nbu_employee_rappen) }}
              </td>
              <td class="px-5 py-4 text-right font-semibold text-emerald-700">
                <div>{{ chf((run as any).total_payout_rappen ?? run.net_rappen) }}</div>
                <div v-if="((run as any).monthly_spesen_rappen > 0 || (run as any).child_allowance_rappen > 0)"
                  class="text-xs text-blue-500 font-normal">
                  inkl. Spesen/Zulage
                </div>
              </td>
              <td class="px-5 py-4 text-right text-orange-600 text-sm">
                +{{ chf(run.ahv_employer_rappen + run.alv_employer_rappen + run.bu_employer_rappen + ((run as any).bvg_employer_rappen ?? 0)) }}
              </td>
              <td class="px-5 py-4 text-right font-bold text-gray-900">
                {{ chf(run.gross_rappen + run.ahv_employer_rappen + run.alv_employer_rappen + run.bu_employer_rappen) }}
              </td>
              <td class="px-5 py-4 text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="run.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                  {{ run.status === 'paid' ? 'Bezahlt' : 'Entwurf' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <button v-if="run.status === 'draft'" @click="payRun(run)"
                  :disabled="paying === run.id"
                  class="text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors">
                  Als bezahlt markieren
                </button>
                <span v-else class="text-xs text-gray-400">
                  {{ fmtDate(run.paid_at?.split('T')[0]) }}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t-2 border-gray-200 bg-emerald-50">
            <tr>
              <td class="px-5 py-3 font-bold text-gray-900">Total</td>
              <td class="px-5 py-3 text-right font-bold">{{ chf(monthRuns.reduce((s,r) => s + r.gross_rappen, 0)) }}</td>
              <td class="px-5 py-3 text-right font-bold text-red-600">
                -{{ chf(monthRuns.reduce((s,r) => s + r.ahv_employee_rappen + r.alv_employee_rappen + r.nbu_employee_rappen, 0)) }}
              </td>
              <td class="px-5 py-3 text-right font-bold text-emerald-700">
                {{ chf(monthRuns.reduce((s,r) => s + ((r as any).total_payout_rappen ?? r.net_rappen), 0)) }}
              </td>
              <td class="px-5 py-3 text-right font-bold text-orange-600">
                +{{ chf(monthRuns.reduce((s,r) => s + r.ahv_employer_rappen + r.alv_employer_rappen + r.bu_employer_rappen + ((r as any).bvg_employer_rappen ?? 0), 0)) }}
              </td>
              <td class="px-5 py-3 text-right font-bold text-gray-900">
                {{ chf(monthRuns.reduce((s,r) => s + r.gross_rappen + r.ahv_employer_rappen + r.alv_employer_rappen + r.bu_employer_rappen + ((r as any).bvg_employer_rappen ?? 0) + ((r as any).monthly_spesen_rappen ?? 0) + ((r as any).child_allowance_rappen ?? 0), 0)) }}
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-else-if="employees.length > 0" class="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400">
        <p class="font-medium">Keine Abrechnung für {{ monthNames[selectedMonth - 1] }} {{ selectedYear }}</p>
        <p class="text-sm mt-1">Klicke "Abrechnung berechnen" um die Löhne zu generieren</p>
      </div>

      <div v-else class="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400">
        <p class="font-medium">Noch keine Mitarbeiter erfasst</p>
        <p class="text-sm mt-1">Zuerst Mitarbeiter im Tab "Mitarbeiter" hinzufügen</p>
      </div>

      <!-- CH rates info -->
      <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <span class="font-semibold">CH Sozialversicherungssätze 2025 (Standardwerte):</span>
        <span class="font-semibold">Sätze 2025 (Standard):</span>
        AHV/IV/EO 5.3% + ALV 1.1% + NBU 0.68% + BVG 5% — je Mitarbeiter &amp; Firma.
        Alle Sätze pro Mitarbeiter anpassbar.
        <span class="font-medium">Mitarbeiter-Abzüge (blau) · Firmenbeiträge zusätzlich (orange).</span>
      </div>
    </div>

    <!-- ═══ TAB: RENTABILITÄT ═══ -->
    <div v-if="activeTab === 'profitability'" class="space-y-5">

      <!-- Rentabilität sub-tabs -->
      <div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit text-sm">
        <button @click="profitView = 'overall'"
          class="px-3 py-1.5 rounded-lg font-medium transition-all"
          :class="profitView === 'overall' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
          Gesamt
        </button>
        <button @click="profitView = 'instructors'"
          class="px-3 py-1.5 rounded-lg font-medium transition-all"
          :class="profitView === 'instructors' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
          Pro Fahrlehrer
        </button>
      </div>

      <!-- ── OVERALL VIEW ── -->
      <template v-if="profitView === 'overall'">
        <!-- KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-2xl p-5 shadow-sm"
            :class="profitability?.summary.profitable ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'">
            <p class="text-xs font-semibold uppercase tracking-widest mb-1"
              :class="profitability?.summary.profitable ? 'text-emerald-100' : 'text-red-100'">Ergebnis {{ selectedYear }}</p>
            <p class="text-2xl font-bold text-white">{{ chf(profitability?.summary.result_rappen ?? 0) }}</p>
            <p class="text-xs mt-1" :class="profitability?.summary.profitable ? 'text-emerald-200' : 'text-red-200'">
              {{ profitability?.summary.profitable ? '✓ Rentabel' : '✗ Verlust' }}
            </p>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Einnahmen</p>
            <p class="text-2xl font-bold text-emerald-600">{{ chf(profitability?.summary.total_revenue_rappen ?? 0) }}</p>
            <p class="text-xs text-gray-400 mt-1">Total {{ selectedYear }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Lohnkosten</p>
            <p class="text-2xl font-bold text-orange-500">{{ chf(profitability?.summary.payroll_total_rappen ?? 0) }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ profitability?.summary.payroll_share_pct ?? 0 }}% der Gesamtkosten</p>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Break-Even / Monat</p>
            <p class="text-2xl font-bold text-gray-900">{{ chf(profitability?.summary.break_even_monthly_rappen ?? 0) }}</p>
            <p class="text-xs text-gray-400 mt-1">Mindest-Umsatz nötig</p>
          </div>
        </div>

        <!-- Monthly chart -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Monatsübersicht {{ selectedYear }}</h2>
          <div class="space-y-2.5">
            <div v-for="m in (profitability?.monthly ?? [])" :key="m.month" class="flex items-center gap-3">
              <span class="text-xs text-gray-500 w-8 shrink-0">{{ m.label }}</span>
              <div class="flex-1 relative h-6 bg-gray-50 rounded-md overflow-hidden">
                <div class="absolute left-0 top-0 h-full bg-emerald-400 rounded-l-md transition-all"
                  :style="{ width: barWidth(m.revenue_rappen, maxMonthlyRevenue) }"
                  :title="`Einnahmen: ${chf(m.revenue_rappen)}`"/>
              </div>
              <div class="flex-1 relative h-6 bg-gray-50 rounded-md overflow-hidden">
                <div class="absolute left-0 top-0 h-full bg-red-300 rounded-l-md transition-all"
                  :style="{ width: barWidth(m.expenses_rappen + m.payroll_rappen, maxMonthlyRevenue) }"
                  :title="`Kosten: ${chf(m.expenses_rappen + m.payroll_rappen)}`"/>
              </div>
              <span class="text-xs w-24 text-right shrink-0 font-semibold"
                :class="m.result_rappen >= 0 ? 'text-emerald-600' : 'text-red-500'">
                {{ m.result_rappen >= 0 ? '+' : '' }}{{ chf(m.result_rappen) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-5 mt-4 text-xs text-gray-500">
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-400 inline-block"></span> Einnahmen</div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-300 inline-block"></span> Kosten (Ausgaben + Löhne)</div>
          </div>
        </div>

        <!-- Cost structure + break-even -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Kostenstruktur</h2>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Lohnkosten (AG-Total)</span>
                <span class="font-semibold text-orange-600">{{ chf(profitability?.summary.payroll_total_rappen ?? 0) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Sachkosten (Ausgaben)</span>
                <span class="font-semibold text-red-600">{{ chf(profitability?.summary.manual_expense_rappen ?? 0) }}</span>
              </div>
              <div class="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span class="text-sm font-semibold text-gray-900">Gesamtkosten</span>
                <span class="font-bold text-gray-900">{{ chf(profitability?.summary.total_expense_rappen ?? 0) }}</span>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Break-Even-Analyse</h2>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Fixkosten / Monat</span>
                <span class="font-semibold">{{ chf(profitability?.summary.break_even_monthly_rappen ?? 0) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Ø Umsatz / Monat</span>
                <span class="font-semibold text-emerald-600">
                  {{ chf(Math.round((profitability?.summary.total_revenue_rappen ?? 0) / 12)) }}
                </span>
              </div>
              <div class="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span class="text-sm font-semibold">Deckungsgrad</span>
                <span class="font-bold" :class="coverageRatio >= 1 ? 'text-emerald-600' : 'text-red-500'">
                  {{ coverageRatio >= 1 ? '✓ ' : '✗ ' }}{{ Math.round(coverageRatio * 100) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── PER INSTRUCTOR VIEW ── -->
      <template v-else>
        <div v-if="(profitability?.instructors ?? []).length === 0"
          class="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p class="font-medium">Keine Daten vorhanden</p>
          <p class="text-sm mt-1">Einnahmen und/oder Mitarbeiter erfassen um Auswertungen zu sehen</p>
        </div>

        <div v-else class="space-y-4">
          <!-- Summary bar per instructor -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span class="text-sm font-semibold text-gray-700">Rentabilität pro Fahrlehrer {{ selectedYear }}</span>
            </div>
            <table class="w-full">
              <thead>
                <tr class="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th class="px-5 py-3 text-left">Fahrlehrer</th>
                  <th class="px-5 py-3 text-right">Einnahmen</th>
                  <th class="px-5 py-3 text-right">Lohnkosten AG</th>
                  <th class="px-5 py-3 text-right">Ergebnis</th>
                  <th class="px-5 py-3 text-right">Marge</th>
                  <th class="px-5 py-3 text-center">Stunden</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="inst in profitability?.instructors" :key="inst.user_id"
                  class="hover:bg-gray-50 transition-colors">
                  <td class="px-5 py-4">
                    <div class="font-medium text-gray-900">{{ inst.name }}</div>
                    <div class="text-xs text-gray-400 mt-0.5">{{ inst.payments_count }} Zahlungen</div>
                  </td>
                  <td class="px-5 py-4 text-right font-semibold text-emerald-700">
                    {{ chf(inst.revenue_rappen) }}
                  </td>
                  <td class="px-5 py-4 text-right text-orange-600">
                    {{ inst.payroll_rappen > 0 ? chf(inst.payroll_rappen) : '–' }}
                  </td>
                  <td class="px-5 py-4 text-right font-bold"
                    :class="inst.result_rappen >= 0 ? 'text-emerald-700' : 'text-red-600'">
                    {{ inst.result_rappen >= 0 ? '+' : '' }}{{ chf(inst.result_rappen) }}
                  </td>
                  <td class="px-5 py-4 text-right">
                    <span v-if="inst.margin_pct !== null"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                      :class="inst.margin_pct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
                      {{ inst.margin_pct }}%
                    </span>
                    <span v-else class="text-xs text-gray-400">–</span>
                  </td>
                  <td class="px-5 py-4 text-center text-sm text-gray-500">
                    {{ inst.payments_count > 0 ? inst.payments_count : '–' }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-200 bg-emerald-50">
                <tr>
                  <td class="px-5 py-3 font-bold text-gray-900">Total</td>
                  <td class="px-5 py-3 text-right font-bold text-emerald-700">
                    {{ chf((profitability?.instructors ?? []).reduce((s: number, i: any) => s + i.revenue_rappen, 0)) }}
                  </td>
                  <td class="px-5 py-3 text-right font-bold text-orange-600">
                    {{ chf((profitability?.instructors ?? []).reduce((s: number, i: any) => s + i.payroll_rappen, 0)) }}
                  </td>
                  <td class="px-5 py-3 text-right font-bold"
                    :class="(profitability?.instructors ?? []).reduce((s: number, i: any) => s + i.result_rappen, 0) >= 0 ? 'text-emerald-700' : 'text-red-600'">
                    {{ chf((profitability?.instructors ?? []).reduce((s: number, i: any) => s + i.result_rappen, 0)) }}
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Visual bars per instructor -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Einnahmen-Vergleich</h2>
            <div class="space-y-3">
              <div v-for="inst in profitability?.instructors" :key="inst.user_id + '_bar'"
                class="flex items-center gap-3">
                <span class="text-sm text-gray-700 w-36 shrink-0 truncate">{{ inst.name }}</span>
                <div class="flex-1 relative h-6 bg-gray-50 rounded-md overflow-hidden">
                  <div class="absolute left-0 top-0 h-full bg-emerald-400 rounded-l-md transition-all"
                    :style="{ width: barWidth(inst.revenue_rappen, profitability?.instructors?.[0]?.revenue_rappen ?? 1) }"/>
                  <div v-if="inst.payroll_rappen > 0"
                    class="absolute left-0 top-0 h-full bg-orange-300 opacity-60 rounded-l-md transition-all"
                    :style="{ width: barWidth(inst.payroll_rappen, profitability?.instructors?.[0]?.revenue_rappen ?? 1) }"/>
                </div>
                <span class="text-xs w-28 text-right shrink-0 font-semibold text-emerald-700">
                  {{ chf(inst.revenue_rappen) }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-5 mt-4 text-xs text-gray-500">
              <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-400 inline-block"></span> Einnahmen</div>
              <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-orange-300 inline-block"></span> Lohnkosten</div>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
            <span class="font-semibold">Hinweis:</span> Lohnkosten werden nur angezeigt, wenn der Mitarbeiter unter "Mitarbeiter" mit dem entsprechenden Benutzerkonto verknüpft ist.
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ EMPLOYEE MODAL ═══ -->
    <Teleport to="body">
      <div v-if="showEmployeeModal"
        class="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm"
        @click.self="showEmployeeModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 class="font-semibold text-gray-900">
              {{ editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter' }}
            </h2>
            <button @click="showEmployeeModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <!-- Staff picker (only for new employees) -->
            <div v-if="!editingEmployee">
              <label class="block text-xs font-semibold text-gray-500 mb-1">Mitarbeiter aus System wählen</label>
              <select v-model="selectedStaffUserId" @change="onStaffUserSelected"
                class="w-full border border-emerald-300 bg-emerald-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">– Manuell erfassen –</option>
                <option
                  v-for="u in staffUsers"
                  :key="u.id"
                  :value="u.id"
                  :disabled="u.already_linked">
                  {{ u.first_name }} {{ u.last_name }} ({{ u.email }}){{ u.already_linked ? ' ✓ bereits erfasst' : '' }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Vorname *</label>
                <input v-model="empForm.first_name" type="text" placeholder="Max"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Nachname *</label>
                <input v-model="empForm.last_name" type="text" placeholder="Mustermann"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">E-Mail</label>
              <input v-model="empForm.email" type="email" placeholder="max@example.ch"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Anstellungsart *</label>
              <select v-model="empForm.employment_type"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="monthly">Monatslohn (fixe Entlöhnung)</option>
                <option value="hourly">Stundenlohn</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">
                  {{ empForm.employment_type === 'monthly' ? 'Bruttolohn / Monat (CHF) *' : 'Bruttolohn / Stunde (CHF) *' }}
                </label>
                <input v-model="empFormSalaryChf" type="number" step="0.05" min="0" placeholder="4500"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
              <div v-if="empForm.employment_type === 'hourly'">
                <label class="block text-xs font-semibold text-gray-500 mb-1">Ø Stunden / Monat</label>
                <input v-model.number="empForm.hours_per_month" type="number" step="0.5" min="0" placeholder="180"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
            </div>
            <!-- ─── Versicherungen & Sozialleistungen ────────────────────────────── -->
            <div class="rounded-2xl border overflow-hidden transition-all"
              :class="editingInsurance ? 'border-emerald-200' : 'border-gray-200'">

              <!-- Header with toggle -->
              <div class="flex items-center justify-between px-4 py-2.5 border-b transition-colors"
                :class="editingInsurance ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'">
                <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Versicherungen & Sozialleistungen
                </span>
                <button type="button" @click="editingInsurance = !editingInsurance"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1 transition-all"
                  :class="editingInsurance
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'">
                  <svg v-if="editingInsurance" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  {{ editingInsurance ? 'Fertig' : 'Bearbeiten' }}
                </button>
              </div>

              <!-- ── VIEW MODE ────────────────────────────────────────────────────── -->
              <div v-if="!editingInsurance" class="divide-y divide-gray-100 bg-white">

                <!-- AHV / ALV -->
                <div class="px-4 py-3">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">AHV/IV/EO & ALV</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">AHV <span class="text-blue-600 font-semibold">Mitarb.</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).ahv_employee_rate_pct) }}%</span>
                    </div>
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">AHV <span class="text-orange-500 font-semibold">Firma</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).ahv_employer_rate_pct) }}%</span>
                    </div>
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">ALV <span class="text-blue-600 font-semibold">Mitarb.</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).alv_employee_rate_pct) }}%</span>
                    </div>
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">ALV <span class="text-orange-500 font-semibold">Firma</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).alv_employer_rate_pct) }}%</span>
                    </div>
                  </div>
                </div>

                <!-- UVG -->
                <div class="px-4 py-3">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Unfallversicherung UVG</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">NBU <span class="text-blue-600 font-semibold">Mitarb.</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).nbu_rate_pct) }}%</span>
                    </div>
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">BU <span class="text-orange-500 font-semibold">Firma</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).bu_rate_pct) }}%</span>
                    </div>
                  </div>
                </div>

                <!-- BVG -->
                <div class="px-4 py-3">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">2. Säule BVG</p>
                  <div class="grid grid-cols-2 gap-2 mb-2">
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">Beitrag <span class="text-blue-600 font-semibold">Mitarb.</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).bvg_employee_rate_pct) }}%</span>
                    </div>
                    <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                      <span class="text-gray-500">Beitrag <span class="text-orange-500 font-semibold">Firma</span></span>
                      <span class="font-mono font-bold text-gray-800">{{ r2((empForm as any).bvg_employer_rate_pct) }}%</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                    <span class="text-gray-500">Koordinationsabzug <span class="text-gray-400 font-normal">(Brutto − BVG-Lohn)</span></span>
                    <span class="font-mono font-bold text-gray-800">CHF {{ ((empForm as any).bvg_coordination_chf ?? 2205).toLocaleString('de-CH') }}<span class="text-gray-400 font-normal">/Mt.</span></span>
                  </div>
                </div>

                <!-- Spesen & Kinderzulage -->
                <div class="px-4 py-3">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Spesen & Zulagen</p>
                    <span v-if="spesenItems.length > 0" class="text-xs font-bold text-blue-600">
                      Total CHF {{ spesenItems.reduce((s, i) => s + (i.amount_chf || 0), 0).toLocaleString('de-CH') }}/Mt.
                    </span>
                  </div>
                  <div v-if="spesenItems.length === 0 && !((empForm as any).child_allowance_chf > 0)"
                    class="text-xs text-gray-400 italic py-1.5 text-center rounded-xl border border-dashed border-gray-200">
                    Keine Spesen oder Zulagen
                  </div>
                  <div class="space-y-1.5">
                    <div v-for="item in spesenItems" :key="item.id"
                      class="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs">
                      <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                        <span class="text-gray-700 font-medium">{{ item.description || 'Spesen' }}</span>
                      </div>
                      <span class="font-mono font-bold text-blue-700">CHF {{ item.amount_chf.toLocaleString('de-CH') }}/Mt.</span>
                    </div>
                    <div v-if="(empForm as any).child_allowance_chf > 0"
                      class="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs">
                      <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"></span>
                        <span class="text-gray-700 font-medium">Kinderzulage</span>
                      </div>
                      <span class="font-mono font-bold text-violet-700">CHF {{ ((empForm as any).child_allowance_chf || 0).toLocaleString('de-CH') }}/Mt.</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── EDIT MODE ────────────────────────────────────────────────────── -->
              <div v-else class="p-4 space-y-5 bg-white">

                <!-- AHV / ALV -->
                <div>
                  <p class="text-xs font-semibold text-gray-600 mb-2.5">
                    AHV/IV/EO & ALV
                    <span class="font-normal text-gray-400">(Gesetzl. 2025: AHV 5.3% · ALV 1.1%)</span>
                  </p>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">AHV <span class="text-blue-600 font-semibold">Mitarbeiter</span></label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).ahv_employee_rate_pct" type="number" step="0.01" min="0" max="15" placeholder="5.3"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">AHV <span class="text-orange-500 font-semibold">Firma</span></label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).ahv_employer_rate_pct" type="number" step="0.01" min="0" max="15" placeholder="5.3"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">ALV <span class="text-blue-600 font-semibold">Mitarbeiter</span></label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).alv_employee_rate_pct" type="number" step="0.01" min="0" max="5" placeholder="1.1"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">ALV <span class="text-orange-500 font-semibold">Firma</span></label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).alv_employer_rate_pct" type="number" step="0.01" min="0" max="5" placeholder="1.1"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- UVG -->
                <div>
                  <p class="text-xs font-semibold text-gray-600 mb-2.5">Unfallversicherung UVG</p>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">
                        NBU <span class="text-blue-600 font-semibold">Mitarbeiter</span>
                        <span class="text-gray-400"> · Nichtberufsunfall</span>
                      </label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).nbu_rate_pct" type="number" step="0.01" min="0" max="5" placeholder="0.68"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">
                        BU <span class="text-orange-500 font-semibold">Firma</span>
                        <span class="text-gray-400"> · Berufsunfall</span>
                      </label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).bu_rate_pct" type="number" step="0.01" min="0" max="5" placeholder="0.39"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- BVG -->
                <div>
                  <p class="text-xs font-semibold text-gray-600 mb-2.5">2. Säule BVG / Pensionskasse</p>
                  <div class="grid grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">BVG <span class="text-blue-600 font-semibold">Mitarbeiter</span></label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).bvg_employee_rate_pct" type="number" step="0.1" min="0" max="20" placeholder="5"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">BVG <span class="text-orange-500 font-semibold">Firma</span></label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).bvg_employer_rate_pct" type="number" step="0.1" min="0" max="20" placeholder="5"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"/>
                        <span class="absolute right-3 top-2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-[11px] text-gray-500 mb-1">Koordinationsabzug</label>
                      <div class="relative">
                        <input v-model.number="(empForm as any).bvg_coordination_chf" type="number" step="10" min="0" placeholder="2205"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pl-3 pr-10"/>
                        <span class="absolute right-2.5 top-2 text-xs text-gray-400">CHF</span>
                      </div>
                    </div>
                  </div>
                  <p class="text-[11px] text-gray-400 mt-1.5">Altersgestaffelt: 25–34J: 7% · 35–44J: 10% · 45–54J: 15% · 55–65J: 18%</p>
                </div>

                <!-- Spesen (mehrere mit Beschreibung) -->
                <div>
                  <div class="flex items-center justify-between mb-2.5">
                    <p class="text-xs font-semibold text-gray-600">
                      Spesen <span class="text-gray-400 font-normal">(monatlich, steuerfrei)</span>
                    </p>
                    <button type="button" @click="addSpesenItem"
                      class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1 transition-colors">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                      </svg>
                      Position hinzufügen
                    </button>
                  </div>
                  <div v-if="spesenItems.length === 0"
                    class="text-xs text-gray-400 italic text-center py-3 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                    Noch keine Spesen-Positionen — klick «Position hinzufügen»
                  </div>
                  <div class="space-y-2">
                    <div v-for="(item, idx) in spesenItems" :key="item.id" class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 w-4 text-right flex-shrink-0 font-mono">{{ idx + 1 }}.</span>
                      <input v-model="item.description" type="text" placeholder="Beschreibung (z.B. Auto-Spesen)"
                        class="flex-1 min-w-0 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                      <div class="relative w-28 flex-shrink-0">
                        <span class="absolute left-2.5 top-2 text-xs text-gray-400">CHF</span>
                        <input v-model.number="item.amount_chf" type="number" step="10" min="0" placeholder="0"
                          class="w-full border border-gray-200 bg-gray-50 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                      </div>
                      <button type="button" @click="removeSpesenItem(item.id)"
                        class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Kinderzulage -->
                <div>
                  <p class="text-xs font-semibold text-gray-600 mb-2">Kinderzulage <span class="font-normal text-gray-400">(monatlich)</span></p>
                  <div class="relative max-w-[180px]">
                    <span class="absolute left-3 top-2 text-xs text-gray-400">CHF</span>
                    <input v-model.number="(empForm as any).child_allowance_chf" type="number" step="10" min="0" placeholder="0"
                      class="w-full border border-gray-200 bg-gray-50 rounded-xl pl-9 pr-12 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                    <span class="absolute right-3 top-2 text-xs text-gray-400">/Mt.</span>
                  </div>
                  <p class="text-[11px] text-gray-400 mt-1">Kanton Schwyz: CHF 230/Kind/Mt.</p>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">IBAN (für Lohnzahlung)</label>
              <input v-model="empForm.iban" type="text" placeholder="CH56 0483 5012 3456 7800 9"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Eintrittsdatum</label>
                <input v-model="empForm.start_date" type="date"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Austrittsdatum</label>
                <input v-model="empForm.end_date" type="date"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
            </div>

            <!-- Live preview of deductions -->
            <div v-if="Number(empFormSalaryChf) > 0" class="bg-white border border-gray-200 rounded-xl p-3 text-xs space-y-1.5">
              <p class="font-semibold text-gray-600 mb-1">Vorschau Lohnabrechnung</p>
              <p class="text-gray-400 mb-2"><span class="text-blue-600 font-medium">Rot = Abzug vom Mitarbeiter-Lohn</span> · <span class="text-orange-500 font-medium">Orange = zahlt die Firma zusätzlich</span></p>
              {{ '' /* computed preview values */ }}
              <template v-if="preview">
                <div class="flex justify-between text-gray-700 font-medium">
                  <span>Bruttolohn</span><span>{{ chf(preview.gross) }}</span>
                </div>
                <div class="flex justify-between text-red-600">
                  <span>- AHV/IV/EO Mitarbeiter ({{ (empForm as any).ahv_employee_rate_pct }}%)</span><span>-{{ chf(preview.ahv_an) }}</span>
                </div>
                <div class="flex justify-between text-red-600">
                  <span>- ALV Mitarbeiter ({{ (empForm as any).alv_employee_rate_pct }}%)</span><span>-{{ chf(preview.alv_an) }}</span>
                </div>
                <div class="flex justify-between text-red-600">
                  <span>- NBU Mitarbeiter ({{ (empForm as any).nbu_rate_pct }}%)</span><span>-{{ chf(preview.nbu_an) }}</span>
                </div>
                <div class="flex justify-between text-red-600">
                  <span>- BVG Mitarbeiter ({{ (empForm as any).bvg_employee_rate_pct }}% auf CHF {{ (empForm as any).bvg_coordination_chf ? ((preview.gross - Math.round((empForm as any).bvg_coordination_chf * 100)) / 100).toFixed(0) : 0 }} kord.)</span>
                  <span>-{{ chf(preview.bvg_an) }}</span>
                </div>
                <div class="flex justify-between font-bold text-emerald-700 border-t border-gray-200 pt-1.5">
                  <span>= Nettolohn</span><span>{{ chf(preview.net) }}</span>
                </div>
                <template v-if="spesenItems.length > 0">
                  <div v-for="item in spesenItems" :key="item.id" class="flex justify-between text-blue-600">
                    <span>+ {{ item.description || 'Spesen' }} (steuerfrei)</span>
                    <span>+{{ chf(Math.round((item.amount_chf || 0) * 100)) }}</span>
                  </div>
                </template>
                <div v-if="preview.kinderzulage > 0" class="flex justify-between text-blue-600">
                  <span>+ Kinderzulage</span><span>+{{ chf(preview.kinderzulage) }}</span>
                </div>
                <div class="flex justify-between font-bold text-emerald-800 border-t border-gray-200 pt-1.5 text-sm">
                  <span>= Auszahlung</span><span>{{ chf(preview.payout) }}</span>
                </div>
                <div class="border-t border-dashed border-gray-200 pt-1.5 mt-1">
                  <p class="font-semibold text-gray-500 mb-1">Beiträge Firma (Arbeitgeberanteil)</p>
                  <div class="flex justify-between text-orange-600">
                    <span>+ AHV/IV/EO Firma ({{ (empForm as any).ahv_employer_rate_pct }}%)</span><span>+{{ chf(preview.ahv_ag) }}</span>
                  </div>
                  <div class="flex justify-between text-orange-600">
                    <span>+ ALV Firma ({{ (empForm as any).alv_employer_rate_pct }}%)</span><span>+{{ chf(preview.alv_ag) }}</span>
                  </div>
                  <div class="flex justify-between text-orange-600">
                    <span>+ BU Firma ({{ (empForm as any).bu_rate_pct }}%)</span><span>+{{ chf(preview.bu_ag) }}</span>
                  </div>
                  <div class="flex justify-between text-orange-600">
                    <span>+ BVG Firma ({{ (empForm as any).bvg_employer_rate_pct }}%)</span><span>+{{ chf(preview.bvg_ag) }}</span>
                  </div>
                  <div class="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>= Gesamtkosten Firma</span><span>{{ chf(preview.total_employer) }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <div v-if="errorMsg" class="px-6 pb-0 pt-2">
            <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{{ errorMsg }}</p>
          </div>
          <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button @click="showEmployeeModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors">
              Abbrechen
            </button>
            <button @click="saveEmployee" :disabled="saving"
              class="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-sm">
              {{ saving ? 'Speichern…' : 'Speichern' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

// ─── Types ────────────────────────────────────────────────────────────────────
interface PayrollEmployee {
  id: string
  first_name: string
  last_name: string
  email: string | null
  employment_type: 'monthly' | 'hourly'
  gross_salary_rappen: number
  hours_per_month: number | null
  iban: string | null
  start_date: string
  end_date: string | null
}

interface PayrollRun {
  id: string
  employee_id: string
  year: number
  month: number
  gross_rappen: number
  hours_worked: number | null
  ahv_employee_rappen: number
  iv_employee_rappen: number
  alv_employee_rappen: number
  nbu_employee_rappen: number
  ahv_employer_rappen: number
  alv_employer_rappen: number
  bu_employer_rappen: number
  net_rappen: number
  status: 'draft' | 'paid'
  paid_at: string | null
  employee: { first_name: string; last_name: string; employment_type: string } | null
}

// ─── State ────────────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const selectedMonth = ref(new Date().getMonth() + 1)
const activeTab = ref<'employees' | 'runs' | 'profitability'>('employees')

const employees = ref<PayrollEmployee[]>([])
const runs = ref<PayrollRun[]>([])
const profitability = ref<any>(null)

const showEmployeeModal = ref(false)
const editingEmployee = ref<PayrollEmployee | null>(null)
const saving = ref(false)
const calculating = ref(false)
const paying = ref<string | null>(null)
const profitView = ref<'overall' | 'instructors'>('overall')
const errorMsg = ref<string | null>(null)
const staffUsers = ref<Array<{ id: string; first_name: string; last_name: string; email: string; already_linked: boolean }>>([])
const selectedStaffUserId = ref('')

const tabs = [
  { id: 'employees', label: 'Mitarbeiter' },
  { id: 'runs', label: 'Lohnabrechnungen' },
  { id: 'profitability', label: 'Rentabilität' },
] as const

const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

// ─── Employee form ────────────────────────────────────────────────────────────
const empForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  employment_type: 'monthly' as 'monthly' | 'hourly',
  gross_salary_rappen: 0,
  hours_per_month: null as number | null,
  iban: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '' as string,
})

const empFormSalaryChf = ref<number | ''>('')
const editingInsurance = ref(false)
const spesenItems = ref<Array<{ id: string; description: string; amount_chf: number }>>([])

function r2(n: number | undefined | null): string {
  return parseFloat((Math.round((n ?? 0) * 100) / 100).toFixed(2)).toString().replace('.', ',')
}
function addSpesenItem() {
  spesenItems.value.push({ id: `sp_${Date.now()}_${Math.random().toString(36).slice(2)}`, description: '', amount_chf: 0 })
}
function removeSpesenItem(id: string) {
  spesenItems.value = spesenItems.value.filter(i => i.id !== id)
}

const preview = computed(() => {
  const gross = Math.round(Number(empFormSalaryChf.value || 0) * 100)
  if (!gross) return null
  const f = empForm.value as any

  const ahvAnRate = (f.ahv_employee_rate_pct ?? 5.3)  / 100
  const ahvAgRate = (f.ahv_employer_rate_pct ?? 5.3)  / 100
  const alvAnRate = (f.alv_employee_rate_pct ?? 1.1)  / 100
  const alvAgRate = (f.alv_employer_rate_pct ?? 1.1)  / 100
  const nbuRate   = (f.nbu_rate_pct          ?? 0.68) / 100
  const buRate    = (f.bu_rate_pct           ?? 0.39) / 100
  const bvgAnRate = (f.bvg_employee_rate_pct ?? 5.0)  / 100
  const bvgAgRate = (f.bvg_employer_rate_pct ?? 5.0)  / 100
  const coordRappen = Math.round((f.bvg_coordination_chf ?? 2205) * 100)

  const r = Math.round
  const ahv_an  = r(gross * ahvAnRate)
  const alv_an  = r(gross * alvAnRate)
  const nbu_an  = r(gross * nbuRate)
  const coordinated = Math.max(0, gross - coordRappen)
  const bvg_an  = r(coordinated * bvgAnRate)
  const net     = gross - ahv_an - alv_an - nbu_an - bvg_an
  const spesen  = spesenItems.value.reduce((s, i) => s + Math.round((i.amount_chf || 0) * 100), 0)
  const kizul   = Math.round((f.child_allowance_chf ?? 0) * 100)
  const payout  = net + spesen + kizul

  const ahv_ag  = r(gross * ahvAgRate)
  const alv_ag  = r(gross * alvAgRate)
  const bu_ag   = r(gross * buRate)
  const bvg_ag  = r(coordinated * bvgAgRate)
  const total_employer = gross + ahv_ag + alv_ag + bu_ag + bvg_ag

  return { gross, ahv_an, alv_an, nbu_an, bvg_an, net, spesen, kinderzulage: kizul, payout,
    ahv_ag, alv_ag, bu_ag, bvg_ag, total_employer }
})

// ─── Computed ─────────────────────────────────────────────────────────────────
const monthRuns = computed(() =>
  runs.value.filter(r => r.month === selectedMonth.value),
)

const maxMonthlyRevenue = computed(() => {
  if (!profitability.value) return 1
  return Math.max(1, ...profitability.value.monthly.map((m: any) => m.revenue_rappen))
})

const coverageRatio = computed(() => {
  const s = profitability.value?.summary
  if (!s || s.break_even_monthly_rappen === 0) return 1
  return (s.total_revenue_rappen / 12) / s.break_even_monthly_rappen
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const chf = (rappen: number) =>
  `CHF ${(rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'

function barWidth(val: number, max: number) {
  if (!max || max === 0) return '0%'
  return `${Math.min(100, Math.round((val / max) * 100))}%`
}

// Employer total cost per month for an employee
function employerCost(emp: PayrollEmployee): number {
  const g = emp.employment_type === 'monthly'
    ? emp.gross_salary_rappen
    : Math.round(emp.gross_salary_rappen * (emp.hours_per_month ?? 0))
  return g + Math.round(g * (0.053 + 0.011 + 0.0017))
}

// ─── Legal form ───────────────────────────────────────────────────────────────
const legalInfo = ref<{ legal_form: string; mwst_obligated: boolean } | null>(null)
async function loadLegalInfo() {
  try { legalInfo.value = await $fetch<any>('/api/admin/legal-info') } catch {}
}
const isEinzelfirma = computed(() => legalInfo.value?.legal_form === 'einzelfirma')

// Self-employed AHV calculator (Einzelfirma only)
// Sliding scale 2025: 5.371% for income ≤ CHF 58'800, up to 10% for ≥ CHF 58'800
// Simplified: use flat 10% for any income > CHF 9'900 (Mindestbeitrag CHF 530/year)
const selfAhvGrossChf = ref<number | ''>('')
const selfAhvResult = computed(() => {
  const gross = Number(selfAhvGrossChf.value || 0)
  if (gross <= 0) return null
  const yearlyIncome = gross * 100 // rappen
  // AHV 8.1% + IV 1.4% + EO 0.5% = 10.0% (flat above CHF 58'800)
  // Sliding scale below: simplified as 10% for simplicity (conservative, actual slightly lower for low incomes)
  const rate = yearlyIncome >= 5880000 ? 0.10 : Math.max(0.05371, 0.10 - ((5880000 - yearlyIncome) / 5880000) * 0.04629)
  const totalRappen = Math.round(yearlyIncome * rate)
  const monthlyRappen = Math.round(totalRappen / 12)
  return {
    gross, rate: (rate * 100).toFixed(2),
    ahv: Math.round(yearlyIncome * 0.081), iv: Math.round(yearlyIncome * 0.014), eo: Math.round(yearlyIncome * 0.005),
    totalRappen, monthlyRappen,
  }
})

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadEmployees(), loadRuns(), loadProfitability(), loadLegalInfo()])
}

async function loadEmployees() {
  try {
    const data = await $fetch<{ success: boolean; data: PayrollEmployee[] }>('/api/admin/payroll/employees')
    employees.value = data.data ?? []
  } catch { employees.value = [] }
}

async function loadRuns() {
  try {
    const data = await $fetch<{ success: boolean; data: PayrollRun[] }>(`/api/admin/payroll/runs?year=${selectedYear.value}`)
    runs.value = data.data ?? []
  } catch { runs.value = [] }
}

async function loadProfitability() {
  try {
    profitability.value = await $fetch(`/api/admin/payroll/profitability?year=${selectedYear.value}`)
  } catch { profitability.value = null }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function openEmployeeModal(emp: PayrollEmployee | null) {
  errorMsg.value = null
  selectedStaffUserId.value = ''
  editingEmployee.value = emp
  const toForm = (e: any) => ({
    first_name: e.first_name ?? '',
    last_name:  e.last_name  ?? '',
    email:      e.email      ?? '',
    employment_type:    e.employment_type    ?? 'monthly',
    gross_salary_rappen: e.gross_salary_rappen ?? 0,
    hours_per_month:     e.hours_per_month    ?? null,
    iban:        e.iban       ?? '',
    start_date:  e.start_date ?? new Date().toISOString().split('T')[0],
    end_date:    e.end_date   ?? '',
    // All rates in % for UI inputs (parseFloat+toFixed avoids 0.011*100=1.0999...)
    ahv_employee_rate_pct:    parseFloat(((e.ahv_employee_rate     ?? 0.053)  * 100).toFixed(3)),
    ahv_employer_rate_pct:    parseFloat(((e.ahv_employer_rate     ?? 0.053)  * 100).toFixed(3)),
    alv_employee_rate_pct:    parseFloat(((e.alv_employee_rate     ?? 0.011)  * 100).toFixed(3)),
    alv_employer_rate_pct:    parseFloat(((e.alv_employer_rate     ?? 0.011)  * 100).toFixed(3)),
    nbu_rate_pct:             parseFloat(((e.nbu_rate              ?? 0.0068) * 100).toFixed(3)),
    bu_rate_pct:              parseFloat(((e.bu_rate               ?? 0.0039) * 100).toFixed(3)),
    bvg_employee_rate_pct:    parseFloat(((e.bvg_employee_rate     ?? 0.05)   * 100).toFixed(3)),
    bvg_employer_rate_pct:    parseFloat(((e.bvg_employer_rate     ?? 0.05)   * 100).toFixed(3)),
    bvg_coordination_chf:     parseFloat(((e.bvg_coordination_rappen ?? 220500) / 100).toFixed(2)),
    child_allowance_chf:      parseFloat(((e.child_allowance_rappen  ?? 0)       / 100).toFixed(2)),
  })

  if (emp) {
    empForm.value = toForm(emp)
    empFormSalaryChf.value = emp.gross_salary_rappen / 100
    // Init spesen items from JSONB or legacy single value
    const rawItems = Array.isArray((emp as any).spesen_items) ? (emp as any).spesen_items : []
    spesenItems.value = rawItems.length > 0
      ? rawItems.map((s: any, i: number) => ({
          id: s.id ?? `sp_${Date.now()}_${i}`,
          description: s.description ?? '',
          amount_chf: typeof s.amount_chf === 'number' ? s.amount_chf : 0,
        }))
      : emp.monthly_spesen_rappen > 0
        ? [{ id: `sp_legacy_${Date.now()}`, description: 'Spesen', amount_chf: emp.monthly_spesen_rappen / 100 }]
        : []
  } else {
    empForm.value = toForm({})
    empFormSalaryChf.value = ''
    spesenItems.value = []
    await loadStaffUsers()
  }
  editingInsurance.value = false
  showEmployeeModal.value = true
}

function onStaffUserSelected() {
  if (!selectedStaffUserId.value) return
  const user = staffUsers.value.find(u => u.id === selectedStaffUserId.value)
  if (!user) return
  empForm.value.first_name = user.first_name
  empForm.value.last_name  = user.last_name
  empForm.value.email      = user.email ?? ''
}

async function loadStaffUsers() {
  try {
    const data = await $fetch<{ success: boolean; data: typeof staffUsers.value }>('/api/admin/payroll/staff-users')
    staffUsers.value = data.data ?? []
  } catch {
    staffUsers.value = []
  }
}

async function saveEmployee() {
  errorMsg.value = null
  if (!empForm.value.first_name?.trim()) { errorMsg.value = 'Vorname ist erforderlich'; return }
  if (!empForm.value.last_name?.trim()) { errorMsg.value = 'Nachname ist erforderlich'; return }
  const salaryRappen = Math.round(Number(empFormSalaryChf.value || 0) * 100)
  if (!salaryRappen || salaryRappen <= 0) { errorMsg.value = 'Bitte einen gültigen Lohn erfassen'; return }
  empForm.value.gross_salary_rappen = salaryRappen
  saving.value = true
  try {
    const payload = {
      first_name: empForm.value.first_name.trim(),
      last_name: empForm.value.last_name.trim(),
      email: empForm.value.email?.trim() || null,
      employment_type: empForm.value.employment_type,
      gross_salary_rappen: empForm.value.gross_salary_rappen,
      hours_per_month: empForm.value.hours_per_month ?? null,
      iban: empForm.value.iban?.trim() || null,
      start_date: empForm.value.start_date,
      end_date: empForm.value.end_date || null,
      user_id: selectedStaffUserId.value || null,
      ahv_employee_rate:         (empForm.value as any).ahv_employee_rate_pct / 100,
      ahv_employer_rate:         (empForm.value as any).ahv_employer_rate_pct / 100,
      alv_employee_rate:         (empForm.value as any).alv_employee_rate_pct / 100,
      alv_employer_rate:         (empForm.value as any).alv_employer_rate_pct / 100,
      nbu_rate:                  (empForm.value as any).nbu_rate_pct          / 100,
      bu_rate:                   (empForm.value as any).bu_rate_pct           / 100,
      bvg_employee_rate:         (empForm.value as any).bvg_employee_rate_pct / 100,
      bvg_employer_rate:         (empForm.value as any).bvg_employer_rate_pct / 100,
      bvg_coordination_rappen: Math.round((empForm.value as any).bvg_coordination_chf * 100),
      monthly_spesen_rappen:   spesenItems.value.reduce((s, i) => s + Math.round((i.amount_chf || 0) * 100), 0),
      child_allowance_rappen:  Math.round((empForm.value as any).child_allowance_chf  * 100),
      spesen_items:            spesenItems.value.map(i => ({ id: i.id, description: i.description, amount_chf: i.amount_chf })),
    }
    if (editingEmployee.value) {
      await $fetch(`/api/admin/payroll/employees/${editingEmployee.value.id}`, { method: 'PATCH', body: payload })
    } else {
      await $fetch('/api/admin/payroll/employees', { method: 'POST', body: payload })
    }
    showEmployeeModal.value = false
    await loadEmployees()
    await loadProfitability()
  } catch (e: any) {
    errorMsg.value = e.data?.statusMessage ?? e.data?.message ?? e.message ?? 'Fehler beim Speichern'
  } finally {
    saving.value = false
  }
}

const copying = ref(false)

const prevMonthLabel = computed(() => {
  let y = selectedYear.value
  let m = selectedMonth.value - 1
  if (m === 0) { m = 12; y-- }
  return `Löhne von ${monthNames[m - 1]} ${y} kopieren und neu berechnen`
})

async function copyFromLastMonth() {
  if (employees.value.length === 0) { alert('Keine Mitarbeiter erfasst'); return }
  // Determine previous month
  let prevYear = selectedYear.value
  let prevMonth = selectedMonth.value - 1
  if (prevMonth === 0) { prevMonth = 12; prevYear-- }

  copying.value = true
  try {
    // Fetch previous month's runs to extract hours_worked
    const prev = await $fetch<{ success: boolean; data: PayrollRun[] }>(
      `/api/admin/payroll/runs?year=${prevYear}&month=${prevMonth}`
    )
    const prevRuns = prev.data ?? []
    const hoursMap = new Map(prevRuns.map(r => [r.employee_id, r.hours_worked]))

    // Build run list: carry over hours_worked from prev month for hourly employees
    const runList = employees.value.map(e => ({
      employee_id: e.id,
      hours_worked: hoursMap.get(e.id) ?? undefined,
    }))

    await $fetch('/api/admin/payroll/calculate', {
      method: 'POST',
      body: { year: selectedYear.value, month: selectedMonth.value, runs: runList },
    })
    await loadRuns()
  } catch (e: any) {
    alert(e.data?.message ?? 'Fehler beim Kopieren')
  } finally {
    copying.value = false
  }
}

async function calculateMonth() {
  if (employees.value.length === 0) {
    alert('Keine Mitarbeiter erfasst')
    return
  }
  calculating.value = true
  try {
    await $fetch('/api/admin/payroll/calculate', {
      method: 'POST',
      body: {
        year: selectedYear.value,
        month: selectedMonth.value,
        runs: employees.value.map(e => ({ employee_id: e.id })),
      },
    })
    await loadRuns()
  } catch (e: any) {
    alert(e.data?.message ?? 'Fehler bei der Berechnung')
  } finally {
    calculating.value = false
  }
}

async function payRun(run: PayrollRun) {
  if (!confirm(`Lohn für ${run.employee?.first_name} ${run.employee?.last_name} als bezahlt markieren?\n\nDies erstellt automatisch eine Buchung in der Buchhaltung.`)) return
  paying.value = run.id
  try {
    await $fetch(`/api/admin/payroll/runs/${run.id}/pay`, { method: 'POST' })
    await Promise.all([loadRuns(), loadProfitability()])
  } catch (e: any) {
    alert(e.data?.message ?? 'Fehler beim Bezahlen')
  } finally {
    paying.value = null
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(loadAll)
</script>
