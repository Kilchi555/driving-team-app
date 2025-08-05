// composables/useAutoAssignStaff.ts
import { getSupabase } from '~/utils/supabase'

export const useAutoAssignStaff = () => {
  const supabase = getSupabase()

  /**
   * Auto-Assignment beim ersten Termin
   * Wird nach erfolgreichem Speichern eines Termins aufgerufen
   */
  const checkFirstAppointmentAssignment = async (appointmentData: {
    user_id: string
    staff_id: string
  }) => {
    try {
      console.log('🔍 Checking first appointment assignment for student:', appointmentData.user_id)

      // 1. Prüfen ob Schüler bereits einen assigned_staff hat
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('id, assigned_staff_ids, first_name, last_name')
        .eq('id', appointmentData.user_id)
        .eq('role', 'client')
        .single()

      if (studentError || !student) {
        console.log('Student nicht gefunden für Auto-Assignment')
        return { assigned: false, reason: 'Student nicht gefunden' }
      }

      // 2. Prüfen ob Staff bereits in der Liste ist
      const currentStaffIds = student.assigned_staff_ids || []
      const isStaffAlreadyAssigned = currentStaffIds.includes(appointmentData.staff_id)
      
      if (isStaffAlreadyAssigned) {
        console.log(`Staff bereits zugewiesen für ${student.first_name} ${student.last_name}`)
        return { assigned: false, reason: 'Staff bereits in Liste' }
      }

      // 3. Anzahl bisheriger Termine mit diesem Staff prüfen
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', appointmentData.user_id)
        .eq('staff_id', appointmentData.staff_id)

      if (countError) {
        console.error('Fehler beim Zählen der Termine:', countError)
        return { assigned: false, reason: 'Fehler beim Zählen' }
      }

      console.log(`Termine zwischen Student und Staff: ${count}`)

      // 4. Auto-Assignment Logik: 
      // - Erster Termin überhaupt ODER
      // - Erster Termin mit diesem spezifischen Staff
      const { count: staffSpecificCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', appointmentData.user_id)
        .eq('staff_id', appointmentData.staff_id)

      // Assignment erfolgt bei erstem Termin mit diesem Staff
      if ((staffSpecificCount || 0) === 1) {
        // Staff zum Array hinzufügen (nicht ersetzen!)
        const updatedStaffIds = [...currentStaffIds, appointmentData.staff_id]
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ assigned_staff_ids: updatedStaffIds })
          .eq('id', appointmentData.user_id)

        if (updateError) {
          console.error('Fehler beim Auto-Assignment:', updateError)
          return { assigned: false, reason: 'Update-Fehler', error: updateError.message }
        }

        console.log(`✅ Auto-Assignment: ${student.first_name} ${student.last_name} - Staff hinzugefügt (${staffSpecificCount} Termine mit diesem Staff)`)
        
        return {
          assigned: true,
          studentName: `${student.first_name} ${student.last_name}`,
          appointmentCount: staffSpecificCount,
          reason: 'Erster Termin mit diesem Staff',
          totalStaff: updatedStaffIds.length
        }
      }

      return { assigned: false, reason: `Nicht der erste Termin mit diesem Staff (${staffSpecificCount} Termine)` }

    } catch (error: any) {
      console.error('Fehler beim Auto-Assignment Check:', error)
      return { assigned: false, reason: 'Exception', error: error.message }
    }
  }

  /**
   * Einmalige Bereinigung für bestehende Schüler
   * Kann als Admin-Funktion aufgerufen werden
   */
  const assignExistingStudents = async (staffId: string) => {
    try {
      console.log('🔄 Suche nach nicht zugewiesenen Schülern für Staff:', staffId)

      // 1. Alle nicht zugewiesenen Schüler finden
      const { data: unassignedStudents, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, assigned_staff_ids')
        .eq('role', 'client')
        .or('assigned_staff_ids.is.null,assigned_staff_ids.eq.{}')

      if (studentsError || !unassignedStudents) {
        console.log('Keine nicht zugewiesenen Schüler gefunden')
        return []
      }

      console.log(`📊 ${unassignedStudents.length} nicht zugewiesene Schüler gefunden`)

      const assignments = []

      // 2. Für jeden Schüler prüfen ob Termine mit Staff vorhanden
      for (const student of unassignedStudents) {
        const { count, error: countError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', student.id)
          .eq('staff_id', staffId)

        if (countError) continue

        // Ab 1 Termin zuweisen
        if ((count || 0) >= 1) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ assigned_staff_ids: [staffId] })
            .eq('id', student.id)

          if (!updateError) {
            assignments.push({
              studentId: student.id,
              studentName: `${student.first_name} ${student.last_name}`,
              appointmentCount: count
            })
          }
        }
      }

      console.log(`✅ ${assignments.length} Schüler automatisch zugewiesen`)
      return assignments

    } catch (error: any) {
      console.error('Fehler beim Bulk-Assignment:', error)
      return []
    }
  }

  return {
    checkFirstAppointmentAssignment,
    assignExistingStudents
  }
}