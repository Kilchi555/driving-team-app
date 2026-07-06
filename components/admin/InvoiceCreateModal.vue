<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white admin-modal">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-medium text-gray-900">Neue Rechnung erstellen</h3>
        <button
          class="text-gray-400 hover:text-gray-600"
          @click="$emit('close')"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>

      <form class="space-y-6" @submit.prevent="createInvoice">
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
              <span class="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                :class="selectedCompanyId ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-600'">
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
            <input v-model="customerSearch" type="search"
              placeholder="🔍  Kunde oder Firma suchen…"
              @input="searchCustomers"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
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
                <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                  :class="r.type === 'company' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-600'">
                  {{ r.type === 'company' ? 'Firma' : 'Kunde' }}
                </span>
              </button>
            </div>
            <p v-else-if="customerSearch.length >= 1 && !isSearchingCustomers"
              class="text-xs text-gray-400 mt-1.5 pl-1">Keine Ergebnisse</p>
          </div>
        </div>

        <!-- Offene Positionen (Kurse, Räume, Fahrzeuge) -->
        <div v-if="formData.user_id" class="border-t pt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-800">Offene Positionen</h4>
            <button type="button" @click="loadOpenItems" class="text-xs text-blue-600 hover:underline">
              {{ isLoadingOpenItems ? 'Lädt…' : 'Aktualisieren' }}
            </button>
          </div>
          <div v-if="isLoadingOpenItems" class="text-xs text-gray-400 py-2">Lädt offene Positionen…</div>
          <div v-else-if="openItems.length === 0" class="text-xs text-gray-400 py-2">Keine offenen Positionen für diesen Kunden.</div>
          <div v-else class="space-y-1.5">
            <label v-for="item in openItems" :key="item.source_id"
              class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
              :class="selectedOpenItemIds.has(item.source_id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'">
              <input type="checkbox" :value="item.source_id"
                :checked="selectedOpenItemIds.has(item.source_id)"
                @change="toggleOpenItem(item)"
                class="rounded" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
                <p v-if="item.date" class="text-xs text-gray-500">{{ formatDate(item.date) }}</p>
                <p v-if="item.payment_method && item.payment_method !== 'invoice'" class="text-xs text-amber-600">
                  bisherige Methode: {{ item.payment_method }}
                </p>
              </div>
              <span class="text-sm font-semibold text-gray-700">CHF {{ (item.amount_rappen / 100).toFixed(2) }}</span>
            </label>
          </div>
          <div v-if="selectedOpenItemIds.size > 0" class="mt-2 text-xs text-blue-700 font-medium">
            {{ selectedOpenItemIds.size }} Position(en) ausgewählt — werden automatisch als Rechnungsposten hinzugefügt.
          </div>
        </div>

        <!-- Rechnungsempfänger -->
        <div class="border-t pt-5">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-800">Rechnungsempfänger</h4>
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Ansprechpartner</label>
                <input v-model="formData.billing_contact_person" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">MWST-Nummer</label>
                <input v-model="formData.billing_vat_number" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>

            <!-- E-Mail -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">E-Mail *</label>
              <input v-model="formData.billing_email" type="email" required
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="kunde@beispiel.ch" />
            </div>

            <!-- Adresse -->
            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Strasse</label>
                <input v-model="formData.billing_street" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nr.</label>
                <input v-model="formData.billing_street_number" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">PLZ</label>
                <input v-model="formData.billing_zip" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Ort</label>
                <input v-model="formData.billing_city" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
          </div>
        </div>

        <!-- Rechnungspositionen -->
        <div class="border-t pt-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-800">Rechnungspositionen</h4>
            <div class="flex items-center gap-2">
              <!-- Vorlage-Button -->
              <div class="relative" ref="templateMenuRef">
                <button
                  type="button"
                  @click="showTemplateMenu = !showTemplateMenu"
                  class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  Vorlage
                </button>
                <div
                  v-if="showTemplateMenu"
                  class="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden"
                >
                  <div class="px-3 py-2 border-b border-gray-100">
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Produkte / Vorlagen</p>
                  </div>
                  <div v-if="products.length === 0" class="px-3 py-3 text-xs text-gray-400">Keine Produkte verfügbar</div>
                  <div class="max-h-64 overflow-y-auto">
                    <button
                      v-for="p in products"
                      :key="p.id"
                      type="button"
                      @click="addItemFromTemplate(p)"
                      class="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                    >
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-800 truncate">{{ p.name }}</p>
                        <p v-if="p.description" class="text-xs text-gray-400 truncate">{{ p.description }}</p>
                      </div>
                      <span class="text-xs font-semibold text-gray-600 ml-2 shrink-0">CHF {{ (p.price_rappen / 100).toFixed(2) }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
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
              class="border border-gray-200 rounded-xl p-4 bg-gray-50"
            >
              <!-- Row 1: Beschreibung + Menge + Preis + MwSt -->
              <div class="grid grid-cols-12 gap-3 items-end">
                <div class="col-span-12 md:col-span-5">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Beschreibung *</label>
                  <input
                    v-model="item.product_name"
                    type="text"
                    required
                    placeholder="z.B. Fahrstunde, Theorieunterricht"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                </div>
                <div class="col-span-4 md:col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Menge</label>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    @input="calculateItemTotal(item)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                </div>
                <div class="col-span-4 md:col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Einzelpreis (CHF)</label>
                  <input
                    :value="item.unit_price_rappen / 100"
                    @input="(e: any) => { item.unit_price_rappen = Math.round(parseFloat(e.target.value || 0) * 100); calculateItemTotal(item) }"
                    type="number"
                    min="0"
                    step="0.05"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                </div>
                <div class="col-span-4 md:col-span-1">
                  <label class="block text-xs font-medium text-gray-500 mb-1">MwSt (%)</label>
                  <input
                    v-model.number="item.vat_rate"
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    @input="calculateItemTotal(item)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                </div>
                <div class="col-span-4 md:col-span-1">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Rabatt (%)</label>
                  <input
                    v-model.number="item.discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="0"
                    @input="calculateItemTotal(item)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    :class="(item.discount_percent || 0) > 0 ? 'border-amber-400 bg-amber-50' : ''"
                  >
                </div>
                <div class="col-span-4 md:col-span-1 flex items-end justify-end pb-0.5">
                  <button
                    type="button"
                    class="text-red-400 hover:text-red-600 transition-colors"
                    title="Position entfernen"
                    @click="removeInvoiceItem(index)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <!-- Row 2: Totals -->
              <div class="mt-2.5 flex items-center gap-4 text-xs text-gray-500">
                <span>Gesamt: <strong class="text-gray-800">CHF {{ formatCurrency(item.total_price_rappen) }}</strong></span>
                <span v-if="(item.discount_percent || 0) > 0" class="text-amber-600 font-medium">
                  −{{ item.discount_percent }}% Rabatt angewendet
                </span>
                <span class="text-gray-400">(MwSt: CHF {{ formatCurrency(item.vat_amount_rappen) }})</span>
              </div>

              <!-- Optional description -->
              <div v-if="item.product_description !== undefined" class="mt-2">
                <input
                  v-model="item.product_description"
                  type="text"
                  placeholder="Zusatztext / Beschreibung (optional)"
                  class="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-300"
                >
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
            
            <div class="border-t pt-2 flex justify-between font-medium text-lg">
              <span>Gesamtbetrag:</span>
              <span>CHF {{ formatCurrency(totalAmount) }}</span>
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
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="z.B. Guten Tag, anbei Ihre Rechnung..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Zahlungsbedingungen
                <span class="text-xs font-normal text-gray-400 ml-1">(für Kunden sichtbar)</span>
              </label>
              <textarea
                v-model="formData.payment_terms"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="z.B. Zahlbar innert 30 Tagen netto."
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
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Interne Notizen..."
              />
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="$emit('close')"
          >
            Abbrechen
          </button>
          
          <button
            type="submit"
            :disabled="!canSubmit || isSubmitting"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon v-if="isSubmitting" class="animate-spin h-4 w-4 mr-2" />
            {{ isSubmitting ? 'Wird erstellt...' : 'Rechnung erstellen' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useInvoices } from '~/composables/useInvoices'
import { useProducts } from '~/composables/useProducts'
import { useTenantBranding } from '~/composables/useTenantBranding'
import type { InvoiceFormData, InvoiceItemFormData } from '~/types/invoice'
import { DEFAULT_INVOICE_VALUES, DEFAULT_INVOICE_ITEM_VALUES } from '~/types/invoice'
import {
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

// Emits
const emit = defineEmits<{
  close: []
  created: [invoice: any]
}>()

// Composables
const { createInvoice } = useInvoices()
const { loadProducts: fetchProducts } = useProducts()
const { primaryColor, defaultVatRate, invoiceIntroText, invoicePaymentTerms, invoiceFooterText } = useTenantBranding()

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
    const userList = (Array.isArray(usersRes.value) ? usersRes.value : []).map((u: any) => ({
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
  customerResults.value = []
  customerSearch.value = ''
  if (r.type === 'company') {
    formData.value.user_id = ''
    selectedCompanyId.value = r.id
    selectedCustomerLabel.value = r.name
    formData.value.billing_type = 'company'
    formData.value.billing_company_name = r.name
    formData.value.billing_contact_person = r.contact_person || ''
    formData.value.billing_email = r.email || ''
    formData.value.billing_street = r.street || ''
    formData.value.billing_zip = r.zip || ''
    formData.value.billing_city = r.city || ''
  } else {
    formData.value.user_id = r.id
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
  }
  selectedOpenItemIds.value = new Set()
  openItems.value = []
  loadOpenItems()
}

function clearCustomer() {
  selectedCustomerLabel.value = ''
  selectedCompanyId.value = ''
  showBillingEdit.value = false
  formData.value.user_id = ''
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
  subtotal_rappen: 0,
  vat_rate: 7.70,
  discount_amount_rappen: 0,
  notes: '',
  internal_notes: '',
  payment_terms: '',
  footer_text: '',
})

// Invoice items — initialized with tenant default VAT
const invoiceItems = ref<InvoiceItemFormData[]>([
  { ...DEFAULT_INVOICE_ITEM_VALUES, product_name: '', unit_price_rappen: 0, vat_rate: defaultVatRate.value } as InvoiceItemFormData
])

// Computed
const canSubmit = computed(() => {
  return formData.value.user_id && 
         invoiceItems.value.length > 0 && 
         invoiceItems.value.every(item => 
           item.product_name && 
           item.quantity > 0 && 
           item.unit_price_rappen > 0
         )
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
    const newItem: any = {
      ...DEFAULT_INVOICE_ITEM_VALUES,
      product_name: item.label,
      product_description: item.unit,
      quantity: 1,
      unit_price_rappen: item.amount_rappen,
      total_price_rappen: item.amount_rappen,
      vat_rate: 0,
      vat_amount_rappen: 0,
      sort_order: invoiceItems.value.length,
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

const addItemFromTemplate = (product: any) => {
  const item: InvoiceItemFormData = {
    ...DEFAULT_INVOICE_ITEM_VALUES,
    product_id: product.id,
    product_name: product.name,
    product_description: product.description || undefined,
    unit_price_rappen: product.price_rappen || 0,
    vat_rate: defaultVatRate.value,
    sort_order: invoiceItems.value.length,
  } as InvoiceItemFormData
  calculateItemTotal(item)
  invoiceItems.value.push(item)
  showTemplateMenu.value = false
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
}

const createInvoiceHandler = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    // Alle Item-Totale berechnen
    invoiceItems.value.forEach(calculateItemTotal)
    
    // Form data aktualisieren
    formData.value.subtotal_rappen = subtotal.value
    formData.value.vat_rate = parseFloat(averageVatRate.value)
    
    const result = await createInvoice(formData.value, invoiceItems.value)
    
    if (result.error) {
      alert('Fehler beim Erstellen der Rechnung: ' + result.error)
    } else {
      alert(`Rechnung erfolgreich erstellt! Rechnungsnummer: ${result.invoice_number}`)
      emit('created', result.data)
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
  return new Date(dateString).toLocaleDateString('de-CH')
}

// Lifecycle
onMounted(async () => {
  // Pre-fill invoice texts from tenant defaults (may already be loaded)
  if (invoiceIntroText.value) formData.value.notes = invoiceIntroText.value
  if (invoicePaymentTerms.value) formData.value.payment_terms = invoicePaymentTerms.value
  if (invoiceFooterText.value) formData.value.footer_text = invoiceFooterText.value
  await fetchProducts()

  const closeMenu = (e: MouseEvent) => {
    if (templateMenuRef.value && !templateMenuRef.value.contains(e.target as Node)) {
      showTemplateMenu.value = false
    }
  }
  document.addEventListener('click', closeMenu)
  onBeforeUnmount(() => document.removeEventListener('click', closeMenu))
})

// If branding loads after mount, fill texts once
watch(invoiceIntroText, (val) => { if (val && !formData.value.notes) formData.value.notes = val }, { once: true })
watch(invoicePaymentTerms, (val) => { if (val && !formData.value.payment_terms) formData.value.payment_terms = val }, { once: true })
watch(invoiceFooterText, (val) => { if (val && !formData.value.footer_text) formData.value.footer_text = val }, { once: true })

// When default VAT loads, apply to any items that still have the hardcoded 7.7 default
watch(defaultVatRate, (val) => {
  invoiceItems.value.forEach(item => {
    if (item.vat_rate === 7.70) item.vat_rate = val
  })
}, { once: true })
</script>
