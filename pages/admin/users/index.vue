<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">

    <!-- ═══ PAGE HEADER + TABS ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 pt-5 pb-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900">{{ isPrivatkundenPage ? 'Privatkunden' : 'Mitarbeiter' }}</h1>
          <p class="text-sm text-gray-400 mt-0.5">{{ isPrivatkundenPage ? 'Alle Privatkunden' : `${t.staffPlural} und Admins` }}</p>
        </div>
      </div>
      <!-- Tabs -->
      <div v-if="tabs.length > 1" class="flex px-5 pb-0 border-b border-gray-100 gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id as any"
          :class="[
            'px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors border-b-2 -mb-px',
            activeTab === tab.id
              ? ''
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          ]"
          :style="activeTab === tab.id ? { borderColor: primaryColor, color: primaryColor, background: `${primaryColor}10` } : {}"
        >
          {{ tab.name }}
        </button>
      </div>
    </div>

    <!-- Kunden-Ansicht (bestehende Liste bleibt unverändert) -->
    
    
    <!-- Invite Toast -->
    <div v-if="showInviteToast" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-xl">
      <div class="bg-white border border-gray-200 shadow-lg rounded-lg p-4">
        <div class="font-medium text-gray-900">Einladung erstellt – Versand nicht möglich</div>
        <div class="text-sm text-gray-700 mt-1">Sende den Link manuell oder kopiere ihn in die Zwischenablage.</div>
        <div class="mt-3">
          <input
            :value="inviteToastLink"
            readonly
            class="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-800"
            @focus="($event.target as HTMLInputElement)?.select()"
          />
        </div>
        <div class="mt-2">
          <button
            type="button"
            @click="copyInviteToastLink"
            class="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {{ inviteToastCopyStatus || 'Link kopieren' }}
          </button>
        </div>
        <div class="mt-2">
          <button
            type="button"
            @click="closeInviteToast"
            class="w-full px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="showInviteSuccessToast" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md">
      <div class="bg-white border border-green-300 shadow-lg rounded-lg p-4">
        <div class="font-medium text-green-700">✅ Einladung gesendet</div>
        <div class="text-sm text-gray-800 mt-1">{{ inviteSuccessMessage }}</div>
        <div class="mt-3">
          <button
            type="button"
            @click="closeInviteSuccessToast"
            class="w-full px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>



    <!-- Filters and Search -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div class="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center px-5 py-4">
        <div>
          <p class="text-sm font-bold text-gray-900">{{ filteredUsers.length }} Benutzer</p>
          <p v-if="selectedStatus === 'deleted'" class="text-xs text-amber-600 mt-0.5">Gelöscht – Klick auf Zeile zum Wiederherstellen</p>
        </div>

        <!-- Invitation Filter -->
        <div class="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          <button @click="invitationFilter = 'users'"
            :class="['px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors', invitationFilter === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800']">
            Benutzer
          </button>
          <button @click="invitationFilter = 'all'"
            :class="['px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors', invitationFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800']">
            Alle
          </button>
          <button @click="invitationFilter = 'invitations'"
            :class="['px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors', invitationFilter === 'invitations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800']">
            Einladungen
          </button>
        </div>

        <!-- Search -->
        <div class="flex-1 min-w-[200px] relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input v-model="searchTerm" type="text" placeholder="Name oder E-Mail…"
            class="tenant-focus w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:outline-none"/>
        </div>

        <!-- Status Filter -->
        <select v-model="selectedStatus"
          class="tenant-focus px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:outline-none bg-white text-gray-700">
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
          <option v-if="activeTab === 'customers'" value="unpaid">Mit offenen Zahlungen</option>
          <option v-if="activeTab !== 'customers'" value="deleted">Gelöscht</option>
        </select>

        <!-- Tab-abhängige Aktionen -->
        <template v-if="activeTab === 'customers'">
          <button @click="openCreateForCurrentTab()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 shadow-sm transition-all hover:-translate-y-0.5 whitespace-nowrap"
            :style="{ background: primaryColor }">
            Neuer Kunde
          </button>
        </template>
        <template v-else-if="activeTab === 'staff'">
          <!-- Seat counter badge -->
          <div v-if="totalSeats !== null" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-sm">
            <span :class="seatsAtLimit ? 'text-red-600 font-bold' : 'text-gray-600'">
              {{ usedSeats }} / {{ totalSeats }} Seats
            </span>
            <span v-if="seatsAtLimit" class="text-red-500 text-xs font-semibold">· Limit erreicht</span>
          </div>
          <button
            @click="seatsAtLimit ? null : (showInviteStaffModal = true)"
            :disabled="seatsAtLimit"
            :title="seatsAtLimit ? `Seat-Limit erreicht (${usedSeats}/${totalSeats}). Upgrade unter /upgrade.` : ''"
            :class="[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all whitespace-nowrap',
              seatsAtLimit
                ? 'bg-gray-300 cursor-not-allowed opacity-60'
                : 'bg-violet-600 hover:bg-violet-700 hover:-translate-y-0.5'
            ]"
          >
            Fahrlehrer einladen
          </button>
          <button
            @click="seatsAtLimit ? null : openCreateForCurrentTab()"
            :disabled="seatsAtLimit"
            :title="seatsAtLimit ? `Seat-Limit erreicht (${usedSeats}/${totalSeats}). Upgrade unter /upgrade.` : ''"
            :class="[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all whitespace-nowrap',
              seatsAtLimit
                ? 'bg-gray-300 cursor-not-allowed opacity-60'
                : 'hover:opacity-90 hover:-translate-y-0.5'
            ]"
            :style="seatsAtLimit ? {} : { background: primaryColor }"
          >
            Neuer Fahrlehrer
          </button>
          <NuxtLink
            v-if="seatsAtLimit"
            to="/upgrade"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all whitespace-nowrap"
          >
            Seats upgraden →
          </NuxtLink>
        </template>
            <template v-else-if="activeTab === 'admins'">
              <button
                @click="openCreateForCurrentTab()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 shadow-sm transition-all hover:-translate-y-0.5"
                :style="{ background: primaryColor }"
              >
                Neuer Admin
              </button>
            </template>
          </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50/80 border-b border-gray-100">
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Benutzer</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rolle</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kontakt</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th v-if="activeTab === 'staff'" class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25"/></svg>
                  Guide bearbeiten
                </span>
              </th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">E-Mail</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              :class="[
                'transition-colors group',
                user.deleted_at
                  ? 'bg-red-50/30 opacity-70 cursor-pointer hover:opacity-100'
                  : user.is_invitation
                    ? 'bg-gray-50/50 opacity-75'
                    : 'tenant-row-hover cursor-pointer'
              ]"
              @click="user.is_invitation ? null : navigateToUserDetails(user.id)"
            >
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold',
                    user.is_invitation ? 'bg-gray-200 text-gray-500' : ''
                  ]"
                    :style="user.is_invitation ? {} : { background: `${primaryColor}1f`, color: primaryColor }">
                    {{ getInitials(user.first_name, user.last_name) }}
                  </div>
                  <div>
                    <p :class="['text-sm font-semibold', user.is_invitation ? 'text-gray-500' : 'text-gray-900 tenant-row-title transition-colors']">
                      {{ user.first_name }} {{ user.last_name }}
                      <span v-if="user.is_invitation" class="font-normal text-xs text-gray-400 ml-1">(Eingeladen)</span>
                    </p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ user.email }}</p>
                  </div>
                </div>
              </td>

              <td class="px-5 py-3.5">
                <span :class="getRoleBadgeClass(user)"
                  class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full">
                  {{ getRoleLabel(user) }}
                </span>
              </td>

              <td class="px-5 py-3.5">
                <p class="text-sm text-gray-700">{{ user.phone || '—' }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ user.is_invitation ? 'Einladung ausstehend' : (user.preferred_payment_method || 'Nicht festgelegt') }}</p>
              </td>

              <td class="px-5 py-3.5">
                <span v-if="user.deleted_at"
                  class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                  Gelöscht
                </span>
                <span v-else-if="user.is_invitation"
                  :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', user.invitation_status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700']">
                  {{ user.invitation_status === 'expired' ? 'Abgelaufen' : 'Eingeladen' }}
                </span>
                <span v-else :class="user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                  class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full">
                  {{ user.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>

              <!-- Guide-Edit Toggle (only for staff tab, non-invitation, non-deleted) -->
              <td v-if="activeTab === 'staff'" class="px-5 py-3.5" @click.stop>
                <button
                  v-if="!user.is_invitation && !user.deleted_at"
                  @click="toggleGuideEdit(user)"
                  :disabled="togglingGuideEdit === user.id"
                  :title="user.can_edit_guide ? 'Zugriff entziehen' : 'Zugriff gewähren'"
                  class="flex items-center gap-2 group"
                >
                  <!-- Toggle pill -->
                  <div
                    class="relative w-8 h-4.5 rounded-full transition-colors flex-shrink-0"
                    :class="user.can_edit_guide ? 'bg-indigo-500' : 'bg-gray-200'"
                    style="height: 18px; width: 32px;"
                  >
                    <div
                      class="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                      :class="user.can_edit_guide ? 'left-[14px]' : 'left-0.5'"
                    />
                    <div v-if="togglingGuideEdit === user.id" class="absolute inset-0 flex items-center justify-center">
                      <div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin opacity-50"/>
                    </div>
                  </div>
                  <span class="text-xs" :class="user.can_edit_guide ? 'text-indigo-600 font-semibold' : 'text-gray-400'">
                    {{ user.can_edit_guide ? 'Erlaubt' : 'Nein' }}
                  </span>
                </button>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>

              <td class="px-5 py-3.5">
                <p class="text-sm text-gray-700">{{ user.email || '—' }}</p>
                <p v-if="user.is_invitation && user.invitation_expires_at" class="text-xs text-gray-400 mt-0.5">
                  Läuft ab: {{ formatExpiryDate(user.invitation_expires_at) }}
                </p>
              </td>
            </tr>

            <!-- Loading deleted users -->
            <tr v-if="selectedStatus === 'deleted' && isLoadingDeleted">
              <td :colspan="activeTab === 'staff' ? 6 : 5" class="px-6 py-12 text-center text-gray-400">
                <div class="text-sm">Gelöschte Benutzer werden geladen…</div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="filteredUsers.length === 0">
              <td :colspan="activeTab === 'staff' ? 6 : 5" class="px-6 py-12 text-center text-gray-500">
                <div class="text-lg">👤 Keine Benutzer gefunden</div>
                <div class="text-sm mt-2">
                  {{ selectedStatus === 'deleted' ? 'Keine gelöschten Benutzer vorhanden' : searchTerm ? 'Versuchen Sie eine andere Suche' : 'Erstellen Sie den ersten Benutzer' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
    </div>

    <!-- Invite Staff Modal -->
    <div v-if="showInviteStaffModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="admin-modal bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            📧 Fahrlehrer einladen
          </h3>
        </div>
        
        <form @submit.prevent="sendStaffInvitation" class="px-6 py-4 space-y-4">
          <p class="text-sm text-gray-500">Der Fahrlehrer erhält einen SMS-Link und füllt den Rest selbst aus.</p>

          <!-- First Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
            <input
              v-model="inviteForm.firstName"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Max"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefonnummer *</label>
            <input
              v-model="inviteForm.phone"
              type="tel"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="+41 79 123 45 67"
              @blur="inviteForm.phone = normalizeSwissPhone(inviteForm.phone)"
            />
          </div>

          <!-- Error Message -->
          <div v-if="inviteStaffError" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {{ inviteStaffError }}
          </div>

          <!-- Manual Link Panel (shown when email/sms sending fails) -->
          <div v-if="showInviteManualLink" class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-4 rounded space-y-3">
            <div class="font-medium">Einladung erstellt – Versand nicht möglich</div>
            <div class="text-sm">Bitte kopiere den folgenden Link und sende ihn manuell:</div>
            <div class="flex gap-2 items-center">
              <input
                :value="inviteManualLink"
                readonly
                class="flex-1 px-3 py-2 border border-yellow-300 rounded bg-white text-gray-800"
                @focus="($event.target as HTMLInputElement)?.select()"
              />
              <button
                type="button"
                @click="copyInviteLink"
                class="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
              >
                {{ copyInviteLinkStatus || 'Link kopieren' }}
              </button>
            </div>
            <div class="text-xs text-yellow-700">Hinweis: Der Link ist 30 Tage gültig.</div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="showInviteStaffModal = false; inviteStaffError = ''; showInviteManualLink = false; inviteManualLink = ''; copyInviteLinkStatus = ''"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isInvitingStaff"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {{ isInvitingStaff ? 'Wird gesendet...' : 'Einladung senden' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateUserModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="admin-modal bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            <span v-if="newUser.role === 'staff'">👨‍🏫 Neuen Fahrlehrer hinzufügen</span>
            <span v-else-if="newUser.role === 'sub_admin'">🔧 Neuen Sub-Admin hinzufügen</span>
            <span v-else>👤 Neuen Benutzer hinzufügen</span>
          </h3>
        </div>
        
        <form @submit.prevent="createUser" class="px-6 py-4 space-y-4">
          <!-- Role Selection - FIRST (Custom Dropdown) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Rolle *</label>
            <div class="relative">
              <button
                type="button"
                @click="showRoleDropdown = !showRoleDropdown"
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 bg-gray-700 text-white text-left flex justify-between items-center"
              >
                <span v-if="newUser.role">
                  <span v-if="newUser.role === 'staff'">👨‍🏫 Fahrlehrer</span>
                  <span v-else-if="newUser.role === 'sub_admin'">🔧 Sub-Admin</span>
                </span>
                <span v-else class="text-gray-400">Rolle wählen</span>
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <!-- Dropdown Options - Tab-abhängig -->
              <div v-if="showRoleDropdown" class="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10">
                <div
                  v-for="role in availableRolesForTab"
                  :key="role"
                  @click="selectRole(role)"
                  class="px-3 py-2 text-white hover:bg-gray-600 cursor-pointer"
                  :class="{ 'rounded-t-lg': role === availableRolesForTab[0], 'rounded-b-lg': role === availableRolesForTab[availableRolesForTab.length-1] }"
                >
                  <span v-if="role === 'client'">👤 Kunde</span>
                  <span v-else-if="role === 'staff'">👨‍🏫 Fahrlehrer</span>
                  <span v-else-if="role === 'admin'">👑 Admin</span>
                  <span v-else-if="role === 'sub_admin'">🔧 Sub-Admin</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Weitere Felder nur anzeigen wenn Rolle ausgewählt -->
          <div v-if="newUser.role" class="space-y-4">
            <!-- Name -->
            <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
              <input
                v-model="newUser.first_name"
                type="text"
                required
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
                placeholder="Max"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
              <input
                v-model="newUser.last_name"
                type="text"
                required
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
                placeholder="Mustermann"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input
              v-model="newUser.email"
              type="email"
              required
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
              placeholder="max.mustermann@example.com"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
            <input
              v-model="newUser.phone"
              type="tel"
              required
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
              placeholder="+41 79 123 45 67"
            />
          </div>

          <!-- Geburtsdatum (nur für Fahrlehrer) -->
          <div v-if="newUser.role === 'staff'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum *</label>
            <input
              v-model="newUser.birthdate"
              type="date"
              required
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
            />
          </div>

          <!-- Adresse (nur für Fahrlehrer) -->
          <div v-if="newUser.role === 'staff'" class="space-y-4">
            <h4 class="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">Adresse</h4>
            
            <!-- Strasse & Nr -->
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Strasse *</label>
                <input
                  v-model="newUser.street"
                  type="text"
                  required
                  class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
                  placeholder="Musterstrasse"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nr. *</label>
                <input
                  v-model="newUser.street_nr"
                  type="text"
                  required
                  class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
                  placeholder="123"
                />
              </div>
            </div>

            <!-- PLZ & Ort -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
                <input
                  v-model="newUser.zip"
                  type="text"
                  required
                  pattern="[0-9]{4}"
                  class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
                  placeholder="8000"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
                <input
                  v-model="newUser.city"
                  type="text"
                  required
                  class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
                  placeholder="Zürich"
                />
              </div>
            </div>
          </div>

          <!-- Führerausweis Upload (nur für Fahrlehrer) -->
          <div v-if="newUser.role === 'staff'" class="space-y-4">
            <h4 class="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">Führerausweis Upload *</h4>
            
            <!-- Vorderseite -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Vorderseite *</label>
              <div 
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer"
                :style="isDraggingFront ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}"
                @click="($refs.licenseFrontInput as HTMLInputElement)?.click()"
                @dragover.prevent="handleDragOver('front')"
                @dragleave.prevent="handleDragLeave('front')"
                @drop.prevent="handleDrop($event, 'front')"
              >
                <input
                  ref="licenseFrontInput"
                  type="file"
                  accept="image/*,.pdf"
                  @change="handleLicenseFrontUpload"
                  class="hidden"
                />
                
                <div v-if="!newUser.licenseFrontFile" class="text-center">
                  <div v-if="isDraggingFront" class="mb-2">
                    <svg class="mx-auto h-16 w-16 animate-bounce" :style="{ color: primaryColor }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                    </svg>
                    <p class="font-medium" :style="{ color: primaryColor }">Datei hier ablegen</p>
                  </div>
                  <div v-else>
                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="mt-2">
                      <button
                        type="button"
                        class="hover:opacity-70 font-medium"
                        :style="{ color: primaryColor }"
                      >
                        Vorderseite auswählen
                      </button>
                      <p class="text-xs text-gray-500 mt-1">oder Datei hierher ziehen</p>
                      <p class="text-xs text-gray-400 mt-1">PNG, JPG oder PDF bis 5MB</p>
                    </div>
                  </div>
                </div>
                
                <div v-else class="text-center">
                  <svg class="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="mt-2">
                    <p class="text-sm font-medium text-gray-900">{{ newUser.licenseFrontFile?.name }}</p>
                    <p class="text-xs text-gray-500">{{ getFileSize(newUser.licenseFrontFile) }}</p>
                    <button
                      type="button"
                      @click.stop="removeLicenseFrontFile"
                      class="text-red-600 hover:text-red-500 text-xs mt-1"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rückseite -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Rückseite *</label>
              <div 
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer"
                :style="isDraggingBack ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}"
                @click="($refs.licenseBackInput as HTMLInputElement)?.click()"
                @dragover.prevent="handleDragOver('back')"
                @dragleave.prevent="handleDragLeave('back')"
                @drop.prevent="handleDrop($event, 'back')"
              >
                <input
                  ref="licenseBackInput"
                  type="file"
                  accept="image/*,.pdf"
                  @change="handleLicenseBackUpload"
                  class="hidden"
                />
                
                <div v-if="!newUser.licenseBackFile" class="text-center">
                  <div v-if="isDraggingBack" class="mb-2">
                    <svg class="mx-auto h-16 w-16 animate-bounce" :style="{ color: primaryColor }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                    </svg>
                    <p class="font-medium" :style="{ color: primaryColor }">Datei hier ablegen</p>
                  </div>
                  <div v-else>
                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="mt-2">
                      <button
                        type="button"
                        class="hover:opacity-70 font-medium"
                        :style="{ color: primaryColor }"
                      >
                        Rückseite auswählen
                      </button>
                      <p class="text-xs text-gray-500 mt-1">oder Datei hierher ziehen</p>
                      <p class="text-xs text-gray-400 mt-1">PNG, JPG oder PDF bis 5MB</p>
                    </div>
                  </div>
                </div>
                
                <div v-else class="text-center">
                  <svg class="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="mt-2">
                    <p class="text-sm font-medium text-gray-900">{{ newUser.licenseBackFile?.name }}</p>
                    <p class="text-xs text-gray-500">{{ getFileSize(newUser.licenseBackFile) }}</p>
                    <button
                      type="button"
                      @click.stop="removeLicenseBackFile"
                      class="text-red-600 hover:text-red-500 text-xs mt-1"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Passwort (Entwicklungsversion) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Passwort *</label>
            <input
              v-model="newUser.password"
              type="password"
              required
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
              placeholder="Mindestens 12 Zeichen"
            />
            <p class="text-xs text-gray-500 mt-1">
              Mindestens 12 Zeichen, 1 Großbuchstabe und 1 Zahl
            </p>
          </div>

          <!-- Kategorien (nur für Fahrlehrer) -->
          <div v-if="newUser.role === 'staff'">
            <label class="block text-sm font-medium text-gray-700 mb-3">Unterrichtete Kategorien</label>
            <div class="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div v-for="category in availableCategories" :key="category.code" 
                   class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                <div class="flex-1">
                  <div class="text-sm text-gray-600">{{ category.name }}</div>
                </div>
                
                <!-- Toggle Schieber -->
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    :value="category.code"
                    v-model="newUser.categories"
                    class="sr-only peer"
                  />
                  <div class="tenant-toggle relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              
              <div v-if="availableCategories.length === 0" class="text-center py-4 text-gray-500">
                <div class="text-sm">Keine Kategorien verfügbar</div>
                <div class="text-xs mt-1">Kategorien müssen zuerst im System angelegt werden</div>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Wählen Sie die Fahrzeugkategorien aus, die dieser Fahrlehrer unterrichten kann.
            </p>
            <div v-if="newUser.categories.length === 0" class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p class="text-xs text-yellow-700">⚠️ Mindestens eine Kategorie muss ausgewählt werden</p>
            </div>
            <div v-else class="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p class="text-xs text-green-700">✅ {{ newUser.categories.length }} Kategorie(n) ausgewählt: {{ newUser.categories.join(', ') }}</p>
            </div>
          </div>

          </div>

          <!-- Error Display -->
          <div v-if="createUserError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">❌ {{ createUserError }}</p>
          </div>

          <!-- Success Display -->
          <div v-if="createUserSuccess" class="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-600">✅ {{ createUserSuccess }}</p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              @click="cancelCreateUser"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isCreatingUser"
              class="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ background: primaryColor }"
            >
              <span v-if="isCreatingUser">Erstelle...</span>
              <span v-else-if="newUser.role === 'staff'">👨‍🏫 Fahrlehrer erstellen</span>
              <span v-else-if="newUser.role === 'sub_admin'">🔧 Sub-Admin erstellen</span>
              <span v-else>👤 Benutzer erstellen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue'
import { logger } from '~/utils/logger'
import { useRuntimeConfig, navigateTo } from '#app'
import { toLocalTimeString } from '~/utils/dateUtils'
import { useRouter, useRoute } from '#app'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'
import { useTenantBranding } from '~/composables/useTenantBranding'

const { primaryColor } = useTenantBranding()
import StaffTab from '~/components/users/StaffTab.vue'
import AdminsTab from '~/components/users/AdminsTab.vue'
import CustomersTab from '~/components/users/CustomersTab.vue'
import { useTerminology } from '~/composables/useTerminology'

const { t } = useTerminology()

definePageMeta({
  middleware: 'admin',
  layout: 'admin',
})

// Types
interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  role: string
  admin_level?: 'primary_admin' | 'sub_admin' | null
  is_primary_admin?: boolean
  preferred_payment_method: string | null
  is_active: boolean
  can_edit_guide?: boolean
  created_at: string
  deleted_at?: string | null
  appointment_count?: number
  completed_appointments?: number
  unpaid_count?: number
  unpaid_amount?: number
  is_invitation?: boolean
  invitation_status?: 'pending' | 'expired'
  invitation_expires_at?: string
}

// State
const authStore = useAuthStore()
const supabase = getSupabase()
const route = useRoute()
const isPrivatkundenPage = computed(() => false)
const activeTab = ref<string>('staff')
const togglingGuideEdit = ref<string | null>(null)
const tabs = computed(() => {
  if (isPrivatkundenPage.value) {
    return [{ id: 'customers', name: 'Privatkunden' }]
  }
  const base = [{ id: 'staff', name: t.value.staffPlural }] as any[]
  if (authStore.isAdmin) base.push({ id: 'admins', name: 'Admins' })
  return base
})
const currentUserForTabs = computed(() => authStore.user)
const isLoading = ref(true)
const users = ref<User[]>([])
const searchTerm = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const showCreateUserModal = ref(false)
const currentTenant = ref<any>(null)
const invitationFilter = ref<'all' | 'users' | 'invitations'>('all')
const deletedUsers = ref<User[]>([])
const isLoadingDeleted = ref(false)

// ── Seat limit tracking ───────────────────────────────────────────────────────
import { PLANS } from '~/utils/planFeatures'

// Billing info loaded from server (reliable: uses service role key)
const billingInfo = ref<{ plan: string; addon_seats: number } | null>(null)

const totalSeats = computed(() => {
  const source = billingInfo.value ?? currentTenant.value
  const plan = source?.subscription_plan ?? source?.plan ?? 'trial'
  const planDef = PLANS.find(p => p.id === plan)
  const included = plan === 'trial' ? 3 : (planDef?.includedSeats ?? null)
  if (included === null) return null // unlimited
  const addonSeats = source?.addon_seats ?? 0
  return included + addonSeats
})

const usedSeats = computed(() => {
  return users.value.filter(u =>
    (u.role === 'staff' || u.role === 'admin') &&
    (u.is_active !== false || u.is_invitation)
  ).length
})

const seatsAtLimit = computed(() => {
  if (totalSeats.value === null) return false
  return usedSeats.value >= totalSeats.value
})

// (tabs defined above)

// Staff Invitation State
const showInviteStaffModal = ref(false)
const isInvitingStaff = ref(false)
const inviteStaffError = ref('')
const inviteForm = ref({
  firstName: '',
  phone: '',
  sendVia: 'sms'
})

// Manual invite link UI state
const showInviteManualLink = ref(false)
const inviteManualLink = ref('')
const copyInviteLinkStatus = ref('')

const copyInviteLink = async () => {
  try {
    await navigator.clipboard.writeText(inviteManualLink.value)
    copyInviteLinkStatus.value = 'Kopiert!'
    setTimeout(() => { copyInviteLinkStatus.value = '' }, 2000)
  } catch (e) {
    copyInviteLinkStatus.value = 'Kopieren fehlgeschlagen'
    setTimeout(() => { copyInviteLinkStatus.value = '' }, 2000)
  }
}

// Öffnet das Erstellen-Modal mit passender Rolle basierend auf Tab
const openCreateForCurrentTab = () => {
  if (activeTab.value === 'customers') newUser.value.role = 'client'
  else if (activeTab.value === 'staff') newUser.value.role = 'staff'
  else if (activeTab.value === 'admins') newUser.value.role = 'admin'
  showCreateUserModal.value = true
}

// Normalize Swiss phone numbers to E.164 (+41...) format
const normalizeSwissPhone = (raw: string) => {
  if (!raw) return ''
  let phone = String(raw).trim()
  // Remove spaces, dashes, dots, parentheses
  phone = phone.replace(/[\s\-\.\(\)]/g, '')
  // Convert leading 00 to +
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)
  // If starts with 0 (e.g., 079...), convert to +41 and drop the leading 0
  if (phone.startsWith('0')) phone = '+41' + phone.slice(1)
  // If it has no + and is all digits with length >=9, assume Swiss and prepend +41
  if (!phone.startsWith('+') && /^\d{9,}$/.test(phone)) phone = '+41' + phone
  // Ensure only + and digits
  phone = phone.replace(/[^+\d]/g, '')
  return phone
}

import { watch } from 'vue'


// Sync role filter with active tab
watch(activeTab, (tab) => {
  if (tab === 'customers') selectedRole.value = 'client'
  else if (tab === 'staff') selectedRole.value = 'staff'
  else if (tab === 'admins') selectedRole.value = 'admin'
  // Reset incompatible status filters on tab switch
  if (tab === 'customers' && selectedStatus.value === 'deleted') selectedStatus.value = ''
  if (tab !== 'customers' && selectedStatus.value === 'unpaid') selectedStatus.value = ''
}, { immediate: true })

const loadDeletedUsers = async () => {
  if (isLoadingDeleted.value) return
  isLoadingDeleted.value = true
  try {
    const response = await $fetch('/api/admin/users/manage', {
      method: 'POST',
      body: { action: 'get_deleted_users' }
    }) as any
    deletedUsers.value = (response.users || []).map((u: any) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email || '',
      phone: null,
      role: u.role || 'staff',
      admin_level: u.admin_level,
      is_primary_admin: u.is_primary_admin,
      preferred_payment_method: null,
      is_active: u.is_active,
      created_at: u.created_at,
      deleted_at: u.deleted_at
    }))
  } catch (e) {
    logger.warn('⚠️ Could not load deleted users:', e)
  } finally {
    isLoadingDeleted.value = false
  }
}

