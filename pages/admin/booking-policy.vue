<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-2">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center" :style="primaryBgLight">
        <svg class="w-5 h-5" :style="primaryText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-gray-900">Buchungs- & Onboarding-Einstellungen</h1>
        <p class="text-sm text-gray-500">Online-Buchungsflow, internes Onboarding und Staff-Berechtigungen konfigurieren.</p>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-16 text-gray-400 gap-2">
      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Einstellungen werden geladen…
    </div>

    <template v-else>

      <!-- ══════════════════════════════════════════════════════
           GRUPPE 1: Staff & Internes Onboarding
      ══════════════════════════════════════════════════════ -->
      <div class="flex items-center gap-3 pt-1">
        <div class="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0 bg-violet-50">
          <svg class="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-700 uppercase tracking-widest">Staff & Onboarding</p>
          <p class="text-xs text-gray-400">Einstellungen für das interne Anlegen und Onboarding von Schülern</p>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           GRUPPE 2: Online-Buchung (Kundenflow)
      ══════════════════════════════════════════════════════ -->
      <div class="flex items-center gap-3 pt-1">
        <div class="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0" :style="primaryBgLight">
          <svg class="w-3.5 h-3.5" :style="primaryText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-700 uppercase tracking-widest">Online-Buchung</p>
          <p class="text-xs text-gray-400">Einstellungen für den Kundenflow auf der Buchungsseite</p>
        </div>
      </div>

      <!-- Registrierung obligatorisch -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Registrierung obligatorisch</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              <template v-if="policy.registration_required">
                Kunden müssen sich zuerst registrieren oder einloggen, bevor sie buchen können.
              </template>
              <template v-else>
                Kunden können ohne Passwort buchen (Gast-Buchung). Nach der Buchung erhalten sie
                <template v-if="policy.onboarding_email_enabled">per E-Mail einen Link</template>
                <template v-else>einen Link</template>
                zur Konto-Aktivierung.
              </template>
            </p>
          </div>
          <button
            type="button"
            @click="policy.registration_required = !policy.registration_required"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.registration_required ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.registration_required ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Felder beim Online-Buchen (Gast-Modus) -->
      <div
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity"
        :class="policy.registration_required ? 'opacity-40 pointer-events-none' : ''"
      >
        <div class="px-5 py-4 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-800">Felder beim Online-Buchen (Gast-Modus)</h2>
          <p class="text-xs text-gray-400 mt-0.5">
            <span v-if="policy.registration_required">Nicht aktiv — Registrierung ist obligatorisch.</span>
            <span v-else>Welche Angaben muss ein Kunde bei der Gast-Buchung eingeben? Klicke ein Feld mehrfach, um zwischen «aus», «optional» und «Pflicht» zu wechseln.</span>
          </p>
        </div>

        <div class="px-5 pt-3 flex items-center gap-4">
          <span class="flex items-center gap-1.5 text-xs text-gray-400">
            <span class="w-4 h-4 rounded border-2 border-gray-200 bg-white inline-block"></span> Aus
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-500">
            <span class="w-4 h-4 rounded border-2 border-gray-400 bg-white inline-block flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
            </span> Optional
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
            <span class="w-4 h-4 rounded border-2 border-transparent inline-block" :style="primaryBg"></span> Pflicht
          </span>
        </div>

        <div class="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            v-for="field in bookingAvailableFields"
            :key="field.key"
            type="button"
            @click="cycleBookingField(field.key)"
            class="flex items-center gap-2.5 text-left select-none rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              :class="bookingFieldState(field.key) === 'hidden' ? 'border-gray-200 bg-white' : ''"
              :style="bookingFieldState(field.key) === 'required'
                ? primaryBg
                : bookingFieldState(field.key) === 'optional'
                  ? { borderColor: '#9ca3af', background: 'white' }
                  : {}"
            >
              <svg v-if="bookingFieldState(field.key) === 'required'" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              <span v-else-if="bookingFieldState(field.key) === 'optional'" class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            </div>
            <span class="text-sm" :class="bookingFieldState(field.key) === 'hidden' ? 'text-gray-400' : 'text-gray-700'">
              {{ field.label }}
              <span v-if="bookingFieldState(field.key) === 'optional'" class="text-xs text-gray-400 ml-0.5">(opt.)</span>
              <span v-else-if="bookingFieldState(field.key) === 'required'" class="text-xs text-red-400 ml-0.5">*</span>
            </span>
          </button>
        </div>
        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <p class="text-xs text-gray-400">Empfehlung: Vorname, Nachname und Telefon als Pflicht. Weniger Felder = höhere Conversion.</p>
        </div>
      </div>

      <!-- Onboarding-E-Mail (öffentlicher Gast-Buchungsflow) -->
      <div
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity"
        :class="policy.registration_required ? 'opacity-40 pointer-events-none' : ''"
      >
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Onboarding-E-Mail nach Gast-Buchung</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              <span v-if="policy.registration_required">Nicht aktiv — Registrierung ist obligatorisch.</span>
              <span v-else>Gäste erhalten nach der Buchung automatisch eine E-Mail mit einem Link zur Kontoaktivierung.</span>
            </p>
          </div>
          <button
            type="button"
            @click="policy.onboarding_email_enabled = !policy.onboarding_email_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.onboarding_email_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.onboarding_email_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Terminbestätigungen -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Terminbestätigungen versenden</h2>
            <p class="text-xs text-gray-400 mt-0.5">Schüler erhalten nach jeder Buchung eine Bestätigungs-E-Mail — sofern eine E-Mail-Adresse bekannt ist.</p>
          </div>
          <button
            type="button"
            @click="policy.confirmation_email_enabled = !policy.confirmation_email_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.confirmation_email_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.confirmation_email_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Felder bei Schüler-Erstellung -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-800">Felder bei Schüler-Erstellung</h2>
          <p class="text-xs text-gray-400 mt-0.5">Welche Angaben muss der Staff beim Anlegen eines neuen Schülers erfassen? Klicke ein Feld mehrfach, um zwischen «aus», «optional» und «Pflicht» zu wechseln.</p>
        </div>

        <div class="px-5 pt-3 flex items-center gap-4">
          <span class="flex items-center gap-1.5 text-xs text-gray-400">
            <span class="w-4 h-4 rounded border-2 border-gray-200 bg-white inline-block"></span> Aus
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-500">
            <span class="w-4 h-4 rounded border-2 border-gray-400 bg-white inline-block flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
            </span> Optional
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
            <span class="w-4 h-4 rounded border-2 border-transparent inline-block" :style="primaryBg"></span> Pflicht
          </span>
        </div>

        <div class="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            v-for="field in availableFields"
            :key="field.key"
            type="button"
            @click="cycleField(field.key)"
            class="flex items-center gap-2.5 text-left select-none rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              :class="fieldState(field.key) === 'hidden' ? 'border-gray-200 bg-white' : ''"
              :style="fieldState(field.key) === 'required'
                ? primaryBg
                : fieldState(field.key) === 'optional'
                  ? { borderColor: '#9ca3af', background: 'white' }
                  : {}"
            >
              <svg v-if="fieldState(field.key) === 'required'" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              <span v-else-if="fieldState(field.key) === 'optional'" class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            </div>
            <span class="text-sm" :class="fieldState(field.key) === 'hidden' ? 'text-gray-400' : 'text-gray-700'">
              {{ field.label }}
              <span v-if="fieldState(field.key) === 'optional'" class="text-xs text-gray-400 ml-0.5">(opt.)</span>
              <span v-else-if="fieldState(field.key) === 'required'" class="text-xs text-red-400 ml-0.5">*</span>
            </span>
          </button>
        </div>
        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <p class="text-xs text-gray-400">Mindestens ein Name ist immer erforderlich. Telefon ist nur nötig wenn Onboarding-SMS aktiv ist.</p>
        </div>
      </div>

      <!-- Onboarding-SMS (intern, Staff erstellt Schüler) -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Onboarding-SMS versenden</h2>
            <p class="text-xs text-gray-400 mt-0.5">Schüler erhalten beim Erstellen durch den Staff automatisch einen SMS-Link zur Kontoaktivierung.</p>
          </div>
          <button
            type="button"
            @click="policy.onboarding_sms_enabled = !policy.onboarding_sms_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.onboarding_sms_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.onboarding_sms_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Registrierungs-Erinnerung -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Registrierungs-Erinnerung</h2>
            <p class="text-xs text-gray-400 mt-0.5">Schüler, die sich noch nicht registriert haben, erhalten automatisch eine Erinnerung.</p>
          </div>
          <button
            type="button"
            @click="policy.registration_reminder_enabled = !policy.registration_reminder_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            :style="policy.registration_reminder_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.registration_reminder_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div v-if="policy.registration_reminder_enabled" class="px-5 py-4 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Erinnerung senden nach</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="policy.registration_reminder_days"
                type="number"
                min="1"
                max="90"
                class="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <span class="text-sm text-gray-500">Tagen (falls noch nicht registriert)</span>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-medium text-gray-500">Kanal</p>

            <label class="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-gray-100 cursor-pointer hover:border-gray-200">
              <div class="flex items-center gap-2.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-700">E-Mail</p>
                  <p class="text-xs text-gray-400">Nur wenn E-Mail-Adresse bekannt</p>
                </div>
              </div>
              <button
                type="button"
                @click="policy.registration_reminder_email_enabled = !policy.registration_reminder_email_enabled"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
                :style="policy.registration_reminder_email_enabled ? primaryBg : { background: '#e5e7eb' }"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="policy.registration_reminder_email_enabled ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </label>

            <label class="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-gray-100 cursor-pointer hover:border-gray-200">
              <div class="flex items-center gap-2.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-700">SMS</p>
                  <p class="text-xs text-gray-400">Enthält personalisierten Registrierungslink</p>
                </div>
              </div>
              <button
                type="button"
                @click="policy.registration_reminder_sms_enabled = !policy.registration_reminder_sms_enabled"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
                :style="policy.registration_reminder_sms_enabled ? primaryBg : { background: '#e5e7eb' }"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="policy.registration_reminder_sms_enabled ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </label>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           GRUPPE 3: Online-Buchung (Kundenflow)
      ══════════════════════════════════════════════════════ -->
      <div class="flex items-center gap-3 pt-3">
        <div class="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0" :style="primaryBgLight">
          <svg class="w-3.5 h-3.5" :style="primaryText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-700 uppercase tracking-widest">Online-Buchung</p>
          <p class="text-xs text-gray-400">Einstellungen für den Kundenflow auf der Buchungsseite</p>
        </div>
      </div>

      <!-- Registrierung obligatorisch -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Registrierung obligatorisch</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              <template v-if="policy.registration_required">
                Kunden müssen sich zuerst registrieren oder einloggen, bevor sie buchen können.
              </template>
              <template v-else>
                Kunden können ohne Passwort buchen (Gast-Buchung). Nach der Buchung erhalten sie
                <template v-if="policy.onboarding_email_enabled">per E-Mail einen Link</template>
                <template v-else>einen Link</template>
                zur Konto-Aktivierung.
              </template>
            </p>
          </div>
          <button
            type="button"
            @click="policy.registration_required = !policy.registration_required"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.registration_required ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.registration_required ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Felder beim Online-Buchen (Gast-Modus) -->
      <div
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity"
        :class="policy.registration_required ? 'opacity-40 pointer-events-none' : ''"
      >
        <div class="px-5 py-4 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-800">Felder beim Online-Buchen (Gast-Modus)</h2>
          <p class="text-xs text-gray-400 mt-0.5">
            <span v-if="policy.registration_required">Nicht aktiv — Registrierung ist obligatorisch.</span>
            <span v-else>Welche Angaben muss ein Kunde bei der Gast-Buchung eingeben? Klicke ein Feld mehrfach, um zwischen «aus», «optional» und «Pflicht» zu wechseln.</span>
          </p>
        </div>
        <div class="px-5 pt-3 flex items-center gap-4">
          <span class="flex items-center gap-1.5 text-xs text-gray-400">
            <span class="w-4 h-4 rounded border-2 border-gray-200 bg-white inline-block"></span> Aus
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-500">
            <span class="w-4 h-4 rounded border-2 border-gray-400 bg-white inline-block flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
            </span> Optional
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
            <span class="w-4 h-4 rounded border-2 border-transparent inline-block" :style="primaryBg"></span> Pflicht
          </span>
        </div>
        <div class="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            v-for="field in bookingAvailableFields"
            :key="field.key"
            type="button"
            @click="cycleBookingField(field.key)"
            class="flex items-center gap-2.5 text-left select-none rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              :class="bookingFieldState(field.key) === 'hidden' ? 'border-gray-200 bg-white' : ''"
              :style="bookingFieldState(field.key) === 'required'
                ? primaryBg
                : bookingFieldState(field.key) === 'optional'
                  ? { borderColor: '#9ca3af', background: 'white' }
                  : {}"
            >
              <svg v-if="bookingFieldState(field.key) === 'required'" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              <span v-else-if="bookingFieldState(field.key) === 'optional'" class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            </div>
            <span class="text-sm" :class="bookingFieldState(field.key) === 'hidden' ? 'text-gray-400' : 'text-gray-700'">
              {{ field.label }}
              <span v-if="bookingFieldState(field.key) === 'optional'" class="text-xs text-gray-400 ml-0.5">(opt.)</span>
              <span v-else-if="bookingFieldState(field.key) === 'required'" class="text-xs text-red-400 ml-0.5">*</span>
            </span>
          </button>
        </div>
        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <p class="text-xs text-gray-400">Empfehlung: Vorname, Nachname und Telefon als Pflicht. Weniger Felder = höhere Conversion.</p>
        </div>
      </div>

      <!-- Onboarding-E-Mail (öffentlicher Gast-Buchungsflow) -->
      <div
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity"
        :class="policy.registration_required ? 'opacity-40 pointer-events-none' : ''"
      >
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Onboarding-E-Mail nach Gast-Buchung</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              <span v-if="policy.registration_required">Nicht aktiv — Registrierung ist obligatorisch.</span>
              <span v-else>Gäste erhalten nach der Buchung automatisch eine E-Mail mit einem Link zur Kontoaktivierung.</span>
            </p>
          </div>
          <button
            type="button"
            @click="policy.onboarding_email_enabled = !policy.onboarding_email_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.onboarding_email_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.onboarding_email_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Terminbestätigungen -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Terminbestätigungen versenden</h2>
            <p class="text-xs text-gray-400 mt-0.5">Schüler erhalten nach jeder Buchung eine Bestätigungs-E-Mail — sofern eine E-Mail-Adresse bekannt ist.</p>
          </div>
          <button
            type="button"
            @click="policy.confirmation_email_enabled = !policy.confirmation_email_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.confirmation_email_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.confirmation_email_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           GRUPPE 3: Staff-Berechtigungen
      ══════════════════════════════════════════════════════ -->
      <div class="flex items-center gap-3 pt-3">
        <div class="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0 bg-amber-50">
          <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-700 uppercase tracking-widest">Staff-Berechtigungen</p>
          <p class="text-xs text-gray-400">Was darf der Staff — und was braucht Admin-Genehmigung?</p>
        </div>
      </div>

      <!-- Rückerstattungen durch Staff -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-800">Rückerstattungen durch Staff</h2>
          <p class="text-xs text-gray-400 mt-0.5">Definiere, ob Staff Rückerstattungen für abgeschlossene Wallee-Zahlungen auslösen darf.</p>
        </div>
        <div class="px-5 py-4 space-y-2">
          <label
            v-for="option in refundPermissionOptions"
            :key="option.value"
            class="flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-colors"
            :class="policy.staff_refund_permission === option.value
              ? 'border-transparent'
              : 'border-gray-100 hover:border-gray-200'"
            :style="policy.staff_refund_permission === option.value ? { borderColor: 'var(--color-primary, #3B82F6)', background: 'var(--color-primary-bg, #EFF6FF)' } : {}"
            @click="policy.staff_refund_permission = option.value"
          >
            <span class="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
              :style="policy.staff_refund_permission === option.value
                ? { borderColor: 'var(--color-primary, #3B82F6)' }
                : { borderColor: '#d1d5db' }"
            >
              <span v-if="policy.staff_refund_permission === option.value"
                class="w-2 h-2 rounded-full"
                :style="{ background: 'var(--color-primary, #3B82F6)' }"
              />
            </span>
            <div>
              <p class="text-sm font-medium text-gray-800">{{ option.label }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ option.description }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex items-center justify-end gap-3 pt-1">
        <p v-if="saveSuccess" class="text-sm text-green-600 font-medium flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Gespeichert
        </p>
        <button
          @click="savePolicy"
          :disabled="isSaving"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60"
          :style="primaryBg"
        >
          <svg v-if="isSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ isSaving ? 'Speichert…' : 'Einstellungen speichern' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePrimaryColor } from '~/composables/usePrimaryColor'
