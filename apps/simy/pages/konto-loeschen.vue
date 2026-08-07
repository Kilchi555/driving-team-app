<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />
    <section class="pt-16 pb-24 px-6">
      <div class="max-w-3xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <span class="text-gray-600">Konto löschen</span>
        </nav>

        <h1 class="text-3xl font-black text-gray-900 mb-3">Konto und Daten löschen</h1>
        <p class="text-gray-500 leading-relaxed mb-10">
          Diese Seite erklärt, wie du dein Simy-Konto und die zugehörigen personenbezogenen Daten löschen kannst.
          Simy ist die App von Simy IT Systems Kilchenmann (<a href="https://simy.ch" class="underline" style="color: var(--brand-primary)">simy.ch</a>).
        </p>

        <div class="space-y-8">
          <section class="rounded-2xl border border-gray-100 p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-3">Option 1 — Direkt in der App (empfohlen)</h2>
            <ol class="list-decimal pl-5 space-y-2 text-gray-600 leading-relaxed">
              <li>Öffne die Simy-App oder <a href="https://app.simy.ch/login" class="underline" style="color: var(--brand-primary)">app.simy.ch</a> und melde dich an.</li>
              <li>Gehe zu deinem <strong>Profil</strong> (oben rechts bzw. über das Menü).</li>
              <li>Wähle <strong>Konto löschen</strong>.</li>
              <li>Bestätige die Löschung, indem du <strong>LÖSCHEN</strong> eingibst.</li>
            </ol>
            <p class="mt-4 text-sm text-gray-500">
              Danach wird dein Konto anonymisiert bzw. gelöscht. Gesetzlich vorgeschriebene Buchhaltungsdaten können
              gemäss Schweizer Recht für die vorgeschriebene Aufbewahrungsfrist erhalten bleiben.
              Solange offene Zahlungen oder Rechnungen bestehen, ist die Löschung nicht möglich — bitte zuerst begleichen
              oder deine Fahrschule kontaktieren.
            </p>
          </section>

          <section class="rounded-2xl border border-gray-100 p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-3">Option 2 — Per E-Mail anfordern</h2>
            <p class="text-gray-600 leading-relaxed mb-3">
              Wenn du dich nicht mehr einloggen kannst, schreibe an:
            </p>
            <p class="font-semibold text-gray-900 mb-3">
              <a href="mailto:support@simy.ch?subject=Konto%20löschen%20Simy" class="underline" style="color: var(--brand-primary)">support@simy.ch</a>
            </p>
            <p class="text-gray-600 leading-relaxed">
              Bitte nenne die E-Mail-Adresse deines Simy-Kontos und den Namen deines Anbieters (z. B. Fahrschule / Studio).
              Wir bearbeiten die Anfrage in der Regel innerhalb von 7 Tagen.
            </p>
          </section>

          <section>
            <h2 class="text-lg font-bold text-gray-900 mb-3">Was wird gelöscht?</h2>
            <ul class="list-disc pl-5 space-y-1 text-gray-600 leading-relaxed">
              <li>Zugangsdaten und Profilinformationen</li>
              <li>Persönliche Kontaktdaten in der App</li>
              <li>App-bezogene Nutzungsdaten, soweit nicht gesetzlich aufzubewahren</li>
            </ul>
          </section>

          <p class="text-sm text-gray-400">
            Mehr zum Datenschutz: <a href="/datenschutz" class="underline" style="color: var(--brand-primary)">simy.ch/datenschutz</a>
          </p>
        </div>
      </div>
    </section>
    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { breadcrumbLd, ldScripts, webPageLd } from '~/utils/schema'

useHead({
  title: 'Konto löschen – Simy',
  meta: [{
    name: 'description',
    content: 'So löschst du dein Simy-Konto und die zugehörigen Daten — in der App oder per E-Mail an support@simy.ch.',
  }],
  link: [{ rel: 'canonical', href: 'https://simy.ch/konto-loeschen' }],
  script: ldScripts(
    webPageLd({
      name: 'Konto löschen – Simy',
      description: 'Anleitung zum Löschen des Simy-Kontos und der zugehörigen Daten.',
      url: 'https://simy.ch/konto-loeschen',
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Konto löschen', url: 'https://simy.ch/konto-loeschen' },
    ]),
  ),
})
</script>