watch(selectedStatus, (status) => {
  if (status === 'deleted' && deletedUsers.value.length === 0) {
    loadDeletedUsers()
  }
})

// Toast state for fallback link
const showInviteToast = ref(false)
const inviteToastLink = ref('')
const inviteToastCopyStatus = ref('')
const inviteToastTimeout = ref<number | null>(null)

const showInviteFallbackToast = (link: string) => {
  inviteToastLink.value = link
  showInviteToast.value = true
  // Do not auto-close per user request
  if (inviteToastTimeout.value) {
    clearTimeout(inviteToastTimeout.value)
    inviteToastTimeout.value = null
  }
}

// Success toast state
const showInviteSuccessToast = ref(false)
const inviteSuccessMessage = ref('')
const closeInviteSuccessToast = () => {
  showInviteSuccessToast.value = false
  inviteSuccessMessage.value = ''
}

const copyInviteToastLink = async () => {
  try {
    await navigator.clipboard.writeText(inviteToastLink.value)
    inviteToastCopyStatus.value = 'Kopiert!'
    setTimeout(() => { inviteToastCopyStatus.value = '' }, 2000)
  } catch {
    inviteToastCopyStatus.value = 'Kopieren fehlgeschlagen'
    setTimeout(() => { inviteToastCopyStatus.value = '' }, 2000)
  }
}

