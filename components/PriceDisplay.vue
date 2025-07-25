<!-- Verbesserte PriceDisplay.vue Template Sektion -->
<template>
  <div class="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-700">
        💰 {{ eventType === 'lesson' ? 'Preisübersicht Fahrstunde' : 'Preisübersicht Termin' }}
      </h3>
    </div>

    <!-- HAUPTPREIS-ANZEIGE -->
    <div class="space-y-3">
      
      <!-- 1. FAHRSTUNDEN-GRUNDPREIS -->
      <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div class="flex-1">
          <!-- Datum, Zeit, Dauer -->
          <div class="text-xs text-blue-700 space-y-0.5">
            <div v-if="selectedDate">📅 {{ formatSelectedDate(selectedDate) }}</div>
            <div v-if="startTime && endTime">🕐 {{ startTime }} - {{ endTime }}</div>
            <div>⏱️ {{ durationMinutes }} Minuten</div>
          </div>
        </div>
        <span class="text-lg font-bold text-blue-900 ml-4">
          CHF {{ formatPrice(lessonPrice) }}
        </span>
      </div>

      <!-- 2. VERSICHERUNGSGEBÜHR (falls vorhanden) -->
      <div v-if="shouldShowAdminFee" class="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-900">Versicherungsgebühr</span>
          <button @click="showAdminFeeInfo = !showAdminFeeInfo" class="text-blue-500 hover:text-blue-700 text-xs">
            ℹ️
          </button>
        </div>
        <span class="text-lg font-bold text-yellow-800">
          CHF {{ formatPrice(adminFee) }}
        </span>
      </div>

      <!-- 4. RABATT (falls vorhanden) -->
      <div v-if="props.discount > 0" class="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-green-800">Rabatt</span>
          <span v-if="props.discountReason" class="text-xs text-green-600">({{ props.discountReason }})</span>
          <button v-if="props.allowDiscountEdit" @click="removeDiscount" class="text-red-500 hover:text-red-700 text-xs">
            ✕ 
          </button>
        </div>
        <span class="text-lg font-bold text-green-700">
          - CHF {{ formatPrice(props.discount) }}
        </span>
      </div>

      <!-- 5. RABATT HINZUFÜGEN BUTTON -->
      <div v-if="props.allowDiscountEdit && props.discount === 0" class="flex justify-center">
        <button 
          @click="showDiscountEdit = true"
          class="text-blue-600 hover:text-blue-800 text-sm font-medium py-2 px-4 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
        >
          ➕ Rabatt hinzufügen
        </button>
      </div>

      <!-- 6. GESAMTPREIS (nur wenn Rabatt vorhanden) -->
      <div v-if="props.discount > 0" class="flex justify-between items-center p-4 bg-gray-900 rounded-lg border-2 border-gray-800" 
           :class="paymentStatusClass">
        <span class="text-lg font-bold text-white">TOTAL:</span>
        <div class="text-right">
          <div class="text-2xl font-bold text-white">CHF {{ finalPrice }}</div>
        </div>
      </div>
    </div>

    <!-- ADMIN FEE INFO EXPANDABLE -->
    <div v-if="showAdminFeeInfo" class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
      <p><strong>Versicherungsgebühr:</strong></p>
      <p v-if="props.appointmentNumber === 1">Entfällt beim ersten Termin.</p>
      <p v-else>Wird ab dem 2. Termin einmalig erhoben.</p>
    </div>

    <!-- RABATT-BEARBEITUNGS-SEKTION -->
    <div v-if="showDiscountEdit" class="border-t border-gray-200 pt-4">      
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rabattbetrag (CHF)</label>
          <input 
            type="number" 
            v-model="tempDiscountInput"
            @blur="formatToTwoDecimals"
            step="0.01"
            min="0"
            :max="maxDiscount"
            placeholder="z.B. 20.00"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
          <p class="text-xs text-gray-500 mt-1">
            Maximaler Rabatt: CHF {{ formatPrice(maxDiscount) }}
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Grund für Rabatt</label>
          <input 
            type="text" 
            v-model="tempDiscountReason"
            placeholder="z.B. Treuebonus, Ausbildungsrabatt"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>

        <!-- RABATT-VORSCHAU -->
        <div v-if="tempDiscount > 0" class="bg-gray-50 p-3 rounded-md border">
          <h5 class="text-sm font-medium text-gray-700 mb-2">📊 Vorschau:</h5>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between text-gray-500">
              <span>Fahrstunde:</span>
              <span>CHF {{ formatPrice(lessonPrice) }}</span>
            </div>
            <div v-if="shouldShowAdminFee" class="flex justify-between text-gray-500">
              <span>Versicherung:</span>
              <span>CHF {{ formatPrice(adminFee) }}</span>
            </div>
            <div class="flex justify-between border-t pt-1 text-gray-600">
              <span>Subtotal:</span>
              <span>CHF {{ formatPrice(totalPriceWithoutDiscount) }}</span>
            </div>
            <div class="flex justify-between text-green-600">
              <span>Rabatt:</span>
              <span>- CHF {{ formatPrice(tempDiscount) }}</span>
            </div>
            <div class="flex justify-between font-bold text-lg border-t border-gray-300 pt-1 text-gray-500">
              <span>Neuer Preis:</span>
              <span>CHF {{ formatPrice(totalPriceWithoutDiscount - tempDiscount) }}</span>
            </div>
          </div>
        </div>

        <!-- BUTTONS -->
        <div class="flex justify-end space-x-3">
          <button
            @click="cancelDiscountEdit"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="applyDiscount"
            :disabled="tempDiscount <= 0"
            class="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rabatt anwenden
          </button>
        </div>
      </div>
    </div>


    <!-- Zahlungsart-Regler -->
    <div class="border-t border-gray-200 pt-4">
      <h4 class="text-md font-medium text-gray-900 mb-3">Zahlungsart wählen</h4>
      
      <div class="space-y-3">
        <!-- Rechnung Toggle -->
        <div class="flex items-center justify-between p-3 border rounded-lg" 
             :class="[
               invoiceMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
             ]">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Rechnung</span>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="invoiceMode" 
              @change="onInvoiceModeChange"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <!-- Barzahlung Toggle -->
        <div class="flex items-center justify-between p-3 border rounded-lg"
             :class="[
               cashMode ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-gray-50'
             ]">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Barzahlung</span>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="cashMode" 
              @change="onCashModeChange"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
          </label>
        </div>

        <!-- Online Zahlung (Standard wenn nichts aktiviert) -->
        <div v-if="!invoiceMode && !cashMode" class="flex items-center justify-between p-3 border-2 border-green-500 bg-green-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Online Zahlung</span>
              <p class="text-sm text-gray-600">Twint, Kreditkarte über Wallee</p>
            </div>
          </div>
          <span class="px-2 py-1 bg-green-600 text-white text-xs rounded-full">Aktiv</span>
        </div>
      </div>
    </div>

    <!-- Neue einklappbare Rechnungsadresse Section - ERSETZT die alte Section -->
    <div v-if="invoiceMode" class="mt-4 border border-gray-200 rounded-lg">
      <!-- Kollapsible Header - Mobile Responsive -->
      <div class="p-3 cursor-pointer hover:bg-gray-50 transition-colors" @click="toggleBillingSection">
        
        <!-- Desktop Version (md+) -->
        <div class="hidden md:flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">📄</span>
            <label class="text-sm font-semibold text-gray-900 cursor-pointer">
              Firmenrechnungsadresse
            </label>
            <!-- Status Indikator -->
            <span v-if="billingAddressSaved" class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
              ✅ Gespeichert
            </span>
            <span v-else-if="companyBilling.validation.value.isValid" class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
              ⚠️ Nicht gespeichert
            </span>
            <span v-else class="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
              ❌ Unvollständig
            </span>
          </div>
        </div>

        <!-- Mobile Version (bis md) -->
        <div class="md:hidden">
          <!-- Erste Zeile: Icon, Titel und Pfeil -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">📄</span>
              <label class="text-sm font-semibold text-gray-900 cursor-pointer">
                Firmenrechnungsadresse
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Eingeklappte Ansicht - Kurze Zusammenfassung -->
      <div v-if="!isBillingSectionExpanded && billingAddressSaved" class="px-3 pb-3">
        <div class="text-sm text-gray-600 bg-green-50 p-2 rounded">
          <div class="font-medium">{{ companyBilling.formData.value.companyName }}</div>
          <div>{{ companyBilling.formData.value.street }} {{ companyBilling.formData.value.streetNumber }}</div>
          <div>{{ companyBilling.formData.value.zip }} {{ companyBilling.formData.value.city }}</div>
        </div>
      </div>

    <!-- Erweiterte Ansicht - Vollständiges Formular -->
    <div v-if="isBillingSectionExpanded" class="p-4 border-t border-gray-200 bg-gray-50">
      
      <!-- Gespeicherte Adressen Dropdown - IHRE BESTEHENDE LOGIK -->
      <div v-if="companyBilling.savedAddresses.value.length > 0" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Gespeicherte Adresse verwenden</label>
        <select
          @change="onSavedAddressSelected"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Neue Adresse eingeben</option>
          <option v-for="address in companyBilling.savedAddresses.value" :key="address.id" :value="address.id">
            {{ companyBilling.getAddressPreview(address) }}
          </option>
        </select>
      </div>

      <!-- Firmenadresse Formular -->
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.companyName"
              placeholder="z.B. Muster AG"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.companyName }"
            >
            <p v-if="companyBilling.validation.value.errors.companyName" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.companyName }}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ansprechperson *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.contactPerson"
              placeholder="z.B. Max Mustermann"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.contactPerson }"
            >
            <p v-if="companyBilling.validation.value.errors.contactPerson" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.contactPerson }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input 
              type="email" 
              v-model="companyBilling.formData.value.email"
              placeholder="rechnung@firma.ch"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.email }"
            >
            <p v-if="companyBilling.validation.value.errors.email" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.email }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input 
              type="tel" 
              v-model="companyBilling.formData.value.phone"
              placeholder="+41 44 123 45 67"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
        </div>

        <div class="grid grid-cols-4 gap-3">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Strasse *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.street"
              placeholder="Musterstrasse"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.street }"
            >
            <p v-if="companyBilling.validation.value.errors.street" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.street }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.streetNumber"
              placeholder="123"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.zip"
              placeholder="8000"
              maxlength="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.zip }"
            >
            <p v-if="companyBilling.validation.value.errors.zip" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.zip }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.city"
              placeholder="Zürich"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.city }"
            >
            <p v-if="companyBilling.validation.value.errors.city" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.city }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">MwSt-Nummer</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.vatNumber"
              placeholder="CHE-123.456.789 MWST"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
        </div>

        <!-- Speichern Button - Erweitert um Auto-Collapse -->
            <div v-if="!companyBilling.currentAddress.value" class="pt-4">
              <button
                @click="saveAndCollapseBilling"
                :disabled="!companyBilling.validation.value.isValid || companyBilling.isLoading.value"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="companyBilling.isLoading.value">⏳ Speichere...</span>
                <span v-else>💾 Speichern & Einklappen</span>
              </button>
            </div>

            <!-- Validation & Error Messages - IHRE BESTEHENDE LOGIK -->
            <div v-if="!companyBilling.validation.value.isValid" class="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              ⚠️ Bitte füllen Sie alle Pflichtfelder korrekt aus
            </div>
            
            <div v-if="companyBilling.validation.value.isValid" class="mt-3 text-sm text-green-600 bg-green-50 p-2 rounded">
              ✅ Rechnungsadresse vollständig
            </div>

            <div v-if="companyBilling.error.value" class="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              ❌ {{ companyBilling.error.value }}
            </div>
          </div>
        </div>
        </div>

    <!-- Statusmeldung -->
    <div v-if="paymentModeStatus" class="text-sm p-3 rounded-lg" 
         :class="[
           paymentModeStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
           paymentModeStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
           'bg-red-50 text-red-800 border border-red-200'
         ]">
      {{ paymentModeStatus.message }}
    </div>

    <!-- Für Clients: Link zu PaymentModal -->
    <div v-if="currentUser?.role === 'student' && !isPaid" class="mt-3 pt-3 border-t border-gray-200">
      <button
        @click="emit('open-payment-modal')"
        class="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
      >
        💳 Online bezahlen (Twint, Karte)
      </button>
    </div>
    <!-- Checkbox für automatisches Speichern hinzufügen -->
    <div v-if="invoiceMode || cashMode" class="flex items-center mt-3 p-2 bg-gray-50 rounded">
      <input 
        type="checkbox" 
        v-model="savePaymentPreference" 
        id="save-payment-pref"
        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      >
      <label for="save-payment-pref" class="ml-2 text-sm text-gray-600">
        Als Standard für zukünftige Termine speichern
      </label>
    </div>
    <!-- HIER der neue Billing-Button - NUR wenn Rechnungsadresse gespeichert UND Invoice-Mode aktiv -->
    <div v-if="invoiceMode && billingAddressSaved" class="mt-4 pt-3 border-t border-gray-200">
      <button
        @click="toggleBillingEditMode"
        class="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
        :class="[
          isBillingEditMode 
            ? 'bg-green-600 text-white hover:bg-green-700' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        ]"
      >
        <span v-if="isBillingEditMode" class="mr-2">💾</span>
        <span v-else class="mr-2">✏️</span>
        {{ isBillingEditMode ? 'Speichern' : 'Rechnungsadresse bearbeiten' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useCompanyBilling } from '~/composables/useCompanyBilling'
import { getSupabase } from '~/utils/supabase'


// Props - angepasst an bestehende Struktur
interface Props {
  eventType?: 'lesson' | 'meeting'
  durationMinutes: number
  pricePerMinute: number
  isPaid: boolean
  adminFee: number
  isSecondOrLaterAppointment: boolean
  appointmentNumber: number
  showAdminFeeByDefault?: boolean
  discount: number
  discountType: 'fixed'
  discountReason: string
  allowDiscountEdit: boolean
  selectedDate?: string | null
  startTime?: string | null
  endTime?: string | null
  currentUser?: any
  initialPaymentMethod?: string
  selectedStudentId?: string
  selectedStudent?: any  
 

}

const props = withDefaults(defineProps<Props>(), {
  eventType: 'lesson',
  durationMinutes: 45,
  pricePerMinute: 0,
  isPaid: false,
  adminFee: 120,
  isSecondOrLaterAppointment: false,
  appointmentNumber: 1,
  showAdminFeeByDefault: false,
  discount: 0,
  discountType: 'fixed',
  discountReason: '',
  allowDiscountEdit: false,
  selectedDate: '',
  startTime: '',
  currentUser: null
})

// Emits - alle Events aus deiner bestehenden Komponente
const emit = defineEmits([
  'discount-changed', 
  'update:discount', 
  'update:discountReason',
  'payment-status-changed',
  'open-payment-modal',
  'payment-mode-changed',
  'invoice-data-changed'
])

// Composables
const companyBilling = useCompanyBilling()

// State - angepasst an bestehende Logik
const showAdminFeeInfo = ref(false)
const showDiscountEdit = ref(false)

// Temp discount for editing
const tempDiscountInput = ref('')
const tempDiscountReason = ref('')

// State - Neue Zahlungsart-Regler
const invoiceMode = ref(false)
const cashMode = ref(false)
const selectedAddressId = ref('')
const savePaymentPreference = ref(true)
const isBillingSectionExpanded = ref(false) 
const billingAddressSaved = ref(false) 

// Computed - angepasst an bestehende Props
const tempDiscount = computed(() => parseFloat(tempDiscountInput.value) || 0)

const isEditMode = ref(false)
const isBillingEditMode = ref(false)

const toggleBillingEditMode = () => {
  if (isBillingEditMode.value) {
    // SPEICHERN-MODUS: Rechnungsadresse speichern
    if (companyBilling.validation.value.isValid) {
      saveAndCollapseBilling()
    }
    isBillingEditMode.value = false
  } else {
    // BEARBEITEN-MODUS: Billing-Bereich öffnen
    isBillingEditMode.value = true
    isBillingSectionExpanded.value = true
  }
}


// Toggle-Funktion hinzufügen
const toggleEditMode = () => {
  console.log('🔄 toggleEditMode called, current state:', isEditMode.value)
  
  if (isEditMode.value) {
    // SPEICHERN-MODUS: Alle offenen Editierungen anwenden
    console.log('💾 Speichern-Modus aktiviert')
    
    // Rabatt speichern falls offen
    if (showDiscountEdit.value && tempDiscountInput.value) {
      console.log('💰 Applying discount...')
      applyDiscount()
    }
    
    // Alle Edit-Bereiche schließen
    showDiscountEdit.value = false
    showAdminFeeInfo.value = false
    
    // Edit-Mode beenden
    isEditMode.value = false
    console.log('✅ Edit-Mode beendet')
    
  } else {
    // BEARBEITEN-MODUS: Edit-Mode aktivieren
    console.log('✏️ Bearbeiten-Modus aktiviert')
    isEditMode.value = true
    
    // Optional: Rabatt-Edit automatisch öffnen wenn erlaubt
    if (props.allowDiscountEdit && props.discount === 0) {
      showDiscountEdit.value = true
      console.log('📝 Rabatt-Edit automatisch geöffnet')
    }
  }
}

const lessonPrice = computed(() => {
  return props.durationMinutes * props.pricePerMinute
})

const shouldShowAdminFee = computed(() => {
  return props.appointmentNumber === 2 || props.showAdminFeeByDefault || props.isSecondOrLaterAppointment
})

const totalPriceWithoutDiscount = computed(() => {
  let total = lessonPrice.value
  if (shouldShowAdminFee.value) {
    total += props.adminFee
  }
  return total
})

const maxDiscount = computed(() => totalPriceWithoutDiscount.value)

const finalPrice = computed(() => {
  const total = totalPriceWithoutDiscount.value - props.discount
  return formatPrice(total)
})

const paymentStatusClass = computed(() => {
  if (props.isPaid) return 'text-green-700'
  return 'text-gray-900'
})

const paymentStatusText = computed(() => {
  if (props.isPaid) return 'Bezahlt'
  return 'Offen'
})

const formattedAppointmentInfo = computed(() => {
  let parts = []
  
  if (props.selectedDate) {
    const date = new Date(props.selectedDate)
    parts.push(date.toLocaleDateString('de-CH'))
  }
  
  if (props.startTime) {
    const [hours, minutes] = props.startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + props.durationMinutes
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
    
    parts.push(`${props.startTime} - ${endTime} (${props.durationMinutes}min)`)
  } else {
    parts.push(`${props.durationMinutes}min`)
  }
  
  return parts.join('\n')
})

// Neue Funktion für Datum-Formatierung hinzufügen:
const formatSelectedDate = (dateString: string) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    return dateString
  }
}

