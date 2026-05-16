<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </NuxtLink>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Leads</h1>
              <p class="text-sm text-gray-500">{{ total.toLocaleString('de-CH') }} Kontakte</p>
            </div>
          </div>
          <!-- Import Dropdown -->
          <div class="relative" ref="importMenuRef">
            <button
              @click="importMenuOpen = !importMenuOpen"
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Leads hinzufügen
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="importMenuOpen" class="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden">
              <div class="p-2 space-y-0.5">
                <button @click="openManualAdd; importMenuOpen = false"
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

                <button @click="openImportFromUsers; importMenuOpen = false"
                  class="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition">
                  <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">Aus bestehenden Schülern</div>
                    <div class="text-xs text-gray-500">Schüler aus dem System übernehmen</div>
                  </div>
                </button>

                <div class="border-t border-gray-100 my-1" />

                <button @click="copyNewsletterLink; importMenuOpen = false"
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

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

      <!-- Filters -->
      <div class="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center">
        <input
          v-model="search"
          @keyup.enter="loadLeads"
          type="text"
          placeholder="Email, Name suchen..."
          class="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select v-model="filterStatus" @change="loadLeads" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="pending_consent">Consent ausstehend</option>
          <option value="unsubscribed">Abgemeldet</option>
          <option value="bounced">Bounced</option>
          <option value="inactive">Inaktiv</option>
        </select>
        <select v-model="filterCategory" @change="loadLeads" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Alle Kategorien</option>
          <option v-for="cat in CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
        <button @click="loadLeads" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Suchen
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border overflow-hidden">
        <div v-if="loading" class="p-12 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <div v-else-if="leads.length === 0" class="p-12 text-center text-gray-500">
          <svg class="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Keine Leads gefunden
        </div>

        <table v-else class="min-w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorien</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quelle</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importiert</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="lead in leads" :key="lead.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ lead.email }}</td>
              <td class="px-4 py-3 text-gray-600">{{ [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—' }}</td>
              <td class="px-4 py-3">
                <span :class="statusBadge(lead.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ statusLabel(lead.status) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="cat in lead.categories"
                    :key="cat"
                    class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                  >{{ cat }}</span>
                  <span v-if="!lead.categories?.length" class="text-gray-400">—</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ lead.source || '—' }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(lead.created_at) }}</td>
              <td class="px-4 py-3">
                <button
                  @click="openEdit(lead)"
                  class="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
          <span class="text-sm text-gray-500">{{ total.toLocaleString('de-CH') }} Leads</span>
          <div class="flex gap-1">
            <button
              v-for="p in visiblePages"
              :key="p"
              @click="goToPage(p)"
              :class="[
                'px-3 py-1.5 text-sm rounded-lg',
                p === currentPage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              ]"
            >{{ p }}</button>
          </div>
          <button
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
            class="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            Weiter →
          </button>
        </div>
      </div>
    </div>

    <!-- Newsletter link copied toast -->
    <div v-if="newsletterLinkCopied" class="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2 animate-fade-in">
      <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Anmeldelink kopiert!
    </div>

    <!-- Manual Add Modal -->
    <div v-if="showManualAdd" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Lead manuell hinzufügen</h2>
          <button @click="showManualAdd = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
            <input v-model="manualForm.first_name" type="text" placeholder="Max"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
            <input v-model="manualForm.last_name" type="text" placeholder="Muster"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Email <span class="text-red-500">*</span></label>
          <input v-model="manualForm.email" type="email" required placeholder="max@beispiel.ch"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
          <input v-model="manualForm.phone" type="tel" placeholder="+41 79 123 45 67"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Kategorien</label>
          <div class="flex flex-wrap gap-2">
            <label v-for="cat in CATEGORIES" :key="cat.value" class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" :value="cat.value" v-model="manualForm.categories" class="rounded border-gray-300 text-blue-600" />
              <span class="text-sm text-gray-700">{{ cat.label }}</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Notiz</label>
          <textarea v-model="manualForm.notes" rows="2" placeholder="z.B. Anruf erhalten, interessiert an Motorrad"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div v-if="manualError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{{ manualError }}</div>

        <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          <strong>Hinweis:</strong> Der Lead wird mit Status «Consent ausstehend» erstellt. Sende ihm eine Kampagne mit <code>&#123;&#123;consent_link&#125;&#125;</code> um ihn zu aktivieren.
        </div>

        <div class="flex gap-3 pt-1">
          <button @click="showManualAdd = false" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveManualLead" :disabled="manualSaving || !manualForm.email"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {{ manualSaving ? 'Speichere…' : 'Lead hinzufügen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import from Users Modal -->
    <div v-if="showImportFromUsers" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Aus bestehenden Schülern importieren</h2>
          <button @click="showImportFromUsers = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Result -->
        <div v-if="importUsersResult" class="space-y-3">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-green-50 border border-green-200 rounded-xl p-3">
              <div class="text-2xl font-black text-green-700">{{ importUsersResult.imported.toLocaleString('de-CH') }}</div>
              <div class="text-xs text-green-600 font-medium mt-0.5">Importiert</div>
            </div>
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div class="text-2xl font-black text-gray-600">{{ importUsersResult.skipped.toLocaleString('de-CH') }}</div>
              <div class="text-xs text-gray-500 font-medium mt-0.5">Bereits vorhanden</div>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div class="text-2xl font-black text-blue-700">{{ importUsersResult.total.toLocaleString('de-CH') }}</div>
              <div class="text-xs text-blue-600 font-medium mt-0.5">Total Schüler</div>
            </div>
          </div>
          <p class="text-sm text-gray-600 text-center">
            Alle importierten Leads haben Status <strong>«Consent ausstehend»</strong>.<br/>
            Starte eine Kampagne mit einem Consent-Link um sie zu aktivieren.
          </p>
          <button @click="showImportFromUsers = false" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Fertig
          </button>
        </div>

        <!-- Form -->
        <template v-else>
          <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
            <div class="font-semibold mb-1">Was passiert hier?</div>
            Alle Schüler aus dem System werden in die Leads-Datenbank übernommen — ohne Duplikate. Sie erhalten den Status <strong>«Consent ausstehend»</strong> und müssen zuerst einer Kampagne zustimmen.
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-2">Kategorien zuweisen (optional)</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="cat in CATEGORIES" :key="cat.value" class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" :value="cat.value" v-model="importUsersCategories" class="rounded border-gray-300 text-purple-600" />
                <span class="text-sm text-gray-700">{{ cat.label }}</span>
              </label>
            </div>
            <p class="text-xs text-gray-400 mt-1.5">Leer lassen = keine Kategorie (Lead erhält alle Kampagnen)</p>
          </div>

          <div class="flex gap-3 pt-1">
            <button @click="showImportFromUsers = false" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Abbrechen
            </button>
            <button @click="runImportFromUsers" :disabled="importUsersLoading"
              class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition">
              {{ importUsersLoading ? 'Importiere…' : 'Import starten' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editLead" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Lead bearbeiten</h2>
          <button @click="editLead = null" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono">{{ editLead.email }}</div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
            <input v-model="editForm.first_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
            <input v-model="editForm.last_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select v-model="editForm.status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="pending_consent">Consent ausstehend</option>
            <option value="active">Aktiv</option>
            <option value="unsubscribed">Abgemeldet</option>
            <option value="bounced">Bounced</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Kategorien</label>
          <div class="flex flex-wrap gap-2">
            <label v-for="cat in CATEGORIES" :key="cat.value" class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" :value="cat.value" v-model="editForm.categories" class="rounded" />
              <span class="text-sm text-gray-700">{{ cat.label }}</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Notiz</label>
          <textarea v-model="editForm.notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="editLead = null" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveLead" :disabled="saving" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ saving ? 'Speichere...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Leads - Marketing - Admin' })

