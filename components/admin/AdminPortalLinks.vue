<template>
  <div class="relative">
    <button
      type="button"
      title="Links"
      class="flex w-8 h-8 rounded-lg items-center justify-center hover:bg-white/20 transition-colors"
      :class="open ? 'bg-white/30' : ''"
      @click="toggle"
    >
      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[500] bg-black/50 flex items-end sm:items-start sm:justify-end justify-center sm:pt-16 sm:pr-4"
          @click.self="open = false"
        >
          <div
            class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl pb-safe sm:mb-4 sm:max-h-[min(80vh,640px)] flex flex-col"
            @click.stop
          >
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div class="flex items-center justify-between px-5 pt-2 pb-4 border-b border-gray-100">
              <div>
                <h2 class="text-base font-semibold text-gray-900">Links</h2>
                <p class="text-xs text-gray-400 mt-0.5">Teilen mit Kunden &amp; Partnern</p>
              </div>
              <button
                type="button"
                class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                @click="open = false"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="px-4 py-3 space-y-2 overflow-y-auto">
              <p v-if="!slug" class="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                Tenant-Slug fehlt — Seite neu laden.
              </p>

              <button
                v-for="item in linkItems"
                :key="item.id"
                type="button"
                class="w-full bg-gray-50 rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-60 hover:bg-gray-100 transition-colors text-left"
                @click="selectLink(item)"
              >
                <div
                  class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  :class="item.iconBg"
                >
                  <svg class="w-4 h-4" :class="item.iconColor" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="item.iconPath" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-800 truncate">{{ item.title }}</div>
                  <div class="text-xs text-gray-400 truncate">{{ item.subtitle }}</div>
                </div>
                <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <div class="h-4 sm:h-2" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="actionTarget"
          class="fixed inset-0 z-[600] bg-black/50 flex items-end sm:items-center justify-center"
          @click.self="actionTarget = null"
        >
          <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl pb-safe sm:mb-0" @click.stop>
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div class="px-5 pt-2 pb-1">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{{ actionTarget.title }}</p>
              <p class="text-xs text-gray-400 truncate mt-0.5">{{ actionTarget.url }}</p>
            </div>
            <div class="px-4 py-3 space-y-2">
              <button
                type="button"
                class="w-full bg-gray-50 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                @click="actionOpen"
              >
                <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-800">Öffnen</span>
              </button>
              <button
                type="button"
                class="w-full bg-gray-50 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                @click="actionCopy"
              >
                <div class="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-800">Link kopieren</span>
              </button>
              <button
                v-if="canNativeShare"
                type="button"
                class="w-full bg-gray-50 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                @click="actionShare"
              >
                <div class="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-800">Teilen</span>
              </button>
            </div>
            <div class="px-4 pb-4">
              <button
                type="button"
                class="w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                @click="actionTarget = null"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useTerminology } from '~/composables/useTerminology'
import { useFeatures } from '~/composables/useFeatures'

const { currentTenantBranding } = useTenantBranding()
const { t, isDrivingSchool } = useTerminology()
const { isEnabled } = useFeatures()
const ui = useUIStore()

const open = ref(false)
const rentalPortalSlug = ref<string | null>(null)
const promoLinks = ref<{ id: string; title: string; subtitle: string; url: string }[]>([])

interface LinkItem {
  id: string
  title: string
  subtitle: string
  url: string
  iconBg: string
  iconColor: string
  iconPath: string
}

interface ActionTarget {
  title: string
  url: string
}

const actionTarget = ref<ActionTarget | null>(null)
const canNativeShare = computed(() => import.meta.client && typeof navigator !== 'undefined' && !!navigator.share)

const slug = computed(() =>
  currentTenantBranding.value?.slug
  || rentalPortalSlug.value
  || ''
)

const appBase = computed(() => {
  if (import.meta.client && typeof window !== 'undefined') return window.location.origin
  return 'https://app.simy.ch'
})

const websiteUrl = computed(() =>
  currentTenantBranding.value?.social?.website
  || (currentTenantBranding.value as any)?.website_url
  || null
)

const bookingUrl = computed(() => `${appBase.value}/booking/availability/${slug.value}`)
const registrationUrl = computed(() => `${appBase.value}/services/${slug.value}`)
const shopUrl = computed(() => `${appBase.value}/shop?tenant=${slug.value}`)
const coursesUrl = computed(() => `${appBase.value}/customer/courses/${slug.value}`)
const rentalUrl = computed(() => {
  const s = rentalPortalSlug.value || slug.value
  return `${appBase.value}/partners/${s}`
})

