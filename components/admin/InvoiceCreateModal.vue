<template>
  <div class="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4" @click.self="$emit('close')">
    <div class="fixed inset-0 bg-gray-900/60 transition-opacity" @click="$emit('close')" />

    <!-- Full-width sheet on mobile, centered dialog on sm+ -->
    <div class="admin-modal invoice-create-modal relative w-full min-w-0 bg-white shadow-xl transition-all
                rounded-t-2xl max-h-[95dvh]
                sm:rounded-2xl sm:max-w-4xl sm:max-h-[90dvh]
                flex flex-col overflow-hidden">
      <!-- Sticky Header -->
      <div class="flex-none sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div class="flex justify-center pt-3 pb-1 sm:hidden">
          <div class="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <h3 class="text-base font-semibold text-gray-900 truncate min-w-0">{{ asQuote ? 'Neue Offerte erstellen' : 'Neue Rechnung erstellen' }}</h3>
          <button
            type="button"
            class="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
            @click="$emit('close')"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>
      </div>

      <form class="flex flex-col flex-1 min-h-0 min-w-0" @submit.prevent="createInvoiceHandler">
      <div class="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5 space-y-6">
        <div class="inline-flex rounded-xl border border-gray-200 p-0.5 bg-gray-50">
          <button type="button" class="px-3 py-1.5 text-sm font-medium rounded-lg"
            :class="!asQuote ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
            @click="asQuote = false">Rechnung</button>
          <button type="button" class="px-3 py-1.5 text-sm font-medium rounded-lg"
            :class="asQuote ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
            @click="asQuote = true">Offerte</button>
        </div>

        <!-- Kunde suchen -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kunde *</label>

          <!-- Selected pill -->
          <div v-if="selectedCustomerLabel"
            class="flex items-center justify-between px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                :style="{ background: selectedCompanyId ? '#f97316' : primaryColor }">
                {{ selectedCompanyId ? '🏢' : selectedCustomerLabel.charAt(0).toUpperCase() }}
              </span>
              <span class="font-medium text-gray-900 truncate">{{ selectedCustomerLabel }}</span>
              <span
                class="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                :class="selectedCompanyId ? 'bg-orange-100 text-orange-700' : ''"
                :style="selectedCompanyId ? undefined : { color: primaryColor, background: `${primaryColor}14` }"
              >
                {{ selectedCompanyId ? 'Firma' : 'Kunde' }}
              </span>
            </div>
            <button type="button" @click="clearCustomer" class="p-1.5 rounded-lg hover:bg-green-100 text-green-600 flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Search field -->
          <div v-else class="relative">
            <input v-model="customerSearch" type="text"
              autocomplete="off"
              placeholder="🔍  Kunde oder Firma suchen…"
              @input="searchCustomers"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <!-- Results dropdown -->
            <div v-if="customerResults.length > 0"
              class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              <button v-for="r in customerResults" :key="r.id + r.type" type="button"
                @click="applyCustomer(r)"
                class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0">
                <span class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  :style="{ background: r.type === 'company' ? '#f97316' : primaryColor }">
                  <template v-if="r.type === 'company'">🏢</template>
                  <template v-else-if="r.name">{{ r.name.charAt(0).toUpperCase() }}</template>
                  <template v-else>
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </template>
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ r.name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ r.subtitle }}</p>
                </div>
                <span
                  class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                  :class="r.type === 'company' ? 'bg-orange-100 text-orange-700' : ''"
                  :style="r.type === 'company' ? undefined : { color: primaryColor, background: `${primaryColor}14` }"
                >
                  {{ r.type === 'company' ? 'Firma' : 'Kunde' }}
                </span>
              </button>
            </div>
            <p v-else-if="customerSearch.length >= 1 && !isSearchingCustomers"
              class="text-xs text-gray-400 mt-1.5 pl-1">Keine Ergebnisse</p>
            <button
              v-if="!creatingNewCustomer"
              type="button"
              class="mt-2 text-xs font-medium hover:underline"
              :style="{ color: primaryColor }"
              @click="startNewCustomer"
            >
              Neukunde anlegen
            </button>
          </div>
        </div>

        <div v-if="creatingNewCustomer" class="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h4 class="text-sm font-semibold text-gray-800">Neuer Kunde</h4>
            <button type="button" class="text-xs text-gray-400 hover:text-gray-600" @click="cancelNewCustomer">
              Abbrechen
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
              <input v-model="newCustomer.first_name" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
              <input v-model="newCustomer.last_name" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
              <input v-model="newCustomer.email" type="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="kunde@beispiel.ch" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
              <input v-model="newCustomer.phone" type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="+41 79 123 45 67" />
            </div>
          </div>
          <p class="text-xs text-gray-500">Vor- oder Nachname, plus E-Mail oder Telefon.</p>
          <label class="flex items-start gap-2 cursor-pointer">
            <input v-model="saveNewCustomerToUsers" type="checkbox" class="mt-0.5 rounded border-gray-300"
              :style="{ accentColor: primaryColor }" />
            <span>
              <span class="block text-sm text-gray-800">In den Kundenstamm speichern</span>
              <span class="block text-xs text-gray-500">Legt den Kunden in der User-Tabelle an, damit Guthaben und Folge-Rechnungen möglich sind.</span>
            </span>
          </label>
          <label v-if="saveNewCustomerToUsers && onboardingInviteAvailable" class="flex items-start gap-2 cursor-pointer">
            <input v-model="sendOnboardingInvite" type="checkbox" class="mt-0.5 rounded border-gray-300"
              :style="{ accentColor: primaryColor }" />
            <span>
              <span class="block text-sm text-gray-800">{{ onboardingInviteLabel }}</span>
              <span class="block text-xs text-gray-500">{{ onboardingInviteHint }}</span>
            </span>
          </label>
        </div>

        <div v-if="asQuote" class="border-t pt-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Gültig bis</label>
          <input v-model="formData.valid_until" type="date"
            class="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>

        <!-- Offene Positionen (Kurse, Räume, Fahrzeuge) -->
        <div v-if="!asQuote && (formData.user_id || selectedCompanyId)" class="border-t pt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-800">Offene Positionen</h4>
            <button type="button" @click="loadOpenItems" class="text-xs hover:underline" :style="{ color: primaryColor }">
              {{ isLoadingOpenItems ? 'Lädt…' : 'Aktualisieren' }}
            </button>
          </div>
          <div v-if="isLoadingOpenItems" class="text-xs text-gray-400 py-2">Lädt offene Positionen…</div>
          <div v-else-if="openItems.length === 0" class="text-xs text-gray-400 py-2">Keine offenen Positionen für diesen Kunden.</div>
          <div v-else class="space-y-1.5">
            <label v-for="item in openItems" :key="item.source_id"
              class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              :class="selectedOpenItemIds.has(item.source_id) ? '' : 'border-gray-200 hover:border-gray-300'"
              :style="selectedOpenItemIds.has(item.source_id) ? { borderColor: primaryColor, backgroundColor: `${primaryColor}12` } : undefined">
              <input type="checkbox" :value="item.source_id"
                :checked="selectedOpenItemIds.has(item.source_id)"
                @change="toggleOpenItem(item)"
                class="rounded"
                :style="{ accentColor: primaryColor }" />
              <div class="flex-1 min-w-0">
                <!-- Title row -->
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
                  <span v-if="item.user_name && selectedCompanyId"
                    class="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                    {{ item.user_name }}
                  </span>
                </div>
                <!-- Detail pills -->
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <!-- Multi-session enrollments: Teil N · Datum · Zeit (chronologisch) -->
                  <div v-if="item.sessions?.length" class="w-full space-y-0.5">
                    <p
                      v-for="(line, sIdx) in formatCourseSessionsDescription(item.sessions).split('\n')"
                      :key="`${item.source_id}-s-${sIdx}`"
                      class="text-xs text-gray-500"
                    >
                      {{ line }}
                    </p>
                  </div>
                  <span v-else-if="item.date" class="text-xs text-gray-500">
                    {{ formatDate(item.date) }}
                  </span>
                  <span v-if="item.duration_minutes" class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {{ item.duration_minutes }} Min.
                  </span>
                  <span
                    v-if="item.appointment_type"
                    class="text-xs px-1.5 py-0.5 rounded-full font-medium capitalize"
                    :style="{ color: primaryColor, background: `${primaryColor}14` }"
                  >
                    {{ item.appointment_type }}
                  </span>
                  <span v-if="item.staff_name" class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    mit {{ item.staff_name }}
                  </span>
                  <span v-if="item.payment_method && item.payment_method !== 'invoice'" class="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                    {{ item.payment_method }}
                  </span>
                </div>
              </div>
              <span class="text-sm font-semibold text-gray-700 shrink-0 tabular-nums">CHF {{ (item.amount_rappen / 100).toFixed(2) }}</span>
            </label>
          </div>
          <div v-if="selectedOpenItemIds.size > 0" class="mt-2 text-xs font-medium" :style="{ color: primaryColor }">
            {{ selectedOpenItemIds.size }} Position(en) ausgewählt — werden automatisch als Rechnungsposten hinzugefügt.
          </div>
        </div>

        <!-- Rechnungsempfänger -->
        <div class="border-t pt-5">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-800">{{ asQuote ? 'Empfänger' : 'Rechnungsempfänger' }}</h4>
            <button v-if="selectedCustomerLabel" type="button"
              @click="showBillingEdit = !showBillingEdit"
              class="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
              {{ showBillingEdit ? 'Schliessen' : 'Bearbeiten' }}
            </button>
          </div>

          <!-- Summary (wenn Kunde gewählt und nicht im Edit-Modus) -->
          <div v-if="selectedCustomerLabel && !showBillingEdit"
            class="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <p class="font-semibold text-gray-900">
              {{ formData.billing_company_name || formData.billing_contact_person || selectedCustomerLabel.split(' — ')[0] }}
            </p>
            <p v-if="formData.billing_company_name && formData.billing_contact_person" class="text-gray-500">{{ formData.billing_contact_person }}</p>
            <p v-if="formData.billing_email" class="text-gray-500">{{ formData.billing_email }}</p>
            <p v-if="formData.billing_street" class="text-gray-400 text-xs">
              {{ formData.billing_street }} {{ formData.billing_street_number }}, {{ formData.billing_zip }} {{ formData.billing_city }}
            </p>
            <p v-if="!formData.billing_email && !formData.billing_street" class="text-gray-400 text-xs italic">Keine Adresse hinterlegt</p>
          </div>

          <!-- Edit fields (default wenn kein Kunde, oder aufgeklappt) -->
          <div v-if="!selectedCustomerLabel || showBillingEdit" class="space-y-3">

            <!-- Typ -->
            <div class="flex gap-4">
              <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input v-model="formData.billing_type" type="radio" value="individual" class="accent-blue-500" />
                Privatperson
              </label>
              <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input v-model="formData.billing_type" type="radio" value="company" class="accent-blue-500" />
                Firma
              </label>
            </div>

            <!-- Firmenfelder -->
            <div v-if="formData.billing_type === 'company'" class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Firmenname *</label>
                <input v-model="formData.billing_company_name" type="text" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Ansprechpartner</label>
                <input v-model="formData.billing_contact_person" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">MWST-Nummer</label>
                <input v-model="formData.billing_vat_number" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>

            <!-- E-Mail -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">E-Mail *</label>
              <input v-model="formData.billing_email" type="email" required
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="kunde@beispiel.ch" />
            </div>

            <!-- Adresse -->
            <div class="space-y-3 min-w-0">
              <div class="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-3">
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Strasse</label>
                  <input v-model="formData.billing_street" type="text"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nr.</label>
                  <input v-model="formData.billing_street_number" type="text"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              <div class="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-gray-700 mb-1">PLZ</label>
                  <input v-model="formData.billing_zip" type="text"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Ort</label>
                  <input v-model="formData.billing_city" type="text"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rechnungspositionen -->
        <div class="border-t pt-6 min-w-0">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-800">{{ asQuote ? 'Positionen' : 'Rechnungspositionen' }}</h4>
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Vorlage-Button -->
              <div class="relative" ref="templateMenuRef">
                <button
                  type="button"
                  @click="showTemplateMenu = !showTemplateMenu; if (showTemplateMenu) templateMenuSearch = ''"
                  class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  Vorlage
                </button>
                <div
                  v-if="showTemplateMenu"
                  class="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 w-[min(24rem,calc(100vw-2rem))] bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden"
                >
                  <div class="px-3 py-2 border-b border-gray-100 space-y-2">
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vorlagen</p>
                    <input
                      v-model="templateMenuSearch"
                      type="search"
                      placeholder="Kategorie, Kurs, Produkt…"
                      class="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      @click.stop
                    >
                  </div>
                  <div v-if="groupedMenuTemplates.length === 0" class="px-3 py-3 text-xs text-gray-400">
                    {{ lineTemplates.length === 0 ? 'Keine Vorlagen verfügbar' : 'Keine Treffer' }}
                  </div>
                  <div class="max-h-80 overflow-y-auto">
                    <div v-for="group in groupedMenuTemplates" :key="group.label">
                      <p class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-50 border-y border-gray-100">{{ group.label }}</p>
                      <button
                        v-for="p in group.items"
                        :key="p.id"
                        type="button"
                        @click="addItemFromTemplate(p)"
                        class="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 min-w-0"
                      >
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-800 truncate">{{ p.name }}</p>
                          <p v-if="p.description" class="text-xs text-gray-400 truncate">{{ p.description }}</p>
                        </div>
                        <span class="text-xs font-semibold text-gray-600 shrink-0">CHF {{ (p.price_rappen / 100).toFixed(2) }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-xl hover:opacity-80 transition-colors"
                :style="{ color: primaryColor, background: `${primaryColor}14`, borderColor: `${primaryColor}33` }"
                @click="addInvoiceItem"
              >
                <PlusIcon class="h-3.5 w-3.5" />
                Position hinzufügen
              </button>
            </div>
          </div>

          <div v-if="invoiceItems.length === 0" class="text-center py-8 text-gray-500">
            Keine Positionen hinzugefügt. Fügen Sie mindestens eine Position hinzu.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(item, index) in invoiceItems"
              :key="index"
              class="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gray-50 min-w-0"
            >
              <!-- Row 1: Beschreibung full width, then qty fields in 2-col on mobile -->
              <div class="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end min-w-0">
                <div class="col-span-2 sm:col-span-5 min-w-0 relative template-suggest-wrap">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Beschreibung *</label>
                  <input
                    v-model="item.product_name"
                    type="text"
                    required
                    autocomplete="off"
                    :placeholder="`z.B. ${t.appointment}, Theorieunterricht`"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    @focus="openTemplateSuggest(index)"
                    @input="openTemplateSuggest(index)"
                  >
                  <div
                    v-if="suggestRow === index && groupedSuggestTemplates(item.product_name).length > 0"
                    class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden"
                  >
                    <p class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">Vorlagen</p>
                    <div class="max-h-72 overflow-y-auto">
                      <div v-for="group in groupedSuggestTemplates(item.product_name)" :key="group.label">
                        <p class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-50 border-y border-gray-100">{{ group.label }}</p>
                        <button
                          v-for="p in group.items"
                          :key="p.id"
                          type="button"
                          class="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 min-w-0"
                          @mousedown.prevent="applyTemplateToItem(index, p)"
                        >
                          <div class="min-w-0">
                            <p class="text-sm font-medium text-gray-800 truncate">{{ p.name }}</p>
                            <p v-if="p.description" class="text-xs text-gray-400 truncate">{{ p.description }}</p>
                          </div>
                          <span class="text-xs font-semibold text-gray-600 shrink-0">CHF {{ (p.price_rappen / 100).toFixed(2) }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="min-w-0 sm:col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Menge</label>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    @input="calculateItemTotal(item)"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                </div>
                <div class="min-w-0 sm:col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">
                    <span class="sm:hidden">Preis (CHF)</span>
                    <span class="hidden sm:inline">Einzelpreis (CHF)</span>
                  </label>
                  <input
                    :value="item.unit_price_rappen / 100"
                    @input="(e: any) => { item.unit_price_rappen = Math.round(parseFloat(e.target.value || 0) * 100); calculateItemTotal(item) }"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                </div>
                <div class="min-w-0 sm:col-span-1">
                  <label class="block text-xs font-medium text-gray-500 mb-1">MwSt (%)</label>
                  <input
                    v-model.number="item.vat_rate"
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    @input="calculateItemTotal(item)"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                </div>
                <div class="min-w-0 sm:col-span-1">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Rabatt (%)</label>
                  <input
                    v-model.number="item.discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="0"
                    @input="calculateItemTotal(item)"
                    class="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    :class="(item.discount_percent || 0) > 0 ? 'border-amber-400 bg-amber-50' : ''"
                  >
                </div>
                <div class="col-span-2 sm:col-span-1 flex items-center sm:items-end justify-end gap-1 sm:pb-0.5">
                  <!-- Move up/down -->
                  <button
                    v-if="index > 0"
                    type="button"
                    @click="moveInvoiceItem(index, -1)"
                    class="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title="Nach oben"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button
                    v-if="index < invoiceItems.length - 1"
                    type="button"
                    @click="moveInvoiceItem(index, 1)"
                    class="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title="Nach unten"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <button
                    type="button"
                    class="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="Position entfernen"
                    @click="removeInvoiceItem(index)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <!-- Row 2: Date (if appointment) + Totals -->
              <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span
                  v-if="item.appointment_date && !looksLikeCourseSessionsDescription(item.product_description)"
                  class="inline-flex items-center gap-1 font-medium"
                  :style="{ color: primaryColor }"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {{ formatDate(item.appointment_date) }}
                  <span v-if="item.appointment_duration_minutes" class="text-gray-400 font-normal">· {{ item.appointment_duration_minutes }} Min</span>
                </span>
                <span>Gesamt: <strong class="text-gray-800">CHF {{ formatCurrency(item.total_price_rappen) }}</strong></span>
                <span v-if="(item.discount_percent || 0) > 0" class="text-amber-600 font-medium">
                  −{{ item.discount_percent }}% Rabatt angewendet
                </span>
                <span class="text-gray-400">(MwSt: CHF {{ formatCurrency(item.vat_amount_rappen) }})</span>
              </div>

              <label
                v-if="!asQuote"
                class="mt-2.5 flex items-start gap-2 cursor-pointer"
              >
                <input
                  v-model="item.credit_to_wallet"
                  type="checkbox"
                  class="mt-0.5 rounded border-gray-300"
                  :style="{ accentColor: primaryColor }"
                  @change="syncItemCreditAmount(item)"
                />
                <span>
                  <span class="block text-sm text-gray-800">Auf Guthaben gutschreiben</span>
                  <span class="block text-xs text-gray-500">
                    CHF {{ formatCurrency(itemCreditRappen(item)) }} wird nach vollständiger Zahlung dem Kunden-Guthaben gutgeschrieben.
                  </span>
                </span>
              </label>

              <!-- Optional description (Kursteile als Liste, sonst editierbar) -->
              <div
                v-if="looksLikeCourseSessionsDescription(item.product_description)"
                class="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 space-y-1"
              >
                <p
                  v-for="(line, li) in String(item.product_description).split('\n').filter(Boolean)"
                  :key="li"
                  class="text-xs text-gray-600 leading-5"
                >
                  {{ line }}
                </p>
              </div>
              <div v-else-if="item.product_description !== undefined" class="mt-2">
                <textarea
                  v-model="item.product_description"
                  :rows="Math.max(3, String(item.product_description || '').split('\n').length)"
                  placeholder="Zusatztext / Beschreibung (optional)"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs leading-5 text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-y font-sans"
                />
              </div>
              <button
                v-else
                type="button"
                @click="item.product_description = ''"
                class="mt-1.5 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >+ Beschreibung hinzufügen</button>
            </div>
          </div>
        </div>

        <!-- Zusammenfassung -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-4">Zusammenfassung</h4>
          
          <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between">
              <span>Zwischensumme:</span>
              <span>CHF {{ formatCurrency(subtotal) }}</span>
            </div>
            
            <div class="flex justify-between">
              <span>MWST ({{ averageVatRate }}%):</span>
              <span>CHF {{ formatCurrency(totalVat) }}</span>
            </div>
            
            <div class="flex justify-between">
              <span>Rabatt:</span>
              <span>CHF {{ formatCurrency(formData.discount_amount_rappen) }}</span>
            </div>

            <label
              v-if="!asQuote && availableCreditRappen > 0"
              class="flex items-start justify-between gap-3 pt-1 cursor-pointer"
            >
              <span class="flex items-start gap-2">
                <input
                  v-model="applyAvailableCredit"
                  type="checkbox"
                  class="mt-0.5 rounded border-gray-300"
                  :style="{ accentColor: primaryColor }"
                />
                <span>
                  <span class="block text-sm text-gray-800">Guthaben verrechnen</span>
                  <span class="block text-xs text-gray-500">Verfügbar CHF {{ formatCurrency(availableCreditRappen) }}</span>
                </span>
              </span>
              <span v-if="applyAvailableCredit && creditToApplyRappen > 0" class="text-sm font-semibold" :style="{ color: primaryColor }">
                −CHF {{ formatCurrency(creditToApplyRappen) }}
              </span>
            </label>
            <p v-if="!asQuote && applyAvailableCredit && creditCoversInvoice" class="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Guthaben deckt den gesamten Betrag — es wird keine Rechnung erstellt.
            </p>
            <p v-if="!asQuote && walletCreditRappen > 0" class="text-xs rounded-lg px-3 py-2"
              :style="{ color: primaryColor, background: `${primaryColor}12` }">
              Nach Zahlung werden CHF {{ formatCurrency(walletCreditRappen) }} dem Guthaben gutgeschrieben.
            </p>
            
            <div class="border-t pt-2 flex justify-between font-medium text-lg">
              <span>Gesamtbetrag:</span>
              <span>CHF {{ formatCurrency(displayTotalAmount) }}</span>
            </div>
          </div>
        </div>

        <!-- Texte & Notizen -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-800">Texte & Notizen</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Einleitungstext
                <span class="text-xs font-normal text-gray-400 ml-1">(für Kunden sichtbar)</span>
              </label>
              <textarea
                v-model="formData.notes"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                :placeholder="asQuote ? 'z.B. Guten Tag, anbei unser Angebot…' : 'z.B. Guten Tag, anbei Ihre Rechnung...'"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ asQuote ? 'Gültigkeit / Bedingungen' : 'Zahlungsbedingungen' }}
                <span class="text-xs font-normal text-gray-400 ml-1">(für Kunden sichtbar)</span>
              </label>
              <textarea
                v-model="formData.payment_terms"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                :placeholder="asQuote ? 'z.B. Dieses Angebot ist gültig bis {valid_until}.' : 'z.B. Zahlbar innert 30 Tagen netto.'"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Abschlusstext
                <span class="text-xs font-normal text-gray-400 ml-1">(für Kunden sichtbar)</span>
              </label>
              <textarea
                v-model="formData.footer_text"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="z.B. Vielen Dank für Ihr Vertrauen."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Interne Notizen
                <span class="text-xs font-normal text-gray-400 ml-1">(nur für Staff)</span>
              </label>
              <textarea
                v-model="formData.internal_notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Interne Notizen..."
              />
            </div>
          </div>
        </div>
      </div>

        <!-- Buttons (sticky footer) -->
        <div class="flex-none flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 px-4 py-3 sm:px-5 border-t bg-white pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            class="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="$emit('close')"
          >
            Abbrechen
          </button>
          
          <button
            type="submit"
            :disabled="!canSubmit || isSubmitting"
            class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ background: primaryColor }"
          >
            <ArrowPathIcon v-if="isSubmitting" class="animate-spin h-4 w-4 mr-2" />
            {{ isSubmitting ? 'Wird erstellt...' : (asQuote ? 'Offerte erstellen' : (creditCoversInvoice ? 'Guthaben verrechnen' : 'Rechnung erstellen')) }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import {
  filterInvoiceLineTemplates,
  groupInvoiceLineTemplates,
  type InvoiceLineTemplate,
} from '~/utils/invoice-line-templates'
import { useTerminology } from '~/composables/useTerminology'
import type { InvoiceFormData, InvoiceItemFormData } from '~/types/invoice'
import { DEFAULT_INVOICE_VALUES, DEFAULT_INVOICE_ITEM_VALUES } from '~/types/invoice'
import {
  formatCourseSessionsDescription,
  looksLikeCourseSessionsDescription,
} from '~/utils/format-course-sessions'
import {
  resolveInvoiceDocumentTexts,
  resolveQuoteDocumentTexts,
  swapDocumentBodyTexts,
} from '~/server/utils/invoice-quote'
import {
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const { t } = useTerminology()

// Props
const props = defineProps<{
  initialDocumentKind?: 'invoice' | 'quote'
  initialCompany?: {
    id: string
    name: string
    contact_person?: string
    email?: string
    phone?: string
    street?: string
    street_nr?: string
    zip?: string
    city?: string
    vat_number?: string
  } | null
}>()

const asQuote = ref(props.initialDocumentKind === 'quote')

function defaultValidUntil() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

// Emits
const emit = defineEmits<{
  close: []
  created: [invoice: any]
}>()

// Composables
const {
  primaryColor,
  defaultVatRate,
  invoiceIntroText,
  invoicePaymentTerms,
  invoiceFooterText,
  quoteIntroText,
  quoteTermsText,
  quoteFooterText,
} = useTenantBranding()
const lineTemplates = ref<InvoiceLineTemplate[]>([])
const templateMenuSearch = ref('')

const groupedMenuTemplates = computed(() =>
  groupInvoiceLineTemplates(filterInvoiceLineTemplates(lineTemplates.value, templateMenuSearch.value, 0)),
)

// Customer search
const customerSearch = ref('')
const customerResults = ref<any[]>([])
const selectedCustomerLabel = ref('')
const selectedCompanyId = ref('')
const isSearchingCustomers = ref(false)
let customerSearchTimer: ReturnType<typeof setTimeout> | null = null

function searchCustomers() {
  if (customerSearchTimer) clearTimeout(customerSearchTimer)
  if (customerSearch.value.length < 1) { customerResults.value = []; return }
  isSearchingCustomers.value = true
  customerSearchTimer = setTimeout(async () => {
    const q = customerSearch.value
    const [usersRes, companiesRes]: any[] = await Promise.allSettled([
      $fetch('/api/admin/users/search', { query: { q } }),
      $fetch('/api/admin/companies', { query: { search: q } }),
    ])
    const userList = (usersRes.value?.users || []).map((u: any) => ({
      id: u.id, type: 'user',
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      subtitle: u.email || '',
      email: u.email || '',
      phone: u.phone || '',
      street: u.street || '',
      street_nr: u.street_nr || '',
      zip: u.zip || '',
      city: u.city || '',
    }))
    const companyList = (companiesRes.value?.companies || []).map((c: any) => ({
      id: c.id, type: 'company',
      name: c.name,
      subtitle: c.contact_person ? `${c.contact_person} · ${c.email || ''}` : (c.email || ''),
      email: c.email || '',
      phone: c.phone || '',
      contact_person: c.contact_person || '',
      street: c.street || '',
      zip: c.zip || '',
      city: c.city || '',
    }))
    customerResults.value = [...userList, ...companyList].slice(0, 10)
    isSearchingCustomers.value = false
  }, 280)
}

function applyCustomer(r: any) {
  creatingNewCustomer.value = false
  customerResults.value = []
  customerSearch.value = ''
  if (r.type === 'company') {
    formData.value.user_id = ''
    formData.value.company_id = r.id
    selectedCompanyId.value = r.id
    selectedCustomerLabel.value = r.name
    formData.value.billing_type = 'company'
    formData.value.billing_company_name = r.name
    formData.value.billing_contact_person = r.contact_person || ''
    formData.value.billing_email = r.email || ''
    formData.value.billing_street = r.street || ''
    formData.value.billing_zip = r.zip || ''
    formData.value.billing_city = r.city || ''
    availableCreditRappen.value = 0
    applyAvailableCredit.value = false
  } else {
    formData.value.user_id = r.id
    formData.value.company_id = ''
    selectedCompanyId.value = ''
    selectedCustomerLabel.value = `${r.name} — ${r.email}`
    formData.value.billing_type = 'individual'
    formData.value.billing_company_name = ''
    formData.value.billing_contact_person = r.name
    formData.value.billing_email = r.email || ''
    formData.value.billing_street = r.street || ''
    formData.value.billing_street_number = r.street_nr || ''
    formData.value.billing_zip = r.zip || ''
    formData.value.billing_city = r.city || ''
    onCustomerSelected(r)
    loadStudentCredit(r.id)
  }
  selectedOpenItemIds.value = new Set()
  openItems.value = []
  loadOpenItems()
}

function clearCustomer() {
  availableCreditRappen.value = 0
  applyAvailableCredit.value = false
  selectedCustomerLabel.value = ''
  selectedCompanyId.value = ''
  showBillingEdit.value = false
  formData.value.user_id = ''
  formData.value.company_id = ''
  formData.value.billing_type = 'individual'
  formData.value.billing_company_name = ''
  formData.value.billing_contact_person = ''
  formData.value.billing_email = ''
  openItems.value = []
  selectedOpenItemIds.value = new Set()
}

// State
const isSubmitting = ref(false)
const showBillingEdit = ref(false)
const showTemplateMenu = ref(false)
const templateMenuRef = ref<HTMLElement | null>(null)

// Form data
const formData = ref<InvoiceFormData>({
  user_id: '',
  staff_id: '',
  product_sale_id: '',
  appointment_id: '',
  company_id: '',
  billing_type: 'individual',
  billing_company_name: '',
  billing_contact_person: '',
  billing_email: '',
  billing_street: '',
  billing_street_number: '',
  billing_zip: '',
  billing_city: '',
  billing_country: 'CH',
  billing_vat_number: '',
  document_kind: 'invoice',
  valid_until: defaultValidUntil(),
  subtotal_rappen: 0,
  vat_rate: defaultVatRate.value,
  discount_amount_rappen: 0,
  notes: '',
  internal_notes: '',
  payment_terms: '',
  footer_text: '',
})

function tenantQuoteTexts() {
  return resolveQuoteDocumentTexts({
    quote_intro_text: quoteIntroText.value,
    quote_terms_text: quoteTermsText.value,
    quote_footer_text: quoteFooterText.value,
    invoice_footer_text: invoiceFooterText.value,
  })
}

function tenantInvoiceTexts() {
  return resolveInvoiceDocumentTexts({
    invoice_intro_text: invoiceIntroText.value,
    invoice_payment_terms: invoicePaymentTerms.value,
    invoice_footer_text: invoiceFooterText.value,
  })
}

function applyDocumentTexts(kind: 'invoice' | 'quote') {
  const texts = kind === 'quote' ? tenantQuoteTexts() : tenantInvoiceTexts()
  formData.value.notes = texts.intro
  formData.value.payment_terms = texts.terms
  formData.value.footer_text = texts.footer
}

// Invoice items — initialized with tenant default VAT
const invoiceItems = ref<InvoiceItemFormData[]>([
  { ...DEFAULT_INVOICE_ITEM_VALUES, product_name: '', unit_price_rappen: 0, vat_rate: defaultVatRate.value } as InvoiceItemFormData
])

// Computed
const creatingNewCustomer = ref(false)
const saveNewCustomerToUsers = ref(true)
const sendOnboardingInvite = ref(false)
const bookingPolicy = ref({
  onboarding_sms_enabled: true,
  onboarding_email_enabled: false,
})
const newCustomer = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
})

