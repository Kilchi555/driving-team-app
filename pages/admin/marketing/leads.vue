<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white shadow-sm border-b sticky top-0 z-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600 shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </NuxtLink>
            <div class="min-w-0">
              <h1 class="text-lg sm:text-2xl font-bold text-gray-900 truncate">Leads</h1>
              <p class="text-xs sm:text-sm text-gray-500">{{ total.toLocaleString('de-CH') }} Kontakte</p>
            </div>
          </div>

          <!-- Resend Consent -->
          <div class="shrink-0 flex items-center gap-2">
            <button @click="resendConsentEmails" :disabled="resendingConsent"
              class="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
              title="Erinnerung an alle Kontakte mit ausstehendem Consent senden">
              <svg v-if="!resendingConsent" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span class="hidden sm:inline">{{ resendingConsent ? 'Sendet…' : 'Erinnerung senden' }}</span>
            </button>
            <span v-if="resendConsentResult" class="hidden sm:inline text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              {{ resendConsentResult }}
            </span>
          </div>

          <!-- Import Dropdown -->
          <div class="relative shrink-0" ref="importMenuRef">
            <button @click="importMenuOpen = !importMenuOpen"
              class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
              :style="{ background: primaryColor }">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="hidden sm:inline">Leads hinzufügen</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="importMenuOpen"
              class="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden">
              <div class="p-2 space-y-0.5">
                <button @click="() => { openManualAdd(); importMenuOpen = false }"
                  class="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition">
                  <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">Manuell hinzufügen</div>
                    <div class="text-xs text-gray-500">Einzelnen Lead direkt eingeben</div>
                  </div>
                </button>
                <NuxtLink to="/admin/marketing/import" @click="importMenuOpen = false"
                  class="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition block">
                  <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">CSV importieren</div>
                    <div class="text-xs text-gray-500">Excel-/CSV-Datei hochladen</div>
                  </div>
                </NuxtLink>
                <button @click="() => { openImportFromUsers(); importMenuOpen = false }"
                  class="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition">
                  <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">Aus bestehenden Schülern</div>
                    <div class="text-xs text-gray-500">Registrierte Schüler übernehmen</div>
                  </div>
                </button>
                <div class="border-t border-gray-100 my-1" />
                <button @click="() => { copyNewsletterLink(); importMenuOpen = false }"
                  class="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition">
                  <div class="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">Anmeldelink kopieren</div>
                    <div class="text-xs text-gray-500">QR-Code für Events / Website</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      <!-- Filters -->
      <div class="bg-white rounded-xl border p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3 sm:items-center">
        <input v-model="search" @keyup.enter="loadLeads" type="text" placeholder="Email, Name suchen…"
          class="tenant-focus w-full sm:flex-1 sm:min-w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
        <div class="flex gap-2 flex-wrap">
          <select v-model="filterStatus" @change="loadLeads"
            class="tenant-focus flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2">
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="pending_consent">Consent ausstehend</option>
            <option value="unsubscribed">Abgemeldet</option>
            <option value="bounced">Bounced</option>
            <option value="inactive">Inaktiv</option>
          </select>
          <select v-model="filterCategory" @change="loadLeads"
            class="tenant-focus flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2">
            <option value="">Alle Kategorien</option>
            <option v-for="cat in CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
          <button @click="loadLeads"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shrink-0">
            Suchen
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="bg-white rounded-xl border p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="leads.length === 0" class="bg-white rounded-xl border p-12 text-center text-gray-500">
        <svg class="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Keine Leads gefunden
      </div>

      <!-- Table + Cards -->
      <div v-else>

      <!-- Desktop Table -->
      <div class="bg-white rounded-xl border overflow-hidden hidden sm:block">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kategorien</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Quelle</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Datum</th>
                <th class="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="lead in leads" :key="lead.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{{ lead.email }}</td>
                <td class="px-4 py-3 text-gray-600">{{ [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—' }}</td>
                <td class="px-4 py-3">
                  <span :class="statusBadge(lead.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
                    {{ statusLabel(lead.status) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="code in lead.categories" :key="code"
                      class="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                      :style="{ background: categoryColor(code) }">{{ code }}</span>
                    <span v-if="!lead.categories?.length" class="text-gray-400">—</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ lead.source || '—' }}</td>
                <td class="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{{ formatDate(lead.created_at) }}</td>
                <td class="px-4 py-3">
                  <button @click="openEdit(lead)" class="text-gray-400 tenant-hover-primary transition-colors p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div v-if="totalPages > 1" class="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
          <span class="text-sm text-gray-500">{{ total.toLocaleString('de-CH') }} Leads</span>
          <div class="flex gap-1">
            <button v-for="p in visiblePages" :key="p" @click="goToPage(p)"
              :class="['px-3 py-1.5 text-sm rounded-lg', p === currentPage ? 'text-white' : 'text-gray-600 hover:bg-gray-100']"
              :style="p === currentPage ? { background: primaryColor } : {}">
              {{ p }}
            </button>
          </div>
          <button :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)"
            class="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40">
            Weiter →
          </button>
        </div>
      </div>

      <!-- Mobile Card List -->
      <div class="space-y-2 sm:hidden">
        <div v-for="lead in leads" :key="lead.id"
          class="bg-white rounded-xl border p-4 flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="font-medium text-gray-900 text-sm truncate">{{ lead.email }}</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '' }}</div>
            <div class="flex flex-wrap gap-1 mt-2">
              <span :class="statusBadge(lead.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                {{ statusLabel(lead.status) }}
              </span>
              <span v-for="code in lead.categories" :key="code"
                class="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                :style="{ background: categoryColor(code) }">{{ code }}</span>
            </div>
          </div>
          <button @click="openEdit(lead)" class="text-gray-400 tenant-hover-primary p-1 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
        <!-- Mobile Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between py-2">
          <button :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)"
            class="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 px-3 py-2">
            ← Zurück
          </button>
          <span class="text-sm text-gray-500">{{ currentPage }} / {{ totalPages }}</span>
          <button :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)"
            class="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 px-3 py-2">
            Weiter →
          </button>
        </div>
      </div>

      </div> <!-- end v-else Table + Cards -->
    </div>

    <!-- Toast -->
    <div v-if="newsletterLinkCopied"
      class="fixed bottom-6 right-4 sm:right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2">
      <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Anmeldelink kopiert!
    </div>

    <!-- ── Manual Add Modal ── -->
    <div v-if="showManualAdd" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div class="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div class="flex items-center justify-between p-5 border-b shrink-0">
          <h2 class="text-lg font-semibold text-gray-900">Lead manuell hinzufügen</h2>
          <button @click="showManualAdd = false" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="overflow-y-auto p-5 space-y-4 flex-1">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
              <input v-model="manualForm.first_name" type="text" placeholder="Max"
                class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
              <input v-model="manualForm.last_name" type="text" placeholder="Muster"
                class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Email <span class="text-red-500">*</span></label>
            <input v-model="manualForm.email" type="email" placeholder="max@beispiel.ch"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
            <input v-model="manualForm.phone" type="tel" placeholder="+41 79 123 45 67"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
          </div>
          <!-- Category Multi-Select -->
          <MarketingCategoryDropdown
            v-model="manualForm.categories"
            :categories="CATEGORIES"
            @create="openCreateCategory"
          />
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Notiz</label>
            <textarea v-model="manualForm.notes" rows="2" placeholder="z.B. Anruf erhalten, interessiert an Motorrad"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2" />
          </div>
          <div v-if="manualError" class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{{ manualError }}</div>
          <div class="p-3 rounded-xl text-xs border"
            :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33`, color: primaryColor }">
            <strong>📧 Consent-Email wird automatisch gesendet.</strong> Der Lead erhält sofort eine Einladung zum Anmelden.
          </div>
        </div>
        <div class="p-5 border-t flex gap-3 shrink-0">
          <button @click="showManualAdd = false"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveManualLead" :disabled="manualSaving || !manualForm.email"
            class="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
            :style="{ background: primaryColor }">
            {{ manualSaving ? 'Speichere…' : 'Hinzufügen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Import from Users Modal ── -->
    <div v-if="showImportFromUsers" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div class="flex items-center justify-between p-5 border-b shrink-0">
          <h2 class="text-lg font-semibold text-gray-900">Aus bestehenden Schülern</h2>
          <button @click="showImportFromUsers = false" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="overflow-y-auto p-5 flex-1 space-y-4">
          <!-- Result -->
          <div v-if="importUsersResult" class="space-y-4">
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-green-50 border border-green-200 rounded-xl p-3">
                <div class="text-2xl font-black text-green-700">{{ importUsersResult.imported.toLocaleString('de-CH') }}</div>
                <div class="text-xs text-green-600 font-medium mt-0.5">Importiert</div>
              </div>
              <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div class="text-2xl font-black text-gray-600">{{ importUsersResult.skipped.toLocaleString('de-CH') }}</div>
                <div class="text-xs text-gray-500 font-medium mt-0.5">Vorhanden</div>
              </div>
              <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div class="text-2xl font-black text-blue-700">{{ importUsersResult.total.toLocaleString('de-CH') }}</div>
                <div class="text-xs text-blue-600 font-medium mt-0.5">Total</div>
              </div>
            </div>
          <p class="text-sm text-gray-600 text-center leading-relaxed">
            Alle importierten Leads erhalten automatisch eine <strong>Consent-Einladung per Email</strong>.<br/>
            Sobald sie klicken, werden sie aktiviert.
          </p>
          </div>
          <!-- Form -->
          <template v-else>
            <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800 leading-relaxed">
              Alle Schüler mit Email werden ohne Duplikate als Leads übernommen. Jeder erhält automatisch eine <strong>Consent-Einladung per Email</strong>.
            </div>
            <MarketingCategoryDropdown
              v-model="importUsersCategories"
              :categories="CATEGORIES"
              label="Kategorien zuweisen (optional)"
              placeholder="Keine Kategorie"
              @create="openCreateCategory"
            />
            <p class="text-xs text-gray-400">Leer lassen = kein Kategorie-Filter bei Kampagnen</p>
          </template>
        </div>
        <div class="p-5 border-t shrink-0">
          <button v-if="importUsersResult" @click="showImportFromUsers = false"
            class="w-full px-4 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90"
            :style="{ background: primaryColor }">
            Fertig
          </button>
          <div v-else class="flex gap-3">
            <button @click="showImportFromUsers = false"
              class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
              Abbrechen
            </button>
            <button @click="runImportFromUsers" :disabled="importUsersLoading"
              class="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition">
              {{ importUsersLoading ? 'Importiere…' : 'Import starten' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Edit Modal ── -->
    <div v-if="editLead" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div class="flex items-center justify-between p-5 border-b shrink-0">
          <h2 class="text-lg font-semibold text-gray-900">Lead bearbeiten</h2>
          <button @click="editLead = null" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="overflow-y-auto p-5 space-y-4 flex-1">
          <div class="text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2 font-mono truncate">{{ editLead.email }}</div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
              <input v-model="editForm.first_name" type="text"
                class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
              <input v-model="editForm.last_name" type="text"
                class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select v-model="editForm.status"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2">
              <option value="pending_consent">Consent ausstehend</option>
              <option value="active">Aktiv</option>
              <option value="unsubscribed">Abgemeldet</option>
              <option value="bounced">Bounced</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>
          <MarketingCategoryDropdown
            v-model="editForm.categories"
            :categories="CATEGORIES"
            @create="openCreateCategory"
          />
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Notiz</label>
            <textarea v-model="editForm.notes" rows="2"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2" />
          </div>
        </div>
        <div class="p-5 border-t flex gap-3 shrink-0">
          <button @click="editLead = null"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveLead" :disabled="saving"
            class="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            :style="{ background: primaryColor }">
            {{ saving ? 'Speichere…' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Create Category Modal ── -->
    <div v-if="showCreateCategory" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div class="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div class="flex items-center justify-between p-5 border-b">
          <h2 class="text-base font-semibold text-gray-900">Neue Kategorie erstellen</h2>
          <button @click="showCreateCategory = false" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input v-model="newCategoryForm.name" type="text" placeholder="z.B. Interessent"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Code <span class="text-gray-400">(Kürzel)</span></label>
            <input v-model="newCategoryForm.code" type="text" placeholder="z.B. INT"
              class="tenant-focus w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-2">Farbe</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="color in COLOR_PRESETS" :key="color" type="button"
                @click="newCategoryForm.color = color"
                class="w-8 h-8 rounded-full border-2 transition"
                :class="newCategoryForm.color === color ? 'border-gray-900 scale-110' : 'border-transparent'"
                :style="{ background: color }" />
            </div>
          </div>
          <div v-if="newCategoryError" class="text-sm text-red-600 bg-red-50 rounded-xl p-3">{{ newCategoryError }}</div>
        </div>
        <div class="p-5 border-t flex gap-3">
          <button @click="showCreateCategory = false"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveNewCategory" :disabled="newCategorySaving || !newCategoryForm.name || !newCategoryForm.code"
            class="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
            :style="{ background: primaryColor }">
            {{ newCategorySaving ? 'Erstelle…' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Leads - Marketing - Admin' })

const authStore = useAuthStore()
const { primaryColor } = useTenantBranding()

const COLOR_PRESETS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
  '#ec4899', '#84cc16', '#64748b', '#1e293b',
]

// ── Categories ───────────────────────────────────────────────
const CATEGORIES = ref<{ value: string; label: string; color: string; source: string }[]>([])

async function loadCategories() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  const res = await $fetch<any>('/api/marketing/lead-categories', { query: { tenantId } }).catch(() => null)
  if (res?.categories) {
    CATEGORIES.value = res.categories.map((c: any) => ({
      value: c.code,
      label: c.name,
      color: c.color,
      source: c.source,
    }))
  }
}

function categoryColor(code: string) {
  return CATEGORIES.value.find(c => c.value === code)?.color || '#94a3b8'
}

// ── Create Category Modal ────────────────────────────────────
const showCreateCategory = ref(false)
const newCategoryForm = reactive({ name: '', code: '', color: '#6366f1' })
const newCategorySaving = ref(false)
const newCategoryError = ref('')

function openCreateCategory() {
  Object.assign(newCategoryForm, { name: '', code: '', color: '#6366f1' })
  newCategoryError.value = ''
  showCreateCategory.value = true
}

async function saveNewCategory() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId || !newCategoryForm.name || !newCategoryForm.code) return
  newCategorySaving.value = true
  newCategoryError.value = ''
  try {
    await $fetch('/api/marketing/lead-categories', {
      method: 'POST',
      body: { tenantId, ...newCategoryForm },
    })
    showCreateCategory.value = false
    await loadCategories()
  } catch (e: any) {
    newCategoryError.value = e?.data?.statusMessage || 'Fehler beim Speichern'
  } finally {
    newCategorySaving.value = false
  }
}

// ── Leads ────────────────────────────────────────────────────
const leads = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 50
const search = ref('')
const filterStatus = ref('all')
const filterCategory = ref('')

const totalPages = computed(() => Math.ceil(total.value / pageSize))
const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function loadLeads() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  loading.value = true
  try {
    const res = await $fetch<any>('/api/marketing/leads', {
      query: {
        tenantId,
        status: filterStatus.value,
        category: filterCategory.value || undefined,
        search: search.value || undefined,
        page: currentPage.value,
        limit: pageSize,
      },
    })
    leads.value = res.leads
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function goToPage(p: number) {
  currentPage.value = p
  loadLeads()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    active: 'Aktiv',
    pending_consent: 'Consent ausstehend',
    unsubscribed: 'Abgemeldet',
    bounced: 'Bounced',
    inactive: 'Inaktiv',
  }
  return map[status] ?? status
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending_consent: 'bg-amber-100 text-amber-700',
    unsubscribed: 'bg-gray-100 text-gray-600',
    bounced: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

// ── Edit ─────────────────────────────────────────────────────
const editLead = ref<any>(null)
const editForm = reactive({ status: '', first_name: '', last_name: '', categories: [] as string[], notes: '' })
const saving = ref(false)

function openEdit(lead: any) {
  editLead.value = lead
  editForm.status = lead.status
  editForm.first_name = lead.first_name || ''
  editForm.last_name = lead.last_name || ''
  editForm.categories = [...(lead.categories || [])]
  editForm.notes = lead.notes || ''
}

async function saveLead() {
  if (!editLead.value) return
  saving.value = true
  try {
    await $fetch(`/api/marketing/leads/${editLead.value.id}`, {
      method: 'PATCH',
      body: { tenantId: authStore.userProfile?.tenant_id, ...editForm },
    })
    editLead.value = null
    await loadLeads()
  } finally {
    saving.value = false
  }
}

// ── Import Menu ──────────────────────────────────────────────
const importMenuOpen = ref(false)
const importMenuRef = ref<HTMLElement | null>(null)

function handleClickOutside(e: MouseEvent) {
  if (importMenuRef.value && !importMenuRef.value.contains(e.target as Node)) {
    importMenuOpen.value = false
  }
}

// ── Manual Add ───────────────────────────────────────────────
const showManualAdd = ref(false)
const manualForm = reactive({ first_name: '', last_name: '', email: '', phone: '', categories: [] as string[], notes: '' })
const manualSaving = ref(false)
const manualError = ref('')

function openManualAdd() {
  Object.assign(manualForm, { first_name: '', last_name: '', email: '', phone: '', categories: [], notes: '' })
  manualError.value = ''
  showManualAdd.value = true
}

async function saveManualLead() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId || !manualForm.email) return
  manualSaving.value = true
  manualError.value = ''
  try {
    await $fetch('/api/marketing/leads', { method: 'POST', body: { tenantId, ...manualForm } })
    showManualAdd.value = false
    await loadLeads()
  } catch (e: any) {
    manualError.value = e?.data?.statusMessage || 'Fehler beim Speichern'
  } finally {
    manualSaving.value = false
  }
}

// ── Import from Users ────────────────────────────────────────
const showImportFromUsers = ref(false)
const importUsersCategories = ref<string[]>([])
const importUsersLoading = ref(false)
const importUsersResult = ref<{ imported: number; skipped: number; total: number } | null>(null)

function openImportFromUsers() {
  importUsersCategories.value = []
  importUsersResult.value = null
  showImportFromUsers.value = true
}

async function runImportFromUsers() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  importUsersLoading.value = true
  importUsersResult.value = null
  try {
    const res = await $fetch<any>('/api/marketing/import-from-users', {
      method: 'POST',
      body: { tenantId, categories: importUsersCategories.value },
    })
    importUsersResult.value = res
    await loadLeads()
  } finally {
    importUsersLoading.value = false
  }
}

// ── Newsletter Link ──────────────────────────────────────────
const newsletterLinkCopied = ref(false)

// ── Resend Consent ───────────────────────────────────────────
const resendingConsent = ref(false)
const resendConsentResult = ref<string | null>(null)

async function resendConsentEmails() {
  if (!confirm('Erinnerungs-Email an alle Kontakte mit ausstehendem Consent senden?')) return
  resendingConsent.value = true
  resendConsentResult.value = null
  try {
    const res = await $fetch<any>('/api/marketing/resend-consent', { method: 'POST' })
    resendConsentResult.value = res.message
    setTimeout(() => { resendConsentResult.value = null }, 5000)
  } catch (e: any) {
    alert('Fehler: ' + (e?.data?.statusMessage || e.message))
  } finally {
    resendingConsent.value = false
  }
}

async function copyNewsletterLink() {
  const tenantId = authStore.userProfile?.tenant_id
  const res = await $fetch<any>('/api/tenants/branding', { query: { id: tenantId } }).catch(() => null)
  const slug = res?.data?.slug || tenantId
  const url = `https://app.simy.ch/newsletter/${slug}`
  await navigator.clipboard.writeText(url).catch(() => prompt('Link kopieren:', url))
  newsletterLinkCopied.value = true
  setTimeout(() => { newsletterLinkCopied.value = false }, 3000)
}

onMounted(() => {
  loadLeads()
  loadCategories()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
.tenant-hover-primary:hover {
  color: var(--color-primary, #1E40AF);
}
</style>