// Computed - Neue Zahlungsart-Logik
const invoiceDataValid = computed(() => {
  return companyBilling.validation.value.isValid
})

const paymentModeStatus = computed(() => {
  if (invoiceMode.value && cashMode.value) {
    return {
      type: 'warning',
      message: 'Bitte wählen Sie nur eine Zahlungsart aus.'
    }
  }
  
  if (invoiceMode.value && !invoiceDataValid.value) {
    return {
      type: 'warning',
      message: 'Bitte füllen Sie alle Pflichtfelder für die Rechnungsadresse aus.'
    }
  }
  
  if (invoiceMode.value && invoiceDataValid.value) {
    return {
      type: 'success',
      message: 'Rechnung wird nach der Fahrstunde erstellt und versendet.'
    }
  }
  
  if (cashMode.value) {
    return {
      type: 'success',
      message: 'Zahlung erfolgt bar beim Fahrlehrer.'
    }
  }
  
  return {
    type: 'success',
    message: 'Online-Zahlung über Customer Dashboard.'
  }
})

// Methods
const formatPrice = (amount: number): string => {
  return amount.toFixed(2)
}

const formatToTwoDecimals = () => {
  if (tempDiscountInput.value) {
    tempDiscountInput.value = parseFloat(tempDiscountInput.value).toFixed(2)
  }
}

