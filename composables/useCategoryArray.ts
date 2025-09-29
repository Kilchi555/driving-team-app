// composables/useCategoryArray.ts
// Helper functions for working with category arrays after DB migration

import { getSupabase } from '~/utils/supabase'

export const useCategoryArray = () => {
  const supabase = getSupabase()

  /**
   * Check if user has a specific category
   */
  const hasCategory = (user: any, categoryCode: string): boolean => {
    if (!user.category || !Array.isArray(user.category)) return false
    return user.category.includes(categoryCode)
  }

  /**
   * Get all users with a specific category
   */
  const getUsersByCategory = async (categoryCode: string, tenantId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)
      .contains('category', [categoryCode])
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching users by category:', error)
      return []
    }

    return data || []
  }

  /**
   * Get users with any of the specified categories
   */
  const getUsersByAnyCategory = async (categoryCodes: string[], tenantId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)
      .overlaps('category', categoryCodes)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching users by categories:', error)
      return []
    }

    return data || []
  }

  /**
   * Get category statistics for tenant
   */
  const getCategoryStats = async (tenantId: string) => {
    // This requires a custom RPC function in the database
    const { data, error } = await supabase
      .rpc('get_category_stats', { tenant_id: tenantId })

    if (error) {
      console.error('Error fetching category stats:', error)
      return {}
    }

    return data || {}
  }

  /**
   * Format categories for display
   */
  const formatCategories = (categories: string[] | null): string => {
    if (!categories || !Array.isArray(categories)) return 'Keine Kategorien'
    return categories.join(', ')
  }

  /**
   * Get available staff for specific category and time
   */
  const getAvailableStaffForCategory = async (
    categoryCode: string, 
    tenantId: string,
    dateTime?: string
  ) => {
    let query = supabase
      .from('users')
      .select('*')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)
      .contains('category', [categoryCode])
      .eq('is_active', true)

    // Add time-based availability check if needed
    // This would require joining with availability/appointment tables

    const { data, error } = await query

    if (error) {
      console.error('Error fetching available staff:', error)
      return []
    }

    return data || []
  }

  return {
    hasCategory,
    getUsersByCategory,
    getUsersByAnyCategory,
    getCategoryStats,
    formatCategories,
    getAvailableStaffForCategory
  }
}
