// composables/useDocumentRequirements.ts
// Lädt Dokumentenanforderungen aus der categories Tabelle

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface DocumentRequirement {
  id: string
  title: string
  description: string
  icon: string
  field_prefix: string
  storage_prefix: string
  requires_both_sides: boolean
  when_required: 'always' | 'after_exam' | 'conditional'
  isRequired?: boolean
  reason?: string
}

interface CategoryDocumentRequirements {
  required: DocumentRequirement[]
  optional: DocumentRequirement[]
}

export const useDocumentRequirements = () => {
  const supabase = getSupabase()
  const loading = ref(false)

  /**
   * Lädt die Dokumentenanforderungen für die gegebenen Kategorien eines Schülers
   */
  const getDocumentRequirements = async (studentCategories: string[], studentData: any = null): Promise<DocumentRequirement[]> => {
    if (!studentCategories || studentCategories.length === 0) {
      return []
    }

    loading.value = true

    try {
      logger.debug('🔍 Loading document requirements for categories:', studentCategories)

      // Lade Kategorien mit ihren Dokumentenanforderungen
      const { data: categories, error } = await supabase
        .from('categories')
        .select('code, name, document_requirements')
        .in('code', studentCategories)
        .eq('is_active', true)

      if (error) {
        console.error('❌ Error loading categories:', error)
        throw error
      }

      logger.debug('✅ Categories loaded:', categories)

      const allRequirements: DocumentRequirement[] = []
      const addedDocuments = new Set<string>()

      // Verarbeite jede Kategorie
      categories?.forEach(category => {
        const requirements = category.document_requirements as CategoryDocumentRequirements
        if (!requirements) return

        logger.debug(`📋 Processing requirements for ${category.code}:`, requirements)

        // Füge erforderliche Dokumente hinzu
        requirements.required?.forEach(req => {
          const uniqueId = `${req.id}_${category.code}`
          if (!addedDocuments.has(uniqueId)) {
            allRequirements.push({
              ...req,
              isRequired: true,
              reason: `Erforderlich für Kategorie ${category.code}`
            })
            addedDocuments.add(uniqueId)
          }
        })

        // Prüfe optionale Dokumente basierend auf Bedingungen
        requirements.optional?.forEach(req => {
          const uniqueId = `${req.id}_${category.code}`
          if (addedDocuments.has(uniqueId)) return // Bereits als erforderlich hinzugefügt

          let shouldShow = false
          let reason = ''

          switch (req.when_required) {
            case 'always':
              shouldShow = true
              reason = `Optional für Kategorie ${category.code}`
              break
              
            case 'after_exam':
              // Zeige nur wenn Schüler bereits Fortschritt gemacht hat
              // Check if student has any documents via user_documents table
              // This would require loading user documents, for now assume false
              const hasAnyDocument = false
              shouldShow = !!hasAnyDocument
              reason = 'Optional nach bestandener Prüfung'
              break
              
            case 'conditional':
              // Hier können weitere Bedingungen implementiert werden
              shouldShow = false
              break
          }

          if (shouldShow && !addedDocuments.has(req.id)) {
            allRequirements.push({
              ...req,
              isRequired: false,
              reason
            })
            addedDocuments.add(req.id)
          }
        })
      })

      logger.debug('📄 Final document requirements:', allRequirements)
      return allRequirements

    } catch (error) {
      console.error('❌ Error getting document requirements:', error)
      return getFallbackRequirements(studentCategories)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fallback-Dokumentenanforderungen wenn DB nicht verfügbar
   */
  const getFallbackRequirements = (categories: string[]): DocumentRequirement[] => {
    const requirements: DocumentRequirement[] = []

    categories.forEach(code => {
      switch (code) {
        case 'B':
          requirements.push({
            id: 'lernfahrausweis_b',
            title: 'Lernfahrausweis Kategorie B',
            description: 'Lernfahrausweis für Personenwagen',
            icon: '📄',
            field_prefix: 'lernfahrausweis',
            storage_prefix: 'lernfahrausweise',
            requires_both_sides: true,
            when_required: 'always',
            isRequired: true,
            reason: `Erforderlich für Kategorie ${code}`
          })
          break

        case 'A':
        case 'A1':
        case 'A35kW':
          requirements.push({
            id: 'lernfahrausweis_a',
            title: 'Lernfahrausweis Kategorie A',
            description: 'Lernfahrausweis für Motorräder',
            icon: '📄',
            field_prefix: 'lernfahrausweis_a',
            storage_prefix: 'lernfahrausweise',
            requires_both_sides: true,
            when_required: 'always',
            isRequired: true,
            reason: `Erforderlich für Kategorie ${code}`
          })
          break

        case 'BE':
          requirements.push(
            {
              id: 'lernfahrausweis_be',
              title: 'Lernfahrausweis Kategorie BE',
              description: 'Lernfahrausweis für Anhänger',
              icon: '📄',
              field_prefix: 'lernfahrausweis_be',
              storage_prefix: 'lernfahrausweise',
              requires_both_sides: true,
              when_required: 'always',
              isRequired: true,
              reason: `Erforderlich für Kategorie ${code}`
            },
            {
              id: 'fuehrerschein_b',
              title: 'Führerschein Kategorie B',
              description: 'Bestehender B-Führerschein (Voraussetzung für BE)',
              icon: '🪪',
              field_prefix: 'fuehrerschein',
              storage_prefix: 'fuehrerschein',
              requires_both_sides: true,
              when_required: 'always',
              isRequired: true,
              reason: `Erforderlich für Kategorie ${code}`
            }
          )
          break
      }
    })

    return requirements
  }

  return {
    loading: computed(() => loading.value),
    getDocumentRequirements,
    getFallbackRequirements
  }
}

