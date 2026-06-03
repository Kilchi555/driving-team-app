<template>
  <div class="fixed inset-0 overflow-y-auto" :style="{ background: 'linear-gradient(to bottom right, #7C3AED15, #64748b15)' }">
    <div
      class="min-h-full flex flex-col items-center justify-center px-4"
      :style="{ paddingTop: 'max(24px, calc(env(safe-area-inset-top, 0px) + 24px))', paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px))' }"
    >
    
    <!-- Simy Logo (Oben in der Mitte) -->
    <div class="mb-6">
      <img src="/simy-logo.png" alt="Simy" class="h-12">
    </div>
    
    <!-- Login Form -->
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header mit Simy-Branding -->
      <div class="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          
          <h1 class="text-2xl font-bold">Willkommen bei Simy</h1>
          <p class="text-white text-opacity-90 mt-1">
            Melden Sie sich in Ihrem Account an
          </p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="p-6">
        <!-- Session Check Loading -->
        <div v-if="isCheckingSession" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style="border-bottom-color: #7C3AED;"></div>
          <p class="text-gray-600">Überprüfe Session...</p>
        </div>

        <!-- Login Form / MFA Form -->
        <form v-if="!mfaFlow.state.value.requiresMFA" @submit.prevent="handleLogin" class="space-y-4" novalidate>
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              v-model="loginForm.email"
              type="email"
              autocomplete="email"
              class="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
              :class="[
                emailError ? 'border-2 border-red-500' : 'border border-gray-300'
              ]"
              :style="{ '--tw-ring-color': emailError ? '#ef4444' : '#7C3AED' }"
              placeholder="ihre@email.com"
              :disabled="isLoading"
            >
            <p v-if="emailError" class="text-sm text-red-600 mt-1">{{ emailError }}</p>
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="w-full px-3 py-2 pr-10 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                :class="[
                  passwordError ? 'border-2 border-red-500' : 'border border-gray-300'
                ]"
                :style="{ '--tw-ring-color': passwordError ? '#ef4444' : '#7C3AED' }"
                placeholder="Ihr Passwort"
                :disabled="isLoading"
              >
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                :disabled="isLoading"
              >
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
            </div>
            <p v-if="passwordError" class="text-sm text-red-600 mt-1">{{ passwordError }}</p>
          </div>

          <!-- Remember Me -->
          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input
                v-model="loginForm.rememberMe"
                type="checkbox"
                class="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                :disabled="isLoading"
              >
              <span class="ml-2 text-sm text-gray-600">Angemeldet bleiben</span>
            </label>
            
            <button
              type="button"
              @click="() => { logger.debug('Button clicked'); showForgotPasswordModal = true; logger.debug('Modal set to:', showForgotPasswordModal); }"
              class="text-sm text-violet-600 hover:underline hover:text-violet-800 cursor-pointer"
            >
              Passwort vergessen?
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="loginError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ loginError }}</p>
          </div>

          <!-- Pending Account Banner -->
          <div v-if="pendingAccount.show" class="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p class="text-sm font-medium text-amber-800">Account noch nicht aktiviert</p>
                <p class="text-sm text-amber-700 mt-1">
                  Sie wurden von Ihrer Fahrschule erfasst, haben die Registrierung aber noch nicht abgeschlossen.
                  Geben Sie Ihre Telefonnummer ein, um einen neuen Onboarding-Link per SMS zu erhalten.
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <input
                v-model="pendingAccount.phone"
                type="tel"
                placeholder="+41 79 123 45 67"
                class="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:border-transparent bg-white"
                :style="{ '--tw-ring-color': '#d97706' }"
                :disabled="pendingAccount.isLoading"
              >
              <button
                type="button"
                @click="handleResendOnboarding"
                :disabled="pendingAccount.isLoading || !pendingAccount.phone"
                class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :style="{ background: '#d97706' }"
              >
                <span v-if="pendingAccount.isLoading">Wird gesendet...</span>
                <span v-else>SMS senden</span>
              </button>
            </div>

            <p v-if="pendingAccount.error" class="text-sm text-red-600">{{ pendingAccount.error }}</p>
            <p v-if="pendingAccount.success" class="text-sm text-green-700 font-medium">{{ pendingAccount.success }}</p>
          </div>

          <!-- hCaptcha - only show after 3 failed attempts -->
          <div v-if="requiresCaptcha" class="flex flex-col items-center">
            <div
              id="login-hcaptcha"
              :class="{ 'ring-2 ring-red-500 rounded': captchaError }"
            ></div>
            <p v-if="captchaError" class="text-sm text-red-600 mt-2 text-center">
              Bitte bestätigen Sie, dass Sie kein Roboter sind
            </p>
            <p class="text-xs text-gray-500 mt-2 text-center">
              Sicherheitsüberprüfung erforderlich (mehrere fehlgeschlagene Anmeldeversuche)
            </p>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading || rateLimitCountdown > 0"
            class="w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ 
              background: '#7C3AED',
              '--hover-color': '#7C3AED' + 'dd'
            }"
            @mouseenter="($event.target as HTMLElement).style.opacity = '0.9'"
            @mouseleave="($event.target as HTMLElement).style.opacity = '1'"
          >
            <span v-if="rateLimitCountdown > 0">
              Bitte warten Sie {{ rateLimitCountdown }}s...
            </span>
            <span v-else-if="isLoading">Wird angemeldet...</span>
            <span v-else>Anmelden</span>
          </button>

          <!-- Face ID / Touch ID (native only, shown once credentials are saved) -->
          <template v-if="isNativeApp && biometricAvailable && biometricCredentialsStored">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-100"></div>
              </div>
              <div class="relative flex justify-center">
                <span class="px-3 bg-white text-xs text-gray-400">oder</span>
              </div>
            </div>
            <button
              type="button"
              @click="handleBiometricLogin"
              :disabled="isLoading"
              class="w-full py-3 px-4 rounded-xl border-2 border-gray-200 bg-white font-semibold text-gray-700 transition-all hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <!-- Face ID icon -->
              <svg v-if="biometricType === 2" class="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <!-- Fingerprint icon -->
              <svg v-else class="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 018 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/>
              </svg>
              <span>{{ biometricType === 2 ? 'Mit Face ID anmelden' : 'Mit Touch ID anmelden' }}</span>
            </button>
          </template>

          <!-- Passkey login (web, role-gated via PASSKEY_ENABLED_ROLES) -->
          <!-- Only shown for direct platform-admin login (no tenant context) to avoid confusing staff/clients in Phase 1 -->
          <template v-if="passkeySupported && passkeyEnabledForAnyone && !tenantParam">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-100"></div>
              </div>
              <div class="relative flex justify-center">
                <span class="px-3 bg-white text-xs text-gray-400">oder</span>
              </div>
            </div>
            <button
              type="button"
              @click="handlePasskeyLogin"
              :disabled="isLoading"
              class="w-full py-3 px-4 rounded-xl border-2 border-violet-200 bg-violet-50 font-semibold text-violet-900 transition-all hover:border-violet-400 hover:bg-violet-100 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg class="w-6 h-6 text-violet-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A8.974 8.974 0 0112 3c.972 0 1.907.155 2.785.443M3.302 8.293A8.99 8.99 0 003 11c0 1.605.422 3.111 1.158 4.421M21 12a8.952 8.952 0 00-1.275-4.624M9 13l2 2 4-4"/>
              </svg>
              <span>Mit Passkey anmelden</span>
            </button>
            <p v-if="passkeyError" class="text-xs text-red-600 text-center">{{ passkeyError }}</p>
          </template>
        </form>


        <!-- MFA Verification Form -->
        <div v-else-if="mfaFlow.state.value.requiresMFA" class="space-y-4">
          <!-- MFA Header -->
          <div class="text-center mb-6">
            <h2 class="text-xl font-bold text-gray-900">
              Multi-Faktor-Authentifizierung
            </h2>
            <p class="text-sm text-gray-600 mt-2">
              Wählen Sie eine Verifizierungsmethode
            </p>
          </div>

          <!-- MFA-Methoden Auswahl -->
          <div v-if="mfaFlow.state.value.availableOptions.length > 0" class="space-y-2">
            <p class="text-sm font-medium text-gray-700">Authentifizierungsmethode:</p>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="method in mfaFlow.state.value.availableOptions"
                :key="method.id"
                type="button"
                @click="mfaFlow.selectMFAMethod(method.id)"
                :class="{
                  'ring-2': mfaFlow.state.value.selectedOption?.id === method.id,
                  'ring-offset-0': mfaFlow.state.value.selectedOption?.id === method.id
                }"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors hover:border-gray-400"
                :style="{
                  background: mfaFlow.state.value.selectedOption?.id === method.id 
                    ? '#7C3AED10' 
                    : 'white',
                  color: mfaFlow.state.value.selectedOption?.id === method.id
                    ? '#7C3AED'
                    : '#374151',
                  borderColor: mfaFlow.state.value.selectedOption?.id === method.id
                    ? '#7C3AED'
                    : '#d1d5db'
                }"
              >
                {{ method.name }}
              </button>
            </div>
          </div>

          <!-- Code Input -->
          <div>
            <label for="mfa-code" class="block text-sm font-medium text-gray-700 mb-2">
              Bestätigungscode
            </label>
            <input
              id="mfa-code"
              :value="mfaFlow.state.value.code"
              @input="mfaFlow.updateCode(($event.target as HTMLInputElement).value)"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              class="w-full px-4 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--tw-ring-color': '#7C3AED' }"
            >
            <p class="text-xs text-gray-500 mt-1 text-center">
              Code an {{ mfaFlow.state.value.email }}
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="mfaFlow.state.value.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ mfaFlow.state.value.error }}</p>
            <p v-if="mfaFlow.state.value.remainingAttempts > 0 && mfaFlow.state.value.remainingAttempts < 3" class="text-xs text-red-600 mt-1">
              Noch {{ mfaFlow.state.value.remainingAttempts }} Versuche
            </p>
            <p v-if="mfaFlow.state.value.remainingAttempts === 0" class="text-xs text-red-600 mt-2">
              Passwort vergessen? Bitte benutzen Sie die Passwort zurücksetzen Funktion unten.
            </p>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <!-- Code versenden -->
            <button
              type="button"
              @click="mfaFlow.sendMFACode()"
              :disabled="mfaFlow.state.value.isVerifying"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="mfaFlow.state.value.isVerifying">Wird versendet...</span>
              <span v-else>Erneut versenden</span>
            </button>

            <!-- Verifizieren -->
            <button
              type="button"
              @click="handleMFAVerify()"
              :disabled="!mfaFlow.canSubmitCode.value"
              class="flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :style="{ background: '#7C3AED' }"
            >
              <span v-if="mfaFlow.state.value.isVerifying">Wird überprüft...</span>
              <span v-else>Verifizieren</span>
            </button>
          </div>

          <!-- Zurück Button -->
          <button
            type="button"
            @click="mfaFlow.resetMFAState()"
            class="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Zurück
          </button>
        </div>

        <!-- Footer Links -->
        <div class="mt-6 text-center">
          <p v-if="!isNativeApp" class="text-sm text-gray-600">
            Noch kein Account? 
            <NuxtLink :to="'/register'" class="font-medium hover:underline" style="color: #7C3AED;">
              Registrieren
            </NuxtLink>
          </p>
          <p v-else class="text-sm text-gray-500">
            Konto-Erstellung nur über Einladung deiner Fahrschule.
          </p>

          <div v-if="!isNativeApp" class="mt-4 pt-4 border-t border-gray-200">
            <NuxtLink to="/" class="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Zurück zur Startseite
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Passwort Vergessen Modal -->
    <div v-if="showForgotPasswordModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-t-xl">
          <h2 class="text-2xl font-bold">Passwort zurücksetzen</h2>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <p class="text-gray-600 text-sm">
            Geben Sie Ihre E-Mail-Adresse oder Telefonnummer ein, und wir senden Ihnen einen Magic Link zum Zurücksetzen Ihres Passworts.
          </p>

          <!-- Contact Method Selector -->
          <div class="flex gap-2">
            <button
              @click="resetContactMethod = 'email'; resetNotFound = null"
              :class="[
                'flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm',
                resetContactMethod === 'email'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              :style="resetContactMethod === 'email' ? { background: '#7C3AED' } : {}"
            >
              E-Mail
            </button>
            <button
              @click="resetContactMethod = 'phone'; resetNotFound = null"
              :class="[
                'flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm',
                resetContactMethod === 'phone'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              :style="resetContactMethod === 'phone' ? { background: '#7C3AED' } : {}"
            >
              Telefon
            </button>
          </div>

          <!-- Email Input -->
          <div v-if="resetContactMethod === 'email'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              v-model="resetForm.email"
              type="email"
              placeholder="ihre@email.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--tw-ring-color': '#7C3AED' }"
              :disabled="resetIsLoading"
            >
          </div>

          <!-- Phone Input -->
          <div v-if="resetContactMethod === 'phone'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Telefonnummer
            </label>
            <input
              v-model="resetForm.phone"
              type="tel"
              placeholder="+41 79 123 45 67"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--tw-ring-color': '#7C3AED' }"
              :disabled="resetIsLoading"
            >
          </div>

          <!-- Error Message -->
          <div v-if="resetError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ resetError }}</p>
          </div>

          <!-- Not Found: email — suggest phone -->
          <div v-if="resetNotFound === 'email'" class="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p class="text-sm text-amber-800 font-medium">Diese E-Mail-Adresse ist bei uns nicht hinterlegt.</p>
            <p class="text-sm text-amber-700">Wurden Sie vielleicht mit einer Telefonnummer registriert?</p>
            <button
              @click="resetNotFound = null; resetContactMethod = 'phone'; resetForm.email = ''"
              class="w-full py-2 px-4 rounded-lg font-medium text-sm text-white transition-colors"
              style="background: #7C3AED"
            >
              Mit Telefonnummer versuchen
            </button>
          </div>

          <!-- Not Found: phone — suggest register -->
          <div v-if="resetNotFound === 'phone'" class="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p class="text-sm text-amber-800 font-medium">Diese Telefonnummer ist bei uns nicht hinterlegt.</p>
            <p class="text-sm text-amber-700">Noch kein Konto? Jetzt kostenlos registrieren.</p>
            <NuxtLink
              to="/register"
              @click="showForgotPasswordModal = false"
              class="block w-full py-2 px-4 rounded-lg font-medium text-sm text-center text-white transition-colors"
              style="background: #7C3AED"
            >
              Jetzt registrieren
            </NuxtLink>
          </div>

          <!-- Success Message -->
          <div v-if="resetSuccess" class="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-700">{{ resetSuccess }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              @click="showForgotPasswordModal = false; resetNotFound = null"
              class="flex-1 py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              :disabled="resetIsLoading"
            >
              Abbrechen
            </button>
            <button
              @click="handlePasswordReset"
              class="flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
              :style="{ background: '#7C3AED' }"
              :disabled="resetIsLoading"
            >
              <span v-if="resetIsLoading">Wird gesendet...</span>
              <span v-else>Magic Link senden</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Biometric Credentials Prompt (native only, shown after first successful login) -->
    <Transition name="biometric-slide">
      <div v-if="showSaveBiometricPrompt" class="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="dismissSaveBiometric"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <div class="flex items-center justify-center w-16 h-16 bg-violet-100 rounded-2xl mx-auto">
            <svg class="w-8 h-8 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
            </svg>
          </div>
          <div class="text-center">
            <h3 class="text-xl font-bold text-gray-900">
              {{ biometricType === 2 ? 'Face ID aktivieren?' : 'Touch ID aktivieren?' }}
            </h3>
            <p class="text-sm text-gray-500 mt-2 leading-relaxed">
              Beim nächsten Öffnen einfach {{ biometricType === 2 ? 'mit Face ID' : 'mit Touch ID' }} einloggen — kein Passwort nötig.
            </p>
          </div>
          <button
            type="button"
            @click="confirmSaveBiometric"
            class="w-full py-3.5 rounded-2xl text-white font-semibold text-base"
            style="background: #7C3AED"
          >
            {{ biometricType === 2 ? 'Face ID aktivieren' : 'Touch ID aktivieren' }}
          </button>
          <button
            type="button"
            @click="dismissSaveBiometric"
            class="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Nicht jetzt
          </button>
        </div>
      </div>
    </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { useStatusBar } from '~/composables/useStatusBar'
import { useRouter, definePageMeta, useHead, useRoute, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useTenant } from '~/composables/useTenant'
import { useMFAFlow } from '~/composables/useMFAFlow'
import { logger } from '~/utils/logger'

// Meta
definePageMeta({
  layout: false
  // No middleware restriction - let it be public
})

// Composables
const router = useRouter()
const route = useRoute()
const { login, logout, isLoggedIn, loading } = useAuthStore()
const { showError, showSuccess } = useUIStore()
const { loadTenant, currentTenant } = useTenant()

useStatusBar({
  backgroundColor: '#f5f0fb',
  style: 'dark'
})
const mfaFlow = useMFAFlow()

// Hide registration / "back to home" links in the native app — registration in
// the native app is invitation-only via onboarding link.
const isNativeApp = computed(() => {
  if (process.server) return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
})

// Get tenant from URL parameter or route params
const tenantParam = ref(
  (route.params.tenant as string) || 
  (route.query.tenant as string) || 
  ''
)

// Watch for tenant changes and load tenant
watch(
  () => [route.params.tenant, route.query.tenant],
  ([paramTenant, queryTenant]) => {
    const newTenant = (paramTenant as string) || (queryTenant as string)
    if (newTenant && newTenant !== tenantParam.value) {
      tenantParam.value = newTenant
      logger.debug('🏢 Tenant updated from URL:', tenantParam.value)
      loadTenant(tenantParam.value)
    }
  },
  { immediate: true }
)

// Computed
const isCheckingSession = computed<boolean>(() => Boolean((loading as any).value ?? loading))
const isAuthenticated = computed<boolean>(() => Boolean((isLoggedIn as any).value ?? isLoggedIn))

// State
const isLoading = ref(false)
const loginError = ref<string | null>(null)
const showPassword = ref(false)
const showForgotPasswordModal = ref(false)
const rateLimitCountdown = ref<number>(0)
const rateLimitInterval = ref<NodeJS.Timeout | null>(null)

// Adaptive Captcha State
const failedLoginAttempts = ref<number>(0)
const requiresCaptcha = computed(() => failedLoginAttempts.value >= 3)
const captchaError = ref(false)
const widgetId = ref<number | null>(null)

// Password Reset State
const resetContactMethod = ref<'email' | 'phone'>('email')
const resetIsLoading = ref(false)
const resetError = ref<string | null>(null)
const resetSuccess = ref<string | null>(null)
const resetNotFound = ref<'email' | 'phone' | null>(null)

// Pending Account State
const pendingAccount = ref({
  show: false,
  phone: '',
  isLoading: false,
  error: null as string | null,
  success: null as string | null
})

// ─── Passkey Login (web, role-gated via PASSKEY_ENABLED_ROLES) ───────────
const passkeySupported = ref(false)
const passkeyEnabledForAnyone = ref(false)
const passkeyError = ref<string | null>(null)
const { loginWithPasskey, fetchStatus, isSupported: passkeyBrowserSupported } = usePasskey()

const checkPasskeyAvailability = async () => {
  if (process.server) return
  // Hide on native (iOS/Android) — Passkeys require apple-app-site-association /
  // assetlinks.json + native plugin setup which is not in place yet. Web only for Phase 1.
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
  if (isNative) {
    passkeySupported.value = false
    return
  }
  passkeySupported.value = passkeyBrowserSupported.value
  try {
    const status = await fetchStatus()
    // Gate the login button on the explicit PASSKEY_LOGIN_ENABLED flag, not on
    // whether the feature is enabled for some role — so admins can register
    // passkeys before the button is exposed to everyone.
    passkeyEnabledForAnyone.value = status.loginEnabled
  } catch {
    passkeyEnabledForAnyone.value = false
  }
}

const handlePasskeyLogin = async () => {
  if (isLoading.value) return
  passkeyError.value = null
  isLoading.value = true
  try {
    // Use the email field if provided (targeted login). Empty = discoverable.
    const email = loginForm.value.email?.trim()
    const result = await loginWithPasskey(email || undefined)
    if (result.success && result.user) {
      // Mirror the success path of handleLogin
      const role = result.user.role
      let redirectPath = '/'
      if (role === 'admin' || role === 'tenant_admin' || role === 'superadmin') {
        redirectPath = '/admin/dashboard'
      } else if (role === 'staff') {
        redirectPath = '/staff/dashboard'
      } else if (role === 'client') {
        redirectPath = '/customer-dashboard'
      }
      window.location.href = redirectPath
    } else {
      passkeyError.value = 'Passkey-Anmeldung fehlgeschlagen.'
    }
  } catch (err: any) {
    passkeyError.value = err?.data?.statusMessage || err?.message || 'Passkey-Anmeldung fehlgeschlagen.'
  } finally {
    isLoading.value = false
  }
}

// ─── Biometric Login (native only) ────────────────────────────────────────
const BIOMETRIC_SERVER = 'simy.ch'
const biometricAvailable = ref(false)
const biometricType = ref(0) // 2 = Face ID, 3 = Touch ID / Fingerprint
const biometricCredentialsStored = ref(false)
const showSaveBiometricPrompt = ref(false)
const pendingRedirectPath = ref('')
const loginViaBiometric = ref(false)

const checkBiometric = async () => {
  if (process.server || !isNativeApp.value) return
  try {
    const { BiometricAuth, BiometryType } = await import('@aparajita/capacitor-biometric-auth')
    const result = await BiometricAuth.checkBiometry()
    biometricAvailable.value = result.isAvailable
    biometricType.value = result.biometryType
    if (result.isAvailable) {
      const { Preferences } = await import('@capacitor/preferences')
      const { value } = await Preferences.get({ key: BIOMETRIC_SERVER })
      biometricCredentialsStored.value = !!value
    }
  } catch {
    biometricAvailable.value = false
  }
}

const handleBiometricLogin = async () => {
  isLoading.value = true
  loginError.value = null
  loginViaBiometric.value = true
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    await BiometricAuth.authenticate({ reason: 'Einloggen' })
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key: BIOMETRIC_SERVER })
    if (!value) throw new Error('no credentials')
    const creds = JSON.parse(value)
    loginForm.value.email = creds.email
    loginForm.value.password = creds.password
    await handleLogin()
  } catch (e: any) {
    const msg = (e?.message || '').toLowerCase()
    if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('user cancel') && !msg.includes('no credentials')) {
      loginError.value = 'Biometrische Authentifizierung fehlgeschlagen. Bitte mit Passwort anmelden.'
    }
  } finally {
    loginViaBiometric.value = false
    isLoading.value = false
  }
}

