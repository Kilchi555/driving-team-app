<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">

    <!-- ═══ PENDING STAFF EXPENSES ═══ -->
    <div v-if="pendingExpenses.length > 0" class="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div class="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
            {{ pendingExpenses.length }}
          </span>
          <span class="text-sm font-semibold text-amber-800">Spesen-Einreichungen ausstehend</span>
        </div>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="exp in pendingExpenses" :key="exp.id" class="px-5 py-4 flex items-start gap-4">
          <!-- Receipt thumbnail -->
          <a v-if="exp.receipt_url" :href="exp.receipt_url" target="_blank"
            class="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center hover:opacity-80 transition-opacity">
            <img v-if="!exp.receipt_filename?.endsWith('.pdf')" :src="exp.receipt_url" class="w-full h-full object-cover" alt="Beleg"/>
            <svg v-else class="w-7 h-7 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
            </svg>
          </a>
          <div v-else class="flex-shrink-0 w-14 h-14 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
            <svg class="w-7 h-7 text-orange-300" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clip-rule="evenodd"/>
            </svg>
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900">{{ exp.description }}</p>
            <div class="flex items-center gap-2 flex-wrap mt-0.5">
              <span class="text-xs text-gray-500">{{ new Date(exp.entry_date).toLocaleDateString('de-CH') }}</span>
              <span v-if="exp.submitter" class="text-xs text-gray-400">
                von {{ exp.submitter.first_name }} {{ exp.submitter.last_name }}
              </span>
            </div>
            <p v-if="exp.notes" class="text-xs text-gray-500 mt-1 italic">{{ exp.notes }}</p>
          </div>

          <!-- Amount + actions -->
          <div class="flex-shrink-0 text-right space-y-2">
            <p class="text-base font-bold text-gray-900">CHF {{ (exp.amount_rappen / 100).toFixed(2) }}</p>
            <div class="flex items-center gap-2 justify-end">
              <button @click="handleExpense(exp.id, 'approve')" :disabled="approving === exp.id"
                class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                Genehmigen
              </button>
              <button @click="rejectWithReason(exp)" :disabled="approving === exp.id"
                class="px-3 py-1.5 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition-colors">
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ BELEG-WARNUNG ═══ -->
    <div v-if="entriesWithoutReceipt > 0"
      class="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
      <svg class="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      <p class="text-sm text-orange-800 flex-1">
        <span class="font-semibold">{{ entriesWithoutReceipt }} Buchung{{ entriesWithoutReceipt !== 1 ? 'en' : '' }} ohne Beleg</span>
        — Ausgaben ohne Originalbeleg sind steuerlich nicht anerkannt (OR Art. 957a).
      </p>
      <button @click="activeTypeFilter = 'expense'; showOnlyMissingReceipt = true"
        class="text-xs font-semibold text-orange-700 hover:text-orange-900 underline whitespace-nowrap">
        Anzeigen
      </button>
    </div>

    <!-- ═══ HEADER ═══ -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Buchhaltung</h1>
        <p class="text-sm text-gray-500 mt-0.5">Einnahmen & Ausgaben · Geschäftsjahr {{ selectedYear }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Year selector -->
        <select v-model="selectedYear" @change="loadAll"
          class="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm">
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>

        <button @click="openNewEntry('expense')"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Ausgabe
        </button>

        <button @click="openNewEntry('income')"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Einnahme
        </button>

        <button @click="showQrModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16m0 0v.5M20 16h.5M4 6h4v4H4V6zm12 0h4v4h-4V6zM4 14h4v4H4v-4z"/></svg>
          <span class="hidden sm:inline">QR-Rechnung</span>
        </button>

        <button @click="exportPdf" :disabled="exporting"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50">
          <svg class="h-4 w-4" :class="{ 'animate-spin': exporting }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span class="hidden sm:inline">{{ exporting ? 'Erstelle PDF…' : 'Jahres-PDF' }}</span>
        </button>

        <button @click="loadAll" :disabled="loading"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50 shadow-sm">
          <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
    </div>

    <!-- ═══ KPI CARDS ═══ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-sm p-5">
        <p class="text-xs font-semibold text-emerald-100 uppercase tracking-widest mb-2">Einnahmen</p>
        <p class="text-2xl font-bold text-white">{{ chf(summary.total_income_rappen) }}</p>
        <p class="text-xs text-emerald-200 mt-1">Total {{ selectedYear }}</p>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Ausgaben</p>
        <p class="text-2xl font-bold text-red-500">{{ chf(summary.total_expense_rappen) }}</p>
        <p class="text-xs text-gray-400 mt-1">Total {{ selectedYear }}</p>
      </div>
      <div class="rounded-2xl shadow-sm p-5" :class="summary.result_rappen >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'">
        <p class="text-xs font-semibold uppercase tracking-widest mb-2" :class="summary.result_rappen >= 0 ? 'text-emerald-500' : 'text-red-500'">Ergebnis</p>
        <p class="text-2xl font-bold" :class="summary.result_rappen >= 0 ? 'text-emerald-700' : 'text-red-700'">{{ chf(summary.result_rappen) }}</p>
        <p class="text-xs mt-1" :class="summary.result_rappen >= 0 ? 'text-emerald-500' : 'text-red-400'">{{ summary.result_rappen >= 0 ? 'Gewinn' : 'Verlust' }}</p>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Buchungen</p>
        <p class="text-2xl font-bold text-gray-900">{{ entries.length }}</p>
        <p class="text-xs text-gray-400 mt-1">Manuelle Einträge</p>
      </div>
    </div>

    <!-- ═══ MONATSBALKEN (mini chart) ═══ -->
    <div v-if="monthly.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm font-semibold text-gray-700">Monatliche Übersicht {{ selectedYear }}</p>
        <button v-if="selectedMonth" @click="selectedMonth = ''"
          class="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Filter zurücksetzen
        </button>
      </div>
      <div class="flex items-end gap-1.5 h-28 overflow-x-auto pb-1">
        <div v-for="m in monthly" :key="m.month"
          class="flex-1 min-w-[36px] flex flex-col items-center gap-1 cursor-pointer group"
          @click="selectedMonth = selectedMonth === String(m.month) ? '' : String(m.month)">
          <div class="w-full flex flex-col items-center gap-0.5 transition-opacity"
            :class="selectedMonth && selectedMonth !== String(m.month) ? 'opacity-30' : ''">
            <div class="w-full rounded-t transition-all group-hover:brightness-90"
              :style="{ height: barHeight(m.income_rappen) + 'px', background: '#10b981', minHeight: m.income_rappen > 0 ? '3px' : '0' }"
              :title="`Einnahmen: ${chf(m.income_rappen)}`"></div>
            <div class="w-full rounded-t transition-all group-hover:brightness-90"
              :style="{ height: barHeight(m.expense_rappen) + 'px', background: '#ef4444', minHeight: m.expense_rappen > 0 ? '3px' : '0' }"
              :title="`Ausgaben: ${chf(m.expense_rappen)}`"></div>
          </div>
          <span class="text-[10px] leading-none transition-colors"
            :class="selectedMonth === String(m.month) ? 'text-emerald-600 font-bold' : 'text-gray-400 group-hover:text-gray-600'">
            {{ m.label }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-4 mt-3">
        <span class="flex items-center gap-1.5 text-xs text-gray-500"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>Einnahmen</span>
        <span class="flex items-center gap-1.5 text-xs text-gray-500"><span class="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>Ausgaben</span>
        <span v-if="!selectedMonth" class="text-xs text-gray-400 ml-auto">Monat anklicken für Details</span>
      </div>

      <!-- Monats-Tabelle immer sichtbar -->
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="pb-2 text-left font-semibold text-gray-400 uppercase tracking-widest pl-1">Monat</th>
              <th class="pb-2 text-right font-semibold text-emerald-600 uppercase tracking-widest">Einnahmen</th>
              <th class="pb-2 text-right font-semibold text-red-500 uppercase tracking-widest">Ausgaben</th>
              <th class="pb-2 text-right font-semibold text-gray-500 uppercase tracking-widest">Ergebnis</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="m in monthly.filter(m => m.income_rappen > 0 || m.expense_rappen > 0)" :key="m.month">
              <!-- Summary row -->
              <tr class="cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-50"
                :class="selectedMonth === String(m.month) ? 'bg-emerald-50/50' : ''"
                @click="selectedMonth = selectedMonth === String(m.month) ? '' : String(m.month)">
                <td class="py-2.5 pl-1 font-medium text-gray-700">
                  <span class="flex items-center gap-2">
                    <svg class="w-3 h-3 text-gray-400 transition-transform flex-shrink-0"
                      :class="selectedMonth === String(m.month) ? 'rotate-90' : ''"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                    </svg>
                    {{ m.label }} {{ selectedYear }}
                  </span>
                </td>
                <td class="py-2.5 text-right font-mono text-emerald-700 font-semibold">{{ chf(m.income_rappen) }}</td>
                <td class="py-2.5 text-right font-mono text-red-600">{{ m.expense_rappen > 0 ? chf(m.expense_rappen) : '–' }}</td>
                <td class="py-2.5 text-right font-mono font-bold"
                  :class="m.result_rappen >= 0 ? 'text-emerald-700' : 'text-red-600'">
                  {{ m.result_rappen >= 0 ? '+' : '' }}{{ chf(m.result_rappen) }}
                </td>
              </tr>
              <!-- Inline entries for this month -->
              <template v-if="selectedMonth === String(m.month)">
                <tr v-if="entriesForMonth(m.month).length === 0">
                  <td colspan="4" class="py-2 pl-7 text-gray-400 italic bg-gray-50/70">
                    Keine manuellen Buchungen — Einnahmen kommen aus Zahlungen
                  </td>
                </tr>
                <tr v-for="entry in entriesForMonth(m.month)" :key="entry.id"
                  class="bg-gray-50/70 border-t border-gray-100">
                  <td class="py-1.5 pl-7 text-gray-600">
                    <span class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        :class="entry.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'"></span>
                      <span>{{ new Date(entry.entry_date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }) }}</span>
                      <span class="truncate max-w-[180px]">{{ entry.description }}</span>
                    </span>
                  </td>
                  <td class="py-1.5 text-right font-mono"
                    :class="entry.type === 'income' ? 'text-emerald-600' : 'text-gray-400'">
                    {{ entry.type === 'income' ? chf(entry.amount_rappen) : '–' }}
                  </td>
                  <td class="py-1.5 text-right font-mono"
                    :class="entry.type === 'expense' ? 'text-red-500' : 'text-gray-400'">
                    {{ entry.type === 'expense' ? chf(entry.amount_rappen) : '–' }}
                  </td>
                  <td class="py-1.5 text-right">
                    <span v-if="entry.category" class="text-gray-400">{{ entry.category.name }}</span>
                  </td>
                </tr>
                <tr class="bg-gray-50/70 border-t border-gray-100">
                  <td colspan="4" class="py-1.5 pl-7 text-gray-400 italic text-[11px]">
                    + Zahlungseingänge aus Unterrichtsbuchungen (CHF {{ ((m.income_rappen - entriesForMonth(m.month).filter(e => e.type === 'income').reduce((s,e) => s + e.amount_rappen, 0)) / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 }) }}) sind im Total enthalten
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ FILTER + TABELLE ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      <!-- Filter bar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 p-4 border-b border-gray-100">
        <div class="flex-1 relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Suchen…"
            class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </div>
        <div class="flex gap-2">
          <button v-for="t in typeFilters" :key="t.value"
            @click="activeTypeFilter = t.value; showOnlyMissingReceipt = false"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            :class="activeTypeFilter === t.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
            {{ t.label }}
          </button>
        </div>
        <select v-model="selectedMonth"
          class="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Alle Monate</option>
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">Datum</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">Beschreibung</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Kategorie</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-widest">Betrag</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Beleg</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Bezahlt</th>
              <th class="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-10 text-center text-gray-400">
                <svg class="animate-spin h-5 w-5 mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Lade Buchungen…
              </td>
            </tr>
            <tr v-else-if="!filteredEntries.length">
              <td colspan="7" class="px-4 py-10 text-center text-gray-400 text-sm">
                Keine Buchungen gefunden
              </td>
            </tr>
            <template v-else>
              <tr v-for="entry in filteredEntries" :key="entry.id"
                class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                :class="{
                  'opacity-50 bg-gray-50/80': entry.storno_of_id,
                  'bg-orange-50/30': entry.type === 'expense' && !entry.receipt_url && !entry.storno_of_id,
                }">
                <!-- Datum + Schloss-Icon -->
                <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <svg v-if="entry.locked_at" class="w-3 h-3 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" title="Buchung gesperrt (OR Art. 957a)">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                    </svg>
                    <span>{{ fmtDate(entry.entry_date) }}</span>
                  </div>
                </td>

                <!-- Beschreibung -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2 h-2 rounded-full flex-shrink-0"
                      :class="entry.storno_of_id ? 'bg-gray-300' : (entry.type === 'income' ? 'bg-emerald-400' : 'bg-red-400')"></span>
                    <span class="text-sm truncate max-w-[220px]"
                      :class="entry.storno_of_id ? 'line-through text-gray-400' : 'text-gray-900'">
                      {{ entry.description }}
                    </span>
                    <!-- Storno-Badge -->
                    <span v-if="entry.storno_of_id"
                      class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      Storno
                    </span>
                    <!-- Beleg-Warning -->
                    <span v-if="entry.type === 'expense' && !entry.receipt_url && !entry.storno_of_id"
                      class="flex-shrink-0 w-4 h-4 rounded-full bg-orange-400 text-white flex items-center justify-center"
                      title="Kein Beleg — steuerlich nicht gesichert">
                      <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </span>
                  </div>
                  <p v-if="entry.creditor_name" class="text-xs text-gray-400 mt-0.5 ml-4">{{ entry.creditor_name }}</p>
                </td>

                <!-- Kategorie -->
                <td class="px-4 py-3 hidden sm:table-cell">
                  <span v-if="entry.category" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    <span class="w-2 h-2 rounded-full" :style="{ background: entry.category.color }"></span>
                    {{ entry.category.name }}
                  </span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>

                <!-- Betrag -->
                <td class="px-4 py-3 text-right font-semibold whitespace-nowrap"
                  :class="entry.storno_of_id ? 'text-gray-400 line-through' : (entry.type === 'income' ? 'text-emerald-600' : 'text-red-500')">
                  {{ entry.type === 'income' ? '+' : '−' }}{{ chf(entry.amount_rappen) }}
                </td>

                <!-- Beleg -->
                <td class="px-4 py-3 text-center hidden md:table-cell">
                  <a v-if="entry.receipt_url" :href="entry.receipt_url" target="_blank"
                    class="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    Beleg
                  </a>
                  <span v-else-if="entry.type === 'expense' && !entry.storno_of_id"
                    class="text-xs text-orange-400 font-medium">Fehlt</span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>

                <!-- Bezahlt -->
                <td class="px-4 py-3 text-center hidden lg:table-cell">
                  <span v-if="entry.type === 'expense' && !entry.storno_of_id" class="inline-flex items-center gap-1 text-xs font-medium"
                    :class="entry.is_paid ? 'text-emerald-600' : 'text-amber-500'">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path v-if="entry.is_paid" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      <circle v-else cx="10" cy="10" r="8"/>
                    </svg>
                    {{ entry.is_paid ? 'Bezahlt' : 'Offen' }}
                  </span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>

                <!-- Aktionen -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <!-- Gesperrte Buchung: nur Storno möglich -->
                    <template v-if="entry.locked_at && !entry.storno_of_id">
                      <button @click="confirmStorno(entry)"
                        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Storno-Buchung erstellen (OR-konforme Korrektur)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                      </button>
                    </template>
                    <!-- Offene Buchung: bearbeiten + löschen -->
                    <template v-else-if="!entry.locked_at && !entry.storno_of_id">
                      <button @click="openEdit(entry)"
                        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Bearbeiten">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button v-if="entry.type === 'expense' && entry.creditor_iban"
                        @click="openPain001([entry])"
                        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Zahlungsfile erstellen (pain.001)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                      </button>
                      <button @click="confirmDelete(entry)"
                        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Löschen">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Table footer totals -->
      <div v-if="filteredEntries.length" class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-4 py-3 bg-gray-50/50 border-t border-gray-100">
        <p class="text-xs text-gray-400">{{ filteredEntries.length }} Einträge</p>
        <div class="flex items-center gap-4 text-sm">
          <span class="text-emerald-600 font-semibold">+ {{ chf(filteredIncome) }}</span>
          <span class="text-red-500 font-semibold">− {{ chf(filteredExpense) }}</span>
          <span class="font-bold" :class="(filteredIncome - filteredExpense) >= 0 ? 'text-gray-900' : 'text-red-600'">
            = {{ chf(filteredIncome - filteredExpense) }}
          </span>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: Buchung erstellen / bearbeiten ═══ -->
    <Teleport to="body">
      <div v-if="showEntryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeEntryModal"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">
              {{ editingEntry ? 'Buchung bearbeiten' : (entryForm.type === 'expense' ? 'Neue Ausgabe' : 'Neue Einnahme') }}
            </h2>
            <button @click="closeEntryModal" class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Type toggle (only for new entries) -->
            <div v-if="!editingEntry" class="flex rounded-xl overflow-hidden border border-gray-200">
              <button @click="entryForm.type = 'expense'"
                class="flex-1 py-2 text-sm font-semibold transition-colors"
                :class="entryForm.type === 'expense' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'">
                Ausgabe
              </button>
              <button @click="entryForm.type = 'income'"
                class="flex-1 py-2 text-sm font-semibold transition-colors"
                :class="entryForm.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'">
                Einnahme
              </button>
            </div>

            <!-- Date + Amount -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Datum *</label>
                <input v-model="entryForm.entry_date" type="date"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Betrag CHF *</label>
                <input v-model="entryForm.amount_chf" type="number" step="0.05" min="0.05"
                  placeholder="0.00"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Beschreibung *</label>
              <input v-model="entryForm.description" type="text" placeholder="z.B. Büromaterial, Versicherung…"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
            </div>

            <!-- Category -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Kategorie</label>
              <select v-model="entryForm.category_id"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Ohne Kategorie</option>
                <option v-for="cat in filteredCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <!-- Creditor (for expenses) -->
            <template v-if="entryForm.type === 'expense'">
              <div class="border-t border-gray-100 pt-4 space-y-3">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Lieferant / Zahlungsempfänger</p>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                  <input v-model="entryForm.creditor_name" type="text" placeholder="Firma oder Person"
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">IBAN</label>
                    <input v-model="entryForm.creditor_iban" type="text" placeholder="CH…"
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-xs"/>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Referenz (QR/ISR)</label>
                    <input v-model="entryForm.payment_reference" type="text" placeholder="00000…"
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-xs"/>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="entryForm.is_paid" type="checkbox" class="w-4 h-4 rounded text-emerald-500"/>
                    <span class="text-sm text-gray-700">Bereits bezahlt</span>
                  </label>
                  <input v-if="entryForm.is_paid" v-model="entryForm.paid_date" type="date"
                    class="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                </div>
              </div>
            </template>

            <!-- Receipt upload -->
            <div class="border-t border-gray-100 pt-4">
              <label class="block text-xs font-semibold text-gray-500 mb-2">Beleg (PDF, Bild)</label>
              <div v-if="entryForm.receipt_url" class="flex items-center gap-2 mb-2">
                <a :href="entryForm.receipt_url" target="_blank" class="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  {{ entryForm.receipt_filename || 'Beleg anzeigen' }}
                </a>
                <button @click="entryForm.receipt_url = ''; entryForm.receipt_filename = ''" class="text-xs text-red-400 hover:text-red-600">Entfernen</button>
              </div>
              <label v-if="!entryForm.receipt_url"
                class="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors text-sm text-gray-400 hover:text-emerald-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <span>{{ uploadingReceipt ? 'Wird hochgeladen…' : 'Beleg hochladen' }}</span>
                <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp"
                  @change="uploadReceipt" :disabled="uploadingReceipt"/>
              </label>
              <p v-if="uploadError" class="text-xs text-red-500 mt-1">{{ uploadError }}</p>
            </div>

            <!-- MWST (optional) -->
            <div class="border-t border-gray-100 pt-4">
              <details>
                <summary class="text-xs font-semibold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600">MWST (optional)</summary>
                <div class="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">MWST-Satz %</label>
                    <select v-model="entryForm.vat_rate" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option value="">Kein MWST</option>
                      <option value="8.1">8.1% (Normalsatz)</option>
                      <option value="2.6">2.6% (Sondersatz)</option>
                      <option value="3.8">3.8% (Beherbergung)</option>
                      <option value="0">0% (ausgenommen)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">MWST-Betrag CHF</label>
                    <input v-model="entryForm.vat_amount_chf" type="number" step="0.05" min="0" placeholder="0.00"
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                  </div>
                </div>
              </details>
            </div>

            <!-- External reference -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Externe Referenz (Rechnungsnummer etc.)</label>
              <input v-model="entryForm.external_reference" type="text" placeholder="optional"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
            </div>

            <p v-if="saveError" class="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{{ saveError }}</p>
          </div>

          <div class="flex gap-2 p-6 border-t border-gray-100">
            <button @click="closeEntryModal" class="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Abbrechen
            </button>
            <button @click="saveEntry" :disabled="saving"
              class="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
              :class="entryForm.type === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'">
              {{ saving ? 'Speichern…' : (editingEntry ? 'Aktualisieren' : 'Speichern') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ MODAL: QR-Rechnung scannen ═══ -->
    <Teleport to="body">
      <div v-if="showQrModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showQrModal = false; qrResult = null"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">QR-Rechnung einlesen</h2>
            <button @click="showQrModal = false; qrResult = null" class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <template v-if="!qrResult">
              <p class="text-sm text-gray-500">Lade eine Rechnung mit QR-Code hoch (PDF oder Bild). Die Zahlungsdaten werden automatisch ausgelesen.</p>
              <label class="flex flex-col items-center gap-3 px-6 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors"
                :class="{ 'opacity-50 pointer-events-none': scanningQr }">
                <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16m0 0v.5M20 16h.5M4 6h4v4H4V6zm12 0h4v4h-4V6zM4 14h4v4H4v-4z"/></svg>
                <span class="text-sm text-gray-400">{{ scanningQr ? 'Wird eingelesen…' : 'PDF oder Bild auswählen' }}</span>
                <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg" @change="scanQr" :disabled="scanningQr"/>
              </label>
              <p v-if="qrError" class="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{{ qrError }}</p>
            </template>

            <template v-else>
              <div class="space-y-3">
                <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">
                  <p class="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Erkannte Daten</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div><p class="text-xs text-gray-400">Empfänger</p><p class="font-medium text-gray-900">{{ qrResult.creditor_name ?? '—' }}</p></div>
                    <div><p class="text-xs text-gray-400">Betrag</p><p class="font-medium text-gray-900">{{ qrResult.amount_rappen != null ? chf(qrResult.amount_rappen) : '—' }}</p></div>
                    <div class="col-span-2"><p class="text-xs text-gray-400">IBAN</p><p class="font-mono text-xs text-gray-700">{{ qrResult.iban }}</p></div>
                    <div v-if="qrResult.reference" class="col-span-2"><p class="text-xs text-gray-400">Referenz ({{ qrResult.reference_type }})</p><p class="font-mono text-xs text-gray-700">{{ qrResult.reference }}</p></div>
                    <div v-if="qrResult.additional_info" class="col-span-2"><p class="text-xs text-gray-400">Mitteilung</p><p class="text-sm text-gray-700">{{ qrResult.additional_info }}</p></div>
                  </div>
                </div>
              </div>
              <p class="text-xs text-gray-400 text-center">Soll eine Ausgabenbuchung aus diesen Daten erstellt werden?</p>
            </template>
          </div>

          <div v-if="qrResult" class="flex gap-2 p-6 border-t border-gray-100">
            <button @click="qrResult = null" class="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Nochmal scannen
            </button>
            <button @click="useQrData" class="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors">
              Als Ausgabe erfassen
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ MODAL: pain.001 Zahlungsfile ═══ -->
    <Teleport to="body">
      <div v-if="showPain001Modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showPain001Modal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">Zahlungsfile erstellen</h2>
            <button @click="showPain001Modal = false" class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <p class="text-sm text-gray-500">Das pain.001-XML kann bei jeder Schweizer Bank (UBS, PostFinance, ZKB, Raiffeisen, etc.) hochgeladen werden um die Zahlung auszulösen.</p>

            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Deine IBAN (Zahlungskonto) *</label>
              <input v-model="pain001Form.debtor_iban" type="text" placeholder="CH…"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Ausführungsdatum *</label>
              <input v-model="pain001Form.execution_date" type="date"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
            </div>

            <div class="bg-gray-50 rounded-xl p-3 space-y-1">
              <p class="text-xs font-semibold text-gray-500 mb-2">Zahlungen</p>
              <div v-for="e in pain001Entries" :key="e.id" class="flex justify-between text-sm">
                <span class="text-gray-700 truncate max-w-[250px]">{{ e.creditor_name || e.description }}</span>
                <span class="font-semibold text-red-500 ml-2">{{ chf(e.amount_rappen) }}</span>
              </div>
              <div class="border-t border-gray-200 pt-1 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span class="text-red-500">{{ chf(pain001Entries.reduce((s, e) => s + e.amount_rappen, 0)) }}</span>
              </div>
            </div>

            <p v-if="pain001Error" class="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{{ pain001Error }}</p>
          </div>
          <div class="flex gap-2 p-6 border-t border-gray-100">
            <button @click="showPain001Modal = false" class="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Abbrechen
            </button>
            <button @click="downloadPain001" :disabled="generatingPain001"
              class="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50">
              {{ generatingPain001 ? 'Erstelle XML…' : 'XML herunterladen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface AccountingCategory { id: string; name: string; type: string; color: string; vat_rate?: number | null }
interface AccountingEntry {
  id: string
  type: 'income' | 'expense'
  amount_rappen: number
  entry_date: string
  description: string
  category_id?: string | null
  category?: AccountingCategory | null
  receipt_url?: string | null
  receipt_filename?: string | null
  vat_rate?: number | null
  vat_amount_rappen?: number | null
  qr_data?: Record<string, unknown> | null
  creditor_name?: string | null
  creditor_iban?: string | null
  payment_reference?: string | null
  is_paid?: boolean
  paid_date?: string | null
  external_reference?: string | null
  locked_at?: string | null
  storno_of_id?: string | null
}

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref('')
const availableYears = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)

const selectedMonthData = computed(() =>
  selectedMonth.value
    ? monthly.value.find(m => String(m.month) === selectedMonth.value) ?? null
    : null
)

function entriesForMonth(month: number) {
  const mStr = String(month).padStart(2, '0')
  return entries.value
    .filter(e => e.entry_date?.slice(5, 7) === mStr)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
}

// ─── Pending staff expenses ───────────────────────────────────────────────────
interface PendingExpense {
  id: string
  amount_rappen: number
  description: string
  entry_date: string
  receipt_url: string | null
  receipt_filename: string | null
  notes: string | null
  created_at: string
  submitter: { first_name: string; last_name: string; email: string } | null
}
const pendingExpenses = ref<PendingExpense[]>([])
const approving = ref<string | null>(null)

async function loadPendingExpenses() {
  try {
    const res = await $fetch<{ success: boolean; data: PendingExpense[] }>('/api/admin/accounting/pending-expenses')
    pendingExpenses.value = res.data ?? []
  } catch {}
}

async function handleExpense(id: string, action: 'approve' | 'reject', reason?: string) {
  approving.value = id
  try {
    await $fetch('/api/admin/accounting/approve-expense', {
      method: 'POST',
      body: { id, action, rejection_reason: reason },
    })
    pendingExpenses.value = pendingExpenses.value.filter(e => e.id !== id)
    if (action === 'approve') await loadAll() // refresh entries list
  } catch (err: any) {
    alert(err.data?.statusMessage ?? 'Fehler')
  } finally {
    approving.value = null
  }
}

async function rejectWithReason(expense: PendingExpense) {
  const reason = prompt(`Ablehnungsgrund für "${expense.description}":\n(optional)`) ?? ''
  await handleExpense(expense.id, 'reject', reason)
}

const loading = ref(false)
const exporting = ref(false)
const entries = ref<AccountingEntry[]>([])
const categories = ref<AccountingCategory[]>([])
const summary = ref({ total_income_rappen: 0, total_expense_rappen: 0, result_rappen: 0 })
const monthly = ref<{ month: number; label: string; income_rappen: number; expense_rappen: number; result_rappen: number }[]>([])
const searchQuery = ref('')
const activeTypeFilter = ref('all')
const showOnlyMissingReceipt = ref(false)

// Disclaimer: einmal pro Tag anzeigen
const disclaimerDismissed = ref(false)
function dismissDisclaimer() {
  disclaimerDismissed.value = true
  if (process.client) {
    localStorage.setItem('accounting_disclaimer_dismissed', new Date().toDateString())
  }
}
onMounted(() => {
  if (process.client) {
    const stored = localStorage.getItem('accounting_disclaimer_dismissed')
    disclaimerDismissed.value = stored === new Date().toDateString()
  }
})

const typeFilters = [
  { value: 'all', label: 'Alle' },
  { value: 'income', label: 'Einnahmen' },
  { value: 'expense', label: 'Ausgaben' },
]

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2024, i, 1).toLocaleDateString('de-CH', { month: 'long' }),
}))

