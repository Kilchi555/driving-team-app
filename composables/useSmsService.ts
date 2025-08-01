// composables/useSmsService.ts
import { getSupabase } from '~/utils/supabase'

export const useSmsService = () => {
  const supabase = getSupabase();

  const sendSms = async (phoneNumber: string, message: string) => {
    try {
      // Check if running locally
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      
      if (isLocal) {
        // Use local Edge Function directly
        console.log('🏠 Using local Edge Function')
        
        const response = await fetch('http://127.0.0.1:54321/functions/v1/send-twilio-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
          },
          body: JSON.stringify({
            to: phoneNumber,
            message: message
          })
        })

        const data = await response.json()
        
        if (!response.ok) {
          console.error('❌ Local function error:', data)
          return { success: false, error: data.error || 'Local function error' }
        }

        console.log('✅ Local SMS sent successfully:', data)
        return { success: true, data }
        
      } else {
        // Use remote Supabase Edge Function
        console.log('🌐 Using remote Edge Function')
        
        const { data, error } = await supabase.functions.invoke('send-twilio-sms', {
          body: {
            to: phoneNumber,
            message: message
          },
          method: 'POST'
        });

        if (error) {
          console.error('❌ Remote function error:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ Remote SMS sent successfully:', data);
        return { success: true, data };
      }

    } catch (err: any) {
      console.error('❌ Unexpected SMS error:', err);
      return { success: false, error: err.message || 'Unerwarteter Fehler' };
    }
  };

  return {
    sendSms
  };
};