const onboardingSmsEnabled = computed(() => bookingPolicy.value.onboarding_sms_enabled !== false)
const onboardingEmailEnabled = computed(() => bookingPolicy.value.onboarding_email_enabled === true)
const onboardingInviteAvailable = computed(() => onboardingSmsEnabled.value || onboardingEmailEnabled.value)

function defaultSendOnboardingInvite() {
  return onboardingInviteAvailable.value
}

const newCustomerName = computed(() =>
  `${newCustomer.value.first_name || ''} ${newCustomer.value.last_name || ''}`.trim()
)
const newCustomerValid = computed(() => {
  if (!creatingNewCustomer.value) return false
  const hasName = !!(newCustomer.value.first_name.trim() || newCustomer.value.last_name.trim())
  const hasContact = !!(newCustomer.value.email.trim() || newCustomer.value.phone.trim())
  return hasName && hasContact
})

const onboardingInviteLabel = computed(() => {
  if (onboardingSmsEnabled.value && onboardingEmailEnabled.value) return 'Onboarding-SMS / E-Mail senden'
  if (onboardingSmsEnabled.value) return 'Onboarding-SMS senden'
  return 'Onboarding-E-Mail senden'
})

const onboardingInviteHint = computed(() => {
  const wantsSms = onboardingSmsEnabled.value
  const wantsEmail = onboardingEmailEnabled.value
  const hasPhone = !!newCustomer.value.phone.trim()
  const hasEmail = !!newCustomer.value.email.trim()
  if (wantsSms && wantsEmail) {
    if (hasPhone && hasEmail) return 'Wie in den Buchungsregeln: SMS und E-Mail mit Link zum Passwort setzen.'
    if (hasPhone) return 'Wie in den Buchungsregeln: SMS. E-Mail nur mit hinterlegter Adresse.'
    if (hasEmail) return 'Wie in den Buchungsregeln: E-Mail. SMS nur mit hinterlegter Nummer.'
    return 'In den Buchungsregeln sind SMS und E-Mail aktiv — Nummer bzw. Adresse eintragen.'
  }
  if (wantsSms) {
    return hasPhone
      ? 'Wie in den Buchungsregeln geht nur die Onboarding-SMS raus.'
      : 'In den Buchungsregeln ist nur SMS aktiv — Telefonnummer eintragen.'
  }
  return hasEmail
    ? 'Wie in den Buchungsregeln geht nur die Onboarding-E-Mail raus.'
    : 'In den Buchungsregeln ist nur E-Mail aktiv — Adresse eintragen.'
})