const filteredCategories = computed(() =>
  categories.value.filter(c => c.type === entryForm.type)
)

const entriesWithoutReceipt = computed(() =>
  entries.value.filter(e => e.type === 'expense' && !e.receipt_url && !e.storno_of_id && !e.deleted_at).length
)

const filteredEntries = computed(() => {
  let list = [...entries.value]
  if (activeTypeFilter.value !== 'all') list = list.filter(e => e.type === activeTypeFilter.value)
  if (showOnlyMissingReceipt.value) list = list.filter(e => e.type === 'expense' && !e.receipt_url && !e.storno_of_id)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.creditor_name?.toLowerCase().includes(q) ||
      e.category?.name.toLowerCase().includes(q) ||
      e.external_reference?.toLowerCase().includes(q)
    )
  }
  if (selectedMonth.value) {
    const m = selectedMonth.value.padStart(2, '0')
    list = list.filter(e => e.entry_date?.slice(5, 7) === m)
  }
  return list
})

const filteredIncome = computed(() => filteredEntries.value.filter(e => e.type === 'income').reduce((s, e) => s + e.amount_rappen, 0))
const filteredExpense = computed(() => filteredEntries.value.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount_rappen, 0))

// Bar chart helpers
const maxBarValue = computed(() => Math.max(...monthly.value.map(m => Math.max(m.income_rappen, m.expense_rappen)), 1))
const barHeight = (val: number) => Math.max(0, Math.round((val / maxBarValue.value) * 88))

