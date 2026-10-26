# Kazo Technical School — Staff Dashboard · Continuation Brief

> Handoff document so any developer or AI coding agent can continue this build.
> Last updated after **Phase 4** + a preview harness. Read this top-to-bottom
> before writing code.

---

## 0. How to use this document

This project is being built in **strict phases (0–8), one at a time**, each on
its own branch, with a stop-and-report after every phase. Phases 0–4 are done.
**Next up is Phase 5.** Follow the process and conventions below exactly — they
are locked decisions, not suggestions.

---

## 1. Project snapshot

- **Client:** Kazo Technical School, a welding school in Kampala, Uganda
  (public site `theweldingschool-ug.com` — a **separate project, do not touch**).
- **Purpose:** a **staff-only admin dashboard** that replaces an existing Adalo
  app. No public app except the public application form.
- **Stack (as actually built — note the change from the original plan):**
  - Next.js **16** (App Router) + TypeScript + Tailwind **v3**
  - **Supabase** for both Postgres **and** Auth
    *(originally Neon + Neon Auth; switched to Supabase at the client's request —
    Supabase Postgres + Supabase Auth in one project)*
  - Drizzle ORM + drizzle-kit (migrations) via the `postgres` (postgres-js) driver
  - Netlify (free plan) for hosting; `@netlify/plugin-nextjs`
  - Everything on **free tiers only**. No paid services/APIs/trials.
- **Branding:** school maroon `#710014` (Tailwind `brand` palette). Crest is a
  **placeholder** at `public/kazo-crest.svg` — replace when the real file arrives.

---

## 2. Current status

| Phase | Scope | Status |
|------|-------|--------|
| 0 | Plan (stack, schema, folders, perms, env, questions) | ✅ approved |
| 1 | Scaffold, DB connection, auth, roles, staff mgmt, shell, home pages | ✅ built |
| 2 | Settings (fees, attendance threshold) + intakes (one active) | ✅ built |
| 3 | Applications: public form + API, payment ledger, board, stage moves, auto-create student | ✅ built |
| 4 | Syllabus plan + lesson logs (attendance, progress, issues, 7-day edit, timeline, history) | ✅ built |
| — | **Preview harness** (in-memory pglite + sample data, no sign-in) | ✅ built (dev-only) |
| 5 | Students, fees, attendance | ⬜ **next** |
| 6 | Inventory (consumables + equipment + faults) | ⬜ |
| 7 | Home summaries + CSV exports | ⬜ |
| 8 | Hardening + README + HANDOVER.md | ⬜ |

**Verified so far:** `typecheck`, `lint`, and `build` pass on every phase;
migrations 0000–0003 generated; and the preview harness has run all migrations
and queries against a **real Postgres engine** (pglite) with seeded data — the
fee ledger (with a reversal), attendance from absences, and track-status all
compute correctly.

**NOT done yet:** connecting the real Supabase project, running migrations/seed
against it, any deploy, the Netlify/GitHub setup, and Phases 5–8.

---

## 3. Repository layout (key paths)

```
app/
  (auth)/sign-in/        sign-in page + server action (Supabase signInWithPassword)
  (app)/                 authenticated area (requireStaff in layout)
    admin/ applications/ intakes/ lessons/ settings/ staff/ syllabus/
    teacher/ log/ syllabus/
    store/
    lessons/[id]/edit/   shared lesson-log edit (admin any; teacher own ≤7 days)
  apply/                 PUBLIC application form (no auth)
  api/applications/      PUBLIC POST endpoint (honeypot + rate limit)
  no-access/             signed-in-but-no-role page
  layout.tsx             root layout
components/
  shell/                 AppShell (sidebar/drawer), nav.ts, icons, Logo
  syllabus/SyllabusTimeline.tsx
lib/
  db/schema.ts           ALL Drizzle tables (single source of truth)
  db/index.ts            getDb() — postgres-js (or pglite in preview)
  db/migrations/         generated SQL (0000–0003) — DO NOT hand-edit
  db/preview.ts          in-memory pglite + sample seed (dev-only)
  auth/supabase/         server.ts (cookie client) + admin.ts (service role)
  auth/session.ts        getSessionStaff / requireStaff
  permissions.ts         requireRole(...) + homePathForRole
  ledger.ts              pure ledgerBalance()
  track-status.ts        pure syllabus status maths
  format.ts, fees.ts, intake.ts, activity.ts, preview.ts, preview-actions.ts
scripts/seed-admin.ts    first admin (Supabase admin API + staff row)
instrumentation.ts       boots the pglite preview DB when PREVIEW_MODE=1
middleware.ts            refreshes Supabase session cookie (rename to proxy.ts — see gotchas)
drizzle.config.ts, netlify.toml, tailwind.config.ts
```

