---
name: BarberCita
description: Colombian barbershop booking — master barber's ledger meets modern fintech
colors:
  # Primary brand anchor (existing, kept)
  brand-indigo: "#3B2F8A"
  brand-indigo-hover: "#4C3FB0"
  brand-indigo-muted: "#EDEBFA"

  # Action amber — warmth, energy, Colombian gold/coffee
  action-amber: "#D4770F"
  action-amber-hover: "#E8921A"
  action-amber-muted: "#FEF3E2"
  action-amber-dark: "#B8660D"

  # Surface neutrals — paper/ink metaphor
  paper-cream: "#FDFBF7"
  paper-warm: "#F5F0E8"
  ink-charcoal: "#0F0F0F"
  ink-soft: "#1A1A1A"
  graphite: "#2D2D2D"
  graphite-hover: "#3A3A3A"

  # Functional
  ruled-line: "#D8D0C0"
  ruled-line-dark: "#3D3830"
  muted-ink: "#6B6B6B"
  muted-ink-dark: "#9A9A9A"
  success-emerald: "#0D9488"
  success-emerald-muted: "#D1FAE5"
  danger-crimson: "#DC2626"
  danger-crimson-muted: "#FEE2E2"
  focus-ring: "#D4770F"

typography:
  display:
    fontFamily: "Syne, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Syne, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Syne, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
    textTransform: "uppercase"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0"

rounded:
  none: "0"
  tight: "4px"
  base: "8px"
  soft: "12px"
  pill: "9999px"
  stamp: "6px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"

components:
  button-primary:
    backgroundColor: "{colors.action-amber}"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.base}"
    padding: "14px 28px"
    typography: "{typography.label}"
    height: "auto"
  button-primary-hover:
    backgroundColor: "{colors.action-amber-hover}"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.base}"
    padding: "14px 28px"
    typography: "{typography.label}"
    height: "auto"
  button-primary-active:
    backgroundColor: "{colors.action-amber-dark}"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.base}"
    padding: "14px 28px"
    typography: "{typography.label}"
    height: "auto"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.brand-indigo}"
    rounded: "{rounded.base}"
    padding: "14px 28px"
    typography: "{typography.label}"
    height: "auto"
    border: "2px solid {colors.brand-indigo}"
  button-secondary-hover:
    backgroundColor: "{colors.brand-indigo-muted}"
    textColor: "{colors.brand-indigo}"
    rounded: "{rounded.base}"
    padding: "14px 28px"
    typography: "{typography.label}"
    height: "auto"
    border: "2px solid {colors.brand-indigo}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.base}"
    padding: "10px 20px"
    typography: "{typography.label}"
    height: "auto"
  button-ghost-hover:
    backgroundColor: "{colors.paper-warm}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.base}"
    padding: "10px 20px"
    typography: "{typography.label}"
    height: "auto"
  button-destructive:
    backgroundColor: "{colors.danger-crimson}"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.base}"
    padding: "14px 28px"
    typography: "{typography.label}"
    height: "auto"
  button-destructive-hover:
    backgroundColor: "#B91C1C"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.base}"
    padding: "14px 28px"
    typography: "{typography.label}"
    height: "auto"
  card-default:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.soft}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.ruled-line}"
  card-elevated:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.soft}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.ruled-line}"
    boxShadow: "0 4px 24px -4px rgba(15,15,15,0.08), 0 1px 3px -1px rgba(15,15,15,0.06)"
  card-interactive:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.soft}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.ruled-line}"
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease"
  input-default:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.tight}"
    padding: "12px 14px"
    typography: "{typography.body}"
    height: "48px"
    border: "1.5px solid {colors.ruled-line}"
  input-focus:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.tight}"
    padding: "12px 14px"
    typography: "{typography.body}"
    height: "48px"
    border: "2px solid {colors.action-amber}"
    boxShadow: "0 0 0 3px {colors.action-amber-muted}"
  input-error:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.tight}"
    padding: "12px 14px"
    typography: "{typography.body}"
    height: "48px"
    border: "2px solid {colors.danger-crimson}"
  badge-default:
    backgroundColor: "{colors.brand-indigo-muted}"
    textColor: "{colors.brand-indigo}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
    typography: "{typography.label}"
  badge-success:
    backgroundColor: "{colors.success-emerald-muted}"
    textColor: "{colors.success-emerald}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
    typography: "{typography.label}"
  badge-warning:
    backgroundColor: "#FEF3C7"
    textColor: "#92400E"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
    typography: "{typography.label}"
  badge-danger:
    backgroundColor: "{colors.danger-crimson-muted}"
    textColor: "{colors.danger-crimson}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
    typography: "{typography.label}"
  sidebar-nav:
    backgroundColor: "{colors.ink-charcoal}"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.none}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.body}"
  sidebar-nav-active:
    backgroundColor: "{colors.brand-indigo}"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.base}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.body}"
  sidebar-nav-hover:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.paper-cream}"
    rounded: "{rounded.base}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.body}"
  table-header:
    backgroundColor: "{colors.paper-warm}"
    textColor: "{colors.muted-ink}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.label}"
  table-row:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-charcoal}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.body}"
    borderBottom: "1px solid {colors.ruled-line}"
  table-row-hover:
    backgroundColor: "{colors.action-amber-muted}"
    textColor: "{colors.ink-charcoal}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.body}"
    borderBottom: "1px solid {colors.ruled-line}"