function startNewCustomer() {
  const search = customerSearch.value.trim()
  creatingNewCustomer.value = true
  saveNewCustomerToUsers.value = true
  sendOnboardingInvite.value = defaultSendOnboardingInvite()
  customerResults.value = []
  customerSearch.value = ''
  clearCustomer()
  showBillingEdit.value = true
  if (search.includes('@')) {
    newCustomer.value.email = search
  }
}

function cancelNewCustomer() {
  creatingNewCustomer.value = false
  saveNewCustomerToUsers.value = true
  sendOnboardingInvite.value = defaultSendOnboardingInvite()
  newCustomer.value = { first_name: '', last_name: '', email: '', phone: '' }
}

watch(
  [() => newCustomer.value.first_name, () => newCustomer.value.last_name, () => newCustomer.value.email],
  () => {
    if (!creatingNewCustomer.value) return
    formData.value.billing_type = 'individual'
    formData.value.billing_contact_person = newCustomerName.value
    if (newCustomer.value.email.trim()) {
      formData.value.billing_email = newCustomer.value.email.trim()
    }
  }
)

const canSubmit = computed(() => {
  const hasExistingCustomer = !!(formData.value.user_id || selectedCompanyId.value)
  const hasNewCustomer = newCustomerValid.value
  const itemsOk = invoiceItems.value.length > 0 &&
    invoiceItems.value.every(item =>
      item.product_name &&
      item.quantity > 0 &&
      item.unit_price_rappen >= 0
    )
  return (hasExistingCustomer || hasNewCustomer) && itemsOk
})