const applyDiscount = () => {
  // Emit in bestehender Struktur
  emit('discount-changed', tempDiscount.value, 'fixed', tempDiscountReason.value)
  
  showDiscountEdit.value = false
  tempDiscountInput.value = ''
  tempDiscountReason.value = ''
}

const cancelDiscountEdit = () => {
  showDiscountEdit.value = false
  tempDiscountInput.value = ''
  tempDiscountReason.value = ''
}

const removeDiscount = () => {
  emit('discount-changed', 0, 'fixed', '')
}

// Methods - Neue Zahlungsart-Logik
// In PriceDisplay.vue - bei der onInvoiceModeChange Funktion:
const onInvoiceModeChange = async () => {
  if (invoiceMode.value && cashMode.value) {
    cashMode.value = false
  }
  
  // Lade gespeicherte Adressen wenn Invoice-Mode aktiviert wird
  if (invoiceMode.value && props.currentUser?.id) {
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
  }
  
  updatePaymentMode()
}

// ============ PAYMENT PREFERENCES METHODS ============
const loadUserPaymentPreferences = async (userId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('preferred_payment_method, default_company_billing_address_id')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    
    console.log('🔍 DB Result preferred_payment_method:', data?.preferred_payment_method)
    console.log('🔍 DB Result default_company_billing_address_id:', data?.default_company_billing_address_id)
    
    // Store billing address ID for later use
    let billingAddressData = null
    
    // NEU: Lade Standard-Rechnungsadresse zuerst (falls vorhanden)
    if (data?.default_company_billing_address_id) {
      billingAddressData = await loadDefaultBillingAddress(data.default_company_billing_address_id)
    }
    
    if (data?.preferred_payment_method) {
      // Bestehende Payment-Method Logik...
      const uiMethodMapping: Record<string, string> = {
        'cash': 'cash',
        'invoice': 'invoice',
        'twint': 'online',
        'stripe_card': 'online',
        'debit_card': 'online'
      }
      
      const uiMethod = uiMethodMapping[data.preferred_payment_method] || 'online'
      
      console.log('✅ Loaded payment preference:', data.preferred_payment_method, '→', uiMethod)
      
      // Setze UI-Zustand basierend auf Preference
      if (uiMethod === 'cash') {
        cashMode.value = true
        invoiceMode.value = false
      } else if (uiMethod === 'invoice') {
        invoiceMode.value = true
        cashMode.value = false
      } else {
        cashMode.value = false
        invoiceMode.value = false
      }
      
      // Pass billing data if invoice method and address loaded
      const paymentData = (uiMethod === 'invoice' && billingAddressData) ? billingAddressData : null
      updatePaymentMode()
      
    } else {
      console.log('📭 No payment preference found, setting to online')
      cashMode.value = false
      invoiceMode.value = false
    }
    
  } catch (err) {
    console.error('❌ Error loading payment preferences:', err)
    cashMode.value = false
    invoiceMode.value = false
  }
}