---

# Design System: BarberCita

## Overview

**Creative North Star: "The Master Barber's Ledger"**

BarberCita looks and feels like a master barber's appointment book — precise ruled lines, ink stamps, tactile paper — translated into a modern Colombian digital product. It rejects the generic SaaS dashboard aesthetic (cards on gray, floaty shadows, rounded-everything) for something grounded, trustworthy, and culturally resonant.

The system runs on three invariants:
1. **Ruled structure** — horizontal rules are the primary organizing device, not cards or boxes. They create rhythm, hierarchy, and a sense of crafted precision.
2. **Ink-on-paper color** — Cream paper (`#FDFBF7`), charcoal ink (`#0F0F0F`), indigo brand stamp (`#3B2F8A`), amber action ink (`#D4770F`). Every color has a material reason.
3. **Typographic authority** — Syne for display (geometric, distinctive, Colombian design heritage), DM Sans for UI (workhorse, excellent Spanish glyphs), JetBrains Mono for time/price/data. No generic Inter/Roboto.

**Key Characteristics:**
- Ruled lines as structural grammar, not decoration
- Stamp-style badges (rounded-6, tight padding) for status/roles
- Ink-press button motion (scale 0.98, color deepen)
- Subtle paper noise texture on large surfaces (CSS `background-image: url("data:image/svg+xml,...")`)
- No floaty shadows — depth via border weight, background shift, and ruled lines
- Dark mode = charcoal paper, indigo-glow accents, amber stays warm

## Colors

The palette is a four-role system: Brand (indigo stamp), Action (amber ink), Surface (paper/ink), Functional (ruled lines, status).

### Primary — Brand Stamp
- **Deep Indigo Stamp** (`#3B2F8A` / `oklch(0.28 0.15 260)`): The brand anchor. Used for logo mark, primary navigation active state, headlines that carry brand weight, focus rings on brand elements. Never used for primary actions — that's amber's job.

### Secondary — Action Ink
- **Warm Amber Ink** (`#D4770F` / `oklch(0.58 0.18 75)`): The *only* primary action color. Buttons that commit (Reservar, Pagar, Confirmar, Guardar), active step indicators, selected time slots, progress bars. Its warmth signals "this moves you forward" in a culture where gold/coffee/ámbar mean value.

### Tertiary — Functional (omitted as named role; carried by neutrals + status)

