// Composable to set native iOS/Android Status Bar appearance dynamically per page
// Usage: useStatusBar({ backgroundColor: '#7C3AED', style: 'light' })
//   - 'light' = light text on dark background (use for colored headers)
//   - 'dark'  = dark text on light background (use for white headers)

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

      const { StatusBar, Style } = await import('@capacitor/status-bar')

      const bg = typeof options.backgroundColor === 'function'
        ? options.backgroundColor()
        : options.backgroundColor

      const styleVal = typeof options.style === 'function'
        ? options.style()
        : options.style

      if (bg) {
        await StatusBar.setBackgroundColor({ color: bg })
      }

      if (styleVal === 'light') {
        await StatusBar.setStyle({ style: Style.Light })
      } else if (styleVal === 'dark') {
        await StatusBar.setStyle({ style: Style.Dark })
      } else if (styleVal === 'default') {
        await StatusBar.setStyle({ style: Style.Default })
      }
    } catch (err) {
      // Silently ignore on web platform
    }
  }

  onMounted(apply)
  watchEffect(apply)
}