// ─── Load data ───────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadSummary(), loadEntries(), loadCategories()])
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  const data = await $fetch(`/api/admin/accounting/summary?year=${selectedYear.value}`)
  if (data.success) {
    summary.value = data.summary
    monthly.value = data.monthly
  }
}

async function loadEntries() {
  const data = await $fetch(`/api/admin/accounting/entries?year=${selectedYear.value}`)
  if (data.success) entries.value = data.data
}

async function loadCategories() {
  if (categories.value.length) return
  const data = await $fetch('/api/admin/accounting/categories')
  if (data.success) {
    if (!data.data.length) {
      await $fetch('/api/admin/accounting/init-categories', { method: 'POST' })
      const fresh = await $fetch('/api/admin/accounting/categories')
      categories.value = fresh.data
    } else {
      categories.value = data.data
    }
  }
}

onMounted(() => { loadAll(); loadPendingExpenses() })

// ─── Format helpers ───────────────────────────────────────────────────────────
function chf(rappen: number): string {
  return `CHF ${((rappen ?? 0) / 100).toFixed(2)}`
}
function fmtDate(d: string): string {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('de-CH') } catch { return d }
}

// ─── Entry modal ─────────────────────────────────────────────────────────────
const showEntryModal = ref(false)
const editingEntry = ref<AccountingEntry | null>(null)
const saving = ref(false)
const saveError = ref('')
const uploadingReceipt = ref(false)
const uploadError = ref('')

