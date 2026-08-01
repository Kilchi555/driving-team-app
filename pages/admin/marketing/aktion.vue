<template>
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </NuxtLink>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Aktion starten</h1>
            <p class="text-sm text-gray-500">In wenigen Schritten Werbung für dein Angebot erstellen</p>
          </div>
        </div>

        <!-- Steps -->
        <div class="mt-5 flex items-center gap-1 sm:gap-2">
          <template v-for="(s, i) in steps" :key="s.id">
            <button
              type="button"
              class="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded-full transition"
              :class="step === s.id
                ? 'text-white'
                : step > s.id
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-500'"
              :style="step === s.id ? { background: primaryColor } : {}"
              :disabled="s.id > maxReached"
              @click="s.id <= maxReached && (step = s.id)"
            >
              <span
                class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                :class="step === s.id ? 'bg-white/20' : step > s.id ? 'bg-green-100' : 'bg-gray-200'"
              >{{ step > s.id ? '✓' : i + 1 }}</span>
              <span class="hidden sm:inline">{{ s.label }}</span>
            </button>
            <div v-if="i < steps.length - 1" class="flex-1 h-px bg-gray-200 max-w-8" />
          </template>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Step 1: Theme -->
      <div v-if="step === 1" class="space-y-6">
        <div v-if="suggestions.length" class="space-y-3">
          <h2 class="text-lg font-semibold text-gray-900">Dein Angebot</h2>
          <p class="text-sm text-gray-500">Basierend auf deinen Kurs- und Fahrkategorien — nur was du wirklich anbietest.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="s in suggestions"
              :key="s.id"
              type="button"
              class="text-left p-4 rounded-2xl border-2 bg-white transition hover:shadow-sm"
              :class="selectedSuggestionId === s.id ? 'border-transparent ring-2' : 'border-gray-200'"
              :style="selectedSuggestionId === s.id ? { '--tw-ring-color': primaryColor, borderColor: primaryColor } : {}"
              @click="selectSuggestion(s)"
            >
              <div class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {{ s.kind === 'course_category' ? 'Kurs' : 'Fahrkategorie' }}
              </div>
              <div class="font-semibold text-gray-900 mt-0.5">{{ s.title }}</div>
              <p class="text-sm text-gray-500 mt-1">{{ s.description }}</p>
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-gray-900">{{ suggestions.length ? 'Weitere Aktionen' : 'Was willst du bewerben?' }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="theme in themes"
              :key="theme.key"
              type="button"
              class="text-left p-5 rounded-2xl border-2 bg-white transition hover:shadow-sm"
              :class="form.themeKey === theme.key && !selectedSuggestionId ? 'border-transparent ring-2' : 'border-gray-200'"
              :style="form.themeKey === theme.key && !selectedSuggestionId ? { '--tw-ring-color': primaryColor, borderColor: primaryColor } : {}"
              @click="selectTheme(theme.key)"
            >
              <div class="font-semibold text-gray-900">{{ theme.title }}</div>
              <p class="text-sm text-gray-500 mt-1">{{ theme.description }}</p>
            </button>
          </div>
          <p v-if="!themes.length && !suggestions.length" class="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
            Für deinen Tenant sind aktuell keine Marketing-Themen freigeschaltet. Prüfe Features (Kurse, Rabatte, Affiliate) und Business-Type.
          </p>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="button"
            class="px-5 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            :style="{ background: primaryColor }"
            :disabled="!form.themeKey"
            @click="go(2)"
          >Weiter</button>
        </div>
      </div>

      <!-- Step 2: Offer -->
      <div v-else-if="step === 2" class="space-y-6">
        <h2 class="text-lg font-semibold text-gray-900">Angebot festlegen</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Titel der Aktion</label>
          <input v-model="form.title" type="text" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" placeholder="z. B. Sommeraktion 50%" />
        </div>

        <!-- Discount fields -->
        <div v-if="form.themeKey === 'discount_promo' || form.themeKey === 'course' || form.themeKey === 'category'" class="bg-white border rounded-2xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Rabatt</h3>
            <label v-if="form.themeKey !== 'discount_promo'" class="flex items-center gap-2 text-sm text-gray-600">
              <input v-model="form.includeDiscount" type="checkbox" class="rounded border-gray-300" />
              Rabatt anhängen
            </label>
          </div>

          <div v-if="form.themeKey === 'discount_promo' || form.includeDiscount" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Typ</label>
                <select v-model="form.discountType" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white">
                  <option value="percentage">Prozent (%)</option>
                  <option value="fixed">Fester Betrag (CHF)</option>
                  <option value="free_lesson">Freistunde</option>
                </select>
              </div>
              <div v-if="form.discountType !== 'free_lesson'">
                <label class="block text-xs font-medium text-gray-500 mb-1">Wert</label>
                <input v-model.number="form.discountValue" type="number" min="0" :max="form.discountType === 'percentage' ? 100 : 9999" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Gültigkeit</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="p in validityPresets"
                  :key="p.value"
                  type="button"
                  class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                  :class="form.validityPreset === p.value ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'"
                  :style="form.validityPreset === p.value ? { background: primaryColor } : {}"
                  @click="form.validityPreset = p.value"
                >{{ p.label }}</button>
              </div>
              <input
                v-if="form.validityPreset === 'custom'"
                v-model="form.validUntil"
                type="date"
                class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Code</label>
                <div class="flex gap-2">
                  <input v-model="form.discountCode" type="text" class="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase" placeholder="AUTO" />
                  <button type="button" class="px-3 py-2 text-sm border rounded-xl bg-gray-50 hover:bg-gray-100" @click="regenCode">Neu</button>
                </div>
              </div>
              <label class="flex items-center gap-2 text-sm text-gray-700 mt-5">
                <input v-model="form.firstLessonOnly" type="checkbox" class="rounded border-gray-300" />
                Nur erste Fahrstunde
              </label>
            </div>
          </div>
        </div>

        <!-- Course picker -->
        <div v-if="form.themeKey === 'course'" class="bg-white border rounded-2xl p-5 space-y-3">
          <h3 class="font-semibold text-gray-900">Kurs wählen</h3>
          <p v-if="courseCategoryFilter" class="text-xs text-gray-500">
            Gefiltert nach: <strong>{{ suggestions.find(s => s.id === selectedSuggestionId)?.categoryLabel || courseCategoryFilter }}</strong>
            <button type="button" class="ml-2 underline" @click="courseCategoryFilter = null">Alle Kurse</button>
          </p>
          <p v-if="loadingCourses" class="text-sm text-gray-500">Kurse werden geladen…</p>
          <select v-else v-model="form.courseId" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white">
            <option value="">— Kurs wählen —</option>
            <option v-for="c in courses" :key="c.id" :value="c.id">
              {{ c.name }}{{ courseDateLabel(c) ? ` · ${courseDateLabel(c)}` : '' }}{{ c.price_per_participant_rappen != null ? ` · CHF ${(c.price_per_participant_rappen / 100).toFixed(2)}` : '' }}
            </option>
          </select>
          <p v-if="!loadingCourses && courses.length === 0" class="text-sm text-amber-700">
            Keine offenen Kurse{{ courseCategoryFilter ? ' in dieser Kategorie' : '' }} gefunden.
          </p>
        </div>

        <!-- Category picker -->
        <div v-if="form.themeKey === 'category' || (form.themeKey === 'discount_promo' && form.firstLessonOnly === false)" class="bg-white border rounded-2xl p-5 space-y-3">
          <h3 class="font-semibold text-gray-900">{{ form.themeKey === 'category' ? 'Kategorie' : 'Optional: Kategorie-Filter' }}</h3>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="cat in drivingCategories"
              :key="cat.value"
              type="button"
              class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
              :class="form.categoryCode === cat.value ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'"
              :style="form.categoryCode === cat.value ? { background: primaryColor } : {}"
              @click="form.categoryCode = form.categoryCode === cat.value ? '' : cat.value"
            >{{ cat.label }}</button>
          </div>
        </div>

        <div v-if="form.themeKey === 'affiliate'" class="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-sm text-indigo-900">
          Der CTA führt auf deine Partner-Seite <code class="bg-white/70 px-1 rounded">/partner/{{ tenantSlug }}</code>. Kein Rabattcode nötig.
        </div>

        <div class="flex justify-between pt-2">
          <button type="button" class="px-4 py-2.5 text-sm text-gray-600" @click="go(1)">Zurück</button>
          <button
            type="button"
            class="px-5 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            :style="{ background: primaryColor }"
            :disabled="!canProceedOffer"
            @click="go(3)"
          >Weiter</button>
        </div>
      </div>

      <!-- Step 3: Creative -->
      <div v-else-if="step === 3" class="space-y-5">
        <h2 class="text-lg font-semibold text-gray-900">Text wählen</h2>
        <div class="grid grid-cols-1 gap-3">
          <button
            v-for="c in currentCreatives"
            :key="c.id"
            type="button"
            class="text-left p-4 rounded-2xl border-2 bg-white transition"
            :class="form.creativeId === c.id ? 'ring-2 border-transparent' : 'border-gray-200'"
            :style="form.creativeId === c.id ? { '--tw-ring-color': primaryColor } : {}"
            @click="pickCreative(c)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">{{ c.label }}</span>
              <span v-if="form.creativeId === c.id" class="text-xs font-medium" :style="{ color: primaryColor }">Ausgewählt</span>
            </div>
            <p class="mt-1 text-sm font-medium text-gray-900">{{ previewSubject(c.subject) }}</p>
          </button>
        </div>

        <div class="bg-white border rounded-2xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Anpassen</h3>
            <button
              type="button"
              class="text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
              :disabled="aiRewriting || !form.creativeId"
              @click="rewriteWithAi"
            >{{ aiRewriting ? 'KI schreibt…' : 'KI umschreiben' }}</button>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Betreff</label>
            <input v-model="form.subject" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" placeholder="Betreff" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Nachricht</label>
            <AdminMarketingRichTextEditor
              :key="'body-' + (form.creativeId || 'empty')"
              v-model="form.htmlBody"
              :primary-color="primaryColor"
            />
          </div>
          <div class="border rounded-xl p-4 bg-gray-50">
            <p class="text-xs text-gray-400 mb-2">Vorschau (mit Platzhaltern ersetzt) — nur Lesen</p>
            <p class="text-sm font-semibold text-gray-900 mb-2">{{ previewSubject(form.subject) }}</p>
            <div class="text-sm text-gray-700 prose prose-sm max-w-none" v-html="previewHtml" />
          </div>
        </div>

        <div class="flex justify-between pt-2">
          <button type="button" class="px-4 py-2.5 text-sm text-gray-600" @click="go(2)">Zurück</button>
          <button
            type="button"
            class="px-5 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            :style="{ background: primaryColor }"
            :disabled="!form.creativeId || !form.subject || !form.htmlBody"
            @click="go(4)"
          >Weiter</button>
        </div>
      </div>

      <!-- Step 4: Audience -->
      <div v-else-if="step === 4" class="space-y-5">
        <h2 class="text-lg font-semibold text-gray-900">An wen?</h2>
        <div class="bg-white border rounded-2xl p-5 space-y-4">
          <div>
            <p class="text-sm font-medium text-gray-800 mb-1">Einschliessen</p>
            <p class="text-xs text-gray-500 mb-2">Nur Leads mit mindestens einer dieser Kategorien (leer = alle).</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="cat in leadCategories"
                :key="'inc-' + cat.value"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                :class="form.segmentCategories.includes(cat.value) ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'"
                :style="form.segmentCategories.includes(cat.value) ? { background: primaryColor } : {}"
                @click="toggleSegment(cat.value)"
              >{{ cat.label }}</button>
            </div>
          </div>

          <div class="border-t pt-4">
            <p class="text-sm font-medium text-gray-800 mb-1">Ausschliessen</p>
            <p class="text-xs text-gray-500 mb-2">z. B. «nicht PGS» — Leads mit diesen Kategorien bekommen keine Mail.</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="cat in leadCategories"
                :key="'exc-' + cat.value"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                :class="form.excludeCategories.includes(cat.value) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200'"
                @click="toggleExclude(cat.value)"
              >nicht {{ cat.label }}</button>
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700 border-t pt-4">
            <input v-model="form.clientsOnly" type="checkbox" class="rounded border-gray-300" />
            Nur Kunden (Tag <code class="text-xs bg-gray-100 px-1 rounded">client</code>)
          </label>

          <p v-if="!leadCategories.length" class="text-sm text-gray-400">Keine Kategorien geladen.</p>
          <p class="text-sm text-gray-600">
            Geschätzt: <strong>{{ estimatedCount ?? '…' }}</strong> Empfänger
            <span v-if="form.segmentCategories.length" class="text-gray-400"> · inkl. {{ form.segmentCategories.join(', ') }}</span>
            <span v-if="form.excludeCategories.length" class="text-red-500/80"> · exkl. {{ form.excludeCategories.join(', ') }}</span>
          </p>
          <p v-if="estimatedCount === 0 && (form.segmentCategories.length || form.excludeCategories.length)" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Keine passenden Leads. Kategorien unter Marketing → Leads setzen oder Filter anpassen.
          </p>

          <div class="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
            <div>
              <label class="block text-sm font-semibold text-gray-900 mb-0.5">Wie viele Mails jetzt senden?</label>
              <p class="text-xs text-gray-600 leading-relaxed">
                Empfehlung: zuerst eine kleine <strong>Testmenge</strong> (z. B. 50), Reaktion prüfen, danach den Rest nachsenden.
                Leer = <strong>alle</strong> Empfänger — aber max. <strong>500 pro Tag</strong> (automatisch über mehrere Tage verteilt).
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="n in [50, 100, 200, 500]"
                :key="n"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                :class="form.pilotLimit === n ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'"
                :style="form.pilotLimit === n ? { background: primaryColor } : {}"
                @click="form.pilotLimit = n"
              >{{ n }}</button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                :class="!form.pilotLimit ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'"
                :style="!form.pilotLimit ? { background: primaryColor } : {}"
                @click="form.pilotLimit = null"
              >Alle (gestaffelt)</button>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Oder eigene Zahl</label>
              <input
                v-model.number="form.pilotLimit"
                type="number"
                min="1"
                placeholder="z. B. 50"
                class="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>
            <p class="text-xs text-amber-900/80 leading-relaxed">
              <template v-if="form.pilotLimit && form.pilotLimit > 0">
                Es werden nur die <strong>ersten {{ form.pilotLimit }}</strong> Empfänger angeschrieben
                <template v-if="form.pilotLimit > 500"> (über {{ Math.ceil(form.pilotLimit / 500) }} Tage à max. 500/Tag)</template>.
                Die übrigen bleiben für einen späteren Versand.
              </template>
              <template v-else>
                Ohne Limit: alle ~{{ estimatedCount ?? '…' }} Empfänger —
                verteilt auf ca. <strong>{{ estimatedSendDays }} Tage</strong> (max. 500/Tag).
              </template>
            </p>
          </div>
        </div>
        <div class="flex justify-between pt-2">
          <button type="button" class="px-4 py-2.5 text-sm text-gray-600" @click="go(3)">Zurück</button>
          <button type="button" class="px-5 py-2.5 text-white rounded-xl text-sm font-semibold" :style="{ background: primaryColor }" @click="go(5)">Weiter</button>
        </div>
      </div>

      <!-- Step 5: Publish -->
      <div v-else-if="step === 5" class="space-y-5">
        <h2 class="text-lg font-semibold text-gray-900">Fertigstellen</h2>

        <div class="bg-white border rounded-2xl p-5 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-gray-500">Thema</span><span class="font-medium">{{ themeTitle }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Titel</span><span class="font-medium">{{ form.title || '—' }}</span></div>
          <div v-if="form.themeKey === 'discount_promo' || form.includeDiscount" class="flex justify-between"><span class="text-gray-500">Code</span><span class="font-mono font-bold">{{ form.discountCode || '(auto)' }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Empfänger jetzt</span><span class="font-medium">{{ sendAudienceLabel }}</span></div>
          <p class="text-xs text-gray-500 pt-1">{{ sendAudienceHint }}</p>
        </div>

        <div class="bg-white border rounded-2xl p-5 space-y-3">
          <label class="block text-sm font-medium text-gray-700">Test-E-Mail</label>
          <div class="flex gap-2">
            <input v-model="testEmail" type="email" placeholder="du@example.com" class="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium border rounded-xl disabled:opacity-50"
              :disabled="!testEmail || creating"
              @click="createAndTest"
            >{{ testing ? 'Sende…' : 'Test senden' }}</button>
          </div>
          <p v-if="testOk" class="text-xs text-green-600">Test-Mail gesendet.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            class="flex-1 px-4 py-3 border rounded-xl text-sm font-semibold disabled:opacity-50"
            :disabled="creating"
            @click="createOffer(false)"
          >{{ creating && !sendNowFlag ? 'Speichern…' : 'Als Entwurf speichern' }}</button>
          <button
            type="button"
            class="flex-1 px-4 py-3 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            :style="{ background: primaryColor }"
            :disabled="creating"
            @click="createOffer(true)"
          >{{ creating && sendNowFlag ? 'Wird gesendet…' : 'Jetzt senden' }}</button>
        </div>

        <div v-if="result" class="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
          <p class="font-semibold text-green-900">Aktion erstellt!</p>
          <div v-if="result.discount?.code" class="text-sm">Code: <code class="font-mono font-bold">{{ result.discount.code }}</code></div>
          <div class="text-sm break-all">
            CTA-Link:
            <a :href="result.cta_url" target="_blank" class="underline" :style="{ color: primaryColor }">{{ result.cta_url }}</a>
          </div>
          <button type="button" class="text-xs font-medium px-3 py-1.5 border rounded-lg bg-white" @click="copyCta">Link kopieren</button>
          <NuxtLink to="/admin/marketing/campaigns" class="block text-sm font-medium mt-2" :style="{ color: primaryColor }">Zu den Kampagnen →</NuxtLink>
        </div>

        <div class="flex justify-start pt-2">
          <button type="button" class="px-4 py-2.5 text-sm text-gray-600" :disabled="creating" @click="go(4)">Zurück</button>
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Aktion starten - Marketing' })

/** Client-side preview replace (mirrors server renderTemplate for common vars). */
function previewReplace(template: string, vars: Record<string, string>) {
  let out = template || ''
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '')
  }
  return out
}

