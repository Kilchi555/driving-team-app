export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'de',
  fallbackLocale: 'en', // 🌐 Fallback to English if device language not supported
  globalInjection: true,
  missingWarn: false,
  fallbackWarn: false
}))

