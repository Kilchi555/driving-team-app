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
    
    // Try to load user language from database first
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      // Load user profile with language
      const { data: userProfile } = await supabase
        .from('users')
        .select('language')
        .eq('auth_user_id', authUser.id)
        .eq('is_active', true)
        .single()
      
      if (userProfile?.language && $i18n.locale.value !== userProfile.language) {
        // Check if language is supported
        const supportedLocales = $i18n.locales.value.map((l: any) => l.code)
        if (supportedLocales.includes(userProfile.language)) {
          $i18n.setLocale(userProfile.language)
          logger.debug('i18n', `User language set to: ${userProfile.language}`)
          return
        }
      }
    }
    
    // If not logged in, detect device language
    const deviceLang = getDeviceLanguage()
    if ($i18n.locale.value !== deviceLang) {
      $i18n.setLocale(deviceLang)
      logger.debug('i18n', `Device language detected: ${deviceLang}`)
    }
  } catch (error) {
    // Fallback to device language if DB query fails
    const deviceLang = getDeviceLanguage()
    if ($i18n.locale.value !== deviceLang) {
      $i18n.setLocale(deviceLang)
      logger.debug('i18n', `Fallback to device language: ${deviceLang}`)
    }
  }
})

