<template>
  <div class="sa-root">
    <!-- Top bar -->
    <header class="sa-header">
      <div class="sa-header-inner">
        <!-- Mobile: Hamburger -->
        <button @click="mobileMenuOpen = true" class="sa-hamburger md:hidden">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- Brand -->
        <div class="flex items-center gap-2.5">
          <div class="sa-logo">
            <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5 text-indigo-300" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <div>
            <span class="sa-brand-title">Simy</span>
            <span class="sa-brand-sub">Super Admin</span>
          </div>
        </div>

        <!-- Nav links (desktop) -->
        <nav class="sa-nav hidden md:flex">
          <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to" class="sa-nav-link"
            :class="{ 'sa-nav-active': link.exact ? $route.path === link.to : $route.path.startsWith(link.to) }">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="link.icon" />
            </svg>
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Right: live badge + user -->
        <div class="flex items-center gap-2 ml-auto md:ml-0">
          <div class="sa-live-badge">
            <span class="sa-live-dot" />
            <span class="hidden sm:inline">Live</span>
          </div>

          <div class="relative" ref="userMenuRef">
            <button @click="userMenuOpen = !userMenuOpen" class="sa-user-btn">
              <div class="sa-avatar">SA</div>
              <span class="hidden md:block text-sm text-slate-300">Super Admin</span>
              <svg class="w-3.5 h-3.5 text-slate-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="userMenuOpen" class="sa-dropdown">
                <NuxtLink to="/admin" class="sa-dropdown-item">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Zum Admin
                </NuxtLink>
                <div class="sa-dropdown-divider" />
                <button @click="handleLogout" class="sa-dropdown-item sa-dropdown-danger">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Abmelden
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Drawer Overlay -->
    <Transition name="overlay">
      <div v-if="mobileMenuOpen" class="sa-overlay md:hidden" @click="mobileMenuOpen = false" />
    </Transition>

    <!-- Mobile Drawer -->
    <Transition name="drawer">
      <div v-if="mobileMenuOpen" class="sa-drawer md:hidden">
        <div class="sa-drawer-header">
          <div class="flex items-center gap-2.5">
            <div class="sa-logo">
              <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5 text-indigo-300" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Abmelden
          </button>
        </div>
      </div>
    </Transition>

    <!-- Page content -->
    <main class="sa-main">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'

const { logout } = useAuthStore()
const { showSuccess, showError } = useUIStore()

const userMenuOpen = ref(false)
const mobileMenuOpen = ref(false)
const userMenuRef = ref(null)

const navLinks = [
  { to: '/tenant-admin', label: 'Dashboard', exact: true, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/tenant-admin/tenants', label: 'Tenants', exact: false, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/tenant-admin/analytics', label: 'Analytics', exact: true, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/tenant-admin/marketing', label: 'Marketing', exact: true, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { to: '/tenant-admin/security', label: 'Security', exact: true, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { to: '/tenant-admin/errors', label: 'Errors', exact: true, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { to: '/tenant-admin/websites', label: 'Websites', exact: false, icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
  { to: '/tenant-admin/business-types', label: 'Business Types', exact: true, icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { to: '/tenant-admin/backup', label: 'Backup', exact: true, icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4' },
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

const handleClickOutside = (e) => {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    userMenuOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.sa-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f1117;
}

/* ── Header ── */
.sa-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(15, 17, 23, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04);
}
.sa-header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 1rem;
}
@media (min-width: 768px) {
  .sa-header-inner { padding: 0 1.5rem; gap: 2rem; }
}

/* Hamburger */
.sa-hamburger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  flex-shrink: 0;
  transition: background 0.15s;
}
.sa-hamburger:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }

/* Logo */
.sa-logo {
  width: 34px; height: 34px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.35);
}
.sa-brand-title {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1;
}
.sa-brand-sub {
  display: block;
  font-size: 0.625rem;
  font-weight: 500;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.2;
}

/* Nav (desktop) */
.sa-nav {
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}
.sa-nav::-webkit-scrollbar { display: none; }
.sa-nav-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.sa-nav-link:hover { color: #e2e8f0; background: rgba(99, 102, 241, 0.1); }
.sa-nav-active { color: #a5b4fc !important; background: rgba(99, 102, 241, 0.15) !important; }

/* Live badge */
.sa-live-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #34d399;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.sa-live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
  flex-shrink: 0;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

/* User button */
.sa-user-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.sa-user-btn:hover { background: rgba(255,255,255,0.06); }
.sa-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 700;
  color: white;
  flex-shrink: 0;
}

/* Dropdown */
.sa-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: #1e2130;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 0.375rem;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  z-index: 100;
}
.sa-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #cbd5e1;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}
.sa-dropdown-item:hover { background: rgba(255,255,255,0.06); color: #f1f5f9; }
.sa-dropdown-danger { color: #f87171 !important; }
.sa-dropdown-danger:hover { background: rgba(239, 68, 68, 0.1) !important; }
.sa-dropdown-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0.25rem 0; }

/* ── Mobile Drawer ── */
.sa-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 60;
}
.sa-drawer {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: min(280px, 85vw);
  background: #13151f;
  border-right: 1px solid rgba(99, 102, 241, 0.15);
  z-index: 70;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sa-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.sa-drawer-close {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}
.sa-drawer-close:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.sa-drawer-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.sa-drawer-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.15s;
}
.sa-drawer-link:hover { color: #e2e8f0; background: rgba(99, 102, 241, 0.1); }
.sa-drawer-active { color: #a5b4fc !important; background: rgba(99, 102, 241, 0.15) !important; }
.sa-drawer-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.sa-drawer-logout {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #f87171;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}
.sa-drawer-logout:hover { background: rgba(239, 68, 68, 0.1); }

/* Transitions */
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

.overlay-enter-active, .overlay-leave-active { transition: opacity 0.25s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(-100%); }

/* Main */
.sa-main {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 1.25rem 1rem;
}
@media (min-width: 768px) {
  .sa-main { padding: 2rem 1.5rem; }
}
</style>
