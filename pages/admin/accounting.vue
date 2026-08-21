<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">

    <!-- ═══ PENDING STAFF EXPENSES ═══ -->
    <div v-if="canWriteBooks && pendingExpenses.length > 0" class="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
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

    <!-- ═══ HAFTUNGS-DISCLAIMER ═══ -->
    <div v-if="!disclaimerDismissed"
      class="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
      <svg class="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>
      <p class="text-sm text-slate-700 flex-1">
        Simy Buchhaltung ist ein digitales Hilfsmittel. Es ersetzt keine professionelle Steuer-
        oder Rechtsberatung. Als Unternehmer tragen Sie die volle Verantwortung für die Korrektheit
        Ihrer Buchführung und Steuererklärungen. Belege 10 Jahre aufbewahren (OR Art. 958f).
      </p>
      <button @click="dismissDisclaimer"
        class="text-xs font-semibold text-slate-600 hover:text-slate-900 underline whitespace-nowrap">
        Verstanden
      </button>
    </div>

    <!-- ═══ BELEGE FEHLEN ═══ -->
    <div v-if="missingReceiptEntries.length > 0" id="missing-receipts"
      class="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
      <div class="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold">
            {{ missingReceiptEntries.length }}
          </span>
          <div>
            <p class="text-sm font-semibold text-orange-800">Buchungen ohne Beleg</p>
            <p class="text-xs text-orange-700">Spesen, Kreditoren und Ausgaben brauchen einen Originalbeleg (OR Art. 957a).</p>
          </div>
        </div>
        <button v-if="canWriteBooks" type="button" @click="showOnlyMissingReceipt = true; activeTypeFilter = 'all'"
          class="text-xs font-semibold text-orange-700 hover:text-orange-900 underline whitespace-nowrap">
          Im Journal
        </button>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="entry in missingReceiptEntries" :key="entry.id" class="px-5 py-3.5 flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-gray-900 truncate">{{ entry.description }}</span>
              <span class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                :class="entryKind(entry) === 'spesen' ? 'text-amber-800 bg-amber-50' : entryKind(entry) === 'creditor' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600 bg-gray-100'">
                {{ documentKindLabel(entryKind(entry)) }}
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ fmtDate(entry.entry_date) }}
              <span v-if="entry.creditor_name"> · {{ entry.creditor_name }}</span>
            </p>
          </div>
          <p class="flex-shrink-0 text-sm font-bold text-gray-900">{{ chf(entry.amount_rappen) }}</p>
          <label v-if="canWriteBooks"
            class="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            :class="attachingReceiptId === entry.id ? 'bg-orange-100 text-orange-700' : 'bg-orange-500 hover:bg-orange-600 text-white'">
            {{ attachingReceiptId === entry.id ? 'Wird verknüpft…' : 'Beleg hochladen' }}
            <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp"
              :disabled="attachingReceiptId === entry.id"
              @change="attachReceiptToEntry(entry, $event)"/>
          </label>
        </div>
      </div>
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

        <button v-if="canWriteBooks" @click="openNewEntry('expense')"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Ausgabe
        </button>

        <button v-if="canWriteBooks" @click="openNewEntry('income')"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Einnahme
        </button>

        <button v-if="canWriteBooks" @click="showQrModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16m0 0v.5M20 16h.5M4 6h4v4H4V6zm12 0h4v4h-4V6zM4 14h4v4H4v-4z"/></svg>
          <span class="hidden sm:inline">QR-Rechnung</span>
        </button>

        <button v-if="canWriteBooks" @click="showCamtModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5">
          <span class="hidden sm:inline">Kontoauszug</span>
        </button>

        <button @click="exportPdf" :disabled="exporting"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50">
          <svg class="h-4 w-4" :class="{ 'animate-spin': exporting }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span class="hidden sm:inline">{{ exporting ? 'Erstelle PDF…' : 'Jahres-PDF' }}</span>
        </button>

        <button @click="exportArchive" :disabled="exportingArchive"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50">
          <span class="hidden sm:inline">{{ exportingArchive ? 'ZIP…' : 'Voll-Export' }}</span>
        </button>

        <button @click="downloadCsv('bookings')" :disabled="exportingCsv"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm disabled:opacity-50">
          <span class="hidden sm:inline">{{ exportingCsv ? 'CSV…' : 'CSV' }}</span>
        </button>
        <label v-if="canWriteBooks"
          title="Semikolon-CSV wie der Export: datum;typ;beleg_art;betrag_chf;beschreibung;kategorie;…"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer">
          {{ importingCsv ? 'Import…' : 'CSV import' }}
          <input type="file" accept=".csv,text/csv" class="hidden" :disabled="importingCsv" @change="importCsv"/>
        </label>

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
        <p class="text-xs text-gray-400 mt-1">Buchungen im Journal</p>
      </div>
    </div>

    <!-- ═══ VERMÖGENSLAGE (OR 957 Abs. 2) ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <p class="text-sm font-semibold text-gray-700">Vermögenslage</p>
          <p class="text-xs text-gray-400">Kasse, Bank, offene Forderungen und Verbindlichkeiten · {{ assets.as_of || 'heute' }}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="rounded-xl bg-slate-50 px-3 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Kasse</p>
          <p class="text-lg font-bold text-slate-800">{{ chf(assets.cash_rappen) }}</p>
          <p class="text-[11px] text-slate-400">Büro {{ chf(assets.office_cash_rappen) }} · Staff {{ chf(assets.staff_cash_rappen) }}</p>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Bank</p>
          <div class="flex items-center gap-2">
            <p class="text-lg font-bold text-slate-800">{{ chf(assets.bank_rappen) }}</p>
            <button v-if="canWriteBooks" @click="editBank = !editBank" class="text-[11px] text-slate-500 underline">ändern</button>
          </div>
          <div v-if="editBank" class="mt-2 flex items-center gap-2">
            <input v-model="bankChfInput" type="number" step="0.05" min="0"
              class="w-28 px-2 py-1 text-xs border border-gray-200 rounded-lg"/>
            <button @click="saveBankBalance" :disabled="savingBank" class="text-xs font-semibold text-emerald-700">{{ savingBank ? '…' : 'Speichern' }}</button>
          </div>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Debitoren</p>
          <p class="text-lg font-bold text-slate-800">{{ chf(assets.receivables_rappen) }}</p>
          <p class="text-[11px] text-slate-400">offene Rechnungen</p>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Kreditoren</p>
          <p class="text-lg font-bold text-slate-800">{{ chf(assets.payables_rappen) }}</p>
          <p class="text-[11px] text-slate-400">unbezahlte Ausgaben</p>
        </div>
        <div class="rounded-xl px-3 py-3" :class="assets.net_assets_rappen >= 0 ? 'bg-emerald-50' : 'bg-red-50'">
          <p class="text-[11px] font-semibold uppercase tracking-widest" :class="assets.net_assets_rappen >= 0 ? 'text-emerald-500' : 'text-red-400'">Reinvermögen</p>
          <p class="text-lg font-bold" :class="assets.net_assets_rappen >= 0 ? 'text-emerald-800' : 'text-red-700'">{{ chf(assets.net_assets_rappen) }}</p>
        </div>
      </div>
      <div v-if="canWriteBooks" class="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Gezählter Kassenbestand CHF</label>
          <input v-model="countedCashChf" type="number" step="0.05" min="0" placeholder="0.00"
            class="w-40 px-3 py-2 text-sm border border-gray-200 rounded-xl"/>
        </div>
        <button @click="bookCashClose" :disabled="closingCash || countedCashChf === ''"
          class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
          {{ closingCash ? 'Buche…' : 'Kassendifferenz buchen' }}
        </button>
        <p class="text-xs text-slate-400 sm:mb-2">
          Nur die Differenz zwischen gezähltem Bargeld und Systembestand wird als Einnahme oder Ausgabe gebucht.
        </p>
      </div>
    </div>

    <!-- ═══ MWST QUARTALE ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <p class="text-sm font-semibold text-gray-700">MWST {{ selectedYear }}</p>
          <p class="text-xs text-gray-400">
            Effektive Methode · ESTV-Frist 60 Tage nach Quartalsende
            <span v-if="vat.tenant.uid_number"> · UID {{ vat.tenant.uid_number }}</span>
            · {{ vat.tenant.mwst_obligated ? 'pflichtig' : 'nicht als pflichtig hinterlegt' }}
          </p>
        </div>
        <NuxtLink to="/admin/profile" class="text-xs text-slate-500 underline">MWST-Einstellungen</NuxtLink>
      </div>

      <div v-if="!vat.tenant.mwst_obligated && vat.threshold_ratio >= 0.8"
        class="mb-4 rounded-xl border px-3 py-2.5 text-sm flex items-start gap-2"
        :class="vat.threshold_reached ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'">
        <span class="font-semibold">{{ vat.threshold_reached ? 'CHF 100’000 überschritten' : 'Nähe MWST-Schwelle' }}</span>
        <span>— Jahresumsatz {{ chf(vat.year_turnover_rappen) }} von CHF 100’000. Pflicht mit dem Treuhänder prüfen (Art. 10 MWSTG).</span>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="q in vat.quarters" :key="q.quarter"
          class="rounded-xl border px-3 py-3"
          :class="vatCardClass(q)">
          <div class="flex items-center justify-between mb-1">
            <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Q{{ q.quarter }}</p>
            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="vatBadgeClass(q.status)">{{ vatStatusLabel(q.status) }}</span>
          </div>
          <p class="text-lg font-bold text-slate-800">{{ chf(q.payable_rappen) }}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">
            USt {{ chf(q.output_vat_rappen) }} · VSt {{ chf(q.input_vat_rappen) }}
          </p>
          <p class="text-[11px] text-slate-400">Frist {{ fmtShortDate(q.deadline) }}</p>
          <p v-if="q.exempt_turnover_rappen" class="text-[11px] text-slate-400">befreit {{ chf(q.exempt_turnover_rappen) }}</p>
          <button @click="exportVatPdf(q.quarter)" :disabled="exportingVat === q.quarter"
            class="mt-2 text-xs font-semibold text-slate-600 underline disabled:opacity-50">
            {{ exportingVat === q.quarter ? 'PDF…' : 'Quartal-PDF' }}
          </button>
        </div>
      </div>
      <p class="text-[11px] text-slate-400 mt-3">
        Vorsteuer nur mit Beleg. Zahlungen mit Rechnung zählen nicht doppelt. Bitte mit dem Treuhänder prüfen — ersetzt keine ESTV-Abrechnung.
      </p>
    </div>

    <div v-if="!isAccountantViewer" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <p class="text-sm font-semibold text-gray-700">Treuhänder</p>
          <p class="text-xs text-gray-400">Zugang nur auf Buchhaltung und Lohn. Rechte jederzeit änderbar.</p>
        </div>
      </div>
      <form class="flex flex-col sm:flex-row gap-2 mb-4" @submit.prevent="inviteAccountant">
        <input v-model="accountantEmail" type="email" required placeholder="treuhand@kanzlei.ch"
          class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl"/>
        <select v-model="accountantInviteAccess" class="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white">
          <option value="read">Nur Lesen</option>
          <option value="write">Lesen & Schreiben</option>
        </select>
        <button :disabled="invitingAccountant" class="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">
          {{ invitingAccountant ? 'Sende…' : 'Einladen' }}
        </button>
      </form>
      <div v-if="accountants.length === 0" class="text-xs text-gray-400">Noch kein Treuhänder eingeladen.</div>
      <div v-else class="space-y-2">
        <div v-for="a in accountants" :key="a.id" class="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-t border-gray-50">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ a.email }}</p>
            <p class="text-[11px] text-gray-400">{{ a.accepted_at ? 'Aktiv' : 'Einladung offen' }} · seit {{ fmtShortDate(a.invited_at.slice(0, 10)) }}</p>
          </div>
          <select :value="a.access" @change="updateAccountantAccess(a.id, ($event.target as HTMLSelectElement).value)"
            class="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
            <option value="read">Nur Lesen</option>
            <option value="write">Lesen & Schreiben</option>
          </select>
          <button @click="revokeAccountant(a.id)" class="text-xs font-semibold text-red-600 underline">Entziehen</button>
        </div>
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
                    Keine Buchungen in diesem Monat
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

    <div class="flex flex-wrap gap-2">
      <button v-for="tab in ledgerTabs" :key="tab.value" type="button" @click="ledgerTab = tab.value"
        class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
        :class="ledgerTab === tab.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'">
        {{ tab.label }}
      </button>
    </div>

    <div v-if="upcomingRecurring.length" class="bg-white rounded-2xl border border-gray-100 px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
      <p class="text-sm text-gray-700 flex-1">
        Nächste wiederkehrende:
        <span class="font-semibold">{{ upcomingRecurring.map(r => `${r.description} ${fmtDate(r.next_due_date)}`).join(' · ') }}</span>
      </p>
      <button type="button" class="text-xs font-semibold text-slate-600 underline" @click="ledgerTab = 'recurring'">Verwalten</button>
    </div>

    <!-- ═══ FILTER + TABELLE ═══ -->
    <div v-show="ledgerTab === 'bookings'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      <!-- Filter bar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 p-4 border-b border-gray-100">
        <div class="flex-1 relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Suchen…"
            class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </div>
        <div class="flex flex-wrap gap-2">
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
              <th v-if="canWriteBooks" class="px-4 py-3 w-16"></th>
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
                  'bg-orange-50/30': requiresAccountingReceipt(entry) && !entry.receipt_url,
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
                    <span v-else-if="entry.linked_payment_id"
                      class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Zahlung
                    </span>
                    <span v-else-if="entryKind(entry) !== 'expense' && entryKind(entry) !== 'debtor'"
                      class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      :class="entryKind(entry) === 'contract' ? 'text-slate-700 bg-slate-100' : entryKind(entry) === 'spesen' ? 'text-amber-800 bg-amber-50' : 'text-indigo-700 bg-indigo-50'">
                      {{ documentKindLabel(entryKind(entry)) }}
                    </span>
                    <span v-else-if="entry.category?.name === 'Eigenverbrauch / Privat'"
                      class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                      Privat
                    </span>
                    <!-- Beleg-Warning -->
                    <span v-if="requiresAccountingReceipt(entry) && !entry.receipt_url"
                      class="flex-shrink-0 w-4 h-4 rounded-full bg-orange-400 text-white flex items-center justify-center"
                      title="Kein Beleg — steuerlich nicht gesichert">
                      <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </span>
                  </div>
                  <p v-if="entry.creditor_name" class="text-xs text-gray-400 mt-0.5 ml-4">{{ entry.creditor_name }}</p>
                  <p v-if="entry.notes" class="text-xs text-gray-400 mt-0.5 ml-4 italic truncate max-w-[280px]">{{ entry.notes }}</p>
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
                  :class="entry.storno_of_id ? 'text-gray-400 line-through' : entryKind(entry) === 'contract' ? 'text-slate-500' : (entry.type === 'income' ? 'text-emerald-600' : 'text-red-500')">
                  <span v-if="entryKind(entry) === 'contract' && !entry.amount_rappen">—</span>
                  <span v-else>{{ entry.type === 'income' ? '+' : '−' }}{{ chf(entry.amount_rappen) }}</span>
                </td>

                <!-- Beleg -->
                <td class="px-4 py-3 text-center hidden md:table-cell">
                  <a v-if="entry.receipt_url" :href="entry.receipt_url" target="_blank"
                    class="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    Beleg
                  </a>
                  <label v-else-if="requiresAccountingReceipt(entry) && canWriteBooks"
                    class="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-800 cursor-pointer">
                    {{ attachingReceiptId === entry.id ? '…' : 'Hochladen' }}
                    <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp"
                      :disabled="attachingReceiptId === entry.id"
                      @change="attachReceiptToEntry(entry, $event)"/>
                  </label>
                  <span v-else-if="requiresAccountingReceipt(entry)" class="text-xs text-orange-400 font-medium">Fehlt</span>
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
                <td v-if="canWriteBooks" class="px-4 py-3">
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <!-- Nach Grace / Zahlung / Sperre: Storno, Beleg nachreichen wenn manuell -->
                    <template v-if="!canEditMaterial(entry) && !entry.storno_of_id">
                      <button v-if="!entry.linked_payment_id && !entry.locked_at" @click="openEdit(entry)"
                        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Beleg oder Zahlstatus ergänzen">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                      </button>
                      <button @click="confirmStorno(entry)"
                        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Storno-Buchung erstellen (OR-konforme Korrektur)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                      </button>
                    </template>
                    <template v-else-if="canEditMaterial(entry)">
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

    <!-- ═══ JOURNAL SOLL/HABEN ═══ -->
    <div v-if="ledgerTab === 'journal'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-gray-800">Journal {{ selectedYear }}</p>
          <p class="text-xs text-gray-400">Automatische Soll/Haben-Zeilen aus den Buchungen</p>
        </div>
        <button type="button" @click="downloadCsv('journal')" class="text-xs font-semibold text-slate-600 underline shrink-0">CSV</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Datum</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Text</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Konto</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Soll</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Haben</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!journalLines.length">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-400">Noch keine Journalzeilen — werden beim Laden erzeugt.</td>
            </tr>
            <tr v-for="line in journalLines" :key="line.id" class="border-b border-gray-50">
              <td class="px-4 py-2.5 text-gray-600 whitespace-nowrap">{{ line.entry?.entry_date ? fmtDate(line.entry.entry_date) : '—' }}</td>
              <td class="px-4 py-2.5 text-gray-800 truncate max-w-[280px]">{{ line.entry?.description }}</td>
              <td class="px-4 py-2.5 font-mono text-xs text-gray-700">{{ line.account?.number }} {{ line.account?.name }}</td>
              <td class="px-4 py-2.5 text-right font-semibold text-gray-900">{{ line.debit_rappen ? chf(line.debit_rappen) : '' }}</td>
              <td class="px-4 py-2.5 text-right font-semibold text-gray-900">{{ line.credit_rappen ? chf(line.credit_rappen) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ BILANZ / ER ═══ -->
    <div v-if="ledgerTab === 'statements'" class="space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Aktiven</p>
          <p class="text-lg font-bold text-slate-800">{{ chf(ledgerStatements.assets_rappen) }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Passiven</p>
          <p class="text-lg font-bold text-slate-800">{{ chf(ledgerStatements.liabilities_rappen) }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Ertrag</p>
          <p class="text-lg font-bold text-emerald-700">{{ chf(ledgerStatements.income_rappen) }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Aufwand / Ergebnis</p>
          <p class="text-lg font-bold" :class="ledgerStatements.result_rappen >= 0 ? 'text-emerald-700' : 'text-red-600'">{{ chf(ledgerStatements.result_rappen) }}</p>
          <p class="text-[11px] text-slate-400">Aufwand {{ chf(ledgerStatements.expense_rappen) }}</p>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100">
          <p class="text-sm font-semibold text-gray-800">Saldenliste {{ selectedYear }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50/50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Konto</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Soll</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Haben</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in trialRows" :key="row.account_id" class="border-b border-gray-50">
                <td class="px-4 py-2.5"><span class="font-mono text-xs text-gray-500 mr-2">{{ row.number }}</span>{{ row.name }}</td>
                <td class="px-4 py-2.5 text-right">{{ row.debit_rappen ? chf(row.debit_rappen) : '' }}</td>
                <td class="px-4 py-2.5 text-right">{{ row.credit_rappen ? chf(row.credit_rappen) : '' }}</td>
                <td class="px-4 py-2.5 text-right font-semibold">{{ chf(row.balance_rappen) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ WIEDERKEHREND ═══ -->
    <div v-if="ledgerTab === 'recurring'" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100">
        <p class="text-sm font-semibold text-gray-800">Wiederkehrende Buchungen</p>
        <p class="text-xs text-gray-400">Miete, Versicherung, Software — werden am Fälligkeitstag automatisch gebucht</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Nächste</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Text</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Rhythmus</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Betrag</th>
              <th v-if="canWriteBooks" class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!recurringEntries.length">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-400">
                Noch keine Serie. Beim Erfassen einer Ausgabe «Wiederkehrend» aktivieren.
              </td>
            </tr>
            <tr v-for="row in recurringEntries" :key="row.id" class="border-b border-gray-50" :class="row.is_active ? '' : 'opacity-50'">
              <td class="px-4 py-2.5">{{ row.next_due_date ? fmtDate(row.next_due_date) : '—' }}</td>
              <td class="px-4 py-2.5">
                <p class="text-gray-800">{{ row.description }}</p>
                <p class="text-xs text-gray-400">{{ row.creditor_name || (row.is_paid ? 'bezahlt' : 'offen') }}</p>
              </td>
              <td class="px-4 py-2.5 text-gray-600">{{ intervalLabel(row.interval) }}</td>
              <td class="px-4 py-2.5 text-right font-semibold">{{ chf(row.amount_rappen) }}</td>
              <td v-if="canWriteBooks" class="px-4 py-2.5 text-right">
                <button type="button" class="text-xs underline text-slate-500" @click="toggleRecurring(row)">
                  {{ row.is_active ? 'Pausieren' : 'Fortsetzen' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ KONTENPLAN ═══ -->
    <div v-if="ledgerTab === 'accounts'" class="space-y-4">
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-800">Kontenplan</p>
            <p class="text-xs text-gray-400">KMU-Rahmen — Konten umbenennen, deaktivieren oder ergänzen</p>
          </div>
          <button type="button" @click="downloadCsv('accounts')" class="text-xs font-semibold text-slate-600 underline shrink-0">CSV</button>
        </div>
        <div v-if="canWriteBooks" class="px-5 py-3 border-b border-gray-50 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input v-model="newAccount.number" placeholder="Nummer" class="px-3 py-2 text-sm border border-gray-200 rounded-xl"/>
          <input v-model="newAccount.name" placeholder="Name" class="px-3 py-2 text-sm border border-gray-200 rounded-xl"/>
          <select v-model="newAccount.type" class="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white">
            <option value="asset">Aktiv</option>
            <option value="liability">Passiv</option>
            <option value="equity">Eigenkapital</option>
            <option value="income">Ertrag</option>
            <option value="expense">Aufwand</option>
          </select>
          <button type="button" @click="createAccount" :disabled="savingAccount"
            class="px-3 py-2 text-sm font-semibold rounded-xl bg-gray-900 text-white disabled:opacity-50">Konto anlegen</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50/50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Nr.</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Typ</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="acc in ledgerAccounts" :key="acc.id" class="border-b border-gray-50" :class="{ 'opacity-50': !acc.is_active }">
                <td class="px-4 py-2 font-mono text-xs text-gray-500">{{ acc.number }}</td>
                <td class="px-4 py-2">
                  <input v-if="canWriteBooks" :value="acc.name" @change="renameAccount(acc, ($event.target as HTMLInputElement).value)"
                    class="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-200 rounded-lg"/>
                  <span v-else>{{ acc.name }}</span>
                </td>
                <td class="px-4 py-2 text-xs text-gray-500">{{ accountTypeLabel(acc.type) }}</td>
                <td class="px-4 py-2 hidden sm:table-cell">
                  <button v-if="canWriteBooks && !acc.is_system" type="button" @click="toggleAccount(acc)"
                    class="text-xs underline text-slate-500">{{ acc.is_active ? 'Deaktivieren' : 'Aktivieren' }}</button>
                  <span v-else class="text-[10px] font-bold uppercase text-slate-400">{{ acc.is_system ? 'System' : '' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100">
            <p class="text-sm font-semibold text-gray-800">Kategorie → Konto</p>
            <p class="text-xs text-gray-400">Das sind die Buchungsregeln: welche Kategorie auf welches Konto geht. Soll/Haben setzt Simy automatisch.</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="cat in categories" :key="cat.id" class="px-5 py-2.5 flex items-center gap-3">
            <span class="flex-1 text-sm text-gray-800">{{ cat.name }}</span>
            <select :value="cat.account_id ?? ''" :disabled="!canWriteBooks"
              @change="assignCategoryAccount(cat.id, ($event.target as HTMLSelectElement).value)"
              class="px-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white disabled:bg-gray-50">
              <option value="">Standard</option>
              <option v-for="acc in activeAccountsForCategory(cat)" :key="acc.id" :value="acc.id">
                {{ acc.number }} {{ acc.name }}
              </option>
            </select>
          </div>
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
              <button type="button" @click="setEntryType('expense')"
                class="flex-1 py-2 text-sm font-semibold transition-colors"
                :class="entryForm.type === 'expense' && entryForm.document_kind !== 'contract' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'">
                Ausgabe
              </button>
              <button type="button" @click="setEntryType('income')"
                class="flex-1 py-2 text-sm font-semibold transition-colors"
                :class="entryForm.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'">
                Einnahme
              </button>
            </div>

            <!-- Receipt first (same flow as staff) -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-2">Beleg (Foto oder PDF)</label>
              <div v-if="entryForm.receipt_url" class="flex items-center gap-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div class="flex-1 min-w-0">
                  <a :href="entryForm.receipt_url" target="_blank" class="text-xs font-medium text-emerald-700 underline truncate block">
                    {{ entryForm.receipt_filename || 'Beleg anzeigen' }}
                  </a>
                </div>
                <button type="button" @click="clearReceipt" class="text-xs text-red-400 hover:text-red-600">Entfernen</button>
              </div>
              <label v-else
                class="flex items-center gap-3 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                :class="uploadingReceipt || parsingReceipt ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400'">
                <svg class="w-8 h-8 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <div class="text-left">
                  <p class="text-sm font-semibold text-gray-700">{{ uploadingReceipt ? 'Wird hochgeladen…' : 'Foto oder PDF hochladen' }}</p>
                  <p class="text-xs text-gray-400">Wird automatisch ausgelesen (Betrag, Datum, Lieferant)</p>
                </div>
                <input type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp"
                  @change="uploadReceipt" :disabled="uploadingReceipt || parsingReceipt"/>
              </label>
              <div v-if="parsingReceipt" class="flex items-center gap-2 mt-2">
                <svg class="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span class="text-xs text-gray-500">Beleg wird analysiert…</span>
              </div>
              <p v-if="parseHint" class="text-xs mt-2" :class="parseHint.includes('erkannt') && !parseHint.includes('prüfen') ? 'text-emerald-600' : 'text-amber-600'">{{ parseHint }}</p>
              <div v-if="ocrExtras.iban || ocrExtras.reference" class="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 space-y-1">
                <p class="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">QR-Rechnung erkannt</p>
                <p v-if="ocrExtras.iban" class="text-xs text-blue-800 font-mono">{{ ocrExtras.iban }}</p>
                <p v-if="ocrExtras.reference" class="text-xs text-blue-700">Ref: {{ ocrExtras.reference }}</p>
              </div>
              <p v-if="uploadError" class="text-xs text-red-500 mt-1">{{ uploadError }}</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-2">Beleg-Art</label>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="kind in documentKinds" :key="kind.value" type="button"
                  :disabled="materialFieldsLocked"
                  @click="setDocumentKind(kind.value)"
                  class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
                  :class="entryForm.document_kind === kind.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'">
                  {{ kind.label }}
                </button>
              </div>
              <p v-if="entryForm.document_kind === 'contract'" class="text-xs text-slate-500 mt-1.5">
                Verträge werden abgelegt, erscheinen aber nicht in Einnahmen, Ausgaben oder MWST.
              </p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Notiz</label>
              <textarea v-model="entryForm.notes" rows="2" placeholder="z.B. Leasing Vertrag Fahrzeug 3, gilt bis 2028…"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"/>
            </div>

            <!-- Date + Amount -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Datum *</label>
                <input v-model="entryForm.entry_date" type="date" :disabled="materialFieldsLocked"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"/>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">
                  Betrag CHF <span v-if="entryForm.document_kind !== 'contract'">*</span>
                  <span v-else class="font-normal text-gray-400">(optional)</span>
                </label>
                <input v-model="entryForm.amount_chf" type="number" step="0.05" min="0"
                  placeholder="0.00" :disabled="materialFieldsLocked"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"/>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Beschreibung *</label>
              <input v-model="entryForm.description" type="text" placeholder="z.B. Büromaterial, Versicherung…"
                :disabled="materialFieldsLocked"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"/>
            </div>

            <!-- Category -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Kategorie</label>
              <select v-model="entryForm.category_id" :disabled="materialFieldsLocked"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50">
                <option value="">Ohne Kategorie</option>
                <option v-for="cat in filteredCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
              <p v-if="selectedCategoryIsPrivate" class="text-xs text-orange-700 mt-1.5">
                Private Ausgaben gehören nicht in die Geschäftsbuchhaltung. Diese Kategorie wird im Jahres-PDF separat erkennbar.
              </p>
            </div>

            <!-- Creditor (for expenses, not contracts) -->
            <template v-if="entryForm.type === 'expense' && entryForm.document_kind !== 'contract'">
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

            <!-- MWST (optional) -->
            <div v-if="entryForm.document_kind !== 'contract'" class="border-t border-gray-100 pt-4">
              <details>
                <summary class="text-xs font-semibold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600">MWST (optional)</summary>
                <div class="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-1">MWST-Satz %</label>
                    <select v-model="entryForm.vat_rate" :disabled="materialFieldsLocked"
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50">
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
                      :disabled="materialFieldsLocked"
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"/>
                  </div>
                </div>
              </details>
            </div>

            <div v-if="!editingEntry && entryForm.document_kind !== 'contract'" class="border-t border-gray-100 pt-4 space-y-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="entryForm.recurring" type="checkbox" class="w-4 h-4 rounded text-emerald-500"/>
                <span class="text-sm text-gray-700">Wiederkehrend</span>
              </label>
              <div v-if="entryForm.recurring" class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 mb-1">Rhythmus</label>
                  <select v-model="entryForm.interval" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white">
                    <option value="monthly">Monatlich</option>
                    <option value="quarterly">Quartalsweise</option>
                    <option value="yearly">Jährlich</option>
                  </select>
                </div>
                <p class="text-xs text-gray-400 self-end pb-2">Diese Buchung jetzt, die nächste automatisch.</p>
              </div>
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

    <AccountingCamtModal v-model="showCamtModal" @done="loadAll"/>

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
import {
  ACCOUNTING_DOCUMENT_KINDS,
  documentKindLabel,
  documentKindToEntryType,
  inferDocumentKind,
  isAccountingPlEntry,
  requiresAccountingReceipt,
  type AccountingDocumentKind,
} from '~/server/utils/accounting'

definePageMeta({ layout: 'admin' })

interface AccountingCategory { id: string; name: string; type: string; color: string; vat_rate?: number | null; account_id?: string | null }
interface LedgerAccount { id: string; number: string; name: string; type: string; class: number; is_system: boolean; is_active: boolean }
interface JournalLine {
  id: string
  debit_rappen: number
  credit_rappen: number
  account?: { number: string; name: string } | null
  entry?: { entry_date: string; description: string } | null
}
interface TrialRow {
  account_id: string
  number: string
  name: string
  debit_rappen: number
  credit_rappen: number
  balance_rappen: number
}
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
  notes?: string | null
  document_kind?: AccountingDocumentKind | null
  locked_at?: string | null
  storno_of_id?: string | null
  linked_payment_id?: string | null
  submitted_by_user_id?: string | null
  created_at?: string | null
  deleted_at?: string | null
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
const exportingArchive = ref(false)
const exportingCsv = ref(false)
const importingCsv = ref(false)
const assets = ref({
  as_of: '',
  cash_rappen: 0,
  office_cash_rappen: 0,
  staff_cash_rappen: 0,
  bank_rappen: 0,
  receivables_rappen: 0,
  payables_rappen: 0,
  net_assets_rappen: 0,
})
const editBank = ref(false)
const bankChfInput = ref('')
const savingBank = ref(false)
const countedCashChf = ref('')
const closingCash = ref(false)
const exportingVat = ref<number | null>(null)
const vat = ref({
  tenant: { name: '', uid_number: null as string | null, mwst_obligated: false, default_vat_rate: 0 },
  year_turnover_rappen: 0,
  year_exempt_rappen: 0,
  year_output_vat_rappen: 0,
  year_input_vat_rappen: 0,
  year_payable_rappen: 0,
  threshold_rappen: 10_000_000,
  threshold_reached: false,
  threshold_ratio: 0,
  filing: { year: now.getFullYear(), quarter: 1 },
  quarters: [1, 2, 3, 4].map(quarter => ({
    quarter,
    year: now.getFullYear(),
    date_from: '',
    date_to: '',
    deadline: '',
    days_until_deadline: 0,
    status: 'not_liable' as 'ok' | 'soon' | 'due' | 'overdue' | 'not_liable',
    exempt_turnover_rappen: 0,
    taxable: [] as { rate: number; net_rappen: number; vat_rappen: number; gross_rappen: number }[],
    output_vat_rappen: 0,
    input_vat_rappen: 0,
    input_vat_blocked_rappen: 0,
    payable_rappen: 0,
    total_turnover_rappen: 0,
  })),
})
const entries = ref<AccountingEntry[]>([])
const categories = ref<AccountingCategory[]>([])
const summary = ref({ total_income_rappen: 0, total_expense_rappen: 0, result_rappen: 0 })
const monthly = ref<{ month: number; label: string; income_rappen: number; expense_rappen: number; result_rappen: number }[]>([])
const searchQuery = ref('')
const activeTypeFilter = ref('all')
const showOnlyMissingReceipt = ref(false)

// Disclaimer: einmal pro Tag anzeigen
const disclaimerDismissed = ref(false)
const authStore = useAuthStore()
const isAccountantViewer = computed(() => authStore.userRole === 'accountant')
const canWriteBooks = ref(true)
const accountants = ref<Array<{ id: string; email: string; access: string; invited_at: string; accepted_at: string | null }>>([])
const accountantEmail = ref('')
const accountantInviteAccess = ref<'read' | 'write'>('read')
const invitingAccountant = ref(false)
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

const documentKinds = ACCOUNTING_DOCUMENT_KINDS
const ledgerTab = ref<'bookings' | 'journal' | 'statements' | 'accounts' | 'recurring'>('bookings')
const ledgerTabs = [
  { value: 'bookings' as const, label: 'Buchungen' },
  { value: 'journal' as const, label: 'Journal' },
  { value: 'statements' as const, label: 'Bilanz / ER' },
  { value: 'accounts' as const, label: 'Kontenplan' },
  { value: 'recurring' as const, label: 'Wiederkehrend' },
]
type RecurringEntry = {
  id: string
  interval: 'monthly' | 'quarterly' | 'yearly'
  next_due_date: string
  last_created_at: string | null
  ends_on: string | null
  is_active: boolean
  type: 'income' | 'expense'
  document_kind: string
  amount_rappen: number
  description: string
  category_id: string | null
  creditor_name: string | null
  is_paid: boolean
  notes: string | null
}
const recurringEntries = ref<RecurringEntry[]>([])
const upcomingRecurring = computed(() => {
  const limit = new Date()
  limit.setDate(limit.getDate() + 14)
  const until = limit.toISOString().slice(0, 10)
  return recurringEntries.value.filter(r => r.is_active && r.next_due_date && r.next_due_date <= until).slice(0, 3)
})
function intervalLabel(interval: string) {
  if (interval === 'quarterly') return 'Quartalsweise'
  if (interval === 'yearly') return 'Jährlich'
  return 'Monatlich'
}
const ledgerAccounts = ref<LedgerAccount[]>([])
const journalLines = ref<JournalLine[]>([])
const trialRows = ref<TrialRow[]>([])
const ledgerStatements = ref({
  assets_rappen: 0, liabilities_rappen: 0, equity_rappen: 0,
  income_rappen: 0, expense_rappen: 0, result_rappen: 0,
})
const newAccount = reactive({ number: '', name: '', type: 'expense' })
const savingAccount = ref(false)

function accountTypeLabel(type: string) {
  if (type === 'asset') return 'Aktiv'
  if (type === 'liability') return 'Passiv'
  if (type === 'equity') return 'Eigenkapital'
  if (type === 'income') return 'Ertrag'
  return 'Aufwand'
}
function activeAccountsForCategory(cat: AccountingCategory) {
  const want = cat.type === 'income' ? 'income' : 'expense'
  return ledgerAccounts.value.filter(a => a.is_active && a.type === want)
}

const typeFilters = [
  { value: 'all', label: 'Alle' },
  { value: 'income', label: 'Einnahmen' },
  { value: 'expense', label: 'Ausgaben' },
  { value: 'spesen', label: 'Spesen' },
  { value: 'creditor', label: 'Kreditor' },
  { value: 'debtor', label: 'Debitor' },
  { value: 'contract', label: 'Verträge' },
]

function entryKind(entry: AccountingEntry): AccountingDocumentKind {
  return inferDocumentKind(entry)
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2024, i, 1).toLocaleDateString('de-CH', { month: 'long' }),
}))

const filteredCategories = computed(() =>
  categories.value.filter(c => c.type === entryForm.type)
)

const missingReceiptEntries = computed(() =>
  entries.value
    .filter(e => requiresAccountingReceipt(e) && !e.receipt_url && !e.deleted_at)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
)
const attachingReceiptId = ref<string | null>(null)

const filteredEntries = computed(() => {
  let list = [...entries.value]
  if (activeTypeFilter.value === 'income' || activeTypeFilter.value === 'expense') {
    list = list.filter(e => e.type === activeTypeFilter.value && isAccountingPlEntry(e))
  } else if (activeTypeFilter.value !== 'all') {
    list = list.filter(e => entryKind(e) === activeTypeFilter.value)
  }
  if (showOnlyMissingReceipt.value) list = list.filter(e => requiresAccountingReceipt(e) && !e.receipt_url)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.creditor_name?.toLowerCase().includes(q) ||
      e.category?.name.toLowerCase().includes(q) ||
      e.external_reference?.toLowerCase().includes(q) ||
      e.notes?.toLowerCase().includes(q) ||
      documentKindLabel(entryKind(e)).toLowerCase().includes(q)
    )
  }
  if (selectedMonth.value) {
    const m = selectedMonth.value.padStart(2, '0')
    list = list.filter(e => e.entry_date?.slice(5, 7) === m)
  }
  return list
})

const filteredIncome = computed(() => filteredEntries.value.filter(e => e.type === 'income' && isAccountingPlEntry(e)).reduce((s, e) => s + e.amount_rappen, 0))
const filteredExpense = computed(() => filteredEntries.value.filter(e => e.type === 'expense' && isAccountingPlEntry(e)).reduce((s, e) => s + e.amount_rappen, 0))

// Bar chart helpers
const maxBarValue = computed(() => Math.max(...monthly.value.map(m => Math.max(m.income_rappen, m.expense_rappen)), 1))
const barHeight = (val: number) => Math.max(0, Math.round((val / maxBarValue.value) * 88))

// ─── Load data ───────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadSummary(), loadEntries(), loadCategories(), loadAssets(), loadVat(), loadAccountantAccess(), loadAccountants(), loadLedger(), loadRecurring()])
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

async function loadRecurring() {
  try {
    const data = await $fetch<{ success: boolean; data: RecurringEntry[] }>('/api/admin/accounting/recurring')
    if (data.success) recurringEntries.value = data.data
  } catch {
    recurringEntries.value = []
  }
}

async function toggleRecurring(row: RecurringEntry) {
  try {
    await $fetch(`/api/admin/accounting/recurring/${row.id}`, {
      method: 'PATCH',
      body: { is_active: !row.is_active },
    })
    await loadRecurring()
  } catch (err) {
    alert((err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Serie konnte nicht geändert werden')
  }
}

async function loadCategories() {
  await $fetch('/api/admin/accounting/init-categories', { method: 'POST' })
  const fresh = await $fetch('/api/admin/accounting/categories')
  if (fresh.success) categories.value = fresh.data
}

async function loadLedger() {
  try {
    if (canWriteBooks.value) {
      await $fetch('/api/admin/accounting/init-ledger', { method: 'POST' })
    }
    const [acc, journal, trial] = await Promise.all([
      $fetch('/api/admin/accounting/accounts'),
      $fetch(`/api/admin/accounting/journal?year=${selectedYear.value}`),
      $fetch(`/api/admin/accounting/trial-balance?year=${selectedYear.value}`),
    ])
    if (acc.success) ledgerAccounts.value = acc.data
    if (journal.success) journalLines.value = journal.data
    if (trial.success) {
      trialRows.value = trial.trial
      ledgerStatements.value = trial.statements
    }
  } catch { /* Kontenplan noch nicht bereit */ }
}

async function createAccount() {
  if (!newAccount.number.trim() || !newAccount.name.trim()) return
  savingAccount.value = true
  try {
    await $fetch('/api/admin/accounting/accounts', { method: 'POST', body: { ...newAccount } })
    newAccount.number = ''
    newAccount.name = ''
    await loadLedger()
  } catch (err: unknown) {
    alert((err as { statusMessage?: string })?.statusMessage ?? 'Konto konnte nicht angelegt werden')
  } finally {
    savingAccount.value = false
  }
}

async function renameAccount(acc: LedgerAccount, name: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed === acc.name) return
  await $fetch(`/api/admin/accounting/accounts/${acc.id}`, { method: 'PATCH', body: { name: trimmed } })
  acc.name = trimmed
}

async function toggleAccount(acc: LedgerAccount) {
  await $fetch(`/api/admin/accounting/accounts/${acc.id}`, { method: 'PATCH', body: { is_active: !acc.is_active } })
  acc.is_active = !acc.is_active
}

async function assignCategoryAccount(categoryId: string, accountId: string) {
  if (!accountId) return
  await $fetch(`/api/admin/accounting/categories/${categoryId}`, { method: 'PATCH', body: { account_id: accountId } })
  const cat = categories.value.find(c => c.id === categoryId)
  if (cat) cat.account_id = accountId
}

async function loadAssets() {
  const data = await $fetch('/api/admin/accounting/balance-sheet')
  if (data.success) {
    assets.value = {
      as_of: data.as_of,
      cash_rappen: data.cash_rappen,
      office_cash_rappen: data.office_cash_rappen,
      staff_cash_rappen: data.staff_cash_rappen,
      bank_rappen: data.bank_rappen,
      receivables_rappen: data.receivables_rappen,
      payables_rappen: data.payables_rappen,
      net_assets_rappen: data.net_assets_rappen,
    }
    bankChfInput.value = ((data.bank_rappen ?? 0) / 100).toFixed(2)
  }
}

async function saveBankBalance() {
  savingBank.value = true
  try {
    const rappen = Math.round(parseFloat(String(bankChfInput.value || '0')) * 100)
    await $fetch('/api/admin/accounting/bank-balance', { method: 'PATCH', body: { bank_balance_rappen: rappen } })
    editBank.value = false
    await loadAssets()
  } catch (err: unknown) {
    alert((err as { statusMessage?: string })?.statusMessage ?? 'Bankbestand konnte nicht gespeichert werden')
  } finally {
    savingBank.value = false
  }
}

async function loadAccountantAccess() {
  try {
    const data = await $fetch('/api/admin/accounting/access')
    canWriteBooks.value = !data.is_accountant || data.accountant_access === 'write'
  } catch {
    canWriteBooks.value = !isAccountantViewer.value
  }
}

async function loadAccountants() {
  if (isAccountantViewer.value) return
  try {
    const data = await $fetch('/api/admin/accounting/accountants')
    if (data.success) accountants.value = data.data
  } catch { accountants.value = [] }
}

async function inviteAccountant() {
  invitingAccountant.value = true
  try {
    const res = await $fetch('/api/admin/accounting/accountants', {
      method: 'POST',
      body: { email: accountantEmail.value, access: accountantInviteAccess.value },
    })
    accountantEmail.value = ''
    await loadAccountants()
    if (res.warning) alert(`${res.warning}${res.invite_link ? `\n${res.invite_link}` : ''}`)
  } catch (err: unknown) {
    alert((err as { statusMessage?: string; data?: { statusMessage?: string } })?.data?.statusMessage
      || (err as { statusMessage?: string })?.statusMessage
      || 'Einladung fehlgeschlagen')
  } finally {
    invitingAccountant.value = false
  }
}

async function updateAccountantAccess(id: string, access: string) {
  try {
    await $fetch(`/api/admin/accounting/accountants/${id}`, { method: 'PATCH', body: { access } })
    await loadAccountants()
  } catch (err: unknown) {
    alert((err as { statusMessage?: string })?.statusMessage || 'Recht konnte nicht geändert werden')
  }
}

async function revokeAccountant(id: string) {
  if (!confirm('Treuhänder-Zugang wirklich entziehen?')) return
  try {
    await $fetch(`/api/admin/accounting/accountants/${id}`, { method: 'PATCH', body: { revoke: true } })
    await loadAccountants()
  } catch (err: unknown) {
    alert((err as { statusMessage?: string })?.statusMessage || 'Zugang konnte nicht entzogen werden')
  }
}

async function loadVat() {
  const data = await $fetch(`/api/admin/accounting/vat-summary?year=${selectedYear.value}`)
  if (data.success) {
    vat.value = {
      tenant: data.tenant,
      year_turnover_rappen: data.year_turnover_rappen,
      year_exempt_rappen: data.year_exempt_rappen,
      year_output_vat_rappen: data.year_output_vat_rappen,
      year_input_vat_rappen: data.year_input_vat_rappen,
      year_payable_rappen: data.year_payable_rappen,
      threshold_rappen: data.threshold_rappen,
      threshold_reached: data.threshold_reached,
      threshold_ratio: data.threshold_ratio,
      filing: data.filing,
      quarters: data.quarters,
    }
  }
}

function vatCardClass(q: { quarter: number; year: number; status: string }) {
  const filing = vat.value.filing.year === q.year && vat.value.filing.quarter === q.quarter
  if (q.status === 'overdue') return filing ? 'border-red-300 bg-red-50 ring-2 ring-red-200' : 'border-red-100 bg-red-50/70'
  if (q.status === 'due') return filing ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-200' : 'border-orange-100 bg-orange-50/60'
  if (q.status === 'soon') return filing ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'border-amber-100 bg-amber-50/50'
  if (filing) return 'border-emerald-200 bg-emerald-50/40 ring-2 ring-emerald-100'
  return 'border-slate-100 bg-slate-50'
}

function vatBadgeClass(status: string) {
  if (status === 'overdue') return 'bg-red-100 text-red-700'
  if (status === 'due') return 'bg-orange-100 text-orange-700'
  if (status === 'soon') return 'bg-amber-100 text-amber-700'
  if (status === 'ok') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-500'
}

function vatStatusLabel(status: string) {
  if (status === 'ok') return 'Frist ok'
  if (status === 'soon') return 'Bald fällig'
  if (status === 'due') return 'Diese Woche'
  if (status === 'overdue') return 'Überfällig'
  return 'Nicht pflichtig'
}

function fmtShortDate(iso: string) {
  if (!iso) return '—'
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('de-CH') } catch { return iso }
}

async function exportVatPdf(quarter: number) {
  exportingVat.value = quarter
  try {
    const res = await fetch(`/api/admin/accounting/export-vat-pdf?year=${selectedYear.value}&quarter=${quarter}`)
    if (!res.ok) throw new Error('Export fehlgeschlagen')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mwst_q${quarter}_${selectedYear.value}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('MWST-PDF fehlgeschlagen')
  } finally {
    exportingVat.value = null
  }
}

async function bookCashClose() {
  closingCash.value = true
  try {
    const counted = Math.round(parseFloat(String(countedCashChf.value || '0')) * 100)
    const res = await $fetch('/api/admin/accounting/cash-close', {
      method: 'POST',
      body: { counted_rappen: counted },
    })
    countedCashChf.value = ''
    await loadAll()
    if (res.difference_rappen === 0) {
      alert('Kassenschluss: kein Unterschied zum Systembestand.')
    }
  } catch (err: unknown) {
    alert((err as { statusMessage?: string })?.statusMessage ?? 'Kassenschluss fehlgeschlagen')
  } finally {
    closingCash.value = false
  }
}

const ACCOUNTING_GRACE_MS = 24 * 60 * 60 * 1000
function canEditMaterial(entry: AccountingEntry) {
  if (entry.locked_at || entry.linked_payment_id || entry.storno_of_id || !entry.created_at) return false
  return Date.now() - new Date(entry.created_at).getTime() < ACCOUNTING_GRACE_MS
}

const materialFieldsLocked = computed(() => (
  !!editingEntry.value && !canEditMaterial(editingEntry.value)
))
const selectedCategoryIsPrivate = computed(() => {
  const cat = categories.value.find(c => c.id === entryForm.category_id)
  return cat?.name === 'Eigenverbrauch / Privat'
})

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
const parsingReceipt = ref(false)
const parseHint = ref('')
const ocrExtras = ref<{ iban: string | null; reference: string | null }>({ iban: null, reference: null })
const uploadError = ref('')

const defaultForm = () => ({
  type: 'expense' as 'income' | 'expense',
  document_kind: 'expense' as AccountingDocumentKind,
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
  notes: '',
  receipt_url: '',
  receipt_filename: '',
  recurring: false,
  interval: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
})

const entryForm = reactive(defaultForm())

function setDocumentKind(kind: AccountingDocumentKind) {
  const nextType = documentKindToEntryType(kind)
  if (entryForm.type !== nextType) entryForm.category_id = ''
  entryForm.document_kind = kind
  entryForm.type = nextType
  if (kind === 'creditor' && !editingEntry.value) entryForm.is_paid = false
}

function setEntryType(type: 'income' | 'expense') {
  setDocumentKind(type === 'income' ? 'debtor' : 'expense')
}

function openNewEntry(type: 'income' | 'expense') {
  editingEntry.value = null
  Object.assign(entryForm, defaultForm())
  setEntryType(type)
  saveError.value = ''
  parseHint.value = ''
  ocrExtras.value = { iban: null, reference: null }
  showEntryModal.value = true
}

function openEdit(entry: AccountingEntry) {
  editingEntry.value = entry
  Object.assign(entryForm, {
    type: entry.type,
    document_kind: inferDocumentKind(entry),
    notes: entry.notes ?? '',
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
  parseHint.value = ''
  ocrExtras.value = { iban: null, reference: null }
  showEntryModal.value = true
}

function closeEntryModal() {
  showEntryModal.value = false
  editingEntry.value = null
}

function clearReceipt() {
  entryForm.receipt_url = ''
  entryForm.receipt_filename = ''
  parseHint.value = ''
  ocrExtras.value = { iban: null, reference: null }
}

function applyOcrCategory(hint?: string | null) {
  if (!hint || entryForm.category_id) return
  const lower = hint.toLowerCase()
  const hit = filteredCategories.value.find(c => c.name.toLowerCase() === lower)
    || filteredCategories.value.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()))
  if (hit) entryForm.category_id = hit.id
}

async function uploadReceipt(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingReceipt.value = true
  uploadError.value = ''
  parseHint.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch('/api/admin/accounting/upload-receipt', { method: 'POST', body: fd })
    if (!res.success) return
    entryForm.receipt_url = res.url ?? ''
    entryForm.receipt_filename = res.filename ?? file.name
    if (!entryForm.receipt_url) return

    uploadingReceipt.value = false
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      parseHint.value = 'PDF wird nicht automatisch gelesen — bitte Betrag und Datum prüfen'
      return
    }

    parsingReceipt.value = true
    try {
      const ocr = await $fetch('/api/staff/parse-receipt', {
        method: 'POST',
        body: { receipt_url: entryForm.receipt_url },
      })
      const d = ocr.data
      const today = new Date().toISOString().split('T')[0]
      if (d.amount_chf && !entryForm.amount_chf) entryForm.amount_chf = String(d.amount_chf)
      if (d.date && (!entryForm.entry_date || entryForm.entry_date === today)) entryForm.entry_date = d.date
      if (d.merchant && !entryForm.description) entryForm.description = d.merchant
      if (d.merchant && !entryForm.creditor_name) entryForm.creditor_name = d.merchant
      if (d.iban && !entryForm.creditor_iban) entryForm.creditor_iban = d.iban
      if (d.reference && !entryForm.payment_reference) entryForm.payment_reference = d.reference
      if (d.vat_rate != null && !entryForm.vat_rate) entryForm.vat_rate = String(d.vat_rate)
      if (d.vat_amount_chf != null && !entryForm.vat_amount_chf) entryForm.vat_amount_chf = String(d.vat_amount_chf)
      applyOcrCategory(d.category_hint)
      ocrExtras.value = { iban: d.iban ?? null, reference: d.reference ?? null }
      const filled = [d.amount_chf, d.date, d.merchant].filter(Boolean).length
      parseHint.value = filled > 0
        ? `Automatisch erkannt${d.confidence === 'low' ? ' (bitte prüfen)' : ''}`
        : 'Keine Daten erkannt — bitte manuell ausfüllen'
    } catch (ocrErr: unknown) {
      parseHint.value = `Auslesen fehlgeschlagen — bitte manuell ausfüllen`
      console.error('[parse-receipt]', ocrErr)
    } finally {
      parsingReceipt.value = false
    }
    } catch (err: unknown) {
    uploadError.value = (err as { statusMessage?: string })?.statusMessage ?? 'Upload fehlgeschlagen'
  } finally {
    uploadingReceipt.value = false
  }
}

async function attachReceiptToEntry(entry: AccountingEntry, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  attachingReceiptId.value = entry.id
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch('/api/admin/accounting/upload-receipt', { method: 'POST', body: fd })
    if (!res.success || !res.url) throw new Error('Upload fehlgeschlagen')
    await $fetch(`/api/admin/accounting/entries/${entry.id}`, {
      method: 'PATCH',
      body: {
        receipt_url: res.url,
        receipt_filename: res.filename ?? file.name,
      },
    })
    await loadAll()
  } catch (err: unknown) {
    alert((err as { statusMessage?: string })?.statusMessage ?? 'Beleg konnte nicht verknüpft werden')
  } finally {
    attachingReceiptId.value = null
  }
}

async function saveEntry() {
  if (!entryForm.entry_date) { saveError.value = 'Datum fehlt'; return }
  const amount = parseFloat(String(entryForm.amount_chf || '0'))
  if (entryForm.document_kind !== 'contract' && (!entryForm.amount_chf || amount <= 0)) {
    saveError.value = 'Betrag fehlt oder ungültig'
    return
  }
  if (amount < 0) { saveError.value = 'Betrag darf nicht negativ sein'; return }
  if (!entryForm.description.trim()) { saveError.value = 'Beschreibung fehlt'; return }

  saving.value = true
  saveError.value = ''
  try {
    const payload = {
      type: entryForm.type,
      document_kind: entryForm.document_kind,
      entry_date: entryForm.entry_date,
      amount_rappen: Math.round((Number.isFinite(amount) ? amount : 0) * 100),
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
      notes: entryForm.notes.trim() || null,
      receipt_url: entryForm.receipt_url || null,
      receipt_filename: entryForm.receipt_filename || null,
    }

    if (editingEntry.value) {
      const body = materialFieldsLocked.value
        ? {
            creditor_name: payload.creditor_name,
            creditor_iban: payload.creditor_iban,
            payment_reference: payload.payment_reference,
            is_paid: payload.is_paid,
            paid_date: payload.paid_date,
            receipt_url: payload.receipt_url,
            receipt_filename: payload.receipt_filename,
            external_reference: payload.external_reference,
            notes: payload.notes,
          }
        : payload
      await $fetch(`/api/admin/accounting/entries/${editingEntry.value.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/admin/accounting/entries', { method: 'POST', body: payload })
      if (entryForm.recurring) {
        try {
          await $fetch('/api/admin/accounting/recurring', {
            method: 'POST',
            body: { ...payload, interval: entryForm.interval },
          })
        } catch {
          alert('Buchung gespeichert, aber die Wiederholung konnte nicht angelegt werden. Bitte im Tab Wiederkehrend prüfen.')
        }
      }
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

async function exportArchive() {
  exportingArchive.value = true
  try {
    const res = await fetch('/api/admin/accounting/export-archive')
    if (!res.ok) throw new Error('Export fehlgeschlagen')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `simy-buchhaltung-${new Date().toISOString().slice(0, 10)}.zip`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('Voll-Export fehlgeschlagen')
  } finally {
    exportingArchive.value = false
  }
}

async function downloadCsv(kind: 'bookings' | 'journal' | 'accounts') {
  exportingCsv.value = true
  try {
    const res = await fetch(`/api/admin/accounting/export-csv?kind=${kind}&year=${selectedYear.value}`)
    if (!res.ok) throw new Error('Export fehlgeschlagen')
    const blob = await res.blob()
    const names = {
      bookings: `buchungen-${selectedYear.value}.csv`,
      journal: `journal-${selectedYear.value}.csv`,
      accounts: 'kontenplan.csv',
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = names[kind]
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('CSV-Export fehlgeschlagen')
  } finally {
    exportingCsv.value = false
  }
}

async function importCsv(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importingCsv.value = true
  try {
    const csv = await file.text()
    const res = await $fetch<{ created: number; skipped: number; errors: string[] }>('/api/admin/accounting/import-csv', {
      method: 'POST',
      body: { csv },
    })
    const extra = res.errors.length ? `\n${res.errors.slice(0, 8).join('\n')}` : ''
    alert(`Import: ${res.created} neu, ${res.skipped} übersprungen${extra}`)
    await loadAll()
  } catch (err) {
    alert((err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'CSV-Import fehlgeschlagen')
  } finally {
    importingCsv.value = false
    input.value = ''
  }
}

// ─── QR Scan ─────────────────────────────────────────────────────────────────
const showCamtModal = ref(false)
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
