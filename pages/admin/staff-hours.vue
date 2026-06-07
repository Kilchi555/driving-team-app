<template>
  <div class="p-4 sm:p-6">
    <div class="mb-4 sm:mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Stundenübersicht</h1>
    </div>

    <!-- View Tabs — scrollable on mobile -->
    <div class="border-b border-gray-200 mb-6 overflow-x-auto">
      <div class="flex min-w-max">
        <button
          @click="activeView = 'hours'"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="activeView === 'hours' ? '' : 'border-transparent text-gray-500 hover:text-gray-700'"
          :style="activeView === 'hours' ? { borderColor: primaryColor, color: primaryColor } : {}"
        >Stundenerfassung</button>
        <button
          @click="activeView = 'monthly'"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="activeView === 'monthly' ? '' : 'border-transparent text-gray-500 hover:text-gray-700'"
          :style="activeView === 'monthly' ? { borderColor: primaryColor, color: primaryColor } : {}"
        >Monatslohn</button>
        <button
          @click="activeView = 'settings'"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="activeView === 'settings' ? '' : 'border-transparent text-gray-500 hover:text-gray-700'"
          :style="activeView === 'settings' ? { borderColor: primaryColor, color: primaryColor } : {}"
        >Lohneinstellungen</button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════
         TAB: STUNDENERFASSUNG (existing view, unchanged)
         ══════════════════════════════════════════════════ -->
    <div v-if="activeView === 'hours'">

    <!-- Filter Controls -->
    <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
          <select v-model="selectedYear" @change="onYearChange" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Monat</label>
          <select v-model="selectedMonth" @change="onMonthChange" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2">
            <option value="all">Ganzes Jahr</option>
            <option v-for="(month, index) in monthNames" :key="index" :value="index">{{ month }}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Von</label>
          <input v-model="customStartDate" type="date" @change="onCustomDateChange" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2" />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bis</label>
          <input v-model="customEndDate" type="date" @change="onCustomDateChange" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2" />
        </div>
        
        <div class="flex items-end">
          <button @click="loadStaffHours" :disabled="isLoading" class="w-full px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50" :style="{ background: primaryColor }">
            {{ isLoading ? 'Lade...' : 'Aktualisieren' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" :style="{ borderBottomColor: primaryColor }"></div>
        <p class="text-gray-600">Lade Stundenübersicht...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <div class="text-red-400 mr-3">⚠️</div>
        <div>
          <h3 class="text-red-800 font-medium">Fehler beim Laden der Daten</h3>
          <p class="text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div class="flex items-center gap-3">
            <div class="text-2xl">👥</div>
            <div class="min-w-0">
              <p class="text-xs font-medium text-gray-500 truncate">Aktive Fahrlehrer</p>
              <p class="text-xl font-bold text-gray-900">{{ summary.activeStaff }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div class="flex items-center gap-3">
            <div class="text-2xl">⏱️</div>
            <div class="min-w-0">
              <p class="text-xs font-medium text-gray-500 truncate">Gesamtstunden</p>
              <p class="text-xl font-bold text-gray-900">{{ formatHours(summary.totalHours) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div class="flex items-center gap-3">
            <div class="text-2xl">📚</div>
            <div class="min-w-0">
              <p class="text-xs font-medium text-gray-500 truncate">Ø pro Fahrlehrer</p>
              <p class="text-xl font-bold text-gray-900">{{ formatHours(summary.averageHours) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div class="flex items-center gap-3">
            <div class="text-2xl">🎯</div>
            <div class="min-w-0">
              <p class="text-xs font-medium text-gray-500 truncate">Termine gesamt</p>
              <p class="text-xl font-bold text-gray-900">{{ summary.totalAppointments }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Staff Hours Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="text-lg font-semibold text-gray-900">
              Fahrlehrer-Stunden {{ selectedYear }}{{ selectedMonth !== 'all' ? ` - ${monthNames[selectedMonth]}` : '' }}
            </h2>
            <label class="relative inline-flex items-center cursor-pointer self-start sm:self-auto gap-2">
              <span class="text-sm font-medium text-gray-700">Monat</span>
              <input
                type="checkbox"
                :checked="showDetailedView"
                @change="toggleView"
                class="sr-only peer"
              />
              <div class="tenant-toggle w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              <span class="text-sm font-medium text-gray-700">Jahr</span>
            </label>
          </div>
        </div>
        
        <div v-if="staffHours.length === 0" class="text-center py-8 text-gray-500">
          Keine Daten für den ausgewählten Zeitraum verfügbar
        </div>
        
        <!-- Simple View -->
        <div v-else-if="!showDetailedView" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Fahrlehrer
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <!-- Dynamische Führerscheinkategorien (nur driving_school) -->
                <th v-for="category in availableCategories" :key="'cat-' + category.code" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ category.code }}
                </th>
                <!-- Dynamische Event-Type-Spalten -->
                <th v-for="et in availableEventTypes" :key="'et-' + et.code" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span :title="et.name">{{ et.emoji }} {{ et.code.toUpperCase() }}</span>
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abgesagt
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="staff in staffHours" :key="staff.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full flex items-center justify-center" :style="{ background: `${primaryColor}1f` }">
                        <span class="text-sm font-medium" :style="{ color: primaryColor }">
                          {{ getInitials(staff.first_name, staff.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ staff.first_name }} {{ staff.last_name }}
                      </div>
                      <div class="text-sm text-gray-500">{{ staff.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                  {{ formatHours(staff.total_hours) }}
                </td>
                <td v-for="category in availableCategories" :key="'cat-' + category.code" class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.category_stats?.[category.code]?.hours || 0) }}
                </td>
                <td v-for="et in availableEventTypes" :key="'et-' + et.code" class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.event_type_stats?.[et.code] || 0) }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.cancelled_hours) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Year Overview -->
        <div v-else class="overflow-x-auto">
          <div class="px-6 py-3 border-b flex items-center justify-between" :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33` }">
            <h3 class="text-sm font-medium" :style="{ color: primaryColor }">Jahresübersicht {{ selectedYear }}</h3>
            <div class="flex items-center gap-3">
              <span v-if="!monthlyHoursFromCache" class="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                Live-Berechnung — einmal "Neu berechnen" für schnellere Abfragen
              </span>
              <button
                @click="recalculateYearly"
                :disabled="isRecalculatingYearly"
                class="text-xs px-3 py-1.5 text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                :style="{ background: primaryColor }"
              >
                <svg v-if="isRecalculatingYearly" class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <svg v-else class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {{ isRecalculatingYearly ? 'Berechne...' : 'Neu berechnen' }}
              </button>
            </div>
          </div>
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Fahrlehrer</th>
                <th v-for="month in months" :key="month" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                  {{ month }}
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 font-bold">Total</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="staff in staffHours" :key="staff.id" class="hover:bg-gray-50">
                <td class="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                      <div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-700">
                          {{ getInitials(staff.first_name, staff.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-3">
                      <div class="text-sm font-medium text-gray-900">
                        {{ staff.first_name }} {{ staff.last_name }}
                      </div>
                    </div>
                  </div>
                </td>
                <td v-for="month in months" :key="month" class="px-3 py-4 text-center text-sm text-gray-900">
                  {{ getStaffHoursForMonth(staff, month) }}
                </td>
                <td class="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-50">
                  {{ staff.total_hours.toFixed(1) }}h
                </td>
                <td class="px-3 py-4 text-center text-gray-400 text-xs">–</td>
              </tr>
              <!-- Total Row -->
              <tr class="bg-gray-100 font-bold">
                <td class="px-4 py-4 whitespace-nowrap sticky left-0 bg-gray-100 z-10">
                  <div class="text-sm font-medium text-gray-900">Total</div>
                </td>
                <td v-for="month in months" :key="month" class="px-3 py-4 text-center text-sm text-gray-900">
                  {{ getTotalHoursForMonth(month) }}
                </td>
                <td class="px-4 py-4 text-center text-sm text-gray-900 bg-gray-200">
                  {{ getGrandTotal() }}
                </td>
                <td class="px-3 py-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div><!-- end v-else content -->

    </div><!-- end activeView === 'hours' -->

    <!-- ══════════════════════════════════════════════════
         TAB: MONATSLOHN ÜBERSICHT
         ══════════════════════════════════════════════════ -->
    <div v-if="activeView === 'monthly'" class="space-y-6">
      <!-- Year selector + recalculate -->
      <div class="bg-white rounded-lg shadow-sm border p-4">
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
            <select v-model="monthlyYear" @change="loadMonthlyHours" class="tenant-focus px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2">
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
          <button
            @click="recalculateMonthly"
            :disabled="isRecalculating"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {{ isRecalculating ? 'Berechne...' : '🔄 Neu berechnen' }}
          </button>
          <button
            @click="recalculateLast3Months"
            :disabled="isRecalculating3Months"
            class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
            title="Berechnet die letzten 3 Monate neu (wie Cron-Job)"
          >
            {{ isRecalculating3Months ? 'Berechne...' : '⏱ Letzte 3 Monate' }}
          </button>
          <p class="text-xs text-gray-500 self-end">Berechnet Soll/Ist/Ferien für alle Monatslohn-Mitarbeiter aus den eingetragenen Terminen.</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isMonthlyLoading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
      </div>

      <!-- No monthly staff -->
      <div v-else-if="monthlyStaff.length === 0" class="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
        <div class="text-4xl mb-3">📋</div>
        <p class="font-medium text-gray-700">Keine Monatslohn-Mitarbeiter</p>
        <p class="text-sm mt-1">Wechsle zu «Lohneinstellungen», um Mitarbeitern den Lohntyp «Monatslohn» zuzuweisen.</p>
      </div>

      <!-- Per-staff monthly tables -->
      <div v-else class="space-y-6">
        <div v-for="staff in monthlyStaff" :key="staff.staff_id" class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <!-- Staff header -->
          <div class="px-5 py-4 bg-gray-50 border-b flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" :style="{ background: `${primaryColor}1f`, color: primaryColor }">
                {{ staff.first_name?.charAt(0) }}{{ staff.last_name?.charAt(0) }}
              </div>
              <div>
                <div class="font-semibold text-gray-900">{{ staff.first_name }} {{ staff.last_name }}</div>
                <div class="text-xs text-gray-500">{{ staff.weekly_contracted_hours }}h / Woche</div>
              </div>
            </div>
            <!-- Vortrag Vorjahr -->
            <div class="flex items-center gap-2 text-sm">
              <span class="text-xs text-gray-500">Vortrag {{ monthlyYear - 1 }}:</span>
              <input
                type="number"
                step="0.25"
                :value="staff.carry_over_hours ?? 0"
                @change="saveMonthlyCarryOver(staff, $event)"
                class="tenant-focus w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2"
              />
              <span class="text-xs text-gray-400">h</span>
            </div>
            <!-- Running balance -->
            <div class="text-right">
              <div class="text-xs text-gray-500">Aktueller Saldo</div>
              <div class="text-lg font-bold" :class="getBalanceClass(getCurrentBalance(staff))">
                {{ formatOvertimeHours(getCurrentBalance(staff)) }}
              </div>
              <div
                v-if="(staff.vacation_balance_hours ?? 0) < 0"
                class="text-xs text-orange-500 mt-0.5"
                :title="`Ferien-Überschuss von ${formatOvertimeHours(Math.abs(staff.vacation_balance_hours))} bereits abgezogen`"
              >⚠ inkl. Ferien-Überschuss</div>
            </div>
            <!-- Ferien-Saldo -->
            <div v-if="staff.vacation_balance_days != null" class="text-right">
              <div class="text-xs text-gray-500">Ferien-Saldo</div>
              <div
                class="text-lg font-bold"
                :class="staff.vacation_balance_days >= 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ staff.vacation_balance_days > 0 ? '+' : '' }}{{ staff.vacation_balance_days }} T
              </div>
              <div class="text-xs text-gray-400">
                von {{ staff.vacation_entitlement_days ?? 20 }} Tagen
                <span v-if="(staff.vacation_carry_over_days ?? 0) > 0" class="text-green-600">
                  (+{{ staff.vacation_carry_over_days }} Vortrag)
                </span>
              </div>
            </div>
          </div>

          <!-- Monthly table -->
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th class="px-4 py-2 text-left">Monat</th>
                  <th class="px-4 py-2 text-right">Pensum</th>
                  <th class="px-4 py-2 text-right">Arbeitstage</th>
                  <th class="px-4 py-2 text-right">Soll</th>
                  <th class="px-4 py-2 text-right">Ist</th>
                  <th class="px-4 py-2 text-right">Ferien</th>
                  <th class="px-4 py-2 text-right">Krank</th>
                  <th class="px-4 py-2 text-right">Admin</th>
                  <th class="px-4 py-2 text-right">Differenz</th>
                  <th class="px-4 py-2 text-right">Saldo kumuliert</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="m in staff.months"
                  :key="m.month"
                  :class="m.month === currentMonth && monthlyYear === currentYear ? '' : 'hover:bg-gray-50'"
                  :style="m.month === currentMonth && monthlyYear === currentYear ? { background: `${primaryColor}10` } : {}"
                >
                  <td class="px-4 py-2.5 font-medium text-gray-900">{{ monthNames[m.month - 1] }}</td>
                  <td class="px-4 py-2.5 text-right">
                    <span v-if="m.pensum_pct != null" class="text-xs font-medium px-1.5 py-0.5 rounded" :class="m.pensum_pct === 100 ? 'bg-gray-100 text-gray-500' : ''" :style="m.pensum_pct !== 100 ? { background: `${primaryColor}15`, color: primaryColor } : {}">{{ m.pensum_pct }}%</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td class="px-4 py-2.5 text-right text-gray-600">{{ m.working_days }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-600">
                    <span v-if="m.target_hours != null">{{ m.target_hours.toFixed(1) }}h</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td class="px-4 py-2.5 text-right text-gray-900 font-medium">
                    <span v-if="m.actual_hours != null">{{ m.actual_hours.toFixed(1) }}h</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td class="px-4 py-2.5 text-right text-emerald-600">
                    <span v-if="m.vacation_hours != null && m.vacation_hours > 0">{{ m.vacation_hours.toFixed(1) }}h</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <!-- Krank: inline-editable (only when staff was employed) -->
                  <td class="px-4 py-2.5 text-right text-orange-600">
                    <input
                      v-if="m.target_hours != null"
                      type="number"
                      min="0"
                      max="300"
                      step="0.5"
                      :value="m.sick_hours ?? 0"
                      @change="saveSickHours(staff.staff_id, m.month, $event)"
                      class="w-16 text-right px-1 py-0.5 border border-transparent rounded hover:border-gray-300 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-transparent text-sm"
                      title="Krankheitsstunden manuell eintragen"
                    />
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <!-- Admin: inline-editable (only when staff was employed) -->
                  <td class="px-4 py-2.5 text-right text-purple-600">
                    <input
                      v-if="m.target_hours != null"
                      type="number"
                      min="0"
                      max="300"
                      step="0.5"
                      :value="m.admin_hours ?? 0"
                      @change="saveAdminHours(staff.staff_id, m.month, $event)"
                      class="w-16 text-right px-1 py-0.5 border border-transparent rounded hover:border-gray-300 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300 bg-transparent text-sm"
                      title="Administrationsstunden manuell eintragen"
                    />
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td class="px-4 py-2.5 text-right font-semibold" :class="m.overtime_hours != null ? getOvertimeClass(m.overtime_hours) : ''">
                    <span v-if="m.overtime_hours != null && (m.cumulative_overtime !== null || m.actual_hours > 0)">{{ formatOvertimeHours(m.overtime_hours) }}</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td class="px-4 py-2.5 text-right font-bold" :class="m.cumulative_overtime !== null ? getBalanceClass(m.cumulative_overtime) : 'text-gray-300'">
                    <span v-if="m.cumulative_overtime !== null">{{ formatOvertimeHours(m.cumulative_overtime) }}</span>
                    <span v-else>–</span>
                  </td>
                </tr>
              </tbody>
              <!-- Year total row -->
              <tfoot class="bg-gray-100 font-semibold text-sm border-t-2 border-gray-300">
                <tr>
                  <td class="px-4 py-2.5 text-gray-700">Total {{ monthlyYear }} <span class="font-normal text-gray-400 text-xs">(abgeschl. Monate)</span></td>
                  <td class="px-4 py-2.5"></td>
                  <td class="px-4 py-2.5 text-right text-gray-600">{{ staff.months.filter((m: any) => m.cumulative_overtime !== null).reduce((s: number, m: any) => s + m.working_days, 0) }}</td>
                  <td class="px-4 py-2.5 text-right text-gray-600">{{ staff.year_total.target_hours.toFixed(1) }}h</td>
                  <td class="px-4 py-2.5 text-right text-gray-900">{{ staff.year_total.actual_hours.toFixed(1) }}h</td>
                  <td class="px-4 py-2.5 text-right text-emerald-600">{{ staff.year_total.vacation_hours.toFixed(1) }}h</td>
                  <td class="px-4 py-2.5 text-right text-orange-600">{{ staff.months.filter((m: any) => m.cumulative_overtime !== null).reduce((s: number, m: any) => s + (m.sick_hours ?? 0), 0).toFixed(1) }}h</td>
                  <td class="px-4 py-2.5 text-right text-purple-600">{{ staff.months.filter((m: any) => m.cumulative_overtime !== null).reduce((s: number, m: any) => s + (m.admin_hours ?? 0), 0).toFixed(1) }}h</td>
                  <td class="px-4 py-2.5 text-right" :class="getOvertimeClass(staff.year_total.actual_hours + staff.year_total.vacation_hours + (staff.year_total.sick_hours ?? 0) + (staff.year_total.admin_hours ?? 0) - staff.year_total.target_hours)">
                    {{ formatOvertimeHours(staff.year_total.actual_hours + staff.year_total.vacation_hours + (staff.year_total.sick_hours ?? 0) + (staff.year_total.admin_hours ?? 0) - staff.year_total.target_hours) }}
                  </td>
                  <td class="px-4 py-2.5 text-right font-bold" :class="getBalanceClass(getCurrentBalance(staff))">
                    {{ formatOvertimeHours(getCurrentBalance(staff)) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════
         TAB: LOHNEINSTELLUNGEN
         ══════════════════════════════════════════════════ -->
    <div v-if="activeView === 'settings'" class="space-y-4">
      <div class="rounded-lg p-3 text-sm" :style="{ background: `${primaryColor}10`, border: `1px solid ${primaryColor}33`, color: primaryColor }">
        Hier kannst du für jeden Fahrlehrer den Lohntyp und das Pensum festlegen.
        Für Monatslohn-Mitarbeiter werden die Soll-Stunden pro Monat automatisch anhand der Schweizer Arbeitstage (inkl. Feiertage) berechnet.
      </div>

      <!-- Vollzeit-Referenz -->
      <div class="bg-white rounded-lg shadow-sm border p-4">
        <div class="flex flex-wrap items-center gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">100% Pensum entspricht</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="fulltimeWeeklyHours"
                type="number"
                min="1"
                max="60"
                step="0.5"
                class="tenant-focus w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2"
              />
              <span class="text-sm text-gray-500">Stunden / Woche</span>
              <button
                @click="saveFulltimeHours"
                :disabled="isSavingFulltime"
                class="px-3 py-1.5 text-white rounded-md hover:opacity-90 disabled:opacity-50 text-xs font-medium"
                :style="{ background: primaryColor }"
              >{{ isSavingFulltime ? 'Speichere...' : fulltimeSaved ? '✓' : 'Speichern' }}</button>
            </div>
            <p class="text-xs text-gray-400 mt-1">Basis für die automatische Berechnung der Vertragsstunden aus dem Pensum-Prozentsatz.</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isSettingsLoading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
      </div>

      <div v-else class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th class="px-5 py-3 text-left">Fahrlehrer</th>
              <th class="px-5 py-3 text-left">Lohntyp</th>
              <th class="px-5 py-3 text-right">
                Basis 100%
                <span class="block font-normal normal-case text-gray-400">h/Woche (Standard: {{ fulltimeWeeklyHours }}h)</span>
              </th>
              <th class="px-5 py-3 text-right">Pensum</th>
              <th class="px-5 py-3 text-right">Stunden / Woche</th>
              <th class="px-5 py-3 text-right">Ferienanspruch</th>
              <th class="px-5 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="staff in staffSettings" :key="staff.id" class="hover:bg-gray-50">
              <td class="px-5 py-3">
                <div class="font-medium text-gray-900">{{ staff.first_name }} {{ staff.last_name }}</div>
                <div class="text-xs text-gray-400">{{ staff.email }}</div>
              </td>
              <td class="px-5 py-3">
                <select
                  v-model="staff.salary_type"
                  class="tenant-focus px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2"
                >
                  <option value="hourly">Stundenlohn</option>
                  <option value="monthly">Monatslohn</option>
                </select>
              </td>
              <!-- Per-staff base override -->
              <td class="px-5 py-3 text-right">
                <div v-if="staff.salary_type === 'monthly'" class="flex items-center justify-end gap-1">
                  <input
                    v-model.number="staff.fulltime_weekly_hours_override"
                    type="number"
                    min="1"
                    max="80"
                    step="0.5"
                    :placeholder="fulltimeWeeklyHours"
                    class="tenant-focus w-20 px-2 py-1.5 border rounded-md text-sm text-right focus:ring-2"
                    :class="staff.fulltime_weekly_hours_override ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-gray-50'"
                    @input="deriveFromBase(staff)"
                  />
                  <span class="text-gray-500 text-sm">h</span>
                  <button
                    v-if="staff.fulltime_weekly_hours_override"
                    @click="staff.fulltime_weekly_hours_override = null; deriveFromBase(staff)"
                    class="text-gray-400 hover:text-red-500 text-xs"
                    title="Override entfernen"
                  >✕</button>
                </div>
                <span v-else class="text-gray-400 text-xs">–</span>
              </td>
              <!-- Pensum % -->
              <td class="px-5 py-3 text-right">
                <div v-if="staff.salary_type === 'monthly'" class="flex items-center justify-end gap-1">
                  <input
                    v-model.number="staff.employment_percentage"
                    type="number"
                    min="1"
                    max="200"
                    step="5"
                    placeholder="100"
                    class="tenant-focus w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:ring-2"
                    @input="deriveWeeklyHours(staff)"
                  />
                  <span class="text-gray-500 text-sm">%</span>
                </div>
                <span v-else class="text-gray-400 text-xs">–</span>
              </td>
              <!-- Stunden / Woche (derived) -->
              <td class="px-5 py-3 text-right">
                <div v-if="staff.salary_type === 'monthly'" class="flex items-center justify-end gap-1">
                  <input
                    v-model.number="staff.weekly_contracted_hours"
                    type="number"
                    min="0.5"
                    max="80"
                    step="0.5"
                    :placeholder="(staff.fulltime_weekly_hours_override ?? fulltimeWeeklyHours).toString()"
                    class="tenant-focus w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:ring-2 bg-gray-50"
                    @input="derivePercentage(staff)"
                  />
                  <span class="text-gray-500 text-sm">h</span>
                </div>
                <span v-else class="text-gray-400 text-xs">–</span>
              </td>
              <!-- Ferienanspruch -->
              <td class="px-5 py-3 text-right">
                <div v-if="staff.salary_type === 'monthly'" class="flex items-center justify-end gap-1">
                  <input
                    v-model.number="staff.vacation_entitlement_days"
                    type="number"
                    min="0"
                    max="365"
                    step="1"
                    placeholder="20"
                    class="tenant-focus w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:ring-2 bg-gray-50"
                  />
                  <span class="text-gray-500 text-sm">Tage</span>
                </div>
                <span v-else class="text-gray-400 text-xs">–</span>
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex flex-col items-end gap-1">
                  <div class="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>gilt ab</span>
                    <select
                      v-model.number="staff.effectiveFromMonth"
                      class="tenant-focus px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1"
                    >
                      <option v-for="(name, idx) in monthNames" :key="idx" :value="idx + 1">{{ name }}</option>
                    </select>
                  </div>
                  <button
                    @click="saveSalarySettings(staff)"
                    :disabled="staff.isSaving"
                    class="px-3 py-1.5 text-white rounded-md hover:opacity-90 disabled:opacity-50 text-xs font-medium"
                    :style="{ background: primaryColor }"
                  >
                    {{ staff.isSaving ? 'Speichere...' : staff.saved ? '✓ Gespeichert' : 'Speichern' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

</template>

<script setup lang="ts">

import { ref, onMounted, computed, watch } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'
import { useTenantBranding } from '~/composables/useTenantBranding'

const { primaryColor } = useTenantBranding()
// ✅ Using secure API instead of direct Supabase

// Meta
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Composables - using secure API (no direct Supabase)

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const monthlyHoursFromCache = ref(false)
const isRecalculatingYearly = ref(false)
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref('all')
const originalSelectedMonth = ref('all') // Store original month selection
const customStartDate = ref('')
const customEndDate = ref('')
const showDetailedView = ref(false)
const staffHours = ref<any[]>([])
const staffMonthlyHours = ref<Record<string, Record<string, number>>>({})
const availableCategories = ref<any[]>([])
const availableEventTypes = ref<{ code: string; name: string; emoji: string }[]>([])
const summary = ref({
  activeStaff: 0,
  totalHours: 0,
  averageHours: 0,
  totalAppointments: 0
})

// ── View tabs ──────────────────────────────────────────────────────────────────
const activeView = ref<'hours' | 'monthly' | 'settings'>('hours')
const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// ── Monthly salary view state ─────────────────────────────────────────────────
const monthlyYear = ref(new Date().getFullYear())
const monthlyStaff = ref<any[]>([])
const isMonthlyLoading = ref(false)
const isRecalculating = ref(false)
const isRecalculating3Months = ref(false)

// ── Carry-over (Vortrag) per staff in Monatslohn tab ─────────────────────────
const saveMonthlyCarryOver = async (staff: any, event: Event) => {
  const carry_over_hours = parseFloat((event.target as HTMLInputElement).value) || 0
  try {
    await $fetch('/api/admin/staff-monthly-hours', {
      method: 'POST',
      body: { action: 'set_carry_over', staffId: staff.staff_id, year: monthlyYear.value, carry_over_hours }
    })
    staff.carry_over_hours = carry_over_hours
    // Reload so cumulative saldo is recalculated
    await loadMonthlyHours()
  } catch (err: any) {
    console.error('❌ Error saving carry-over:', err)
  }
}

// ── Salary settings state ─────────────────────────────────────────────────────
const staffSettings = ref<any[]>([])
const isSettingsLoading = ref(false)
  
  // Month names for the year overview
const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// Available years (current year and 2 years back)
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
})

// Computed
const dateRange = computed(() => {
  return {
    start: customStartDate.value ? new Date(customStartDate.value).toISOString() : '',
    end: customEndDate.value ? new Date(customEndDate.value + 'T23:59:59').toISOString() : ''
  }
})

// Methods
const onYearChange = () => {
  updateDateRange()
  loadStaffHours() // Reload data for the new year
}

const onMonthChange = () => {
  // Store the original month selection
  originalSelectedMonth.value = selectedMonth.value
  
  updateDateRange()
  
  // If selecting a specific month (not "all"), switch to simple view
  if (selectedMonth.value !== 'all') {
    showDetailedView.value = false
  }
  
  loadStaffHours()
}

const onCustomDateChange = () => {
  // When manually changing dates, switch to simple view
  showDetailedView.value = false
  loadStaffHours()
}

const toggleView = () => {
  showDetailedView.value = !showDetailedView.value
  
  if (showDetailedView.value) {
    // Switching to year overview - set filters to show whole year
    selectedMonth.value = 'all'
    updateDateRange()
  } else {
    // Switching to simple view - restore original month selection
    selectedMonth.value = originalSelectedMonth.value
    updateDateRange()
  }
  
  // Reload data after view change
  loadStaffHours()
}

const updateDateRange = () => {
  const year = selectedYear.value
  const month = selectedMonth.value
  
  if (month === 'all') {
    // Whole year - use local date formatting to avoid timezone issues
    customStartDate.value = `${year}-01-01`
    customEndDate.value = `${year}-12-31`
  } else {
    // Specific month - use local date formatting
    const monthNum = parseInt(month)
    const monthStr = String(monthNum + 1).padStart(2, '0')
    const lastDay = new Date(year, monthNum + 1, 0).getDate()
    
    customStartDate.value = `${year}-${monthStr}-01`
    customEndDate.value = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`
  }
}

const loadStaffHours = async () => {
  try {
    isLoading.value = true
    error.value = null

    const { start, end } = dateRange.value
    if (!start || !end) {
      throw new Error('Bitte wählen Sie einen gültigen Zeitraum')
    }

    logger.debug('🔍 Loading staff hours via secure API')

    // ✅ Use secure backend API instead of direct Supabase queries
    const response = await $fetch('/api/admin/get-staff-hours', {
      query: {
        startDate: start,
        endDate: end
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to load staff hours')
    }

    // Use the response data directly
    staffHours.value = response.staffWithHours || []
    staffMonthlyHours.value = response.staffMonthlyHours || {}
    monthlyHoursFromCache.value = response.monthlyHoursFromCache ?? false
    availableCategories.value = response.availableCategories || []
    availableEventTypes.value = response.availableEventTypes || []
    summary.value = response.summary || {
      activeStaff: 0,
      totalHours: 0,
      averageHours: 0,
      totalAppointments: 0
    }

    logger.debug('✅ Staff hours loaded via API:', staffHours.value.length, 'staff members')

  } catch (err: any) {
    console.error('❌ Error loading staff hours:', err)
    error.value = err.message || 'Fehler beim Laden der Stundenübersicht'
  } finally {
    isLoading.value = false
  }
}

// Utility functions
const formatHours = (hours: number) => {
  if (hours === 0) return '0h'
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Keine'
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

// Helper functions for year overview
const getStaffHoursForMonth = (staff: any, month: string) => {
  const monthlyHours = staffMonthlyHours.value[staff.id]
  if (!monthlyHours || !monthlyHours[month]) return '0.0h'
  return `${monthlyHours[month].toFixed(1)}h`
}

const getTotalHoursForMonth = (month: string) => {
  const total = staffHours.value.reduce((sum, staff) => {
    const monthlyHours = staffMonthlyHours.value[staff.id]
    return sum + (monthlyHours?.[month] || 0)
  }, 0)
  return `${total.toFixed(1)}h`
}

const getGrandTotal = () => {
  const total = staffHours.value.reduce((sum, staff) => sum + staff.total_hours, 0)
  return `${total.toFixed(1)}h`
}

// ── Monthly hours helpers ──────────────────────────────────────────────────────

const loadMonthlyHours = async () => {
  isMonthlyLoading.value = true
  try {
    const response = await $fetch('/api/admin/staff-monthly-hours', {
      query: { year: monthlyYear.value }
    }) as any
    monthlyStaff.value = response.staff || []
  } catch (err: any) {
    console.error('❌ Error loading monthly hours:', err)
  } finally {
    isMonthlyLoading.value = false
  }
}

const saveSickHours = async (staffId: string, month: number, event: Event) => {
  const sick_hours = parseFloat((event.target as HTMLInputElement).value) || 0
  try {
    await $fetch('/api/admin/staff-monthly-hours', {
      method: 'POST',
      body: { action: 'set_sick', staffId, year: monthlyYear.value, month, sick_hours }
    })
    const staffEntry = monthlyStaff.value.find((s: any) => s.staff_id === staffId)
    if (staffEntry) {
      const monthEntry = staffEntry.months.find((m: any) => m.month === month)
      if (monthEntry) monthEntry.sick_hours = sick_hours
    }
  } catch (err: any) {
    console.error('❌ Error saving sick hours:', err)
  }
}

const saveAdminHours = async (staffId: string, month: number, event: Event) => {
  const admin_hours = parseFloat((event.target as HTMLInputElement).value) || 0
  try {
    await $fetch('/api/admin/staff-monthly-hours', {
      method: 'POST',
      body: { action: 'set_admin', staffId, year: monthlyYear.value, month, admin_hours }
    })
    const staffEntry = monthlyStaff.value.find((s: any) => s.staff_id === staffId)
    if (staffEntry) {
      const monthEntry = staffEntry.months.find((m: any) => m.month === month)
      if (monthEntry) monthEntry.admin_hours = admin_hours
    }
  } catch (err: any) {
    console.error('❌ Error saving admin hours:', err)
  }
}

const recalculateMonthly = async () => {
  isRecalculating.value = true
  try {
    await $fetch('/api/admin/staff-monthly-hours', {
      method: 'POST',
      body: { action: 'recalculate', year: monthlyYear.value }
    })
    await loadMonthlyHours()
  } catch (err: any) {
    console.error('❌ Error recalculating:', err)
  } finally {
    isRecalculating.value = false
  }
}

const recalculateYearly = async () => {
  isRecalculatingYearly.value = true
  try {
    await $fetch('/api/admin/staff-monthly-hours', {
      method: 'POST',
      body: { action: 'recalculate', year: selectedYear.value }
    })
    await loadStaffHours()
  } catch (err: any) {
    console.error('❌ Error recalculating yearly hours:', err)
  } finally {
    isRecalculatingYearly.value = false
  }
}

/** Recalculates the same 3 months the nightly cron would process. */
const recalculateLast3Months = async () => {
  isRecalculating3Months.value = true
  try {
    const now = new Date()
    // Collect last 3 months grouped by year
    const byYear: Record<number, number[]> = {}
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      if (!byYear[y]) byYear[y] = []
      byYear[y].push(m)
    }
    for (const [year, months] of Object.entries(byYear)) {
      await $fetch('/api/admin/staff-monthly-hours', {
        method: 'POST',
        body: { action: 'recalculate', year: parseInt(year), months }
      })
    }
    await loadMonthlyHours()
  } catch (err: any) {
    console.error('❌ Error recalculating last 3 months:', err)
  } finally {
    isRecalculating3Months.value = false
  }
}


const getCurrentBalance = (staff: any): number => {
  // Latest month that has a record
  const now = new Date()
  const isCurrentYear = monthlyYear.value === now.getFullYear()
  const upToMonth = isCurrentYear ? now.getMonth() + 1 : 12
  const lastRecord = [...staff.months]
    .reverse()
    .find((m: any) => m.month <= upToMonth && m.cumulative_overtime !== null)
  const raw = lastRecord?.cumulative_overtime ?? 0
  // Subtract vacation overshoot: extra vacation beyond entitlement comes from overtime
  const vacation_overshoot = Math.min(0, staff.vacation_balance_hours ?? 0)
  return raw + vacation_overshoot
}

const formatOvertimeHours = (hours: number): string => {
  const abs = Math.abs(hours)
  const h = Math.floor(abs)
  const m = Math.round((abs - h) * 60)
  const formatted = m > 0 ? `${h}h ${m}m` : `${h}h`
  return hours >= 0 ? `+${formatted}` : `-${formatted}`
}

const getOvertimeClass = (hours: number): string => {
  if (hours > 0.05) return 'text-blue-600'
  if (hours < -0.05) return 'text-red-600'
  return 'text-gray-500'
}

const getBalanceClass = (hours: number): string => {
  if (hours > 0.05) return 'text-blue-600'
  if (hours < -0.05) return 'text-red-600'
  return 'text-gray-600'
}

// ── Salary settings ────────────────────────────────────────────────────────────

const fulltimeWeeklyHours = ref(42.5)
const isSavingFulltime = ref(false)
const fulltimeSaved = ref(false)

const loadStaffSettings = async () => {
  isSettingsLoading.value = true
  try {
    // Load fulltime reference hours for this tenant
    const hrResp = await $fetch('/api/admin/hr-settings') as any
    fulltimeWeeklyHours.value = hrResp.fulltime_weekly_hours ?? 42.5

    const response = await $fetch('/api/admin/get-staff-hours', {
      query: {
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`
      }
    }) as any
    staffSettings.value = (response.staffWithHours || []).map((s: any) => {
      const staff: any = {
        ...s,
        salary_type: s.salary_type || 'hourly',
        employment_percentage: s.employment_percentage || null,
        fulltime_weekly_hours_override: s.fulltime_weekly_hours_override || null,
        weekly_contracted_hours: s.weekly_contracted_hours || null,
        vacation_entitlement_days: s.vacation_entitlement_days ?? 20,
        effectiveFromMonth: new Date().getMonth() + 1,
        isSaving: false,
        saved: false
      }
      // Auto-recalculate weekly hours from employment_percentage + current base
      // to ensure consistency when the fulltime base was changed after initial setup
      if (staff.salary_type === 'monthly' && staff.employment_percentage) {
        const base = staff.fulltime_weekly_hours_override ?? fulltimeWeeklyHours.value
        staff.weekly_contracted_hours = Math.round(
          (staff.employment_percentage / 100) * base * 4
        ) / 4
      }
      return staff
    })
  } catch (err: any) {
    console.error('❌ Error loading staff settings:', err)
  } finally {
    isSettingsLoading.value = false
  }
}

const saveFulltimeHours = async () => {
  isSavingFulltime.value = true
  try {
    await $fetch('/api/admin/hr-settings', {
      method: 'POST',
      body: { fulltime_weekly_hours: fulltimeWeeklyHours.value }
    })
    fulltimeSaved.value = true
    setTimeout(() => { fulltimeSaved.value = false }, 3000)
  } catch (err: any) {
    console.error('❌ Error saving fulltime hours:', err)
  } finally {
    isSavingFulltime.value = false
  }
}

/** When admin changes %, auto-derive weekly hours */
const deriveWeeklyHours = (staff: any) => {
  const base = staff.fulltime_weekly_hours_override ?? fulltimeWeeklyHours.value
  if (staff.employment_percentage && base) {
    staff.weekly_contracted_hours = Math.round(
      (staff.employment_percentage / 100) * base * 4
    ) / 4 // round to nearest 0.25
  }
}

/** When admin changes weekly hours directly, back-calculate % */
const derivePercentage = (staff: any) => {
  const base = staff.fulltime_weekly_hours_override ?? fulltimeWeeklyHours.value
  if (staff.weekly_contracted_hours && base) {
    staff.employment_percentage = Math.round(
      (staff.weekly_contracted_hours / base) * 100 * 10
    ) / 10 // round to 1 decimal
  }
}

/** When admin changes the per-staff base, re-derive weekly hours from % */
const deriveFromBase = (staff: any) => {
  if (staff.employment_percentage) deriveWeeklyHours(staff)
}

const saveSalarySettings = async (staff: any) => {
  staff.isSaving = true
  staff.saved = false
  try {
    await $fetch('/api/admin/staff-salary-settings', {
      method: 'POST',
      body: {
        staffId: staff.id,
        salary_type: staff.salary_type,
        employment_percentage: staff.salary_type === 'monthly' ? staff.employment_percentage : null,
        fulltime_weekly_hours_override: staff.salary_type === 'monthly' ? (staff.fulltime_weekly_hours_override || null) : null,
        weekly_contracted_hours: staff.salary_type === 'monthly' ? staff.weekly_contracted_hours : null,
        vacation_entitlement_days: staff.salary_type === 'monthly' ? (staff.vacation_entitlement_days ?? 20) : null
      }
    })

    // For monthly-salary staff: recalculate only from effectiveFromMonth onwards.
    // Months before fromMonth are left untouched (existing records stay, or no record = "not employed").
    if (staff.salary_type === 'monthly') {
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1
      const fromMonth = staff.effectiveFromMonth ?? 1

      // Only recalculate completed past months (not current/future)
      const months = Array.from({ length: currentMonth - 1 }, (_, i) => i + 1)
        .filter(m => m >= fromMonth)
      if (months.length > 0) {
        await $fetch('/api/admin/staff-monthly-hours', {
          method: 'POST',
          body: {
            action: 'recalculate',
            staffId: staff.id,
            year: currentYear,
            months,
            forceTargetRecalc: true
          }
        })
      }
    }

    staff.saved = true
    setTimeout(() => { staff.saved = false }, 3000)
  } catch (err: any) {
    console.error('❌ Error saving salary settings:', err)
  } finally {
    staff.isSaving = false
  }
}

// ── Watch tab changes ──────────────────────────────────────────────────────────
watch(activeView, (view) => {
  if (view === 'monthly' && monthlyStaff.value.length === 0) loadMonthlyHours()
  if (view === 'settings' && staffSettings.value.length === 0) loadStaffSettings()
})

// Auth check
const authStore = useAuthStore()

// Initialize
onMounted(async () => {
  logger.debug('🔍 Staff hours page mounted, checking auth...')
  
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
  
  logger.debug('✅ Auth check passed, loading staff hours...')
  
  // Original onMounted logic
  // Set default values
  const now = new Date()
  selectedYear.value = now.getFullYear()
  selectedMonth.value = now.getMonth().toString()
  
  // Initialize original month selection
  originalSelectedMonth.value = selectedMonth.value
  
  // Update date range based on initial selection
  updateDateRange()
  
  loadStaffHours()
})
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
.peer:checked ~ .tenant-toggle {
  background-color: var(--color-primary, #1E40AF);
}
.peer:focus ~ .tenant-toggle {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary, #1E40AF) 30%, transparent);
}
</style>