const confirmSaveBiometric = async () => {
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({
      key: BIOMETRIC_SERVER,
      value: JSON.stringify({ email: loginForm.value.email, password: loginForm.value.password })
    })
    biometricCredentialsStored.value = true
  } catch { /* silent */ }
  showSaveBiometricPrompt.value = false
  router.push(pendingRedirectPath.value)
}

const dismissSaveBiometric = () => {
  showSaveBiometricPrompt.value = false
  router.push(pendingRedirectPath.value)
}

const resetForm = ref({
  email: '',
  phone: ''
})

const loginForm = ref({
  email: '',
  password: '',
  rememberMe: false
})

// Inline validation errors
const emailError = ref<string | null>(null)
const passwordError = ref<string | null>(null)

// Validate email in real-time
watch(() => loginForm.value.email, (newEmail) => {
  if (!newEmail) {
    emailError.value = null
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail.trim())) {
    emailError.value = 'Ungültige E-Mail-Adresse'
  } else {
    emailError.value = null
  }
})

// Validate password length in real-time (only minimum check for login)
watch(() => loginForm.value.password, (newPassword) => {
  // No validation on login - accept any password length
  // (users have different password requirements from different registration times)
  passwordError.value = null
})


// Methods
const handleLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = 'Bitte füllen Sie alle Felder aus.'
    return
  }

  isLoading.value = true
  loginError.value = null
  captchaError.value = false

  try {
    logger.debug('🔑 Starting login attempt for:', loginForm.value.email)
    
    // Get hCaptcha token if required
    let captchaToken: string | null = null
    if (requiresCaptcha.value && process.client) {
      logger.debug('🔐 Captcha required, getting token...')
      
      for (let attempt = 0; attempt < 10; attempt++) {
        if ((window as any).hcaptcha && widgetId.value !== null) {
          try {
            const response = (window as any).hcaptcha.getResponse(widgetId.value)
            if (response && typeof response === 'string' && response.length > 0) {
              captchaToken = response
              logger.debug('✅ hCaptcha token received')
              break
            } else if (attempt === 0) {
              logger.debug('ℹ️ hCaptcha response is empty - user might not have completed the challenge yet')
            }
          } catch (error: any) {
            logger.debug(`⚠️ Error calling getResponse on attempt ${attempt + 1}:`, error?.message || error)
          }
        }
        
        if (attempt < 9 && !captchaToken) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      if (!captchaToken) {
        captchaError.value = true
        loginError.value = 'Bitte führen Sie die Captcha-Verifikation durch'
        return
      }
    }
    
    // Versuche zu authentifizieren über den neuen Login-Endpoint mit MFA-Support
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: loginForm.value.email.toLowerCase().trim(),
        password: loginForm.value.password,
        tenantId: currentTenant.value?.id || null,
        rememberMe: loginForm.value.rememberMe, // Send "Remember Me" preference
        captchaToken // Send captcha token if available
      }
    }) as any

    logger.debug('📋 Login response:', { requiresMFA: response?.requiresMFA, success: response?.success })

    // ✨ MFA erforderlich?
    if (response?.requiresMFA) {
      logger.debug('🔐 MFA erforderlich für:', response.email)
      await mfaFlow.handleMFARequired(response.email)
      return // MFA-Screen wird jetzt angezeigt
    }

    // Fehler beim Login?
    if (!response?.success || response?.requiresMFA) {
      const errorMsg = response?.statusMessage || 'Anmeldung fehlgeschlagen'
      
      if (errorMsg?.includes('Invalid login credentials')) {
        loginError.value = 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail-Adresse und Ihr Passwort.'
      } else if (errorMsg?.includes('Account')) {
        loginError.value = errorMsg
      } else if (errorMsg?.includes('too many') || errorMsg?.includes('429')) {
        loginError.value = 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.'
      } else {
        loginError.value = errorMsg || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      }
      return
    }

    // Normales Login erfolgreich
    logger.debug('✅ Login successful')
    
    // 💾 WICHTIG: Speichere Supabase Session für Token Refresh Interceptor
    if (response?.session?.access_token && response?.session?.refresh_token) {
      try {
        if (typeof localStorage !== 'undefined') {
          const sessionData = {
            access_token: response.session.access_token,
            refresh_token: response.session.refresh_token,
            timestamp: Date.now()
          }
          localStorage.setItem('supabase-session-cache', JSON.stringify(sessionData))
          logger.debug('💾 Supabase session saved to localStorage')
        }
      } catch (err) {
        logger.warn('⚠️ Failed to save session to localStorage:', err)
      }
    } else {
      logger.warn('⚠️ No session tokens in response')
    }
    
    // Reset failed login attempts on success
    failedLoginAttempts.value = 0
    
    // Session tokens are now in HTTP-Only cookies (set by backend)
    // No need to call setSession - cookies are automatically sent with requests
    logger.debug('🔐 Session stored in httpOnly cookie (secure)')
    
    // Speichere User in Auth Store
    const authStore = useAuthStore()
    authStore.user = response.user
    
    // Use profile from login response (if available) or fetch via API
    if (response.profile) {
      authStore.userProfile = response.profile
      authStore.userRole = response.profile.role || ''
      logger.debug('✅ User profile from login response:', response.profile.email)
    } else {
      // Fallback: fetch profile via API
      await authStore.fetchUserProfile(response.user.id)
    }
    
    const user = authStore.userProfile
    
    if (!user) {
      console.error('❌ User profile not loaded after login!')
      loginError.value = 'Fehler beim Laden des Benutzerprofils. Bitte erneut einloggen.'
      await authStore.logout()
      return
    }
    
    logger.debug('✅ User profile loaded:', user.email)

    // Lade Tenant-Informationen
    let redirectPath = '/dashboard' // Fallback
    
    // Master Admin geht direkt zu /tenant-admin
    if (user.role === 'super_admin') {
      logger.debug('👑 Master Admin detected, redirecting to /tenant-admin')
      redirectPath = '/tenant-admin'
    } else if (user.tenant_id) {
      logger.debug('🏢 Loading tenant info for tenant_id:', user.tenant_id)
      
      try {
        const { getSupabase } = await import('~/utils/supabase')
        const supabase = getSupabase()
        
        if (supabase) {
          const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', user.tenant_id)
            .single()
          
          if (tenantError) {
            console.error('❌ Error loading tenant:', tenantError)
          } else if (tenant?.slug) {
            logger.debug('✅ Found tenant slug:', tenant.slug)
            
            // Weiterleitung basierend auf Rolle
            if (user.role === 'admin' || user.role === 'tenant_admin') {
              redirectPath = '/admin'
            } else if (user.role === 'staff') {
              redirectPath = '/dashboard'
            } else {
              redirectPath = '/customer-dashboard'
            }
          }
        }
      } catch (err) {
        console.error('❌ Error initializing Supabase:', err)
      }
    }
    
    // If a returnTo param was provided (e.g. from /upgrade), honour it for safe internal paths
    const returnTo = route.query.returnTo as string | undefined
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      redirectPath = returnTo
    }

    logger.debug('🔄 Redirecting to:', redirectPath)
    if (isNativeApp.value && biometricAvailable.value && !biometricCredentialsStored.value && !loginViaBiometric.value) {
      pendingRedirectPath.value = redirectPath
      showSaveBiometricPrompt.value = true
    } else {
      router.push(redirectPath)
    }
    
  } catch (error: any) {
    console.error('Login error:', error)
    
    // Increment failed login attempts (for adaptive captcha)
    failedLoginAttempts.value++
    logger.debug(`❌ Failed login attempt #${failedLoginAttempts.value}`)
    
    // Get the status message from multiple possible paths
    const errorMsg = error?.data?.statusMessage || 
                     error?.data?.message ||
                     error?.cause?.statusMessage ||
                     error?.statusMessage ||
                     error?.message || 
                     'Anmeldung fehlgeschlagen'
    
    // Check for rate limit error and start countdown - use toLowerCase() for case-insensitive matching
    const isRateLimitError = errorMsg?.toLowerCase().includes('too many') || 
                             errorMsg?.includes('429') || 
                             errorMsg?.toLowerCase().includes('zu viele')
    
    if (isRateLimitError) {
      loginError.value = 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.'
      
      // Get retry-after time from MULTIPLE possible paths
      let retryAfter = 60000 // fallback to 60 seconds
      
      // Try all possible paths - order matters! Most nested first
      if (error?.cause?.data?.retryAfter !== undefined) {
        retryAfter = error.cause.data.retryAfter
      } else if (error?.data?.data?.retryAfter !== undefined) {
        retryAfter = error.data.data.retryAfter
      } else if (error?.data?.retryAfter !== undefined) {
        retryAfter = error.data.retryAfter
      }
      
      const countdown = Math.ceil(retryAfter / 1000) // convert to seconds
      rateLimitCountdown.value = Math.max(1, countdown) // minimum 1 second
      console.log('Rate limit countdown set to:', rateLimitCountdown.value, 'seconds')
      
      // Start countdown timer
      if (rateLimitInterval.value) clearInterval(rateLimitInterval.value)
      rateLimitInterval.value = setInterval(() => {
        rateLimitCountdown.value--
        if (rateLimitCountdown.value <= 0) {
          if (rateLimitInterval.value) clearInterval(rateLimitInterval.value)
          rateLimitCountdown.value = 0
        }
      }, 1000)
    } else if (errorMsg?.includes('Invalid login credentials') || errorMsg?.includes('falsch') || errorMsg?.includes('invalid_credentials')) {
      loginError.value = 'Benutzername und/oder Passwort ist falsch.'
    } else if (errorMsg?.includes('Account')) {
      loginError.value = errorMsg
    } else if (errorMsg?.includes('Email not confirmed')) {
      loginError.value = 'Bitte bestätigen Sie Ihre E-Mail-Adresse zuerst.'
    } else if (error?.data?.data?.code === 'ACCOUNT_PENDING' || error?.data?.code === 'ACCOUNT_PENDING') {
      loginError.value = null
      pendingAccount.value.show = true
      pendingAccount.value.phone = ''
      pendingAccount.value.error = null
      pendingAccount.value.success = null
    } else if (errorMsg?.includes('User not found')) {
      loginError.value = 'Benutzername und/oder Passwort ist falsch.'
    } else if (errorMsg?.includes('disabled')) {
      loginError.value = 'Ihr Account wurde deaktiviert. Bitte kontaktieren Sie den Administrator.'
    } else if (errorMsg?.includes('network') || errorMsg?.includes('timeout')) {
      loginError.value = 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.'
    } else if (error?.status === 401 || error?.statusCode === 401 || error?.data?.statusCode === 401) {
      loginError.value = 'Benutzername und/oder Passwort ist falsch.'
    } else {
      loginError.value = errorMsg || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
  } finally {
    isLoading.value = false
  }
}