const authStore = useAuthStore()
const { primaryColor } = useTenantBranding()
const route = useRoute()

const steps = [
  { id: 1, label: 'Thema' },
  { id: 2, label: 'Angebot' },
  { id: 3, label: 'Text' },
  { id: 4, label: 'Empfänger' },
  { id: 5, label: 'Senden' },
]

const step = ref(1)
const maxReached = ref(1)
const themes = ref<any[]>([])
const suggestions = ref<any[]>([])
const selectedSuggestionId = ref<string | null>(null)
const courseCategoryFilter = ref<string | null>(null)
const leadCategories = ref<{ value: string; label: string }[]>([])
const drivingCategories = ref<{ value: string; label: string }[]>([])
const courses = ref<any[]>([])
const allCourses = ref<any[]>([])
const loadingCourses = ref(false)
const estimatedCount = ref<number | null>(null)
const tenantSlug = ref('')
const tenantName = ref('Fahrschule')
const businessType = ref('driving_school')

const form = reactive({
  themeKey: '' as string,
  title: '',
  includeDiscount: true,
  discountType: 'percentage' as string,
  discountValue: 50,
  discountCode: '',
  firstLessonOnly: true,
  validityPreset: 'end_of_month' as string,
  validUntil: '',
  courseId: '',
  categoryCode: '',
  creativeId: '',
  subject: '',
  htmlBody: '',
  segmentCategories: [] as string[],
  excludeCategories: [] as string[],
  clientsOnly: false,
  pilotLimit: null as number | null,
})