import { useUIStore } from '~/stores/ui'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { primaryBg, primaryText, primaryBgLight } = usePrimaryColor()
const uiStore = useUIStore()

const isLoading = ref(true)
const isSaving = ref(false)
const saveSuccess = ref(false)

const policy = ref({
  student_required_fields: ['first_name', 'last_name', 'phone'] as string[],
  student_optional_fields: [] as string[],
  booking_required_fields: ['first_name', 'last_name', 'phone'] as string[],
  booking_optional_fields: ['email'] as string[],
  registration_required: false,
  confirmation_email_enabled: true,
  registration_reminder_enabled: false,
  registration_reminder_days: 7,
  registration_reminder_email_enabled: true,
  registration_reminder_sms_enabled: true,
  onboarding_sms_enabled: true,
  onboarding_email_enabled: false,
  staff_refund_permission: 'hidden' as 'hidden' | 'request' | 'allowed',
})

const refundPermissionOptions = [
  {
    value: 'hidden',
    label: 'Nicht sichtbar',
    description: 'Staff sieht keine Rückerstattungs-Option. Nur Admins können Rückerstattungen auslösen.',
  },
  {
    value: 'request',
    label: 'Antrag stellen',
    description: 'Staff kann einen Antrag stellen. Der Admin wird benachrichtigt und muss genehmigen.',
  },
  {
    value: 'allowed',
    label: 'Direkt erstatten',
    description: 'Staff kann Rückerstattungen direkt und ohne Admin-Genehmigung auslösen.',
  },
]

