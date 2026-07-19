<template>
  <div class="min-h-screen bg-gray-50/60">

    <!-- ═══ LOADING ═══ -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
        <p class="text-gray-500 mt-4 text-sm font-medium">Dashboard wird geladen…</p>
      </div>
    </div>

    <div v-else class="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">

      <!-- ═══ ONBOARDING CHECKLIST ═══ -->
      <AdminOnboardingChecklist />

      <!-- ═══ PENDENZEN ═══ -->
      <AdminPendencies />

      <!-- ═══ KPI HERO ROW ═══ -->
      <div class="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">

        <!-- Umsatz Monat -->
        <button
          @click="showRevenueModal = true"
          class="group relative col-span-2 lg:col-span-1 xl:col-span-1 rounded-2xl p-5 text-left overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-500 to-teal-600"
        >
          <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p class="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-2">Umsatz (Monat)</p>
          <p class="text-white text-2xl sm:text-3xl font-bold leading-none mb-1">
            CHF {{ revenueMonths[0] ? (revenueMonths[0].revenue / 100).toFixed(0) : '–' }}
          </p>
          <p class="text-emerald-200 text-xs mt-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            Vollbild anzeigen
          </p>
          <div class="absolute bottom-3 right-3 opacity-10">
            <svg class="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </div>
        </button>

        <!-- Diese Woche -->
        <div class="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <p class="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">Woche</p>
          <p class="text-gray-900 text-2xl font-bold leading-none">CHF {{ (thisWeekTotal / 100).toFixed(0) }}</p>
          <div class="mt-2 flex items-center gap-1.5">
            <span class="text-xs text-gray-400">vs.</span>
            <span class="text-xs font-semibold" :class="thisWeekTotal >= lastWeekTotal ? 'text-emerald-600' : 'text-red-500'">
              CHF {{ (lastWeekTotal / 100).toFixed(0) }}
            </span>
            <svg v-if="thisWeekTotal >= lastWeekTotal" class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
            <svg v-else class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>

        <!-- Ausstehende Zahlungen -->
        <button
          @click="showPendingStudentsModal = true"
          class="group rounded-2xl text-left p-5 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden relative"
          :class="totalPendingPayments > 0 ? 'bg-gradient-to-br from-orange-400 to-rose-500' : 'bg-white border border-gray-100'"
        >
          <p class="text-xs font-semibold uppercase tracking-widest mb-2" :class="totalPendingPayments > 0 ? 'text-orange-100' : 'text-gray-500'">Ausstehend</p>
          <p class="text-2xl font-bold leading-none" :class="totalPendingPayments > 0 ? 'text-white' : 'text-gray-900'">
            {{ totalPendingPayments }}
          </p>
          <p class="text-xs mt-1.5 font-medium" :class="totalPendingPayments > 0 ? 'text-orange-100' : 'text-gray-400'">
            CHF {{ (totalPendingAmount / 100).toFixed(0) }} offen
          </p>
          <div v-if="totalPendingPayments > 0" class="absolute bottom-3 right-3 opacity-15">
            <svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          </div>
        </button>

        <!-- Stunden Heute -->
        <div class="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <p class="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">Stunden heute</p>
          <p class="text-gray-900 text-2xl font-bold leading-none">{{ hoursStats.today }}<span class="text-base font-normal text-gray-400">h</span></p>
          <div class="mt-2 grid grid-cols-2 gap-1 text-xs">
            <span class="text-gray-400">Woche</span>
            <span class="text-right font-semibold text-blue-600">{{ hoursStats.thisWeek }}h</span>
            <span class="text-gray-400">Monat</span>
            <span class="text-right font-semibold text-purple-600">{{ hoursStats.thisMonth }}h</span>
          </div>
        </div>

        <!-- Kurse -->
        <NuxtLink to="/admin/courses" class="group rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 block">
          <p class="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">Kurse</p>
          <p class="text-gray-900 text-2xl font-bold leading-none">{{ coursesStats.active }}</p>
          <div class="mt-2 grid grid-cols-2 gap-1 text-xs">
            <span class="text-gray-400">Teilnehmer</span>
            <span class="text-right font-semibold text-indigo-600">{{ coursesStats.participants }}</span>
            <span class="text-gray-400">Diesen Monat</span>
            <span class="text-right font-semibold text-teal-600">{{ coursesStats.thisMonth }}</span>
          </div>
        </NuxtLink>
      </div>

      <!-- ═══ REVENUE TREND + PENDING STUDENTS ═══ -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

        <!-- Revenue Sparkline Card -->
        <div class="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Umsatz-Verlauf</h3>
              <p class="text-xs text-gray-400 mt-0.5">Letzte {{ revenueMonths.length }} Monate</p>
            </div>
            <button @click="showRevenueModal = true"
              class="tenant-link-pill text-xs font-semibold transition-colors px-3 py-1.5 rounded-xl"
              :style="{ color: primaryColor }">
              12 Monate →
            </button>
          </div>

          <!-- Mini Bar Chart -->
          <div v-if="revenueMonths.length > 0" class="flex items-end gap-1.5 h-24">
            <template v-for="(month, idx) in [...revenueMonths].reverse()" :key="month.monthKey || idx">
              <div class="flex-1 flex flex-col items-center gap-1 group cursor-pointer" @click="openMonthDetail(month)">
                <div class="w-full rounded-t-md transition-all duration-200 group-hover:opacity-80"
                  :class="idx === revenueMonths.length - 1 ? 'bg-emerald-500' : 'bg-emerald-200'"
                  :style="{ height: revenueMonths.length > 0 && Math.max(...revenueMonths.map(m => m.revenue)) > 0
                    ? `${Math.max(8, (month.revenue / Math.max(...revenueMonths.map(m => m.revenue))) * 96)}px`
                    : '8px' }">
                </div>
                <span class="text-[9px] text-gray-400 truncate w-full text-center leading-tight hidden sm:block">
                  {{ month.name?.slice(0, 3) }}
                </span>
              </div>
            </template>
          </div>
          <div v-else class="h-24 flex items-center justify-center text-gray-400 text-sm">Noch keine Daten</div>

          <!-- Month totals under chart -->
          <div class="mt-3 flex justify-between text-xs text-gray-500">
            <span v-if="revenueMonths.length > 1">{{ [...revenueMonths].reverse()[0]?.name }}</span>
            <span class="font-semibold text-emerald-600">
              CHF {{ (revenueMonths[0]?.revenue / 100 || 0).toFixed(0) }}
              <span class="font-normal text-gray-400">diesen Monat</span>
            </span>
          </div>
        </div>

        <!-- Ausstehende Zahlungen – Top Students -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Ausstehend</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ pendingStudents.length }} Schüler</p>
            </div>
            <button v-if="pendingStudents.length > 3" @click="showPendingStudentsModal = true"
              class="text-xs font-semibold text-orange-600 hover:text-orange-800 transition-colors px-3 py-1.5 rounded-xl hover:bg-orange-50">
              Alle →
            </button>
          </div>

          <div v-if="pendingStudents.length === 0" class="flex flex-col items-center justify-center py-8 gap-2">
            <div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <p class="text-sm text-gray-500 font-medium">Alles beglichen</p>
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="student in pendingStudents.slice(0, 4)"
              :key="student.id"
              @click="navigateToStudentPayments(student.id)"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
            >
              <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-orange-700">
                {{ student.first_name?.charAt(0) }}{{ student.last_name?.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-900 truncate">{{ student.first_name }} {{ student.last_name }}</p>
                <p class="text-xs text-gray-400">CHF {{ (student.total_pending_amount / 100).toFixed(0) }}</p>
              </div>
              <span class="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full flex-shrink-0">
                {{ student.pending_payments_count }}×
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ QUICK ACTIONS ═══ -->
      <div>
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-0.5">Schnellzugriff</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <NuxtLink
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            class="group flex flex-col items-center gap-2.5 rounded-2xl bg-white border border-gray-100 p-4 text-center shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div class="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              :style="{ backgroundColor: action.color + '18' }">
              <svg class="w-5 h-5" :style="{ color: action.color }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="action.icon"/>
              </svg>
            </div>
            <span class="text-xs font-semibold text-gray-700 leading-tight">{{ action.label }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- ═══ ACTIVITY + STATS ROW ═══ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        <!-- Recent Activity -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 class="text-sm font-bold text-gray-900">Letzte Aktivitäten</h3>
            <NuxtLink to="/admin/payment-overview"
              class="tenant-link-pill text-xs font-semibold transition-colors px-3 py-1.5 rounded-xl"
              :style="{ color: primaryColor }">
              Alle Zahlungen →
            </NuxtLink>
          </div>
          <div class="divide-y divide-gray-50">
            <div v-if="recentActivities.length === 0" class="flex items-center justify-center py-12 text-gray-400 text-sm">
              Noch keine Aktivitäten
            </div>
            <div
              v-for="activity in recentActivities.slice(0, 8)"
              :key="activity.id"
              class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors"
            >
              <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                :class="activity.type === 'payment' ? 'bg-emerald-50 text-emerald-600' :
                       activity.type === 'pending_payment' ? 'bg-orange-50 text-orange-600' :
                       activity.type === 'booking' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'">
                {{ activity.icon }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-900 truncate">{{ activity.title }}</p>
                <p v-if="activity.description" class="text-xs text-gray-400 truncate">{{ activity.description }}</p>
              </div>
              <span class="text-xs font-bold flex-shrink-0"
                :class="activity.type === 'payment' ? 'text-emerald-600' : activity.type === 'pending_payment' ? 'text-orange-500' : 'text-gray-700'">
                {{ activity.amount }}
              </span>
            </div>
          </div>
        </div>

        <!-- Stats sidebar -->
        <div class="space-y-3">

          <!-- Guthaben -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest">Guthaben</h4>
              <NuxtLink to="/admin/student-credits" class="text-xs hover:opacity-70 transition-opacity" :style="{ color: primaryColor }">→</NuxtLink>
            </div>
            <p class="text-xl font-bold text-gray-900">CHF {{ (creditsStats.totalCredit / 100).toFixed(0) }}</p>
            <div class="mt-2 flex justify-between text-xs">
              <span class="text-gray-400">Schüler</span>
              <span class="font-semibold text-indigo-600">{{ creditsStats.studentsWithCredit }}</span>
            </div>
            <div class="mt-1 flex justify-between text-xs">
              <span class="text-gray-400">Ø pro Schüler</span>
              <span class="font-semibold text-purple-600">
                CHF {{ creditsStats.studentsWithCredit > 0 ? ((creditsStats.totalCredit / creditsStats.studentsWithCredit) / 100).toFixed(0) : '0' }}
              </span>
            </div>
          </div>

          <!-- Absagen -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest">Absagen</h4>
              <NuxtLink to="/admin/cancellation-management" class="text-xs hover:opacity-70 transition-opacity" :style="{ color: primaryColor }">→</NuxtLink>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Diese Woche</span>
                <span class="font-bold" :class="cancellationsStats.thisWeek > 3 ? 'text-red-600' : 'text-gray-900'">{{ cancellationsStats.thisWeek }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-400">
                <span>Dieser Monat</span>
                <span class="font-semibold text-orange-500">{{ cancellationsStats.thisMonth }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-400">
                <span>Letzter Monat</span>
                <span class="font-semibold">{{ cancellationsStats.lastMonth }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>

  <!-- ═══ MODAL: Ausstehende Zahlungen ═══ -->
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showPendingStudentsModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6" @click.self="showPendingStudentsModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 class="text-base font-bold text-gray-900">Ausstehende Zahlungen</h2>
              <p class="text-xs text-gray-400 mt-0.5">{{ pendingStudents.length }} Schüler · CHF {{ (totalPendingAmount / 100).toFixed(0) }} gesamt</p>
            </div>
            <button @click="showPendingStudentsModal = false" class="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Summary pills -->
          <div class="flex gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div class="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-1.5">
              <span class="text-xs text-blue-600 font-medium">Schüler</span>
              <span class="text-sm font-bold text-blue-800">{{ pendingStudents.length }}</span>
            </div>
            <div class="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-1.5">
              <span class="text-xs text-orange-600 font-medium">Zahlungen</span>
              <span class="text-sm font-bold text-orange-800">{{ totalPendingPayments }}</span>
            </div>
            <div class="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-1.5">
              <span class="text-xs text-red-600 font-medium">Betrag</span>
              <span class="text-sm font-bold text-red-800">CHF {{ (totalPendingAmount / 100).toFixed(0) }}</span>
            </div>
          </div>

          <div class="overflow-y-auto flex-1 p-4">
            <div v-if="pendingStudents.length === 0" class="flex flex-col items-center justify-center py-12 gap-2">
              <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </div>
              <p class="text-sm font-semibold text-gray-700">Keine ausstehenden Zahlungen</p>
            </div>
            <div v-else class="space-y-2">
              <button
                v-for="student in pendingStudents"
                :key="student.id"
                @click="navigateToStudentPayments(student.id); showPendingStudentsModal = false"
                class="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all text-left group"
              >
                <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-orange-700">
                  {{ student.first_name?.charAt(0) }}{{ student.last_name?.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900">{{ student.first_name }} {{ student.last_name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ student.email }}</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-sm font-bold text-gray-900">CHF {{ (student.total_pending_amount / 100).toFixed(0) }}</p>
                  <p class="text-xs text-orange-600 font-medium">{{ student.pending_payments_count }} Zahlung{{ student.pending_payments_count !== 1 ? 'en' : '' }}</p>
                </div>
                <svg class="w-4 h-4 text-gray-300 group-hover:text-orange-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══ MODAL: Umsatz 12 Monate ═══ -->
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showRevenueModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6" @click.self="showRevenueModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 class="text-base font-bold text-gray-900">Umsatz-Übersicht</h2>
              <p class="text-xs text-gray-400 mt-0.5">Letzte 12 Monate</p>
            </div>
            <button @click="showRevenueModal = false" class="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="overflow-y-auto flex-1">
            <div v-if="revenue12Months.length === 0" class="flex items-center justify-center py-16">
              <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
            </div>
            <table v-else class="w-full">
              <thead class="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Monat</th>
                  <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Umsatz</th>
                  <th class="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Zahlungen</th>
                  <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ø</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="(month, index) in revenue12Months" :key="month.monthKey"
                  class="hover:bg-gray-50/70 transition-colors"
                  :class="index === 0 ? 'bg-emerald-50/60' : ''">
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2">
                      <span v-if="index === 0" class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                      <span class="text-sm font-semibold text-gray-900">{{ month.name }}</span>
                      <span v-if="index === 0" class="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">aktuell</span>
                    </div>
                  </td>
                  <td class="px-5 py-3.5 text-right">
                    <span class="text-sm font-bold text-emerald-600">CHF {{ (month.revenue / 100).toFixed(0) }}</span>
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{{ month.paymentsCount }}</span>
                  </td>
                  <td class="px-5 py-3.5 text-right text-sm text-gray-600">
                    CHF {{ month.paymentsCount > 0 ? ((month.revenue / month.paymentsCount) / 100).toFixed(0) : '–' }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td class="px-5 py-3.5 text-sm font-bold text-gray-900">Gesamt</td>
                  <td class="px-5 py-3.5 text-right text-sm font-bold text-emerald-600">
                    CHF {{ (revenue12Months.reduce((s, m) => s + m.revenue, 0) / 100).toFixed(0) }}
                  </td>
                  <td class="px-5 py-3.5 text-center text-sm font-bold text-gray-900">
                    {{ revenue12Months.reduce((s, m) => s + m.paymentsCount, 0) }}
                  </td>
                  <td class="px-5 py-3.5 text-right text-sm text-gray-600">
                    CHF {{ revenue12Months.reduce((s, m) => s + m.paymentsCount, 0) > 0
                      ? ((revenue12Months.reduce((s, m) => s + m.revenue, 0) / revenue12Months.reduce((s, m) => s + m.paymentsCount, 0)) / 100).toFixed(0)
                      : '–' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ═══ MODAL: Monat-Details ═══ -->
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showMonthDetailModal && selectedMonth" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="showMonthDetailModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 class="text-base font-bold text-gray-900">{{ selectedMonth.name }}</h2>
            <button @click="showMonthDetailModal = false" class="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-6 grid grid-cols-2 gap-4">
            <div class="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <p class="text-xs font-semibold text-emerald-600 mb-1">Bezahlter Umsatz</p>
              <p class="text-xl font-bold text-emerald-700">CHF {{ (selectedMonth.revenue / 100).toFixed(0) }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ selectedMonth.paymentsCount }} Zahlungen</p>
            </div>
            <div class="rounded-2xl bg-orange-50 border border-orange-100 p-4">
              <p class="text-xs font-semibold text-orange-600 mb-1">Ausstehend</p>
              <p class="text-xl font-bold text-orange-700">{{ selectedMonth.pendingCount }}</p>
              <p class="text-xs text-gray-500 mt-1">Noch offen</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, onMounted, computed, watch } from 'vue'
import { navigateTo } from '#app'
import LoadingLogo from '~/components/LoadingLogo.vue'
import AdminPendencies from '~/components/admin/AdminPendencies.vue'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { logger } from '~/utils/logger'

definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

// Current User für Tenant-ID
const { currentUser } = useCurrentUser()
const authStore = useAuthStore()
const uiStore = useUIStore()
const { primaryColor } = useTenantBranding()

// Types
interface DashboardStats {
  todayRevenue: number
  todayLessons: number
  weekRevenue: number
  activeUsers: number
  newUsersThisWeek: number
  pendingPayments: number
  pendingAmount: number
  todayAppointments: number
  tomorrowAppointments: number
  topCategories: CategoryStat[]
}

interface CategoryStat {
  code: string
  count: number
  color: string
}

interface Activity {
  id: number
  type: string
  icon: string
  title: string
  description: string
  amount: string
  time: string
}

interface Invoice {
  id: string
  customer_name: string
  total_amount_rappen: number
  created_at: string
  status: string
}

interface PendingStudent {
  id: string
  first_name: string
  last_name: string
  email: string
  pending_payments_count: number
  total_pending_amount: number
}

// State
const isLoading = ref(true) // Start with true, load summary will set to false

const stats = ref<DashboardStats>({
  todayRevenue: 0,
  todayLessons: 0,
  weekRevenue: 0,
  activeUsers: 0,
  newUsersThisWeek: 0,
  pendingPayments: 0,
  pendingAmount: 0,
  todayAppointments: 0,
  tomorrowAppointments: 0,
  topCategories: []
})

const recentActivities = ref<Activity[]>([])

// Revenue State
interface RevenueMonth {
  name: string
  revenue: number
  paymentsCount: number
  pendingCount: number
  monthKey: string
}

const revenueMonths = ref<RevenueMonth[]>([])
const showRevenueModal = ref(false)
const revenue12Months = ref<RevenueMonth[]>([])
const revenueFilter = ref({
  paymentMethod: 'all', // all, cash, invoice, online
  category: 'all', // all, B, A, C, etc.
  customRange: false,
  startDate: '',
  endDate: ''
})
const showMonthDetailModal = ref(false)
const selectedMonth = ref<RevenueMonth | null>(null)

// New stats
const isLoadingCourses = ref(true)
const coursesStats = ref({
  active: 0,
  participants: 0,
  thisMonth: 0
})

const isLoadingCredits = ref(true)
const creditsStats = ref({
  studentsWithCredit: 0,
  totalCredit: 0
})

const isLoadingCancellations = ref(true)
const cancellationsStats = ref({
  thisWeek: 0,
  thisMonth: 0,
  lastMonth: 0
})

const isLoadingHours = ref(true)
const hoursStats = ref({
  today: 0,
  thisWeek: 0,
  thisMonth: 0
})

// Function to load all dashboard data from single API
const loadDashboardSummary = async () => {
  try {
    isLoading.value = true
    logger.debug('🔄 Loading dashboard summary from API...')

    const response = await $fetch('/api/admin/dashboard-summary', {
      method: 'POST'
    }) as any

    if (!response.success) {
      throw new Error(response.error || 'Failed to load dashboard summary')
    }

    const summary = response.data

    // Update revenue months
    revenueMonths.value = summary.revenueMonths || []

    // Update pending students
    pendingStudents.value = summary.pendingStudents || []

    // Update invoices
    recentInvoices.value = summary.recentInvoices || []

    // Update activities
    recentActivities.value = summary.recentActivities || []

    // Update courses stats
    coursesStats.value = summary.coursesStats || { active: 0, participants: 0, thisMonth: 0 }

    // Update credits stats
    creditsStats.value = summary.creditsStats || { studentsWithCredit: 0, totalCredit: 0 }

    // Update cancellations stats
    cancellationsStats.value = summary.cancellationsStats || { thisWeek: 0, thisMonth: 0, lastMonth: 0 }

    // Update hours stats
    hoursStats.value = summary.hoursStats || { today: 0, thisWeek: 0, thisMonth: 0 }

    logger.debug('✅ Dashboard summary loaded successfully')
  } catch (error: any) {
    logger.error('❌ Error loading dashboard summary:', error)
    // A 401 here means the session expired/is being recovered — the global
    // fetch interceptor already shows "Sitzung abgelaufen" and handles the
    // redirect. Showing a second, contradictory "Dashboard-Daten konnten
    // nicht geladen werden" toast on top of that is just confusing noise.
    const status = error?.statusCode || error?.status || error?.data?.statusCode
    if (status !== 401) {
      uiStore.addNotification({
        type: 'error',
        title: 'Fehler',
        message: 'Dashboard-Daten konnten nicht geladen werden',
        duration: 6000
      })
    }
  } finally {
    isLoading.value = false
  }
}

// Invoice state
const isLoadingInvoices = ref(false)
const recentInvoices = ref<Invoice[]>([])

// Pending students state
const isLoadingPendingStudents = ref(false)
const pendingStudents = ref<PendingStudent[]>([])
const showPendingStudentsModal = ref(false)

// Computed properties for invoices
const thisWeekInvoices = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return recentInvoices.value.filter(invoice => 
    new Date(invoice.created_at) >= weekStart
  )
})

const lastWeekInvoices = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  return recentInvoices.value.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at)
    return invoiceDate >= twoWeeksAgo && invoiceDate < weekStart
  })
})

const thisWeekTotal = computed(() => 
  thisWeekInvoices.value.reduce((sum, invoice) => sum + invoice.total_amount_rappen, 0)
)

const lastWeekTotal = computed(() => 
  lastWeekInvoices.value.reduce((sum, invoice) => sum + invoice.total_amount_rappen, 0)
)

// Computed properties for pending students
const totalPendingPayments = computed(() => 
  pendingStudents.value.reduce((sum, student) => sum + student.pending_payments_count, 0)
)

const totalPendingAmount = computed(() => 
  pendingStudents.value.reduce((sum, student) => sum + student.total_pending_amount, 0)
)

// Methods
const loadDashboardStats = async () => {
  // Consolidated into loadDashboardSummary
}

const getCategoryColor = (categoryCode: string): string => {
  const colors: Record<string, string> = {
    'B': '#10B981',
    'A': '#3B82F6', 
    'A1': '#3B82F6',
    'C': '#F59E0B',
    'CE': '#EF4444',
    'D': '#8B5CF6'
  }
  return colors[categoryCode] || '#6B7280'
}

// Load 12 months revenue data for modal
const load12MonthsRevenue = async () => {
  try {
    const tenantId = authStore.userProfile?.tenant_id || currentUser.value?.tenant_id
    if (!tenantId) {
      console.warn('No tenant ID found for 12 months revenue data')
      return
    }

    logger.debug('🔄 Loading 12 months revenue from API...')

    const response = await $fetch('/api/admin/dashboard-revenue-12m', {
      method: 'POST'
    }) as any

    if (!response.success) {
      throw new Error(response.error || 'Failed to load revenue data')
    }

    revenue12Months.value = response.data || []
    logger.debug('✅ 12 months revenue data loaded successfully')
  } catch (error: any) {
    logger.error('❌ Error loading 12 months revenue data:', error)
  }
}

const navigateToStudentPayments = (userId: string) => {
  if (!userId || userId === 'null') return
  navigateTo(`/admin/payments/${userId}`)
}

// Open month detail modal
const openMonthDetail = (month: RevenueMonth) => {
  selectedMonth.value = month
  showMonthDetailModal.value = true
}

// Quick Actions
const quickActions = [
  { to: '/admin/invoices',             label: 'Rechnungen',    color: '#2563EB', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { to: '/admin/payment-overview',     label: 'Zahlungen',     color: '#059669', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { to: '/admin/privatkunden',          label: 'Privatkunden',  color: '#7C3AED', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { to: '/admin/courses',              label: 'Kurse',         color: '#0891B2', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { to: '/admin/student-credits',      label: 'Guthaben',      color: '#D97706', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { to: '/admin/payment-reminders',    label: 'Erinnerungen',  color: '#DC2626', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { to: '/admin/cancellation-management', label: 'Absagen',   color: '#9333EA', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/admin/staff-hours',          label: 'Stunden',       color: '#0284C7', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/admin/pricing',              label: 'Preise',        color: '#16A34A', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { to: '/admin/categories',           label: 'Kategorien',    color: '#6366F1', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { to: '/admin/products',             label: 'Produkte',      color: '#F59E0B', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { to: '/admin/profile',             label: 'Einstellungen', color: '#64748B', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

// Watch for modal opening
watch(showRevenueModal, (isOpen) => {
  if (isOpen) {
    load12MonthsRevenue()
  }
})

// Load all data function
const loadAllDashboardData = () => {
  const tenantId = authStore.userProfile?.tenant_id || currentUser.value?.tenant_id
  logger.debug('🔄 Loading all dashboard data...', { 
    tenantId, 
    authStoreProfile: !!authStore.userProfile,
    authStoreTenant: authStore.userProfile?.tenant_id, 
    currentUserTenant: currentUser.value?.tenant_id 
  })
  
  if (tenantId) {
    logger.debug('✅ Tenant ID available, loading data:', tenantId)
    loadDashboardSummary()
  } else {
    console.warn('⚠️ No tenant_id found, retrying in 500ms...')
    setTimeout(loadAllDashboardData, 500)
  }
}

// Watch for tenant to be available
watch(() => authStore.userProfile?.tenant_id, (tenantId) => {
  if (tenantId) {
    logger.debug('✅ Tenant ID available in auth store, loading data:', tenantId)
    loadAllDashboardData()
  }
}, { immediate: true })

onMounted(() => {
  logger.debug('📊 Dashboard page mounted')
})
</script>

<style scoped>
.transition-colors {
  transition: all 0.2s ease-in-out;
}

.tenant-link-pill:hover {
  background-color: color-mix(in srgb, var(--color-primary, #1E40AF) 10%, transparent);
}
</style>