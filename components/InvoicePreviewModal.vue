<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div class="bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-2xl max-h-[96dvh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-t-2xl">

        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" :style="{ background: primaryGradient }">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-900 leading-tight">{{ props.mode === 'view' ? 'Rechnung' : 'Rechnungsvorschau' }}</h2>
              <p class="text-xs text-gray-400 font-mono">{{ props.mode === 'view' ? props.viewInvoice?.invoice_number : draft?.invoice_number_preview }}</p>
            </div>
          </div>
          <button @click="close" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto">
          <!-- Invoice card -->
          <div class="mx-3 sm:mx-4 mt-3 sm:mt-4 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

            <!-- Invoice top bar -->
            <div class="px-4 sm:px-5 py-4 flex items-center justify-between gap-4" :style="{ background: primaryGradient }">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: rgba(255,255,255,0.7)">Rechnung</p>
                <p class="text-base sm:text-lg font-black text-white font-mono">{{ props.mode === 'view' ? props.viewInvoice?.invoice_number : draft?.invoice_number_preview }}</p>
              </div>
              <div class="text-right flex flex-col items-end gap-1">
                <!-- Bezahlt-Badge -->
                <span v-if="props.mode === 'view' && props.viewInvoice?.payment_status === 'paid'" class="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  Bezahlt
                </span>
                <span v-else-if="props.mode === 'view' && props.viewInvoice?.payment_status === 'partial'" class="inline-flex items-center gap-1 bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Teilweise bezahlt
                </span>
                <p class="text-xs mb-0" style="color: rgba(255,255,255,0.7)">Gesamtbetrag</p>
                <p class="text-xl sm:text-2xl font-black text-white">{{ chf(props.mode === 'view' ? (props.viewInvoice?.total_amount_rappen || 0) : computedTotal) }}</p>
              </div>
            </div>

            <!-- From / To -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
              <!-- Datum -->
              <div class="bg-white px-5 py-4">
                <div class="grid grid-cols-2 sm:grid-cols-1 gap-3">
                  <div>
                    <p class="text-xs text-gray-400 mb-0.5">Rechnungsdatum</p>
                    <p class="text-sm font-semibold text-gray-800">{{ formatDate(props.mode === 'view' ? props.viewInvoice?.invoice_date : draft?.invoice_date) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-400 mb-0.5">Fällig am</p>
                    <div class="flex items-center gap-1.5">
                      <!-- View mode: static -->
                      <p v-if="props.mode === 'view'" class="text-sm font-semibold text-gray-800">{{ formatDate(props.viewInvoice?.due_date) }}</p>
                      <!-- Edit mode -->
                      <template v-else>
                        <p v-if="!editingDueDate" class="text-sm font-semibold text-gray-800">{{ formatDate(localDueDate) }}</p>
                        <input
                          v-else
                          v-model="localDueDate"
                          type="date"
                          class="date-compact font-semibold text-gray-800 border rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:border-transparent bg-gray-50"
                          :style="{ borderColor: primaryColor + '40', '--tw-ring-color': primaryColor }"
                          @blur="editingDueDate = false"
                        />
                        <button @click="editingDueDate = !editingDueDate" class="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Rechnungsadresse -->
              <div class="bg-white px-5 py-4 border-t border-gray-100 sm:border-t-0">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-xs font-bold uppercase tracking-wider text-gray-400">Rechnungsadresse</p>
                  <button
                    v-if="props.mode !== 'view'"
                    @click="editingAddress = !editingAddress"
                    class="text-xs font-semibold flex items-center gap-1 transition-colors"
                    :style="{ color: primaryColor }"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {{ editingAddress ? 'Fertig' : 'Bearbeiten' }}
                  </button>
                </div>

                <!-- Read mode -->
                <div v-if="props.mode === 'view' || !editingAddress" class="space-y-0.5">
                  <template v-if="props.mode === 'view'">
                    <p v-if="props.viewInvoice?.billing_company_name" class="text-sm font-semibold text-gray-800">{{ props.viewInvoice.billing_company_name }}</p>
                    <p class="text-sm font-semibold text-gray-800">{{ props.viewInvoice?.billing_contact_person }}</p>
                    <p v-if="props.viewInvoice?.billing_street" class="text-xs text-gray-500">
                      {{ props.viewInvoice.billing_street }}{{ (props.viewInvoice as any)?.billing_street_number ? ' ' + (props.viewInvoice as any).billing_street_number : '' }}
                    </p>
                    <p v-if="props.viewInvoice?.billing_zip || props.viewInvoice?.billing_city" class="text-xs text-gray-500">{{ props.viewInvoice?.billing_zip }} {{ props.viewInvoice?.billing_city }}</p>
                    <p v-if="props.viewInvoice?.billing_email" class="text-xs break-all" :style="{ color: primaryColor }">{{ props.viewInvoice.billing_email }}</p>
                    <p v-if="!props.viewInvoice?.billing_contact_person && !props.viewInvoice?.billing_company_name" class="text-xs text-orange-400 italic">Keine Rechnungsadresse</p>
                  </template>
                  <template v-else>
                    <p v-if="localBilling.company_name" class="text-xs font-semibold text-gray-500">{{ localBilling.company_name }}</p>
                    <p class="text-sm font-semibold text-gray-800">{{ localBilling.first_name }} {{ localBilling.last_name }}</p>
                    <p v-if="localBilling.street" class="text-xs text-gray-500">{{ localBilling.street }} {{ localBilling.street_nr }}</p>
                    <p v-if="localBilling.zip || localBilling.city" class="text-xs text-gray-500">{{ localBilling.zip }} {{ localBilling.city }}</p>
                    <p v-if="localBilling.email" class="text-xs break-all" :style="{ color: primaryColor }">{{ localBilling.email }}</p>
                    <p v-if="!localBilling.street && !localBilling.zip" class="text-xs text-orange-500 italic">Keine Adresse hinterlegt</p>
                  </template>
                </div>

                <!-- Edit mode (only in edit mode) -->
                <div v-else class="space-y-2">
                  <input v-model="localBilling.company_name" placeholder="Firmenname (optional)" class="input-field w-full" />
                  <div class="grid grid-cols-2 gap-2">
                    <input v-model="localBilling.first_name" placeholder="Vorname *" required class="input-field" :class="{ 'border-red-400': billingErrors.first_name }" />
                    <input v-model="localBilling.last_name" placeholder="Nachname *" required class="input-field" :class="{ 'border-red-400': billingErrors.last_name }" />
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <input v-model="localBilling.street" placeholder="Strasse *" required class="input-field col-span-2" :class="{ 'border-red-400': billingErrors.street }" />
                    <input v-model="localBilling.street_nr" placeholder="Nr." class="input-field" />
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <input v-model="localBilling.zip" placeholder="PLZ *" required class="input-field" :class="{ 'border-red-400': billingErrors.zip }" />
                    <input v-model="localBilling.city" placeholder="Ort *" required class="input-field col-span-2" :class="{ 'border-red-400': billingErrors.city }" />
                  </div>
                  <input v-model="localBilling.email" placeholder="E-Mail *" type="email" required class="input-field w-full" :class="{ 'border-red-400': billingErrors.email }" />
                  <p v-if="Object.values(billingErrors).some(Boolean)" class="text-xs text-red-500">Bitte alle Pflichtfelder ausfüllen.</p>
                </div>
              </div>
            </div>

            <!-- Items table -->
            <div class="bg-white">
              <div class="px-5 py-3 bg-gray-50 border-t border-b border-gray-100 grid grid-cols-12 gap-2">
                <p class="col-span-8 text-xs font-bold uppercase tracking-wider text-gray-400">Position</p>
                <p class="col-span-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Betrag</p>
              </div>

              <div class="divide-y divide-gray-50">
                <div v-for="(item, i) in (props.mode === 'view' ? (props.viewInvoice?.invoice_items || []) : (draft?.items || []))" :key="i">
                  <!-- Main row -->
                  <div
                    class="px-5 py-3 grid grid-cols-12 gap-2 items-start cursor-pointer hover:bg-gray-50 transition-colors"
                    @click="toggleItem(i)"
                  >
                    <div class="col-span-8">
                      <div class="flex items-start gap-2">
                        <svg
                          class="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0 transition-transform"
                          :class="{ 'rotate-90': expandedItems.includes(i) }"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <div>
                          <p class="text-sm font-semibold text-gray-800">{{ item.product_name }}</p>
                          <p v-if="item.product_description || item.appointment_date || item.appointment_start_time" class="text-xs text-gray-400 mt-0.5">
                            <span v-if="item.appointment_start_time || item.appointment_date">{{ formatAppointmentDate(item.appointment_start_time || item.appointment_date) }}</span>
                            <span v-if="(item.appointment_start_time || item.appointment_date) && item.appointment_duration_minutes"> · </span>
                            <span v-if="item.appointment_duration_minutes">{{ item.appointment_duration_minutes }} min</span>
                            <span v-if="item.product_description && (item.appointment_start_time || item.appointment_date || item.appointment_duration_minutes)"> · </span>
                            <span v-if="item.product_description">{{ item.product_description }}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div class="col-span-4 text-right">
                      <p class="text-sm font-bold text-gray-800">{{ chf(item.total_price_rappen) }}</p>
                    </div>
                  </div>

                  <!-- Breakdown rows (expandable) -->
                  <div v-if="expandedItems.includes(i)" class="bg-gray-50 border-t border-gray-100 px-5 py-2 space-y-1.5">
                    <div v-if="(item.lesson_price_rappen || 0) > 0" class="flex justify-between items-center">
                      <span class="text-xs text-gray-500 pl-5">Fahrstunde</span>
                      <span class="text-xs font-medium text-gray-700">{{ chf(item.lesson_price_rappen || 0) }}</span>
                    </div>
                    <div v-if="(item.admin_fee_rappen || 0) > 0" class="flex justify-between items-center">
                      <span class="text-xs text-gray-500 pl-5">Admin-Gebühr</span>
                      <span class="text-xs font-medium text-gray-700">{{ chf(item.admin_fee_rappen || 0) }}</span>
                    </div>
                    <template v-if="(item.products_price_rappen || 0) > 0">
                      <template v-if="item.product_details && item.product_details.length > 0">
                        <div v-for="pd in item.product_details" :key="pd.name" class="flex justify-between items-center">
                          <span class="text-xs text-gray-500 pl-5">{{ pd.name }}</span>
                          <span class="text-xs font-medium text-gray-700">{{ chf(pd.price_rappen) }}</span>
                        </div>
                      </template>
                      <div v-else class="flex justify-between items-center">
                        <span class="text-xs text-gray-500 pl-5">Material / Produkte</span>
                        <span class="text-xs font-medium text-gray-700">{{ chf(item.products_price_rappen || 0) }}</span>
                      </div>
                    </template>
                    <div v-if="(item.discount_amount_rappen || 0) > 0" class="flex justify-between items-center">
                      <span class="text-xs text-green-600 pl-5">Rabatt</span>
                      <span class="text-xs font-medium text-green-600">−{{ chf(item.discount_amount_rappen || 0) }}</span>
                    </div>
                    <div v-if="(item.voucher_discount_rappen || 0) > 0" class="flex justify-between items-center">
                      <span class="text-xs text-green-600 pl-5">Gutschein</span>
                      <span class="text-xs font-medium text-green-600">−{{ chf(item.voucher_discount_rappen || 0) }}</span>
                    </div>
                    <div v-if="(item.credit_used_rappen || 0) > 0" class="flex justify-between items-center">
                      <span class="text-xs text-blue-600 pl-5">Guthaben verwendet</span>
                      <span class="text-xs font-medium text-blue-600">−{{ chf(item.credit_used_rappen || 0) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Totals -->
              <div class="px-5 py-4 border-t border-gray-200 space-y-2 bg-gray-50">
                <div class="flex justify-between text-sm text-gray-600">
                  <span>Zwischensumme</span>
                  <span>{{ chf(props.mode === 'view' ? (props.viewInvoice?.subtotal_rappen || 0) : (draft?.subtotal_rappen || 0)) }}</span>
                </div>
                <div v-if="props.mode === 'view' && (props.viewInvoice?.discount_amount_rappen || 0) > 0" class="flex justify-between text-sm text-green-600">
                  <span>Rabatt</span>
                  <span>−{{ chf(props.viewInvoice?.discount_amount_rappen || 0) }}</span>
                </div>
                <div v-if="props.mode !== 'view' && totalDiscounts > 0" class="flex justify-between text-sm text-green-600">
                  <span>Rabatte / Gutscheine</span>
                  <span>−{{ chf(totalDiscounts) }}</span>
                </div>
                <div v-if="props.mode !== 'view' && totalCredits > 0" class="flex justify-between text-sm text-blue-600">
                  <span>Guthaben</span>
                  <span>−{{ chf(totalCredits) }}</span>
                </div>
                <div v-if="(props.mode === 'view' ? (props.viewInvoice?.vat_rate || 0) : (draft?.vat_rate || 0)) > 0" class="flex justify-between text-sm text-gray-600">
                  <span>MwSt {{ props.mode === 'view' ? props.viewInvoice?.vat_rate : draft?.vat_rate }}%</span>
                  <span>{{ chf(props.mode === 'view' ? (props.viewInvoice?.vat_amount_rappen || 0) : (draft?.vat_amount_rappen || 0)) }}</span>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span class="text-base font-bold text-gray-900">Gesamtbetrag</span>
                  <span class="text-xl font-black" :style="{ color: primaryColor }">{{ chf(props.mode === 'view' ? (props.viewInvoice?.total_amount_rappen || 0) : computedTotal) }}</span>
                </div>
              </div>

              <!-- Swiss QR-Rechnung -->
              <div v-if="draft?.qr_iban || qrDataUrl" class="border-t-2 border-dashed border-gray-200">
                <div class="px-5 py-4 flex items-start gap-4">
                  <!-- QR Code -->
                  <div class="flex-shrink-0">
                    <div v-if="qrLoading" class="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <div v-else-if="qrDataUrl" class="border border-gray-200 rounded-lg p-1.5 bg-white">
                      <img :src="qrDataUrl" alt="Swiss QR Code" class="w-24 h-24" />
                    </div>
                    <div v-else class="w-24 h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                      <span class="text-xs text-gray-400 text-center px-2">QR wird geladen…</span>
                    </div>
                  </div>
                  <!-- Payment info -->
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Swiss QR-Rechnung</p>
                    <div class="space-y-1">
                      <div v-if="draft?.qr_iban">
                        <p class="text-xs text-gray-400">QR-IBAN</p>
                        <p class="text-xs font-mono font-semibold text-gray-700 break-all">{{ draft?.qr_iban }}</p>
                      </div>
                      <div v-if="draft?.creditor_name">
                        <p class="text-xs text-gray-400">Empfänger</p>
                        <p class="text-xs font-semibold text-gray-700">{{ draft?.creditor_name }}</p>
                        <p v-if="draft?.creditor_zip" class="text-xs text-gray-500">{{ draft?.creditor_zip }} {{ draft?.creditor_city }}</p>
                      </div>
                      <div v-if="scorRef">
                        <p class="text-xs text-gray-400">Referenz</p>
                        <p class="text-xs font-mono font-semibold text-gray-700">{{ scorRef }}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-400">Betrag</p>
                        <p class="text-sm font-bold" :style="{ color: primaryColor }">{{ chf(computedTotal) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Note -->
          <div class="mx-3 sm:mx-4 mb-4 mt-3">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Notiz</label>
            <textarea
              v-model="localNote"
              rows="2"
              placeholder="z.B. Danke für die gute Zusammenarbeit!"
              :readonly="props.mode === 'view'"
              class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              :class="{ 'bg-gray-50 text-gray-500 cursor-default': props.mode === 'view' }"
              :style="props.mode !== 'view' ? { '--tw-ring-color': primaryColor } : {}"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          <div v-if="error" class="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {{ error }}
          </div>
          <div v-if="successMessage" class="mb-3 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700 flex items-center gap-2">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {{ successMessage }}
          </div>
          <div class="flex gap-3">
            <button
              @click="close"
              :disabled="isSending || isResending"
              class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {{ props.mode === 'view' ? 'Schliessen' : 'Später' }}
            </button>
            <!-- Erneut senden (nur im view-Modus) -->
            <button
              v-if="props.mode === 'view'"
              @click="resendInvoice"
              :disabled="isResending"
              class="flex-1 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :style="{ borderColor: primaryColor, color: primaryColor }"
            >
              <svg v-if="isResending" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {{ isResending ? 'Wird gesendet…' : 'Erneut senden' }}
            </button>
            <!-- Rechnung senden (nur im draft-Modus) -->
            <button
              v-if="props.mode !== 'view'"
              @click="sendInvoice"
              :disabled="isSending || !draft || !isBillingComplete"
              class="flex-1 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:brightness-110 disabled:shadow-none disabled:hover:brightness-100"
              :style="isBillingComplete ? { background: primaryGradient } : { background: '#9ca3af' }"
            >
              <svg v-if="isSending" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {{ isSending ? 'Wird gesendet…' : `Rechnung senden` }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDynamicBranding } from '~/composables/useDynamicBranding'

interface InvoiceDraftItem {
  product_name: string
  product_description?: string | null
  appointment_date?: string | null
  appointment_start_time?: string | null
  appointment_id?: string | null
  appointment_duration_minutes?: number | null
  payment_id: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  lesson_price_rappen: number
  admin_fee_rappen: number
  products_price_rappen: number
  discount_amount_rappen: number
  voucher_discount_rappen: number
  credit_used_rappen: number
}

interface InvoiceDraft {
  invoice_number_preview: string
  invoice_date: string
  due_date: string
  billing_email: string
  billing_type: string
  billing_first_name?: string
  billing_last_name?: string
  billing_company_name?: string
  billing_street?: string
  billing_street_nr?: string
  billing_zip?: string
  billing_city?: string
  billing_country: string
  subtotal_rappen: number
  vat_rate: number
  vat_amount_rappen: number
  discount_amount_rappen: number
  credit_used_rappen?: number
  total_amount_rappen: number
  user_id: string
  staff_id: string
  tenant_id: string
  payment_ids: string[]
  items: InvoiceDraftItem[]
  student: { id: string; name: string; email: string }
  qr_iban?: string | null
  creditor_name?: string
  creditor_street?: string
  creditor_street_nr?: string
  creditor_zip?: string
  creditor_city?: string
}

const props = defineProps<{
  modelValue: boolean
  draft: InvoiceDraft | null
  mode?: 'edit' | 'view'
  viewInvoice?: {
    id?: string
    invoice_number: string
    invoice_date: string
    due_date: string
    payment_status?: string
    paid_at?: string
    total_amount_rappen: number
    billing_contact_person?: string
    billing_company_name?: string
    billing_street?: string
    billing_zip?: string
    billing_city?: string
    billing_email?: string
    subtotal_rappen: number
    vat_rate: number
    vat_amount_rappen: number
    discount_amount_rappen: number
    notes?: string | null
    invoice_items: { product_name: string; product_description?: string; appointment_date?: string; appointment_start_time?: string; appointment_duration_minutes?: number; quantity: number; unit_price_rappen: number; total_price_rappen: number; lesson_price_rappen?: number; admin_fee_rappen?: number; products_price_rappen?: number; discount_amount_rappen?: number; voucher_discount_rappen?: number; credit_used_rappen?: number; product_details?: { name: string; price_rappen: number }[] }[]
  } | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'sent': [result: { invoice_id: string; invoice_number: string; total_amount_rappen: number }]
}>()

// Tenant branding
const { brandingPrimaryColor, brandingSecondaryColor, brandingName } = useDynamicBranding()
const primaryColor = computed(() => brandingPrimaryColor.value || '#1E40AF')
const secondaryColor = computed(() => brandingSecondaryColor.value || '#64748B')

// Darken primary color slightly for gradient end
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

const primaryGradient = computed(() => {
  const end = adjustBrightness(primaryColor.value, 40)
  return `linear-gradient(135deg, ${primaryColor.value} 0%, ${end} 100%)`
})

const isSending = ref(false)
const isResending = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const localDueDate = ref('')
const localNote = ref('')
const editingAddress = ref(false)
const editingDueDate = ref(false)
const expandedItems = ref<number[]>([])
const qrDataUrl = ref<string | null>(null)
const qrLoading = ref(false)

const localBilling = ref({
  company_name: '',
  first_name: '',
  last_name: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  email: '',
})

const billingErrors = ref({
  first_name: false,
  last_name: false,
  street: false,
  zip: false,
  city: false,
  email: false,
})

const isBillingComplete = computed(() =>
  !!localBilling.value.first_name.trim() &&
  !!localBilling.value.last_name.trim() &&
  !!localBilling.value.street.trim() &&
  !!localBilling.value.zip.trim() &&
  !!localBilling.value.city.trim() &&
  !!localBilling.value.email.trim()
)

watch(() => props.draft, (d) => {
  if (d) {
    localDueDate.value = d.due_date
    localNote.value = `Vielen Dank für Ihren Auftrag, welchen wir hiermit in Rechnung stellen.\nFreundliche Grüsse\n${brandingName.value || 'Driving Team'}`
    error.value = null
    editingAddress.value = false
    editingDueDate.value = false
    expandedItems.value = []
    qrDataUrl.value = null
    localBilling.value = {
      company_name: d.billing_company_name || (d as any).billing_company_name || '',
      first_name: d.billing_first_name || ((d as any).billing_contact_person?.split(' ')[0] || ''),
      last_name: d.billing_last_name || ((d as any).billing_contact_person?.split(' ').slice(1).join(' ') || ''),
      street: d.billing_street || '',
      street_nr: d.billing_street_nr || (d as any).billing_street_nr || '',
      zip: d.billing_zip || '',
      city: d.billing_city || '',
      email: d.billing_email || '',
    }
    if (d.qr_iban) loadQRCode(d)
  }
}, { immediate: true })

watch(() => props.viewInvoice, (v) => {
  if (v) {
    localNote.value = v.notes || ''
  }
}, { immediate: true })

async function loadQRCode(d: InvoiceDraft) {
  if (!d.qr_iban) return
  qrLoading.value = true
  try {
    const res = await $fetch<{ dataUrl: string }>('/api/invoices/qr-code', {
      method: 'POST',
      body: {
        qr_iban: d.qr_iban,
        creditor_name: d.creditor_name || '',
        creditor_street: d.creditor_street || '',
        creditor_street_nr: d.creditor_street_nr || '',
        creditor_zip: d.creditor_zip || '',
        creditor_city: d.creditor_city || '',
        debtor_name: `${d.billing_first_name || ''} ${d.billing_last_name || ''}`.trim(),
        debtor_street: d.billing_street || '',
        debtor_zip: d.billing_zip || '',
        debtor_city: d.billing_city || '',
        amount_rappen: computedTotal.value,
        invoice_number: d.invoice_number_preview || '',
        additional_info: `Rechnung ${d.invoice_number_preview}`,
      },
    })
    qrDataUrl.value = res.dataUrl
  } catch {
    qrDataUrl.value = null
  } finally {
    qrLoading.value = false
  }
}

const totalDiscounts = computed(() => {
  return (props.draft?.items || []).reduce((s, i) => s + (i.discount_amount_rappen || 0) + (i.voucher_discount_rappen || 0), 0)
})

const totalCredits = computed(() => {
  return (props.draft?.items || []).reduce((s, i) => s + (i.credit_used_rappen || 0), 0)
})

const computedTotal = computed(() => {
  return (props.draft?.total_amount_rappen || 0) || ((props.draft?.subtotal_rappen || 0) - totalDiscounts.value - totalCredits.value + (props.draft?.vat_amount_rappen || 0))
})

// Payment reference for display — QRR for QR-IBAN, SCOR for regular IBAN
const scorRef = computed(() => {
  const num = props.draft?.invoice_number_preview
  const iban = props.draft?.qr_iban || ''
  if (!num) return ''

  // QR-IBAN detection: QR-IID in range 30000–31999 (positions 5–9 of IBAN)
  const cleanIban = iban.replace(/\s/g, '').toUpperCase()
  const qrIid = parseInt(cleanIban.slice(4, 9), 10)
  const isQrIban = cleanIban.startsWith('CH') && qrIid >= 30000 && qrIid <= 31999

  if (isQrIban) {
    // QRR: 26-digit numeric with mod10 recursive check digit
    const digits = num.replace(/\D/g, '').slice(0, 25).padStart(25, '0')
    const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
    let n = 0
    for (const d of digits) n = table[(n + parseInt(d, 10)) % 10]
    const check = (10 - n) % 10
    const ref = digits + check
    // Format in groups of 5 for display (standard QRR display format)
    return ref.match(/.{1,5}/g)?.join(' ') || ref
  }

  // SCOR (ISO 11649) for regular IBANs
  const cleaned = num.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (!cleaned) return ''
  const numeric = (cleaned + 'RF00').split('').map((c: string) => {
    const code = c.charCodeAt(0)
    return code >= 65 && code <= 90 ? (code - 55).toString() : c
  }).join('')
  let remainder = 0
  for (const ch of numeric) remainder = (remainder * 10 + parseInt(ch, 10)) % 97
  const ref = 'RF' + String(98 - remainder).padStart(2, '0') + cleaned
  return ref.match(/.{1,4}/g)?.join(' ') || ref
})

function toggleItem(i: number) {
  const idx = expandedItems.value.indexOf(i)
  if (idx === -1) expandedItems.value.push(i)
  else expandedItems.value.splice(idx, 1)
}

function chf(rappen: number) {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function formatDate(iso?: string) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-CH')
}

function formatAppointmentDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  let timeStr = dateStr
  if (timeStr.includes(' ') && !timeStr.includes('T')) timeStr = timeStr.replace(' ', 'T')
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) timeStr = timeStr.replace('+00', '+00:00')
  if (!timeStr.includes('+') && !timeStr.includes('Z')) timeStr += '+00:00'
  const utcDate = new Date(timeStr)
  if (isNaN(utcDate.getTime())) return dateStr
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  const dateFormatted = localDate.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeFormatted = localDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${dateFormatted}, ${timeFormatted}`
}

function close() {
  if (!isSending.value) emit('update:modelValue', false)
}

async function sendInvoice() {
  if (!props.draft || isSending.value) return

  // Validate required billing fields
  billingErrors.value = {
    first_name: !localBilling.value.first_name.trim(),
    last_name: !localBilling.value.last_name.trim(),
    street: !localBilling.value.street.trim(),
    zip: !localBilling.value.zip.trim(),
    city: !localBilling.value.city.trim(),
    email: !localBilling.value.email.trim(),
  }
  if (Object.values(billingErrors.value).some(Boolean)) {
    // Open billing edit section if not already open
    editingAddress.value = true
    return
  }

  isSending.value = true
  error.value = null
  successMessage.value = null

  try {
    const payload = {
      ...props.draft,
      due_date: localDueDate.value || props.draft.due_date,
      notes: localNote.value || undefined,
      billing_company_name: localBilling.value.company_name || undefined,
      billing_first_name: localBilling.value.first_name,
      billing_last_name: localBilling.value.last_name,
      billing_street: [localBilling.value.street, localBilling.value.street_nr].filter(Boolean).join(' '),
      billing_zip: localBilling.value.zip,
      billing_city: localBilling.value.city,
      billing_email: localBilling.value.email,
      total_amount_rappen: computedTotal.value,
    }

    const result = await $fetch<{
      success: boolean
      invoice_id: string
      invoice_number: string
      total_amount_rappen: number
    }>('/api/invoices/send-draft', {
      method: 'POST',
      body: { draft: payload },
    })

    emit('sent', {
      invoice_id: result.invoice_id,
      invoice_number: result.invoice_number,
      total_amount_rappen: result.total_amount_rappen,
    })
    successMessage.value = `Rechnung ${result.invoice_number} wurde erfolgreich versendet.`
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Fehler beim Senden der Rechnung'
  } finally {
    isSending.value = false
  }
}

async function resendInvoice() {
  const invoiceId = props.viewInvoice?.id
  if (!invoiceId || isResending.value) return
  isResending.value = true
  error.value = null
  successMessage.value = null
  try {
    const result = await $fetch<{ success: boolean; invoiceNumber?: string; sentTo?: string; error?: string }>(
      '/api/invoices/resend',
      { method: 'POST', body: { invoiceId } }
    )
    if (!result.success) throw new Error(result.error || 'Fehler beim Versenden')
    const sentTo = result.sentTo ? ` an ${result.sentTo}` : ''
    successMessage.value = `Rechnung erfolgreich versendet${sentTo}.`
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Fehler beim erneuten Senden'
  } finally {
    isResending.value = false
  }
}
</script>

<style scoped>
.input-field {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  line-height: 1rem;
  background-color: white;
  outline: none;
}
.input-field:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
input[type="date"].date-compact {
  font-size: 11px !important;
  width: 116px !important;
}
</style>