const validityPresets = [
  { value: 'end_of_month', label: 'Bis Monatsende' },
  { value: '7_days', label: '7 Tage' },
  { value: '14_days', label: '14 Tage' },
  { value: 'custom', label: 'Datum' },
]

const creating = ref(false)
const sendNowFlag = ref(false)
const testing = ref(false)
const testEmail = ref('')
const testOk = ref(false)
const error = ref('')
const result = ref<any>(null)
const aiRewriting = ref(false)

const currentTheme = computed(() => themes.value.find(t => t.key === form.themeKey))
const currentCreatives = computed(() => currentTheme.value?.creatives || [])
const themeTitle = computed(() => {
  const s = suggestions.value.find(x => x.id === selectedSuggestionId.value)
  return s?.title || currentTheme.value?.title || ''
})

const filteredCourses = computed(() => {
  if (!courseCategoryFilter.value) return allCourses.value
  const code = courseCategoryFilter.value.toLowerCase()
  return allCourses.value.filter((c: any) => {
    const cat = (c.category || c.course_category?.code || c.course_category?.name || '').toString().toLowerCase()
    return cat === code || cat.includes(code) || (c.course_category?.name || '').toLowerCase().includes(code)
  })
})

watch(filteredCourses, (list) => { courses.value = list }, { immediate: true })