const subtotal = computed(() => {
  return invoiceItems.value.reduce((sum, item) => sum + item.total_price_rappen, 0)
})

const totalVat = computed(() => {
  return invoiceItems.value.reduce((sum, item) => sum + item.vat_amount_rappen, 0)
})

const totalAmount = computed(() => {
  return subtotal.value + totalVat.value - formData.value.discount_amount_rappen
})

const availableCreditRappen = ref(0)
const applyAvailableCredit = ref(true)
const creditToApplyRappen = computed(() => {
  if (!applyAvailableCredit.value) return 0
  return Math.min(availableCreditRappen.value, Math.max(0, totalAmount.value))
})
const displayTotalAmount = computed(() => Math.max(0, totalAmount.value - creditToApplyRappen.value))
const creditCoversInvoice = computed(() => creditToApplyRappen.value > 0 && displayTotalAmount.value <= 0)

function itemCreditRappen(item: InvoiceItemFormData) {
  if ((item.credit_amount_rappen || 0) > 0) return item.credit_amount_rappen || 0
  return Math.max(0, item.total_price_rappen || 0)
}

function syncItemCreditAmount(item: InvoiceItemFormData) {
  if (!item.credit_to_wallet) {
    item.credit_amount_rappen = 0
    return
  }
  if ((item.credit_amount_rappen || 0) <= 0) {
    item.credit_amount_rappen = Math.max(0, item.total_price_rappen || 0)
  }
}

