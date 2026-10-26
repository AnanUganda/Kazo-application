# Kazo Technical School Dashboard — Design System (MASTER)

> Global source of truth for the UI. Every page and component follows this.
> Codified from the implemented design language (not a database match — the
> ui-ux-pro-max search database was not installed in this environment, so the
> rules below come from the established build + the skill's built-in priority
> framework: Accessibility → Touch → Performance → Style → Layout → Type/Color →
> Motion → Forms → Navigation → Charts).

**Product:** staff-only admin dashboard (education / vocational school).
**Audience:** school staff (admin, teachers, store keeper) in Kampala, often on
cheap phones over slow connections. **Phone-first; must work at 375px.**
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v3.

---

## 1. Brand & color

- **Primary — maroon `#710014`** (Tailwind `brand` / `brand-700`). Used for
  primary actions, active nav, key figures, links, focus rings.
- Brand ramp: `brand-50 #fdf2f3` (tints/active backgrounds) → `brand-700 #710014`
  (primary) → `brand-800 #5f0012` (hover). Never introduce a second brand hue.
- **Neutrals** carry the UI: `neutral-900` headings, `neutral-700` body,
  `neutral-500` muted/secondary (the lightest allowed for real text — passes
  4.5:1 on white), `neutral-200` borders, `white` surfaces, `#f6f6f7` app bg.
  `neutral-300`/`neutral-400` are for **decorative/disabled only**, never for
  informational text.
- **Semantic (status) colors — always paired with a label or icon, never color
  alone:**
  | Meaning | Use | Classes |
  |---|---|---|
  | Success / Active / Paid / On-track | `green-50` bg, `green-700` text | attendance OK, active student, paid |
  | Warning / Stuck / Low stock / Behind | `amber-50` bg, `amber-700/800` text | 14-day marker, reorder, amber track |
  | Danger / Overdue / Below threshold / Fault | `red-50` bg, `red-700` text | overdue topic, attendance flag, needs repair |
  | In progress | `blue-50` bg, `blue-700` text | topic started |

Money is always `UGX n,nnn` (integer, `formatUGX`). Dates via `formatDate`
(Africa/Kampala). Never raw hex in components — use the `brand`/semantic tokens.

## 2. Typography

- System sans (`--font-sans`), antialiased. No web-font download (slow-connection
  friendly).
- Scale: page title `text-xl font-bold`; section/card heading `text-sm/text-base
  font-semibold`; body `text-sm`; captions/meta `text-xs`; big figures (KPI)
  `text-2xl font-bold`. Base ≥ 14px for body, never below 12px.
- Uppercase micro-labels: `text-xs font-semibold uppercase tracking-wide
  text-neutral-500` (KPI labels, table headers, section eyebrows).

## 3. Spacing & layout

- Page content: `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6`, vertical rhythm
  `space-y-6`.
- Card padding `p-5` (compact rows `p-3`/`p-4`). Radius: cards `rounded-2xl`,
  controls/buttons `rounded-xl`, chips/badges `rounded-full`.
- Grids are mobile-first and collapse to 1 column: KPI rows
  `grid-cols-1 sm:grid-cols-3` (or `lg:grid-cols-5`); two-panel
  `grid-cols-1 lg:grid-cols-2`; board `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
- **No horizontal page scroll at 375px.** Data tables reflow to stacked cards on
  mobile (see §5) — do not force a wide table to scroll.

## 4. Core components (shared classes in `app/globals.css`)

- `.card` — white surface, `rounded-2xl border border-neutral-200 shadow-sm p-5`.
- `.btn-primary` — maroon fill, white text, `rounded-xl`, has focus ring.
- `.btn-secondary` — white, neutral border, `rounded-xl`, has focus ring.
- `.field-label` / `.field-input` — labelled inputs; inputs have a brand focus ring.
- **Badge/chip:** `rounded-full px-2.5 py-0.5 text-xs font-semibold` + a semantic
  `bg-*-50 text-*-700` pair.
- **KPI / stat card:** a `.card` (often a `Link`) with an uppercase label, a
  `text-2xl font-bold` figure (brand or semantic colored when it signals status),
  and a muted "→" affordance line. **Every number on a home screen links to its
  filtered list.**
- **Clickable card:** `Link` with `className="card … transition hover:border-brand"`;
  it now gets a visible keyboard focus ring automatically (§7).

## 5. Tables & lists

- Desktop: header row `text-xs uppercase text-neutral-500`, rows separated by
  `divide-y divide-neutral-100`, comfortable `py-2.5`.
- **Mobile: reflow each row into a stacked card** (label-left / value-right rows),
  not a horizontally scrolling table. (Students/Lessons already do this.)
- Empty states: a short muted sentence inside a `.card` or a dashed-border box —
  never a blank area.

## 6. Navigation & shell

- Fixed left sidebar (≥ md) with icon + label; active item `bg-brand-50 text-brand`.
- Mobile: top bar + slide-in drawer (hamburger). User card + Sign out pinned bottom.
- Per-role menus (`components/shell/nav.ts`); items not yet built show a muted
  "Soon" tag (not a dead link).
- Predictable back behavior; filters use GET forms so URLs are shareable/deep-linkable.

## 7. Accessibility (priority #1 — non-negotiable)

- **Contrast:** real text ≥ 4.5:1. Muted text bottoms out at `neutral-500`.
- **Keyboard focus:** every interactive element shows a visible focus ring. A
  global `:focus-visible` maroon outline covers links, summaries, cards and plain
  buttons; `.btn-*`/inputs keep their own ring. Never remove focus styling.
- **Touch targets** ≥ 44×44px with ≥ 8px spacing; primary/secondary buttons and
  nav items meet this.
- **Labels:** every input has a visible `<label>` (not placeholder-only). Icons
  that convey meaning have text or an aria-label; decorative icons/SVGs are
  `aria-hidden`.
- **Never rely on color alone** — status always carries a word (Active, Overdue,
  Below 85%, Paid).

## 8. Motion (priority #7)

- Subtle only: `transition` on hover/focus for color/border/shadow. No animating
  layout (width/height). Honor `prefers-reduced-motion` (handled globally).

## 9. Anti-patterns to avoid

- A second accent color, raw hex in components, or emoji as icons.
- Muted text below `neutral-500`; gray-on-gray informational text.
- Horizontally scrolling tables on phones; fixed-px container widths.
- Placeholder-as-label; errors shown only at the top of a form.
- Color-only status; removing focus rings; instant (0ms) state changes.

## 10. Page recipe (use for any new screen)

1. Page header: `text-xl font-bold` title + one muted `text-sm` subline.
2. Primary actions top-right (`.btn-primary` / `.btn-secondary`), wrap on mobile.
3. For dashboards: a KPI row (each card links to its filtered list) then
   two-column `.card` panels.
4. For records: search + filters (GET form) → responsive table/cards → collapsible
   secondary groups (e.g. archived/exits).
5. Forms: labelled `.field-input`s, inline errors near the field, keep entered
   values on failure.

---

*Keep this file current when the visual system changes. Page-specific overrides,
if any, live in `design-system/kts-dashboard/pages/<page>.md` and win over MASTER.*