const loadDefaultBillingAddress = async (addressId: string) => {
  try {
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
    
    const address = companyBilling.savedAddresses.value.find(
      (addr: any) => addr.id === addressId
    )
    
    if (address) {
      companyBilling.loadFormFromAddress(address)
      selectedAddressId.value = addressId
      console.log('✅ Auto-loaded default billing address')
      return {
        formData: companyBilling.formData.value,
        currentAddress: address,
        isValid: companyBilling.validation.value.isValid
      }
    }
    
    return null
  } catch (err) {
    console.error('❌ Error loading default billing:', err)
    return null
  }
}

const onCashModeChange = () => {
  if (cashMode.value && invoiceMode.value) {
    invoiceMode.value = false
  }
  updatePaymentMode()
}

const onSavedAddressSelected = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const addressId = target.value
  
  if (addressId) {
    const address = companyBilling.savedAddresses.value.find(addr => addr.id === addressId)
    if (address) {
      companyBilling.loadFormFromAddress(address)
      selectedAddressId.value = addressId
    }
  } else {
    companyBilling.resetForm()
    selectedAddressId.value = ''
  }
}

const saveCompanyAddress = async () => {
  if (!props.currentUser?.id) {
    companyBilling.error.value = 'Benutzer nicht angemeldet'
    return
  }

  const result = await companyBilling.createCompanyBillingAddress(props.currentUser.id)
  
  if (result.success) {
    // Erfolgreich gespeichert, lade Liste neu
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
    selectedAddressId.value = result.data?.id || ''
  }
}