const closeInviteToast = () => {
  showInviteToast.value = false
  inviteToastCopyStatus.value = ''
  if (inviteToastTimeout.value) {
    clearTimeout(inviteToastTimeout.value)
    inviteToastTimeout.value = null
  }
}

// Create User State
const isCreatingUser = ref(false)
const createUserError = ref('')
const createUserSuccess = ref('')
const showRoleDropdown = ref(false)
const newUser = ref({
  role: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  admin_level: '',
  categories: [] as string[],
  // Zusätzliche Felder für Fahrlehrer
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  licenseFrontFile: null as File | null,
  licenseBackFile: null as File | null
})

// Available categories for selection
const availableCategories = ref<any[]>([])

// Drag & Drop state
const isDraggingFront = ref(false)
const isDraggingBack = ref(false)

// Computed
const totalUsers = computed(() => users.value.length)
const clientCount = computed(() => users.value.filter(u => u.role === 'client').length)
const staffCount = computed(() => users.value.filter(u => u.role === 'staff').length)
const newUsersCount = computed(() => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return users.value.filter(u => new Date(u.created_at) > weekAgo).length
})

const filteredUsers = computed(() => {
  // "Gelöscht" filter uses a separate data set
  if (selectedStatus.value === 'deleted') {
    let filtered = deletedUsers.value
    if (selectedRole.value) {
      filtered = filtered.filter(user => user.role === selectedRole.value)
    }
    if (searchTerm.value) {
      const search = searchTerm.value.toLowerCase()
      filtered = filtered.filter(user =>
        (user.first_name?.toLowerCase().includes(search)) ||
        (user.last_name?.toLowerCase().includes(search)) ||
        user.email.toLowerCase().includes(search)
      )
    }
    return filtered.sort((a, b) => {
      const aName = `${a.last_name || ''} ${a.first_name || ''}`.trim()
      const bName = `${b.last_name || ''} ${b.first_name || ''}`.trim()
      return aName.localeCompare(bName)
    })
  }

  let filtered = users.value

  // Tab-based role filter (primary filter)
  if (activeTab.value === 'customers') {
    filtered = filtered.filter(user => user.role === 'client')
  } else if (activeTab.value === 'staff') {
    filtered = filtered.filter(user => ['staff', 'tenant_admin'].includes(user.role))
  } else if (activeTab.value === 'admins') {
    filtered = filtered.filter(user => ['admin', 'sub_admin'].includes(user.role))
  }

  // Invitation filter
  if (invitationFilter.value === 'users') {
    filtered = filtered.filter(user => !user.is_invitation)
  } else if (invitationFilter.value === 'invitations') {
    filtered = filtered.filter(user => user.is_invitation)
  }

  // Search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(user =>
      (user.first_name?.toLowerCase().includes(search)) ||
      (user.last_name?.toLowerCase().includes(search)) ||
      user.email.toLowerCase().includes(search)
    )
  }

  // Status filter
  if (selectedStatus.value) {
    switch (selectedStatus.value) {
      case 'active':
        filtered = filtered.filter(user => user.is_active)
        break
      case 'inactive':
        filtered = filtered.filter(user => !user.is_active)
        break
      case 'unpaid':
        filtered = filtered.filter(user => (user.unpaid_amount ?? 0) > 0)
        break
    }
  }

  return filtered.sort((a, b) => {
    const aName = `${a.last_name || ''} ${a.first_name || ''}`.trim()
    const bName = `${b.last_name || ''} ${b.first_name || ''}`.trim()
    return aName.localeCompare(bName)
  })
})