const canProceedOffer = computed(() => {
  if (!form.title.trim()) return false
  if (form.themeKey === 'course' && !form.courseId) return false
  if (form.themeKey === 'category' && !form.categoryCode) return false
  if (form.themeKey === 'discount_promo' && form.discountType !== 'free_lesson' && !(form.discountValue > 0)) return false
  return true
})

const DAILY_SEND_CAP = 500
const estimatedSendDays = computed(() => {
  const total = form.pilotLimit && form.pilotLimit > 0
    ? form.pilotLimit
    : (estimatedCount.value || 0)
  if (!total) return 1
  return Math.max(1, Math.ceil(total / DAILY_SEND_CAP))
})
const sendAudienceLabel = computed(() => {
  if (form.pilotLimit && form.pilotLimit > 0) return `${form.pilotLimit} (Testmenge)`
  if (estimatedCount.value != null) return `alle ${estimatedCount.value.toLocaleString('de-CH')}`
  return 'alle'
})
const sendAudienceHint = computed(() => {
  if (form.pilotLimit && form.pilotLimit > 0) {
    return form.pilotLimit > DAILY_SEND_CAP
      ? `Nur diese ${form.pilotLimit} — verteilt auf ca. ${estimatedSendDays.value} Tage (max. ${DAILY_SEND_CAP}/Tag).`
      : `Nur diese ${form.pilotLimit} Empfänger. Der Rest wird nicht angeschrieben.`
  }
  return `Alle Empfänger — max. ${DAILY_SEND_CAP} pro Tag (ca. ${estimatedSendDays.value} Tage).`
})

