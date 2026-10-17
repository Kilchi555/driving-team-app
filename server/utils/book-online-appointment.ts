import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  hashBookingRequest,
  mapBookingRpcError,
  requireIdempotencyKey,
  type BookingErrorContext,
} from '~/server/utils/booking-errors'

export interface BookOnlineAppointmentInput {
  tenantId: string
  idempotencyKey: unknown
  sessionId: string
  userId: string
  slotId: string
  staffId: string
  startTime: string
  endTime: string
  appointment: Record<string, unknown>
  payment: Record<string, unknown>
  createVehicleBooking?: boolean
  roomId?: string | null
}

export interface BookOnlineAppointmentResult {
  replayed: boolean
  appointment: any
  payment: any
}

export async function bookOnlineAppointment(
  input: BookOnlineAppointmentInput,
  supabase = getSupabaseAdmin()
): Promise<BookOnlineAppointmentResult> {
  const idempotencyKey = requireIdempotencyKey(input.idempotencyKey)
  const requestHash = hashBookingRequest({
    tenant_id: input.tenantId,
    slot_id: input.slotId,
    session_id: input.sessionId,
    user_id: input.userId,
    staff_id: input.staffId,
    start_time: input.startTime,
    end_time: input.endTime,
    event_type_code: input.appointment.event_type_code ?? null,
    type: input.appointment.type ?? null,
    status: input.appointment.status ?? null,
    lesson_price_rappen: input.payment.lesson_price_rappen ?? 0,
    admin_fee_rappen: input.payment.admin_fee_rappen ?? 0,
    discount_amount_rappen: input.payment.discount_amount_rappen ?? 0,
    total_amount_rappen: input.payment.total_amount_rappen ?? 0,
    payment_method: input.payment.payment_method ?? null,
    vehicle_mode: input.appointment.vehicle_mode ?? null,
  })

  const context: BookingErrorContext = {
    tenantId: input.tenantId,
    staffId: input.staffId,
    slotId: input.slotId,
  }

  const { data, error } = await supabase.rpc('book_online_appointment', {
    p_tenant_id: input.tenantId,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_session_id: input.sessionId,
    p_user_id: input.userId,
    p_slot_id: input.slotId,
    p_appointment: input.appointment,
    p_payment: input.payment,
    p_create_vehicle_booking: input.createVehicleBooking === true,
    p_room_id: input.roomId ?? null,
  })

  if (error || !data) {
    throw mapBookingRpcError(error || { message: 'empty_rpc_result' }, context)
  }

  const payload = data as BookOnlineAppointmentResult
  if (!payload.appointment) {
    throw mapBookingRpcError({ message: 'BOOKING_CONFLICT', hint: 'BOOKING_CONFLICT' }, context)
  }

  return {
    replayed: payload.replayed === true,
    appointment: payload.appointment,
    payment: payload.payment ?? null,
  }
}
