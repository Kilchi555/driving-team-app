// server/api/admin/device-security.post.ts
// Device security with MAC address tracking

import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { action, userId, macAddress, userAgent, ipAddress } = body
    
    // Use service role key for admin operations
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceKey) {
      return {
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured'
      }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    if (action === 'register_device') {
      // Register new device for user
      const { data, error } = await supabase
        .from('user_devices')
        .insert({
          user_id: userId,
          mac_address: macAddress,
          user_agent: userAgent,
          ip_address: ipAddress,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          is_trusted: false,
          device_name: `Device ${new Date().toLocaleDateString()}`
        })
        .select()
        .single()
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return {
        success: true,
        message: 'Device registered',
        device: data,
        requiresVerification: true
      }
    }
    
    if (action === 'check_device') {
      // Check if device is known and trusted
      const { data: devices, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('mac_address', macAddress)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        return { success: false, error: error.message }
      }
      
      if (!devices) {
        // Unknown device - requires registration
        return {
          success: true,
          isKnownDevice: false,
          requiresRegistration: true,
          message: 'Unknown device detected'
        }
      }
      
      // Update last seen
      await supabase
        .from('user_devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', devices.id)
      
      return {
        success: true,
        isKnownDevice: true,
        isTrusted: devices.is_trusted,
        device: devices,
        message: devices.is_trusted ? 'Trusted device' : 'Device requires verification'
      }
    }
    
    if (action === 'trust_device') {
      // Mark device as trusted
      const { data, error } = await supabase
        .from('user_devices')
        .update({ 
          is_trusted: true,
          trusted_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('mac_address', macAddress)
        .select()
        .single()
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return {
        success: true,
        message: 'Device marked as trusted',
        device: data
      }
    }
    
    return {
      success: false,
      error: 'Invalid action. Use: register_device, check_device, or trust_device'
    }
    
  } catch (error: any) {
    console.error('Error in device security:', error)
    return {
      success: false,
      error: error.message
    }
  }
})


