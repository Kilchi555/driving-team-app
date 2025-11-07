import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { action, userId, deviceFingerprint, userAgent, ipAddress } = body

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (action) {
      case 'check': {
        // Check if device exists
        const { data: existingDevice, error: checkError } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', userId)
          .eq('mac_address', deviceFingerprint)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        return { 
          success: true, 
          deviceExists: !!existingDevice,
          device: existingDevice 
        }
      }
      
      case 'register': {
        // ✅ PRÜFUNG: Suche nach ähnlichen Geräten (gleicher User + ähnlicher Browser) um Duplikate zu vermeiden
        const deviceName = getDeviceName(userAgent)
        
        // Suche nach bestehenden Geräten mit gleichem User und ähnlichem Browser
        const { data: similarDevices } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', userId)
          .ilike('user_agent', `%${userAgent.split(' ')[0]}%`) // Grobe Browser-Erkennung
          .order('last_seen', { ascending: false })
          .limit(5)
        
        // Wenn ähnliche Geräte gefunden wurden, verwende das neueste (merge behavior)
        if (similarDevices && similarDevices.length > 0) {
          const mostRecent = similarDevices[0]
          console.log('🔄 Similar device found, updating instead of creating new:', mostRecent.id)
          
          // Aktualisiere das bestehende Gerät
          const { data: updatedDevice, error: updateError } = await supabase
            .from('user_devices')
            .update({ 
              mac_address: deviceFingerprint, // Update fingerprint (kann sich geändert haben)
              user_agent: userAgent,
              ip_address: ipAddress || '127.0.0.1',
              device_name: deviceName,
              last_seen: new Date().toISOString()
            })
            .eq('id', mostRecent.id)
            .select()
            .single()
          
          if (updateError) throw updateError
          return { success: true, device: updatedDevice, merged: true }
        }
        
        // Neues Gerät registrieren
        const { data: newDevice, error: registerError } = await supabase
          .from('user_devices')
          .insert({
            user_id: userId,
            mac_address: deviceFingerprint,
            user_agent: userAgent,
            ip_address: ipAddress || '127.0.0.1',
            device_name: deviceName,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            is_trusted: false
          })
          .select()
          .single()

        if (registerError) throw registerError
        return { success: true, device: newDevice, merged: false }
      }
      
      case 'update': {
        // Update last seen
        const { data: updatedDevice, error: updateError } = await supabase
          .from('user_devices')
          .update({ last_seen: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('mac_address', deviceFingerprint)
          .select()
          .single()

        if (updateError) throw updateError
        return { success: true, device: updatedDevice }
      }
      
      default:
        throw new Error('Invalid action')
    }
  } catch (error: any) {
    console.error('Error in device security handler:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

function getDeviceName(userAgent: string): string {
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'Mobile Device'
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    return 'Tablet'
  } else if (userAgent.includes('Chrome')) {
    return 'Chrome Browser'
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox Browser'
  } else if (userAgent.includes('Safari')) {
    return 'Safari Browser'
  } else if (userAgent.includes('Edge')) {
    return 'Edge Browser'
  } else {
    return 'Unknown Browser'
  }
}




