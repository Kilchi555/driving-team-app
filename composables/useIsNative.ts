export const useIsNative = () => {
  if (import.meta.server) return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}
