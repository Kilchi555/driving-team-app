<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[520] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="closeHelp"
      >
        <Transition
          enter-active-class="transition-transform duration-250 ease-out"
          enter-from-class="translate-y-full sm:translate-y-4 sm:scale-95"
          enter-to-class="translate-y-0 sm:scale-100"
          leave-active-class="transition-transform duration-200 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full sm:translate-y-4"
        >
          <div
            v-if="isOpen"
            class="help-modal-panel bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92svh] sm:max-h-[85vh] flex flex-col overflow-hidden pb-safe"
            @click.stop
          >
            <!-- Grabber (mobile) -->
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <!-- Header -->
            <div class="flex items-start gap-3 px-4 sm:px-5 pt-2 pb-3 border-b border-gray-100">
              <button
                v-if="activeSlug"
                type="button"
                class="help-modal-back shrink-0 mt-0.5"
                @click="showOverview"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
                </svg>
                Alle
              </button>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    :style="{ background: `${primaryColor}15`, color: primaryColor }"
                  >
                    <svg class="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-base font-bold text-gray-900 truncate">
                      {{ activeArticle?.title || 'Hilfe' }}
                    </h2>
                    <p class="text-xs text-gray-500 truncate">
                      {{ activeArticle?.summary || articleCountLabel }}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0"
                title="Schliessen"
                @click="closeHelp"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Search (overview only) -->
            <div v-if="!activeSlug && searchable" class="px-4 sm:px-5 pt-3">
              <div class="relative">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                </svg>
                <input
                  v-model="query"
                  type="search"
                  placeholder="Artikel suchen…"
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:bg-white"
                  :style="{ '--tw-ring-color': `${primaryColor}33` }"
                >
              </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
              <div v-if="pending" class="text-center text-sm text-gray-500 py-10">
                Hilfe wird geladen…
              </div>

              <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Hilfe konnte nicht geladen werden.
              </div>

              <!-- Article detail -->
              <article
                v-else-if="activeArticle"
                class="help-prose"
                :style="{ '--help-accent': primaryColor }"
                v-html="activeArticle.html"
              />

              <div
                v-else-if="activeSlug && !activeArticle"
                class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                Artikel nicht gefunden.
                <button type="button" class="underline ml-1 font-medium" @click="showOverview">
                  Zur Übersicht
                </button>
              </div>

              <!-- Overview list -->
              <div v-else class="space-y-6">
                <div v-if="filteredGroups.length === 0" class="text-center text-sm text-gray-500 py-8">
                  Keine Artikel gefunden.
                </div>

                <section v-for="group in filteredGroups" :key="group.role" class="space-y-2.5">
                  <div v-if="showRoleHeadings" class="flex items-center gap-2 px-0.5">
                    <span class="w-1.5 h-1.5 rounded-full" :style="{ background: primaryColor }" />
                    <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">
                      {{ roleLabel(group.role) }}
                    </h3>
                  </div>
                  <button
                    v-for="(article, idx) in group.articles"
                    :key="`${article.role}-${article.slug}`"
                    type="button"
                    class="help-card w-full text-left group"
                    @click="openArticle(article.slug)"
                  >
                    <div
                      class="help-card-index shrink-0"
                      :style="{ background: `${primaryColor}12`, color: primaryColor }"
                    >
                      {{ String(idx + 1).padStart(2, '0') }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="font-semibold text-gray-900">{{ article.title }}</div>
                      <p v-if="article.summary" class="mt-0.5 text-sm text-gray-500 line-clamp-2">
                        {{ article.summary }}
                      </p>
                    </div>
                    <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </section>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useHelpDocs } from '~/composables/useHelpDocs'
import { useHelpModal } from '~/composables/useHelpModal'
import { useTenantBranding } from '~/composables/useTenantBranding'
import type { HelpRole } from '~/utils/helpMarkdown'

const { primaryColor } = useTenantBranding()
const { isOpen, activeSlug, openArticle, showOverview, closeHelp } = useHelpModal()
const { articlesByRole, visibleRoles, roleLabel, pending, error, articles, getArticle, refresh } = useHelpDocs()

const query = ref('')

watch(isOpen, (open) => {
  if (open) {
    query.value = ''
    refresh()
  }
})