const previewVars = computed(() => ({
  first_name: 'Max',
  tenant_name: tenantName.value,
  tenant_slug: tenantSlug.value,
  primary_color: primaryColor.value || '#1e293b',
  discount_code: form.discountCode || 'AKTION50',
  discount_percent: form.discountType === 'percentage'
    ? `${form.discountValue}%`
    : form.discountType === 'fixed'
      ? `CHF ${Number(form.discountValue).toFixed(2)}`
      : form.discountType === 'free_lesson' ? '1 Freistunde' : '',
  discount_valid_until: form.validityPreset === 'end_of_month' ? 'Monatsende' : (form.validUntil || 'bald'),
  cta_url: '#',
  course_name: courses.value.find(c => c.id === form.courseId)?.name || 'Kurs',
  course_date: courseDateLabel(courses.value.find(c => c.id === form.courseId)) || 'Termin',
  course_price: (() => {
    const c = courses.value.find(x => x.id === form.courseId)
    return c?.price_per_participant_rappen != null ? `CHF ${(c.price_per_participant_rappen / 100).toFixed(2)}` : ''
  })(),
  category_label: drivingCategories.value.find(c => c.value === form.categoryCode)?.label || form.categoryCode || 'Kategorie',
  affiliate_signup_url: '#',
}))