### Neutral — Paper & Ink
- **Cream Paper** (`#FDFBF7`): Default page background, card surfaces, input backgrounds. Warmth prevents clinical feel.
- **Warm Paper** (`#F5F0E8`): Table header bands, hovered row bands, subtle section dividers.
- **Charcoal Ink** (`#0F0F0F`): Primary text, headlines, sidebar background.
- **Soft Ink** (`#1A1A1A`): Dark mode page background.
- **Graphite** (`#2D2D2D`): Dark mode cards, sidebar hover.
- **Ruled Line** (`#D8D0C0`): The structural line — borders, dividers, table rules, input strokes. Warm enough to feel like pencil on paper.
- **Ruled Line Dark** (`#3D3830`): Dark mode ruled lines.
- **Muted Ink** (`#6B6B6B`): Secondary text, placeholder, table headers.
- **Muted Ink Dark** (`#9A9A9A`): Dark mode secondary text.

### Status (semantic, not decorative)
- **Success Emerald** (`#0D9488`): Paid, completed, confirmed. Teal-leaning for Colombian financial trust.
- **Danger Crimson** (`#DC2626`): Cancel, no-show, destructive actions.
- **Warning Amber** (`#F59E0B`): Pending payment, reschedule needed.

### Named Rules
**The One Action Color Rule.** Amber (`#D4770F`) appears on ≤15% of any screen. Its scarcity is the signal. No amber borders, no amber backgrounds except primary buttons and selected states.

**The Stamp Rule.** Indigo (`#3B2F8A`) only appears as: logo mark, active nav pill, headline accent, focus ring on brand elements. Never as a button fill.

**The Ruled Line Rule.** Every structural division uses `ruled-line` (`#D8D0C0`) at 1px or 1.5px. No `border-gray-200`, no `divide-gray-100`. The line *is* the system.

## Typography

**Display Font:** Syne (with system-ui fallback) — geometric, wide, distinctive. Colombian design studios (Muta, Sancho BBDO) use it; it carries cultural authority.

**Body Font:** DM Sans (with system-ui fallback) — workhorse, excellent Spanish support (ñ, á, é, í, ó, ú, ü), neutral but not generic.

**Label/Mono Font:** JetBrains Mono — tabular numbers for time/price, code-like precision for appointment IDs.

**Character:** Syne's geometric width + DM Sans's humanist warmth = institutional trust with craft soul. The mono adds technical precision where it matters (time, money, IDs).

### Hierarchy
- **Display** (800, `clamp(2.5rem, 6vw, 4rem)`, 1.05, -0.03em): Hero headlines only — `/`, `/reservar` step titles, `/admin` dashboard KPI labels.
- **Headline** (700, `clamp(1.75rem, 4vw, 2.5rem)`, 1.15, -0.02em): Page titles (`Panel de barbero`, `Panel administrativo`), section headers.
- **Title** (600, `clamp(1.25rem, 2.5vw, 1.5rem)`, 1.25, -0.01em): Card titles, dialog titles, tab triggers.
- **Body** (400, 1rem, 1.6): All paragraph copy, form labels, table cells, appointment details.
- **Label** (500, 0.875rem, 1.4, 0.01em, UPPERCASE): Button text, table headers, badge text, nav pills, step labels.
- **Mono** (500, 0.875rem, 1.5): Time displays (`14:30`), prices (`$ 45.000`), appointment IDs, duration (`30 min`).

### Named Rules
**The Tabular Numbers Rule.** All time, price, duration, and numeric data uses `font-variant-numeric: tabular-nums` via JetBrains Mono. No proportional numbers in data.

**The Uppercase Label Rule.** Labels, buttons, tabs, badges, table headers = uppercase + tracking-wide (0.01em). Body copy never uppercase.

**The Display Restriction Rule.** Syne 800 appears ≤2 times per viewport. Overuse kills distinction.