const handleMFAVerify = async () => {
  const result = await mfaFlow.verifyMFACode(loginForm.value.password)
  
  if (result && result.success) {
    logger.debug('✅ MFA verification successful, logging in...')
    
    // MFA erfolgreich - führe normales Login-Ende aus
    const authStore = useAuthStore()
    authStore.user = result.user
    
    await new Promise(resolve => setTimeout(resolve, 200))
    await authStore.fetchUserProfile(result.user.id)
    
    const user = authStore.userProfile
    
    if (!user) {
      loginError.value = 'Fehler beim Laden des Benutzerprofils.'
      return
    }
    
    let redirectPath = '/dashboard'
    
    // Master Admin geht direkt zu /tenant-admin
    if (user.role === 'super_admin') {
      logger.debug('👑 Master Admin detected, redirecting to /tenant-admin')
      redirectPath = '/tenant-admin'
    } else if (user.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', user.tenant_id)
        .single()
      
      if (tenant?.slug) {
        if (user.role === 'admin' || user.role === 'tenant_admin') {
          redirectPath = '/admin'
        } else if (user.role === 'staff') {
          redirectPath = '/dashboard'
        } else {
          redirectPath = '/customer-dashboard'
        }
      }
    }
    
    const returnTo2 = route.query.returnTo as string | undefined
    if (returnTo2 && returnTo2.startsWith('/') && !returnTo2.startsWith('//')) {
      redirectPath = returnTo2
    }

    logger.debug('🔄 Redirecting to:', redirectPath)
    router.push(redirectPath)
  }
}

