// plugins/i18n.client.ts
// Automatically sets user language from database on app load

export default defineNuxtPlugin(async (nuxtApp) => {
  // Wait for i18n to be available
  await nuxtApp.hooks.callHook('app:mounted')
  
  const { $i18n } = nuxtApp
  if (!$i18n) {
    console.warn('i18n not available')
    return
  }
  
  const { getSupabase } = await import('~/utils/supabase')
  const supabase = getSupabase()
  
  // Try to load user language
  try {
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
          logger.debug(`🌍 User language set to: ${userProfile.language}`)
        }
      }
    }
  } catch (error) {
    console.warn('Could not load user language:', error)
    // Fallback to default (de)
  }
})