// Methods
const loadUsers = async () => {
  try {
    logger.debug('🔄 Loading users via API...')
    
    // ✅ Use new secure API instead of direct DB queries
    const response = await $fetch('/api/admin/get-users-with-stats', {
      method: 'GET'
    }) as any

    if (!response.success) {
      throw new Error(response.error || 'Failed to load users')
    }

    // Load current tenant info
    const currentUser = authStore.user
    const tenantId = (currentUser?.user_metadata?.tenant_id as string)
      || (currentUser?.app_metadata?.tenant_id as string)
      || (authStore as any).userProfile?.tenant_id
      || response.tenant_id

    if (tenantId) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name, slug, subscription_plan, addon_seats')
        .eq('id', tenantId)
        .maybeSingle()
      currentTenant.value = tenantData
      logger.debug('🔍 Current tenant:', tenantData)
    }

    // Load billing info from server API for reliable seat limit (uses service role key)
    try {
      const billing = await $fetch('/api/admin/billing-status') as any
      if (billing) billingInfo.value = billing
      logger.debug('🔍 Billing info:', billing)
    } catch (e) {
      logger.warn('⚠️ Could not load billing info:', e)
    }

    // ✅ API already returns users with stats calculated
    users.value = response.data || []
    logger.debug('✅ Users loaded from API:', users.value.length)

    // Load pending staff invitations (only for staff tab)
    if (!tenantId || activeTab.value === 'customers') {
      return
    }

    const { data: invitationsData, error: invitationsError } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'expired'])
      .order('created_at', { ascending: false })

    if (invitationsError) {
      logger.warn('Warning loading invitations:', invitationsError)
    } else if (invitationsData && invitationsData.length > 0) {
      logger.debug('✅ Invitations loaded:', invitationsData.length)
      
      // Convert invitations to User format
      const invitationUsers = invitationsData.map(invitation => ({
        id: invitation.id,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        email: invitation.email,
        phone: invitation.phone,
        role: 'staff',
        is_active: false,
        created_at: invitation.created_at,
        is_invitation: true,
        invitation_status: invitation.status as 'pending' | 'expired',
        invitation_expires_at: invitation.expires_at,
        preferred_payment_method: null,
        appointment_count: 0,
        completed_appointments: 0,
        unpaid_count: 0,
        unpaid_amount: 0
      }))
      
      // Add invitations to users list
      users.value = [...users.value, ...invitationUsers]
      logger.debug('✅ Total users (including invitations):', users.value.length)
    }

  } catch (error: any) {
    console.error('❌ Error loading users:', error)
  } finally {
    isLoading.value = false
  }
}