const linkItems = computed<LinkItem[]>(() => {
  if (!slug.value) return []
  const items: LinkItem[] = [
    {
      id: 'registration',
      title: 'Registrierungs-Link',
      subtitle: `Für neue ${t.value.clientsPlural} zum Anmelden`,
      url: registrationUrl.value,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      iconPath: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    },
    {
      id: 'booking',
      title: 'Buchungsseite',
      subtitle: `Online-Buchung für ${t.value.clientsPlural}`,
      url: bookingUrl.value,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      id: 'shop',
      title: 'Shop',
      subtitle: 'Lernmaterial & Pakete',
      url: shopUrl.value,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      iconPath: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    },
  ]

  if (isEnabled('courses_enabled', true)) {
    items.push({
      id: 'courses',
      title: 'Kurse',
      subtitle: 'Öffentliche Kursübersicht',
      url: coursesUrl.value,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    })
  }

  if (isDrivingSchool.value) {
    items.push({
      id: 'rental',
      title: 'Fahrzeugvermietung',
      subtitle: `Portal für externe ${t.value.staffPlural}`,
      url: rentalUrl.value,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      iconPath: 'M8 17a2 2 0 11-4 0 2 2 0 014 0zM18 17a2 2 0 11-4 0 2 2 0 014 0zM3.5 12l1.5-5h12l2 5M5 17H3v-5h16v5h-2',
    })
  }

  if (websiteUrl.value) {
    items.push({
      id: 'website',
      title: 'Website',
      subtitle: websiteUrl.value,
      url: websiteUrl.value,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      iconPath: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    })
  }

  for (const promo of promoLinks.value) {
    items.push({
      id: `promo-${promo.id}`,
      title: promo.title,
      subtitle: promo.subtitle,
      url: promo.url,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    })
  }

  return items
})

async function loadExtras() {
  try {
    const res: any = await $fetch('/api/admin/rental-settings')
    rentalPortalSlug.value = res?.rental_portal_slug || null
  } catch {
    rentalPortalSlug.value = null
  }

  try {
    const response = await $fetch<{ success: boolean; data: any[] }>('/api/staff/get-discounts', {
      query: { with_code: '1' },
    })
    if (!response?.success || !Array.isArray(response.data)) {
      promoLinks.value = []
      return
    }
    promoLinks.value = response.data
      .filter((d) => String(d?.code || '').trim())
      .map((d) => {
        const code = String(d.code).trim().toUpperCase()
        const params = new URLSearchParams()
        params.set('code', code)
        if (d.category_filter && d.category_filter !== 'all') {
          params.set('category', d.category_filter)
        }
        return {
          id: String(d.id),
          title: d.name || code,
          subtitle: `Code ${code} · Aktions-Buchungslink`,
          url: `${bookingUrl.value}?${params.toString()}`,
        }
      })
  } catch {
    promoLinks.value = []
  }
}

async function toggle() {
  if (open.value) {
    open.value = false
    return
  }
  open.value = true
  await loadExtras()
}

function selectLink(item: LinkItem) {
  if (!item.url || item.url.includes('/undefined') || item.url.includes('/null')) {
    ui.showError('Link nicht verfügbar', 'Der Tenant konnte nicht ermittelt werden.')
    return
  }
  actionTarget.value = { title: item.title, url: item.url }
}

async function openExternalUrl(url: string) {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url, presentationStyle: 'popover' })
      return
    }
  } catch {
    // web fallback
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function actionOpen() {
  if (!actionTarget.value) return
  const url = actionTarget.value.url
  actionTarget.value = null
  open.value = false
  await openExternalUrl(url)
}

async function actionCopy() {
  if (!actionTarget.value) return
  const { url, title } = actionTarget.value
  actionTarget.value = null
  try {
    await navigator.clipboard.writeText(url)
    ui.showSuccess('Kopiert', `${title} in die Zwischenablage`)
  } catch {
    ui.showError('Kopieren fehlgeschlagen')
  }
}

async function actionShare() {
  if (!actionTarget.value) return
  try {
    await navigator.share({ title: actionTarget.value.title, url: actionTarget.value.url })
  } catch {
    // cancelled
  }
  actionTarget.value = null
}
</script>