const availableFields = [
  { key: 'first_name', label: 'Vorname' },
  { key: 'last_name', label: 'Nachname' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'birthdate', label: 'Geburtsdatum' },
  { key: 'street', label: 'Strasse' },
  { key: 'street_nr', label: 'Hausnummer' },
  { key: 'zip', label: 'PLZ' },
  { key: 'city', label: 'Ort' },
  { key: 'profession', label: 'Beruf' },
]

const bookingAvailableFields = [
  { key: 'first_name', label: 'Vorname' },
  { key: 'last_name', label: 'Nachname' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'birthdate', label: 'Geburtsdatum' },
  { key: 'street', label: 'Strasse' },
  { key: 'street_nr', label: 'Hausnummer' },
  { key: 'zip', label: 'PLZ' },
  { key: 'city', label: 'Ort' },
  { key: 'profession', label: 'Beruf' },
]

// ── Internal (staff) field state ────────────────────────────────────────────
const fieldState = (key: string): 'hidden' | 'optional' | 'required' => {
  if (policy.value.student_required_fields.includes(key)) return 'required'
  if (policy.value.student_optional_fields.includes(key)) return 'optional'
  return 'hidden'
}

const cycleField = (key: string) => {
  const state = fieldState(key)
  policy.value.student_required_fields = policy.value.student_required_fields.filter(f => f !== key)
  policy.value.student_optional_fields = policy.value.student_optional_fields.filter(f => f !== key)
  if (state === 'hidden') {
    policy.value.student_optional_fields = [...policy.value.student_optional_fields, key]
  } else if (state === 'optional') {
    policy.value.student_required_fields = [...policy.value.student_required_fields, key]
  }
}