---

## 4. Branches & how to continue

Branches are stacked (each built on the previous). The **tip with everything**
is **`preview-harness`** (contains Phases 1–4 + Supabase switch + preview).

```
phase-1-foundation → phase-2-settings-intakes → switch-to-supabase
  → phase-3-applications → phase-4-syllabus-lessons → preview-harness (TIP)
```

- There is **no `main`** yet, and nothing has been merged or deployed.
- **Start Phase 5 from the tip:** `git checkout preview-harness && git checkout -b phase-5-students-fees`.
  (Keeping the preview harness in the lineage means you can keep demoing new
  phases with no database.)
- **Do NOT** merge to main or deploy to production without the owner's approval.

---

## 5. How to run locally

```bash
npm install
```

**A. Preview mode — the real app, sample data, NO database, NO sign-in:**
```bash
PREVIEW_MODE=1 npm run dev        # http://localhost:3000
```
Switch roles with the amber banner (Admin / Teacher / Store keeper). Public form
at `/apply`. This uses an in-memory pglite DB seeded in `lib/db/preview.ts`.
**When you add Phase 5+ tables/data, extend the seed there** so the preview stays useful.

**B. Real mode — against Supabase (needs `.env.local` filled, see §6):**
```bash
npm run db:migrate     # apply migrations to Supabase (uses DATABASE_URL_UNPOOLED)
npm run seed:admin     # create the first admin (uses SEED_ADMIN_* + service role)
npm run dev
```

**Checks (run before every commit / end of phase):**
```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run build          # next build (passes with no env — DB/auth are lazy)
npm run db:generate    # regenerate migration SQL after schema.ts changes
```

---

## 6. Environment variables (names only — never commit values)

`.env.local` (gitignored). Template in `.env.example`.

```
DATABASE_URL                      Supabase Transaction pooler (port 6543) — runtime
DATABASE_URL_UNPOOLED             Supabase Session pooler  (port 5432) — migrations
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY         server-only (creates staff accounts)
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME
NEXT_PUBLIC_APP_URL
```
In the Supabase dashboard also **turn off public sign-ups** (accounts are created
only by an admin via the service-role API).

---

## 7. Database — schema & migrations

All tables are in **`lib/db/schema.ts`** (single source of truth). After any
change there, run `npm run db:generate` to emit a new migration; **never edit the
generated SQL by hand**, and never change the schema without regenerating.

Tables so far (migrations 0000–0003):
`staff`, `activity_log`, `app_settings`, `fee_types`, `intakes`,
`applications`, `students`, `fee_charges`, `payments`, `apply_throttle`,
`syllabus_topics`, `lesson_logs`, `lesson_topic_progress`, `lesson_absences`,
`lesson_issues`.

Phase 5 will add **no new tables for fees/attendance** — those are *derived*:
fees from `fee_charges` + `payments`, attendance from `lesson_absences` +
`lesson_logs`. Phase 5 likely only adds UI + possibly a `fee_charges`/`payments`
write path for student fees and a status-change path for students.

---

## 8. Conventions the next agent MUST follow

1. **Permissions on the server, always.** Every page loader and server action
   begins with `requireStaff()` or `requireRole("admin" | "teacher" | "store_keeper")`
   from `lib/permissions.ts`. Hiding nav is cosmetic only.
   - Teacher: own class, lessons, syllabus (view), student profiles **view-only,
     NEVER fees**, fault reporting. Store keeper: inventory/equipment only — **no
     student/fee data**. Admin: everything.
