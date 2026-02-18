// composables/useCategoryWithFallback.ts
// Handles loading categories and evaluation criteria with fallback to parent category

import { useSupabase } from '~/composables/useSupabase'
import { logger } from '~/utils/logger'

export interface CategoryWithParent {
  id: string
  name: string
  code: string
  description?: string
  lesson_duration_minutes?: string | number[]
  theory_durations?: string | number[]
  color?: string
  is_active?: boolean
  exam_duration_minutes?: number
  parent_category_id?: string | null
  created_at?: string
  [key: string]: any
}

export interface EvaluationCriteria {
  id: string
  category_id: string
  name: string
  description?: string
  display_order?: number
  is_active?: boolean
  driving_categories?: string[]
  [key: string]: any
}

export const useCategoryWithFallback = () => {
  const supabase = useSupabase()

  /**
   * Load evaluation criteria for a category
   * If not found, tries to load from parent category
   * @param categoryId - The category to load criteria for
   * @param parentCategoryId - Optional parent category ID for fallback
   * @returns Evaluation criteria or null if not found
   */
  const getEvaluationCriteriaForCategory = async (
    categoryId: string,
    parentCategoryId?: string | null
  ): Promise<EvaluationCriteria[]> => {
    try {
      // First try to get criteria for the category itself
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (criteriaError) throw criteriaError

      // If criteria found, return it
      if (criteriaData && criteriaData.length > 0) {
        logger.debug('✅ Evaluation criteria found for category:', categoryId)
        return criteriaData
      }

      // If no criteria and parent exists, try parent category
      if (parentCategoryId) {
        logger.debug('⚠️ No criteria for category, trying parent:', parentCategoryId)
        const { data: parentCriteriaData, error: parentError } = await supabase
          .from('evaluation_criteria')
          .select('*')
          .eq('category_id', parentCategoryId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (parentError) throw parentError

        if (parentCriteriaData && parentCriteriaData.length > 0) {
          logger.debug('✅ Evaluation criteria found for parent category:', parentCategoryId)
          return parentCriteriaData
        }
      }

      // No criteria found anywhere
      logger.warn('⚠️ No evaluation criteria found for category or parent:', { categoryId, parentCategoryId })
      return []

    } catch (error: any) {
      logger.error('❌ Error loading evaluation criteria:', error)
      return []
    }
  }

  /**
   * Load categories with parent_category_id field
   * Filters by tenant and business_type
   * Can optionally filter to only show subcategories
   * @param tenantId - Tenant ID
   * @param onlySubcategories - If true, only load categories with parent_category_id (subcategories)
   * @returns Array of categories
   */
  const loadCategoriesWithParent = async (
    tenantId: string,
    onlySubcategories: boolean = false
  ): Promise<CategoryWithParent[]> => {
    try {
      let query = supabase
        .from('categories')
        .select(`
          id,
          name,
          code,
          description,
          lesson_duration_minutes,
          theory_durations,
          color,
          is_active,
          exam_duration_minutes,
          parent_category_id,
          created_at
        `)
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('code', { ascending: true })

      // Filter to only subcategories if requested
      if (onlySubcategories) {
        query = query.not('parent_category_id', 'is', null)
      }

      const { data, error } = await query

      if (error) throw error

      logger.debug('✅ Loaded categories:', {
        count: data?.length || 0,
        onlySubcategories
      })

      return (data || []) as CategoryWithParent[]

    } catch (error: any) {
      logger.error('❌ Error loading categories:', error)
      return []
    }
  }

  /**
   * Get category with fallback chain resolution
   * @param categoryId - Category to load
   * @returns Category with parent info, or null
   */
  const getCategoryWithParent = async (categoryId: string): Promise<CategoryWithParent | null> => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          code,
          description,
          lesson_duration_minutes,
          theory_durations,
          color,
          is_active,
          exam_duration_minutes,
          parent_category_id,
          created_at
        `)
        .eq('id', categoryId)
        .single()

      if (error) throw error

      return (data || null) as CategoryWithParent | null

    } catch (error: any) {
      logger.error('❌ Error loading category:', error)
      return null
    }
  }

  /**
   * Resolve effective category (returns parent if this is a subcategory)
   * Used to find the "main" category for a given category
   * @param category - Category to resolve
   * @returns The main category (if subcategory) or the category itself
   */
  const resolveMainCategory = async (category: CategoryWithParent): Promise<CategoryWithParent | null> => {
    if (!category.parent_category_id) {
      // This is already a main category
      return category
    }

    // Load parent category
    return getCategoryWithParent(category.parent_category_id)
  }

  return {
    getEvaluationCriteriaForCategory,
    loadCategoriesWithParent,
    getCategoryWithParent,
    resolveMainCategory
  }
}
