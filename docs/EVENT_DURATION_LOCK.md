# Event Duration Lock (staff-chosen duration)

**When to use:** Creating/editing a lesson in EventModal, staff pick a duration (or end time) and it snaps back to category default / last-student duration; paid appointments and duration changes.

Verified against source (Aug 2026).

---

## Intent

Once staff **explicitly** choose a duration, async loads must not overwrite it. Late responses from “last appointment duration”, category default lists, and edit-mode restore timeouts previously raced with button clicks and end-time typing.

---

## Contract

| Flag | Where | Meaning |
|------|--------|---------|
| `durationManuallyChosen` | `EventModal.vue` | Staff clicked a duration button or typed end time |
| `formData._durationManuallyChosen` | form + handlers | Same flag for composables / persistence across handlers |
| `lockDuration` prop | `DurationSelector.vue` | Bound to `durationManuallyChosen` — skips auto-select and late last-student overwrite |

`markDurationManuallyChosen()` sets both refs. `resetDurationManuallyChosen()` clears them (new create flow).

`applyAutoDuration(...)` no-ops when edit/view **or** either manual flag is set.

---

## Race sources that must respect the lock

1. **`DurationSelector`** — `watch(availableDurations)` and `watch(selectedStudent)` → `getLastStudentDuration`; both return early if `lockDuration` (checked again after the fetch).
2. **`useEventModalHandlers.handleStudentSelected`** — skips applying last duration when `_durationManuallyChosen`.
3. **`handleCategorySelected` / duration list refresh** — must not replace a custom duration staff already set; custom values may be injected into the button list so the UI stays consistent.
4. **Edit restore** — timeouts that re-apply `eventData.duration_minutes` must not run after a manual change in the same session.

Location has a parallel pattern: `locationManuallyChosen` (do not conflate the two).

---

## Paid appointments

Duration **increase or decrease** on a paid edit is allowed:

- Increase → info banner; save creates an open remainder for the extra minutes (`appointments/save`).
- Decrease → EventModal offers credit vs refund UX; selector clears its own message and lets the parent handle choice.

`evaluatePaidDurationChange` always returns `true` today (message-only); `duration-change-rejected` remains for a future hard block.

---

## Pitfalls

1. **Custom end-time minutes** — Value may not be in `availableDurations`. Lock keeps it; parent should add it to the displayed list so the button row does not look “wrong”.
2. **Create vs edit** — Auto first-available duration only runs in create when **no** `modelValue` yet and unlocked. Edit/view never auto-pick from the list watcher.
3. **Two flag homes** — Checking only the Vue ref or only `_durationManuallyChosen` is insufficient; set both via `markDurationManuallyChosen`.
4. **Student change after lock** — Changing student does **not** clear the lock; duration stays until staff resets or closes the modal.

---

## Codepaths

- `components/EventModal.vue` — `durationManuallyChosen`, `markDurationManuallyChosen`, `:lock-duration`
- `components/DurationSelector.vue` — `lockDuration`, last-student + availableDurations watchers, paid-change messaging
- `composables/useEventModalHandlers.ts` — student/category handlers honor `_durationManuallyChosen`
- `composables/useEventModalForm.ts` — `_durationManuallyChosen?: boolean` on form type