const walletCreditRappen = computed(() => {
  if (asQuote.value) return 0
  return invoiceItems.value.reduce((sum, item) => {
    if (!item.credit_to_wallet) return sum
    return sum + itemCreditRappen(item)
  }, 0)
})

async function loadStudentCredit(userId: string) {
  availableCreditRappen.value = 0
  if (!userId) return
  try {
    const res = await $fetch<{ success: boolean; data?: { balance_rappen?: number; pending_withdrawal_rappen?: number } }>(
      '/api/student-credits/get-credit',
      { query: { user_id: userId } }
    )
    const raw = res?.data?.balance_rappen || 0
    const frozen = res?.data?.pending_withdrawal_rappen || 0
    availableCreditRappen.value = Math.max(0, raw - frozen)
    applyAvailableCredit.value = availableCreditRappen.value > 0
  } catch {
    availableCreditRappen.value = 0
  }
}

const averageVatRate = computed(() => {
  if (subtotal.value === 0) return 0
  return ((totalVat.value / subtotal.value) * 100).toFixed(2)
})

// ── Open items (courses, rooms, vehicles) ─────────────────────────────────
const openItems = ref<any[]>([])
const isLoadingOpenItems = ref(false)
const selectedOpenItemIds = ref<Set<string>>(new Set())

