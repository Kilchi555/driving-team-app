<template>
  <div class="p-4 sm:p-6">
    <!-- Header -->
    <div class="mb-6 sm:mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">🤝 Affiliate-System</h1>
      <p class="text-sm text-gray-600">Kategorie-Rewards konfigurieren und Auszahlungsanträge verwalten</p>
    </div>

    <!-- Tabs – scrollable on mobile -->
    <div class="bg-white rounded-lg shadow-sm border mb-6 overflow-x-auto">
      <div class="flex border-b min-w-max sm:min-w-0">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ── Tab: Einstellungen ───────────────────────────────────────── -->
    <div v-if="activeTab === 'settings'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6 max-w-lg">
        <h2 class="text-base sm:text-lg font-bold text-gray-900 mb-1">System aktivieren / deaktivieren</h2>
        <p class="text-sm text-gray-500 mb-4">Wenn deaktiviert, können keine neuen Codes generiert werden.</p>
        <label class="flex items-center gap-3 cursor-pointer">
          <div
            @click="toggleEnabled"
            class="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
            :class="affiliateEnabled ? 'bg-blue-600' : 'bg-gray-300'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              :class="affiliateEnabled ? 'translate-x-6' : 'translate-x-0.5'"
            ></div>
          </div>
          <span class="text-sm text-gray-700">{{ affiliateEnabled ? 'Aktiv' : 'Inaktiv' }}</span>
        </label>
      </div>
    </div>

    <!-- ── Tab: Kategorie-Rewards ──────────────────────────────────── -->
    <div v-if="activeTab === 'categories'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <div class="mb-5">
          <h2 class="text-base sm:text-lg font-bold text-gray-900">Rewards nach Fahrkategorie</h2>
          <p class="text-sm text-gray-500 mt-1">
            Definiere für jede Fahrkategorie (B, BE, A, …) einen eigenen Gutschrift-Betrag.
            Wenn für die Kategorie eines Termins kein Eintrag existiert, wird kein Reward gutgeschrieben.
          </p>
        </div>

        <!-- Add new rule form -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-6 p-4 bg-gray-50 rounded-lg border">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Fahrkategorie</label>
            <select
              v-model="newCategory"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wählen…</option>
              <option v-for="cat in availableCategories" :key="cat.code" :value="cat.code">
                {{ cat.code }}{{ cat.name && cat.name !== cat.code ? ` – ${cat.name}` : '' }}
              </option>
            </select>
          </div>
          <div class="sm:w-36">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Betrag (CHF)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">CHF</span>
              <input
                v-model.number="newRewardChf"
                type="number"
                min="0"
                step="1"
                class="w-full border border-gray-300 rounded-lg pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            @click="addCategoryReward"
            :disabled="!newCategory || savingCategory"
            class="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 sm:self-end"
          >
            {{ savingCategory ? 'Speichern…' : '+ Hinzufügen' }}
          </button>
        </div>

        <!-- Loading / Empty -->
        <div v-if="loadingCategories" class="text-center py-8 text-gray-400 text-sm">Wird geladen…</div>
        <div v-else-if="!categoryRewards.length" class="text-center py-8 text-gray-400 text-sm">
          Noch keine Kategorie-Rewards definiert.
        </div>

        <!-- Desktop table -->
        <div v-else class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Kategorie</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Betrag</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Aktiv</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Zuletzt geändert</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in categoryRewards" :key="row.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <span class="font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{{ row.driving_category }}</span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="editingId === row.id" class="flex items-center gap-2">
                    <div class="relative w-28">
                      <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">CHF</span>
                      <input
                        v-model.number="editingChf"
                        type="number" min="0" step="1"
                        class="w-full border border-blue-400 rounded px-2 pl-9 py-1 text-sm focus:outline-none"
                        @keydown.enter="saveEdit(row)"
                        @keydown.escape="editingId = null"
                      />
                    </div>
                    <button @click="saveEdit(row)" class="text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700">OK</button>
                    <button @click="editingId = null" class="text-xs text-gray-500 hover:text-gray-700">Abbrechen</button>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <span class="font-medium">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
                    <button @click="startEdit(row)" class="text-gray-400 hover:text-blue-600 text-xs">✏️</button>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div @click="toggleCategoryActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? 'bg-blue-600' : 'bg-gray-300'">
                    <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="row.is_active ? 'translate-x-5' : 'translate-x-0.5'"></div>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(row.updated_at) }}</td>
                <td class="px-4 py-3">
                  <button @click="deleteCategoryReward(row.id)" class="text-red-400 hover:text-red-600 text-xs">Löschen</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div v-if="!loadingCategories && categoryRewards.length" class="sm:hidden space-y-3">
          <div v-for="row in categoryRewards" :key="row.id" class="border rounded-lg p-4 bg-gray-50">
            <div class="flex items-center justify-between mb-3">
              <span class="font-mono font-bold text-gray-900 bg-white border px-2 py-0.5 rounded text-sm">{{ row.driving_category }}</span>
              <div class="flex items-center gap-3">
                <div @click="toggleCategoryActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? 'bg-blue-600' : 'bg-gray-300'">
                  <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="row.is_active ? 'translate-x-5' : 'translate-x-0.5'"></div>
                </div>
                <button @click="deleteCategoryReward(row.id)" class="text-red-400 hover:text-red-600 text-xs font-medium">Löschen</button>
              </div>
            </div>
            <div v-if="editingId === row.id" class="flex items-center gap-2">
              <div class="relative flex-1">
                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">CHF</span>
                <input
                  v-model.number="editingChf"
                  type="number" min="0" step="1"
                  class="w-full border border-blue-400 rounded px-2 pl-9 py-1.5 text-sm focus:outline-none"
                  @keydown.enter="saveEdit(row)"
                  @keydown.escape="editingId = null"
                />
              </div>
              <button @click="saveEdit(row)" class="text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700">OK</button>
              <button @click="editingId = null" class="text-xs text-gray-500">✕</button>
            </div>
            <div v-else class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
              <button @click="startEdit(row)" class="text-xs text-blue-600 font-medium">Betrag ändern ✏️</button>
            </div>
            <div class="text-xs text-gray-400 mt-2">{{ formatDate(row.updated_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Kurs-Rewards ──────────────────────────────────────── -->
    <div v-if="activeTab === 'courses'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <div class="mb-5">
          <h2 class="text-base sm:text-lg font-bold text-gray-900">Rewards nach Kurs</h2>
          <p class="text-sm text-gray-500 mt-1">
            Definiere für einzelne Kurse einen spezifischen Reward. Dieser hat <strong>höhere Priorität</strong> als der Kategorie-Reward.
          </p>
        </div>

        <!-- Add new course reward form -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-6 p-4 bg-gray-50 rounded-lg border">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Kurs</label>
            <select
              v-model="newCourseId"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kurs wählen…</option>
              <option v-for="course in availableCourses" :key="course.id" :value="course.id">
                {{ course.name }} <span v-if="course.category">({{ course.category }})</span>
              </option>
            </select>
          </div>
          <div class="sm:w-36">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Betrag (CHF)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">CHF</span>
              <input
                v-model.number="newCourseRewardChf"
                type="number"
                min="0"
                step="1"
                class="w-full border border-gray-300 rounded-lg pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            @click="addCourseReward"
            :disabled="!newCourseId || savingCourseReward"
            class="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 sm:self-end"
          >
            {{ savingCourseReward ? 'Speichern…' : '+ Hinzufügen' }}
          </button>
        </div>

        <!-- Loading / Empty -->
        <div v-if="loadingCourseRewards" class="text-center py-8 text-gray-400 text-sm">Wird geladen…</div>
        <div v-else-if="!courseRewards.length" class="text-center py-8 text-gray-400 text-sm">
          Noch keine Kurs-spezifischen Rewards definiert.
        </div>

        <!-- Desktop table -->
        <div v-else class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Kurs</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Kategorie</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Betrag</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Aktiv</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Zuletzt geändert</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in courseRewards" :key="row.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-900">{{ row.courses?.name ?? row.course_id }}</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="row.courses?.category" class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{{ row.courses.category }}</span>
                  <span v-else class="text-gray-400 text-xs">–</span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="editingCourseId === row.id" class="flex items-center gap-2">
                    <div class="relative w-28">
                      <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">CHF</span>
                      <input
                        v-model.number="editingCourseChf"
                        type="number" min="0" step="1"
                        class="w-full border border-blue-400 rounded px-2 pl-9 py-1 text-sm focus:outline-none"
                        @keydown.enter="saveCourseEdit(row)"
                        @keydown.escape="editingCourseId = null"
                      />
                    </div>
                    <button @click="saveCourseEdit(row)" class="text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700">OK</button>
                    <button @click="editingCourseId = null" class="text-xs text-gray-500 hover:text-gray-700">Abbrechen</button>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <span class="font-medium">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
                    <button @click="startCourseEdit(row)" class="text-gray-400 hover:text-blue-600 text-xs">✏️</button>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div @click="toggleCourseRewardActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? 'bg-blue-600' : 'bg-gray-300'">
                    <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="row.is_active ? 'translate-x-5' : 'translate-x-0.5'"></div>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(row.updated_at) }}</td>
                <td class="px-4 py-3">
                  <button @click="deleteCourseReward(row.id)" class="text-red-400 hover:text-red-600 text-xs">Löschen</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div v-if="!loadingCategories && courseRewards.length" class="sm:hidden space-y-3">
          <div v-for="row in courseRewards" :key="row.id" class="border rounded-lg p-4 bg-gray-50">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="font-semibold text-gray-900 text-sm">{{ row.courses?.name ?? row.course_id }}</div>
                <span v-if="row.courses?.category" class="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">{{ row.courses.category }}</span>
              </div>
              <div class="flex items-center gap-3 flex-shrink-0">
                <div @click="toggleCourseRewardActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? 'bg-blue-600' : 'bg-gray-300'">
                  <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="row.is_active ? 'translate-x-5' : 'translate-x-0.5'"></div>
                </div>
                <button @click="deleteCourseReward(row.id)" class="text-red-400 hover:text-red-600 text-xs font-medium">Löschen</button>
              </div>
            </div>
            <div v-if="editingCourseId === row.id" class="flex items-center gap-2 mt-2">
              <div class="relative flex-1">
                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">CHF</span>
                <input
                  v-model.number="editingCourseChf"
                  type="number" min="0" step="1"
                  class="w-full border border-blue-400 rounded px-2 pl-9 py-1.5 text-sm focus:outline-none"
                  @keydown.enter="saveCourseEdit(row)"
                  @keydown.escape="editingCourseId = null"
                />
              </div>
              <button @click="saveCourseEdit(row)" class="text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700">OK</button>
              <button @click="editingCourseId = null" class="text-xs text-gray-500">✕</button>
            </div>
            <div v-else class="flex items-center justify-between mt-2">
              <span class="text-sm font-medium text-gray-700">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
              <button @click="startCourseEdit(row)" class="text-xs text-blue-600 font-medium">Betrag ändern ✏️</button>
            </div>
            <div class="text-xs text-gray-400 mt-2">{{ formatDate(row.updated_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Auszahlungen ───────────────────────────────────────── -->    <div v-if="activeTab === 'payouts'">
      <div v-if="loadingPayouts" class="text-center py-12 text-gray-400">Wird geladen…</div>
      <div v-else-if="!payoutRequests.length" class="text-center py-12 text-gray-400">
        Keine ausstehenden Auszahlungsanträge
      </div>
      <div v-else>
        <!-- Desktop table -->
        <div class="hidden sm:block bg-white rounded-lg shadow-sm border overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Partner</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Betrag</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">IBAN</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Datum</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="req in payoutRequests" :key="req.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">{{ req.user_name }}</div>
                  <div class="text-gray-400 text-xs">{{ req.user_email }}</div>
                </td>
                <td class="px-4 py-3 font-medium">CHF {{ (req.amount_rappen / 100).toFixed(2) }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ req.iban }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(req.created_at) }}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold" :class="{ 'bg-yellow-100 text-yellow-700': req.status === 'pending', 'bg-blue-100 text-blue-700': req.status === 'approved', 'bg-green-100 text-green-700': req.status === 'paid', 'bg-red-100 text-red-700': req.status === 'rejected' }">
                    {{ statusLabels[req.status] ?? req.status }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="req.status === 'pending'" class="flex gap-2">
                    <button @click="updatePayout(req.id, 'approved')" class="text-xs bg-blue-100 text-blue-700 rounded px-2 py-1 hover:bg-blue-200">Genehmigen</button>
                    <button @click="updatePayout(req.id, 'rejected')" class="text-xs bg-red-100 text-red-700 rounded px-2 py-1 hover:bg-red-200">Ablehnen</button>
                  </div>
                  <div v-else-if="req.status === 'approved'">
                    <button @click="updatePayout(req.id, 'paid')" class="text-xs bg-green-100 text-green-700 rounded px-2 py-1 hover:bg-green-200">Als überwiesen markieren</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-3">
          <div v-for="req in payoutRequests" :key="req.id" class="bg-white rounded-lg border p-4 shadow-sm">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="font-medium text-gray-900 text-sm">{{ req.user_name }}</div>
                <div class="text-gray-400 text-xs">{{ req.user_email }}</div>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" :class="{ 'bg-yellow-100 text-yellow-700': req.status === 'pending', 'bg-blue-100 text-blue-700': req.status === 'approved', 'bg-green-100 text-green-700': req.status === 'paid', 'bg-red-100 text-red-700': req.status === 'rejected' }">
                {{ statusLabels[req.status] ?? req.status }}
              </span>
            </div>
            <div class="text-sm font-semibold text-gray-900 mb-1">CHF {{ (req.amount_rappen / 100).toFixed(2) }}</div>
            <div class="font-mono text-xs text-gray-500 mb-1 break-all">{{ req.iban }}</div>
            <div class="text-xs text-gray-400 mb-3">{{ formatDate(req.created_at) }}</div>
            <div v-if="req.status === 'pending'" class="flex gap-2">
              <button @click="updatePayout(req.id, 'approved')" class="flex-1 text-xs bg-blue-100 text-blue-700 rounded px-2 py-2 hover:bg-blue-200 font-medium">Genehmigen</button>
              <button @click="updatePayout(req.id, 'rejected')" class="flex-1 text-xs bg-red-100 text-red-700 rounded px-2 py-2 hover:bg-red-200 font-medium">Ablehnen</button>
            </div>
            <div v-else-if="req.status === 'approved'">
              <button @click="updatePayout(req.id, 'paid')" class="w-full text-xs bg-green-100 text-green-700 rounded px-2 py-2 hover:bg-green-200 font-medium">Als überwiesen markieren</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Übersicht ──────────────────────────────────────────── -->
    <div v-if="activeTab === 'overview'">
      <div v-if="loadingOverview" class="text-center py-12 text-gray-400">Wird geladen…</div>
      <div v-else>
        <!-- Summary stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div class="bg-white rounded-lg border p-3 sm:p-4 text-center">
            <div class="text-xl sm:text-2xl font-bold text-gray-900">{{ overview.total_codes }}</div>
            <div class="text-xs text-gray-500 mt-1">Aktive Codes</div>
          </div>
          <div class="bg-white rounded-lg border p-3 sm:p-4 text-center">
            <div class="text-xl sm:text-2xl font-bold text-gray-900">{{ overview.total_referrals }}</div>
            <div class="text-xs text-gray-500 mt-1">Empfehlungen Total</div>
          </div>
          <div class="bg-white rounded-lg border p-3 sm:p-4 text-center">
            <div class="text-xl sm:text-2xl font-bold text-green-600">{{ overview.total_credited }}</div>
            <div class="text-xs text-gray-500 mt-1">Credited Referrals</div>
          </div>
          <div class="bg-white rounded-lg border p-3 sm:p-4 text-center">
            <div class="text-xl sm:text-2xl font-bold text-gray-900">CHF {{ (overview.total_credited_rappen / 100).toFixed(0) }}</div>
            <div class="text-xs text-gray-500 mt-1">Guthaben vergeben</div>
          </div>
        </div>

        <!-- Top affiliates -->
        <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div class="p-4 border-b">
            <h2 class="font-bold text-gray-900">Top-Partner</h2>
          </div>

          <!-- Desktop table -->
          <table class="hidden sm:table w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Code</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Empfehlungen</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Vergütet</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="code in overview.top_codes" :key="code.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">{{ code.user_name }}</td>
                <td class="px-4 py-3 font-mono text-xs">{{ code.code }}</td>
                <td class="px-4 py-3">{{ code.total_referrals }}</td>
                <td class="px-4 py-3">CHF {{ (code.total_credited_rappen / 100).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile cards -->
          <div class="sm:hidden divide-y divide-gray-100">
            <div v-for="code in overview.top_codes" :key="code.id" class="p-4">
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-gray-900 text-sm">{{ code.user_name }}</span>
                <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{{ code.code }}</span>
              </div>
              <div class="flex items-center justify-between text-sm text-gray-500">
                <span>{{ code.total_referrals }} Empfehlungen</span>
                <span class="font-semibold text-gray-900">CHF {{ (code.total_credited_rappen / 100).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin', layout: 'admin' })

const authStore = useAuthStore()

const tabs = [
  { id: 'settings', label: '⚙️ Einstellungen' },
  { id: 'categories', label: '🚗 Kategorie-Rewards' },
  { id: 'courses', label: '📚 Kurs-Rewards' },
  { id: 'payouts', label: '💸 Auszahlungen' },
  { id: 'overview', label: '📊 Übersicht' },
]
const activeTab = ref('settings')

const statusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  paid: 'Überwiesen',
  rejected: 'Abgelehnt',
}

// ── Settings ─────────────────────────────────────────────────────────
const affiliateEnabled = ref(true)

async function loadSettings() {
  try {
    const result = await $fetch<any>('/api/affiliate/admin-settings')
    affiliateEnabled.value = result.data.enabled !== false
  } catch { /* use defaults */ }
}

async function toggleEnabled() {
  affiliateEnabled.value = !affiliateEnabled.value
  try {
    await $fetch('/api/affiliate/admin-settings', {
      method: 'PUT',
      body: { enabled: affiliateEnabled.value },
    })
  } catch {
    affiliateEnabled.value = !affiliateEnabled.value // revert on error
  }
}

// ── Payout requests ───────────────────────────────────────────────────
const payoutRequests = ref<any[]>([])
const loadingPayouts = ref(false)

async function loadPayouts() {
  loadingPayouts.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/admin-payouts')
    payoutRequests.value = result.data ?? []
  } finally {
    loadingPayouts.value = false
  }
}

async function updatePayout(id: string, status: string) {
  await $fetch(`/api/affiliate/admin-payouts/${id}`, {
    method: 'PATCH',
    body: { status },
  })
  await loadPayouts()
}

// ── Overview ─────────────────────────────────────────────────────────
const loadingOverview = ref(false)
const overview = ref({ total_codes: 0, total_referrals: 0, total_credited: 0, total_credited_rappen: 0, top_codes: [] as any[] })

async function loadOverview() {
  loadingOverview.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/admin-overview')
    overview.value = result.data
  } finally {
    loadingOverview.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'payouts' && !payoutRequests.value.length) loadPayouts()
  if (tab === 'overview') loadOverview()
  if (tab === 'categories') loadCategoryRewards()
  if (tab === 'courses') loadCourseRewards()
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Category Rewards ──────────────────────────────────────────────────
const categoryRewards = ref<any[]>([])
const loadingCategories = ref(false)
const savingCategory = ref(false)
const newCategory = ref('')
const newRewardChf = ref(50)
const editingId = ref<string | null>(null)
const editingChf = ref(0)

const availableCategories = ref<{ code: string; name: string }[]>([])

async function loadAvailableCategories() {
  try {
    const result = await $fetch<any>('/api/staff/get-categories')
    const all: any[] = result.data ?? []

    // Categories that have children (are parents)
    const parentIds = new Set(all.filter(c => c.parent_category_id).map(c => c.parent_category_id))

    // Use subcategories where they exist, top-level where they don't
    availableCategories.value = all
      .filter(c => {
        if (c.parent_category_id) return true      // always include subcategories
        return !parentIds.has(c.id)                // only include top-level if no children
      })
      .map((c: any) => ({ code: c.code, name: c.name }))
      .sort((a: any, b: any) => a.code.localeCompare(b.code))
  } catch {
    // fallback to empty
  }
}

async function loadCategoryRewards() {
  loadingCategories.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/category-rewards')
    categoryRewards.value = result.data ?? []
  } finally {
    loadingCategories.value = false
  }
}

async function addCategoryReward() {
  if (!newCategory.value) return
  savingCategory.value = true
  try {
    await $fetch('/api/affiliate/category-rewards', {
      method: 'POST',
      body: { driving_category: newCategory.value, reward_rappen: newRewardChf.value * 100 },
    })
    newCategory.value = ''
    newRewardChf.value = 50
    await loadCategoryRewards()
  } finally {
    savingCategory.value = false
  }
}

function startEdit(row: any) {
  editingId.value = row.id
  editingChf.value = Math.round(row.reward_rappen / 100)
}

async function saveEdit(row: any) {
  await $fetch('/api/affiliate/category-rewards', {
    method: 'POST',
    body: { driving_category: row.driving_category, reward_rappen: editingChf.value * 100, is_active: row.is_active },
  })
  editingId.value = null
  await loadCategoryRewards()
}

async function toggleCategoryActive(row: any) {
  await $fetch('/api/affiliate/category-rewards', {
    method: 'POST',
    body: { driving_category: row.driving_category, reward_rappen: row.reward_rappen, is_active: !row.is_active },
  })
  await loadCategoryRewards()
}

async function deleteCategoryReward(id: string) {
  if (!confirm('Diesen Eintrag wirklich löschen?')) return
  await $fetch(`/api/affiliate/category-rewards?id=${id}`, {
    method: 'DELETE',
  })
  await loadCategoryRewards()
}

// ── Course Rewards ────────────────────────────────────────────────────
const courseRewards = ref<any[]>([])
const loadingCourseRewards = ref(false)
const savingCourseReward = ref(false)
const newCourseId = ref('')
const newCourseRewardChf = ref(50)
const editingCourseId = ref<string | null>(null)
const editingCourseChf = ref(0)

const availableCourses = ref<{ id: string; name: string; category: string }[]>([])

async function loadAvailableCourses() {
  try {
    const result = await $fetch<any>('/api/staff/get-courses')
    availableCourses.value = (result.data ?? [])
      .map((c: any) => ({ id: c.id, name: c.name, category: c.category }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
  } catch {
    // fallback to empty
  }
}

async function loadCourseRewards() {
  loadingCourseRewards.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/category-rewards?type=course')
    courseRewards.value = result.data ?? []
  } finally {
    loadingCourseRewards.value = false
  }
}

async function addCourseReward() {
  if (!newCourseId.value) return
  savingCourseReward.value = true
  try {
    await $fetch('/api/affiliate/category-rewards', {
      method: 'POST',
      body: { course_id: newCourseId.value, reward_rappen: newCourseRewardChf.value * 100 },
    })
    newCourseId.value = ''
    newCourseRewardChf.value = 50
    await loadCourseRewards()
  } finally {
    savingCourseReward.value = false
  }
}

function startCourseEdit(row: any) {
  editingCourseId.value = row.id
  editingCourseChf.value = Math.round(row.reward_rappen / 100)
}

async function saveCourseEdit(row: any) {
  await $fetch('/api/affiliate/category-rewards', {
    method: 'POST',
    body: { id: row.id, course_id: row.course_id, reward_rappen: editingCourseChf.value * 100, is_active: row.is_active },
  })
  editingCourseId.value = null
  await loadCourseRewards()
}

async function toggleCourseRewardActive(row: any) {
  await $fetch('/api/affiliate/category-rewards', {
    method: 'POST',
    body: { id: row.id, course_id: row.course_id, reward_rappen: row.reward_rappen, is_active: !row.is_active },
  })
  await loadCourseRewards()
}

async function deleteCourseReward(id: string) {
  if (!confirm('Diesen Kurs-Reward wirklich löschen?')) return
  await $fetch(`/api/affiliate/category-rewards?id=${id}`, { method: 'DELETE' })
  await loadCourseRewards()
}

onMounted(async () => {
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  if (!authStore.isLoggedIn || !authStore.isAdmin) return
  loadSettings()
  loadPayouts()
  loadAvailableCategories()
  loadAvailableCourses()
})
</script>