## Layout

**Spatial Model:** 12-column fluid grid (CSS Grid) with `max-w-6xl` (1152px) primary container for content, `max-w-7xl` (1280px) for admin tables. Sidebar layouts use fixed 280px (collapsed: 72px) + `1fr` inset.

**Density:** Three densities encoded via `--density` CSS custom property:
- `comfortable` (default): `--space-unit: 16px` — customer flows, marketing
- `compact` : `--space-unit: 12px` — barber agenda, admin tables
- `spacious` : `--space-unit: 24px` — landing hero, empty states

**Rhythm:** Vertical spacing follows 4px base unit. Section gap = `3xl` (64px), component gap = `lg` (24px), element gap = `md` (16px), inline gap = `sm` (8px). One spacing rhythm throughout; more space above headings than below (1.5:1 ratio).

**Responsive Breakpoints:**
- `sm` 640px: stacked → side-by-side (booking summary, form fields)
- `md` 768px: sidebar collapsible, grid 2-col
- `lg` 1024px: sidebar default open, grid 3-col (features, role cards)
- `xl` 1280px: admin full table, max-w-7xl container

**Container Padding:** `px-4 sm:px-6 lg:px-8` (16/24/32px) — generous on desktop, tight on mobile.

## Elevation & Depth

**No shadows by default.** Depth is conveyed through:
1. **Border weight** — 1px ruled line = flat surface; 2px = interactive/selected
2. **Background shift** — `paper-cream` → `paper-warm` → `action-amber-muted` = elevation steps
3. **Ruled lines** — horizontal rules separate sections; vertical rules separate columns
4. **Scale** — larger type = more important; no shadow needed

**Shadow Vocabulary (only two, reserved):**
- **Stamp Shadow** (`0 2px 8px -2px rgba(59,47,138,0.25), 0 1px 2px -1px rgba(59,47,138,0.15)`): Only on brand-indigo logo mark and active nav pill — the "stamp press" effect.
- **Sheet Shadow** (`0 4px 24px -4px rgba(15,15,15,0.08), 0 1px 3px -1px rgba(15,15,15,0.06)`): Only on elevated cards (dialogs, sheets, dropdowns, toasts) — the "page lifted" effect.

**Named Rules**
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on: brand stamp, elevated sheets (dialog/sheet/dropdown/toast). Cards, buttons, inputs, tables — no shadows.

**The Border-Weight Rule.** Interactive = 2px border (focus, hover, selected). Static = 1px ruled line. Never 0px borders on interactive elements.

## Shapes

**Corner Language:** Three radii only — `tight` (4px) for inputs, badges, small chips; `base` (8px) for buttons, cards, nav pills; `soft` (12px) for cards with internal padding, dialogs, sheets. `pill` (9999px) only for avatar rings and stepper circles. `stamp` (6px) for badges — the rubber stamp feel.

**No rounded-xl, rounded-2xl, rounded-full on structural elements.** The system is precise, not soft.

**Borders:** 1px `ruled-line` default. 2px `action-amber` or `brand-indigo` for focus/selected. 2px `danger-crimson` for error. Never decorative double borders.

**Signature Geometry:** Horizontal ruled lines as section dividers (full-bleed, 1px). Vertical ruled lines in tables (1px, `ruled-line`). Stamp badge = `rounded-stamp` + tight padding + uppercase label.

## Components

### Buttons
- **Shape:** `base` (8px) radius, `label` typography (uppercase, tracking-wide, 500 weight), `14px 28px` padding, min-height 48px
- **Primary (Action):** Amber fill, cream text. Hover: amber-hover. Active: amber-dark. Press: `transform: scale(0.98)` + color deepen (ink press). Focus: 2px amber border + 3px amber-muted ring.
- **Secondary (Brand):** Transparent, indigo text, 2px indigo border. Hover: indigo-muted fill. Focus: 2px indigo border + 3px indigo-muted ring.
- **Ghost:** Transparent, charcoal text. Hover: paper-warm fill. Focus: 2px ruled-line border + 3px ruled-line ring.
- **Destructive:** Crimson fill, cream text. Hover: darker crimson. Focus: 2px crimson border + 3px crimson-muted ring.
- **Icon-only:** 40x40 (base), 32x32 (sm), 48x48 (lg). Same press motion.

