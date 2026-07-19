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
      <div class="flex-none sticky top-0 z-10 bg-white border-b border-gray-200">
        <!-- Mobile drag handle -->
        <div class="flex justify-center pt-3 pb-1 sm:hidden">
          <div class="w-10 h-1 bg-gray-300 rounded-full"/>
        </div>

        <div class="flex items-center justify-between px-4 py-3 gap-2">
          <h3 class="text-base font-semibold text-gray-900 truncate">
            <span class="hidden sm:inline">{{ isEditing ? 'Rechnung bearbeiten' : 'Rechnungsdetails' }}</span>
            <span class="sm:hidden">{{ invoice?.invoice_number || (isEditing ? 'Bearbeiten' : 'Details') }}</span>
          </h3>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- View mode buttons -->
            <template v-if="!isEditing">
              <!-- PDF Download -->
              <button
                :disabled="isDownloadingPdf"
                class="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                @click="downloadPdf"
                title="PDF öffnen"
              >
                <svg class="w-4 h-4 flex-shrink-0" :class="{ 'animate-spin': isDownloadingPdf }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="!isDownloadingPdf" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 3v6h6M9 13h6m-6 4h4" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="hidden sm:inline">PDF</span>
              </button>
              <!-- Edit – icon only on mobile -->
              <button
                class="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="startEditing"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span class="hidden sm:inline">Bearbeiten</span>
              </button>
              <!-- Send -->
              <button
                class="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="emit('send', invoice?.id || '')"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span class="hidden sm:inline">Versenden</span>
              </button>
              <!-- Mark paid → opens dialog -->
              <button
                class="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                @click="openMarkPaidDialog"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="hidden sm:inline">Zahlung erfassen</span>
              </button>
              <!-- Mahnung senden -->
              <button
                v-if="canSendDunning"
                class="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 border border-transparent rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                @click="showDunningDialog = true"
                title="Zahlungserinnerung / Mahnung senden"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span class="hidden sm:inline">Mahnung</span>
              </button>
              <!-- Cancel invoice -->
              <button
                class="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                @click="emit('cancel', invoice?.id || '')"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span class="hidden sm:inline">Stornieren</span>
              </button>
            </template>

            <!-- Edit mode buttons -->
            <template v-else>
              <button
                :disabled="isSaving"
                class="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-3 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                @click="saveChanges"
              >
                <svg v-if="isSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ isSaving ? 'Speichern...' : 'Speichern' }}
              </button>
              <button
                :disabled="isSaving"
                class="inline-flex items-center px-2.5 py-2 sm:px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                @click="cancelEditing"
              >
                Abbrechen
              </button>
            </template>

            <!-- Close -->
            <button class="p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none ml-1" @click="closeModal">
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

            <!-- ── Info Grid: 3 cards on desktop, stacked on mobile ── -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <!-- Rechnungsinformationen -->
              <div class="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Rechnungsinformationen</h4>
                <dl class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Nummer</dt>
                    <dd class="text-sm font-medium text-gray-900 text-right">{{ invoice.invoice_number }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Status</dt>
                    <dd><InvoiceStatusBadge :status="invoice.status" /></dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Zahlung</dt>
                    <dd><PaymentStatusBadge :status="invoice.payment_status" /></dd>
                  </div>
                  <template v-if="invoice.paid_amount_rappen">
                    <div class="flex items-center justify-between gap-2">
                      <dt class="text-sm text-gray-500 flex-shrink-0">Bezahlt</dt>
                      <dd class="text-sm font-semibold text-green-600">{{ formatCurrency(invoice.paid_amount_rappen) }}</dd>
                    </div>
                    <div v-if="invoice.paid_amount_rappen < invoice.total_amount_rappen" class="flex items-center justify-between gap-2">
                      <dt class="text-sm text-gray-500 flex-shrink-0">Ausstehend</dt>
                      <dd class="text-sm font-semibold text-amber-600">{{ formatCurrency(invoice.total_amount_rappen - invoice.paid_amount_rappen) }}</dd>
                    </div>
                    <div v-if="invoice.paid_amount_rappen < invoice.total_amount_rappen" class="col-span-2 mt-1">
                      <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="bg-green-500 h-1.5 rounded-full" :style="{ width: Math.min(100, (invoice.paid_amount_rappen / invoice.total_amount_rappen) * 100) + '%' }"></div>
                      </div>
                    </div>
                    <div v-if="invoice.paid_at" class="flex items-center justify-between gap-2">
                      <dt class="text-sm text-gray-500 flex-shrink-0">Bezahlt am</dt>
                      <dd class="text-sm text-gray-900">{{ formatDate(invoice.paid_at) }}</dd>
                    </div>
                  </template>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Erstellt</dt>
                    <dd class="text-sm text-gray-900">{{ formatDate(invoice.created_at) }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Fällig</dt>
                    <dd class="text-sm font-medium">
                      <input
                        v-if="isEditing"
                        v-model="safeEditedInvoice.due_date"
                        type="date"
                        class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                      <span v-else-if="invoice.due_date" :class="isOverdue(invoice.due_date) ? 'text-red-600' : 'text-gray-900'">
                        {{ formatDate(invoice.due_date) }}
                      </span>
                      <span v-else class="text-gray-400">—</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Kundeninformationen -->
              <div class="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Kundeninformationen</h4>
                <dl class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Name</dt>
                    <dd class="text-sm font-medium text-gray-900 text-right">{{ customerData?.first_name || '' }} {{ customerData?.last_name || '' }}</dd>
                  </div>
                  <div class="flex items-start justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">E-Mail</dt>
                    <dd class="text-sm text-gray-900 text-right break-all">{{ customerData?.email || '—' }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Telefon</dt>
                    <dd class="text-sm text-gray-900">{{ customerData?.phone || '—' }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-sm text-gray-500 flex-shrink-0">Adresse</dt>
                    <dd class="text-sm text-gray-900 text-right">
                      {{ customerData?.street || '' }} {{ customerData?.street_nr || '' }}<br v-if="customerData?.zip || customerData?.city">
                      {{ customerData?.zip || '' }} {{ customerData?.city || '' }}
                    </dd>
                  </div>
                </dl>

                <!-- Versandhistorie -->
                <div v-if="(invoice as any).sent_at || invoice.created_at" class="pt-2 mt-2 border-t border-gray-200 space-y-1.5">
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Versandhistorie</p>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0"></span>
                      <span>Erstellt</span>
                      <span class="ml-auto text-gray-700">{{ formatDate(invoice.created_at) }}</span>
                    </div>
                    <div v-if="(invoice as any).sent_at" class="flex items-center gap-2 text-xs text-gray-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                      <span>Versendet</span>
                      <span class="ml-auto text-gray-700">{{ formatDateTime((invoice as any).sent_at) }}</span>
                    </div>
                    <div v-else class="flex items-center gap-2 text-xs text-gray-400 italic">
                      <span class="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0"></span>
                      <span>Noch nicht versendet</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Rechnungsadresse -->
              <div class="bg-gray-50 rounded-xl p-4 space-y-3 sm:col-span-2 lg:col-span-1">
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Rechnungsadresse</h4>
                <div class="grid grid-cols-1 gap-3">

                  <!-- E-Mail -->
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Rechnungs-E-Mail</label>
                    <input
                      v-if="isEditing"
                      v-model="safeEditedInvoice.billing_email"
                      type="email"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :placeholder="invoice.billing_email || invoice.customer_email || 'rechnung@firma.ch'"
                    >
                    <span v-else class="text-sm text-gray-900">{{ invoice.billing_email || invoice.customer_email || '—' }}</span>
                  </div>

                  <!-- Firma & Kontakt in 2 cols -->
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Firma</label>
                      <input
                        v-if="isEditing"
                        v-model="safeEditedInvoice.billing_company_name"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_company_name || 'Firmenname'"
                      >
                      <span v-else class="text-sm text-gray-900">{{ invoice.billing_company_name || '—' }}</span>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Kontaktperson</label>
                      <input
                        v-if="isEditing"
                        v-model="safeEditedInvoice.billing_contact_person"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_contact_person || 'Kontaktperson'"
                      >
                      <span v-else class="text-sm text-gray-900">{{ invoice.billing_contact_person || '—' }}</span>
                    </div>
                  </div>

                  <!-- Strasse & Nr -->
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Strasse, Nr.</label>
                    <div v-if="isEditing" class="flex gap-2 min-w-0">
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
                        :placeholder="'Nr.'"
                      >
                    </div>
                    <span v-else class="text-sm text-gray-900">{{ invoice.billing_street || '' }} {{ invoice.billing_street_number || '' || '—' }}</span>
                  </div>

                  <!-- PLZ / Ort / Land -->
                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">PLZ</label>
                      <input
                        v-if="isEditing"
                        v-model="safeEditedInvoice.billing_zip"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_zip || 'PLZ'"
                      >
                      <span v-else class="text-sm text-gray-900">{{ invoice.billing_zip || '—' }}</span>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Ort</label>
                      <input
                        v-if="isEditing"
                        v-model="safeEditedInvoice.billing_city"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_city || 'Ort'"
                      >
                      <span v-else class="text-sm text-gray-900">{{ invoice.billing_city || '—' }}</span>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Land</label>
                      <input
                        v-if="isEditing"
                        v-model="safeEditedInvoice.billing_country"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="invoice.billing_country || 'Land'"
                      >
                      <span v-else class="text-sm text-gray-900">{{ invoice.billing_country || '—' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Zahlungshistorie ── -->
            <div v-if="invoicePaymentsHistory.length > 0" class="bg-gray-50 rounded-xl p-4">
              <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Zahlungshistorie</h4>
              <div class="space-y-2">
                <div
                  v-for="(payment, index) in invoicePaymentsHistory"
                  :key="payment.id"
                  class="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
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
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                    Bezahlt
                  </span>
                </div>
                <!-- Summe -->
                <div class="flex items-center justify-between px-3 py-2 border-t border-gray-200 mt-1 pt-2">
                  <span class="text-xs font-semibold text-gray-500">Total bezahlt</span>
                  <span class="text-sm font-bold text-green-600">
                    {{ formatCurrency(invoicePaymentsHistory.reduce((sum, p) => sum + p.amount_rappen, 0)) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- ── Mahnwesen ── -->
            <div v-if="canSendDunning || dunningLevel > 0 || dunningLog.length > 0" class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mahnwesen</h4>
                <div class="flex items-center gap-3">
                  <span v-if="dunningLevel > 0" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :style="dunningLevelBadgeStyle">
                    {{ dunningLevelLabel }}
                  </span>
                  <button v-if="canSendDunning || dunningLevel > 0" @click="toggleDunningPause" class="text-xs text-gray-500 hover:text-gray-700 underline">
                    {{ dunningPaused ? 'Mahnwesen reaktivieren' : 'Mahnwesen pausieren' }}
                  </button>
                </div>
              </div>

              <div v-if="dunningLog.length === 0" class="text-sm text-gray-400 italic">Noch keine Mahnung versendet.</div>
              <div v-else class="space-y-2">
                <div v-for="entry in dunningLog" :key="entry.id" class="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ dunningStageLabel(entry.stage) }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(entry.sent_at) }} · an {{ entry.sent_to }}</p>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <span v-if="entry.status === 'sent'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Versendet</span>
                    <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Fehlgeschlagen</span>
                    <p v-if="entry.fee_rappen > 0" class="text-xs text-gray-400 mt-0.5">+{{ formatCurrency(entry.fee_rappen) }} Gebühr</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Rechnungsübersicht ── -->
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">Rechnungsübersicht</h4>
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

import { defineProps, defineEmits, ref, watch, computed, nextTick } from 'vue'
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
const downloadPdf = async () => {
  if (!props.invoice?.id || isDownloadingPdf.value) return
  isDownloadingPdf.value = true
  try {
    const res: any = await $fetch('/api/invoices/download', {
      method: 'POST',
      body: { invoiceId: props.invoice.id },
    })
    if (res?.pdfUrl) {
      const link = document.createElement('a')
      link.href = res.pdfUrl
      link.download = `${props.invoice.invoice_number}.pdf`
      link.click()
    }
    // Draft moves to "PDF erstellt" once a PDF has actually been generated
    if (res?.newStatus) {
      emit('statusChanged', props.invoice.id, res.newStatus)
    }
  } catch (e) {
    console.error('PDF download failed:', e)
  } finally {
    isDownloadingPdf.value = false
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

const dunningLevelLabel = computed(() => dunningStageLabel(dunningLevel.value))
const dunningLevelBadgeStyle = computed(() => {
  const color = DUNNING_STAGE_COLORS[dunningLevel.value] || '#6b7280'
  return { background: color + '1a', color }
})

const loadDunningLog = async () => {
  if (!props.invoice?.id) return
  try {
    const res = await $fetch<any>('/api/invoices/dunning-log', { query: { invoice_id: props.invoice.id } })
    dunningLog.value = res?.entries || []
    dunningLevel.value = res?.dunning_level || 0
    dunningPaused.value = !!res?.dunning_paused
  } catch (e) {
    console.error('Fehler beim Laden der Mahnhistorie:', e)
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
let _loadingDetailsCalled = false
const loadDetailedData = async () => {
  // Initialisiere editedInvoice wenn das Modal geöffnet wird
  if (props.invoice) {
    editedInvoice.value = { ...props.invoice };
  }
  
  if (!props.invoice || !props.show) {
    return;
  }

  // Verhindere parallele Aufrufe
  if (_loadingDetailsCalled) return;
  _loadingDetailsCalled = true;
  
  isLoadingDetails.value = true;
  
  try {
    // ✅ Lade Tenant-Standardtexte für Platzhalter
    try {
      const settings = await $fetch<any>('/api/admin/invoice-settings')
      tenantInvoiceTexts.value = {
        invoice_intro_text: settings?.invoice_intro_text || null,
        invoice_payment_terms: settings?.invoice_payment_terms || null,
        invoice_footer_text: settings?.invoice_footer_text || null,
      }
    } catch (e) {
      // ignore
    }

    // ✅ Lade alle Payments für diese Rechnung
    await loadInvoicePayments();
    await loadInvoicePaymentsHistory();
    await loadDunningLog();
    
    // ✅ Lade detaillierte Daten via API
    if (props.invoice.user_id) {
      try {
        const response = await $fetch('/api/admin/invoice-details', {
          method: 'GET',
          query: { user_id: props.invoice.user_id }
        }) as any;
        
        if (response) {
          // Latest payment
          if (response.latestPayment) {
            fallbackPayment.value = response.latestPayment;
          }
          
          // Appointment details
          if (response.appointmentDetails) {
            appointmentStartTime.value = response.appointmentDetails.start_time;
            appointmentEventTypeCode.value = response.appointmentDetails.event_type_code;
            appointmentType.value = response.appointmentDetails.type;
          }
          
          // Event type name
          if (response.eventTypeName) {
            appointmentEventTypeName.value = response.eventTypeName;
          }
          
          // Customer data
          if (response.customerData) {
            customerData.value = response.customerData;
            logger.debug('✅ Customer data loaded via API:', response.customerData);
          }
        }
      } catch (e) {
        console.warn('Could not load detailed data via API:', e);
      }
    }
  } catch (error) {
    console.error('Error loading detailed data:', error);
  } finally {
    isLoadingDetails.value = false;
    _loadingDetailsCalled = false;
  }
};

// Watch für show prop um Daten zu laden
watch(() => props.show, (newShow) => {
  if (newShow && props.invoice) {
    _loadingDetailsCalled = false;
    loadDetailedData();
    
    if (props.startInEditMode) {
      setTimeout(() => {
        startEditing();
      }, 300);
    }
  }
});

// Watch für invoice prop: nur neu laden wenn sich die Rechnungs-ID ändert (nicht wenn Items nachgeladen werden)
watch(() => props.invoice?.id, (newId, oldId) => {
  if (newId && newId !== oldId && props.show) {
    _loadingDetailsCalled = false;
    loadDetailedData();
  }
});


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