const authStore = useAuthStore()

const CATEGORIES = [
  { value: 'auto', label: 'Auto (B)' },
  { value: 'motorrad', label: 'Motorrad (A)' },
  { value: 'lkw', label: 'LKW (C/CE)' },
  { value: 'fahrlehrer', label: 'Fahrlehrer' },
  { value: 'bus', label: 'Bus (D)' },
  { value: 'traktor', label: 'Traktor' },
]

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
  const pages = []
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
    pending_consent: 'bg-yellow-100 text-yellow-700',
    unsubscribed: 'bg-gray-100 text-gray-600',
    bounced: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

// Edit
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

// ── Import Menu ─────────────────────────────────────────────
const importMenuOpen = ref(false)
const importMenuRef = ref<HTMLElement | null>(null)

function handleClickOutside(e: MouseEvent) {
  if (importMenuRef.value && !importMenuRef.value.contains(e.target as Node)) {
    importMenuOpen.value = false
  }
}

// ── Manual Add ──────────────────────────────────────────────
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
    await $fetch('/api/marketing/leads', {
      method: 'POST',
      body: { tenantId, ...manualForm },
    })
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
const BASE_URL = 'https://app.simy.ch'

async function copyNewsletterLink() {
  const tenantId = authStore.userProfile?.tenant_id
  // Resolve slug from branding call
  const res = await $fetch<any>('/api/tenants/branding', { query: { id: tenantId } }).catch(() => null)
  const slug = res?.data?.slug || tenantId
  const url = `${BASE_URL}/newsletter/${slug}`
  await navigator.clipboard.writeText(url).catch(() => prompt('Link kopieren:', url))
  newsletterLinkCopied.value = true
  setTimeout(() => { newsletterLinkCopied.value = false }, 3000)
}

onMounted(() => {
  loadLeads()
  document.addEventListener('click', handleClickOutside)
})

import { onUnmounted } from 'vue'
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
