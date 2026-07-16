<template>
  <div class="sa-root">

    <!-- ── Mobile Header (nur < lg) ── -->
    <header class="sa-mobile-header lg:hidden">
      <button @click="mobileMenuOpen = true" class="sa-hamburger">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div class="flex items-center gap-2">
        <div class="sa-logo-sm">
          <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-indigo-300" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <span class="text-sm font-semibold text-slate-200">Super Admin</span>
      </div>
      <div class="flex items-center gap-2 ml-auto">
        <div class="sa-live-badge-sm"><span class="sa-live-dot" /></div>
        <div class="sa-avatar-sm">SA</div>
      </div>
    </header>

    <!-- ── Layout body ── -->
    <div class="sa-body">

      <!-- ── Sidebar (Desktop ≥ lg) ── -->
      <aside class="sa-sidebar hidden lg:flex">
        <!-- Brand -->
        <div class="sa-sidebar-brand">
          <div class="sa-logo">
            <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5 text-indigo-300" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <div>
            <span class="sa-brand-title">Simy</span>
            <span class="sa-brand-sub">Super Admin</span>
          </div>
          <div class="sa-live-badge ml-auto">
            <span class="sa-live-dot" />
            Live
          </div>
        </div>

        <!-- Nav -->
        <nav class="sa-sidebar-nav">
          <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to"
            class="sa-sidebar-link"
            :class="{ 'sa-sidebar-active': link.exact ? $route.path === link.to : $route.path.startsWith(link.to) }">
            <svg class="w-4.5 h-4.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:18px;height:18px">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="link.icon" />
            </svg>
            <span>{{ link.label }}</span>
          </NuxtLink>
        </nav>

        <!-- Footer -->
        <div class="sa-sidebar-footer">
          <div class="sa-sidebar-user">
            <div class="sa-avatar">SA</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-slate-200 truncate">Super Admin</div>
              <div class="text-xs text-slate-500 truncate">info@simy.ch</div>
            </div>
          </div>
          <div class="flex gap-1 mt-2">
            <NuxtLink to="/admin" class="sa-footer-btn flex-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Admin
            </NuxtLink>
            <button @click="handleLogout" class="sa-footer-btn sa-footer-danger">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      <!-- ── Page content ── -->
      <main class="sa-main">
        <slot />
      </main>
    </div>

    <!-- ── Mobile Overlay ── -->
    <Transition name="overlay">
      <div v-if="mobileMenuOpen" class="sa-overlay lg:hidden" @click="mobileMenuOpen = false" />
    </Transition>

    <!-- ── Mobile Drawer ── -->
    <Transition name="drawer">
      <div v-if="mobileMenuOpen" class="sa-drawer lg:hidden">
        <div class="sa-drawer-header">
          <div class="flex items-center gap-2.5">
            <div class="sa-logo">
              <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5 text-indigo-300" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <div>
              <span class="sa-brand-title">Simy</span>
              <span class="sa-brand-sub">Super Admin</span>
            </div>
          </div>
          <button @click="mobileMenuOpen = false" class="sa-drawer-close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav class="sa-drawer-nav">
          <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to"
            class="sa-drawer-link"
            :class="{ 'sa-drawer-active': link.exact ? $route.path === link.to : $route.path.startsWith(link.to) }"
            @click="mobileMenuOpen = false">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="link.icon" />
            </svg>
            {{ link.label }}
          </NuxtLink>
        </nav>
        <div class="sa-drawer-footer">
          <button @click="handleLogout" class="sa-drawer-logout">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Abmelden
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'

const { logout } = useAuthStore()
const { showSuccess, showError } = useUIStore()

const mobileMenuOpen = ref(false)