2. **Fee balance is ALWAYS derived from the append-only ledger** — never store a
   balance as an editable number. Payments are never edited/deleted; a mistake is
   a **reversal** entry (records reason + who). Use `ledgerBalance()` in
   `lib/ledger.ts`. There is a check constraint that each charge/payment belongs
   to exactly one of application / student.
3. **Attendance has ONE source:** `lesson_absences` (everyone present by default;
   a row means absent). Rate = present sessions / sessions held since the student
   enrolled. Threshold default 85% (editable in Settings).
4. **Audit + archive on everything:** every table has `created_at/by`,
   `updated_at/by`, `archived_at/by` (see `auditColumns()`). **No hard deletes —
   archive instead.** Record who+when, especially on payments (also `activity_log`).
5. **Money is integer UGX.** Timezone is **Africa/Kampala** — compute local dates
   with `lib/format.ts` (`todayKampala`, `formatDate`), never the server clock.
6. **Drizzle casing is `snake_case`** (set in `drizzle.config.ts` and the client).
   New columns can use camelCase in TS; the DB column is snake_cased automatically.
7. **Forms keep entered values on failure** (useActionState + value retention);
   pages are light and phone-first (**must work at 375px**).
8. **Only build what the current phase asks for.** No extra features/refactors.
9. **CSV export of any list (Admin only)** — Phase 7.
10. **Collect only the personal fields the spec lists.** Student data visible only
    to the roles allowed above.

---

## 9. Key decisions & deviations (from the original Phase-0 plan)

- **Supabase instead of Neon + Neon Auth** (client request). Schema/UI unchanged;
  only the DB driver and auth layer differ.
- **Intake statuses simplified** to `active` / `archived` (closing = archiving).
  Enforced "one active intake" via a partial unique index.