const updatePaymentMode = () => {
  let mode: 'invoice' | 'cash' | 'online' = 'online'
  let data = undefined
  
  if (invoiceMode.value) {
    mode = 'invoice'
    data = {
      formData: companyBilling.formData.value,
      currentAddress: companyBilling.currentAddress.value,
      isValid: companyBilling.validation.value.isValid
    }
  } else if (cashMode.value) {
    mode = 'cash'
  }
  
  emit('payment-mode-changed', mode, data)
  
  // Zusätzliches Event für Invoice-Data
  if (mode === 'invoice') {
    emit('invoice-data-changed', companyBilling.formData.value, companyBilling.validation.value.isValid)
  }
}

const toggleBillingSection = () => {
  isBillingSectionExpanded.value = !isBillingSectionExpanded.value
}

const expandBillingSection = () => {
  isBillingSectionExpanded.value = true
}

const saveAndCollapseBilling = async () => {
  if (!props.currentUser?.id) {
    companyBilling.error.value = 'Benutzer nicht angemeldet'
    return
  }

  try {
    let result

    if (companyBilling.currentAddress.value?.id) {
      // ✅ UPDATE: Bestehende Adresse aktualisieren
      console.log('🔄 Updating existing billing address:', companyBilling.currentAddress.value.id)
      result = await companyBilling.updateCompanyBillingAddress(companyBilling.currentAddress.value.id)
    } else {
      // ✅ CREATE: Neue Adresse erstellen
      console.log('➕ Creating new billing address...')
      result = await companyBilling.createCompanyBillingAddress(props.currentUser.id)
    }

    if (result.success && !companyBilling.error.value) {
      isBillingSectionExpanded.value = false
      console.log('✅ Billing address saved and collapsed')
      
      // Liste neu laden um aktuelle Daten zu haben
      await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
    } else {
      console.error('❌ Failed to save billing address:', result.error || companyBilling.error.value)
    }

  } catch (err: any) {
    console.error('❌ Error in saveAndCollapseBilling:', err)
    companyBilling.error.value = err.message || 'Unbekannter Fehler beim Speichern'
  }
}