### Chips / Badges (Stamp Style)
- **Shape:** `stamp` (6px) radius, `label` typography, `4px 10px` padding
- **Default:** Indigo-muted bg, indigo text
- **Success:** Emerald-muted bg, emerald text
- **Warning:** Amber-muted bg, amber-dark text
- **Danger:** Crimson-muted bg, crimson text
- **Selected/Active:** Action amber bg, cream text (matches primary button)

### Cards / Containers
- **Corner:** `soft` (12px)
- **Background:** `paper-cream` (light), `graphite` (dark)
- **Border:** 1px `ruled-line` (light), 1px `ruled-line-dark` (dark)
- **Padding:** `lg` (24px) default, `md` (16px) for `size="sm"`
- **Internal Rhythm:** Header gap `sm` (8px), Content gap `md` (16px), Footer gap `md` (16px)
- **Hover (interactive):** `border-action-amber` + `background-action-amber-muted` + `translateY(-1px)` — the "page lift"
- **No shadows** on default cards. Only `sheet-shadow` on Dialog/Sheet/Dropdown/Toast.

### Inputs / Fields
- **Shape:** `tight` (4px) radius, `body` typography, `12px 14px` padding, 48px height
- **Default:** `paper-cream` bg, 1.5px `ruled-line` border
- **Focus:** 2px `action-amber` border, 3px `action-amber-muted` ring, `paper-cream` bg
- **Error:** 2px `danger-crimson` border, `danger-crimson` label text
- **Disabled:** `paper-warm` bg, `muted-ink` text, 1px `ruled-line` border, cursor not-allowed
- **Label:** `label` typography (uppercase), `mb-xs` (4px) gap to input
- **Icon prefix:** 28px left padding, icon at 12px, `muted-ink` color
- **Helper/Error text:** `body` typography, `muted-ink` / `danger-crimson`, `mt-xs` (4px)

### Navigation
- **Sidebar (Desktop):** Fixed 280px / collapsed 72px. Background `ink-charcoal`. Items: `body` typography, `md` padding, `base` radius. Active: `brand-indigo` bg + `stamp-shadow`. Hover: `graphite` bg. Icon + label (collapsed: icon only with tooltip).
- **Mobile Sheet:** Slide from right, 280px max. Same item style, full-width buttons.
- **Top Bar (Desktop):** Sticky, `paper-cream` bg, `backdrop-blur`, 1px `ruled-line` bottom. User avatar + role badge (stamp style) + sign out.
- **Tabs:** `label` typography, no underline. Active: `action-amber` text + 2px bottom border `action-amber`. Hover: `paper-warm` bg.

### Stepper (Booking Flow Signature)
- **Step Circle:** 40px `pill`, `label` typography. Inactive: `paper-warm` bg, `muted-ink` text. Active: `action-amber` bg, `cream` text + 4px `action-amber` ring. Completed: `brand-indigo` bg, `cream` text + check icon.
- **Connector:** 2px `ruled-line` between centers. Completed segment: `action-amber`.
- **Labels:** `label` typography above, `body` description below (hidden on mobile < sm).
- **Mobile:** Horizontal scroll with snap, or vertical stack with connectors on left.

