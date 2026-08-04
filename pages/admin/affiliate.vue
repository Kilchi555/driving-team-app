<template>
  <div class="p-4 sm:p-6">
    <!-- Header — only when feature is available (avoid “configure rewards” while paywalled) -->
    <div v-if="!featureLoading && !featureBlocked" class="mb-6 sm:mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Affiliate-System</h1>
      <p class="text-sm text-gray-600">Kategorie-Rewards konfigurieren und Auszahlungsanträge verwalten</p>
    </div>

    <div v-if="featureLoading" class="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-40 max-w-lg" />

    <!-- Feature not enabled — upgrade CTA (parity with GBP) -->
    <div v-else-if="featureBlocked" class="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 max-w-lg mx-auto">
      <div
        class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        :style="{ background: `color-mix(in srgb, ${primaryColor} 12%, white)` }"
      >
        <svg class="w-7 h-7" :style="{ color: primaryColor }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
        </svg>
      </div>
      <h1 class="text-xl font-bold text-gray-900 mb-2">Neue Kunden durch Empfehlungen</h1>
      <p class="text-sm text-gray-500 mb-5 leading-relaxed">
        Lass zufriedene Schüler:innen Freunde empfehlen — und belohne sie mit einer Gutschrift,
        sobald die erste {{ t.appointment }} bezahlt ist. Erfolgsbasiert, wenig Aufwand, organische Neukunden.
      </p>
      <ul class="space-y-2.5 mb-6">
        <li v-for="(f, i) in affiliateFeatures" :key="f" class="flex items-start gap-2.5 text-sm" :class="i === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" :class="i === 0 ? '' : 'text-green-500'" :style="i === 0 ? { color: primaryColor } : {}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          {{ f }}
        </li>
      </ul>
      <NuxtLink
        to="/upgrade?addon=affiliate"
        class="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
        :style="{ background: primaryColor }"
      >
        {{ affiliateCtaLabel }}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </NuxtLink>
      <p class="text-xs text-gray-400 mt-3">
        {{ affiliatePriceLabel
          ? `${affiliatePriceLabel}/Mt. · Im Enterprise-Plan inklusive.`
          : 'Im Enterprise-Plan inklusive — oder als Add-on für Starter/Professional.' }}
      </p>
    </div>

    <template v-else>
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
              ? 'border-b-2'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
          :style="activeTab === tab.id ? { color: primaryColor, borderColor: primaryColor, background: `${primaryColor}10` } : {}"
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
            :class="affiliateEnabled ? '' : 'bg-gray-300'"
            :style="affiliateEnabled ? { background: primaryColor } : {}"
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
            Für {{ t.appointmentsPlural }} nach Kategorie (B, BE, A, …). Kursarten wie VKU oder Motorradgrundkurs konfigurierst du im Tab «Kursarten».
          </p>
        </div>

        <!-- Add new rule form -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-6 p-4 bg-gray-50 rounded-lg border">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Fahrkategorie</label>
            <select
              v-model="newCategory"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
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
                class="tenant-focus w-full border border-gray-300 rounded-lg pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
          </div>
          <button
            @click="addCategoryReward"
            :disabled="!newCategory || savingCategory"
            class="text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 sm:self-end"
            :style="{ background: primaryColor }"
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
                        class="w-full border rounded px-2 pl-9 py-1 text-sm focus:outline-none"
                        :style="{ borderColor: primaryColor }"
                        @keydown.enter="saveEdit(row)"
                        @keydown.escape="editingId = null"
                      />
                    </div>
                    <button @click="saveEdit(row)" class="text-xs text-white rounded px-2 py-1 hover:opacity-90" :style="{ background: primaryColor }">OK</button>
                    <button @click="editingId = null" class="text-xs text-gray-500 hover:text-gray-700">Abbrechen</button>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <span class="font-medium">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
                    <button @click="startEdit(row)" class="text-gray-400 tenant-hover-primary text-xs font-medium">Ändern</button>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div @click="toggleCategoryActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? '' : 'bg-gray-300'" :style="row.is_active ? { background: primaryColor } : {}">
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
                <div @click="toggleCategoryActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? '' : 'bg-gray-300'" :style="row.is_active ? { background: primaryColor } : {}">
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
                  class="w-full border rounded px-2 pl-9 py-1.5 text-sm focus:outline-none"
                  :style="{ borderColor: primaryColor }"
                  @keydown.enter="saveEdit(row)"
                  @keydown.escape="editingId = null"
                />
              </div>
              <button @click="saveEdit(row)" class="text-xs text-white rounded px-3 py-1.5 hover:opacity-90" :style="{ background: primaryColor }">OK</button>
              <button @click="editingId = null" class="text-xs text-gray-500">✕</button>
            </div>
            <div v-else class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
              <button @click="startEdit(row)" class="text-xs font-medium" :style="{ color: primaryColor }">Betrag ändern</button>
            </div>
            <div class="text-xs text-gray-400 mt-2">{{ formatDate(row.updated_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Kursarten-Rewards ─────────────────────────────────── -->
    <div v-if="activeTab === 'courses'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <div class="mb-5">
          <h2 class="text-base sm:text-lg font-bold text-gray-900">Rewards nach Kursart</h2>
          <p class="text-sm text-gray-500 mt-1">
            Belohne Empfehlungen für Kurse (z.B. VKU, Motorradgrundkurs). Der Reward gilt für alle Termine dieser Kursart —
            sobald die Anmeldung bezahlt ist.
          </p>
        </div>

        <div v-if="courseTypesError" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {{ courseTypesError }}
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-6 p-4 bg-gray-50 rounded-lg border">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Kursart</label>
            <select
              v-model="newCourseTypeCode"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            >
              <option value="">Kursart wählen…</option>
              <option
                v-for="ct in availableCourseTypes"
                :key="ct.code"
                :value="ct.code"
                :disabled="configuredCourseTypeCodes.has(ct.code)"
              >
                {{ ct.name }}{{ ct.name !== ct.code ? ` (${ct.code})` : '' }}
              </option>
            </select>
            <p v-if="!courseTypesLoading && !availableCourseTypes.length" class="text-xs text-gray-400 mt-1.5">
              Keine Kursarten gefunden. Lege zuerst Kursarten unter Kurse an.
            </p>
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
                class="tenant-focus w-full border border-gray-300 rounded-lg pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
          </div>
          <button
            @click="addCourseTypeReward"
            :disabled="!newCourseTypeCode || savingCourseReward"
            class="text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 sm:self-end"
            :style="{ background: primaryColor }"
          >
            {{ savingCourseReward ? 'Speichern…' : '+ Hinzufügen' }}
          </button>
        </div>

        <div v-if="loadingCourseRewards || courseTypesLoading" class="text-center py-8 text-gray-400 text-sm">Wird geladen…</div>
        <div v-else-if="!courseTypeRewards.length" class="text-center py-8 text-gray-400 text-sm">
          Noch keine Kursart-Rewards definiert.
        </div>

        <div v-else class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Kursart</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Betrag</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Aktiv</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Zuletzt geändert</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in courseTypeRewards" :key="row.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">{{ courseTypeLabel(row.driving_category) }}</div>
                  <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{{ row.driving_category }}</span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="editingCourseId === row.id" class="flex items-center gap-2">
                    <div class="relative w-28">
                      <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">CHF</span>
                      <input
                        v-model.number="editingCourseChf"
                        type="number" min="0" step="1"
                        class="w-full border rounded px-2 pl-9 py-1 text-sm focus:outline-none"
                        :style="{ borderColor: primaryColor }"
                        @keydown.enter="saveCourseTypeEdit(row)"
                        @keydown.escape="editingCourseId = null"
                      />
                    </div>
                    <button @click="saveCourseTypeEdit(row)" class="text-xs text-white rounded px-2 py-1 hover:opacity-90" :style="{ background: primaryColor }">OK</button>
                    <button @click="editingCourseId = null" class="text-xs text-gray-500 hover:text-gray-700">Abbrechen</button>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <span class="font-medium">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
                    <button @click="startCourseEdit(row)" class="text-gray-400 tenant-hover-primary text-xs font-medium">Ändern</button>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div @click="toggleCourseTypeActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? '' : 'bg-gray-300'" :style="row.is_active ? { background: primaryColor } : {}">
                    <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="row.is_active ? 'translate-x-5' : 'translate-x-0.5'"></div>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(row.updated_at) }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click="deleteCourseReward(row.id)" class="text-red-400 hover:text-red-600 text-xs">Löschen</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loadingCourseRewards && !courseTypesLoading && courseTypeRewards.length" class="sm:hidden space-y-3">
          <div v-for="row in courseTypeRewards" :key="row.id" class="border rounded-lg p-4 bg-gray-50">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="font-semibold text-gray-900 text-sm">{{ courseTypeLabel(row.driving_category) }}</div>
                <span class="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">{{ row.driving_category }}</span>
              </div>
              <div class="flex items-center gap-3 flex-shrink-0">
                <div @click="toggleCourseTypeActive(row)" class="relative w-10 h-5 rounded-full cursor-pointer transition-colors" :class="row.is_active ? '' : 'bg-gray-300'" :style="row.is_active ? { background: primaryColor } : {}">
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
                  class="w-full border rounded px-2 pl-9 py-1.5 text-sm focus:outline-none"
                  :style="{ borderColor: primaryColor }"
                  @keydown.enter="saveCourseTypeEdit(row)"
                  @keydown.escape="editingCourseId = null"
                />
              </div>
              <button @click="saveCourseTypeEdit(row)" class="text-xs text-white rounded px-3 py-1.5 hover:opacity-90" :style="{ background: primaryColor }">OK</button>
              <button @click="editingCourseId = null" class="text-xs text-gray-500">✕</button>
            </div>
            <div v-else class="flex items-center justify-between mt-2">
              <span class="text-sm font-medium text-gray-700">CHF {{ (row.reward_rappen / 100).toFixed(2) }}</span>
              <button @click="startCourseEdit(row)" class="text-xs font-medium" :style="{ color: primaryColor }">Betrag ändern</button>
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
            <div class="text-xs text-gray-500 mt-1">Vergütete Empfehlungen</div>
          </div>
          <div class="bg-white rounded-lg border p-3 sm:p-4 text-center">
            <div class="text-xl sm:text-2xl font-bold text-gray-900">CHF {{ (overview.total_credited_rappen / 100).toFixed(0) }}</div>
            <div class="text-xs text-gray-500 mt-1">Guthaben vergeben</div>
          </div>
        </div>

        <!-- Top affiliates -->
        <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div class="p-4 border-b flex items-start justify-between gap-3">
            <div>
              <h2 class="font-bold text-gray-900">Top-Partner</h2>
              <p class="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 flex-shrink-0" :style="{ color: primaryColor }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
                </svg>
                Tippe auf einen Partner, um seine Weiterempfehlungen und den Status zu sehen.
              </p>
            </div>
          </div>

          <!-- Desktop table -->
          <table class="hidden sm:table w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Code</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Empfehlungen</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Vergütet</th>
                <th class="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="code in overview.top_codes"
                :key="code.id"
                class="hover:bg-gray-50 cursor-pointer transition-colors group"
                title="Weiterempfehlungen anzeigen"
                @click="openPartnerReferrals(code)"
              >
                <td class="px-4 py-3 font-medium text-gray-900 group-hover:underline decoration-gray-300 underline-offset-2">{{ code.user_name }}</td>
                <td class="px-4 py-3 font-mono text-xs">{{ code.code }}</td>
                <td class="px-4 py-3">
                  <span class="font-semibold" :style="{ color: primaryColor }">{{ code.total_referrals }}</span>
                </td>
                <td class="px-4 py-3">CHF {{ (code.total_credited_rappen / 100).toFixed(2) }}</td>
                <td class="px-4 py-3 text-right">
                  <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 inline-block transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile cards -->
          <div class="sm:hidden divide-y divide-gray-100">
            <button
              v-for="code in overview.top_codes"
              :key="code.id"
              type="button"
              class="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
              @click="openPartnerReferrals(code)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium text-gray-900 text-sm">{{ code.user_name }}</span>
                  <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{{ code.code }}</span>
                </div>
                <div class="flex items-center justify-between text-sm text-gray-500">
                  <span><span class="font-semibold" :style="{ color: primaryColor }">{{ code.total_referrals }}</span> Empfehlungen</span>
                  <span class="font-semibold text-gray-900">CHF {{ (code.total_credited_rappen / 100).toFixed(2) }}</span>
                </div>
              </div>
              <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Referrals detail modal -->
        <Teleport to="body">
          <div
            v-if="referralsModalOpen"
            class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            @keydown.escape="closePartnerReferrals"
          >
            <div class="absolute inset-0 bg-black/40" @click="closePartnerReferrals" />
            <div class="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
              <div class="flex items-start justify-between gap-3 p-4 sm:p-5 border-b">
                <div class="min-w-0">
                  <h3 class="text-base font-bold text-gray-900 truncate">{{ referralsPartner?.user_name }}</h3>
                  <p class="text-xs text-gray-500 mt-0.5">
                    Code <span class="font-mono">{{ referralsPartner?.code }}</span>
                    · Weiterempfehlungen
                  </p>
                </div>
                <button
                  type="button"
                  class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  aria-label="Schliessen"
                  @click="closePartnerReferrals"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div class="overflow-y-auto flex-1 p-4 sm:p-5">
                <div v-if="referralsLoading" class="space-y-3">
                  <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-gray-100 animate-pulse" />
                </div>
                <div v-else-if="referralsError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {{ referralsError }}
                </div>
                <div v-else-if="!partnerReferrals.length" class="text-center py-10 text-sm text-gray-400">
                  Noch keine Weiterempfehlungen für diesen Code.
                </div>
                <ul v-else class="space-y-3">
                  <li
                    v-for="ref in partnerReferrals"
                    :key="ref.id"
                    class="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-medium text-gray-900 text-sm truncate">{{ ref.referred_name }}</p>
                        <p v-if="ref.referred_email" class="text-xs text-gray-400 truncate mt-0.5">{{ ref.referred_email }}</p>
                      </div>
                      <span
                        class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold"
                        :class="referralStatusClass(ref.status)"
                      >
                        {{ referralStatusLabel(ref.status) }}
                      </span>
                    </div>
                    <div class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>Erfasst {{ formatDate(ref.created_at) }}</span>
                      <span v-if="ref.credited_at">· Vergütet {{ formatDate(ref.credited_at) }}</span>
                      <span v-if="ref.rewards_total_rappen > 0" class="font-semibold text-gray-800">
                        · CHF {{ (ref.rewards_total_rappen / 100).toFixed(2) }}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ middleware: 'admin', layout: 'admin' })