const defaultForm = () => ({
  type: 'expense' as 'income' | 'expense',
  entry_date: new Date().toISOString().split('T')[0],
  amount_chf: '',
  description: '',
  category_id: '',
  creditor_name: '',
  creditor_iban: '',
  payment_reference: '',
  is_paid: false,
  paid_date: '',
  vat_rate: '',
  vat_amount_chf: '',
  external_reference: '',
  receipt_url: '',
  receipt_filename: '',
})

const entryForm = reactive(defaultForm())

function openNewEntry(type: 'income' | 'expense') {
  editingEntry.value = null
  Object.assign(entryForm, defaultForm())
  entryForm.type = type
  saveError.value = ''
  showEntryModal.value = true
}

function openEdit(entry: AccountingEntry) {
  editingEntry.value = entry
  Object.assign(entryForm, {
    type: entry.type,
    entry_date: entry.entry_date,
    amount_chf: ((entry.amount_rappen ?? 0) / 100).toFixed(2),
    description: entry.description,
    category_id: entry.category_id ?? '',
    creditor_name: entry.creditor_name ?? '',
    creditor_iban: entry.creditor_iban ?? '',
    payment_reference: entry.payment_reference ?? '',
    is_paid: entry.is_paid ?? false,
    paid_date: entry.paid_date ?? '',
    vat_rate: entry.vat_rate != null ? String(entry.vat_rate) : '',
    vat_amount_chf: entry.vat_amount_rappen != null ? ((entry.vat_amount_rappen) / 100).toFixed(2) : '',
    external_reference: entry.external_reference ?? '',
    receipt_url: entry.receipt_url ?? '',
    receipt_filename: entry.receipt_filename ?? '',
  })
  saveError.value = ''
  showEntryModal.value = true
}