### Slot Calendar (Booking Flow Signature)
- **Month Header:** `title` typography, chevron buttons (ghost, 40x40)
- **Weekday Row:** `label` typography, `muted-ink`, centered
- **Day Button:** 40x40 `base` radius. Available: `label` weight, hover `paper-warm`. Selected: `brand-indigo` bg, `cream` text. Today (unselected): 1px `brand-indigo` ring. Unavailable: `muted-ink` 40% opacity.
- **Time Slots:** 4-col grid, `body` typography, `tight` radius, `sm` padding. Available: `ruled-line` border, hover `paper-warm`. Selected: `action-amber` bg, `cream` text, 2px `action-amber` border.

### Table (Admin/Barber Panels)
- **Header:** `paper-warm` bg, `label` typography, `muted-ink` text, `md` padding, bottom border 2px `ruled-line`
- **Row:** `paper-cream` bg, `body` typography, `md` padding, bottom border 1px `ruled-line`. Hover: `action-amber-muted` bg.
- **Selected/Busy:** `action-amber-muted` bg + 2px left border `action-amber`
- **Cell Mono:** Time, price, duration → `mono` typography
- **Status Badge:** Stamp style inline

### Dialog / Sheet / Dropdown / Toast
- **Background:** `paper-cream`, `soft` radius, `sheet-shadow`
- **Header:** `title` typography, `md` padding, bottom border 1px `ruled-line`
- **Content:** `lg` padding
- **Footer:** `paper-warm` bg, `soft` bottom radius, `md` padding, button gap `sm`
- **Close:** Ghost button top-right, 40x40

## Do's and Don'ts

### Do:
- **Do** use ruled lines (`ruled-line` at 1px) as the primary structural divider — horizontal for sections, vertical for table columns.
- **Do** reserve amber (`#D4770F`) exclusively for primary actions and selected states. Its rarity is the signal.
- **Do** use Syne 800 only for hero headlines (≤2 per viewport). DM Sans for everything else.
- **Do** apply tabular numbers (JetBrains Mono) to all time, price, duration, and ID displays.
- **Do** use uppercase + tracking-wide (0.01em) for all labels, buttons, tabs, badges, table headers.
- **Do** implement the ink-press motion on buttons: `active: scale(0.98)` + color deepen.
- **Do** use stamp badges (6px radius, tight padding, uppercase) for all status/role indicators.
- **Do** keep cards flat (1px border, no shadow) unless they're elevated sheets (dialog, dropdown, toast).
- **Do** use paper texture (subtle noise) on full-bleed backgrounds — `background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`.
- **Do** respect `prefers-reduced-motion` — disable press scale, stagger entrances, slot magnetic snap.

### Don't:
- **Don't** use generic gray scales (`gray-100`, `gray-200`, `slate-50`, etc.). Every neutral has a named role in this system.
- **Don't** use `rounded-xl`, `rounded-2xl`, `rounded-full` on structural elements (cards, buttons, inputs). Only `tight` (4px), `base` (8px), `soft` (12px), `stamp` (6px), `pill` (9999px).
- **Don't** use floaty shadows (`shadow-lg`, `shadow-xl`, `shadow-2xl`) on cards, buttons, or inputs. Only `stamp-shadow` and `sheet-shadow` exist.
- **Don't** use indigo (`#3B2F8A`) for primary action buttons. That's the brand stamp, not the action ink.
- **Don't** use proportional fonts for numbers in time, price, duration. Always JetBrains Mono + `tabular-nums`.
- **Don't** use sentence case for buttons, tabs, badges, table headers. Always UPPERCASE + tracking-wide.
- **Don't** use cards as layout wrappers everywhere. Ruled sections + typography hierarchy often replace 3-4 cards.
- **Don't** invent new colors. The palette is closed: Brand, Action, Surface (4), Ruled, Status (3). Extend only via tonal ramps of these.
- **Don't** use `backdrop-blur` on sidebars or cards. Only on sticky top bars.
- **Don't** use generic shadcn/ui component defaults without adapting to this system (radius, colors, motion, typography).

---

<!-- SEED: established before implementation; re-run /impeccable document once there's code to capture the actual tokens and components. -->