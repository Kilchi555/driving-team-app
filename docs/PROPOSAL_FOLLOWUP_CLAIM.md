# Booking proposal follow-up claim / clear

**When to use:** Debugging double follow-up emails, understanding why an accepted proposal still gets reminders, or why «Ohne Angabe erledigen» stopped a planned follow-up.

Verified against current `main` (Oct 2026). Landed: `edb9e385` (*claim proposal follow-ups before send and clear them on close*).

**Not this:** Open-request digest cron (`send-booking-proposal-reminders`), website prospect claim (#303), or booking conversion / Ads (`proposal-booking-conversion.ts`). CRM `outcome_type` is a staff label only.

---

## Intent

Queue status (`booking_proposals.status`) and follow-up (`outcome_type` + `follow_up_at` + `follow_up_sent_at`) are **independent**.

Three fixes in one change:

1. **Double-send race** — claim the row with a conditional `UPDATE` **before** `sendTenantEmail`
2. **Stale follow-up after close** — `accepted` without a follow-up outcome clears both follow-up columns
3. **Status must not gate sends** — `accepted` + planned reminder is valid and must still send

---

## Contract (current `main`)

### Outcomes + delays

| Outcome | Follow-up |
|---------|-----------|
| `potential_customer` | One-shot after **30 days** (`POTENTIAL_CUSTOMER_FOLLOW_UP_MS`) |
| `no_show` | Daily while outcome stays `no_show` (**24h** `NO_SHOW_FOLLOW_UP_MS`) |
| `booking_confirmed` / `consultation_only` / `not_interested` | Clear both columns |
| `accepted` and **no** outcome | Clear both columns (destructive to prior plan) |
| Other statuses without outcome | Leave existing follow-up untouched (`{}`) |

Helpers: `followUpColumnsForStatusUpdate`, `buildBookingProposalUpdate` in `server/utils/proposal-followup.ts`.

### Claim-before-send

There is **no** separate lock table or claim TTL. The claim **is** writing `follow_up_sent_at = claimAt` when:

- `outcome_type ∈ {potential_customer, no_show}`
- `follow_up_sent_at IS NULL`
- `follow_up_at IS NOT NULL` and `follow_up_at <= claimAt`
- Matching `id` + `tenant_id`

`deliverClaimedFollowUp`:

| Step | Result |
|------|--------|
| Claim loses (0 rows) | `'skipped'` — no send |
| Send throws | `releaseClaim` (clear if still same `claimAt`); rethrow |
| `potential_customer` success | `'sent'` — leave `follow_up_sent_at` set |
| `no_show` success | `scheduleNoShow` → next day + clear claim; `'sent'` or `'sent_pending_reschedule'` |

**Orphan repair (cron start):** `repairNoShowOrphans` advances stuck `no_show` claims that are due again **without sending** (`isStuckNoShowClaim`) — avoids a second mail if the first send may have succeeded.

Stuck `potential_customer` claims are **not** auto-repaired (treated as already sent).

### Crons

| Route | Schedule (`vercel.json`) | Role |
|-------|--------------------------|------|
| `GET /api/cron/send-proposal-followup-reminders` | `0 7 * * *` (07:00 UTC) | Outcome follow-ups; **claim-before-send**; no status filter |
| `GET /api/cron/send-booking-proposal-reminders` | `30 7 * * *` (07:30 UTC) | Open-request digest for `status=pending` only; **not** a claim |

Both use `assertCronRequest` (`Authorization: Bearer ${CRON_SECRET}`; `x-vercel-cron` is not auth).

Recipient: staff email if `staff_id`, else `tenant.contact_email`. CTA deep-link: `/dashboard?openProposal=<id>`.

### Admin surfaces

| Surface | Behavior |
|---------|----------|
| `POST /api/admin/update-booking-proposal-status` | `buildBookingProposalUpdate`; roles `staff\|admin\|tenant_admin\|super_admin`; staff scoped to own `staff_id` |
| `GET /api/admin/get-booking-proposals` | Lists pending; optional `?highlight=<uuid>` merges via `mergeHighlightedProposal` even if already accepted |
| `PendenzenModal.vue` | Always posts `status: 'accepted'`; outcome optional — «Ohne Angabe erledigen» clears follow-up |

---

## Pitfalls

1. **Leaving the open list ≠ stopping `no_show` reminders** — `accepted` + `no_show` keeps the daily schedule.
2. **«Ohne Angabe erledigen» clears** any previously planned `follow_up_*`.
3. **Do not filter follow-up due rows by `status=pending`** — claim / due logic ignores status.
4. **No claim TTL for `potential_customer`** — if the process dies after claim and before release/send success path, the row looks sent; only `no_show` orphans are repaired.
5. **`sent_pending_reschedule`** — mail went out; next-day schedule write failed; repair may advance later without re-sending that day.
6. **Digest ≠ follow-up** — open-request cron only rechecks pending IDs; it does not claim via `follow_up_sent_at`.

---

## Verify

```bash
npx vitest run server/utils/__tests__/proposal-followup.test.ts

# Claim path still gates on follow_up_sent_at null
rg -n "follow_up_sent_at|deliverClaimedFollowUp|followUpColumnsForStatusUpdate" \
  server/utils/proposal-followup.ts \
  server/api/cron/send-proposal-followup-reminders.get.ts
```

---

## Codepaths / surfaces

| Concern | Path / symbol |
|---------|---------------|
| Contract | `server/utils/proposal-followup.ts` |
| Follow-up cron | `server/api/cron/send-proposal-followup-reminders.get.ts` |
| Digest cron | `server/api/cron/send-booking-proposal-reminders.get.ts` |
| Status write | `server/api/admin/update-booking-proposal-status.post.ts` |
| List + highlight | `server/api/admin/get-booking-proposals.get.ts` |
| UI | `components/PendenzenModal.vue` — `markProposalAsCompleted` |
| Auth | `server/utils/cron-auth.ts` — `assertCronRequest` |
| Tests | `server/utils/__tests__/proposal-followup.test.ts` |