const handleResendOnboarding = async () => {
  pendingAccount.value.error = null
  pendingAccount.value.success = null

  let phone = pendingAccount.value.phone.replace(/\s/g, '')
  if (phone.startsWith('00')) {
    phone = '+' + phone.slice(2)
  } else if (phone.startsWith('0')) {
    phone = '+41' + phone.slice(1)
  } else if (!phone.startsWith('+')) {
    phone = '+41' + phone
  }

  pendingAccount.value.isLoading = true
  try {
    const response = await $fetch('/api/auth/resend-onboarding-by-phone', {
      method: 'POST',
      body: {
        phone,
        tenantId: currentTenant.value?.id || null
      }
    }) as any

    if (response?.alreadyActive) {
      pendingAccount.value.error = 'Dieser Account ist bereits aktiv. Bitte melden Sie sich mit Ihrem Passwort an oder nutzen Sie "Passwort vergessen".'
      pendingAccount.value.show = false
    } else {
      pendingAccount.value.success = 'SMS wurde gesendet! Bitte prüfen Sie Ihr Handy und folgen Sie dem Link zur Registrierung.'
    }
  } catch (error: any) {
    const msg = error?.data?.statusMessage || error?.message || 'Fehler beim Senden der SMS.'
    pendingAccount.value.error = msg
  } finally {
    pendingAccount.value.isLoading = false
  }
}