// Load available categories for staff assignment
const loadCategories = async () => {
  try {
    // tenant_id is already in the JWT user_metadata
    const currentUser = authStore.user
    const tenantId = (currentUser?.user_metadata?.tenant_id as string) || (currentUser?.app_metadata?.tenant_id as string)
    if (!tenantId) return

    // Get tenant business_type first
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .maybeSingle()

    if (tenantError) throw tenantError
    
    // Only load categories if business_type is driving_school
    if (tenantData?.business_type !== 'driving_school') {
      logger.debug('🚫 Categories not available for business_type:', tenantData?.business_type)
      availableCategories.value = []
      isLoading.value = false
      return
    }

    const { data: categoriesData, error } = await supabase
      .from('categories')
      .select('code, name, description')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('code')

    if (error) throw error

    availableCategories.value = categoriesData || []
    logger.debug('✅ Categories loaded for staff assignment:', availableCategories.value.length)

  } catch (error) {
    console.error('❌ Error loading categories:', error)
  }
}

const getInitials = (firstName: string | null, lastName: string | null): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || '??'
}

const getRoleLabel = (user: User): string => {
  if (user.role === 'admin') {
    if (user.is_primary_admin) return 'Hauptadmin'
    if (user.admin_level === 'sub_admin') return 'Subadmin'
    return 'Admin'
  }
  
  const labels: Record<string, string> = {
    'client': 'Kunde',
    'staff': 'Fahrlehrer',
    'super_admin': 'Superadmin'
  }
  return labels[user.role] || user.role
}