function previewSubject(s: string) {
  try { return previewReplace(s || '', previewVars.value) } catch { return s }
}

const previewHtml = computed(() => {
  try { return previewReplace(form.htmlBody || '', previewVars.value) } catch { return form.htmlBody }
})

function courseDateLabel(c: any) {
  if (!c?.course_sessions?.length) return ''
  const sorted = [...c.course_sessions].sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const t = sorted[0]?.start_time
  if (!t) return ''
  return new Date(t).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function go(n: number) {
  step.value = n
  if (n > maxReached.value) maxReached.value = n
  if (n === 4) loadEstimate()
}

function selectTheme(key: string) {
  selectedSuggestionId.value = null
  courseCategoryFilter.value = null
  form.themeKey = key
  form.creativeId = ''
  form.subject = ''
  form.htmlBody = ''
  form.courseId = ''
  form.categoryCode = ''
  // Always refresh title from the theme card — otherwise a previous suggestion
  // (e.g. "Kategorie Boot bewerben") sticks when switching to Affiliate etc.
  const preset = themes.value.find(t => t.key === key)
  form.title = preset?.title || ''
  form.includeDiscount = key === 'discount_promo' || key === 'course' || key === 'category'
  if (key === 'affiliate') form.includeDiscount = false
  if (key === 'course') loadCourses()
  if (!form.discountCode) regenCode()
}

function selectSuggestion(s: any) {
  selectedSuggestionId.value = s.id
  form.themeKey = s.themeKey
  form.creativeId = ''
  form.subject = ''
  form.htmlBody = ''
  form.courseId = ''
  form.title = s.title
  form.categoryCode = s.categoryCode || ''
  form.includeDiscount = s.themeKey !== 'affiliate'
  // Prefill audience: only email leads interested in this category
  if (s.categoryCode) {
    form.segmentCategories = [s.categoryCode]
  }
  if (s.kind === 'course_category') {
    courseCategoryFilter.value = s.categoryCode || null
    loadCourses()
  } else {
    courseCategoryFilter.value = null
  }
  if (!form.discountCode) regenCode()
}

function pickCreative(c: any) {
  form.creativeId = c.id
  form.subject = c.subject
  form.htmlBody = c.html_body
}

function regenCode() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const pct = form.discountType === 'percentage' ? String(form.discountValue || 50) : ''
  form.discountCode = `AKTION${pct}${rand}`.slice(0, 16)
}

