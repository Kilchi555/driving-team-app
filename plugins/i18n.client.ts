// plugins/i18n.client.ts
// Automatically sets user language from database on app load
// Falls back to device language, then to English

import { logger } from '~/utils/logger'

/**
 * Get device language and find closest supported language
 */
function getDeviceLanguage(): string {
  if (typeof navigator === 'undefined') return 'de'
  
  const lang = navigator.language || navigator.languages?.[0] || 'de'
  const langCode = lang.split('-')[0].toLowerCase()
  
  // Supported languages
  const supported = ['de', 'en', 'fr', 'it']
  
  if (supported.includes(langCode)) {
    return langCode
  }
  
  // Fallback: English for any other language
  return 'en'
}

export default defineNuxtPlugin(async (nuxtApp) => {
  // Wait for i18n to be available
  await nuxtApp.hooks.callHook('app:mounted')
  
  const { $i18n } = nuxtApp
  if (!$i18n) {
    logger.warn('i18n', 'i18n not available, skipping language setup')
    return
  }
  
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    // Try to load user language via secure API
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      // ✅ Use secure API instead of direct DB query
      try {
        const response = await $fetch<{ success: boolean; user?: any }>('/api/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (response?.success && response?.user?.language) {
          const userLanguage = response.user.language
          // Check if language is supported
          const supportedLocales = $i18n.locales.value.map((l: any) => l.code)
          if (supportedLocales.includes(userLanguage) && $i18n.locale.value !== userLanguage) {
            $i18n.setLocale(userLanguage)
            logger.debug('i18n', `User language set to: ${userLanguage}`)
            return
          }
        }
      } catch (apiError) {
        logger.debug('i18n', 'API call failed, falling back to device language')
      }
    }
    
    // If not logged in or no language set, detect device language
    const deviceLang = getDeviceLanguage()
    if ($i18n.locale.value !== deviceLang) {
      $i18n.setLocale(deviceLang)
      logger.debug('i18n', `Device language detected: ${deviceLang}`)
    }
  } catch (error) {
    // Fallback to device language if anything fails
    const deviceLang = getDeviceLanguage()
    if ($i18n.locale.value !== deviceLang) {
      $i18n.setLocale(deviceLang)
      logger.debug('i18n', `Fallback to device language: ${deviceLang}`)
    }
  }
})