async function loadOpenItems() {
  const userId = formData.value.user_id
  const companyId = selectedCompanyId.value
  if (!userId && !companyId) return
  isLoadingOpenItems.value = true
  try {
    const query: any = {}
    if (userId) query.user_id = userId
    if (companyId) query.company_id = companyId
    const res: any = await $fetch('/api/admin/invoices/open-items', { query })
    openItems.value = res.items || []
  } catch {
    openItems.value = []
  } finally {
    isLoadingOpenItems.value = false
  }
}

function toggleOpenItem(item: any) {
  const ids = new Set(selectedOpenItemIds.value)
  if (ids.has(item.source_id)) {
    ids.delete(item.source_id)
    // Remove from invoiceItems
    const idx = invoiceItems.value.findIndex(i => (i as any)._open_item_id === item.source_id)
    if (idx !== -1) invoiceItems.value.splice(idx, 1)
    if (invoiceItems.value.length === 0) addInvoiceItem()
  } else {
    ids.add(item.source_id)
    // Add as invoice item, remove the empty placeholder if present
    const hasEmpty = invoiceItems.value.length === 1 && !invoiceItems.value[0].product_name
    if (hasEmpty) invoiceItems.value.splice(0, 1)
    // Multi-session Kurse: alle Teile mit Datum+Zeit in der Beschreibung,
    // kein einzelnes appointment_date (sonst erscheint nur der 1. Tag doppelt).
    const sessions = item.sessions?.length
      ? item.sessions
      : (item.session_dates?.length > 1
          ? item.session_dates.map((d: string, i: number) => ({ session_number: i + 1, start_time: d }))
          : [])
    const sessionDesc = formatCourseSessionsDescription(sessions)
    const description = sessionDesc || item.unit || undefined
    const isMultiSession = sessions.length > 1
    const newItem: any = {
      ...DEFAULT_INVOICE_ITEM_VALUES,
      product_name: item.label,
      product_description: description,
      quantity: 1,
      unit_price_rappen: item.amount_rappen,
      total_price_rappen: item.amount_rappen,
      vat_rate: defaultVatRate.value,
      vat_amount_rappen: Math.round(item.amount_rappen * defaultVatRate.value / 100),
      sort_order: invoiceItems.value.length,
      // Appointment details for date/time display on invoice
      appointment_id: item.appointment_id || null,
      appointment_title: item.label,
      appointment_date: isMultiSession ? null : (item.date || null),
      appointment_duration_minutes: isMultiSession ? null : (item.duration_minutes || null),
      _open_item_id: item.source_id,
      _open_item_type: item.type,
      _open_item_source_table: item.source_table,
    }
    invoiceItems.value.push(newItem)
  }
  selectedOpenItemIds.value = ids
}