const authStore = useAuthStore()
const { primaryColor } = useTenantBranding()
const { t } = useTerminology()

const tabs = [
  { id: 'settings', label: 'Einstellungen' },
  { id: 'categories', label: 'Fahrkategorien' },
  { id: 'courses', label: 'Kursarten' },
  { id: 'payouts', label: 'Auszahlungen' },
  { id: 'overview', label: 'Übersicht' },
]
const activeTab = ref('settings')

const featureLoading = ref(true)
const featureBlocked = ref(false)
const affiliatePriceLabel = ref<string | null>(null)
const affiliateCtaLabel = computed(() =>
  affiliatePriceLabel.value
    ? `Jetzt aktivieren · ${affiliatePriceLabel.value}/Mt.`
    : 'Jetzt aktivieren'
)
const affiliateFeatures = computed(() => [
  `Erfolgsbasiert: Reward nur bei bezahlter erster ${t.value.appointment}`,
  'Persönliche Links für Schüler:innen und Staff',
  'Rewards pro Fahrkategorie und Kurs konfigurierbar',
  'Auszahlungen prüfen und freigeben im Admin',
])

async function loadAffiliatePriceHint() {
  try {
    const pricing = await $fetch<{ addons?: Record<string, { unitAmount?: number }> }>('/api/stripe/prices')
    const rappen = pricing?.addons?.affiliate?.unitAmount
    if (!rappen || rappen <= 0) return
    const amount = rappen / 100
    affiliatePriceLabel.value = `CHF ${Number.isInteger(amount) ? amount : amount.toFixed(2)}.–`
  } catch { /* non-critical */ }
}

const statusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  paid: 'Überwiesen',
  rejected: 'Abgelehnt',
}

// ── Settings ─────────────────────────────────────────────────────────
const affiliateEnabled = ref(true)

async function loadSettings() {
  featureLoading.value = true
  featureBlocked.value = false
  try {
    const result = await $fetch<any>('/api/affiliate/admin-settings')
    if (result.featureEnabled === false) {
      featureBlocked.value = true
      return
    }
    affiliateEnabled.value = result.data?.enabled !== false
  } catch (e: any) {
    const code = e?.statusCode ?? e?.status ?? e?.data?.statusCode
    if (code === 403) featureBlocked.value = true
  } finally {
    featureLoading.value = false
  }
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

const referralsModalOpen = ref(false)
const referralsLoading = ref(false)
const referralsError = ref<string | null>(null)
const referralsPartner = ref<{ id: string; code: string; user_name: string } | null>(null)
const partnerReferrals = ref<any[]>([])

const referralStatusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  credited: 'Vergütet',
  cancelled: 'Storniert',
  expired: 'Abgelaufen',
}

function referralStatusLabel(status: string) {
  return referralStatusLabels[status] || status
}

function referralStatusClass(status: string) {
  if (status === 'credited') return 'bg-green-100 text-green-700'
  if (status === 'pending') return 'bg-amber-100 text-amber-800'
  if (status === 'cancelled' || status === 'expired') return 'bg-gray-100 text-gray-600'
  return 'bg-blue-100 text-blue-700'
}