const getRoleBadgeClass = (user: User): string => {
  if (user.role === 'admin') {
    if (user.is_primary_admin) return 'bg-red-100 text-red-800 border border-red-300'
    if (user.admin_level === 'sub_admin') return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }
  
  const classes: Record<string, string> = {
    'client': 'bg-blue-100 text-blue-800',
    'staff': 'bg-purple-100 text-purple-800',
    'super_admin': 'bg-purple-100 text-purple-800 border-2 border-purple-400'
  }
  return classes[user.role] || 'bg-gray-100 text-gray-800'
}

const navigateToUserDetails = (userId: string) => {
  if (process.client) {
    sessionStorage.setItem('userDetailOrigin', isPrivatkundenPage.value ? '/admin/privatkunden' : '/admin/users')
  }
  useRouter().push(`/admin/users/${userId}`)
}

const toggleGuideEdit = async (user: User) => {
  if (togglingGuideEdit.value) return
  togglingGuideEdit.value = user.id
  const newValue = !user.can_edit_guide
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: { action: 'update-staff', user_id: user.id, user_data: { can_edit_guide: newValue } }
    })
    const idx = users.value.findIndex(u => u.id === user.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], can_edit_guide: newValue }
  } catch (e) {
    console.error('Error toggling guide edit:', e)
  } finally {
    togglingGuideEdit.value = null
  }
}

const formatExpiryDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

// Custom Dropdown Functions
const selectRole = (role: string) => {
  newUser.value.role = role
  showRoleDropdown.value = false
  
  // Set appropriate defaults based on role
  if (role === 'sub_admin') {
    newUser.value.admin_level = 'sub_admin'
  } else {
    newUser.value.admin_level = ''
  }
  
  // Reset categories when role changes
  newUser.value.categories = []
  
  logger.debug('🎯 Role selected:', role)
}

const availableRolesForTab = computed(() => {
  if (activeTab.value === 'customers') return ['client']
  if (activeTab.value === 'staff') return ['staff']
  return ['admin', 'sub_admin']
})