const navLinks = [
  { to: '/tenant-admin', label: 'Dashboard', exact: true, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/tenant-admin/tenants', label: 'Tenants', exact: false, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/tenant-admin/analytics', label: 'Analytics', exact: true, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/tenant-admin/marketing', label: 'Marketing', exact: true, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { to: '/tenant-admin/security', label: 'Security', exact: true, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { to: '/tenant-admin/errors', label: 'Errors', exact: true, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { to: '/tenant-admin/vercel-log-reviews', label: 'Vercel Reviews', exact: true, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { to: '/tenant-admin/websites', label: 'Websites', exact: false, icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
  { to: '/tenant-admin/business-types', label: 'Business Types', exact: true, icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { to: '/tenant-admin/backup', label: 'Backup', exact: true, icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4' },
  { to: '/tenant-admin/credentials', label: 'Credentials', exact: true, icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { to: '/admin/cron-status', label: 'Cron Status', exact: true, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
]

const handleLogout = async () => {
  mobileMenuOpen.value = false
  const { getLoginPath } = await import('~/utils/redirect-to-login')
  const loginPath = getLoginPath()
  try {
    await logout()
    showSuccess('Erfolgreich abgemeldet')
    await navigateTo(loginPath)
  } catch (error) {
    showError('Fehler beim Abmelden: ' + (error?.message || 'Unbekannter Fehler'))
    await navigateTo(loginPath)
  }
}
</script>

<style scoped>
.sa-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f1117;
}

/* ── Mobile Header ── */
.sa-mobile-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 52px;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(15, 17, 23, 0.97);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
}
.sa-hamburger {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: transparent; border: none;
  cursor: pointer; color: #94a3b8;
  flex-shrink: 0; transition: background 0.15s;
}
.sa-hamburger:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.sa-logo-sm {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sa-live-badge-sm {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 50%;
}
.sa-avatar-sm {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; font-weight: 700; color: white;
}

/* ── Body layout ── */
.sa-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* ── Sidebar ── */
.sa-sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  flex-direction: column;
  background: #13151f;
  border-right: 1px solid rgba(99, 102, 241, 0.12);
  overflow: hidden;
}
.sa-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.sa-logo {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
}
.sa-brand-title {
  display: block;
  font-size: 0.85rem; font-weight: 700; color: #f1f5f9; line-height: 1;
}
.sa-brand-sub {
  display: block;
  font-size: 0.6rem; font-weight: 500; color: #6366f1;
  text-transform: uppercase; letter-spacing: 0.08em; line-height: 1.4;
}

/* Nav */
.sa-sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(99,102,241,0.2) transparent;
}
.sa-sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.825rem; font-weight: 500;
  color: #64748b;
  text-decoration: none;
  transition: all 0.15s;
  white-space: nowrap;
}
.sa-sidebar-link:hover { color: #e2e8f0; background: rgba(99,102,241,0.08); }
.sa-sidebar-active { color: #a5b4fc !important; background: rgba(99,102,241,0.15) !important; }

/* Footer */
.sa-sidebar-footer {
  padding: 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.sa-sidebar-user {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.5rem 0.5rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  margin-bottom: 0.5rem;
}
.sa-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; font-weight: 700; color: white; flex-shrink: 0;
}
.sa-footer-btn {
  display: flex; align-items: center; justify-content: center; gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  border-radius: 7px;
  font-size: 0.75rem; font-weight: 500;
  color: #64748b;
  background: none; border: none; cursor: pointer;
  text-decoration: none; transition: all 0.15s;
}
.sa-footer-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.sa-footer-danger { color: #f87171 !important; }
.sa-footer-danger:hover { background: rgba(239,68,68,0.1) !important; }

/* Live badge */
.sa-live-badge {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);
  border-radius: 999px; font-size: 0.65rem; font-weight: 600;
  color: #34d399; text-transform: uppercase; letter-spacing: 0.06em;
  flex-shrink: 0;
}
.sa-live-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #10b981; animation: pulse 2s infinite; flex-shrink: 0;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

/* ── Main ── */
.sa-main {
  flex: 1;
  min-width: 0;
  padding: 1.25rem 1rem;
  overflow-y: auto;
}
@media (min-width: 1024px) {
  .sa-main { padding: 2rem 2rem; }
}

/* ── Mobile Drawer ── */
.sa-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 60;
}
.sa-drawer {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: min(260px, 85vw);
  background: #13151f;
  border-right: 1px solid rgba(99,102,241,0.15);
  z-index: 70; display: flex; flex-direction: column;
}
.sa-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
}
.sa-drawer-close {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; background: transparent; border: none;
  color: #64748b; cursor: pointer; transition: all 0.15s;
}
.sa-drawer-close:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.sa-drawer-nav {
  flex: 1; overflow-y: auto; padding: 0.75rem;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.sa-drawer-link {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem; border-radius: 10px;
  font-size: 0.9rem; font-weight: 500; color: #94a3b8;
  text-decoration: none; transition: all 0.15s;
}
.sa-drawer-link:hover { color: #e2e8f0; background: rgba(99,102,241,0.1); }
.sa-drawer-active { color: #a5b4fc !important; background: rgba(99,102,241,0.15) !important; }
.sa-drawer-footer {
  padding: 1rem; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
}
.sa-drawer-logout {
  display: flex; align-items: center; gap: 0.75rem;
  width: 100%; padding: 0.75rem 1rem; border-radius: 10px;
  font-size: 0.9rem; font-weight: 500; color: #f87171;
  background: none; border: none; cursor: pointer; transition: all 0.15s;
}
.sa-drawer-logout:hover { background: rgba(239,68,68,0.1); }

/* Transitions */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.25s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.drawer-enter-active, .drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(-100%); }
</style>