function toggleSegment(code: string) {
  const i = form.segmentCategories.indexOf(code)
  if (i >= 0) form.segmentCategories.splice(i, 1)
  else form.segmentCategories.push(code)
  // Don't include and exclude the same code
  form.excludeCategories = form.excludeCategories.filter(c => c !== code)
  loadEstimate()
}

function toggleExclude(code: string) {
  const i = form.excludeCategories.indexOf(code)
  if (i >= 0) form.excludeCategories.splice(i, 1)
  else form.excludeCategories.push(code)
  form.segmentCategories = form.segmentCategories.filter(c => c !== code)
  loadEstimate()
}

async function loadEstimate() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  try {
    const query: Record<string, any> = { tenantId, limit: 1, status: 'not_unsubscribed' }
    if (form.segmentCategories.length) query.categories = form.segmentCategories.join(',')
    if (form.excludeCategories.length) query.exclude_categories = form.excludeCategories.join(',')
    if (form.clientsOnly) query.require_tags = 'client'
    const res = await $fetch<any>('/api/marketing/leads', { query })
    estimatedCount.value = res?.total ?? null
  } catch {
    estimatedCount.value = null
  }
}

async function loadCourses() {
  if (!tenantSlug.value) return
  loadingCourses.value = true
  try {
    const res = await $fetch<any>('/api/courses/public', { query: { slug: tenantSlug.value } })
    allCourses.value = res?.courses || res?.data || []
    courses.value = filteredCourses.value
  } catch {
    allCourses.value = []
    courses.value = []
  } finally {
    loadingCourses.value = false
  }
}

async function rewriteWithAi() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  aiRewriting.value = true
  error.value = ''
  try {
    const topicParts = [
      themeTitle.value,
      form.title,
      form.includeDiscount || form.themeKey === 'discount_promo'
        ? `Rabatt ${form.discountType === 'percentage' ? form.discountValue + '%' : form.discountType}, Code ${form.discountCode || 'AUTO'}, Gültigkeit ${form.validityPreset}`
        : '',
      form.courseId ? `Kurs ${courses.value.find(c => c.id === form.courseId)?.name || ''}` : '',
      form.categoryCode ? `Kategorie ${form.categoryCode}` : '',
    ].filter(Boolean).join(' — ')

    const res = await $fetch<any>('/api/marketing/ai-suggest', {
      method: 'POST',
      body: {
        tenantId,
        topic: topicParts,
        categories: form.segmentCategories,
        offerContext: {
          themeKey: form.themeKey,
          discount_code: form.discountCode,
          discount_percent: previewVars.value.discount_percent,
          course_name: previewVars.value.course_name,
          category_label: previewVars.value.category_label,
        },
      },
    })
    if (res.subjectLines?.[0]) form.subject = res.subjectLines[0]
    if (res.emailDraft) {
      // Convert plain text draft to simple HTML paragraphs, keep placeholders
      const html = res.emailDraft
        .split(/\n\n+/)
        .map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('\n')
      // Ensure CTA button exists
      form.htmlBody = html.includes('{{cta_url}}')
        ? html
        : `${html}\n<p style="margin:24px 0"><a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">Jetzt starten</a></p>`
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'KI-Umschreiben fehlgeschlagen'
  } finally {
    aiRewriting.value = false
  }
}