- **TypeScript pinned to 6.x** (npm's latest was 7.0, which `typescript-eslint`
  doesn't support yet). Tailwind pinned to **v3**.
- **Fault reports:** a lesson-log machine issue creates a `lesson_issues` row
  flagged `is_machine_issue` / `status=open` — that *is* the fault report. Phase 6
  adds the equipment register, links assets, and the store-keeper resolve UI.
- **"Confirmed by"** on a payment is free text (e.g. the bursar), separate from
  `created_by`.
- Dark-mode toggle from the design reference was dropped (out of scope).

---

## 10. Known gotchas / environment notes

- **Next 16 wants `middleware.ts` renamed to `proxy.ts`** (deprecation warning
  only; still works). Plan to rename during Phase 8 (or sooner): rename the file,
  keep the same `export`/`config`.
- **pglite is a dev dependency**, used only when `PREVIEW_MODE=1`. It's imported
  dynamically in `instrumentation.ts` so it never enters the production bundle.
  Do not reference it from normal app code.
- **Supabase connection:** runtime uses the **Transaction pooler (6543)** with
  `prepare:false` + `ssl:'require'` (see `lib/db/index.ts`); migrations use the
  **Session pooler (5432)** (`drizzle.config.ts` auto-appends `sslmode=require`).
- `next build` passes with **no env** (DB/auth clients are created lazily).
- Staff/user id = Supabase auth user UUID (so `staff.id` is the auth uid).

---

## 11. Remaining phases (spec — build in order, one at a time)

> After each phase, STOP and report: ✅ Completed (file by file) · 🧪 Verified
> (exact commands + results) · 🔗 Preview (URL if pushed) · ⚠️ Open issues ·
> ➡️ Next phase. Branch name `phase-N-short-name`.

### Phase 5 — Students, fees & attendance (Admin full; Teacher view-only, no fees)
- Student **list** of the active intake: name, booth, attendance %, **fee balance
  (Admin only)**, status (Active / Suspended / Dropped out). Dropped-out leaves
  the list; record kept.
- Student **profile:** contact details, next of kin, assigned booth and machine
  (linked to the equipment register — Phase 6), **fees** (one line per item:
  amount due, payments, balance; **partial payments allowed**), **attendance**
  (rate, absences by date, **red flag below threshold** default 85%), full
  application history.
- **Fee items** (amounts editable in Settings, already built): Registration
  35,000; Semester 1 800,000; Semester 2 800,000; Industrial tour 35,000 (Sem 2).
  All UGX.
- **Fee ledger rule:** every balance ALWAYS computed from the append-only payment
  log. Never store a balance. Payments never edited/deleted — correct with a
  reversal entry (reason + who). *(Ledger tables + `ledgerBalance()` already exist.)*
- Teacher sees student profiles **view-only and WITHOUT any fees**.

### Phase 6 — Inventory (Store keeper + Admin)
- **Consumables:** name, category (electrodes, discs, steel, gas, other), unit
  (box, piece, kg, length, cylinder), reorder level. **Stock in** (date, qty,
  supplier, optional cost, received by). **Stock out** (date, qty, purpose: class
  practice / workshop job / other, taken by). **Stock level is ALWAYS computed
  from movements, never edited.** Low stock (≤ reorder level) shows amber + on
  home. **Stock count:** enter physical count; difference saved as an adjustment
  with a reason (damaged / lost / miscounted).
- **Equipment register:** asset ID (e.g. KTS-WM-07), type, make/model, status
  (Working / Needs repair / Out of service), assignment to booth and student
  (linked both ways with the student profile), **fault log** (date, problem,
  reported by, fix, date fixed, cost). Filters for broken items and unassigned
  booths. **Fault reports come from lesson-log machine issues** (`lesson_issues`).

### Phase 7 — Home summaries + CSV exports (every number opens its filtered list)
- **Admin:** syllabus status badge + overdue count; applications per stage, unpaid
  & stuck (14+ days); total fees outstanding + top 5 balances; absentees this week
  + students under threshold; low-stock items + equipment needing repair.
- **Teacher:** big "Log today's lesson" button; track status; topics due this week
  & next; overdue topics; recent logs; students under threshold.
- **Store keeper:** low-stock items; open faults newest first; latest stock movements.
- **CSV export of any list (Admin only).**

### Phase 8 — Hardening & handover
- Mobile check at 375px on every screen; form recovery on failed save; permission
  tests per role; a test proving **fee balance always equals the sum of ledger
  entries** (use `ledgerBalance()` + pglite, which the preview harness already
  proves is feasible).
- **README:** local setup, env vars, migration/seed commands, and how to point the
  public site's Apply button at `/apply`.
- **HANDOVER.md** (plain English for non-technical staff): account ownership
  (GitHub/Netlify/Supabase under a school email, builder as collaborator);
  backups (CSV exports + a Supabase DB export, monthly routine); data protection
  (what personal data is stored, who sees it by role, how to remove a person's
  data on request, and a reminder that the school is responsible under Uganda's
  Data Protection and Privacy Act — flag as something to confirm, not legal
  advice); what to do when a staff member leaves (deactivate their account) and
  who to contact for support.
- Also: rename `middleware.ts` → `proxy.ts` (Next 16).

---

## 12. Constraints (hard rules)

- Stop and ask the owner BEFORE: installing a new dependency, changing the schema
  after a phase is approved, deleting files, a destructive migration, merging to
  main, or a production deploy.
- **Never** put secrets/connection strings/passwords in code or commits. Env vars,
  names only.
- **Never** use a paid tier / paid API / trial feature.
- Each phase on its own branch `phase-N-short-name`.
- Base every progress claim on **real command output**. If something failed or was
  skipped, say so.
- If a requirement is unclear, **ask** rather than guess.

---

## 13. Open questions / decisions still pending

1. **Account ownership** — GitHub, Netlify, Supabase should end up under a
   school-controlled email, builder as collaborator. Not set up yet.
2. **Crest file** — real Kazo crest to replace `public/kazo-crest.svg`.
3. **Booths** — is there a fixed/managed list of booths (needed for the
   "unassigned booths" filter in Phase 6), or free text? Recommend a managed list.
4. **Old Adalo data** — import into the new app later, or just keep it? (The
   Supabase project is currently empty.) Affects whether Phase 5/6 schema links to
   any legacy tables (currently it does not).
5. **Public application spam** — currently honeypot + hashed-IP rate limit (no
   captcha). Confirm acceptable, or add Cloudflare Turnstile (free).
6. Confirm **"Not accepted"** needs no reason (only "Withdrew" does) — current behaviour.

---

*End of continuation brief. Keep this file updated at the end of each phase.*
