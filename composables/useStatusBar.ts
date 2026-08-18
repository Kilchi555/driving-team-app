// Composable to set native iOS/Android Status Bar appearance dynamically per page
// Usage: useStatusBar({ backgroundColor: '#7C3AED', style: 'light' })
//   - 'light' = light text on dark background (use for colored headers)
//   - 'dark'  = dark text on light background (use for white headers)
//
// Uses Capacitor's core `SystemBars` plugin (since Capacitor 8) instead of the
// legacy `@capacitor/status-bar` plugin. On Android 15+/16, the OS enforces
// edge-to-edge display and no longer allows apps to set a native status bar
// background color (`overlaysWebView`/`backgroundColor` are no-ops there), so
// `backgroundColor` is intentionally accepted but unused — the colored area
// under the status bar is already painted by each page via
// `env(safe-area-inset-top)` padding on its own background.

import { onMounted, watchEffect } from 'vue'

type Style = 'light' | 'dark' | 'default'

interface Options {
  backgroundColor?: string | (() => string | undefined)
  style?: Style | (() => Style)
}

export function useStatusBar(options: Options = {}) {
  if (!process.client) return

  const apply = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return

      const { SystemBars, SystemBarsStyle, SystemBarType } = await import('@capacitor/core')

      const styleVal = typeof options.style === 'function'
        ? options.style()
        : options.style

      let nativeStyle = SystemBarsStyle.Default
      if (styleVal === 'light') nativeStyle = SystemBarsStyle.Light
      else if (styleVal === 'dark') nativeStyle = SystemBarsStyle.Dark

      await SystemBars.setStyle({ style: nativeStyle, bar: SystemBarType.StatusBar })
    } catch (err) {
      // Silently ignore on web platform
    }
  }

  onMounted(apply)
  watchEffect(apply)
}