function buildPayload(sendNow: boolean) {
  const tenantId = authStore.userProfile?.tenant_id
  return {
    tenantId,
    themeKey: form.themeKey,
    title: form.title.trim(),
    creativeId: form.creativeId,
    subjectOverride: form.subject,
    htmlBodyOverride: form.htmlBody,
    includeDiscount: form.themeKey === 'discount_promo' || form.includeDiscount,
    discountType: form.discountType,
    discountValue: form.discountValue,
    discountCode: form.discountCode || undefined,
    firstLessonOnly: form.firstLessonOnly,
    categoryFilter: form.categoryCode || null,
    validityPreset: form.validityPreset,
    validUntil: form.validityPreset === 'custom' ? form.validUntil : null,
    ctaType: form.themeKey === 'affiliate' ? 'partner' : form.themeKey === 'course' ? 'course' : 'booking',
    courseId: form.courseId || null,
    categoryCode: form.categoryCode || null,
    segmentCategories: form.segmentCategories,
    excludeCategories: form.excludeCategories,
    clientsOnly: form.clientsOnly,
    sendNow,
    pilotLimit: form.pilotLimit || null,
  }
}

async function createOffer(sendNow: boolean) {
  creating.value = true
  sendNowFlag.value = sendNow
  error.value = ''
  try {
    const res = await $fetch<any>('/api/marketing/offers', {
      method: 'POST',
      body: buildPayload(sendNow),
    })
    result.value = res
    if (res.discount?.code) form.discountCode = res.discount.code
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Erstellen fehlgeschlagen'
  } finally {
    creating.value = false
  }
}

async function createAndTest() {
  if (!testEmail.value) return
  testing.value = true
  testOk.value = false
  error.value = ''
  try {
    if (!result.value?.campaign?.id) {
      await createOffer(false)
    }
    if (!result.value?.campaign?.id) throw new Error('Kampagne fehlt')
    await $fetch('/api/marketing/send-preview', {
      method: 'POST',
      body: {
        to: testEmail.value,
        campaignId: result.value.campaign.id,
        tenantId: authStore.userProfile?.tenant_id,
      },
    })
    testOk.value = true
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Test fehlgeschlagen'
  } finally {
    testing.value = false
  }
}

async function copyCta() {
  if (!result.value?.cta_url) return
  try {
    await navigator.clipboard.writeText(result.value.cta_url)
  } catch {}
}

watch([() => form.excludeCategories.slice(), () => form.clientsOnly], () => {
  if (step.value === 4) loadEstimate()
})

watch(() => form.segmentCategories.slice(), () => {
  if (step.value === 4) loadEstimate()
})

watch(() => form.discountValue, () => {
  if (!form.discountCode || form.discountCode.startsWith('AKTION')) regenCode()
})

onMounted(async () => {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return

  const [themesRes, catsRes, branding] = await Promise.all([
    $fetch<any>('/api/marketing/themes', { query: { tenantId } }),
    $fetch<any>('/api/marketing/lead-categories', { query: { tenantId } }),
    $fetch<any>('/api/tenants/branding', { query: { id: tenantId } }).catch(() => null),
  ])

  themes.value = themesRes.themes || []
  suggestions.value = themesRes.suggestions || []
  businessType.value = themesRes.context?.businessType || 'driving_school'
  const cats = (catsRes.categories || []).map((c: any) => ({ value: c.code, label: c.name || c.code }))
  leadCategories.value = cats
  // Prefer license categories from themes context when Fahrschule
  const licenseCats = (themesRes.context?.licenseCategories || []).map((c: any) => ({
    value: c.code,
    label: c.name || c.code,
  }))
  drivingCategories.value = licenseCats.length ? licenseCats : cats
  tenantSlug.value = branding?.data?.slug || themesRes.context?.slug || ''
  tenantName.value = branding?.data?.brand_name || branding?.data?.name || 'Fahrschule'

  // Prefill from AI handoff / query
  if (route.query.suggestion) {
    const s = suggestions.value.find((x: any) => x.id === String(route.query.suggestion))
    if (s) selectSuggestion(s)
  } else if (route.query.theme) {
    selectTheme(String(route.query.theme))
  }
  if (route.query.subject) form.subject = String(route.query.subject)
  if (route.query.draft) {
    form.htmlBody = String(route.query.draft)
  }

  regenCode()
})
</script>
