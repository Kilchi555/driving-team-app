# Customer account activation (consulting / no-login tenants)

**When to use:** Public booking empty for a consulting tenant (Sara Lussi–style); login/register still offered when accounts are off; appointment emails point at a dead Kundenkonto; inquiry contact preference missing in staff notes; staff names vanish after users RLS lockdown.

Verified against source (Aug 2026). Distinct from `website_only` product tenants (draft `WEBSITE_ONLY_TENANTS` / open doc PR #49).

---

## Intent

Let tenants turn off public customer login/activation (Gemperli / consulting style) while **guest booking and inquiries still work**. Emails must not advertise App Store / account CTAs. Event-type (non–driving-school) booking must still resolve locations/staff via service role after the users RLS lock-down.

---

## Activation gate

Derived flag (not a single DB column). Stored pieces live on `tenants.booking_policy` JSON:

| Policy key | Default | Role |
|------------|---------|------|
| `registration_account_mode` | `'required'` | `'hidden'` hides public register / account step |
| `onboarding_sms_enabled` | `true` (treat unset as on) | Staff onboarding SMS channel |
| `onboarding_email_enabled` | `false` (must be explicitly `true`) | Onboarding email channel |

Helper: `allowsCustomerAccountActivation(policy)` in `server/utils/customer-account-activation.ts`

```
allowed = (registration_account_mode !== 'hidden')
       || (onboarding_sms_enabled !== false)
       || (onboarding_email_enabled === true)
```

Blocked only when **all three** are off: `registration_account_mode: 'hidden'`, SMS off, email off.

Exposed to the public booking init payload as:

- `allow_customer_account_activation` — from `GET /api/booking/get-booking-init` (via `allowsCustomerAccountActivation(rawPolicy)`)

Admin UI toggles: `pages/admin/profile.vue` (booking policy section) and related fields on `pages/admin/booking-policy.vue` / users admin.

---

## Surfaces

| Surface | Behavior when activation is off |
|---------|----------------------------------|
| `pages/login.vue`, `pages/[slug].vue`, `pages/register/[tenant].vue` | Hide / block public register; respect `allow_customer_account_activation` |
| `components/booking/LoginRegisterModal.vue` | `:allow-register="bookingPolicy.registration_account_mode !== 'hidden'"` |
| `POST /api/auth/register-client` | Rejects public register when mode is `hidden` |
| Onboarding: `request-onboarding-link`, `verify-onboarding-token`, `complete-onboarding`, `resend-onboarding-by-phone`, password-reset for pending clients | Hard-stop when `allowsCustomerAccountActivation` is false |
| Cron `send-onboarding-reminders` | Skips tenants that disallow activation |
| Appointment / course emails | `omitAccountCta` + `includeAppStore: false` via `resolveAppointmentEmailCta` / `emailAppointmentAppStoreBlock` |
| `server/utils/appointment-notification-cta.ts` | With `omitAccountCta`, CTA becomes public booking URL `https://app.simy.ch/booking/availability/{slug}` instead of Kundenkonto |

### Preferred contact (inquiries)

Whitelist: `phone` \| `sms` \| `whatsapp` \| `email` (`utils/preferred-contact-method.ts`).

- Form: `components/GeneralInquiryForm.vue` → body field `preferred_contact_method`
- API: `POST /api/booking/submit-general-inquiry` — validates option; requires matching phone/email; persists via `upsertPreferredContactNote` as note line `Bevorzugter Kontakt: …`
- Staff UIs parse with `parsePreferredContactFromNotes` (`PendenzenModal`, booking-proposals)

---

## Consulting / event-type public booking

Non–`driving_school` tenants book by **public_bookable event types**, not license categories.

| Piece | Detail |
|-------|--------|
| `POST /api/booking/get-locations-and-staff` | Public; uses **service role** (`getSupabaseAdmin`) because anon can no longer `SELECT users` |
| `bookableUserRoles(isEventTypeBooking)` | Event-type: `staff` \| `admin` \| `tenant_admin`; Fahrschule: `staff` only |
| `resolveLocationStaffAssignments` | If event-type and **zero** `staff_locations` rows with `is_online_bookable`, assign every bookable person to every standard location (solo-admin consulting) |
| Wizard | `skipServiceTypeStep` when not driving school; offer cards via `categoryDisplayName` / `usesOfferCardLayout` |
| `#77` | Do **not** auto-chain single offer → duration → location → instructor (Sara Lussi one-click skip was removed) |

Gate for online pairs remains `staff_locations.is_online_bookable` when rows exist (same as booking readiness).

---

## Pitfalls

1. **Confusing “accounts off” with `website_only`** — Activation is `booking_policy` triad above. `tenants.website_only` is a separate product flag (simy.ch website SKU).
2. **SMS default is on** — `onboarding_sms_enabled !== false` means omitting the key keeps activation allowed even if register is `hidden`.
3. **Dead login CTAs** — Confirmation/reminder paths must pass `omitAccountCta` / skip App Store blocks when activation is false; otherwise customers get `/login` with nowhere to go.
4. **Empty consulting locations after RLS** — Staff names for the public page **must** be loaded with service role (`get-locations-and-staff`). Anon client queries will return zero staff.
5. **Event-type category filter** — Do not filter `staff_locations.available_categories` by the event type code (those arrays hold topic codes). `isEventTypeBooking = !categoryRow && !!eventTypeRow`.
6. **Auto-skip UX** — Solo consulting tenants still need each wizard step; auto-select was intentionally removed in `#77`.
7. **Inquiry contact** — Invalid `preferred_contact_method` → 400 `Ungültiger Kontaktkanal`; phone/email required per option.

---

## Smoke test

1. Set `registration_account_mode: 'hidden'`, `onboarding_sms_enabled: false`, `onboarding_email_enabled: false` → `allow_customer_account_activation` false on get-booking-init; register/onboarding APIs 4xx.
2. Guest-book an appointment → confirmation email CTA is “Weiteren Termin buchen” → `/booking/availability/{slug}`, no App Store block.
3. Consulting tenant with one admin, locations, public_bookable event type, possibly empty `staff_locations` → locations + staff appear on booking page.
4. Submit inquiry with `preferred_contact_method: 'whatsapp'` + phone → notes contain `Bevorzugter Kontakt: WhatsApp`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/customer-account-activation.ts` | `allowsCustomerAccountActivation` |
| `server/utils/appointment-notification-cta.ts` | Account vs public booking CTAs |
| `server/api/booking/get-booking-init.get.ts` | Exposes `allow_customer_account_activation` |
| `server/api/booking/get-locations-and-staff.post.ts` | Public staff/locations (service role) |
| `server/utils/bookable-locations.ts` | Roles + location↔staff assignments |
| `utils/preferred-contact-method.ts` | Contact preference helpers |
| `server/api/booking/submit-general-inquiry.post.ts` | Persists preferred contact |
| `pages/booking/availability/[slug].vue` | Consulting wizard / no auto-skip |
| `server/utils/__tests__/customer-account-activation.test.ts` | Gate matrix |