function closeEntryModal() {
  showEntryModal.value = false
  editingEntry.value = null
}

async function uploadReceipt(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingReceipt.value = true
  uploadError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch('/api/admin/accounting/upload-receipt', { method: 'POST', body: fd })
    if (res.success) {
      entryForm.receipt_url = res.url ?? ''
      entryForm.receipt_filename = res.filename ?? file.name
    }
  } catch (err: unknown) {
    uploadError.value = (err as { statusMessage?: string })?.statusMessage ?? 'Upload fehlgeschlagen'
  } finally {
    uploadingReceipt.value = false
  }
}

async function saveEntry() {
  if (!entryForm.entry_date) { saveError.value = 'Datum fehlt'; return }
  if (!entryForm.amount_chf || parseFloat(String(entryForm.amount_chf)) <= 0) { saveError.value = 'Betrag fehlt oder ungültig'; return }
  if (!entryForm.description.trim()) { saveError.value = 'Beschreibung fehlt'; return }

  saving.value = true
  saveError.value = ''
  try {
    const payload = {
      type: entryForm.type,
      entry_date: entryForm.entry_date,
      amount_rappen: Math.round(parseFloat(String(entryForm.amount_chf)) * 100),
      description: entryForm.description.trim(),
      category_id: entryForm.category_id || null,
      creditor_name: entryForm.creditor_name || null,
      creditor_iban: entryForm.creditor_iban || null,
      payment_reference: entryForm.payment_reference || null,
      is_paid: entryForm.is_paid,
      paid_date: entryForm.paid_date || null,
      vat_rate: entryForm.vat_rate ? parseFloat(String(entryForm.vat_rate)) : null,
      vat_amount_rappen: entryForm.vat_amount_chf ? Math.round(parseFloat(String(entryForm.vat_amount_chf)) * 100) : null,
      external_reference: entryForm.external_reference || null,
      receipt_url: entryForm.receipt_url || null,
      receipt_filename: entryForm.receipt_filename || null,
    }

    if (editingEntry.value) {
      await $fetch(`/api/admin/accounting/entries/${editingEntry.value.id}`, { method: 'PATCH', body: payload })
    } else {
      await $fetch('/api/admin/accounting/entries', { method: 'POST', body: payload })
    }

    closeEntryModal()
    await loadAll()
  } catch (err: unknown) {
    saveError.value = (err as { statusMessage?: string })?.statusMessage ?? 'Fehler beim Speichern'
  } finally {
    saving.value = false
  }
}