const handlePasswordReset = async () => {
  resetError.value = null
  resetSuccess.value = null
  resetNotFound.value = null

  let contact = resetContactMethod.value === 'email' ? resetForm.value.email : resetForm.value.phone

  if (!contact) {
    resetError.value = resetContactMethod.value === 'email' 
      ? 'Bitte geben Sie eine E-Mail-Adresse ein.' 
      : 'Bitte geben Sie eine Telefonnummer ein.'
    return
  }

  // Format phone number: add +41 if starts with 0
  if (resetContactMethod.value === 'phone') {
    contact = contact.replace(/\s/g, '') // Remove spaces
    if (contact.startsWith('0')) {
      contact = '+41' + contact.substring(1)
    } else if (!contact.startsWith('+')) {
      contact = '+41' + contact
    }
    logger.debug('📱 Formatted phone number:', contact)
  }

  resetIsLoading.value = true

  try {
    logger.debug('🔐 Requesting password reset for:', contact)
    
    const response = await $fetch('/api/auth/password-reset-request', {
      method: 'POST',
      body: {
        contact,
        method: resetContactMethod.value,
        tenantId: null // We'll determine this from the contact
      }
    }) as any

    logger.debug('📧 Password reset response:', response)

    if (response?.success) {
      // Check if there was a warning (sending failed)
      if (response?.warning) {
        resetError.value = response.message
      } else {
        resetSuccess.value = resetContactMethod.value === 'email'
          ? `Ein Magic Link wurde an ${contact} gesendet. Bitte überprüfen Sie Ihren Posteingang.`
          : `Ein Magic Link wurde an ${contact} gesendet. Bitte überprüfen Sie Ihre SMS.`
        
        resetForm.value.email = ''
        resetForm.value.phone = ''
        
        logger.debug('✅ Password reset email/SMS sent, closing modal in 3 seconds...')
        
        setTimeout(() => {
          showForgotPasswordModal.value = false
          resetSuccess.value = null
        }, 3000)
      }
    } else if (response?.code === 'NOT_FOUND') {
      resetNotFound.value = resetContactMethod.value
    } else {
      resetError.value = response?.message || 'Fehler beim Senden des Magic Links. Bitte versuchen Sie es später erneut.'
    }
  } catch (error: any) {
    console.error('❌ Password reset error:', error)
    console.error('Error data:', error?.data)
    console.error('Error status:', error?.status)
    console.error('❌ Full error details:', {
      message: error?.message,
      data: error?.data,
      statusMessage: error?.data?.statusMessage,
      statusCode: error?.statusCode
    })
    
    // Show more specific error messages
    const errorMsg = error?.data?.statusMessage || error?.message || 'Fehler beim Senden des Magic Links.'
    if (errorMsg.includes('SMS') || errorMsg.includes('Twilio')) {
      resetError.value = 'SMS konnte nicht gesendet werden. Bitte überprüfen Sie Ihre Telefonnummer oder versuchen Sie es mit E-Mail.'
    } else if (errorMsg.includes('email') || errorMsg.includes('Email')) {
      resetError.value = 'E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
    } else {
      resetError.value = errorMsg
    }
  } finally {
    resetIsLoading.value = false
  }
}

