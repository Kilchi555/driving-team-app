<template>
  <div class="space-y-6">

    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-xl font-bold text-gray-900">Fahrzeuge</h2>
      <div class="flex gap-2">
        <button
          v-if="activeTab === 'vehicles'"
          @click="openVehicleModal()"
          class="px-4 py-2 rounded-xl text-white text-sm font-medium"
          :style="{ background: primaryColor }"
        >
          + Fahrzeug hinzufügen
        </button>
        <a
          v-if="activeTab === 'partners'"
          :href="portalUrl"
          target="_blank"
          class="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Portal öffnen ↗
        </a>
      </div>
    </div>

    <!-- Tab navigation -->
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2 rounded-full text-sm font-medium transition-colors"
        :class="activeTab === tab.key
          ? 'text-white'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
        :style="activeTab === tab.key ? { background: primaryColor } : {}"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ─── VEHICLES ─── -->
    <div v-if="activeTab === 'vehicles'" class="space-y-4">

      <!-- Portal link banner -->
      <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-blue-900 mb-1">Buchungsportal-Link</p>
          <p class="text-xs text-blue-700 mb-2">Teile diesen stabilen Link mit externen Fahrlehrern:</p>
          <div class="flex items-center gap-2 flex-wrap">
            <code class="text-xs bg-white border border-blue-200 px-2 py-1 rounded font-mono break-all">{{ portalUrl }}</code>
            <button @click="copyPortalUrl" class="text-xs text-blue-600 hover:text-blue-800 underline flex-shrink-0">
              {{ copiedPortalUrl ? 'Kopiert!' : 'Kopieren' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLoadingVehicles" class="text-center py-12 text-gray-400">Fahrzeuge werden geladen…</div>
      <div v-else-if="adminVehicles.length === 0" class="text-center py-12 text-gray-400">Noch keine Fahrzeuge erfasst.</div>

      <div v-for="v in adminVehicles" :key="v.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
        :class="{ 'opacity-60': !v.is_active }"
      >
        <!-- Top row: dot + name + badges + edit button -->
        <div class="flex items-start gap-3">
          <span class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
            :class="{
              'bg-green-400': v.rental_access === 'public',
              'bg-blue-400': v.rental_access === 'invite_only',
              'bg-gray-300': v.rental_access === 'private',
            }"
          ></span>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold text-gray-900 leading-snug">{{ v.marke }} {{ v.modell }}</p>
                <div class="flex items-center gap-1.5 flex-wrap mt-1">
                  <span v-if="v.farbe" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{{ v.farbe }}</span>
                  <span v-if="v.getriebe" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{{ v.getriebe }}</span>
                  <span v-if="!v.is_active" class="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">Inaktiv</span>
                </div>
              </div>
              <button @click="openVehicleModal(v)"
                class="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors whitespace-nowrap">
                Bearbeiten
              </button>
            </div>
            <p v-if="v.location_address" class="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <span>📍</span><span class="truncate">{{ v.location_address }}</span>
            </p>
          </div>
        </div>

        <!-- Bottom row: price tags + access selector -->
        <div class="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-50">
          <div class="flex items-center gap-1.5 flex-wrap">
            <template v-if="enabledTiers(v).length > 0">
              <span v-for="tier in enabledTiers(v)" :key="tier.type"
                class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {{ tier.label }}
              </span>
            </template>
            <span v-else class="text-sm font-bold" :style="{ color: primaryColor }">CHF {{ v.hourly_rate_chf }} / h</span>
          </div>
          <select
            :value="v.rental_access"
            @change="quickSetAccess(v, ($event.target as HTMLSelectElement).value)"
            class="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
            :style="{ color: v.rental_access === 'public' ? '#16a34a' : v.rental_access === 'invite_only' ? '#2563eb' : '#6b7280' }"
          >
            <option value="private">🔒 Intern</option>
            <option value="invite_only">🔑 Nur Partner</option>
            <option value="public">🌐 Öffentlich</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ─── CALENDAR ─── -->
    <div v-if="activeTab === 'calendar'">
      <VehicleCalendar />
    </div>

    <!-- ─── PARTNERS ─── -->
    <div v-if="activeTab === 'partners'" class="space-y-3">
      <div class="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-sm text-blue-800 flex items-center justify-between gap-3 flex-wrap">
        <span>
          Alle Personen die sich mit einem Simy-Login registriert und mindestens eine Buchung vorgenommen haben.
          Neue Nutzer registrieren sich selbst auf dem <a :href="portalUrl" target="_blank" class="underline">Buchungsportal</a>.
        </span>
        <button @click="showInviteModal = true"
          class="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
          Einladung senden
        </button>
      </div>

      <!-- Invite modal -->
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showInviteModal = false">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Einladung senden</h3>
            <button @click="showInviteModal = false" class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-500">Sendet dem externen Fahrlehrer den Buchungsportal-Link per E-Mail. Ein Simy-Konto wird benötigt — falls noch keines vorhanden ist, kann es direkt auf dem Portal erstellt werden.</p>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">E-Mail-Adresse *</label>
            <input v-model="inviteEmail" type="email" placeholder="fahrlehrer@beispiel.ch"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Vorname (optional)</label>
            <input v-model="inviteFirstName" type="text" placeholder="z.B. Max"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button @click="sendInvite" :disabled="!inviteEmail || isSendingInvite"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
              {{ isSendingInvite ? 'Wird gesendet…' : 'E-Mail senden' }}
            </button>
            <span v-if="inviteSent" class="text-sm text-green-600 font-medium">✓ Gesendet</span>
            <span v-if="inviteError" class="text-sm text-red-600">{{ inviteError }}</span>
          </div>
        </div>
      </div>

      <div v-if="isLoadingPartners" class="text-center py-12 text-gray-400">Wird geladen…</div>
      <div v-else-if="partners.length === 0" class="text-center py-12 text-gray-400">Noch keine Buchungen durch externe Nutzer vorhanden.</div>

      <div v-for="p in partners" :key="p.id" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-gray-900">{{ p.name }}</p>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              >{{ p.status === 'active' ? 'Aktiv' : 'Ausstehend' }}</span>
              <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ p.role }}</span>
            </div>
            <p class="text-sm text-gray-600 mt-0.5">{{ p.email }}{{ p.phone ? ` · ${p.phone}` : '' }}</p>
            <div class="flex gap-3 mt-2 text-xs text-gray-500">
              <span>{{ p.rentals.total }} Buchung{{ p.rentals.total !== 1 ? 'en' : '' }}</span>
              <span v-if="p.rentals.pending > 0" class="text-yellow-600">{{ p.rentals.pending }} offen</span>
              <span v-if="p.rentals.confirmed > 0" class="text-green-600">{{ p.rentals.confirmed }} bestätigt</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2 flex-shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Zahlung:</span>
              <select
                :value="p.rental_payment_method ?? ''"
                @change="setUserPaymentMethod(p, ($event.target as HTMLSelectElement).value)"
                class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1"
                :class="p.rental_payment_method ? 'text-blue-700 border-blue-300' : 'text-gray-400'"
              >
                <option value="">Standard (Tenant-Default)</option>
                <option value="invoice">Monatsrechnung</option>
                <option value="cash">Barzahlung</option>
                <option value="online">Online (Wallee)</option>
              </select>
            </div>
            <a :href="`/admin/users?id=${p.id}`" class="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Profil öffnen</a>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── BOOKINGS ─── -->
    <div v-if="activeTab === 'bookings'" class="space-y-4">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Monat</label>
          <input v-model="filterMonth" type="month" @change="loadBookings"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Status</label>
          <select v-model="filterStatus" @change="loadBookings"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">Alle</option>
            <option value="pending">Anfrage</option>
            <option value="confirmed">Bestätigt</option>
            <option value="cancelled">Storniert</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Zahlung</label>
          <select v-model="filterPayment" @change="loadBookings"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">Alle</option>
            <option value="unpaid">Offen</option>
            <option value="invoice_sent">Rechnung versendet</option>
            <option value="paid_cash">Bar bezahlt</option>
            <option value="paid_online">Online bezahlt</option>
          </select>
        </div>
      </div>

      <div v-if="bookingsSummary" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="card in summaryCards" :key="card.label" class="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
          <p class="text-xs text-gray-500">{{ card.label }}</p>
          <p class="text-lg font-bold text-gray-900 mt-1">{{ card.value }}</p>
        </div>
      </div>

      <div v-if="isLoadingBookings" class="text-center py-12 text-gray-400">Wird geladen…</div>
      <div v-else-if="bookings.length === 0" class="text-center py-12 text-gray-400">Keine Buchungen gefunden.</div>

      <div v-for="b in bookings" :key="b.id" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <p class="font-semibold text-gray-900">{{ b.vehicle }}</p>
              <span v-if="b.license_plate" class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{{ b.license_plate }}</span>
            </div>
            <p class="text-sm text-gray-600">
              <span class="font-medium">{{ b.partner_name }}</span>
              <span v-if="b.partner_company" class="text-gray-400"> ({{ b.partner_company }})</span>
            </p>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ formatDate(b.start_time) }} · {{ formatTime(b.start_time) }} – {{ formatTime(b.end_time) }}
              · {{ parseFloat(b.duration_hours).toFixed(2) }}h
            </p>
            <p class="text-sm font-semibold mt-1" :style="{ color: primaryColor }">CHF {{ b.total_chf }}</p>
            <p v-if="b.partner_notes" class="text-xs text-gray-400 mt-1 italic">{{ b.partner_notes }}</p>
          </div>
          <div class="flex flex-col items-end gap-2 flex-shrink-0">
            <div class="flex gap-1.5 flex-wrap justify-end">
              <span class="text-xs px-2 py-1 rounded-full font-medium"
                :class="{
                  'bg-yellow-100 text-yellow-700': b.status === 'pending',
                  'bg-green-100 text-green-700': b.status === 'confirmed',
                  'bg-red-100 text-red-600': b.status === 'cancelled',
                }"
              >{{ statusLabel(b.status) }}</span>
              <span class="text-xs px-2 py-1 rounded-full font-medium"
                :class="{
                  'bg-gray-100 text-gray-600': b.payment_status === 'unpaid',
                  'bg-blue-100 text-blue-700': b.payment_status === 'invoice_sent',
                  'bg-green-100 text-green-700': ['paid_cash','paid_online'].includes(b.payment_status),
                }"
              >{{ paymentLabel(b.payment_status) }}</span>
            </div>
            <div class="flex gap-1.5 flex-wrap justify-end">
              <template v-if="b.status === 'pending'">
                <button @click="confirmBooking(b)" :disabled="isActing === b.id"
                  class="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">✓ Bestätigen</button>
                <button @click="cancelBooking(b)" :disabled="isActing === b.id"
                  class="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">✗ Ablehnen</button>
              </template>
              <template v-if="b.status === 'confirmed' && b.payment_status === 'unpaid'">
                <button @click="markCash(b)" class="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Bar bezahlt</button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── BILLING ─── -->
    <div v-if="activeTab === 'billing'" class="space-y-4">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-gray-900 mb-4">Monatsrechnung generieren</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mieter</label>
            <select v-model="invoicePartnerId" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option value="">Mieter wählen…</option>
              <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Monat</label>
            <input v-model="invoiceMonth" type="month"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div class="flex items-end">
            <button @click="generateInvoice" :disabled="!invoicePartnerId || !invoiceMonth || isGeneratingInvoice"
              class="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              :style="{ background: primaryColor }">
              {{ isGeneratingInvoice ? 'Wird erstellt…' : 'Rechnung erstellen' }}
            </button>
          </div>
        </div>
        <p v-if="invoiceError" class="text-sm text-red-700 bg-red-50 rounded-lg p-3">{{ invoiceError }}</p>
        <div v-if="invoiceResult" class="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
          <p class="font-semibold text-green-900">✓ {{ invoiceResult.message }}</p>
          <p class="text-green-600 text-xs mt-1">{{ invoiceResult.rental_count }} Buchung(en) · CHF {{ invoiceResult.total_chf }}</p>
          <a :href="`/admin/invoices?id=${invoiceResult.invoice_id}`" target="_blank" class="inline-block mt-2 text-xs underline text-green-700">Rechnung öffnen →</a>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-gray-900 mb-4">Barzahlung verbuchen</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mieter</label>
            <select v-model="cashPartnerId" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option value="">Mieter wählen…</option>
              <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <button @click="recordCashAll" :disabled="!cashPartnerId || isRecordingCash"
              class="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              :style="{ background: '#16a34a' }">
              {{ isRecordingCash ? 'Wird verbucht…' : 'Alle offenen als bar bezahlt' }}
            </button>
          </div>
        </div>
        <p v-if="cashSuccess" class="text-sm text-green-700 bg-green-50 rounded-lg p-3 mt-3">{{ cashSuccess }}</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-gray-900 mb-1">Standard-Zahlungsmethoden</h3>
        <p class="text-xs text-gray-500 mb-4">Wird angewendet wenn kein Per-User-Override gesetzt ist.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kunden (Schüler)</label>
            <select v-model="defaultPaymentClient" @change="saveRentalSettings"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option value="invoice">Monatsrechnung</option>
              <option value="cash">Barzahlung</option>
              <option value="online">Online (Wallee)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fahrlehrer / Staff</label>
            <select v-model="defaultPaymentStaff" @change="saveRentalSettings"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option value="invoice">Monatsrechnung</option>
              <option value="cash">Barzahlung</option>
              <option value="online">Online (Wallee)</option>
            </select>
          </div>
        </div>
        <p v-if="settingsSaved" class="text-xs text-green-600 mt-2">✓ Gespeichert</p>
      </div>
    </div>

    <!-- ─── VEHICLE MODAL ─── -->
    <div v-if="showVehicleModal" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" @click.self="showVehicleModal = false">
      <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg sm:m-4 p-5 sm:p-6 max-h-[92dvh] overflow-y-auto">
        <!-- Modal header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-gray-900">{{ editingVehicle ? 'Fahrzeug bearbeiten' : 'Fahrzeug hinzufügen' }}</h3>
          <button type="button" @click="showVehicleModal = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form @submit.prevent="saveVehicle" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-xs font-medium text-gray-700 mb-1">Marke *</label><input v-model="vehicleForm.marke" type="text" required class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Kawasaki" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">Modell *</label><input v-model="vehicleForm.modell" type="text" required class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Eliminator" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">Farbe</label><input v-model="vehicleForm.farbe" type="text" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Schwarz" /></div>
            <div><label class="block text-xs font-medium text-gray-700 mb-1">Getriebe</label><input v-model="vehicleForm.getriebe" type="text" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Automat" /></div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Standort-Adresse</label>
              <input v-model="vehicleForm.location_address" type="text" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="z.B. Hauptstrasse 12, 8001 Zürich" />
            </div>
          </div>
          <div class="border-t pt-4">
            <p class="text-xs font-semibold text-gray-700 mb-0.5">Preismodelle</p>
            <p class="text-xs text-gray-400 mb-3">Aktiviere die gewünschten Tarife. Mehrere können gleichzeitig angeboten werden.</p>
            <div class="space-y-2">
              <div v-for="tier in vehicleForm.pricing_tiers" :key="tier.type"
                class="rounded-xl border transition-colors"
                :class="tier.enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'">
                <div class="flex items-center gap-3 p-3">
                  <input type="checkbox" v-model="tier.enabled" class="flex-shrink-0 w-4 h-4 rounded" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ tier.label }}</p>
                    <p class="text-xs text-gray-400">{{ tier.description }}</p>
                  </div>
                  <div v-if="tier.enabled" class="flex items-center gap-1.5 flex-shrink-0">
                    <span class="text-xs text-gray-500">CHF</span>
                    <input v-model="tier.rate_chf" type="number" min="0" step="0.50"
                      class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="0.00" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t pt-4">
            <p class="text-xs font-semibold text-gray-700 mb-2">Sichtbarkeit im Buchungsportal</p>
            <div class="space-y-2">
              <label v-for="opt in vehicleAccessOptions" :key="opt.value"
                class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                :class="vehicleForm.rental_access === opt.value ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
              >
                <input type="radio" v-model="vehicleForm.rental_access" :value="opt.value" class="mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ opt.label }}</p>
                  <p class="text-xs text-gray-500">{{ opt.description }}</p>
                </div>
              </label>
            </div>
          </div>
          <!-- Buchungsbedingung -->
          <div class="border-t pt-4">
            <p class="text-xs font-semibold text-gray-700 mb-1">Buchungsbedingung</p>
            <p class="text-xs text-gray-500 mb-3">Mehrere Bedingungen können kombiniert werden (beide müssen erfüllt sein).</p>
            <div class="space-y-3">
              <!-- Fahrlektion -->
              <div class="rounded-xl border transition-colors"
                :class="vehicleForm.rental_requires_lesson ? 'border-orange-400 bg-orange-50' : 'border-gray-200'">
                <label class="flex items-start gap-3 p-3 cursor-pointer">
                  <input type="checkbox" v-model="vehicleForm.rental_requires_lesson" class="mt-0.5 flex-shrink-0" />
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">Nur mit Fahrlektion</p>
                    <p class="text-xs text-gray-500">Nutzer muss am selben Tag eine bestätigte Fahrlektion haben.</p>
                  </div>
                </label>
                <div v-if="vehicleForm.rental_requires_lesson" class="px-3 pb-3">
                  <p class="text-xs font-medium text-gray-600 mb-1.5">Erlaubte Kategorien <span class="text-gray-400">(leer = alle)</span></p>
                  <div class="flex flex-wrap gap-1.5">
                    <label v-for="cat in lessonCategoryOptions" :key="cat.id"
                      class="px-2.5 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-colors"
                      :class="vehicleForm.rental_lesson_category_codes.includes(cat.code) ? 'bg-orange-200 border-orange-400 text-orange-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'"
                      :title="cat.name"
                    >
                      <input type="checkbox" :value="cat.code" v-model="vehicleForm.rental_lesson_category_codes" class="hidden" />
                      {{ cat.code }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Kurseinschreibung -->
              <div class="rounded-xl border transition-colors"
                :class="vehicleForm.rental_requires_course ? 'border-orange-400 bg-orange-50' : 'border-gray-200'">
                <label class="flex items-start gap-3 p-3 cursor-pointer">
                  <input type="checkbox" v-model="vehicleForm.rental_requires_course" class="mt-0.5 flex-shrink-0" />
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">Nur mit Kurseinschreibung</p>
                    <p class="text-xs text-gray-500">Nutzer muss in einem aktiven Kurs eingeschrieben sein.</p>
                  </div>
                </label>
                <div v-if="vehicleForm.rental_requires_course" class="px-3 pb-3">
                  <p class="text-xs font-medium text-gray-600 mb-1.5">Erlaubte Kurskategorien <span class="text-gray-400">(leer = alle)</span></p>
                  <div class="flex flex-wrap gap-1.5">
                    <label v-for="cat in courseCategoryOptions" :key="cat.id"
                      class="px-2.5 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-colors"
                      :class="vehicleForm.rental_course_category_codes.includes(cat.code) ? 'bg-orange-200 border-orange-400 text-orange-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'"
                      :title="cat.name"
                    >
                      <input type="checkbox" :value="cat.code" v-model="vehicleForm.rental_course_category_codes" class="hidden" />
                      {{ cat.code }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-if="vehicleError" class="text-sm text-red-700 bg-red-50 rounded-xl p-3">{{ vehicleError }}</p>
          <div class="flex items-center justify-between pt-2 gap-3">
            <button v-if="editingVehicle" type="button" @click="deleteVehicle(editingVehicle)" class="text-sm text-red-500 hover:text-red-700 underline py-2">Deaktivieren</button>
            <div class="flex gap-2 ml-auto">
              <button type="button" @click="showVehicleModal = false" class="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Abbrechen</button>
              <button type="submit" :disabled="isSavingVehicle" class="px-5 py-2.5 text-sm text-white rounded-xl disabled:opacity-50 font-medium" :style="{ background: primaryColor }">
                {{ isSavingVehicle ? 'Wird gespeichert…' : editingVehicle ? 'Speichern' : 'Hinzufügen' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import VehicleCalendar from '~/components/admin/VehicleCalendar.vue'

const { currentTenantBranding } = useTenantBranding()
const primaryColor = computed(() => currentTenantBranding.value?.colors?.primary || '#2563eb')

const tabs = [
  { key: 'vehicles', label: 'Fahrzeuge' },
  { key: 'calendar', label: 'Kalender' },
  { key: 'partners', label: 'Partner' },
  { key: 'bookings', label: 'Buchungen' },
  { key: 'billing', label: 'Abrechnung' },
]
const activeTab = ref('calendar')

// ── Vehicles ────────────────────────────────────────────────────────────────
const adminVehicles = ref<any[]>([])
const vehicleLocations = ref<any[]>([])
const isLoadingVehicles = ref(false)
const showVehicleModal = ref(false)
const editingVehicle = ref<any>(null)
const isSavingVehicle = ref(false)
const vehicleError = ref('')
// Default pricing tier definitions (used when creating/editing a vehicle)
const TIER_DEFS = [
  { type: 'hourly',   label: 'Stundenweise',  unit: '/ Std.',       description: 'Mieter wählt Start und Ende frei — Preis pro Stunde.' },
  { type: 'lesson',   label: 'Pro Lektion',   unit: 'pauschal',     description: 'Fixer Einmalpreis für die Lektionsdauer.' },
  { type: 'half_day', label: 'Halbtages',     unit: 'bis 4 Std.',   description: 'Fixpreis für Morgen (07–13h) oder Nachmittag (13–19h).' },
  { type: 'full_day', label: 'Ganztages',     unit: 'bis 12 Std.',  description: 'Fixpreis für den ganzen Tag (07–19h).' },
]

function makePricingTiers(existing: any[] = []): any[] {
  return TIER_DEFS.map(def => {
    const found = existing.find((t: any) => t.type === def.type)
    return {
      ...def,
      enabled: found?.enabled ?? (def.type === 'hourly'),
      rate_rappen: found?.rate_rappen ?? 0,
      rate_chf: found ? (found.rate_rappen / 100).toFixed(2) : '0.00',
    }
  })
}

function enabledTiers(v: any): { type: string; label: string; rate_chf: string }[] {
  const tiers: any[] = v.pricing_tiers ?? []
  return tiers
    .filter((t: any) => t.enabled)
    .map((t: any) => ({
      type: t.type,
      label: t.type === 'hourly'
        ? `CHF ${(t.rate_rappen / 100).toFixed(2)}/h`
        : t.type === 'lesson'
          ? `CHF ${(t.rate_rappen / 100).toFixed(2)} Lektion`
          : t.type === 'half_day'
            ? `CHF ${(t.rate_rappen / 100).toFixed(2)} halbtags`
            : `CHF ${(t.rate_rappen / 100).toFixed(2)} ganztags`,
      rate_chf: (t.rate_rappen / 100).toFixed(2),
    }))
}

const vehicleForm = ref({ marke: '', modell: '', farbe: '', getriebe: '', aufbau: '', location_id: '', location_address: '', hourly_rate_chf: '0', pricing_tiers: makePricingTiers() as any[], rental_access: 'private', rental_requires_lesson: false, rental_requires_course: false, rental_lesson_category_codes: [] as string[], rental_course_category_codes: [] as string[] })
const vehicleAccessOptions = [
  { value: 'public', label: 'Öffentlich', description: 'Jeder mit dem Buchungsportal-Link kann dieses Fahrzeug sehen und direkt buchen.' },
  { value: 'invite_only', label: 'Nur eingeladene Partner', description: 'Nur Partner, die eingeloggt sind, sehen und buchen dieses Fahrzeug.' },
  { value: 'private', label: 'Intern', description: 'Nicht auf dem Buchungsportal sichtbar — nur für internen Schulbetrieb.' },
]
// ── Dynamic categories ────────────────────────────────────────────────────────
// Lesson categories (driving school categories table, with main/sub structure)
const allLessonCategories = ref<{ id: number; code: string; name: string; parent_category_id: number | null }[]>([])
const lessonCategoryOptions = computed(() => {
  const mains = allLessonCategories.value.filter(c => !c.parent_category_id)
  const subs = allLessonCategories.value.filter(c => !!c.parent_category_id)
  const mainIdsWithSubs = new Set(subs.map(s => s.parent_category_id))
  // Show subs for categories that have them, plus mains that have no subs at all
  return [
    ...mains.filter(m => !mainIdsWithSubs.has(m.id)),
    ...subs,
  ]
})

// Course categories (course_categories table, flat)
const courseCategoryOptions = ref<{ id: string; code: string; name: string }[]>([])

async function loadCategories() {
  const silentHeaders = { 'X-Silent-Error': 'true' }
  try {
    const [lessonRes, courseRes]: any[] = await Promise.all([
      $fetch('/api/admin/categories', { headers: silentHeaders }).catch(() => ({ categories: [] })),
      $fetch('/api/admin/course-categories', { headers: silentHeaders }).catch(() => ({ categories: [] })),
    ])
    allLessonCategories.value = (lessonRes.categories || []).filter((c: any) => c.is_active !== false)
    courseCategoryOptions.value = (courseRes.categories || []).filter((c: any) => c.is_active !== false)
  } catch { /* silent */ }
}

const copiedPortalUrl = ref(false)
const rentalPortalSlug = ref('')
const portalUrl = computed(() => {
  const slug = rentalPortalSlug.value || currentTenantBranding.value?.slug || ''
  return typeof window !== 'undefined' ? `${window.location.origin}/partners/${slug}` : `/partners/${slug}`
})
function copyPortalUrl() {
  navigator.clipboard.writeText(portalUrl.value)
  copiedPortalUrl.value = true
  setTimeout(() => { copiedPortalUrl.value = false }, 2000)
}

async function loadVehicles() {
  isLoadingVehicles.value = true
  try {
    const data = await $fetch('/api/admin/rental-vehicles')
    adminVehicles.value = (data as any).vehicles || []
    vehicleLocations.value = (data as any).locations || []
  } catch { /* silent */ } finally { isLoadingVehicles.value = false }
}

function openVehicleModal(v?: any) {
  editingVehicle.value = v ?? null
  vehicleError.value = ''
  vehicleForm.value = v
    ? { marke: v.marke ?? '', modell: v.modell ?? '', farbe: v.farbe ?? '', getriebe: v.getriebe ?? '', aufbau: v.aufbau ?? '', location_id: v.location_id ?? '', location_address: v.location_address ?? '', hourly_rate_chf: v.hourly_rate_chf ?? '0', pricing_tiers: makePricingTiers(v.pricing_tiers ?? []), rental_access: v.rental_access ?? 'private', rental_requires_lesson: v.rental_requires_lesson ?? false, rental_requires_course: v.rental_requires_course ?? false, rental_lesson_category_codes: v.rental_lesson_category_codes ?? [], rental_course_category_codes: v.rental_course_category_codes ?? [] }
    : { marke: '', modell: '', farbe: '', getriebe: '', aufbau: '', location_id: '', location_address: '', hourly_rate_chf: '0', pricing_tiers: makePricingTiers(), rental_access: 'private', rental_requires_lesson: false, rental_requires_course: false, rental_lesson_category_codes: [], rental_course_category_codes: [] }
  showVehicleModal.value = true
}

async function saveVehicle() {
  isSavingVehicle.value = true
  vehicleError.value = ''
  try {
    // Convert pricing tiers: rate_chf → rate_rappen, drop UI-only fields
    const serializedTiers = vehicleForm.value.pricing_tiers.map(t => ({
      type: t.type,
      enabled: t.enabled,
      rate_rappen: Math.round((parseFloat(t.rate_chf) || 0) * 100),
    }))
    // Derive hourly_rate_chf from the hourly tier for backward-compat
    const hourlyTier = serializedTiers.find(t => t.type === 'hourly')
    const hourlyChf = hourlyTier?.enabled ? (hourlyTier.rate_rappen / 100).toFixed(2) : vehicleForm.value.hourly_rate_chf

    await $fetch('/api/admin/rental-vehicles', { method: 'POST', body: { action: editingVehicle.value ? 'update' : 'create', id: editingVehicle.value?.id, ...vehicleForm.value, hourly_rate_chf: hourlyChf, pricing_tiers: serializedTiers } })
    showVehicleModal.value = false
    await loadVehicles()
  } catch (err: any) {
    vehicleError.value = err?.data?.statusMessage || 'Fehler beim Speichern.'
  } finally { isSavingVehicle.value = false }
}

async function deleteVehicle(v: any) {
  if (!confirm(`Fahrzeug "${v.marke} ${v.modell}" wirklich deaktivieren?`)) return
  await $fetch('/api/admin/rental-vehicles', { method: 'POST', body: { action: 'delete', id: v.id } })
  showVehicleModal.value = false
  await loadVehicles()
}

async function quickSetAccess(v: any, newAccess: string) {
  v.rental_access = newAccess
  await $fetch('/api/admin/rental-vehicles', { method: 'POST', body: { action: 'update', id: v.id, rental_access: newAccess } })
}

// ── Partners ────────────────────────────────────────────────────────────────
const partners = ref<any[]>([])
const isLoadingPartners = ref(false)
const showInviteModal = ref(false)
const inviteEmail = ref('')
const inviteFirstName = ref('')
const isSendingInvite = ref(false)
const inviteSent = ref(false)
const inviteError = ref('')

async function sendInvite() {
  if (!inviteEmail.value) return
  isSendingInvite.value = true; inviteSent.value = false; inviteError.value = ''
  try {
    await $fetch('/api/admin/rental-invite', { method: 'POST', body: { email: inviteEmail.value, firstName: inviteFirstName.value || undefined } })
    inviteSent.value = true; inviteEmail.value = ''; inviteFirstName.value = ''
    setTimeout(() => { showInviteModal.value = false; inviteSent.value = false }, 2000)
  } catch (e: any) { inviteError.value = e?.data?.message || 'Fehler beim Senden' }
  finally { isSendingInvite.value = false }
}

const loadPartners = async () => {
  isLoadingPartners.value = true
  try { const res: any = await $fetch('/api/admin/rental-partners'); partners.value = res.renters }
  catch { /* silent */ } finally { isLoadingPartners.value = false }
}

// ── Bookings ────────────────────────────────────────────────────────────────
const bookings = ref<any[]>([])
const bookingsSummary = ref<any>(null)
const isLoadingBookings = ref(false)
const filterMonth = ref(new Date().toISOString().slice(0, 7))
const filterStatus = ref('')
const filterPayment = ref('')
const isActing = ref<string | null>(null)

const summaryCards = computed(() => {
  if (!bookingsSummary.value) return []
  const s = bookingsSummary.value
  return [
    { label: 'Buchungen', value: s.total_rentals },
    { label: 'Bestätigt', value: s.confirmed },
    { label: 'Anfragen', value: s.pending },
    { label: 'Offen (CHF)', value: (s.unpaid_rappen / 100).toFixed(2) },
  ]
})

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
const statusLabel = (s: string) => ({ pending: 'Anfrage', confirmed: 'Bestätigt', cancelled: 'Storniert' }[s] ?? s)
const paymentLabel = (s: string) => ({ unpaid: 'Offen', invoice_sent: 'Rechnung', paid_cash: 'Bar', paid_online: 'Online' }[s] ?? s)

const loadBookings = async () => {
  isLoadingBookings.value = true
  try {
    const params = new URLSearchParams()
    if (filterMonth.value) params.append('month', filterMonth.value)
    if (filterStatus.value) params.append('status', filterStatus.value)
    if (filterPayment.value) params.append('payment_status', filterPayment.value)
    const res: any = await $fetch(`/api/admin/rental-bookings?${params}`)
    bookings.value = res.rentals; bookingsSummary.value = res.summary
  } catch { /* silent */ } finally { isLoadingBookings.value = false }
}

const confirmBooking = async (b: any) => {
  isActing.value = b.id
  try { await $fetch('/api/admin/rental-bookings', { method: 'POST', body: { action: 'confirm', rental_id: b.id } }); await loadBookings() }
  catch { /* silent */ } finally { isActing.value = null }
}

const cancelBooking = async (b: any) => {
  if (!confirm('Buchung ablehnen?')) return
  isActing.value = b.id
  try { await $fetch('/api/admin/rental-bookings', { method: 'POST', body: { action: 'cancel', rental_id: b.id } }); await loadBookings() }
  catch { /* silent */ } finally { isActing.value = null }
}

const markCash = async (b: any) => {
  try { await $fetch('/api/admin/rental-bookings', { method: 'POST', body: { action: 'set_payment', rental_id: b.id, payment_status: 'paid_cash', payment_method: 'cash' } }); await loadBookings() }
  catch { /* silent */ }
}

// ── Billing ──────────────────────────────────────────────────────────────────
const invoicePartnerId = ref('')
const invoiceMonth = ref(new Date().toISOString().slice(0, 7))
const isGeneratingInvoice = ref(false)
const invoiceError = ref('')
const invoiceResult = ref<any>(null)
const cashPartnerId = ref('')
const isRecordingCash = ref(false)
const cashSuccess = ref('')
const defaultPaymentClient = ref('invoice')
const defaultPaymentStaff = ref('invoice')
const settingsSaved = ref(false)

async function loadRentalSettings() {
  try {
    const res: any = await $fetch('/api/admin/rental-settings')
    defaultPaymentClient.value = res.settings?.default_payment_method_client ?? 'invoice'
    defaultPaymentStaff.value = res.settings?.default_payment_method_staff ?? 'invoice'
    rentalPortalSlug.value = res.rental_portal_slug || ''
  } catch { /* silent */ }
}

async function saveRentalSettings() {
  try {
    await $fetch('/api/admin/rental-settings', { method: 'POST', body: { vehicle_rental_settings: { default_payment_method_client: defaultPaymentClient.value, default_payment_method_staff: defaultPaymentStaff.value } } })
    settingsSaved.value = true; setTimeout(() => { settingsSaved.value = false }, 2000)
  } catch { /* silent */ }
}

async function setUserPaymentMethod(p: any, value: string) {
  p.rental_payment_method = value || null
  await $fetch('/api/admin/rental-invoice', { method: 'POST', body: { action: 'update_payment', user_id: p.id, rental_payment_method: value || null } })
}

const generateInvoice = async () => {
  invoiceError.value = ''; invoiceResult.value = null; isGeneratingInvoice.value = true
  try { const res: any = await $fetch('/api/admin/rental-invoice', { method: 'POST', body: { action: 'generate_invoice', renter_user_id: invoicePartnerId.value, month: invoiceMonth.value } }); invoiceResult.value = res }
  catch (err: any) { invoiceError.value = err.data?.statusMessage || 'Fehler beim Erstellen der Rechnung.' }
  finally { isGeneratingInvoice.value = false }
}

const recordCashAll = async () => {
  if (!confirm('Alle offenen Buchungen dieses Mieters als bar bezahlt verbuchen?')) return
  isRecordingCash.value = true; cashSuccess.value = ''
  try { await $fetch('/api/admin/rental-invoice', { method: 'POST', body: { action: 'record_cash', renter_user_id: cashPartnerId.value } }); cashSuccess.value = 'Barzahlung verbucht.'; await loadBookings() }
  catch { /* silent */ } finally { isRecordingCash.value = false }
}

onMounted(async () => {
  await Promise.all([loadVehicles(), loadPartners(), loadBookings(), loadRentalSettings(), loadCategories()])
})
</script>
