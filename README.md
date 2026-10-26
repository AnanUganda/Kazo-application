# Kazo Technical School — Staff Dashboard

Internal staff-only operations and administration dashboard for **Kazo Technical School** (Welding & Fabrication Course · Kampala, Uganda), plus the public student application form at `/apply`.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v3**, **Drizzle ORM**, and **Supabase** (Postgres + Auth), hosted on **Netlify** (free tiers only).

---

## 1. Quick Start (Local Development)

### Prerequisites
- Node.js **20+** and `npm`

```bash
npm install
```

### Option A: Preview Mode (No Database or Account Required)
Preview mode boots an in-memory Postgres engine (`pglite`), runs all Drizzle SQL migrations (`0000`–`0004`), seeds sample Kazo Technical School data (including the official 18-module Welding & Fabrication syllabus, sample applicants, students, fee ledger entries, lesson logs, consumables, and workshop equipment), and bypasses sign-in:

```bash
PREVIEW_MODE=1 npm run dev
```

Open **`http://localhost:3000`**. Use the amber bar at the top of the screen to switch live between:
- **Administrator** (`/admin`) — full access to applications, students, fee ledger, syllabus, lessons, inventory, equipment, intakes, staff, settings, and CSV exports.
- **Teacher** (`/teacher`) — lesson logging, syllabus timeline, and student attendance/profiles (strictly view-only and **without** any fee data).
- **Store keeper** (`/store`) — consumables stock movements, physical stock counts, equipment register, and machine fault logs (strictly **without** student personal or fee data).
- **Public application form** (`/apply`) — accessible without signing in.

---

### Option B: Real Mode (Connected to Supabase)

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in the environment variables in `.env.local` (see **§2 Environment Variables** below).
3. In your **Supabase Dashboard → Authentication → Providers → Email**, **disable public sign-ups** ("Allow new users to sign up" = OFF). Staff accounts are provisioned exclusively by an Administrator.
4. Run the SQL migrations against your Supabase database:
   ```bash
   npm run db:migrate
   ```
5. Seed the first Administrator account:
   ```bash
   npm run seed:admin
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

---

## 2. Environment Variables

All environment variable names are listed in [`.env.example`](file:///Users/ram/Kts%20App%20Dashboard/.env.example). **Never commit `.env.local` or any real credentials to Git.**

| Variable | Purpose | Where to find it in Supabase |
| :--- | :--- | :--- |
| `DATABASE_URL` | Runtime Postgres connection (Transaction pooler, port `6543`) | Project Settings → Database → Connection string → **Transaction pooler** |
| `DATABASE_URL_UNPOOLED` | Migration Postgres connection (Session pooler, port `5432`) | Project Settings → Database → Connection string → **Session pooler** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anonymous key | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by Admin to create/deactivate staff accounts | Project Settings → API → `service_role` `secret` key |
| `SEED_ADMIN_EMAIL` | Email for the initial admin created by `npm run seed:admin` | Chosen by school leadership |
| `SEED_ADMIN_PASSWORD` | Initial password for `npm run seed:admin` (min 8 chars) | Chosen by school leadership |
| `SEED_ADMIN_NAME` | Full name for the initial admin account | Chosen by school leadership |
| `NEXT_PUBLIC_APP_URL` | Canonical URL of the deployed dashboard (e.g. `https://app.theweldingschool-ug.com`) | Netlify domain settings |

---

## 3. Database Migrations & Seed Commands

All database tables are defined in a single source of truth: [`lib/db/schema.ts`](file:///Users/ram/Kts%20App%20Dashboard/lib/db/schema.ts). Generated SQL migrations live in [`lib/db/migrations/`](file:///Users/ram/Kts%20App%20Dashboard/lib/db/migrations).

- **Generate a new migration after editing `lib/db/schema.ts`**:
  ```bash
  npm run db:generate
  ```
- **Apply pending migrations to Supabase (`DATABASE_URL_UNPOOLED`)**:
  ```bash
  npm run db:migrate
  ```
- **Seed the first Administrator user**:
  ```bash
  npm run seed:admin
  ```
- **Load the Official 18-Module KTS Syllabus**:
  Once signed in as Administrator with an active intake created in **Admin → Intakes**, go to **Admin → Syllabus** and click **Load KTS 18-module syllabus** to populate Semester 1 (Modules 1–10) and Semester 2 (Modules 11–18).

---

## 4. Connecting the Public Website's "Apply" Button to `/apply`

The school's public marketing website (`theweldingschool-ug.com`) is a separate project and does not need to host any database or backend code.

Once this dashboard is deployed on Netlify (for example at `https://apply.theweldingschool-ug.com` or `https://portal.theweldingschool-ug.com`):

1. Point the **"Apply"** / **"Apply Now"** button or link on `theweldingschool-ug.com` directly to:
   ```html
   <a href="https://portal.theweldingschool-ug.com/apply">Apply Now</a>
   ```
2. The `/apply` route is public (no login required), mobile-first (tested down to `375px` width), protected by a honeypot field and per-IP rate limiting (`/api/applications`), and automatically places new applicants into the **Applied (unpaid)** column on the Admin Applications board.

---

## 5. Verification & Automated Tests

Run these checks before every commit or deployment:

```bash
npm run typecheck          # TypeScript strict check (tsc --noEmit)
npm run lint               # ESLint check
npm test                   # Vitest suite (ledger invariants, role permissions, attendance, inventory, KTS syllabus)
npx next build --webpack   # Production build verification
```

---

## 6. Architecture & Core Invariants

1. **Server-Side Permissions**: Every page loader, server action, and export route verifies the user's role on the server via [`requireStaff()`](file:///Users/ram/Kts%20App%20Dashboard/lib/auth/session.ts) or [`requireRole()`](file:///Users/ram/Kts%20App%20Dashboard/lib/permissions.ts).
2. **Append-Only Fee Ledger**: Fee balances are **never** stored as editable numbers. Every balance is computed on the fly by [`ledgerBalance()`](file:///Users/ram/Kts%20App%20Dashboard/lib/ledger.ts) from `fee_charges` and `payments`. Mistakes are corrected with append-only `reversal` entries recording the reason and who authorized it.
3. **Single-Source Attendance**: Everyone is present by default; a row in `lesson_absences` marks an absence. Attendance percentage is derived by [`computeAttendance()`](file:///Users/ram/Kts%20App%20Dashboard/lib/attendance.ts) and flags students below the school threshold (default **85%** per KTS policy).
4. **Movement-Derived Inventory**: Consumable stock levels are **never** edited directly; [`computeStockLevel()`](file:///Users/ram/Kts%20App%20Dashboard/lib/inventory.ts) sums `stock_movements` (`in`, `out`, `adjustment`). Physical stock counts record the delta as an adjustment movement with a reason (`damaged`, `lost`, `miscounted`).
5. **No Hard Deletes**: Records use `archived_at` / `archived_by` audit columns so historical school records remain intact.
