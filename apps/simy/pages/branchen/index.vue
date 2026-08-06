<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="relative overflow-hidden pt-20 pb-20 px-6">
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.07]"
          style="background: radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)"
        />
      </div>
      <div class="relative max-w-4xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-4" style="color: var(--brand-primary)">Branchen</p>
        <h1 class="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
          Simy für deine Branche
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Terminbuchung, Team-Kalender, Kunden und Schweizer QR-Rechnungen — mit branchenspezifischen Vorlagen.
        </p>
      </div>
    </section>

    <section class="pb-24 px-6">
      <div class="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <a
          v-for="item in branchenCards"
          :key="item.href"
          :href="item.href"
          class="group rounded-3xl border border-gray-100 bg-white p-7 hover:-translate-y-1 hover:border-gray-200 transition-all"
        >
          <SimyIconTile :name="item.icon" :size="48" class="mb-4" />
          <div
            v-if="item.badge"
            class="text-xs font-bold uppercase tracking-wider mb-3"
            style="color: var(--brand-primary)"
          >
            {{ item.badge }}
          </div>
          <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:underline">{{ item.label }}</h2>
          <p class="text-sm text-gray-500 leading-relaxed line-clamp-3">{{ item.desc }}</p>
        </a>
      </div>
    </section>

    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center text-white">
        <h2 class="text-3xl font-black mb-4">Nicht sicher, welche Vorlage?</h2>
        <p class="text-white/80 mb-8">Starte den Setup-Wizard — du wählst die Branche in 30 Sekunden.</p>
        <a
          href="https://app.simy.ch/tenant-register"
          class="inline-flex px-8 py-4 rounded-2xl bg-white font-black"
          style="color: var(--brand-primary)"
        >
          Jetzt starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { VERTICALS } from '~/data/verticals'
import { VERTICAL_ICON_BY_SLUG } from '~/utils/icons'
import { breadcrumbLd, itemListLd, ldScripts } from '~/utils/schema'

const branchenCards = [
  {
    href: '/fahrschule',
    label: 'Fahrschule',
    badge: 'Für Fahrschulen',
    icon: VERTICAL_ICON_BY_SLUG.fahrschule,
    desc: 'Kategorien, Prüfungen, App und Kurse — die tiefste Vertical.',
  },
  ...VERTICALS.map((v) => ({
    href: `/${v.slug}`,
    label: v.navLabel,
    badge: v.badge,
    icon: VERTICAL_ICON_BY_SLUG[v.slug] || 'spark',
    desc: v.heroSub,
  })),
]

const branchenItems = branchenCards.map((c) => ({
  name: c.label,
  url: `https://simy.ch${c.href}`,
}))

useHead({
  title: 'Branchen – Online-Terminbuchung & Software Schweiz | Simy',
  meta: [
    {
      name: 'description',
      content:
        'Online-Terminbuchung und Branchen-Software für Fahrschule, Coaching, Consulting, Personal Training, Nachhilfe, Musikschule, Hundeschule und Massage. Schweizer Buchungssystem mit QR-Rechnung.',
    },
    { property: 'og:title', content: 'Online-Terminbuchung nach Branche – Simy Schweiz' },
    { property: 'og:url', content: 'https://simy.ch/branchen' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/branchen' }],
  script: ldScripts(
    itemListLd({
      name: 'Simy Branchen – Online-Terminbuchung Schweiz',
      description: 'Branchenspezifische All-in-One Software und Online-Buchung für Schweizer Dienstleister.',
      url: 'https://simy.ch/branchen',
      items: branchenItems,
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Branchen', url: 'https://simy.ch/branchen' },
    ]),
  ),
})
</script>