// ======= Face ID Login =======

/**
 * Login with Face ID / WebAuthn
 */

const handleLogout = async () => {
  try {
    await logout()
    showSuccess('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.')
    // Zur Login-Seite weiterleiten
    navigateTo('/')
  } catch (error) {
    console.error('Logout error:', error)
    showError('Fehler', 'Fehler beim Abmelden.')
  }
}

// Lifecycle
onMounted(async () => {
  // Auto-open forgot password modal if ?forgot=1 is in the URL
  if (route.query.forgot === '1') {
    showForgotPasswordModal.value = true
  }

  // Check biometric availability (native only, no-op on web)
  checkBiometric()

  // Check Passkey availability (web; role-gated)
  checkPasskeyAvailability()

  // Warte kurz damit Auth-State nach Logout vollständig gelöscht ist
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Prüfe ob bereits angemeldet
  if (isAuthenticated.value && !isLoading.value) {
    logger.debug('🔄 User already authenticated, checking profile...')
    const authStore = useAuthStore()
    
    // Warte kurz auf User-Profil
    let attempts = 0
    while (!authStore.userProfile && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    const user = authStore.userProfile
    
    if (!user) {
      console.error('❌ Session exists but no user profile! Clearing broken session...')
      await logout()
      loginError.value = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
      return
    }
    
    logger.debug('✅ User profile found, redirecting...')
    if (user?.role === 'super_admin') {
      router.push('/tenant-admin')
    } else if (user?.role === 'admin' || user?.role === 'tenant_admin') {
      router.push('/admin')
    } else if (user?.role === 'staff') {
      router.push('/dashboard')
    } else {
      router.push('/customer-dashboard')
    }
  }
})

// Watch for captcha requirement and render hCaptcha
watch(requiresCaptcha, async (required) => {
  if (required && process.client) {
    logger.debug('📍 Captcha required, rendering hCaptcha...')
    
    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const hcaptchaContainer = document.getElementById('login-hcaptcha')
    if (hcaptchaContainer && (window as any).hcaptcha && widgetId.value === null) {
      try {
        const siteKey = '50bb4c3b-c52d-4997-a7ea-64f4e7ab0d86' // Your hCaptcha site key
        widgetId.value = (window as any).hcaptcha.render('login-hcaptcha', {
          sitekey: siteKey,
          theme: 'light'
        })
        logger.debug('✅ hCaptcha rendered successfully with widget ID:', widgetId.value)
      } catch (error: any) {
        console.error('❌ Error rendering hCaptcha:', error?.message || error)
      }
    }
  }
})

// SEO
useHead({
  title: 'Anmelden - Simy',
  meta: [
    { name: 'description', content: 'Melden Sie sich in Ihrem Simy Account an.' },
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'theme-color', content: '#f5f0fb' }
  ],
  bodyAttrs: {
    style: 'background: linear-gradient(to bottom right, #f5f0fb, #f0f1f5); min-height: 100vh;'
  },
  htmlAttrs: {
    style: 'background: #f5f0fb;'
  },
  script: [
    {
      src: 'https://js.hcaptcha.com/1/api.js',
      async: true,
      defer: false
    }
  ]
})
</script>

<style scoped>
/* Focus styles */
input:focus {
  outline: none;
}

input[type="checkbox"]:checked {
  background-color: #7C3AED;
  border-color: #7C3AED;
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Loading animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Biometric save prompt slide-up */
.biometric-slide-enter-active,
.biometric-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.biometric-slide-enter-from,
.biometric-slide-leave-to {
  opacity: 0;
  transform: translateY(100px);
}
</style>