const searchable = computed(() => (articles.value?.length || 0) > 4)
const showRoleHeadings = computed(() => visibleRoles.value.length > 1)
const articleCountLabel = computed(() => {
  const n = articles.value?.length || 0
  return n ? `${n} Anleitungen` : 'Kurzanleitungen für die App'
})

const activeArticle = computed(() => {
  if (!activeSlug.value) return null
  return getArticle(activeSlug.value) || null
})

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return visibleRoles.value
    .map((role: HelpRole) => {
      let list = articlesByRole.value[role]
      if (q) {
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.body.toLowerCase().includes(q)
        )
      }
      return { role, articles: list }
    })
    .filter((g) => g.articles.length > 0)
})
</script>

<style scoped>
.help-modal-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.65rem;
  border-radius: 0.7rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.8125rem;
  color: #374151;
}
.help-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  transition: background 0.15s, border-color 0.15s;
}
.help-card:hover {
  background: #fff;
  border-color: #e2e8f0;
}
.help-card-index {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
}

.help-prose :deep(h2) {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 1.35rem 0 0.55rem;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.help-prose :deep(h2::before) {
  content: '';
  width: 0.28rem;
  height: 1rem;
  border-radius: 999px;
  background: var(--help-accent, #2563eb);
  flex-shrink: 0;
}
.help-prose :deep(h3) {
  font-size: 0.9rem;
  font-weight: 650;
  margin: 1.1rem 0 0.35rem;
  color: #1e293b;
}
.help-prose :deep(p) {
  font-size: 0.92rem;
  line-height: 1.6;
  color: #475569;
  margin: 0 0 0.75rem;
}
.help-prose :deep(strong) {
  font-weight: 650;
  color: #0f172a;
}
.help-prose :deep(code) {
  font-size: 0.82em;
  background: #f1f5f9;
  padding: 0.1rem 0.35rem;
  border-radius: 0.35rem;
}
.help-prose :deep(ul.help-ul) {
  list-style: none;
  margin: 0 0 0.9rem;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}
.help-prose :deep(ul.help-ul > li) {
  position: relative;
  padding: 0.55rem 0.7rem 0.55rem 1.9rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #334155;
}
.help-prose :deep(ul.help-ul > li::before) {
  content: '';
  position: absolute;
  left: 0.7rem;
  top: 0.85rem;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--help-accent, #2563eb);
}
.help-prose :deep(ol.help-ol) {
  list-style: none;
  counter-reset: help-step;
  margin: 0 0 0.9rem;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.help-prose :deep(ol.help-ol > li) {
  counter-increment: help-step;
  position: relative;
  padding: 0.65rem 0.75rem 0.65rem 2.75rem;
  border-radius: 0.85rem;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #334155;
}
.help-prose :deep(ol.help-ol > li::before) {
  content: counter(help-step);
  position: absolute;
  left: 0.6rem;
  top: 0.6rem;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 0.45rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #fff;
  background: var(--help-accent, #2563eb);
}
.help-prose :deep(.help-callout) {
  margin: 0.9rem 0 1rem;
  padding: 0.85rem 0.9rem;
  border-radius: 0.9rem;
  border: 1px solid transparent;
}
.help-prose :deep(.help-callout-title) {
  margin: 0 0 0.35rem !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.help-prose :deep(.help-callout-title::before) {
  display: none !important;
}
.help-prose :deep(.help-callout--tip) {
  background: color-mix(in srgb, var(--help-accent, #2563eb) 8%, #fff);
  border-color: color-mix(in srgb, var(--help-accent, #2563eb) 22%, #e2e8f0);
}
.help-prose :deep(.help-callout--note) {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.help-prose :deep(.help-callout--warn) {
  background: #fff7ed;
  border-color: #fed7aa;
}
.help-prose :deep(.help-table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 0.6rem 0 1rem;
  font-size: 0.84rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.help-prose :deep(.help-table th) {
  text-align: left;
  background: #f8fafc;
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid #e2e8f0;
}
.help-prose :deep(.help-table td) {
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
  color: #475569;
}
.help-prose :deep(.help-table tr:last-child td) {
  border-bottom: none;
}
</style>
