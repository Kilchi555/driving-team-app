<template>
  <!-- Backdrop -->
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
    <div class="fixed inset-0 bg-gray-900/60 transition-opacity" @click="closeModal"/>

    <!-- Modal panel – full-screen sheet on mobile, centered dialog on sm+ -->
    <div class="admin-modal relative w-full bg-white shadow-xl transition-all
                rounded-t-2xl max-h-[95dvh]
                sm:rounded-2xl sm:max-w-4xl sm:max-h-[90dvh]
                flex flex-col overflow-hidden">

      <!-- ── Sticky Header ── -->
      <div class="flex-none sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <!-- Mobile drag handle -->
        <div class="flex justify-center pt-3 pb-1 sm:hidden">
          <div class="w-10 h-1 bg-gray-300 rounded-full"/>
        </div>

        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <!-- Title block -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 min-w-0">
              <h3 class="text-base font-semibold text-gray-900 truncate">
                {{ isEditing ? 'Bearbeiten' : (invoice?.invoice_number || 'Rechnung') }}
              </h3>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <template v-if="!isEditing">
              <!-- PDF dropdown -->
              <div class="relative" ref="pdfMenuRef">
                <button
                  type="button"
                  :disabled="isDownloadingPdf || isDownloadingDunningPdf"
                  class="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:opacity-50 transition-colors"
                  @click="togglePdfMenu"
                  aria-haspopup="menu"
                  :aria-expanded="showPdfMenu"
                >
                  <svg class="w-4 h-4 text-gray-500" :class="{ 'animate-spin': isDownloadingPdf || isDownloadingDunningPdf }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="!(isDownloadingPdf || isDownloadingDunningPdf)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 3v6h6" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span class="hidden sm:inline">PDF</span>
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div
                  v-if="showPdfMenu"
                  class="absolute right-0 mt-1.5 w-56 rounded-xl border border-gray-100 bg-white shadow-xl shadow-gray-200/80 ring-1 ring-black/5 overflow-hidden z-30"
                  role="menu"
                >
                  <button
                    type="button"
                    class="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    role="menuitem"
                    @click="onPdfMenuAction('invoice')"
                  >
                    <span class="mt-0.5 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </span>
                    <span>
                      <span class="block text-sm font-medium text-gray-900">Rechnung</span>
                      <span class="block text-xs text-gray-400">Original-PDF herunterladen</span>
                    </span>
                  </button>
                  <button
                    v-if="effectiveDunningLevel > 0"
                    type="button"
                    class="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-amber-50/80 transition-colors border-t border-gray-50"
                    role="menuitem"
                    @click="onPdfMenuAction('dunning')"
                  >
                    <span class="mt-0.5 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zM12 15.75h.007v.008H12v-.008z"/></svg>
                    </span>
                    <span>
                      <span class="block text-sm font-medium text-gray-900">{{ dunningLevelLabel }}</span>
                      <span class="block text-xs text-gray-400">Mahnschreiben-PDF</span>
                    </span>
                  </button>
                </div>
              </div>

              <!-- Primary CTA -->
              <button
                type="button"
                class="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 transition-colors"
                @click="openMarkPaidDialog"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span class="hidden sm:inline">Zahlung</span>
              </button>

              <!-- Aktionen dropdown -->
              <div class="relative" ref="actionsMenuRef">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
                  @click="toggleActionsMenu"
                  aria-haspopup="menu"
                  :aria-expanded="showActionsMenu"
                >
                  <span class="hidden sm:inline">Aktionen</span>
                  <svg class="sm:hidden w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                  <svg class="hidden sm:block w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div
                  v-if="showActionsMenu"
                  class="absolute right-0 mt-1.5 w-60 rounded-xl border border-gray-100 bg-white shadow-xl shadow-gray-200/80 ring-1 ring-black/5 overflow-hidden z-30 py-1"
                  role="menu"
                >
                  <button type="button" class="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50" role="menuitem" @click="onAction('edit')">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Bearbeiten
                  </button>
                  <button type="button" class="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50" role="menuitem" @click="onAction('send')">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    Rechnung versenden
                  </button>
                  <button
                    v-if="canSendDunning"
                    type="button"
                    class="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-amber-50"
                    role="menuitem"
                    @click="onAction('dunning')"
                  >
                    <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zM12 15.75h.007v.008H12v-.008z"/></svg>
                    {{ effectiveDunningLevel > 0 ? 'Nächste Mahnung senden' : 'Zahlungserinnerung senden' }}
                  </button>
                  <div class="my-1 border-t border-gray-100"></div>
                  <button type="button" class="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-red-600 hover:bg-red-50" role="menuitem" @click="onAction('cancel')">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    Stornieren
                  </button>
                </div>
              </div>
            </template>

            <template v-else>
              <button
                type="button"
                :disabled="isSaving"
                class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                @click="saveChanges"
              >
                <svg v-if="isSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {{ isSaving ? 'Speichern…' : 'Speichern' }}
              </button>
              <button
                type="button"
                :disabled="isSaving"
                class="inline-flex items-center h-9 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                @click="cancelEditing"
              >
                Abbrechen
              </button>
            </template>

            <button
              type="button"
              class="inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
              @click="closeModal"
              aria-label="Schliessen"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Scrollable Content ── -->
      <div class="flex-1 overflow-y-auto">
        <div class="px-4 py-5 sm:px-6 space-y-6">

          <!-- Loading state -->
          <div v-if="!invoice" class="text-center py-12 text-gray-500">
            Lade Rechnungsdetails...
          </div>

          <template v-else>

            <!-- ── Betragsübersicht ── -->
            <div class="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5">
              <div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                <div class="flex items-baseline gap-2 min-w-0">
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">Rechnungsbetrag</p>
                  <p class="text-2xl font-semibold text-gray-900 tracking-tight whitespace-nowrap">{{ formatCurrency(invoice.total_amount_rappen) }}</p>
                </div>
                <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0">
                  <span
                    v-if="effectiveDunningLevel > 0"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                    :style="dunningLevelBadgeStyle"
                  >{{ dunningLevelLabel }}</span>
                  <InvoiceStatusBadge v-else :status="invoice.status" />
                  <PaymentStatusBadge :status="invoice.payment_status" />
                </div>
              </div>

              <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="rounded-xl bg-white/80 border border-gray-100 px-3 py-2.5">
                  <p class="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Bezahlt</p>
                  <p class="text-sm font-semibold text-emerald-600 mt-0.5">{{ formatCurrency(invoice.paid_amount_rappen || 0) }}</p>
                </div>
                <div class="rounded-xl bg-white/80 border border-gray-100 px-3 py-2.5">
                  <p class="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Offen</p>
                  <p class="text-sm font-semibold mt-0.5" :class="outstandingAmountRappen > 0 ? 'text-amber-600' : 'text-gray-900'">
                    {{ formatCurrency(outstandingAmountRappen) }}
                  </p>
                </div>
                <div class="rounded-xl bg-white/80 border border-gray-100 px-3 py-2.5">
                  <p class="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Erstellt</p>
                  <p class="text-sm font-medium text-gray-900 mt-0.5">{{ formatDate(invoice.created_at) }}</p>
                </div>
                <div class="rounded-xl bg-white/80 border border-gray-100 px-3 py-2.5">
                  <p class="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Fällig</p>
                  <template v-if="isEditing">
                    <input
                      v-model="safeEditedInvoice.due_date"
                      type="date"
                      class="mt-0.5 w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                  </template>
                  <template v-else>
                    <p class="text-sm font-medium mt-0.5" :class="isOverdue(effectiveDueDate) ? 'text-red-600' : 'text-gray-900'">
                      {{ invoice.due_date || invoice.dunning_due_date ? formatDate(effectiveDueDate) : '—' }}
                    </p>
                  </template>
                </div>
              </div>

            </div>

            <!-- ── Kunde & Adresse ── -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Kunde -->
              <section class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Kunde</h4>
                <p class="text-base font-semibold text-gray-900">{{ displayCustomer.name || '—' }}</p>
                <div class="mt-3 space-y-2 text-sm">
                  <a
                    v-if="displayCustomer.email"
                    :href="`mailto:${displayCustomer.email}`"
                    class="flex items-start gap-2.5 text-gray-700 hover:text-blue-600 transition-colors min-w-0"
                  >
                    <svg class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    <span class="break-all leading-snug">{{ displayCustomer.email }}</span>
                  </a>
                  <p v-else class="flex items-center gap-2.5 text-gray-400">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    Keine E-Mail
                  </p>
                  <a
                    v-if="displayCustomer.phone"
                    :href="`tel:${displayCustomer.phone}`"
                    class="flex items-center gap-2.5 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    {{ displayCustomer.phone }}
                  </a>
                  <div v-if="displayCustomer.addressLine1 || displayCustomer.addressLine2" class="flex items-start gap-2.5 text-gray-700">
                    <svg class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span class="leading-snug">
                      <span v-if="displayCustomer.addressLine1">{{ displayCustomer.addressLine1 }}</span>
                      <br v-if="displayCustomer.addressLine1 && displayCustomer.addressLine2">
                      <span v-if="displayCustomer.addressLine2">{{ displayCustomer.addressLine2 }}</span>
                    </span>
                  </div>
                </div>
              </section>

              <!-- Rechnungsadresse -->
              <section class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rechnungsadresse</h4>

                <template v-if="!isEditing">
                  <p class="text-sm font-semibold text-gray-900">{{ invoice.billing_company_name || displayCustomer.name || '—' }}</p>
                  <p v-if="invoice.billing_contact_person" class="text-sm text-gray-500 mt-0.5">{{ invoice.billing_contact_person }}</p>
                  <div class="mt-3 text-sm text-gray-700 leading-relaxed space-y-0.5">
                    <p v-if="invoice.billing_street || invoice.billing_street_number">
                      {{ [invoice.billing_street, invoice.billing_street_number].filter(Boolean).join(' ') }}
                    </p>
                    <p v-if="invoice.billing_zip || invoice.billing_city">
                      {{ [invoice.billing_zip, invoice.billing_city].filter(Boolean).join(' ') }}
                    </p>
                    <p v-if="invoice.billing_country" class="text-gray-500">{{ invoice.billing_country }}</p>
                    <p v-if="!invoice.billing_street && !invoice.billing_zip && !invoice.billing_city" class="text-gray-400">Keine Adresse hinterlegt</p>
                  </div>
                  <a
                    v-if="invoice.billing_email || invoice.customer_email"
                    :href="`mailto:${invoice.billing_email || invoice.customer_email}`"
                    class="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 break-all"
                  >
                    {{ invoice.billing_email || invoice.customer_email }}
                  </a>
                </template>

                <div v-else class="grid grid-cols-1 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Rechnungs-E-Mail</label>
                    <input
                      v-model="safeEditedInvoice.billing_email"
                      type="email"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :placeholder="invoice.billing_email || invoice.customer_email || 'rechnung@firma.ch'"
                    >
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Firma</label>
                      <input
                        v-model="safeEditedInvoice.billing_company_name"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_company_name || 'Firmenname'"
                      >
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Kontaktperson</label>
                      <input
                        v-model="safeEditedInvoice.billing_contact_person"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_contact_person || 'Kontaktperson'"
                      >
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Strasse, Nr.</label>
                    <div class="flex gap-2 min-w-0">
                      <input
                        v-model="safeEditedInvoice.billing_street"
                        type="text"
                        class="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_street || 'Strasse'"
                      >
                      <input
                        v-model="safeEditedInvoice.billing_street_number"
                        type="text"
                        class="w-16 shrink-0 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nr."
                      >
                    </div>
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">PLZ</label>
                      <input
                        v-model="safeEditedInvoice.billing_zip"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_zip || 'PLZ'"
                      >
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Ort</label>
                      <input
                        v-model="safeEditedInvoice.billing_city"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_city || 'Ort'"
                      >
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Land</label>
                      <input
                        v-model="safeEditedInvoice.billing_country"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_country || 'Land'"
                      >
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <!-- ── Verlauf (Versand + Mahnungen) ── -->
            <section class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
              <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Verlauf</h4>
                  <p class="text-sm text-gray-500 mt-0.5">Versand &amp; Mahnwesen</p>
                </div>
                <button
                  v-if="canSendDunning || effectiveDunningLevel > 0"
                  type="button"
                  class="text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                  @click="toggleDunningPause"
                >
                  {{ dunningPaused ? 'Reaktivieren' : 'Pausieren' }}
                </button>
              </div>

              <ol class="relative space-y-0">
                <!-- Erstellt -->
                <li class="relative flex gap-3 pb-5">
                  <div class="flex flex-col items-center">
                    <span class="w-2.5 h-2.5 rounded-full bg-gray-300 ring-4 ring-white flex-shrink-0 mt-1.5" />
                    <span class="w-px flex-1 bg-gray-100 mt-1" />
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <div class="flex items-baseline justify-between gap-2">
                      <p class="text-sm font-medium text-gray-900">Erstellt</p>
                      <time class="text-xs text-gray-400 whitespace-nowrap">{{ formatDate(invoice.created_at) }}</time>
                    </div>
                  </div>
                </li>

                <!-- Rechnung versendet -->
                <li class="relative flex gap-3" :class="shippingDunningEntries.length || dunningLog.length ? 'pb-5' : ''">
                  <div class="flex flex-col items-center">
                    <span
                      class="w-2.5 h-2.5 rounded-full ring-4 ring-white flex-shrink-0 mt-1.5"
                      :class="(invoice as any).sent_at ? 'bg-blue-500' : 'bg-gray-200'"
                    />
                    <span v-if="shippingDunningEntries.length || dunningLog.length" class="w-px flex-1 bg-gray-100 mt-1" />
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <div class="flex items-baseline justify-between gap-2">
                      <p class="text-sm font-medium" :class="(invoice as any).sent_at ? 'text-gray-900' : 'text-gray-400'">
                        {{ (invoice as any).sent_at ? 'Rechnung versendet' : 'Noch nicht versendet' }}
                      </p>
                      <time v-if="(invoice as any).sent_at" class="text-xs text-gray-400 whitespace-nowrap">{{ formatDateTime((invoice as any).sent_at) }}</time>
                    </div>
                  </div>
                </li>

                <!-- Mahnungen -->
                <li
                  v-for="(entry, idx) in (dunningLog.length ? dunningLog : shippingDunningEntries)"
                  :key="entry.id"
                  class="relative flex gap-3"
                  :class="idx < (dunningLog.length ? dunningLog : shippingDunningEntries).length - 1 ? 'pb-5' : ''"
                >
                  <div class="flex flex-col items-center">
                    <span
                      class="w-2.5 h-2.5 rounded-full ring-4 ring-white flex-shrink-0 mt-1.5"
                      :style="{ background: DUNNING_STAGE_COLORS[entry.stage] || '#6b7280' }"
                    />
                    <span
                      v-if="idx < (dunningLog.length ? dunningLog : shippingDunningEntries).length - 1"
                      class="w-px flex-1 bg-gray-100 mt-1"
                    />
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <div class="flex items-center gap-2 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{{ dunningStageLabel(entry.stage) }}</p>
                        <span
                          v-if="entry.status === 'sent'"
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-700"
                        >OK</span>
                        <span
                          v-else-if="entry.status"
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-700"
                        >Fehler</span>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <button
                          v-if="entry.status === 'sent' && entry.id !== 'fallback-dunning'"
                          type="button"
                          class="text-xs font-medium text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline disabled:opacity-50"
                          :disabled="isDownloadingDunningPdf"
                          @click="downloadDunningPdf(entry.id)"
                        >PDF</button>
                        <time class="text-xs text-gray-400 whitespace-nowrap">{{ formatDateTime(entry.sent_at) }}</time>
                      </div>
                    </div>
                    <p v-if="entry.sent_to" class="text-xs text-gray-400 mt-0.5 truncate">an {{ entry.sent_to }}</p>
                    <p v-if="entry.new_due_date" class="text-xs text-blue-600 mt-0.5">Neues Ziel: {{ formatDate(entry.new_due_date) }}</p>
                    <p v-if="entry.fee_rappen > 0" class="text-xs text-gray-400 mt-0.5">+{{ formatCurrency(entry.fee_rappen) }} Gebühr</p>
                  </div>
                </li>

                <li v-if="!shippingDunningEntries.length && !dunningLog.length && (canSendDunning || effectiveDunningLevel > 0)" class="relative flex gap-3 pt-1">
                  <div class="flex flex-col items-center">
                    <span class="w-2.5 h-2.5 rounded-full bg-gray-200 ring-4 ring-white flex-shrink-0 mt-1.5" />
                  </div>
                  <p class="text-sm text-gray-400 pt-0.5 italic">Noch keine Mahnung versendet</p>
                </li>
              </ol>
            </section>

            <!-- ── Zahlungshistorie ── -->
            <div v-if="invoicePaymentsHistory.length > 0" class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Zahlungshistorie</h4>
              <div class="space-y-2">
                <div
                  v-for="(payment, index) in invoicePaymentsHistory"
                  :key="payment.id"
                  class="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {{ index + 1 }}
                    </span>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-900">{{ formatCurrency(payment.amount_rappen) }}</p>
                      <p class="text-xs text-gray-400">
                        {{ formatDate(payment.payment_date) }}
                        <span v-if="payment.payment_method && payment.payment_method !== 'manual'" class="ml-1">· {{ payment.payment_method }}</span>
                      </p>
                    </div>
                  </div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 flex-shrink-0">
                    Bezahlt
                  </span>
                </div>
                <div class="flex items-center justify-between px-1 pt-2 border-t border-gray-100">
                  <span class="text-xs font-semibold text-gray-500">Total bezahlt</span>
                  <span class="text-sm font-bold text-emerald-600">
                    {{ formatCurrency(invoicePaymentsHistory.reduce((sum, p) => sum + p.amount_rappen, 0)) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- ── Rechnungsübersicht ── -->
            <div class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Positionen</h4>
                <div v-if="isLoadingDetails" class="flex items-center text-blue-600 text-xs gap-1.5">
                  <svg class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Lade...
                </div>
              </div>

              <!-- Invoice items – desktop table / mobile cards -->
              <div v-if="invoice.items && invoice.items.length > 0" class="mb-4">
                <!-- Desktop table header (hidden on mobile) -->
                <div class="hidden sm:grid sm:grid-cols-12 bg-white border border-gray-200 rounded-t-lg px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <div class="col-span-6">Position</div>
                  <div class="col-span-2 text-center">Menge</div>
                  <div class="col-span-2 text-right">Einzelpreis</div>
                  <div class="col-span-2 text-right">Total</div>
                </div>
                <!-- Rows -->
                <div class="rounded-lg sm:rounded-t-none border border-gray-200 sm:border-t-0 overflow-hidden divide-y divide-gray-100 bg-white">
                  <div
                    v-for="item in invoice.items"
                    :key="item.id"
                    class="px-4 py-3"
                  >
                    <!-- Mobile: stacked layout -->
                    <div class="flex items-start justify-between gap-3 sm:hidden">
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-900">{{ item.product_name }}</div>
                        <div v-if="item.product_description" class="text-xs text-gray-500 mt-0.5">{{ item.product_description }}</div>
                        <div v-if="item.appointment_date" class="text-xs text-gray-500 mt-0.5">
                          {{ new Date(item.appointment_date).toLocaleDateString('de-CH') }}
                          <span v-if="item.appointment_start_time"> · {{ item.appointment_start_time.slice(0, 5) }} Uhr</span>
                          <span v-if="item.appointment_duration_minutes"> · {{ item.appointment_duration_minutes }} Min.</span>
                        </div>
                        <div v-if="item.notes" class="text-xs text-gray-400 mt-0.5 italic">{{ item.notes }}</div>
                        <div class="text-xs text-gray-400 mt-1">{{ item.quantity }}× · {{ formatCurrency(item.unit_price_rappen) }} / Stk.</div>
                      </div>
                      <div class="text-sm font-semibold text-gray-900 flex-shrink-0">{{ formatCurrency(item.total_price_rappen) }}</div>
                    </div>
                    <!-- Desktop: grid layout -->
                    <div class="hidden sm:grid sm:grid-cols-12 items-start">
                      <div class="col-span-6">
                        <div class="text-sm font-medium text-gray-900">{{ item.product_name }}</div>
                        <div v-if="item.product_description" class="text-xs text-gray-500 mt-0.5">{{ item.product_description }}</div>
                        <div v-if="item.appointment_date" class="text-xs text-gray-500 mt-0.5">
                          {{ new Date(item.appointment_date).toLocaleDateString('de-CH') }}
                          <span v-if="item.appointment_start_time"> · {{ item.appointment_start_time.slice(0, 5) }} Uhr</span>
                          <span v-if="item.appointment_duration_minutes"> · {{ item.appointment_duration_minutes }} Min.</span>
                        </div>
                        <div v-if="item.notes" class="text-xs text-gray-400 mt-0.5 italic">{{ item.notes }}</div>
                      </div>
                      <div class="col-span-2 text-center text-sm text-gray-700">{{ item.quantity }}×</div>
                      <div class="col-span-2 text-right text-sm text-gray-700">{{ formatCurrency(item.unit_price_rappen) }}</div>
                      <div class="col-span-2 text-right text-sm font-semibold text-gray-900">{{ formatCurrency(item.total_price_rappen) }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Fallback: payments -->
              <div v-else-if="allInvoicePayments.length > 0" class="mb-4 rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100 bg-white">
                <div
                  v-for="payment in allInvoicePayments"
                  :key="payment.id"
                  class="flex items-center justify-between gap-3 px-4 py-3"
                  :class="{ 'opacity-50': payment.deleted_at }"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-medium" :class="payment.deleted_at ? 'line-through text-gray-400' : 'text-gray-900'">
                        {{ payment.description || 'Termin' }}
                      </span>
                      <span v-if="payment.deleted_at" class="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Storniert</span>
                    </div>
                    <div class="text-xs text-gray-400 mt-0.5">
                      {{ payment.deleted_at
                        ? 'Gelöscht am ' + new Date(payment.deleted_at).toLocaleDateString('de-CH')
                        : 'Erstellt ' + new Date(payment.created_at).toLocaleDateString('de-CH') }}
                    </div>
                  </div>
                  <div class="text-sm font-semibold flex-shrink-0" :class="payment.deleted_at ? 'line-through text-gray-400' : 'text-gray-900'">
                    {{ formatCurrency(payment.total_amount_rappen) }}
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else-if="!isLoadingDetails" class="text-sm text-gray-400 italic py-2">Keine Positionen verfügbar.</div>

              <!-- Totals -->
              <div class="flex justify-end mt-2">
                <div class="w-full sm:w-64 space-y-1.5 border-t border-gray-200 pt-3">
                  <div v-if="invoice.discount_amount_rappen > 0" class="flex justify-between text-sm text-gray-600">
                    <span>Zwischentotal</span>
                    <span>{{ formatCurrency(invoice.subtotal_rappen) }}</span>
                  </div>
                  <div v-if="invoice.discount_amount_rappen > 0" class="flex justify-between text-sm text-emerald-600">
                    <span>Rabatt</span>
                    <span>−{{ formatCurrency(invoice.discount_amount_rappen) }}</span>
                  </div>
                  <div v-if="invoice.vat_amount_rappen > 0" class="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{{ formatCurrency(invoice.subtotal_rappen) }}</span>
                  </div>
                  <div v-if="invoice.vat_amount_rappen > 0" class="flex justify-between text-sm text-gray-600">
                    <span>MwSt. ({{ invoice.vat_rate }}%)</span>
                    <span>{{ formatCurrency(invoice.vat_amount_rappen) }}</span>
                  </div>
                  <div class="flex justify-between pt-2 border-t border-gray-300">
                    <span class="text-base font-semibold text-gray-900">Gesamtbetrag</span>
                    <span class="text-base font-bold text-green-600">{{ formatCurrency(invoice.total_amount_rappen) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes + Rechnungstexte -->
            <div v-if="invoice.notes || invoice.payment_terms || invoice.footer_text || isEditing">
              <div class="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Rechnungstexte</h4>

                <!-- Einleitungstext -->
                <div v-if="isEditing || invoice.notes">
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">Einleitungstext</label>
                  <textarea
                    v-if="isEditing"
                    v-model="safeEditedInvoice.notes"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="tenantInvoiceTexts.invoice_intro_text || 'Einleitungstext…'"
                  />
                  <p v-else class="text-sm text-gray-700 whitespace-pre-line">{{ invoice.notes }}</p>
                </div>

                <!-- Zahlungsbedingungen -->
                <div v-if="isEditing || invoice.payment_terms">
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">Zahlungsbedingungen</label>
                  <textarea
                    v-if="isEditing"
                    ref="paymentTermsRef"
                    v-model="safeEditedInvoice.payment_terms"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="tenantInvoiceTexts.invoice_payment_terms || 'Zahlungsbedingungen…'"
                  />
                  <p v-if="isEditing" class="text-xs text-gray-400 mt-1">
                    <button
                      type="button"
                      class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded font-mono transition-colors"
                      @click="insertDueDatePlaceholder"
                    >+ {due_date}</button> einfügen – wird durch das Fälligkeitsdatum der Rechnung ersetzt
                  </p>
                  <p v-else class="text-sm text-gray-700 whitespace-pre-line">{{ invoice.payment_terms }}</p>
                </div>

                <!-- Abschlusstext -->
                <div v-if="isEditing || invoice.footer_text">
                  <label class="block text-xs font-medium text-gray-500 mb-1.5">Abschlusstext</label>
                  <textarea
                    v-if="isEditing"
                    v-model="safeEditedInvoice.footer_text"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="tenantInvoiceTexts.invoice_footer_text || 'Abschlusstext…'"
                  />
                  <p v-else class="text-sm text-gray-700 whitespace-pre-line">{{ invoice.footer_text }}</p>
                </div>
              </div>
            </div>

          </template>
        </div>
      </div>
    </div>

    <!-- ── Mark as Paid Dialog ── -->
    <Teleport to="body">
      <div v-if="showMarkPaidDialog" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/60" @click="showMarkPaidDialog = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <h4 class="text-base font-semibold text-gray-900">Zahlung erfassen</h4>

          <!-- Bereits bezahlter Betrag -->
          <div v-if="invoice && invoice.paid_amount_rappen > 0" class="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-1.5">
            <div class="flex justify-between text-xs text-gray-600">
              <span>Rechnungsbetrag</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(invoice.total_amount_rappen) }}</span>
            </div>
            <div class="flex justify-between text-xs text-gray-600">
              <span>Bereits bezahlt</span>
              <span class="font-medium text-green-600">{{ formatCurrency(invoice.paid_amount_rappen) }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5 my-0.5">
              <div class="bg-green-500 h-1.5 rounded-full" :style="{ width: Math.min(100, (invoice.paid_amount_rappen / invoice.total_amount_rappen) * 100) + '%' }"></div>
            </div>
            <div class="flex justify-between text-xs font-semibold">
              <span class="text-amber-700">Noch ausstehend</span>
              <span class="text-amber-700">{{ formatCurrency(invoice.total_amount_rappen - invoice.paid_amount_rappen) }}</span>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Betrag (CHF)</label>
              <input
                v-model="partialAmountChf"
                type="number" step="0.05" min="0.05"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 focus:bg-white"
              />
              <p v-if="invoice && partialAmountChf < invoice.total_amount_rappen / 100"
                class="mt-1 text-xs text-amber-600">
                Teilzahlung — Rechnungsbetrag: {{ formatCurrency(invoice.total_amount_rappen) }}
              </p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Datum</label>
              <input
                v-model="paidAtDate"
                type="date"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Zahlungsart</label>
              <input
                v-model="paidNote"
                type="text" placeholder="z.B. TWINT, Bar, Banküberweisung…"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          <div class="flex gap-2 pt-1">
            <button
              type="button"
              @click="showMarkPaidDialog = false"
              class="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >Abbrechen</button>
            <button
              type="button"
              :disabled="isMarkingPaid || !partialAmountChf"
              @click="confirmMarkAsPaid"
              class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50"
            >
              {{ isMarkingPaid ? 'Speichern…' : 'Bestätigen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Mahnung senden Dialog ── -->
    <DunningSendDialog
      :show="showDunningDialog"
      :invoice-id="invoice?.id || null"
      :invoice-number="invoice?.invoice_number"
      :current-level="dunningLevel"
      @close="showDunningDialog = false"
      @sent="onDunningSent"
    />
  </div>

</template>

<script setup lang="ts">

import { defineProps, defineEmits, ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import InvoiceStatusBadge from './InvoiceStatusBadge.vue'
import PaymentStatusBadge from './PaymentStatusBadge.vue'
import DunningSendDialog from './DunningSendDialog.vue'
// ProductSelectorModal entfernt (Rechnung ist read-only bzgl. Positionen)
import type { InvoiceStatus, PaymentStatus } from '~/types/invoice'

interface InvoiceItem {
  id: string
  invoice_id?: string
  product_id?: string
  product_name: string
  product_description?: string
  appointment_id?: string
  appointment_title?: string
  appointment_date?: string
  appointment_duration_minutes?: number
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  vat_rate: number
  vat_amount_rappen: number
  sort_order?: number
  notes?: string
  created_at?: string
}

interface Invoice {
  id: string
  invoice_number: string
  status: InvoiceStatus
  payment_status: PaymentStatus
  user_id?: string
  // Customer information (read-only, comes from user relationship)
  customer_first_name?: string
  customer_last_name?: string
  customer_email?: string
  customer_phone?: string
  customer_street?: string
  customer_street_number?: string
  customer_zip?: string
  customer_city?: string
  created_at: string
  due_date?: string
  subtotal_rappen: number
  vat_rate: number
  vat_amount_rappen: number
  discount_amount_rappen: number
  total_amount_rappen: number
  notes?: string
  internal_notes?: string
  paid_amount_rappen?: number
  paid_at?: string
  billing_company_name?: string
  billing_contact_person?: string
  billing_street?: string
  billing_street_number?: string
  billing_zip?: string
  billing_city?: string
  billing_country?: string
  billing_email?: string
  // Mahnwesen
  dunning_level?: number
  dunning_paused?: boolean
  last_dunning_sent_at?: string
  dunning_due_date?: string | null
  // Appointment information
  appointment_id?: string
  appointment_title?: string
  appointment_start?: string
  appointment_duration?: number
  // Product sale information
  product_sale_id?: string
  product_sale_total?: number
  items: InvoiceItem[]
  // Enhanced data for product sales and appointment details
  productSales?: {
    id: string
    total_amount_rappen: number
    product_sale_items: {
      id: string
      product_id: string
      quantity: number
      unit_price_rappen: number
      total_price_rappen: number
      product: {
        id: string
        name: string
        description?: string
      }
    }[]
  }[]
  appointmentDetails?: {
    start_time: string
    event_type: {
      id: string
      name: string
      description?: string
      duration_minutes: number
      price_rappen: number
    }
  }
}

const props = defineProps<{
  show: boolean
  invoice: Invoice | null
  startInEditMode?: boolean
}>()

// PDF download
const isDownloadingPdf = ref(false)
const isDownloadingDunningPdf = ref(false)
const showPdfMenu = ref(false)
const showActionsMenu = ref(false)
const pdfMenuRef = ref<HTMLElement | null>(null)
const actionsMenuRef = ref<HTMLElement | null>(null)

const closeHeaderMenus = () => {
  showPdfMenu.value = false
  showActionsMenu.value = false
}

const togglePdfMenu = () => {
  showActionsMenu.value = false
  showPdfMenu.value = !showPdfMenu.value
}

const toggleActionsMenu = () => {
  showPdfMenu.value = false
  showActionsMenu.value = !showActionsMenu.value
}

const onPdfMenuAction = async (kind: 'invoice' | 'dunning') => {
  closeHeaderMenus()
  if (kind === 'invoice') await downloadPdf()
  else await downloadDunningPdf()
}

const onAction = (kind: 'edit' | 'send' | 'dunning' | 'cancel') => {
  closeHeaderMenus()
  if (kind === 'edit') startEditing()
  else if (kind === 'send') emit('send', props.invoice?.id || '')
  else if (kind === 'dunning') showDunningDialog.value = true
  else if (kind === 'cancel') emit('cancel', props.invoice?.id || '')
}

const onDocumentPointerDown = (e: Event) => {
  const target = e.target as Node
  if (showPdfMenu.value && pdfMenuRef.value && !pdfMenuRef.value.contains(target)) {
    showPdfMenu.value = false
  }
  if (showActionsMenu.value && actionsMenuRef.value && !actionsMenuRef.value.contains(target)) {
    showActionsMenu.value = false
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

const downloadPdf = async () => {
  if (!props.invoice?.id || isDownloadingPdf.value) return
  isDownloadingPdf.value = true
  try {
    const res: any = await $fetch('/api/invoices/download', {
      method: 'POST',
      body: { invoiceId: props.invoice.id },
    })
    if (res?.pdfUrl) {
      const { openPdf } = await import('~/utils/openPdf')
      await openPdf(res.pdfUrl, res.filename || `Rechnung_${props.invoice.invoice_number}.pdf`)
    }
    if (res?.newStatus) {
      emit('statusChanged', props.invoice.id, res.newStatus)
    }
  } catch (e) {
    console.error('PDF download failed:', e)
  } finally {
    isDownloadingPdf.value = false
  }
}

const downloadDunningPdf = async (logId?: string) => {
  if (!props.invoice?.id || isDownloadingDunningPdf.value) return
  isDownloadingDunningPdf.value = true
  try {
    const res: any = await $fetch('/api/invoices/download-dunning', {
      method: 'POST',
      body: { invoiceId: props.invoice.id, logId: logId || undefined },
    })
    if (res?.pdfUrl) {
      const { openPdf } = await import('~/utils/openPdf')
      await openPdf(res.pdfUrl, res.filename || `${dunningLevelLabel.value}_${props.invoice.invoice_number}.pdf`)
    }
  } catch (e) {
    console.error('Dunning PDF download failed:', e)
  } finally {
    isDownloadingDunningPdf.value = false
  }
}

// Mark as paid dialog
const showMarkPaidDialog = ref(false)
const partialAmountChf = ref(0)
const paidAtDate = ref(new Date().toISOString().slice(0, 10))
const paidNote = ref('')
const isMarkingPaid = ref(false)

// Zahlungshistorie
const invoicePaymentsHistory = ref<any[]>([])

const loadInvoicePaymentsHistory = async () => {
  if (!props.invoice?.id) return
  try {
    const res = await $fetch<any>('/api/invoices/get-invoice-payments', {
      query: { invoice_id: props.invoice.id }
    })
    invoicePaymentsHistory.value = res?.data ?? []
  } catch (e) {
    console.error('Failed to load invoice payments history:', e)
  }
}

const openMarkPaidDialog = () => {
  if (props.invoice) {
    const alreadyPaid = props.invoice.paid_amount_rappen || 0
    const remaining = props.invoice.total_amount_rappen - alreadyPaid
    partialAmountChf.value = remaining > 0 ? remaining / 100 : props.invoice.total_amount_rappen / 100
  } else {
    partialAmountChf.value = 0
  }
  paidAtDate.value = new Date().toISOString().slice(0, 10)
  paidNote.value = ''
  showMarkPaidDialog.value = true
}

const confirmMarkAsPaid = async () => {
  if (!props.invoice?.id || isMarkingPaid.value) return
  isMarkingPaid.value = true
  try {
    const paidRappen = Math.round(partialAmountChf.value * 100)
    await $fetch('/api/invoices/mark-invoice-paid', {
      method: 'POST',
      body: {
        invoice_id: props.invoice.id,
        paid_amount_rappen: paidRappen,
        paid_at: new Date(paidAtDate.value).toISOString(),
        note: paidNote.value || undefined,
        payment_method: paidNote.value || 'manual',
      },
    })
    showMarkPaidDialog.value = false
    // Zahlungshistorie sofort aktualisieren
    await loadInvoicePaymentsHistory()
    emit('updated', props.invoice.id)
  } catch (e) {
    console.error('Mark as paid failed:', e)
  } finally {
    isMarkingPaid.value = false
  }
}

// ── Mahnwesen ──
// Hinweis: invoice_level/dunning_paused kommen NICHT aus der invoice-Prop (die Liste
// lädt über die ältere invoices_with_details-View ohne die neuen dunning_*-Spalten),
// sondern werden separat & aktuell über /api/invoices/dunning-log geladen.
const showDunningDialog = ref(false)
const dunningLog = ref<any[]>([])
const dunningLevel = ref(0)
const dunningPaused = ref(false)

const canSendDunning = computed(() => {
  const inv = props.invoice
  if (!inv) return false
  return inv.status !== 'draft' && inv.status !== 'cancelled' && inv.payment_status !== 'paid'
})

const DUNNING_STAGE_LABELS: Record<number, string> = { 1: 'Zahlungserinnerung', 2: '1. Mahnung', 3: '2. / letzte Mahnung' }
const DUNNING_STAGE_COLORS: Record<number, string> = { 1: '#2563eb', 2: '#d97706', 3: '#dc2626' }

const dunningStageLabel = (stage: number) => DUNNING_STAGE_LABELS[stage] || `Stufe ${stage}`

/** Mahnstufe: API-Wert, sonst aus der Rechnung (invoices_with_details) */
const effectiveDunningLevel = computed(() =>
  dunningLevel.value || props.invoice?.dunning_level || 0
)

const outstandingAmountRappen = computed(() => {
  const inv = props.invoice
  if (!inv) return 0
  return Math.max(0, (inv.total_amount_rappen || 0) - (inv.paid_amount_rappen || 0))
})

const dunningLevelLabel = computed(() => dunningStageLabel(effectiveDunningLevel.value))
const dunningLevelBadgeStyle = computed(() => {
  const color = DUNNING_STAGE_COLORS[effectiveDunningLevel.value] || '#6b7280'
  return { background: color + '1a', color }
})

const sentDunningEntries = computed(() =>
  (dunningLog.value || [])
    .filter((e: any) => e.status === 'sent')
    .slice()
    .sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
)

/** Versandhistorie-Einträge inkl. Fallback aus last_dunning_sent_at wenn Log noch leer */
const shippingDunningEntries = computed(() => {
  if (sentDunningEntries.value.length > 0) return sentDunningEntries.value

  const inv = props.invoice as any
  const level = effectiveDunningLevel.value
  const sentAt = inv?.last_dunning_sent_at
  if (level > 0 && sentAt) {
    return [{
      id: 'fallback-dunning',
      stage: level,
      sent_at: sentAt,
      status: 'sent',
    }]
  }
  return []
})

/** Kundendaten: API-Ergebnis oder Fallback aus invoices_with_details / Rechnungsadresse */
const displayCustomer = computed(() => {
  const inv = props.invoice as any
  const c = customerData.value
  const rawEmail = (c?.email || inv?.customer_email || '').trim()
  const emailIsRemoved = !rawEmail || /@removed\.invalid$/i.test(rawEmail) || /^deleted-/i.test(rawEmail)

  const first = c?.first_name || inv?.customer_first_name || ''
  const last = c?.last_name || inv?.customer_last_name || ''
  const nameFromUser = `${first} ${last}`.trim()

  const street = (c?.street || '').trim()
  const streetNr = (c?.street_nr || '').trim()
  const zip = (c?.zip || '').trim()
  const city = (c?.city || '').trim()
  const hasUserAddress = !!(street || zip || city)

  return {
    name: nameFromUser || inv?.billing_contact_person || inv?.billing_company_name || '',
    email: emailIsRemoved ? (inv?.billing_email || '') : rawEmail,
    phone: c?.phone || inv?.customer_phone || '',
    addressLine1: hasUserAddress
      ? `${street} ${streetNr}`.trim()
      : `${inv?.billing_street || ''} ${inv?.billing_street_number || ''}`.trim(),
    addressLine2: hasUserAddress
      ? `${zip} ${city}`.trim()
      : `${inv?.billing_zip || ''} ${inv?.billing_city || ''}`.trim(),
  }
})

const loadDunningLog = async () => {
  if (!props.invoice?.id) return
  try {
    const res = await $fetch<any>('/api/invoices/dunning-log', { query: { invoice_id: props.invoice.id } })
    dunningLog.value = res?.entries || []
    // Nie auf 0 zurücksetzen, wenn die Rechnung bereits eine Mahnstufe hat
    const fromApi = res?.dunning_level || 0
    const fromInvoice = props.invoice?.dunning_level || 0
    dunningLevel.value = Math.max(fromApi, fromInvoice, dunningLevel.value || 0)
    dunningPaused.value = res?.dunning_paused ?? !!props.invoice?.dunning_paused
  } catch (e) {
    console.error('Fehler beim Laden der Mahnhistorie:', e)
    // Fallback: Stufe aus der Rechnung behalten, damit Badge/Historie nicht verschwinden
    if (props.invoice?.dunning_level) {
      dunningLevel.value = props.invoice.dunning_level
    }
  }
}

const toggleDunningPause = async () => {
  if (!props.invoice?.id) return
  const newPaused = !dunningPaused.value
  try {
    await $fetch('/api/invoices/toggle-dunning-pause', { method: 'POST', body: { invoiceId: props.invoice.id, paused: newPaused } })
    dunningPaused.value = newPaused
  } catch (e) {
    console.error('Fehler beim Pausieren des Mahnwesens:', e)
  }
}

const onDunningSent = async (_invoiceId: string) => {
  showDunningDialog.value = false
  await loadDunningLog()
  if (props.invoice?.id) emit('updated', props.invoice.id)
}

// Reactive state für detaillierte Zahlungsdaten
const paymentTermsRef = ref<HTMLTextAreaElement | null>(null)

const insertDueDatePlaceholder = () => {
  const el = paymentTermsRef.value
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const placeholder = '{due_date}'
  const current = (safeEditedInvoice.value as any).payment_terms || ''
  const newVal = current.slice(0, start) + placeholder + current.slice(end)
  if (editedInvoice.value) {
    (editedInvoice.value as any).payment_terms = newVal
  }
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + placeholder.length, start + placeholder.length)
  })
}

const isLoadingDetails = ref(false)
const tenantInvoiceTexts = ref<{ invoice_intro_text?: string | null, invoice_payment_terms?: string | null, invoice_footer_text?: string | null }>({})
  const fallbackPayment = ref<any | null>(null)
  const appointmentStartTime = ref<string | null>(null)
  const appointmentEventTypeCode = ref<string | null>(null)
  const appointmentType = ref<string | null>(null)
  const appointmentEventTypeName = ref<string | null>(null)
  const customerData = ref<any | null>(null)
  const allInvoicePayments = ref<any[]>([])  // Alle Payments (inkl. gelöschte) für diese Rechnung
  const totalExcludingCancelled = ref(0)  // Total ohne stornierte Payments

// Edit mode state
const isEditing = ref(false)
const isSaving = ref(false)
const editedInvoice = ref<Partial<Invoice> | null>(null)
// Keine Produktauswahl im Rechnungsmodus

// Computed property die immer einen gültigen Wert für editedInvoice zurückgibt
const safeEditedInvoice = computed(() => {
  if (!editedInvoice.value && props.invoice) {
    return { ...props.invoice }
  }
  return editedInvoice.value || {}
})

const emit = defineEmits<{
  close: []
  edit: [id: string]
  send: [id: string]
  markAsPaid: [id: string]
  cancel: [id: string]
  updated: [id: string]
  statusChanged: [id: string, status: string]
}>()

const closeModal = () => {
  closeHeaderMenus()
  emit('close')
}

// ✅ Lade alle Payments für diese Rechnung via secure API
const loadInvoicePayments = async () => {
  if (!props.invoice?.invoice_number) return;
  
  try {
    const response = await $fetch('/api/admin/invoice-details', {
      method: 'GET',
      query: { invoice_number: props.invoice.invoice_number }
    }) as any;
    
    if (response?.payments) {
      allInvoicePayments.value = response.payments;
      totalExcludingCancelled.value = response.totalExcludingCancelled || 0;
      logger.debug('✅ Invoice payments loaded via API:', response.payments.length);
    }
  } catch (err) {
    console.error('⚠️ Error loading invoice payments:', err);
  }
}

// ✅ Lade detaillierte Daten via secure API
let _loadDetailsGeneration = 0
const loadDetailedData = async () => {
  // Initialisiere editedInvoice wenn das Modal geöffnet wird
  if (props.invoice) {
    editedInvoice.value = { ...props.invoice }
  }

  if (!props.invoice || !props.show) {
    return
  }

  const generation = ++_loadDetailsGeneration
  isLoadingDetails.value = true

  try {
    // ✅ Lade Tenant-Standardtexte für Platzhalter
    try {
      const settings = await $fetch<any>('/api/admin/invoice-settings')
      if (generation !== _loadDetailsGeneration) return
      tenantInvoiceTexts.value = {
        invoice_intro_text: settings?.invoice_intro_text || null,
        invoice_payment_terms: settings?.invoice_payment_terms || null,
        invoice_footer_text: settings?.invoice_footer_text || null,
      }
    } catch (e) {
      // ignore
    }

    // Payments, Zahlungshistorie und Mahnwesen parallel laden
    await Promise.all([
      loadInvoicePayments(),
      loadInvoicePaymentsHistory(),
      loadDunningLog(),
    ])
    if (generation !== _loadDetailsGeneration) return

    // Kundendaten + Termin-Details: immer mit invoice_id (zuverlässiger als nur user_id)
    try {
      const response = await $fetch('/api/admin/invoice-details', {
        method: 'GET',
        query: {
          invoice_id: props.invoice.id,
          invoice_number: props.invoice.invoice_number,
          user_id: props.invoice.user_id || undefined,
        }
      }) as any

      if (generation !== _loadDetailsGeneration) return

      if (response) {
        if (response.payments?.length) {
          allInvoicePayments.value = response.payments
          totalExcludingCancelled.value = response.totalExcludingCancelled || 0
        }
        if (response.latestPayment) {
          fallbackPayment.value = response.latestPayment
        }
        if (response.appointmentDetails) {
          appointmentStartTime.value = response.appointmentDetails.start_time
          appointmentEventTypeCode.value = response.appointmentDetails.event_type_code
          appointmentType.value = response.appointmentDetails.type
        }
        if (response.eventTypeName) {
          appointmentEventTypeName.value = response.eventTypeName
        }
        if (response.customerData) {
          customerData.value = response.customerData
          logger.debug('✅ Customer data loaded via API:', response.customerData)
        }
      }
    } catch (e) {
      console.warn('Could not load detailed data via API:', e)
    }
  } catch (error) {
    console.error('Error loading detailed data:', error)
  } finally {
    if (generation === _loadDetailsGeneration) {
      isLoadingDetails.value = false
    }
  }
}

// Watch für show prop um Daten zu laden
watch(() => props.show, (newShow) => {
  if (newShow && props.invoice) {
    closeHeaderMenus()
    customerData.value = null
    dunningLog.value = []
    dunningLevel.value = props.invoice.dunning_level || 0
    dunningPaused.value = !!props.invoice.dunning_paused
    loadDetailedData()

    if (props.startInEditMode) {
      setTimeout(() => {
        startEditing()
      }, 300)
    }
  } else if (!newShow) {
    closeHeaderMenus()
  }
})

// Watch für invoice prop: nur neu laden wenn sich die Rechnungs-ID ändert (nicht wenn Items nachgeladen werden)
watch(() => props.invoice?.id, (newId, oldId) => {
  if (newId && newId !== oldId && props.show) {
    customerData.value = null
    dunningLog.value = []
    dunningLevel.value = props.invoice?.dunning_level || 0
    dunningPaused.value = !!props.invoice?.dunning_paused
    loadDetailedData()
  }
})

// ✅ Status-Update-Funktionen via secure API
const updateInvoiceStatus = async (action: string) => {
  try {
    if (!props.invoice?.id) return
    
    await $fetch('/api/admin/invoice-update-status', {
      method: 'POST',
      body: { invoice_id: props.invoice.id, action }
    })
    
    return true
  } catch (error) {
    console.error(`Fehler bei Aktion ${action}:`, error)
    return false
  }
}

const editInvoice = async () => {
  if (!props.invoice?.id) return
  
  if (props.invoice.status !== 'draft') {
    await updateInvoiceStatus('draft')
  }
  emit('edit', props.invoice.id)
}

const sendInvoice = async () => {
  if (!props.invoice?.id) return
  if (await updateInvoiceStatus('sent')) {
    emit('send', props.invoice.id)
  }
}

const markAsPaid = async () => {
  if (!props.invoice?.id) return
  if (await updateInvoiceStatus('paid')) {
    emit('markAsPaid', props.invoice.id)
  }
}

const cancelInvoice = async () => {
  if (!props.invoice?.id) return
  if (await updateInvoiceStatus('cancelled')) {
    emit('cancel', props.invoice.id)
  }
}

const formatCurrency = (rappen: number): string => {
  if (rappen === 0) return 'CHF 0.-'
  const chf = rappen / 100
  return `CHF ${chf.toFixed(2).replace('.00', '.-')}`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich' })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('de-CH', { hour: 'numeric', minute: 'numeric' })
}

const isOverdue = (dueDate: string) => {
  return new Date(dueDate) < new Date()
}

/** Nach Mahnung das neue Zahlungsziel anzeigen, sonst Original-Fälligkeit */
const effectiveDueDate = computed(() => {
  const inv = props.invoice
  if (!inv) return ''
  return inv.dunning_due_date || inv.due_date || ''
})

const getAppointmentsCount = () => {
  if (props.invoice?.appointmentDetails) return 1;
  return props.invoice?.items?.filter((item: any) => item.appointment_id).length || 0;
};

const getAppointmentsSummary = () => {
  if (props.invoice?.appointmentDetails) return `Ein Termin ausgewählt`;
  const appointments = props.invoice?.items?.filter((item: any) => item.appointment_id) || [];
  if (appointments.length === 0) return '';
  if (appointments.length === 1) return `Ein Termin ausgewählt`;
  return `${appointments.length} Termine ausgewählt`;
};

const getAppointmentsTotal = () => {
  if (props.invoice?.appointmentDetails) return props.invoice.subtotal_rappen;
  return props.invoice?.items?.filter((item: any) => item.appointment_id).reduce((sum: number, item: any) => sum + item.total_price_rappen, 0) || 0;
};

const getProductsTotal = () => {
  return props.invoice?.productSales?.reduce((sum: number, sale: any) => sum + sale.total_amount_rappen, 0) || 0;
};

const getCustomerAddress = () => {
  if (!props.invoice) return '';
  const addressParts = [];
  if (props.invoice.billing_street) addressParts.push(props.invoice.billing_street);
  if (props.invoice.billing_street_number) addressParts.push(props.invoice.billing_street_number);
  if (props.invoice.billing_zip) addressParts.push(props.invoice.billing_zip);
  if (props.invoice.billing_city) addressParts.push(props.invoice.billing_city);
  if (props.invoice.billing_country) addressParts.push(props.invoice.billing_country);
  return addressParts.join(', ');
};



// Parse metadata aus fallbackPayment für Produktdetails
const parsedMetadata = computed(() => {
  if (!fallbackPayment.value?.metadata) return null;
  try {
    return JSON.parse(fallbackPayment.value.metadata);
  } catch (e) {
    console.warn('Could not parse metadata:', e);
    return null;
  }
});

// Extrahiere Produkte aus metadata
const metadataProducts = computed(() => {
  if (!parsedMetadata.value?.products) return [];
  return parsedMetadata.value.products || [];
});

// ✅ Diese Funktionen wurden durch die API ersetzt
// loadAllInvoicePayments und loadPaymentDetails werden jetzt von loadInvoicePayments und loadDetailedData abgedeckt



// Edit mode functions
const startEditing = () => {
  if (!props.invoice) return;
  
  // Kopiere die Rechnungsdaten für die Bearbeitung
  editedInvoice.value = { ...props.invoice };
  isEditing.value = true;
  
};

const cancelEditing = () => {
  // Verwerfe alle Änderungen
  editedInvoice.value = null;
  isEditing.value = false;
  
};

// Funktionen für Invoice Items
const addInvoiceItem = () => {
  if (!safeEditedInvoice.value.items) {
    safeEditedInvoice.value.items = [];
  }
  
  const newItem: InvoiceItem = {
    id: `temp-${Date.now()}`,
    invoice_id: props.invoice?.id || '',
    product_name: '',
    quantity: 1,
    unit_price_rappen: 0, // Wird in Rappen gespeichert
    total_price_rappen: 0,
    vat_rate: 7.70,
    vat_amount_rappen: 0,
    sort_order: (safeEditedInvoice.value.items?.length || 0),
    notes: '',
    created_at: new Date().toISOString()
  };
  
  safeEditedInvoice.value.items.push(newItem);
};

// Entfernen von Positionen ist deaktiviert

const editInvoiceItem = (item: InvoiceItem) => {
  const newName = prompt('Produktname eingeben:', item.product_name);
  if (newName) {
    const newPrice = prompt('Preis in CHF eingeben:', (item.unit_price_rappen / 100).toFixed(2));
    if (newPrice) {
      const chfValue = parseFloat(newPrice) || 0;
      const newQuantity = prompt('Menge eingeben:', item.quantity?.toString() || '1');
      if (newQuantity) {
        const qty = parseInt(newQuantity) || 1;
        
        // Aktualisiere das Produkt
        item.product_name = newName;
        item.unit_price_rappen = Math.round(chfValue * 100);
        item.quantity = qty;
        item.total_price_rappen = Math.round(chfValue * 100 * qty);
      }
    }
  }
};

// Funktion um den Rabatt von CHF in Rappen zu konvertieren
const updateDiscountAmount = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const chfValue = parseFloat(target.value) || 0;
  // Konvertiere CHF in Rappen (1 CHF = 100 Rappen)
  safeEditedInvoice.value.discount_amount_rappen = Math.round(chfValue * 100);
};

// Discount-Aktionen
// Aktionen für Produkte/Rabatte entfernt

const updateProductPrice = (index: number, event: Event) => {
  if (!safeEditedInvoice.value.items) return;
  
  const target = event.target as HTMLInputElement;
  const chfValue = parseFloat(target.value) || 0;
  // Konvertiere CHF in Rappen (1 CHF = 100 Rappen)
  safeEditedInvoice.value.items[index].unit_price_rappen = Math.round(chfValue * 100);
  
  // Aktualisiere auch den Gesamtpreis
  safeEditedInvoice.value.items[index].total_price_rappen = 
    safeEditedInvoice.value.items[index].quantity * safeEditedInvoice.value.items[index].unit_price_rappen;
};

const updateProductQuantity = (index: number, event: Event) => {
  if (!safeEditedInvoice.value.items) return;

  const target = event.target as HTMLInputElement;
  const quantity = parseInt(target.value) || 0;
  safeEditedInvoice.value.items[index].quantity = quantity;

  // Aktualisiere auch den Gesamtpreis
  safeEditedInvoice.value.items[index].total_price_rappen = 
    safeEditedInvoice.value.items[index].quantity * safeEditedInvoice.value.items[index].unit_price_rappen;
};

const updateProductName = (index: number, event: Event) => {
  if (!safeEditedInvoice.value.items) return;
  const target = event.target as HTMLInputElement;
  safeEditedInvoice.value.items[index].product_name = target.value;
};

// ✅ Speichere Änderungen via secure API
const saveChanges = async () => {
  if (!editedInvoice.value || !props.invoice) return;
  
  isSaving.value = true;
  
  try {
    await $fetch('/api/admin/invoice-save', {
      method: 'POST',
      body: {
        invoice_id: props.invoice.id,
        update_data: {
          due_date: editedInvoice.value.due_date,
          billing_company_name: editedInvoice.value.billing_company_name,
          billing_contact_person: editedInvoice.value.billing_contact_person,
          billing_street: editedInvoice.value.billing_street,
          billing_street_number: editedInvoice.value.billing_street_number,
          billing_zip: editedInvoice.value.billing_zip,
          billing_city: editedInvoice.value.billing_city,
          billing_country: editedInvoice.value.billing_country,
          billing_email: editedInvoice.value.billing_email,
          notes: editedInvoice.value.notes,
          payment_terms: (editedInvoice.value as any).payment_terms,
          footer_text: (editedInvoice.value as any).footer_text
        }
      }
    });
    
    // Aktualisiere die lokalen Daten nach dem Speichern
    if (fallbackPayment.value) {
      Object.assign(fallbackPayment.value, {
        due_date: editedInvoice.value.due_date,
        billing_company_name: editedInvoice.value.billing_company_name,
        billing_contact_person: editedInvoice.value.billing_contact_person,
        billing_street: editedInvoice.value.billing_street,
        billing_street_number: editedInvoice.value.billing_street_number,
        billing_zip: editedInvoice.value.billing_zip,
        billing_city: editedInvoice.value.billing_city,
        billing_country: editedInvoice.value.billing_country,
        billing_email: editedInvoice.value.billing_email,
        notes: editedInvoice.value.notes,
        payment_terms: (editedInvoice.value as any).payment_terms,
        footer_text: (editedInvoice.value as any).footer_text
      });
    }
    
    // Beende den Bearbeitungsmodus
    isEditing.value = false;
    
    // Emit updated event
    emit('updated', props.invoice.id);
    
    logger.debug('✅ Rechnungsdaten erfolgreich gespeichert via API');
    
  } catch (error) {
    console.error('❌ Error saving invoice changes:', error);
  } finally {
    isSaving.value = false;
  }
};

// Watch für Änderungen der Rechnungsdaten
watch(() => props.invoice, (newInvoice) => {
  if (newInvoice && isEditing.value) {
    // Wenn sich die Rechnungsdaten ändern und wir im Bearbeitungsmodus sind,
    // aktualisieren wir die bearbeitete Version
    editedInvoice.value = { ...newInvoice };
  }
}, { deep: true });

</script>
