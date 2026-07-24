# Plan

## 1. Dashboard cleanup: separate fleet fees from expenses

- In `src/lib/trackuber/calc.ts`, extend `summarize` so it reports:
  - `fleetCommission` — sum of all deduction rules applied over the range (already computed internally; expose it).
  - `weeklyFees` — kept, but only counted when the range's first day falls on the configured `firstDayOfWeek` (so single-day / mid-week views don't include it).
  - `fleetTake` = `fleetCommission + weeklyFees`.
  - `totalExpenses` — real operating expenses only (no weekly fee added in).
  - `expensesByCategory` — unchanged; weekly fee no longer injected as a slice.
- In `src/routes/_app.dashboard.tsx`:
  - Replace the single "Gross Revenue" KPI with a 2-up group: **Gross Revenue** and **Amount Taken by Fleet** (`fleetTake`, hint: "Commission + weekly fee").
  - "Total Expenses" KPI no longer shows the weekly-fee suffix.
  - Expense pie: keep category slices; add a distinct **Fleet Commission** slice and a **Weekly Fee** slice (when > 0), each with their own color. Fuel stays red.

## 2. Dual workspace: Rides vs Foods

Introduce a `workspace` concept so the entire app state (entries, fleet settings, profile fields specific to work) is per-workspace, per-user. Both routes/pages are reused — data switches under them.

### Data model
- Migrate `public.user_data`:
  - Add `workspace text not null default 'rides'` with a CHECK for `('rides','foods')`.
  - Drop the existing PK/unique on `user_id`; add unique `(user_id, workspace)`.
  - Backfill existing rows as `workspace = 'rides'`.
  - RLS policies stay `auth.uid() = user_id`.

### Store
- `src/lib/trackuber/store.tsx`:
  - Add `workspace: 'rides' | 'foods'` to context, persisted in `localStorage` (`trackuber_v2_workspace:{uid}`).
  - Storage keys become `trackuber_v2_state:{uid}:{workspace}` and `trackuber_v2_range:{uid}:{workspace}`.
  - `loadRemote` / upsert filter/write by `(user_id, workspace)`.
  - Changing workspace re-hydrates state+range from local, then remote.
  - Default fleet defaults per workspace: Rides keeps current defaults; Foods uses sensible defaults (e.g. `fleetName: "Uber Eats"`, empty deductions list, food-oriented categories: Fuel, Bike/Scooter, Repairs, Phone, Other).

### UI toggle
- In `src/components/trackuber/AppShell.tsx`, add a small segmented control top-right (both desktop header and mobile header): **Rides / Foods**. Clicking switches `workspace` in the store; everything (dashboard, entry, history, reports, settings, profile) reflects the new workspace automatically.

## 3. Out of scope
- No changes to auth, admin views, or route structure.
- No new routes — Foods reuses the same pages.

## Technical notes
- Weekly-fee inclusion rule: include the weekly fee count from `summarize` only when `range.from`'s weekday equals `fleet.firstDayOfWeek` AND the range spans ≥ 7 days OR contains a full week boundary. Simpler heuristic that fits the user's ask: include weekly fee only if the range covers the configured week-start day. Implemented by checking whether any date in the range has weekday === firstDayOfWeek (already how `weeklyFeeCount` works today) — keep that but stop folding it into `totalExpenses`.
- Admin read path (`user_data` select) will now return one row per workspace; admin views currently show only profile metadata, so no change needed.