// File Upload Functions
const validateFile = (file: File): string | null => {
  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return 'Datei ist zu gross. Maximum 5MB erlaubt.'
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return 'Ungültiger Dateityp. Nur JPG, PNG oder PDF erlaubt.'
  }
  
  return null
}

const handleLicenseFrontUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  const error = validateFile(file)
  if (error) {
    createUserError.value = error
    return
  }
  
  newUser.value.licenseFrontFile = file
  createUserError.value = '' // Clear any previous error
  logger.debug('📄 License front file selected:', file.name, formatFileSize(file.size))
}

const handleLicenseBackUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  const error = validateFile(file)
  if (error) {
    createUserError.value = error
    return
  }
  
  newUser.value.licenseBackFile = file
  createUserError.value = '' // Clear any previous error
  logger.debug('📄 License back file selected:', file.name, formatFileSize(file.size))
}

const removeLicenseFrontFile = () => {
  newUser.value.licenseFrontFile = null
  // Clear the file input
  const fileInput = document.querySelector('input[ref="licenseFrontInput"]') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

const removeLicenseBackFile = () => {
  newUser.value.licenseBackFile = null
  // Clear the file input
  const fileInput = document.querySelector('input[ref="licenseBackInput"]') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileSize = (file: File | null) => {
  if (!file) return ''
  try {
    return formatFileSize(file.size)
  } catch {
    return ''
  }
}

// Drag & Drop Functions
const handleDragOver = (type: 'front' | 'back') => {
  if (type === 'front') {
    isDraggingFront.value = true
  } else {
    isDraggingBack.value = true
  }
}

const handleDragLeave = (type: 'front' | 'back') => {
  if (type === 'front') {
    isDraggingFront.value = false
  } else {
    isDraggingBack.value = false
  }
}

const handleDrop = (event: DragEvent, type: 'front' | 'back') => {
  // Reset drag state
  isDraggingFront.value = false
  isDraggingBack.value = false
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  
  const file = files[0]
  
  // Validate file
  const error = validateFile(file)
  if (error) {
    createUserError.value = error
    return
  }
  
  // Set file based on type
  if (type === 'front') {
    newUser.value.licenseFrontFile = file
    logger.debug('📄 License front file dropped:', file.name, formatFileSize(file.size))
  } else {
    newUser.value.licenseBackFile = file
    logger.debug('📄 License back file dropped:', file.name, formatFileSize(file.size))
  }
  
  createUserError.value = '' // Clear any previous error
}

// Staff Invitation Functions
const sendStaffInvitation = async () => {
  inviteStaffError.value = ''
  isInvitingStaff.value = true

  try {
    logger.debug('📱 Sending staff invitation to:', inviteForm.value.phone)

    const response = await fetch('/api/staff/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: inviteForm.value.firstName,
        phone: inviteForm.value.phone,
        sendVia: 'sms'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.statusMessage || data.message || data.error || 'Fehler beim Senden der Einladung')
    }
    
    // Double check success flag
    if (data.success === false) {
      throw new Error(data.message || 'Einladung konnte nicht erstellt werden')
    }

    logger.debug('✅ Invitation sent successfully:', data)
    
    // Show appropriate message based on result (UI panel for manual link)
    if (data.sentVia === 'email_failed' || data.sentVia === 'sms_failed') {
      // Keep modal open, show inline fallback panel with copy link
      inviteManualLink.value = data.inviteLink
      showInviteManualLink.value = true
    } else if (data.inviteLink && !data.sentVia) {
      // No sending configured: also show inline panel
      inviteManualLink.value = data.inviteLink
      showInviteManualLink.value = true
    } else {
      // Success via email or SMS -> show success toast
      showInviteSuccessToast.value = true
      inviteSuccessMessage.value = data.sentVia === 'email'
        ? `Einladung per E-Mail an ${data.email} gesendet!`
        : `Einladung per SMS an ${data.phone} gesendet!`
    }
    
    // Reset form
    inviteForm.value = {
      firstName: '',
      phone: '',
      sendVia: 'sms'
    }
    
    // Close modal
    if (!showInviteManualLink.value) {
      showInviteStaffModal.value = false
    }
    
    // Reload users to potentially show invitation status
    await loadUsers()

  } catch (error: any) {
    console.error('❌ Error sending invitation:', error)
    inviteStaffError.value = error.message || 'Ein Fehler ist aufgetreten'
  } finally {
    isInvitingStaff.value = false
  }
}

// Create User Functions
const createUser = async () => {
  const clientRequestId = Math.random().toString(36).substr(2, 9)
  logger.debug(`🚀 [CLIENT-${clientRequestId}] Starting user creation for:`, newUser.value.email)
  
  isCreatingUser.value = true
  createUserError.value = ''
  createUserSuccess.value = ''

  try {
    logger.debug(`👨‍🏫 [CLIENT-${clientRequestId}] Creating new user:`, newUser.value.email)

    // Get current user's tenant_id from auth store profile (loaded at login)
    const currentUser = authStore.user
    const tenantId = authStore.userProfile?.tenant_id
    if (!tenantId) {
      throw new Error('Kein Tenant zugewiesen')
    }

    // 1. Validate password
    if (newUser.value.password.length < 8) {
      throw new Error('Passwort muss mindestens 12 Zeichen lang sein')
    }
    
    const hasUppercase = /[A-Z]/.test(newUser.value.password)
    const hasNumber = /[0-9]/.test(newUser.value.password)
    if (!hasUppercase || !hasNumber) {
      throw new Error('Passwort muss mindestens einen Großbuchstaben und eine Zahl enthalten')
    }

    // 2. Validate required fields for staff
    if (newUser.value.role === 'staff') {
      if (!newUser.value.licenseFrontFile) {
        throw new Error('Führerausweis Vorderseite ist erforderlich')
      }
      if (!newUser.value.licenseBackFile) {
        throw new Error('Führerausweis Rückseite ist erforderlich')
      }
      if (!newUser.value.categories || newUser.value.categories.length === 0) {
        throw new Error('Mindestens eine Kategorie muss ausgewählt werden')
      }
    }

    // 3. Create user via server API (has service role key access)
    logger.debug(`🔐 [CLIENT-${clientRequestId}] Creating user via server API...`)
    
    // TEMP DEBUG: Check if this is even called
    logger.debug(`🧪 [CLIENT-${clientRequestId}] About to call server API with data:`, {
      email: newUser.value.email,
      role: newUser.value.role,
      tenant_id: tenantId
    })
    
    // TEMP: Use direct fetch to bypass any caching issues
    logger.debug(`🌐 [CLIENT-${clientRequestId}] Using direct fetch to bypass cache...`)
    
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: newUser.value.email,
        password: newUser.value.password,
        first_name: newUser.value.first_name,
        last_name: newUser.value.last_name,
        phone: newUser.value.phone,
        role: newUser.value.role,
        admin_level: newUser.value.admin_level,
        tenant_id: tenantId,
        created_by: currentUser?.id,
        // Staff-specific fields
        categories: newUser.value.role === 'staff' ? newUser.value.categories : null,
        birthdate: newUser.value.role === 'staff' ? newUser.value.birthdate : null,
        street: newUser.value.role === 'staff' ? newUser.value.street : null,
        street_nr: newUser.value.role === 'staff' ? newUser.value.street_nr : null,
        zip: newUser.value.role === 'staff' ? newUser.value.zip : null,
        city: newUser.value.role === 'staff' ? newUser.value.city : null
      })
    })
    
    logger.debug(`📡 [CLIENT-${clientRequestId}] Response status:`, response.status)
    logger.debug(`📡 [CLIENT-${clientRequestId}] Response ok:`, response.ok)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [CLIENT-${clientRequestId}] Server response error:`, errorText)
      throw new Error(`Server error: ${response.status} - ${errorText}`)
    }
    
    const userApiResponse = await response.json()

    if (!userApiResponse.success) {
      throw new Error('Fehler beim Erstellen des Benutzers')
    }

    const createdUserId = userApiResponse.user.id
    logger.debug('✅ User created via server API:', createdUserId)

    // 4. Upload license files if provided (nur für Staff)
    if (newUser.value.role === 'staff' && (newUser.value.licenseFrontFile || newUser.value.licenseBackFile)) {
      try {
        logger.debug(`📄 [CLIENT-${clientRequestId}] Uploading license files for user:`, createdUserId)

        const formData = new FormData()
        formData.append('userId', createdUserId)
        
        if (newUser.value.licenseFrontFile) {
          formData.append('frontFile', newUser.value.licenseFrontFile)
          logger.debug(`📎 [CLIENT-${clientRequestId}] Adding front file:`, newUser.value.licenseFrontFile.name)
        }
        
        if (newUser.value.licenseBackFile) {
          formData.append('backFile', newUser.value.licenseBackFile)
          logger.debug(`📎 [CLIENT-${clientRequestId}] Adding back file:`, newUser.value.licenseBackFile.name)
        }

        const uploadResponse = await $fetch<{success: boolean, uploads: any}>('/api/admin/upload-license', {
          method: 'POST',
          body: formData
        })

        if (uploadResponse.success) {
          logger.debug(`✅ [CLIENT-${clientRequestId}] License files uploaded successfully`)
        } else {
          console.warn(`⚠️ [CLIENT-${clientRequestId}] Upload response indicates failure:`, uploadResponse)
        }

      } catch (uploadError) {
        console.error(`❌ [CLIENT-${clientRequestId}] License upload failed:`, uploadError)
        // Continue anyway, don't fail user creation
      }
    } else {
      logger.debug(`ℹ️ [CLIENT-${clientRequestId}] No license files to upload (role: ${newUser.value.role})`)
    }

    // 5. Success feedback
    const roleLabel = newUser.value.role === 'staff' ? 'Fahrlehrer' : 
                     newUser.value.role === 'sub_admin' ? 'Sub-Admin' : 'Benutzer'
    createUserSuccess.value = `${roleLabel} ${newUser.value.first_name} ${newUser.value.last_name} wurde erfolgreich erstellt!`
    
    // 6. Reset form
    newUser.value = {
      role: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      admin_level: '',
      categories: [],
      birthdate: '',
      street: '',
      street_nr: '',
      zip: '',
      city: '',
      licenseFrontFile: null,
      licenseBackFile: null
    }

    // 7. Reload users list
    await loadUsers()

    // 8. Close modal after short delay
    setTimeout(() => {
      showCreateUserModal.value = false
      createUserSuccess.value = ''
    }, 2000)

  } catch (error: any) {
    console.error('❌ Error creating user:', error)
    createUserError.value = error.message || 'Unbekannter Fehler beim Erstellen des Benutzers'
  } finally {
    isCreatingUser.value = false
  }
}

// Cancel Create User
const cancelCreateUser = () => {
  showCreateUserModal.value = false
  showRoleDropdown.value = false
  createUserError.value = ''
  createUserSuccess.value = ''
  
  // Reset form
  newUser.value = {
    role: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    admin_level: '',
    categories: [],
    birthdate: '',
    street: '',
    street_nr: '',
    zip: '',
    city: '',
    licenseFrontFile: null,
    licenseBackFile: null
  }
}

// Close dropdown when clicking outside
const closeRoleDropdown = (event: Event) => {
  if (!(event.target as HTMLElement)?.closest('.relative')) {
    showRoleDropdown.value = false
  }
}

// Auth-Prüfung
onMounted(async () => {
  logger.debug('🔍 Users page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Original Ansicht laden
  await loadUsers()
  await loadCategories()
  document.addEventListener('click', closeRoleDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeRoleDropdown)
})

// Refresh user list when navigating back to this page (e.g. after deletion on detail page)
onActivated(async () => {
  await loadUsers()
  // Also refresh deleted users if that filter is active
  if (selectedStatus.value === 'deleted') {
    deletedUsers.value = []
    await loadDeletedUsers()
  }
})
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
.tenant-row-hover:hover {
  background-color: color-mix(in srgb, var(--color-primary, #1E40AF) 5%, transparent);
}
.tenant-row-hover:hover .tenant-row-title {
  color: var(--color-primary, #1E40AF);
}
.peer:checked ~ .tenant-toggle {
  background-color: var(--color-primary, #1E40AF);
}

/* ✅ LOKALE CSS-REGELN FÜR USER-MODAL INPUTS */
/* Überschreibt Tailwind-Klassen mit höherer Spezifität */
.admin-modal input[type="text"],
.admin-modal input[type="email"], 
.admin-modal input[type="password"],
.admin-modal input[type="number"],
.admin-modal input[type="tel"],
.admin-modal input[type="date"],
.admin-modal select,
.admin-modal textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Placeholder-Texte grau */
.admin-modal input::placeholder,
.admin-modal textarea::placeholder {
  color: #9ca3af !important; /* gray-400 */
}

/* Focus States */
.admin-modal input:focus,
.admin-modal select:focus,
.admin-modal textarea:focus {
  color: white !important;
  background-color: #374151 !important;
  border-color: #10b981 !important; /* green-500 */
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
}

/* Select Options */
.admin-modal select option {
  color: white !important;
  background-color: #374151 !important;
}

/* Animation für Loading Spinner */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Loading animation */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
</style>