// Methods
const onCustomerSelected = (user: any) => {
  if (user) {
    // Kundenadresse vorausfüllen
    formData.value.billing_email = user.email || ''
    formData.value.billing_street = user.street || ''
    formData.value.billing_street_number = user.street_nr || ''
    formData.value.billing_zip = user.zip || ''
    formData.value.billing_city = user.city || ''
    // Load open items for new user
    selectedOpenItemIds.value = new Set()
    openItems.value = []
    loadOpenItems()
  }
}

const addInvoiceItem = () => {
  invoiceItems.value.push({
    ...DEFAULT_INVOICE_ITEM_VALUES,
    product_name: '',
    unit_price_rappen: 0,
    vat_rate: defaultVatRate.value,
    sort_order: invoiceItems.value.length
  } as InvoiceItemFormData)
}

const addItemFromTemplate = (tpl: InvoiceLineTemplate) => {
  const item: InvoiceItemFormData = {
    ...DEFAULT_INVOICE_ITEM_VALUES,
    product_id: tpl.product_id || undefined,
    product_name: tpl.name,
    product_description: tpl.details || tpl.description || undefined,
    unit_price_rappen: tpl.price_rappen || 0,
    vat_rate: defaultVatRate.value,
    sort_order: invoiceItems.value.length,
    credit_to_wallet: Boolean(tpl.credit_to_wallet),
    credit_amount_rappen: tpl.credit_amount_rappen || 0,
  } as InvoiceItemFormData
  calculateItemTotal(item)
  syncItemCreditAmount(item)
  invoiceItems.value.push(item)
  showTemplateMenu.value = false
  templateMenuSearch.value = ''
}

const suggestRow = ref(-1)

const groupedSuggestTemplates = (query: string) =>
  groupInvoiceLineTemplates(filterInvoiceLineTemplates(lineTemplates.value, query, 0))

const openTemplateSuggest = (index: number) => {
  suggestRow.value = index
}

const applyTemplateToItem = (index: number, tpl: InvoiceLineTemplate) => {
  const item = invoiceItems.value[index]
  if (!item) return
  item.product_id = tpl.product_id || undefined
  item.product_name = tpl.name
  item.product_description = tpl.details || tpl.description || undefined
  item.unit_price_rappen = tpl.price_rappen || 0
  if (item.vat_rate == null) item.vat_rate = defaultVatRate.value
  item.credit_to_wallet = Boolean(tpl.credit_to_wallet)
  item.credit_amount_rappen = tpl.credit_amount_rappen || 0
  calculateItemTotal(item)
  syncItemCreditAmount(item)
  suggestRow.value = -1
}

const moveInvoiceItem = (index: number, direction: -1 | 1) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= invoiceItems.value.length) return
  const items = invoiceItems.value
  ;[items[index], items[newIndex]] = [items[newIndex], items[index]]
  items.forEach((item, idx) => { item.sort_order = idx })
}

const removeInvoiceItem = (index: number) => {
  if (invoiceItems.value.length > 1) {
    invoiceItems.value.splice(index, 1)
    // Sort order neu setzen
    invoiceItems.value.forEach((item, idx) => {
      item.sort_order = idx
    })
  }
}

const calculateItemTotal = (item: InvoiceItemFormData) => {
  const gross = Math.round(item.quantity * item.unit_price_rappen)
  const discountFactor = 1 - ((item.discount_percent || 0) / 100)
  item.total_price_rappen = Math.round(gross * discountFactor)
  item.vat_amount_rappen = Math.round(item.total_price_rappen * item.vat_rate / 100)
  if (!item.credit_to_wallet) return
  const tpl = lineTemplates.value.find(t => t.product_id && t.product_id === item.product_id && t.credit_to_wallet)
  if (tpl?.credit_amount_rappen) {
    item.credit_amount_rappen = Math.round(tpl.credit_amount_rappen * (item.quantity || 1))
  } else if (!item.product_id) {
    item.credit_amount_rappen = item.total_price_rappen
  }
}