async function openPartnerReferrals(code: { id: string; code: string; user_name: string }) {
  referralsPartner.value = code
  referralsModalOpen.value = true
  referralsLoading.value = true
  referralsError.value = null
  partnerReferrals.value = []
  try {
    const result = await $fetch<any>('/api/affiliate/admin-referrals', {
      query: { code_id: code.id },
    })
    partnerReferrals.value = result.data?.referrals ?? []
    if (result.data?.code) {
      referralsPartner.value = {
        id: result.data.code.id,
        code: result.data.code.code,
        user_name: result.data.code.user_name,
      }
    }
  } catch (e: any) {
    referralsError.value = e?.data?.statusMessage || e?.message || 'Weiterempfehlungen konnten nicht geladen werden.'
  } finally {
    referralsLoading.value = false
  }
}

function closePartnerReferrals() {
  referralsModalOpen.value = false
  referralsPartner.value = null
  partnerReferrals.value = []
  referralsError.value = null
}

async function loadOverview() {
  loadingOverview.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/admin-overview')
    overview.value = result.data
  } finally {
    loadingOverview.value = false
  }
}

watch(activeTab, async (tab) => {
  if (tab === 'payouts' && !payoutRequests.value.length) loadPayouts()
  if (tab === 'overview') loadOverview()
  if (tab === 'categories') {
    if (!availableCourseTypes.value.length) await loadAvailableCourseTypes()
    loadCategoryRewards()
  }
  if (tab === 'courses') {
    if (!availableCourseTypes.value.length) await loadAvailableCourseTypes()
    loadCourseRewards()
  }
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
    const all = result.data ?? []
    const typeCodes = new Set(availableCourseTypes.value.map(ct => ct.code.toUpperCase()))
    // Fahrkategorien-Tab: hide Kursart codes (VKU, PGS, …)
    categoryRewards.value = all.filter((r: any) => {
      const code = String(r.driving_category || '').toUpperCase()
      return !typeCodes.has(code)
    })
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

// ── Course-type (Kursarten) Rewards ───────────────────────────────────
const courseTypeRewards = ref<any[]>([])
const loadingCourseRewards = ref(false)
const savingCourseReward = ref(false)
const courseTypesLoading = ref(false)
const courseTypesError = ref<string | null>(null)
const newCourseTypeCode = ref('')
const newCourseRewardChf = ref(50)
const editingCourseId = ref<string | null>(null)
const editingCourseChf = ref(0)

const availableCourseTypes = ref<{ code: string; name: string }[]>([])

const configuredCourseTypeCodes = computed(() =>
  new Set(
    courseTypeRewards.value
      .map((r: any) => String(r.driving_category || '').toUpperCase())
      .filter(Boolean)
  )
)

function courseTypeLabel(code: string) {
  const hit = availableCourseTypes.value.find(
    ct => ct.code.toUpperCase() === String(code || '').toUpperCase()
  )
  return hit?.name || code
}

async function loadAvailableCourseTypes() {
  courseTypesLoading.value = true
  courseTypesError.value = null
  try {
    const [catsRes, coursesRes] = await Promise.all([
      $fetch<any>('/api/admin/course-categories'),
      $fetch<any>('/api/staff/get-courses').catch(() => ({ data: [] })),
    ])

    const byCode = new Map<string, { code: string; name: string }>()

    for (const c of catsRes?.categories ?? []) {
      if (c?.is_active === false) continue
      const code = String(c.code || '').trim()
      if (!code) continue
      byCode.set(code.toUpperCase(), { code, name: c.name || code })
    }

    // Also include distinct courses.category values used in process-reward matching
    for (const course of coursesRes?.data ?? []) {
      const code = String(course.category || '').trim()
      if (!code) continue
      const key = code.toUpperCase()
      if (!byCode.has(key)) byCode.set(key, { code, name: code })
    }

    availableCourseTypes.value = [...byCode.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'de-CH')
    )

    if (!availableCourseTypes.value.length) {
      courseTypesError.value = 'Keine Kursarten gefunden. Lege unter Kurse zuerst Kursarten an.'
    }
  } catch (e: any) {
    courseTypesError.value = e?.data?.statusMessage || e?.message || 'Kursarten konnten nicht geladen werden.'
    availableCourseTypes.value = []
  } finally {
    courseTypesLoading.value = false
  }
}

async function loadCourseRewards() {
  loadingCourseRewards.value = true
  try {
    // Kursarten are stored as driving_category (same table), without course_id
    const result = await $fetch<any>('/api/affiliate/category-rewards')
    const all = result.data ?? []
    const typeCodes = new Set(availableCourseTypes.value.map(ct => ct.code.toUpperCase()))
    const licenseCodes = new Set(availableCategories.value.map(c => c.code.toUpperCase()))

    courseTypeRewards.value = all.filter((r: any) => {
      const code = String(r.driving_category || '').toUpperCase()
      if (!code) return false
      if (typeCodes.has(code)) return true
      // Orphan kursart rewards that aren't license categories either
      if (licenseCodes.size && !licenseCodes.has(code)) return true
      return false
    })
  } finally {
    loadingCourseRewards.value = false
  }
}

async function addCourseTypeReward() {
  if (!newCourseTypeCode.value) return
  savingCourseReward.value = true
  try {
    await $fetch('/api/affiliate/category-rewards', {
      method: 'POST',
      body: {
        driving_category: newCourseTypeCode.value,
        reward_rappen: newCourseRewardChf.value * 100,
      },
    })
    newCourseTypeCode.value = ''
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

async function saveCourseTypeEdit(row: any) {
  await $fetch('/api/affiliate/category-rewards', {
    method: 'POST',
    body: {
      driving_category: row.driving_category,
      reward_rappen: editingCourseChf.value * 100,
      is_active: row.is_active,
    },
  })
  editingCourseId.value = null
  await loadCourseRewards()
}

async function toggleCourseTypeActive(row: any) {
  await $fetch('/api/affiliate/category-rewards', {
    method: 'POST',
    body: {
      driving_category: row.driving_category,
      reward_rappen: row.reward_rappen,
      is_active: !row.is_active,
    },
  })
  await loadCourseRewards()
}

async function deleteCourseReward(id: string) {
  if (!confirm('Diesen Kursart-Reward wirklich löschen?')) return
  await $fetch(`/api/affiliate/category-rewards?id=${id}`, { method: 'DELETE' })
  await loadCourseRewards()
}

onMounted(async () => {
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  if (!authStore.isLoggedIn || !authStore.isAdmin) {
    featureLoading.value = false
    return
  }
  await loadSettings()
  if (featureBlocked.value) {
    await loadAffiliatePriceHint()
    return
  }
  loadPayouts()
  await Promise.all([loadAvailableCategories(), loadAvailableCourseTypes()])
})
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
