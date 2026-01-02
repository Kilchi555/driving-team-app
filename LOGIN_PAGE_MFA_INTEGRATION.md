# 🔐 Login-Seite MFA Integration - Step by Step

## Die Datei zu modifizieren
`pages/login.vue` - Das ist deine Login-Seite

## Aktuelle Struktur
- Line 35-129: Normales Login-Form (Email + Passwort)
- Line 35: `<form v-else @submit.prevent="handleLogin">`

## Was du machen musst

### SCHRITT 1: Composable importieren (oben in Script-Setup)

Füge oben im `<script setup>` hinzu:

```typescript
import { useMFAFlow } from '~/composables/useMFAFlow'

// ... andere Imports ...

const mfaFlow = useMFAFlow()
```

### SCHRITT 2: handleLogin erweitern

Finde die `handleLogin` Funktion (ca. Zeile 200-300) und aktualisiere sie:

**VORHER:**
```typescript
const handleLogin = async () => {
  try {
    const { data, error } = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password, tenantId }
    })
    // ...
  }
}
```

**NACHHER:**
```typescript
const handleLogin = async () => {
  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { 
        email: loginForm.value.email, 
        password: loginForm.value.password,
        tenantId: currentTenant.value?.id
      }
    })

    // ✨ NEU: MFA-Check
    if (response.requiresMFA) {
      logger.debug('🔐 MFA erforderlich für:', response.email)
      await mfaFlow.handleMFARequired(response.email)
      return // Stop hier - MFA-UI wird jetzt angezeigt
    }

    // Normales Login
    const authStore = useAuthStore()
    authStore.user = response.user
    authStore.session = response.session
    
    navigateTo('/dashboard')
  } catch (error: any) {
    loginError.value = error.message || 'Anmeldung fehlgeschlagen'
  }
}
```

### SCHRITT 3: Template in zwei Zustände aufteilen

Finde den Form-Block (Line 35-129) und ersetze ihn mit:

**VORHER:**
```vue
<form v-else @submit.prevent="handleLogin" class="space-y-4">
  <!-- Email, Password, etc -->
</form>
```

**NACHHER:**
```vue
<!-- ZUSTAND 1: Normales Login-Form -->
<form 
  v-if="!mfaFlow.state.value.requiresMFA" 
  @submit.prevent="handleLogin" 
  class="space-y-4"
>
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
      required
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
      :style="{ '--tw-ring-color': currentTenant?.primary_color || '#2563eb' }"
      placeholder="ihre@email.com"
      :disabled="isLoading"
    >
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
        required
        class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
        :style="{ '--tw-ring-color': currentTenant?.primary_color || '#2563eb' }"
        placeholder="Ihr Passwort"
        :disabled="isLoading"
      >
      <!-- Password Toggle Button -->
    </div>
  </div>

  <!-- Remember Me & Forgot Password -->
  <!-- ... rest bleibt gleich -->

  <!-- Error Message -->
  <div v-if="loginError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
    <p class="text-sm text-red-700">{{ loginError }}</p>
  </div>

  <!-- Login Button -->
  <button
    type="submit"
    :disabled="isLoading"
    class="w-full py-2.5 px-4 rounded-lg text-white font-medium"
    :style="{ background: currentTenant?.primary_color || '#2563eb' }"
  >
    <span v-if="isLoading">Wird angemeldet...</span>
    <span v-else>Anmelden</span>
  </button>
</form>

<!-- ZUSTAND 2: MFA-Verifikation -->
<div 
  v-else 
  class="space-y-4"
>
  <!-- MFA Header -->
  <div class="text-center mb-6">
    <h2 class="text-xl font-bold text-gray-900">
      Multi-Faktor-Authentifizierung erforderlich
    </h2>
    <p class="text-sm text-gray-600 mt-2">
      Wählen Sie eine Methode zur Bestätigung
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
          'ring-blue-600': mfaFlow.state.value.selectedOption?.id === method.id
        }"
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors hover:border-gray-400"
        :style="{
          background: mfaFlow.state.value.selectedOption?.id === method.id 
            ? (currentTenant?.primary_color || '#2563eb') + '10' 
            : 'white',
          color: mfaFlow.state.value.selectedOption?.id === method.id
            ? (currentTenant?.primary_color || '#2563eb')
            : '#374151'
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
      :style="{ '--tw-ring-color': currentTenant?.primary_color || '#2563eb' }"
    >
    <p class="text-xs text-gray-500 mt-1 text-center">
      {{ mfaFlow.state.value.selectedOption?.type === 'sms' ? 'SMS' : 'E-Mail' }} an {{ mfaFlow.state.value.email }}
    </p>
  </div>

  <!-- Error Message -->
  <div v-if="mfaFlow.state.value.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
    <p class="text-sm text-red-700">{{ mfaFlow.state.value.error }}</p>
    <p v-if="mfaFlow.state.value.remainingAttempts > 0" class="text-xs text-red-600 mt-1">
      Noch {{ mfaFlow.state.value.remainingAttempts }} Versuche
    </p>
  </div>

  <!-- Buttons -->
  <div class="flex gap-3">
    <!-- Code versenden -->
    <button
      type="button"
      @click="mfaFlow.sendMFACode()"
      :disabled="mfaFlow.state.value.isVerifying"
      class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span v-if="mfaFlow.state.value.isVerifying">Wird versendet...</span>
      <span v-else>Code erneut versenden</span>
    </button>

    <!-- Verifizieren -->
    <button
      type="button"
      @click="mfaFlow.verifyMFACode(loginForm.password)"
      :disabled="!mfaFlow.canSubmitCode.value"
      class="flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      :style="{ background: currentTenant?.primary_color || '#2563eb' }"
    >
      <span v-if="mfaFlow.state.value.isVerifying">Wird überprüft...</span>
      <span v-else>Verifizieren</span>
    </button>
  </div>

  <!-- Zurück -->
  <button
    type="button"
    @click="mfaFlow.resetMFAState()"
    class="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
  >
    Zurück
  </button>
</div>
```

