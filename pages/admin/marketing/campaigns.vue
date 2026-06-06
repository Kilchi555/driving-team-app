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
            <h1 class="text-2xl font-bold text-gray-900">Kampagnen</h1>
          </div>
          <button
            @click="openCreate"
            :disabled="templates.length === 0"
            class="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
            :style="{ background: primaryColor }"
            :title="templates.length === 0 ? 'Erstelle zuerst ein Email-Template' : ''"
          >
            + Neue Kampagne
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

      <!-- No templates warning -->
      <div v-if="!loading && templates.length === 0" class="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
        <svg class="w-5 h-5 text-orange-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="text-sm font-medium text-orange-800">Kein Email-Template vorhanden</p>
          <p class="text-sm text-orange-700 mt-0.5">
            Erstelle zuerst ein Email-Template, bevor du eine Kampagne startest.
          </p>
          <NuxtLink to="/admin/marketing/templates" class="inline-block mt-1 text-sm font-medium text-orange-800 underline">
            Template erstellen →
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="campaigns.length === 0" class="text-center py-16 bg-white rounded-xl border">
        <svg class="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <p class="text-gray-500 mb-4">Noch keine Kampagnen vorhanden</p>
        <button v-if="templates.length > 0" @click="openCreate" class="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
          :style="{ background: primaryColor }">
          Erste Kampagne erstellen
        </button>
      </div>

      <!-- Campaigns List -->
      <div v-else class="space-y-3">
        <div
          v-for="c in campaigns"
          :key="c.id"
          class="bg-white rounded-xl border p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <h3 class="font-semibold text-gray-900">{{ c.name }}</h3>
                <span :class="statusBadge(c.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ statusLabel(c.status) }}
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-1">
                Template: <span class="font-medium text-gray-700">{{ c.email_templates?.name ?? '—' }}</span>
                <span v-if="c.subject_override" class="ml-2 text-gray-400">· Betreff-Override: "{{ c.subject_override }}"</span>
              </p>
              <div v-if="c.status === 'sent' || c.status === 'pilot'" class="mt-2">
                <!-- Sent count -->
                <div class="flex flex-wrap gap-x-4 gap-y-1 items-center">
                  <span class="text-sm text-gray-600">
                    <strong class="text-gray-900">{{ c.sent_count?.toLocaleString('de-CH') ?? 0 }}</strong>
                    <span class="text-gray-400"> / {{ c.total_recipients?.toLocaleString('de-CH') ?? '?' }} gesendet</span>
                  </span>
                  <span v-if="c.bounce_count > 0" class="text-sm text-red-500"><strong>{{ c.bounce_count }}</strong> Bounces</span>
                  <span v-if="c.unsubscribe_count > 0" class="text-sm text-gray-400"><strong>{{ c.unsubscribe_count }}</strong> Abmeldungen</span>
                </div>

                <!-- No A/B: simple metrics row -->
                <template v-if="!c.template_b_id">
                  <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 items-center">
                    <span class="text-sm" :class="c.open_count > 0 ? 'text-blue-600' : 'text-gray-400'">
                      <strong>{{ c.open_count ?? 0 }}</strong> Öffnungen
                      ({{ c.sent_count ? Math.round((c.open_count ?? 0) / c.sent_count * 100) : 0 }}%)
                    </span>
                    <span class="text-sm" :class="c.click_count > 0 ? 'text-green-600' : 'text-gray-400'">
                      <strong>{{ c.click_count ?? 0 }}</strong> Klicks
                      ({{ c.sent_count ? Math.round((c.click_count ?? 0) / c.sent_count * 100) : 0 }}%)
                    </span>
                    <span class="text-sm" :class="(c.conversion_count ?? 0) > 0 ? 'text-purple-600 font-semibold' : 'text-gray-400'">
                      <strong>{{ c.conversion_count ?? 0 }}</strong> Conversions
                      ({{ c.sent_count ? ((c.conversion_count ?? 0) / c.sent_count * 100).toFixed(1) : 0 }}%)
                    </span>
                  </div>
                </template>

                <!-- A/B: side-by-side comparison -->
                <template v-else>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <!-- Variant A -->
                    <div class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs space-y-0.5">
                      <div class="font-semibold text-blue-700 mb-1">Variante A · {{ c.ab_split_pct ?? 50 }}%</div>
                      <div class="text-blue-600">Öffnungen: <strong>{{ c.open_count ?? 0 }}</strong></div>
                      <div class="text-green-600">Klicks: <strong>{{ c.click_count ?? 0 }}</strong></div>
                      <div class="text-purple-600">Conversions: <strong>{{ c.conversion_count ?? 0 }}</strong></div>
                    </div>
                    <!-- Variant B -->
                    <div class="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs space-y-0.5">
                      <div class="font-semibold text-orange-700 mb-1">Variante B · {{ 100 - (c.ab_split_pct ?? 50) }}%</div>
                      <div class="text-blue-600">Öffnungen: <strong>{{ c.open_count_b ?? 0 }}</strong></div>
                      <div class="text-green-600">Klicks: <strong>{{ c.click_count_b ?? 0 }}</strong></div>
                      <div class="text-purple-600">Conversions: <strong>{{ c.conversion_count_b ?? 0 }}</strong></div>
                    </div>
                  </div>
                </template>
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="cat in (c.segment_filter?.categories || [])"
                  :key="cat"
                  class="px-1.5 py-0.5 rounded text-xs"
                  :style="{ background: `${primaryColor}15`, color: primaryColor }"
                >{{ cat }}</span>
                <span v-if="!(c.segment_filter?.categories?.length)" class="text-xs text-gray-400">Alle aktiven Leads</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs text-gray-400">{{ formatDate(c.created_at) }}</span>
              <!-- Duplicate button (always visible) -->
              <button
                @click="duplicateCampaign(c)"
                :disabled="duplicatingId === c.id"
                class="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Kampagne duplizieren"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {{ duplicatingId === c.id ? '...' : 'Duplizieren' }}
              </button>
              <button
                v-if="c.status === 'draft'"
                @click="openSendConfirm(c)"
                class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Senden
              </button>
              <button
                v-if="c.status === 'pilot'"
                @click="openSendConfirm(c)"
                class="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                Weitere senden
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Campaign Modal -->
    <div v-if="createModalOpen" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div class="flex items-center justify-between p-6 border-b">
          <h2 class="text-lg font-semibold text-gray-900">Neue Kampagne</h2>
          <button @click="createModalOpen = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kampagnen-Name <span class="text-red-500">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="z.B. Motorrad-Saison 2026" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email-Template <span class="text-red-500">*</span></label>
            <select v-model="createForm.template_id" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2">
              <option value="">Template auswählen...</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Betreff-Override <span class="text-gray-400 font-normal">(optional)</span></label>
            <input v-model="createForm.subject_override" type="text" placeholder="Leer = Betreff aus Template verwenden" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
          </div>

          <!-- A/B Test -->
          <div class="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              @click="createForm.showAB = !createForm.showAB"
              class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-medium text-gray-700"
            >
              <span class="flex items-center gap-2">
                <span class="text-base">🧪</span>
                A/B Test
                <span class="text-gray-400 font-normal">(optional)</span>
                <span v-if="createForm.template_b_id" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Aktiv</span>
              </span>
              <svg class="w-4 h-4 text-gray-400 transition-transform" :class="createForm.showAB ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="createForm.showAB" class="p-4 space-y-4 bg-white">
              <p class="text-xs text-gray-500">Wähle eine zweite Vorlage (Variante B). Die Leads werden nach dem Split-Verhältnis aufgeteilt — Variante A bekommt die erste Template, Variante B die zweite.</p>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Variante B — Template</label>
                <select v-model="createForm.template_b_id" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2">
                  <option value="">— Kein A/B Test —</option>
                  <option v-for="t in templates" :key="t.id" :value="t.id" :disabled="t.id === createForm.template_id">{{ t.name }}</option>
                </select>
              </div>
              <div v-if="createForm.template_b_id">
                <label class="block text-xs font-medium text-gray-600 mb-1">Split: {{ createForm.ab_split_pct }}% A / {{ 100 - createForm.ab_split_pct }}% B</label>
                <input
                  v-model.number="createForm.ab_split_pct"
                  type="range" min="10" max="90" step="5"
                  class="w-full accent-purple-600"
                />
                <div class="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10% A</span><span>50/50</span><span>90% A</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Segment — Kategorien</label>
            <p class="text-xs text-gray-500 mb-2">Leer = alle aktiven Leads erhalten die Email</p>

            <!-- Multi-select dropdown -->
            <div class="relative" ref="catDropdownRef">
              <button
                type="button"
                @click="catDropdownOpen = !catDropdownOpen"
                class="tenant-focus w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 transition min-h-[38px]"
              >
                <span class="flex flex-wrap gap-1 flex-1 text-left">
                  <template v-if="createForm.categories.length === 0 || createForm.categories.length === drivingCategories.length">
                    <span class="text-gray-400">Alle Kategorien</span>
                  </template>
                  <template v-else>
                    <span
                      v-for="v in createForm.categories"
                      :key="v"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      :style="{ background: `${primaryColor}1f`, color: primaryColor }"
                    >
                      {{ drivingCategories.find(d => d.value === v)?.label || v }}
                      <span
                        @click.stop="createForm.categories = createForm.categories.filter(c => c !== v)"
                        class="cursor-pointer hover:opacity-70 leading-none"
                      >×</span>
                    </span>
                  </template>
                </span>
                <svg class="w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform" :class="catDropdownOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown list -->
              <div
                v-if="catDropdownOpen"
                class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto"
              >
                <!-- Select all -->
                <label class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                  <input
                    type="checkbox"
                    :checked="createForm.categories.length === drivingCategories.length"
                    :indeterminate="createForm.categories.length > 0 && createForm.categories.length < drivingCategories.length"
                    @change="createForm.categories.length === drivingCategories.length ? createForm.categories = [] : createForm.categories = drivingCategories.map(d => d.value)"
                    class="rounded border-gray-300"
                    :style="{ accentColor: primaryColor }"
                  />
                  <span class="text-sm font-medium text-gray-900">Alle auswählen</span>
                </label>
                <label
                  v-for="cat in drivingCategories"
                  :key="cat.value"
                  class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :value="cat.value"
                    v-model="createForm.categories"
                    class="rounded border-gray-300"
                    :style="{ accentColor: primaryColor }"
                  />
                  <span class="text-sm text-gray-700">{{ cat.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Discount code section -->
          <div class="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              @click="createForm.showDiscount = !createForm.showDiscount"
              class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-medium text-gray-700"
            >
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Rabattcode anhängen
                <span class="text-gray-400 font-normal">(optional)</span>
              </span>
              <span v-if="createForm.discount_code" class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-mono font-bold">{{ createForm.discount_code }}</span>
              <svg class="w-4 h-4 text-gray-400 transition-transform" :class="createForm.showDiscount ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-if="createForm.showDiscount" class="p-4 space-y-3">
              <p class="text-xs text-gray-500">
                Wähle einen bestehenden Code oder erstelle direkt einen neuen.
                Im Template mit <code class="bg-gray-100 px-1 rounded font-mono">&#123;&#123;discount_code&#125;&#125;</code> einfügen.
              </p>

              <!-- Existing discount codes -->
              <div v-if="discounts.length > 0">
                <label class="block text-xs font-medium text-gray-600 mb-1">Bestehender Code</label>
                <select
                  v-model="createForm.discount_code"
                  class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                >
                  <option value="">— Kein Code —</option>
                  <option v-for="d in discounts" :key="d.id" :value="d.code">
                    {{ d.code }} · {{ d.name }} · {{ d.discount_type === 'percentage' ? d.discount_value + '%' : 'CHF ' + (d.discount_value / 100).toFixed(2) }}
                  </option>
                </select>
              </div>

              <div v-else class="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                Noch keine Rabattcodes vorhanden.
              </div>

              <button
                type="button"
                @click="quickCreateDiscountOpen = true"
                class="flex items-center gap-2 text-sm hover:opacity-70 font-medium"
                :style="{ color: primaryColor }"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Neuen Rabattcode erstellen
              </button>
            </div>
          </div>

          <!-- Estimated recipients -->
          <div v-if="estimatedCount !== null" class="rounded-lg p-3 text-sm"
            :style="{ background: `${primaryColor}10` }">
            <span :style="{ color: primaryColor }">
              Geschätzte Empfänger: <strong>{{ estimatedCount.toLocaleString('de-CH') }}</strong> Leads
              <span v-if="createForm.categories.length"> in den Kategorien {{ createForm.categories.map(v => drivingCategories.find(d => d.value === v)?.label || v).join(', ') }}</span>
            </span>
          </div>
        </div>

        <div class="flex justify-end gap-2 p-6 border-t">
          <button @click="createModalOpen = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button
            @click="createCampaign"
            :disabled="saving || !createForm.name || !createForm.template_id"
            class="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            :style="{ background: primaryColor }"
          >
            {{ saving ? 'Erstelle...' : 'Kampagne erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Quick-Create Discount Modal (nested) -->
    <DiscountEditorModal
      v-if="quickCreateDiscountOpen"
      :is-edit="false"
      @close="quickCreateDiscountOpen = false"
      @saved="onDiscountSaved"
    />

    <!-- Send Confirmation Modal -->
    <div v-if="sendConfirmCampaign" class="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full my-8">

        <div class="p-6 border-b flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Kampagne senden?</h2>
            <p class="text-sm text-gray-600 mt-1">
              <strong>{{ sendConfirmCampaign.name }}</strong><br>
              Die Emails werden sofort in die Versand-Warteschlange eingereiht.
              <span class="text-orange-600 font-medium">Nicht rückgängig machbar.</span>
            </p>
            <div v-if="sendConfirmCampaign.segment_filter?.discount_code" class="mt-2 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1 text-xs font-medium text-orange-700">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
              Rabattcode: {{ sendConfirmCampaign.segment_filter.discount_code }}
            </div>
          </div>
        </div>

        <!-- Recipients preview -->
        <div class="px-6 py-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-gray-700">Empfänger</span>
            <span v-if="!recipientsLoading" class="text-sm font-bold text-gray-900">
              {{ recipients.length }} Lead{{ recipients.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <div v-if="recipientsLoading" class="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Lade Empfänger...
          </div>

          <div v-else-if="recipients.length === 0" class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            ⚠️ Keine aktiven Leads für dieses Segment gefunden. Die Kampagne wird niemanden erreichen.
          </div>

          <div v-else class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="max-h-52 overflow-y-auto divide-y divide-gray-100">
              <div
                v-for="r in recipients"
                :key="r.id"
                class="flex items-center gap-3 px-4 py-2.5"
              >
                <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                  {{ (r.first_name?.[0] || r.email[0]).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-gray-900 truncate">
                    {{ r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : r.email }}
                  </div>
                  <div class="text-xs text-gray-400 truncate">{{ r.email }}</div>
                </div>
                <div class="flex gap-1 shrink-0">
                  <span v-for="cat in (r.categories || []).slice(0, 2)" :key="cat" class="text-xs px-1.5 py-0.5 rounded"
                    :style="{ background: `${primaryColor}15`, color: primaryColor }">{{ cat }}</span>
                </div>
              </div>
            </div>
            <div v-if="recipientsTotal > recipients.length" class="px-4 py-2 bg-gray-50 text-xs text-gray-400 text-center border-t">
              + {{ recipientsTotal - recipients.length }} weitere Empfänger (nur erste 50 angezeigt)
            </div>
          </div>
        </div>

        <!-- Daily limit + Test email section -->
        <div v-if="!sendResult" class="px-6 pb-4 space-y-4">

          <!-- Pilot vs. Alles senden -->
          <div class="bg-orange-50 border border-orange-200 rounded-xl p-4" v-if="sendConfirmCampaign?.status !== 'pilot'">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-semibold text-orange-900">Versand-Modus</span>
            </div>
            <div class="space-y-2">
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="radio" :value="true" v-model="pilotMode" class="mt-0.5 text-orange-600" />
                <div>
                  <span class="text-sm font-medium text-gray-900">Pilot-Versand</span>
                  <p class="text-xs text-gray-500">Sende nur X Emails, Kampagne bleibt offen. Danach kannst du anpassen und weitersenden.</p>
                  <div v-if="pilotMode" class="mt-2">
                    <select v-model="pilotLimit" class="w-full px-2 py-1.5 border border-orange-300 rounded-lg text-sm bg-white">
                      <option :value="100">100 Emails</option>
                      <option :value="250">250 Emails</option>
                      <option :value="500">500 Emails</option>
                      <option :value="1000">1000 Emails</option>
                    </select>
                  </div>
                </div>
              </label>
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="radio" :value="false" v-model="pilotMode" class="mt-0.5 text-orange-600" />
                <div>
                  <span class="text-sm font-medium text-gray-900">Alle senden</span>
                  <p class="text-xs text-gray-500">Alle Leads erhalten die Email. Kampagne wird danach als "Gesendet" markiert.</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Tagesrate (nur bei "Alle senden") -->
          <div v-if="!pilotMode" class="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-blue-900">Tagesrate (Spam-Schutz)</span>
              <span class="text-xs text-blue-600 font-medium">
                {{ dailyLimit > 0 && recipientsTotal > dailyLimit
                  ? `ca. ${Math.ceil(recipientsTotal / dailyLimit)} Tage`
                  : 'Alles heute' }}
              </span>
            </div>
            <select v-model="dailyLimit" class="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none">
              <option :value="100">100 / Tag</option>
              <option :value="250">250 / Tag</option>
              <option :value="500">500 / Tag (empfohlen)</option>
              <option :value="1000">1000 / Tag</option>
              <option :value="0">Keine Begrenzung (alle sofort)</option>
            </select>
            <p v-if="dailyLimit > 0 && recipientsTotal > dailyLimit" class="text-xs text-blue-600 mt-2">
              {{ dailyLimit }} heute, {{ dailyLimit }} morgen, usw. — wird automatisch auf Folgetage verteilt.
            </p>
          </div>

          <!-- Test Email -->
          <div class="border border-gray-200 rounded-xl p-4">
            <p class="text-sm font-semibold text-gray-700 mb-2">Test-Email senden</p>
            <div class="flex gap-2">
              <input
                v-model="testEmailAddress"
                type="email"
                placeholder="test@example.com"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                @click="sendTestEmail"
                :disabled="testEmailSending || !testEmailAddress"
                class="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <svg v-if="testEmailSending" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ testEmailSending ? '...' : 'Senden' }}
              </button>
            </div>
            <p v-if="testEmailResult === 'ok'" class="text-xs text-green-600 mt-1.5">✅ Test-Email gesendet!</p>
            <p v-if="testEmailResult === 'error'" class="text-xs text-red-600 mt-1.5">❌ Fehler beim Senden.</p>
          </div>
        </div>

        <div v-if="sendResult" class="mx-6 mb-4 rounded-xl p-4" :class="sendResult.status === 'pilot' ? 'bg-orange-50' : 'bg-green-50'">
          <p class="text-sm font-medium" :class="sendResult.status === 'pilot' ? 'text-orange-800' : 'text-green-800'">
            <template v-if="sendResult.status === 'pilot'">
              🚀 Pilot gesendet: {{ sendResult.queuedCount }} Emails in der Warteschlange.<br>
              <span class="font-normal">Noch {{ sendResult.remainingCount }} Leads ausstehend. Passe das Template an und klicke "Weitere senden" wenn du bereit bist.</span>
            </template>
            <template v-else>
              ✅ {{ sendResult.queuedCount }} Emails erfolgreich in die Warteschlange eingereiht.
              <span v-if="dailyLimit > 0 && sendResult.queuedCount > dailyLimit" class="block mt-1">
                📅 Verteilt über {{ Math.ceil(sendResult.queuedCount / dailyLimit) }} Tage à {{ dailyLimit }}/Tag.
              </span>
            </template>
          </p>
        </div>

        <div class="flex justify-end gap-2 p-6 border-t">
          <button @click="sendConfirmCampaign = null; sendResult = null; recipients = []" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            {{ sendResult ? 'Schliessen' : 'Abbrechen' }}
          </button>
          <button
            v-if="!sendResult"
            @click="sendCampaign"
            :disabled="sending || recipients.length === 0"
            class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg v-if="sending" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ sending ? 'Sendet...' : pilotMode ? `Pilot: ${pilotLimit} Emails senden` : `Ja, an ${recipients.length} Leads senden` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useHead } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Kampagnen - Marketing - Admin' })

const authStore = useAuthStore()
const { primaryColor } = useTenantBranding()

const drivingCategories = ref<{ value: string; label: string }[]>([])
const catDropdownOpen = ref(false)
const catDropdownRef = ref<HTMLElement | null>(null)

const campaigns = ref<any[]>([])
const templates = ref<any[]>([])
const discounts = ref<any[]>([])
const loading = ref(true)

const createModalOpen = ref(false)
const quickCreateDiscountOpen = ref(false)
const saving = ref(false)
const createForm = reactive({
  name: '',
  template_id: '',
  subject_override: '',
  categories: [] as string[],
  showDiscount: false,
  discount_code: '',
  showAB: false,
  template_b_id: '',
  ab_split_pct: 50,
})

const sendConfirmCampaign = ref<any>(null)
const sending = ref(false)
const sendResult = ref<any>(null)
const recipients = ref<any[]>([])
const recipientsTotal = ref(0)
const recipientsLoading = ref(false)
const duplicatingId = ref<string | null>(null)
const dailyLimit = ref(500)
const pilotMode = ref(false)
const pilotLimit = ref(500)
const testEmailAddress = ref('')
const testEmailSending = ref(false)
const testEmailResult = ref<'ok' | 'error' | null>(null)

const estimatedCount = ref<number | null>(null)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function statusLabel(status: string) {
  return { draft: 'Entwurf', sending: 'Wird gesendet', sent: 'Gesendet', pilot: 'Pilot laufend', failed: 'Fehlgeschlagen' }[status] ?? status
}

function statusBadge(status: string) {
  return {
    draft: 'bg-gray-100 text-gray-600',
    sending: 'bg-blue-100 text-blue-700',
    sent: 'bg-green-100 text-green-700',
    pilot: 'bg-orange-100 text-orange-700',
    failed: 'bg-red-100 text-red-700',
  }[status] ?? 'bg-gray-100 text-gray-600'
}

async function loadData() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  loading.value = true
  try {
    const [c, t, cats] = await Promise.all([
      $fetch<any>('/api/marketing/campaigns', { query: { tenantId } }),
      $fetch<any>('/api/marketing/templates', { query: { tenantId } }),
      $fetch<any>('/api/marketing/lead-categories', { query: { tenantId } }).catch(() => ({ categories: [] })),
    ])
    drivingCategories.value = (cats?.categories || [])
      .map((c: any) => ({ value: c.code, label: c.name }))
    campaigns.value = c.campaigns
    templates.value = t.templates
  } finally {
    loading.value = false
  }
}

async function loadDiscounts() {
  try {
    const res = await $fetch<any>('/api/discounts/list')
    discounts.value = (res.discounts ?? res ?? []).filter((d: any) => d.is_active && d.code)
  } catch {
    discounts.value = []
  }
}

async function onDiscountSaved() {
  quickCreateDiscountOpen.value = false
  await loadDiscounts()
  // Auto-select the newest code
  if (discounts.value.length > 0) {
    createForm.discount_code = discounts.value[discounts.value.length - 1].code
  }
}

async function loadEstimatedCount() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  try {
    const cats = createForm.categories
    const statusFilter = 'not_unsubscribed'
    if (cats.length === 0) {
      const res = await $fetch<any>('/api/marketing/leads', {
        query: { tenantId, status: statusFilter, limit: 1 },
      })
      estimatedCount.value = res.total
    } else if (cats.length === 1) {
      const res = await $fetch<any>('/api/marketing/leads', {
        query: { tenantId, status: statusFilter, category: cats[0], limit: 1 },
      })
      estimatedCount.value = res.total
    } else {
      // Multiple categories — fetch all and count client-side
      const res = await $fetch<any>('/api/marketing/leads', {
        query: { tenantId, status: statusFilter, limit: 10000 },
      })
      const all: any[] = res.leads ?? []
      estimatedCount.value = all.filter((l: any) =>
        cats.some((c: string) => l.categories?.includes(c))
      ).length
    }
  } catch {
    estimatedCount.value = null
  }
}

function openCreate() {
  createForm.name = ''
  createForm.template_id = ''
  createForm.subject_override = ''
  createForm.categories = []
  createForm.showDiscount = false
  createForm.discount_code = ''
  createForm.showAB = false
  createForm.template_b_id = ''
  createForm.ab_split_pct = 50
  estimatedCount.value = null
  createModalOpen.value = true
  loadEstimatedCount()
  loadDiscounts()
}

watch(() => createForm.categories, loadEstimatedCount, { deep: true })

async function createCampaign() {
  const tenantId = authStore.userProfile?.tenant_id
  const userId = authStore.userProfile?.id
  if (!tenantId || !createForm.name || !createForm.template_id) return
  saving.value = true
  try {
    const segment_filter: Record<string, any> = {}
    if (createForm.categories.length) segment_filter.categories = createForm.categories
    if (createForm.discount_code) segment_filter.discount_code = createForm.discount_code

    await $fetch('/api/marketing/campaigns', {
      method: 'POST',
      body: {
        tenantId,
        createdBy: userId,
        name: createForm.name,
        template_id: createForm.template_id,
        subject_override: createForm.subject_override || null,
        segment_filter,
        template_b_id: createForm.template_b_id || null,
        ab_split_pct: createForm.template_b_id ? createForm.ab_split_pct : 50,
      },
    })
    createModalOpen.value = false
    await loadData()
  } finally {
    saving.value = false
  }
}

async function duplicateCampaign(campaign: any) {
  const tenantId = authStore.userProfile?.tenant_id
  const userId = authStore.userProfile?.id
  if (!tenantId) return
  duplicatingId.value = campaign.id
  try {
    const now = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    await $fetch('/api/marketing/campaigns', {
      method: 'POST',
      body: {
        tenantId,
        createdBy: userId,
        name: `${campaign.name} (Kopie ${now})`,
        template_id: campaign.template_id,
        subject_override: campaign.subject_override || null,
        segment_filter: campaign.segment_filter || {},
      },
    })
    await loadData()
  } catch (err: any) {
    alert(`Fehler beim Duplizieren: ${err.message || 'Unbekannter Fehler'}`)
  } finally {
    duplicatingId.value = null
  }
}

async function sendTestEmail() {
  if (!sendConfirmCampaign.value || !testEmailAddress.value) return
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  testEmailSending.value = true
  testEmailResult.value = null
  try {
    await $fetch('/api/marketing/send-preview', {
      method: 'POST',
      body: { to: testEmailAddress.value, campaignId: sendConfirmCampaign.value.id, tenantId },
    })
    testEmailResult.value = 'ok'
  } catch {
    testEmailResult.value = 'error'
  } finally {
    testEmailSending.value = false
  }
}

async function openSendConfirm(campaign: any) {
  sendConfirmCampaign.value = campaign
  sendResult.value = null
  testEmailResult.value = null
  testEmailAddress.value = ''
  pilotMode.value = campaign.status !== 'pilot' // default to pilot for fresh drafts, off for continuations
  recipients.value = []
  recipientsTotal.value = 0
  recipientsLoading.value = true

  try {
    const tenantId = authStore.userProfile?.tenant_id
    const filter = campaign.segment_filter || {}
    const res = await $fetch<any>('/api/marketing/leads', {
      query: {
        tenantId,
        status: 'active',
        category: filter.categories?.[0] || undefined,
        limit: 50,
      },
    })
    const cats: string[] = filter.categories || []
    const all: any[] = res.leads ?? []
    recipients.value = cats.length
      ? all.filter((l: any) => cats.some((c: string) => l.categories?.includes(c)))
      : all
    recipientsTotal.value = res.total ?? recipients.value.length
  } catch {
    recipients.value = []
  } finally {
    recipientsLoading.value = false
  }
}

async function sendCampaign() {
  if (!sendConfirmCampaign.value) return
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  sending.value = true
  try {
    const res = await $fetch<any>(`/api/marketing/campaigns/${sendConfirmCampaign.value.id}/send`, {
      method: 'POST',
      body: {
        tenantId,
        dailyLimit: !pilotMode.value && dailyLimit.value > 0 ? dailyLimit.value : null,
        pilotLimit: pilotMode.value ? pilotLimit.value : null,
      },
    })
    sendResult.value = res
    await loadData()
  } catch (err: any) {
    alert(`Fehler beim Senden: ${err.message || 'Unbekannter Fehler'}`)
  } finally {
    sending.value = false
  }
}

function onClickOutsideCatDropdown(e: MouseEvent) {
  if (catDropdownRef.value && !catDropdownRef.value.contains(e.target as Node)) {
    catDropdownOpen.value = false
  }
}

onMounted(() => {
  loadData()
  document.addEventListener('mousedown', onClickOutsideCatDropdown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutsideCatDropdown)
})

</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
</style>