// Bestehende Funktionen modifizieren um Edit-Mode zu berücksichtigen
const startDiscountEdit = () => {
  if (!isEditMode.value) {
    isEditMode.value = true
  }
  showDiscountEdit.value = true
  tempDiscountInput.value = props.discount > 0 ? props.discount.toString() : ''
  tempDiscountReason.value = props.discountReason
}


// Watchers
// Watcher für initialPaymentMethod
watch(() => props.initialPaymentMethod, (newMethod) => {
  
  if (newMethod === 'cash') {
    cashMode.value = true
    invoiceMode.value = false
  } else if (newMethod === 'invoice') {
    invoiceMode.value = true
    cashMode.value = false
  } else {
    cashMode.value = false
    invoiceMode.value = false
  }
}, { immediate: true })

watch([invoiceMode, cashMode], updatePaymentMode)

watch(() => companyBilling.formData.value, () => {
  if (invoiceMode.value) {
    updatePaymentMode()
  }
}, { deep: true })

// Watcher für selectedStudent
watch(() => props.selectedStudent, async (newStudent) => {
  if (newStudent?.id) {
    console.log('👤 PriceDisplay: Loading payment preferences for:', newStudent.first_name)
    await loadUserPaymentPreferences(newStudent.id)
  }
}, { immediate: true })

watch(() => companyBilling.currentAddress.value, (newAddress) => {
  billingAddressSaved.value = !!newAddress
  
  // Automatisch einklappen wenn eine Adresse geladen wurde
  if (newAddress) {
    isBillingSectionExpanded.value = false
  }
}, { immediate: true })

// Beim Wechsel zu Invoice-Mode erweitern (falls noch nicht gespeichert)
watch(() => invoiceMode.value, (isInvoice) => {
  if (isInvoice && !billingAddressSaved.value) {
    isBillingSectionExpanded.value = true
  }
})

// Optional: Watch für Edit-Mode um UI-Elemente zu steuern
watch(isEditMode, (newMode) => {
  if (!newMode) {
    // Beim Verlassen des Edit-Mode alle Dialoge schließen
    showDiscountEdit.value = false
    showAdminFeeInfo.value = false
  }
})

// Lifecycle
onMounted(async () => {
  // Lade gespeicherte Adressen beim Component-Mount
  if (props.currentUser?.id) {
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
  }
})
</script>