---

## 💡 Wichtige Punkte

1. **State Management**: `mfaFlow.state.value.requiresMFA` steuert welcher Screen angezeigt wird
2. **Composable Funktionen**:
   - `handleMFARequired()` - Initialisiert MFA
   - `sendMFACode()` - Versendet Code
   - `verifyMFACode()` - Prüft Code
   - `selectMFAMethod()` - Wechselt Methode
   - `updateCode()` - Updated Code-Eingabe
   - `resetMFAState()` - Zurücksetzen

3. **Styling**: Verwendet `currentTenant?.primary_color` wie der Rest der Seite

4. **Accessibility**: Input hat `inputmode="numeric"` für besseres Mobile-Keyboard

---

## 🧪 Testing nach Integration

1. **Lokal testen**:
   ```
   npm run dev
   ```

2. **Normales Login testen**:
   - Richtige Email + Passwort → Sollte funktionieren wie vorher

3. **5 Versuche mit falsch Passwort**:
   - Nach dem 5. Versuch: MFA-Screen sollte angezeigt werden
   - MFA-Methoden sollten sichtbar sein

4. **Code eingeben**:
   - Code wird in Browser-Konsole angezeigt
   - Eingeben und Verifizieren
   - Login sollte erfolgreich sein

5. **Datenbank prüfen**:
   ```sql
   SELECT failed_login_attempts, mfa_required_until FROM users 
   WHERE email = 'dein@test.email';
   ```

---

## 🐛 Häufige Fehler

**"Cannot read property 'requiresMFA' of undefined"**
→ Prüfe: `response` hat richtige Struktur? Mit console.log debuggen

**MFA-UI wird nicht angezeigt**
→ Prüfe: `mfaFlow.handleMFARequired()` wurde aufgerufen?

**Code-Eingabe funktioniert nicht**
→ Prüfe: `mfaFlow.updateCode()` ist gebunden?

**Login nach MFA funktioniert nicht**
→ Prüfe: `loginForm.password` wird korrekt übergeben?

---

## 📱 Mobile Optimization

Das Template ist bereits optimiert:
- `inputmode="numeric"` für numpad auf Mobile
- Responsives Layout mit `flex-wrap`
- Touch-friendly Buttons

---

Brauchst du Hilfe bei einer bestimmten Zeile? 👀