// ── External (customer booking) field state ──────────────────────────────────
const bookingFieldState = (key: string): 'hidden' | 'optional' | 'required' => {
  if (policy.value.booking_required_fields.includes(key)) return 'required'
  if (policy.value.booking_optional_fields.includes(key)) return 'optional'
  return 'hidden'
}

const cycleBookingField = (key: string) => {
  const state = bookingFieldState(key)
  policy.value.booking_required_fields = policy.value.booking_required_fields.filter(f => f !== key)
  policy.value.booking_optional_fields = policy.value.booking_optional_fields.filter(f => f !== key)
  if (state === 'hidden') {
    policy.value.booking_optional_fields = [...policy.value.booking_optional_fields, key]
  } else if (state === 'optional') {
    policy.value.booking_required_fields = [...policy.value.booking_required_fields, key]
  }
}

const loadPolicy = async () => {
  try {
    const res = await $fetch<{ success: boolean; policy: typeof policy.value }>('/api/admin/booking-policy')
    if (res.policy) {
      policy.value = { ...policy.value, ...res.policy }
    }
  } catch (err: any) {
    uiStore.addNotification({ type: 'error', title: 'Fehler', message: 'Einstellungen konnten nicht geladen werden.' })
  } finally {
    isLoading.value = false
  }
}

const savePolicy = async () => {
  isSaving.value = true
  saveSuccess.value = false
  try {
    await $fetch('/api/admin/booking-policy', {
      method: 'POST',
      body: policy.value,
    })
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
    uiStore.addNotification({ type: 'success', title: 'Gespeichert', message: 'Buchungsrichtlinien wurden aktualisiert.' })
  } catch (err: any) {
    uiStore.addNotification({ type: 'error', title: 'Fehler', message: 'Einstellungen konnten nicht gespeichert werden.' })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => loadPolicy())
</script>
