// utils/useFeatureFlags.ts
export const FEATURE_FLAGS = {
  // Debug & Development
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  WALLEE_DEBUG: process.env.NODE_ENV === 'development',
  
  // Experimentelle Features
  AUTO_REFRESH_PENDING: false, 
  ENHANCED_LOGGING: false,
  
  // Für später wenn mehr Features da sind
  NEW_EVALUATION_UI: false,
  ADVANCED_CALENDAR: false
} as const

// Helper function
export const useFeatureFlags = () => {
  const isEnabled = (flag: keyof typeof FEATURE_FLAGS) => {
    return FEATURE_FLAGS[flag]
  }
  
  const getAllFlags = () => {
    return FEATURE_FLAGS
  }
  
  return { 
    isEnabled, 
    FEATURE_FLAGS: getAllFlags() 
  }
}