async function confirmDelete(entry: AccountingEntry) {
  if (!confirm(`"${entry.description}" wirklich löschen?`)) return
  try {
    await $fetch(`/api/admin/accounting/entries/${entry.id}`, { method: 'DELETE' })
    await loadAll()
  } catch { /* ignore */ }
}

async function confirmStorno(entry: AccountingEntry) {
  if (!confirm(
    `Storno-Buchung für "${entry.description}" erstellen?\n\n` +
    `Eine Gegenbuchung über ${chf(entry.amount_rappen)} wird erstellt. ` +
    `Die Original-Buchung bleibt unveränderbar erhalten (OR Art. 957a).`
  )) return
  try {
    await $fetch(`/api/admin/accounting/entries/${entry.id}/storno`, { method: 'POST' })
    await loadAll()
  } catch (err: unknown) {
    alert((err as { statusMessage?: string })?.statusMessage ?? 'Storno fehlgeschlagen')
  }
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
async function exportPdf() {
  exporting.value = true
  try {
    const res = await fetch(`/api/admin/accounting/export-pdf?year=${selectedYear.value}`)
    if (!res.ok) throw new Error('Export fehlgeschlagen')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jahresabschluss_${selectedYear.value}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* ignore */ } finally {
    exporting.value = false
  }
}

// ─── QR Scan ─────────────────────────────────────────────────────────────────
const showQrModal = ref(false)
const scanningQr = ref(false)
const qrError = ref('')
const qrResult = ref<{
  iban: string; currency: string; amount_rappen: number | null
  reference_type: string; reference: string | null
  creditor_name: string | null; creditor_address: string | null
  additional_info: string | null
} | null>(null)

async function scanQr(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  scanningQr.value = true
  qrError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch('/api/admin/accounting/scan-qr', { method: 'POST', body: fd })
    if (res.success) qrResult.value = res.data
  } catch (err: unknown) {
    qrError.value = (err as { statusMessage?: string })?.statusMessage ?? 'QR-Scan fehlgeschlagen. Ist die Datei eine gültige QR-Rechnung?'
  } finally {
    scanningQr.value = false
  }
}

