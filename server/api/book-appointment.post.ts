export default defineEventHandler(async (event) => {
    const body = await readBody(event)
  
    // Hier kannst du den Termin speichern
    console.log('📅 Neuer Termin empfangen:', body)
  
    // Beispielantwort
    return { success: true, message: 'Termin gespeichert', data: body }
  })
  