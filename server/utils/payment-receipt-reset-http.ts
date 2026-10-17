import type { ReceiptResetEvaluation, ReceiptResetSnapshot } from '~/server/utils/payment-receipt-reset'

export function receiptResetStatus(evaluation: ReceiptResetEvaluation): number {
  if (evaluation.reasons.includes('unauthenticated')) return 401
  if (evaluation.reasons.includes('forbidden')) return 403
  if (evaluation.reasons.includes('tenant_mismatch') || evaluation.reasons.includes('payment_not_found')) return 404
  if (evaluation.blocked) return 409
  return 200
}

export function receiptResetBody(evaluation: ReceiptResetEvaluation) {
  return {
    success: !evaluation.blocked,
    blocked: evaluation.blocked,
    already_applied: evaluation.alreadyApplied,
    reasons: evaluation.reasons,
    proposed_target_status: evaluation.proposedTargetStatus,
    requires: {
      reason: evaluation.requires.reason,
      sibling_confirmation: evaluation.requires.siblingConfirmation,
      invoice_line_disposition: evaluation.requires.invoiceLineDisposition,
      appointment_disposition: evaluation.requires.appointmentDisposition,
    },
    discovered: evaluation.discovered,
    plan: evaluation.plan,
  }
}

export function receiptResetRpcArgs(snapshot: ReceiptResetSnapshot, evaluation: ReceiptResetEvaluation) {
  if (evaluation.blocked || !evaluation.plan || !snapshot.actorUserId || !snapshot.callerTenantId) return null
  return {
    p_tenant_id: snapshot.callerTenantId,
    p_actor_user_id: snapshot.actorUserId,
    p_payment_id: evaluation.plan.paymentId,
    p_reason: (snapshot.decisions.reason?.trim().length ?? 0) >= 10
      ? snapshot.decisions.reason!.trim()
      : 'Bereits korrigiert',
    p_idempotency_key: evaluation.plan.idempotencyKey,
    p_confirm_siblings: snapshot.decisions.confirmSiblingsRemainSettled,
    p_settlement_id: evaluation.plan.settlementId,
    p_expected_paid_after: evaluation.plan.nextPaidAmountRappen,
    p_appointment_status: evaluation.plan.nextAppointmentStatus,
    p_as_of: snapshot.asOfDate,
    p_invoice_line_disposition: snapshot.decisions.invoiceLineDisposition,
    p_appointment_disposition: snapshot.decisions.appointmentDisposition,
  }
}