const createInvoiceHandler = async () => {
  if (!canSubmit.value) return

  if (walletCreditRappen.value > 0 && !formData.value.user_id && !(creatingNewCustomer.value && saveNewCustomerToUsers.value)) {
    alert('Für die Guthaben-Gutschrift muss der Kunde im Stamm gespeichert werden.')
    return
  }
  
  isSubmitting.value = true
  
  try {
    if (creatingNewCustomer.value && saveNewCustomerToUsers.value && !formData.value.user_id) {
      try {
        const created = await $fetch<{
          success: boolean
          smsSuccess?: boolean
          emailSuccess?: boolean
          inviteSent?: boolean
          data?: { id: string; first_name?: string; last_name?: string; email?: string }
        }>(
          '/api/admin/add-student',
          {
            method: 'POST',
            body: {
              first_name: newCustomer.value.first_name.trim(),
              last_name: newCustomer.value.last_name.trim(),
              email: newCustomer.value.email.trim().toLowerCase(),
              phone: newCustomer.value.phone.trim(),
              street: formData.value.billing_street,
              street_nr: formData.value.billing_street_number,
              zip: formData.value.billing_zip,
              city: formData.value.billing_city,
              send_invite: sendOnboardingInvite.value && onboardingInviteAvailable.value,
            },
          }
        )
        if (!created?.data?.id) {
          throw new Error('Kunde konnte nicht angelegt werden')
        }
        formData.value.user_id = created.data.id
        formData.value.billing_contact_person = `${created.data.first_name || ''} ${created.data.last_name || ''}`.trim()
        if (created.data.email) formData.value.billing_email = created.data.email
      } catch (createErr: any) {
        const status = createErr?.statusCode || createErr?.status
        if (status === 409) {
          alert('Dieser Kunde existiert bereits (gleiche E-Mail oder Telefon). Bitte aus der Suche wählen.')
          return
        }
        throw createErr
      }
    }

    // Alle Item-Totale berechnen
    invoiceItems.value.forEach(calculateItemTotal)
    
    // Form data aktualisieren
    formData.value.subtotal_rappen = subtotal.value
    formData.value.vat_rate = parseFloat(averageVatRate.value)
    
    const result = await $fetch<{ success: boolean; paid_with_credit?: boolean; data?: any; invoice_number?: string }>(
      '/api/invoices/create',
      {
        method: 'POST',
        body: {
          invoiceData: {
            ...formData.value,
            document_kind: asQuote.value ? 'quote' : 'invoice',
          },
          items: invoiceItems.value,
          apply_available_credit: !asQuote.value && applyAvailableCredit.value && creditToApplyRappen.value > 0,
        },
      }
    )

    if (result.paid_with_credit && !result.data) {
      alert('Offene Beträge wurden vollständig mit Guthaben beglichen. Es wurde keine Rechnung erstellt.')
      emit('created', { paid_with_credit: true })
    } else if (result.data) {
      emit('created', result.data)
    } else {
      alert('Fehler beim Erstellen der Rechnung.')
    }
    
  } catch (error: any) {
    alert('Fehler beim Erstellen der Rechnung: ' + error.message)
  } finally {
    isSubmitting.value = false
  }
}

// Utility functions
const formatCurrency = (rappen: number) => {
  return (rappen / 100).toFixed(2)
}

const formatDate = (dateString: string) => {
  try {
    const d = new Date(dateString)
    const date = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
    return `${date}, ${time}`
  } catch {
    return dateString
  }
}

const formatDateShort = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateString
  }
}

// Lifecycle
onMounted(async () => {
  applyDocumentTexts(asQuote.value ? 'quote' : 'invoice')

  // Register click-outside handler BEFORE any await (lifecycle APIs can't be used after await)
  const closeMenu = (e: MouseEvent) => {
    const target = e.target as Node
    if (templateMenuRef.value && !templateMenuRef.value.contains(target)) {
      showTemplateMenu.value = false
    }
    if (!(target as HTMLElement).closest?.('.template-suggest-wrap')) {
      suggestRow.value = -1
    }
  }
  document.addEventListener('click', closeMenu)
  onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

  try {
    const res = await $fetch<{ templates?: InvoiceLineTemplate[] }>('/api/admin/invoices/line-templates')
    lineTemplates.value = res.templates || []
  } catch {
    lineTemplates.value = []
  }

  try {
    const policyRes = await $fetch<{ policy?: { onboarding_sms_enabled?: boolean; onboarding_email_enabled?: boolean } }>(
      '/api/admin/booking-policy'
    )
    if (policyRes?.policy) {
      bookingPolicy.value = {
        onboarding_sms_enabled: policyRes.policy.onboarding_sms_enabled !== false,
        onboarding_email_enabled: policyRes.policy.onboarding_email_enabled === true,
      }
    }
  } catch { /* defaults from booking policy */ }
  sendOnboardingInvite.value = defaultSendOnboardingInvite()

  // Pre-select company if passed in (e.g. opened from company detail modal)
  if (props.initialCompany) {
    applyCustomer({
      id: props.initialCompany.id,
      type: 'company',
      name: props.initialCompany.name,
      contact_person: props.initialCompany.contact_person || '',
      email: props.initialCompany.email || '',
      phone: props.initialCompany.phone || '',
      street: props.initialCompany.street || '',
      zip: props.initialCompany.zip || '',
      city: props.initialCompany.city || '',
    })
  }
})

watch(asQuote, (quote, wasQuote) => {
  const next = quote ? tenantQuoteTexts() : tenantInvoiceTexts()
  const prev = wasQuote ? tenantQuoteTexts() : tenantInvoiceTexts()
  const swapped = swapDocumentBodyTexts(formData.value, prev, next)
  formData.value.notes = swapped.notes
  formData.value.payment_terms = swapped.payment_terms
  formData.value.footer_text = swapped.footer_text
})

watch([invoiceIntroText, invoicePaymentTerms, invoiceFooterText, quoteIntroText, quoteTermsText, quoteFooterText], () => {
  if (formData.value.notes || formData.value.payment_terms || formData.value.footer_text) return
  applyDocumentTexts(asQuote.value ? 'quote' : 'invoice')
}, { once: true })

// Keep form + items in sync with tenant default VAT (no once: — branding may load late)
watch(defaultVatRate, (val) => {
  formData.value.vat_rate = val
  invoiceItems.value.forEach(item => {
    const rate = Number(item.vat_rate)
    // Overwrite only unset / known legacy defaults — never clobber a manually chosen rate
    if (rate === 0 || rate === 7.7 || rate === 7.70 || rate === 8.1 || rate === 8.10) {
      item.vat_rate = val
      calculateItemTotal(item)
    }
  })
})
</script>

<style>
.invoice-create-modal {
  color-scheme: light;
}

.invoice-create-modal input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]),
.invoice-create-modal textarea,
.invoice-create-modal select {
  background-color: #fff !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  caret-color: #111827 !important;
  border-color: #d1d5db !important;
  color-scheme: light !important;
  -webkit-appearance: none;
  appearance: none;
}

.invoice-create-modal input[type="search"],
.invoice-create-modal input[type="date"] {
  background-color: #fff !important;
}

.invoice-create-modal input::placeholder,
.invoice-create-modal textarea::placeholder {
  color: #9ca3af !important;
  -webkit-text-fill-color: #9ca3af !important;
}

.invoice-create-modal input:-webkit-autofill,
.invoice-create-modal input:-webkit-autofill:hover,
.invoice-create-modal input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
  box-shadow: 0 0 0 1000px #fff inset !important;
  -webkit-text-fill-color: #111827 !important;
  caret-color: #111827 !important;
}

.invoice-create-modal input:focus,
.invoice-create-modal textarea:focus,
.invoice-create-modal select:focus {
  --tw-ring-color: var(--color-primary, #1E40AF) !important;
}
</style>
