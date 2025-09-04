<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto" @vue:mounted="onModalOpen">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal"/>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
        <!-- Header -->
        <div class="sticky top-0 z-10 bg-white px-4 py-3 border-b border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">
              {{ isEditing ? 'Rechnung bearbeiten' : 'Rechnungsdetails' }}
            </h3>
            <div class="flex items-center space-x-2">
              <!-- Action Buttons -->
              <div v-if="!isEditing" class="flex items-center space-x-2">
                <button
                  class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  @click="startEditing"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Bearbeiten
                </button>
                <button
                  class="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  @click="emit('send', invoice?.id || '')"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Versenden
                </button>
                <button
                  class="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  @click="emit('markAsPaid', invoice?.id || '')"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Als bezahlt markieren
                </button>
                <button
                  class="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  @click="emit('cancel', invoice?.id || '')"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stornieren
                </button>
              </div>
              
              <!-- Edit Mode Buttons -->
              <div v-else class="flex items-center space-x-2">
                <button
                  :disabled="isSaving"
                  class="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  @click="saveChanges"
                >
                  <svg v-if="isSaving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ isSaving ? 'Speichern...' : 'Speichern' }}
                </button>
                <button
                  :disabled="isSaving"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  @click="cancelEditing"
                >
                  Abbrechen
                </button>
              </div>
              
              <!-- Close Button -->
              <button
                class="text-gray-400 hover:text-gray-600 focus:outline-none ml-2"
                @click="closeModal"
              >
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="bg-white px-4 py-5 sm:p-6">
          <!-- Loading state -->
          <div v-if="!invoice" class="text-center py-8">
            <div class="text-gray-500">Lade Rechnungsdetails...</div>
          </div>
          
          <!-- Invoice content -->
          <div v-else>
            <!-- Invoice Header -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <!-- Linke Spalte: Rechnungsinformationen -->
              <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-2">Rechnungsinformationen</h4>
                <div class="space-y-2">
                  <div>
                    <span class="text-sm font-medium text-gray-500">Rechnungsnummer:</span>
                    <span class="ml-2 text-sm text-gray-900">{{ invoice.invoice_number }}</span>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Status:</span>
                    <InvoiceStatusBadge :status="invoice.status" class="ml-2" />
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Zahlungsstatus:</span>
                    <PaymentStatusBadge :status="invoice.payment_status" class="ml-2" />
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Erstellt am:</span>
                    <span class="ml-2 text-sm text-gray-900">{{ formatDate(invoice.created_at) }}</span>
                  </div>
                  <div v-if="invoice.due_date">
                    <span class="text-sm font-medium text-gray-500">Fälligkeitsdatum:</span>
                    <span class="ml-2 text-sm text-gray-900" :class="{ 'text-red-600': isOverdue(invoice.due_date) }">
                      {{ formatDate(invoice.due_date) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Mittlere Spalte: Kundeninformationen -->
              <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-2">Kundeninformationen</h4>
                <div class="grid grid-cols-2 gap-4">
                  <!-- Linke Spalte der Kundeninformationen -->
                  <div class="space-y-3">
                    <!-- Vorname -->
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Vorname</label>
                      <span class="text-sm text-gray-900">{{ customerData?.first_name || 'Nicht verfügbar' }}</span>
                    </div>
                    
                    <!-- E-Mail -->
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">E-Mail</label>
                      <span class="text-sm text-gray-900">{{ customerData?.email || 'Nicht verfügbar' }}</span>
                    </div>
                    
                    <!-- Straße -->
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Strasse</label>
                      <span class="text-sm text-gray-900">{{ customerData?.street || 'Keine Straße' }} {{ customerData?.street_nr || '' }}</span>
                    </div>
                  </div>
                  
                  <!-- Rechte Spalte der Kundeninformationen -->
                  <div class="space-y-3">
                    <!-- Nachname -->
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Nachname</label>
                      <span class="text-sm text-gray-900">{{ customerData?.last_name || 'Nicht verfügbar' }}</span>
                    </div>
                    
                    <!-- Telefon -->
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Telefon</label>
                      <span class="text-sm text-gray-900">{{ customerData?.phone || 'Nicht verfügbar' }}</span>
                    </div>
                    
                    <!-- PLZ und Ort -->
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">PLZ und Ort</label>
                      <span class="text-sm text-gray-900">{{ customerData?.zip || 'Keine PLZ' }} {{ customerData?.city || 'Kein Ort' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Rechte Spalte: Rechnungsadresse & Bearbeitbare Felder -->
              <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-2">Rechnungsadresse</h4>
                <div class="space-y-4">
                  <!-- Bearbeitbare Felder in 2 Spalten -->
                  <div class="grid grid-cols-2 gap-4">
                    <!-- Linke Spalte der rechten Spalte -->
                    <div class="space-y-3">
                      <!-- Company Billing E-Mail -->
                      <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">Rechnungs-E-Mail</label>
                        <input
                          v-if="isEditing"
                          v-model="safeEditedInvoice.billing_email"
                          type="email"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          :placeholder="invoice.billing_email || invoice.customer_email || 'rechnung@firma.ch'"
                        >
                        <span v-else-if="invoice.billing_email" class="text-sm text-gray-900">{{ invoice.billing_email }}</span>
                        <span v-else class="text-sm text-gray-400">{{ invoice.customer_email || 'Nicht angegeben' }}</span>
                      </div>
                      
                      <!-- Firma -->
                      <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">Firma (optional)</label>
                        <input
                          v-if="isEditing"
                          v-model="safeEditedInvoice.billing_company_name"
                          type="text"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          :placeholder="invoice.billing_company_name || 'Firmenname'"
                        >
                        <span v-else-if="invoice.billing_company_name" class="text-sm text-gray-900">{{ invoice.billing_company_name }}</span>
                        <span v-else class="text-sm text-gray-400">Nicht angegeben</span>
                      </div>
                      
                      <!-- Kontaktperson -->
                      <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">Kontaktperson (optional)</label>
                        <input
                          v-if="isEditing"
                          v-model="safeEditedInvoice.billing_contact_person"
                          type="text"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          :placeholder="invoice.billing_contact_person || 'Kontaktperson'"
                        >
                        <span v-else-if="invoice.billing_contact_person" class="text-sm text-gray-900">{{ invoice.billing_contact_person }}</span>
                        <span v-else class="text-sm text-gray-400">Nicht angegeben</span>
                      </div>
                    </div>
                    
                                        <!-- Rechte Spalte der rechten Spalte -->
                    <div class="space-y-3">
                      <!-- Straße und Hausnummer in einer Zeile -->
                      <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">Strasse, Nr.</label>
                        <div v-if="isEditing" class="flex space-x-2">
                          <input
                            v-model="safeEditedInvoice.billing_street"
                            type="text"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="invoice.billing_street || 'Straße'"
                          >
                          <input
                            v-model="safeEditedInvoice.billing_street_number"
                            type="text"
                            class="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="invoice.billing_street_number || 'Nr.'"
                          >
                        </div>
                        <span v-else-if="invoice.billing_street || invoice.billing_street_number" class="text-sm text-gray-900">
                          {{ invoice.billing_street || '' }} {{ invoice.billing_street_number || '' }}
                        </span>
                        <span v-else class="text-sm text-gray-400">Nicht angegeben</span>
                      </div>
                      
                      <!-- PLZ -->
                      <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">PLZ</label>
                        <input
                          v-if="isEditing"
                          v-model="safeEditedInvoice.billing_zip"
                          type="text"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          :placeholder="invoice.billing_zip || 'PLZ'"
                        >
                        <span v-else-if="invoice.billing_zip" class="text-sm text-gray-900">{{ invoice.billing_zip }}</span>
                        <span v-else class="text-sm text-gray-400">Nicht angegeben</span>
                      </div>

                      <!-- Ort und Land in einer Zeile -->
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-500 mb-1">Ort</label>
                          <input
                            v-if="isEditing"
                            v-model="safeEditedInvoice.billing_city"
                            type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="invoice.billing_city || 'Ort'"
                          >
                          <span v-else-if="invoice.billing_city" class="text-sm text-gray-900">{{ invoice.billing_city }}</span>
                          <span v-else class="text-sm text-gray-400">Nicht angegeben</span>
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-500 mb-1">Land</label>
                          <input
                            v-if="isEditing"
                            v-model="safeEditedInvoice.billing_country"
                            type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="invoice.billing_country || 'Land'"
                          >
                          <span v-else-if="invoice.billing_country" class="text-sm text-gray-900">{{ invoice.billing_country }}</span>
                          <span v-else class="text-sm text-gray-400">Nicht angegeben</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Beautiful Invoice Overview -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <!-- Loading indicator für detaillierte Daten -->
              <div v-if="isLoadingDetails" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div class="flex items-center text-blue-700">
                  <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span class="text-sm">Lade detaillierte Preisaufschlüsselung...</span>
                </div>
              </div>
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-base font-medium text-gray-900">Rechnungsübersicht</h4>
                <span class="text-lg font-semibold text-green-600">
                  Gesamtbetrag: {{ fallbackPayment ? formatCurrency(fallbackPayment.total_amount_rappen) : formatCurrency(invoice.total_amount_rappen) }}
                </span>
              </div>
              
              <!-- Verrechnete Lektionen mit detaillierter Preisaufschlüsselung -->
              <div class="max-h-64 overflow-y-auto">
                <div class="space-y-2">
                                    <!-- Appointments -->
                  <div v-if="fallbackPayment">
                    
                    <!-- Lektion aus payments Tabelle -->
                    <div class="bg-white border border-gray-200 rounded-md p-3">
                      <div class="space-y-2">
                        <!-- Haupttermin -->
                        <div class="flex items-center justify-between">
                          <div class="flex-1">
                                       <!-- Event Type Name, Kategorie und Type -->
                            <div class="text-md font-semibold text-gray-600 mb-1">
                              <h4>{{ appointmentEventTypeName || 'Termin' }} Kategorie {{ appointmentType }}</h4>
                            </div>
                            
                            <div class="text-xs text-gray-500">
                              {{ appointmentStartTime ? appointmentStartTime.substring(0, 10).split('-').reverse().join('.') : 'Kein Datum' }} - {{ appointmentStartTime ? appointmentStartTime.substring(11, 16) : 'Keine Zeit' }}
                              <span class="mx-2">•</span>
                              {{ parsedMetadata?.duration_minutes || 195 }} Minuten
                            </div>
                          </div>
                          <div class="text-right flex items-center space-x-2">
                            <div class="text-sm font-semibold text-green-600">
                              {{ formatCurrency(fallbackPayment.total_amount_rappen) }}
                            </div>
                          </div>
                        </div>
                        
                        <!-- Detaillierte Preisaufschlüsselung -->
                        <div class="border-t border-gray-100 pt-2 space-y-1">
                          <!-- Lektion-Preis -->
                          <div class="flex justify-between text-xs">
                            <span class="text-gray-600">Lektion:</span>
                            <span class="text-gray-800">
                              {{ formatCurrency(fallbackPayment.lesson_price_rappen) }}
                            </span>
                          </div>
                          
                          <!-- Admin-Fee (falls vorhanden) -->
                          <div
                            v-if="fallbackPayment.admin_fee_rappen > 0" 
                            class="flex justify-between text-xs">
                            <span class="text-gray-600">Admin-Pauschale:</span>
                            <span class="text-gray-800">{{ formatCurrency(fallbackPayment.admin_fee_rappen) }}</span>
                          </div>
                          
                          <!-- Produkte (falls vorhanden) -->
                          <div
                            v-if="fallbackPayment.products_price_rappen > 0" 
                            class="space-y-1">
                            <!-- Produkte direkt aus payments Tabelle -->
                            <div class="flex justify-between text-xs">
                              <span class="text-gray-500">Produkte:</span>
                              <span class="text-gray-600">{{ formatCurrency(fallbackPayment.products_price_rappen) }}</span>
                            </div>
                          </div>
                          
                          <!-- Rabatte (falls vorhanden) -->
                          <div
                            v-if="fallbackPayment.discount_amount_rappen > 0" 
                            class="flex justify-between text-xs text-green-600">
                            <span>Rabatt:</span>
                            <span>- {{ formatCurrency(fallbackPayment.discount_amount_rappen) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  

                  
                  <!-- Products -->
                  <div v-if="invoice.productSales && invoice.productSales.length > 0">
                    <div v-for="sale in invoice.productSales" :key="sale.id">
                      <div
                        v-for="item in sale.product_sale_items" 
                        :key="item.id" 
                        class="bg-white border border-gray-200 rounded-md p-3">
                        <div class="space-y-2">
                          <!-- Hauptprodukt -->
                          <div class="flex items-center justify-between">
                            <div class="flex-1">
                              <h5 class="text-sm font-medium text-gray-900">
                                {{ item.product?.name || 'Unbekanntes Produkt' }}
                              </h5>
                              <div class="text-xs text-gray-500">
                                Produkt - {{ item.quantity }}x
                              </div>
                            </div>
                            <div class="text-right flex items-center space-x-2">
                              <div class="text-sm font-semibold text-green-600">
                                {{ formatCurrency(item.total_price_rappen) }}
                              </div>
                            </div>
                          </div>
                          
                          <!-- Detaillierte Preisaufschlüsselung -->
                          <div class="border-t border-gray-100 pt-2 space-y-1">
                            <!-- Produkt-Preis -->
                            <div class="flex justify-between text-xs">
                              <span class="text-gray-600">{{ item.product?.name || 'Produkt' }}:</span>
                              <span class="text-gray-800">{{ formatCurrency(item.unit_price_rappen) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="invoice.notes || invoice.internal_notes || isEditing" class="mb-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-2">Notizen</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <!-- Nachricht an den Kunden -->
                <div v-if="isEditing || invoice.notes" class="mb-3">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nachricht an den Kunden</label>
                  <textarea
                    v-if="isEditing"
                    v-model="safeEditedInvoice.notes"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sehr geehrte Damen und Herren, anbei erhalten Sie die Rechnung für die durchgeführten Fahrstunden..."
                  />
                  <p v-else-if="invoice.notes" class="text-sm text-gray-700">{{ invoice.notes }}</p>
                  <p v-else class="text-sm text-gray-400">Keine Nachricht vorhanden</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch, computed } from 'vue'
import InvoiceStatusBadge from './InvoiceStatusBadge.vue'
import PaymentStatusBadge from './PaymentStatusBadge.vue'
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
  billing_company_name?: string
  billing_contact_person?: string
  billing_street?: string
  billing_street_number?: string
  billing_zip?: string
  billing_city?: string
  billing_country?: string
  billing_email?: string
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

// Reactive state für detaillierte Zahlungsdaten
const isLoadingDetails = ref(false)
  const fallbackPayment = ref<any | null>(null)
  const appointmentStartTime = ref<string | null>(null)
  const appointmentEventTypeCode = ref<string | null>(null)
  const appointmentType = ref<string | null>(null)
  const appointmentEventTypeName = ref<string | null>(null)
  const customerData = ref<any | null>(null)

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
}>()

const closeModal = () => {
  emit('close')
}

// Lade detaillierte Daten wenn das Modal geöffnet wird
const loadDetailedData = async () => {
  // Initialisiere editedInvoice wenn das Modal geöffnet wird
  if (props.invoice) {
    editedInvoice.value = { ...props.invoice };
  }
  
  if (!props.invoice || !props.show) {
    return;
  }
  
  isLoadingDetails.value = true;
  
  try {
    // Lade immer das neueste Payment per user_id, da die appointment_id möglicherweise nicht übereinstimmt
    if (props.invoice.user_id) {
      try {
        const { getSupabase } = await import('~/utils/supabase');
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', props.invoice.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (!error && data) {
          fallbackPayment.value = data;
          
                     // Lade die start_time aus der appointments Tabelle
           if (data.appointment_id) {
             const { data: appointmentData, error: appointmentError } = await supabase
               .from('appointments')
               .select(`
                 start_time, 
                 event_type_code, 
                 type
               `)
               .eq('id', data.appointment_id)
               .single();
             
             if (!appointmentError && appointmentData) {
               appointmentStartTime.value = appointmentData.start_time;
               appointmentEventTypeCode.value = appointmentData.event_type_code;
               appointmentType.value = appointmentData.type;
               
               // Lade den event_type_name separat aus der event_types Tabelle
               if (appointmentData.event_type_code) {
                 const { data: eventTypeData, error: eventTypeError } = await supabase
                   .from('event_types')
                   .select('name')
                   .eq('code', appointmentData.event_type_code)
                   .single();
                 
                 if (!eventTypeError && eventTypeData) {
                   appointmentEventTypeName.value = eventTypeData.name;
                 }
               }
             }
             
             // Lade die Kundendaten aus der users Tabelle
             if (data.user_id) {
               console.log('🔍 Loading user data for user_id:', data.user_id);
               
               const { data: userData, error: userError } = await supabase
                 .from('users')
                 .select('first_name, last_name, email, phone, street, street_nr, zip, city')
                 .eq('id', data.user_id)
                 .single();
               
               if (!userError && userData) {
                 console.log('✅ User data loaded:', userData);
                 customerData.value = userData;
               } else if (userError) {
                 console.warn('❌ Could not load user data:', userError);
               }
             }
           }
        }
      } catch (e) {
        console.warn('Could not load payment data');
      }
    }


    
  } catch (error) {
    console.error('Error loading detailed data:', error);
  } finally {
    isLoadingDetails.value = false;
  }
};

// Watch für show prop um Daten zu laden
watch(() => props.show, (newShow) => {
  if (newShow && props.invoice) {
    // Kurze Verzögerung um sicherzustellen, dass das Modal vollständig geladen ist
    setTimeout(() => {
      loadDetailedData();
      
      // Wenn startInEditMode true ist, starte direkt im Bearbeitungsmodus
      if (props.startInEditMode) {
        setTimeout(() => {
          startEditing();
        }, 300); // Verzögerung um sicherzustellen, dass alle Daten geladen sind
      }
      
    }, 100);
  }
});

// Watch für invoice prop um Daten zu laden wenn sich die Rechnung ändert
watch(() => props.invoice, (newInvoice) => {
  if (newInvoice && props.show) {
    // Kurze Verzögerung um sicherzustellen, dass das Modal vollständig geladen ist
    setTimeout(() => {
      loadDetailedData();
    }, 100);
  }
});

// Zusätzlich: Lade Daten direkt wenn das Modal geöffnet wird
const onModalOpen = () => {
  if (props.invoice) {
    loadDetailedData();
  }
};

const editInvoice = async () => {
  try {
    if (!props.invoice?.id) return
    
    // Status auf 'draft' setzen falls nicht bereits draft
    if (props.invoice.status !== 'draft') {
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', props.invoice.id)
      
      if (error) throw error
    }
    
    // Event emittieren für Parent-Komponente
    emit('edit', props.invoice.id)
    
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Rechnung:', error)
  }
}

const sendInvoice = async () => {
  try {
    if (!props.invoice?.id) return
    
    // Status auf 'sent' setzen
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', props.invoice.id)
    
    if (error) throw error
    
    // Event emittieren für Parent-Komponente
    emit('send', props.invoice.id)
    
  } catch (error) {
    console.error('Fehler beim Versenden der Rechnung:', error)
  }
}

const markAsPaid = async () => {
  try {
    if (!props.invoice?.id) return
    
    // Payment-Status auf 'paid' setzen
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    const { error } = await supabase
      .from('invoices')
      .update({ 
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', props.invoice.id)
    
    if (error) throw error
    
    // Event emittieren für Parent-Komponente
    emit('markAsPaid', props.invoice.id)
    
  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error)
  }
}

const cancelInvoice = async () => {
  try {
    if (!props.invoice?.id) return
    
    // Status auf 'cancelled' setzen
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', props.invoice.id)
    
    if (error) throw error
    
    // Event emittieren für Parent-Komponente
    emit('cancel', props.invoice.id)
    
  } catch (error) {
    console.error('Fehler beim Stornieren der Rechnung:', error)
  }
}

const formatCurrency = (rappen: number): string => {
  if (rappen === 0) return 'CHF 0.-'
  const chf = rappen / 100
  return `CHF ${chf.toFixed(2).replace('.00', '.-')}`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
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

// Neue Funktion: Lade detaillierte Zahlungsdaten aus der payments Tabelle
const loadPaymentDetails = async (appointmentId: string) => {
  if (!appointmentId) return null;
  
  try {
    const { getSupabase } = await import('~/utils/supabase');
    const supabase = getSupabase();
    
    // Lade Zahlungsdaten aus der payments Tabelle
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        id,
        lesson_price_rappen,
        admin_fee_rappen,
        products_price_rappen,
        discount_amount_rappen,
        total_amount_rappen,
        description,
        metadata
      `)
      .eq('appointment_id', appointmentId)
      .single();
    
    if (error) {
      // Falls keine Zahlung per appointment_id gefunden wird, versuche es per user_id
      if (props.invoice?.user_id) {
        const { data: fallbackPayment, error: fallbackError } = await supabase
          .from('payments')
          .select(`
            id,
            lesson_price_rappen,
            admin_fee_rappen,
            products_price_rappen,
            discount_amount_rappen,
            total_amount_rappen,
            description,
            metadata
          `)
          .eq('user_id', props.invoice.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!fallbackError && fallbackPayment) {
          return fallbackPayment;
        }
      }
      console.warn('Fehler beim Laden der Zahlungsdaten:', error);
      return null;
    }
    
    return payment;
  } catch (error) {
    console.error('Fehler beim Laden der Zahlungsdaten:', error);
    return null;
  }
};



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

const saveChanges = async () => {
  if (!editedInvoice.value || !props.invoice) return;
  
  isSaving.value = true;
  
  try {
    
    const { getSupabase } = await import('~/utils/supabase');
    const supabase = getSupabase();
    
    // Berechne den neuen Gesamtbetrag basierend auf den geänderten Daten
    let newTotalAmount = props.invoice.subtotal_rappen;
    
    // Addiere Produktpreise
    if (safeEditedInvoice.value.items) {
      const productsTotal = safeEditedInvoice.value.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price_rappen);
      }, 0);
      newTotalAmount += productsTotal;
    }
    
    // Subtrahiere Rabatte
    if (safeEditedInvoice.value.discount_amount_rappen) {
      newTotalAmount -= safeEditedInvoice.value.discount_amount_rappen;
    }
    
    // Aktualisiere die Rechnung in der payments Tabelle
    const { error } = await supabase
      .from('payments')
      .update({
        billing_company_name: editedInvoice.value.billing_company_name,
        billing_contact_person: editedInvoice.value.billing_contact_person,
        billing_street: editedInvoice.value.billing_street,
        billing_street_number: editedInvoice.value.billing_street_number,
        billing_zip: editedInvoice.value.billing_zip,
        billing_city: editedInvoice.value.billing_city,
        billing_country: editedInvoice.value.billing_country,
        billing_email: editedInvoice.value.billing_email,
        notes: editedInvoice.value.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', fallbackPayment.value?.id || props.invoice.id);
    
    if (error) throw error;
    
    // Aktualisiere die lokalen Daten nach dem Speichern
    if (fallbackPayment.value) {
      Object.assign(fallbackPayment.value, {
        billing_company_name: editedInvoice.value.billing_company_name,
        billing_contact_person: editedInvoice.value.billing_contact_person,
        billing_street: editedInvoice.value.billing_street,
        billing_street_number: editedInvoice.value.billing_street_number,
        billing_zip: editedInvoice.value.billing_zip,
        billing_city: editedInvoice.value.billing_city,
        billing_country: editedInvoice.value.billing_country,
        billing_email: editedInvoice.value.billing_email,
        notes: editedInvoice.value.notes
      });
    }
    
    // Beende den Bearbeitungsmodus
    isEditing.value = false;
    
    // Zeige Erfolgsmeldung
    console.log('✅ Rechnungsdaten erfolgreich gespeichert');
    
  } catch (error) {
    console.error('❌ Error saving invoice changes:', error);
    // Hier könnte ein Toast oder eine Fehlermeldung angezeigt werden
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