function useQrData() {
  if (!qrResult.value) return
  showQrModal.value = false
  const qr = qrResult.value
  openNewEntry('expense')
  nextTick(() => {
    entryForm.creditor_name = qr.creditor_name ?? ''
    entryForm.creditor_iban = qr.iban ?? ''
    entryForm.payment_reference = qr.reference ?? ''
    entryForm.description = qr.additional_info ?? qr.creditor_name ?? 'QR-Rechnung'
    if (qr.amount_rappen != null) entryForm.amount_chf = (qr.amount_rappen / 100).toFixed(2)
    entryForm.entry_date = new Date().toISOString().split('T')[0]
  })
  qrResult.value = null
}

// ─── pain.001 ─────────────────────────────────────────────────────────────────
const showPain001Modal = ref(false)
const pain001Entries = ref<AccountingEntry[]>([])
const pain001Error = ref('')
const generatingPain001 = ref(false)
const pain001Form = reactive({ debtor_iban: '', execution_date: new Date().toISOString().split('T')[0] })

function openPain001(entriesToPay: AccountingEntry[]) {
  pain001Entries.value = entriesToPay
  pain001Error.value = ''
  showPain001Modal.value = true
}

async function downloadPain001() {
  if (!pain001Form.debtor_iban.trim()) { pain001Error.value = 'Deine IBAN fehlt'; return }
  if (!pain001Form.execution_date) { pain001Error.value = 'Ausführungsdatum fehlt'; return }
  generatingPain001.value = true
  pain001Error.value = ''
  try {
    const payments = pain001Entries.value.map(e => ({
      end_to_end_id: `SIMY-${e.id.slice(0, 8).toUpperCase()}`,
      amount_chf: e.amount_rappen / 100,
      currency: 'CHF',
      iban: e.creditor_iban!,
      creditor_name: e.creditor_name || e.description,
      reference_type: e.qr_data?.reference_type as string ?? (e.payment_reference ? 'QRR' : 'NON'),
      reference: e.payment_reference || undefined,
      additional_info: e.description,
    }))

    const res = await fetch('/api/admin/accounting/generate-pain001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        debtor_iban: pain001Form.debtor_iban.replace(/\s/g, ''),
        execution_date: pain001Form.execution_date,
        payments,
      }),
    })

    if (!res.ok) throw new Error(await res.text())
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zahlung_${pain001Form.execution_date}.xml`
    a.click()
    URL.revokeObjectURL(url)
    showPain001Modal.value = false
  } catch (err: unknown) {
    pain001Error.value = (err as Error)?.message ?? 'Fehler beim Generieren'
  } finally {
    generatingPain001.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
