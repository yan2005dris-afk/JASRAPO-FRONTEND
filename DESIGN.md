---
name: JASRAPO Frontend
description: Corporate water lagoon — deep teal operational dashboard for water utility administration
colors:
  lagoon-deep: "#0c9ea1"
  turquoise-vivid: "#0fc3c6"
  lagoon-glow: "#4ee6e9"
  foam: "#bff3f4"
  water-mist: "#dbf7f8"
  water-white: "#ffffff"
  deep-sea: "#0e2728"
  muted-tide: "#597b7d"
  shoreline: "#cbdedf"
  marine-ink: "#0f172a"
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#ef4444"
typography:
  headline:
    fontFamily: "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontWeight: 600
    fontSize: "0.9rem"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "16px"
  pill: "50%"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lagoon-deep}"
    textColor: "{colors.water-white}"
    rounded: "{rounded.md}"
    padding: "0.375rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.turquoise-vivid}"
  button-outline-primary:
    textColor: "{colors.lagoon-deep}"
    rounded: "{rounded.md}"
  card-default:
    backgroundColor: "{colors.water-white}"
    textColor: "{colors.deep-sea}"
    rounded: "{rounded.md}"
    padding: "1rem 1.5rem"
  input-default:
    backgroundColor: "{colors.water-white}"
    textColor: "{colors.deep-sea}"
    rounded: "{rounded.md}"
    height: "42px"
  modal-card:
    backgroundColor: "{colors.water-white}"
    rounded: "{rounded.xl}"
  nav-link:
    rounded: "{rounded.lg}"
    padding: "0.7rem 1.1rem"
---

# Design System: JASRAPO Frontend

## Overview

**Creative North Star: "The Corporate Lagoon"**

A calm, professional water metaphor governs the whole system: deep teal as the corporate anchor, white as the dominant surface, and brighter turquoise reserved for hover and active states. The interface feels like still water — quiet, precise, and trustworthy — with the primary accent appearing only where the user needs to act or know what is selected. Nothing shouts; the teal is the voice.

This is a dense operational tool (role-based dashboards, tables of meters/clients/tariffs, billing workflows), so scanability and consistency outrank expression. Bootstrap 5 provides the grid, spacing, and utility layer; Angular Material 3 components (using azure primary, blue tertiary, Roboto) handle the advanced widgets. A thin custom SCSS layer applies the water palette and the recurring component vocabulary (custom tables, soft badges, page headers, modal cards).

**Key Characteristics:**
- Flat surfaces at rest; shadows appear only on elevation (cards, dropdowns, modals) and state (hover/focus)
- One teal voice — `#0c9ea1` deep lagoon for primary actions, `#0fc3c6` vivid turquoise for hover
- Soft pastel tints (`water-mist #dbf7f8`, `foam #bff3f4`) for badges, avatars, page-header icons, and active nav — never full-saturation backgrounds
- Radius language: 8px for interactive controls, 10px for nav, 16px for modals and empty-state icons, 50% for avatars
- 0.2s ease-in-out transitions everywhere; 0.3s cubic-bezier(0.4, 0, 0.2, 1) for the shell (sidebar, drawer)

## Colors

A single-hue teal/turquoise family over white, with dark slate-teal text instead of pure black. State colors are the standard Tailwind/Bootstrap semantic set and stay limited to their roles.

### Primary
- **Deep Lagoon** (#0c9ea1): The corporate anchor. Primary buttons, active nav text and left border, links, focus rings, selected checkboxes, row-hover tints.
- **Vivid Turquoise** (#0fc3c6): Hover/active escalation of Deep Lagoon. Button hover/focus, link hover, avatar hover accents.
- **Lagoon Glow** (#4ee6e9): Brightest accent; reserved for the most energetic highlights and active-state glow.

### Secondary
- **Foam** (#bff3f4): Softest highlight tone; large light areas that need a whisper of the brand (light info surfaces).
- **Water Mist** (#dbf7f8): The workhorse soft tint — page-header icons, type badges, client avatars, empty-state icons, active nav backgrounds, selected-row tints.

### Neutral
- **Water White** (#ffffff): Dominant surface — app background, cards, tables, sidebar, modals.
- **Deep Sea** (#0e2728): Primary text. A very dark slate-teal that reads as black but stays in the water family.
- **Muted Tide** (#597b7d): Secondary text — labels, table cells, placeholders, disabled content.
- **Marine Ink** (#0f172a): Headings only (h1–h6), tighter and heavier than body text.
- **Shoreline** (#cbdedf): Borders and dividers — card borders, table row separators, sidebar edge, input strokes at rest.

### Named Rules
**The One Voice Rule.** Deep Lagoon is used on a small fraction of any screen. Its rarity is the point — when everything is teal, nothing is teal. Keep large surfaces white and reserve teal for actions, selection, and emphasis.

**The Soft Tint Rule.** Never use a full-saturation background. Badges, avatars, icons, and active nav use pastel tints (water-mist, foam); the saturated teal appears only as text, borders, and button fills.

## Typography

**Display Font:** Inter (fallback: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)
**Body Font:** Inter (same stack)
**Component Font:** Roboto — Angular Material 3 components via `mat.theme()` typography

**Character:** A clean, modern sans stack with tight tracking on headings (`-0.025em`) for a contemporary corporate feel. Body text runs at 1.6 line-height for comfortable density in data-heavy screens.

### Hierarchy
- **Headline** (700, 1.5rem+ per Bootstrap h1–h6, -0.025em tracking, marine-ink): Page titles and card section titles. E.g. `h3 fw-bold text-dark fs-4` for page headers, `h5 fw-bold fs-6` for card headers.
- **Body** (400, 1rem, 1.6 line-height, deep-sea): Content text, table cells (`0.9rem`), paragraphs.
- **Label** (600, 0.9rem, deep-sea/muted-tide): Form labels and emphasized field captions.
- **Table Header** (600, 0.8rem, uppercase, 0.5px letter-spacing, muted-tide): `custom-table` column headers — the uppercase micro-style is a system signature.
- **Badge** (600, 0.75rem, 0.3px letter-spacing): Badge labels.
- **Nav** (500, 0.925rem; sub-links 0.875rem): Sidebar navigation.

### Named Rules
**The Uppercase Column Rule.** Table headers are always 0.8rem, weight 600, uppercase with 0.5px tracking. Do not style table headers as plain body text.

## Layout

The application shell is a fixed flex layout: 260px white sidebar (collapsible to a 70px icon rail on desktop ≥992px; off-canvas drawer with overlay under 992px), a 64px header, and a content region with `2rem` padding and its own vertical scroll.

- **Shell:** `flex; height: 100vh; overflow: hidden`. Sidebar and content each own their scroll; the page never scrolls as one document.
- **Responsive:** Desktop keeps the sidebar mounted (collapsing to 70px icon rail); mobile converts it to a fixed drawer with a dark overlay (`rgba(0,0,0,0.5)`) and collapses to full width.
- **Page rhythm:** Page header (title + actions) → optional alert → a white card containing the filter/search toolbar and the data table. `mb-4` (1.5rem) separates the header from the card.
- **Spacing:** Bootstrap utility scale is the source of truth (`gap-2/3`, `px-4`, `pt-4`, `mb-4`). Content padding is `2rem`; card headers use `1.5rem` horizontal padding.
- **Tables:** `custom-table` with `0.875rem 1.25rem` cell padding; `border-collapse: separate` keeps row borders crisp.

## Elevation & Depth

Flat by default, with shadows as a deliberate elevation signal. Resting surfaces — cards at rest, the sidebar, tables — are flat or carry only a whisper shadow. Shadows appear for floating/elevated layers and as a response to state.

### Shadow Vocabulary
- **Card** (`0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`): The `.card-shadow` utility; light ambient lift for standalone cards.
- **Dropdown** (`0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -2px rgba(15,23,42,0.04)`): Floating menus.
- **Modal** (`0 20px 60px rgba(0,0,0,0.18)`): The modal card is the highest elevation in the system — deep, soft shadow plus a backdrop of `rgba(15,23,42,0.45)`.
- **Button hover / focus** (`0 4px 10px -2px rgba(15,195,198,0.2)`): A teal-tinted glow under primary buttons on hover/focus.
- **Row hover** (`rgba(12,158,161,0.04–0.06)` background tint, not a shadow): Table and selectable-row feedback is a color wash, never an elevation change.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only for floating layers (dropdown, modal) or as a response to state (hover, focus). Do not shadow resting cards or rows.

## Shapes

A rounded, approachable form language with a consistent radius ladder. Corners are soft but not pill-shaped except for avatars and icon buttons.

- **6px (sm):** Simple form controls (`form-control-simple`), small type badges.
- **8px (md):** Standard form controls, primary/outline buttons, page-size select, sub-nav links, Bootstrap card `rounded-3`.
- **10px (lg):** Main sidebar nav links.
- **12px:** Page-header icons (48px squares), detail cards.
- **16px (xl):** Modal cards, empty-state icons (64px squares).
- **50% (pill):** Avatars (36px user avatar, 34px client avatar), icon buttons (`btn-icon`), collapsed-rail nav circles (44px).

Borders are 1px `shoreline` except table headers, which use a 2px bottom border. Active nav uses a 3px left accent border.

## Components

### Buttons
- **Shape:** 8px radius; icon+label buttons use `d-flex align-items-center gap-2`.
- **Primary:** Deep Lagoon fill, white text (`btn-primary` / `btn-brand-primary`). Hover/focus/active shift to Vivid Turquoise with the teal glow shadow (`0 4px 10px -2px` teal tint) and optional `translateY(-1px)` lift.
- **Outline:** `btn-outline-primary` — Deep Lagoon text and border; hover inverts to Deep Lagoon fill with white text.
- **Icon action buttons (tables):** 30px squares, 7px radius, transparent background. View = gray (`#6c757d`), Edit = Deep Lagoon, Delete = `#dc3545` red; hover adds a soft pastel wash matching the role.
- **Filter pills:** Text-only `btn-filter`; active state gets a white background + `#e2e8f0` border.

### Chips / Badges
- **Style:** `0.4rem 0.8rem` padding, 0.75rem, weight 600, 0.3px tracking, 6px radius.
- **Role badges (system signature):** Pastel + saturated text pairs — Admin (blue `#dbeafe`/`#1d4ed8`), Presidente (green `#dcfce7`/`#15803d`), Secretario (yellow `#fef9c3`/`#854d0e`), Tesorero (red `#fee2e2`/`#991b1b`), default (gray `#f3f4f6`/`#374151`).
- **Status badges:** `badge-soft-success` (#dcfce7/#166534), `badge-soft-warning` (#ffedd5/#9a3412), `badge-soft-danger` (#fee2e2/#991b1b).

### Avatars
- 36px circles for the header/user list; 34px for client rows; 48px in the dashboard welcome.
- Initials avatars use role-tinted pastels (matching role badges) or water-mist with Deep Lagoon text. Photos render `object-fit: cover`.

### Cards / Containers
- **Corner Style:** 8px (Bootstrap `rounded-3`) for content cards; 16px for modal cards.
- **Background:** white; `border-0` on content cards, `shadow-sm` optional.
- **Card header:** white, no bottom border, `pt-4 pb-3 px-4`, holds the section title + toolbar (search, primary action, bulk actions).
- **Shadow Strategy:** `shadow-sm`/`card-shadow` at rest; no shadow escalation on hover.
- **Detail cards:** 12px radius, `1px #e9ecef` border; hover adds a faint `0 2px 8px` shadow.

### Inputs / Fields
- **Style:** `form-control`/`form-select` — 8px radius, `min-height: 42px`, `1px #dee2e6` border at rest, white background, 0.9rem text.
- **Focus:** Deep Lagoon border + 3px teal ring (`rgba(15,195,198,0.2)`), no default outline. In modals the focus ring uses the blue variant (`#3b82f6` at 12%).
- **Labels:** `form-label` — weight 600, 0.9rem, `#212529`.
- **Error:** Bootstrap danger alert or inline `text-danger` at 0.78rem.

### Navigation (Sidebar)
- **Structure:** 260px rail with brand (38px logo), optional search, icon+label links with chevrons, collapsible sub-menus; collapses to 44px circular icon buttons on desktop.
- **Links:** `nav-link-custom` — 10px radius, 0.925rem weight 500, `3px transparent` left border. Hover: white background + Deep Lagoon text. **Active:** soft water-mist gradient (`rgba(12,158,161,0.08→0.02)`), Deep Lagoon text, weight 600, `3px` Deep Lagoon left border.
- **Sub-links:** `nav-link-sub` — 8px radius, 0.875rem, muted-tide; active gets water-mist background.
- **Transitions:** `0.2s cubic-bezier(0.4, 0, 0.2, 1)` on links; icon rotation `-180deg` on expand.

### Modals
- `modal-card`: white, 16px radius, `0 20px 60px rgba(0,0,0,0.18)`, max-width 520px (420px for `modal-card-sm`), centered with `1rem` padding and a `rgba(15,23,42,0.45)` backdrop.
- Header `1.25rem 1.5rem` with a `#f1f5f9` divider; body `1.5rem` (scrolls at `max-height: 70vh`); footer `1rem 1.5rem`, `#f8fafc` background, bottom corners 16px.
- Animations: backdrop `fadeIn 0.2s`, card `slideUp 0.25s` (translateY 20px → 0).

### Confirm Dialog
- A `modal-card-sm` (max-width 440px) built from the global modal classes. Icon + title header, centered message body (`py-4`, `text-secondary`), right-aligned action footer.
- **Danger mode:** title and confirm button turn `danger` (`#ef4444`) with the `bi-exclamation-triangle-fill` icon; default mode uses the primary teal button with `bi-question-circle-fill`.
- Buttons: outline-secondary `Cancelar` + solid `Aceptar` (`px-4`), matching the modal-footer layout.

### Toasts / Notifications
- `custom-toast`: 360px wide, 12px radius, translucent tinted background with `backdrop-filter: blur(8px)`, `0 4px 20px -2px rgba(15,23,42,0.06)` + `0 2px 8px -1px` shadow. Stacked top-right (`top-0 end-0 p-4`, z-index 1090).
- **Entrance:** `toastFadeIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)` — a slide-in from the right with an elastic overshoot.
- **Structure:** 30px circular icon tile → title (0.85rem, 600) + message (0.78rem) → ghost close button. Optional 2px progress bar at the bottom shrinking over the toast duration.
- **Semantic variants** (tinted surfaces + saturated accents): success (green `#d1fae5`/`#059669`, progress `#34d399`), error (red `#fee2e2`/`#dc2626`), warning (amber `#fef3c7`/`#d97706`), info (blue `#e0f2fe`/`#0284c7`).

### Loading Overlay / Spinner
- Full-screen overlay (`inset: 0`, z-index 9999, `rgba(0,0,0,0.4)` with `backdrop-filter: blur(2px)`), fading in `0.15s ease-out`.
- Spinner: the "lds-ellipsis" three-dot bouncing animation, 80px box, dots `13.33px` circles in **Deep Lagoon** (`currentColor` from `--primary-color`).

### Breadcrumb
- 0.82rem text; home icon (`bi-house-door`) link, divider and active color from the water tokens (`--dark-text` active, `--muted-text` divider). Active crumb is `fw-semibold`. Only rendered when more than one crumb exists.

### Dropdown Menu
- Floating panel: `0.5rem` radius, `1px var(--border-color)` border, `0 10px 15px -3px rgba(15,23,42,0.08)` + `0 4px 6px -2px` shadow, `min-width: 10rem` (160px in the shared component), anchored below the trigger with `0.5rem` offset.
- Items: 0.5rem/1rem padding; hover = `#e0f2fe` background + Deep Lagoon text; danger items (`text-danger`) hover = `#f8d7da` + `#dc3545`. Divider = `dropdown-divider`.

### Pagination
- `pagination-container`: flex row, total/range info left, controls right; `page-size-select` (6px radius, `min-width: 65px`, 0.825rem) for rows per page.
- Page buttons: 32px squares, 6px radius, `#495057` text, `gap-1` spacing. Hover: `#f8f9fa` wash + `translateY(-1px)`. **Active:** Deep Lagoon fill with the card shadow; disabled at 55% opacity, no pointer events.
- Prev/Next: ghost text links with chevron icons (0.75rem). Ellipsis `...` as a disabled spacer.

### Page Header (system signature)
- Title (`h3 fw-bold`) + optional 48px square icon in a `12px` radius water-mist tile with Deep Lagoon glyph, aligned with `gap-1rem`.

### Empty States
- Centered, `3.5rem` vertical padding; a 64px square `16px` radius water-mist icon tile at `opacity: 0.65` above the message.

## Do's and Don'ts

### Do:
- **Do** use Deep Lagoon (`#0c9ea1`) for the primary action of any screen, and Vivid Turquoise (`#0fc3c6`) for its hover state.
- **Do** keep large surfaces white — the teal voice is reserved for actions, selection, links, and emphasis.
- **Do** use water-mist (`#dbf7f8`) for page-header icon tiles, type badges, client avatars, and active nav backgrounds.
- **Do** style table headers as 0.8rem uppercase with 0.5px tracking (the Uppercase Column Rule).
- **Do** use Bootstrap 5 utilities (grid, spacing, display) and the existing SCSS tokens (`var(--primary-color)`, etc.) instead of inline styles or new hex values.
- **Do** keep the radius ladder: 8px controls, 10px nav, 16px modals, 50% avatars.
- **Do** use soft pastel role/status badges with saturated text — never full-saturation backgrounds.
- **Do** keep UI copy in Spanish, code identifiers in English, and DTO/interface fields in Spanish (per `docs/standards/FRONTEND_STANDARDS.md`).
- **Do** use 0.2s ease-in-out for micro-interactions and 0.3s cubic-bezier(0.4, 0, 0.2, 1) for shell animations.

### Don't:
- **Don't** introduce new accent colors outside the teal/turquoise family — the palette is one voice.
- **Don't** use pure black (`#000`) for text; use Deep Sea (`#0e2728`) or Marine Ink (`#0f172a`) for headings.
- **Don't** shadow resting surfaces — flat by default, shadows only on elevation and state.
- **Don't** use full-saturation colored backgrounds for badges, avatars, or nav states.
- **Don't** add inline `style="..."` attributes; use utility classes or the component's `.scss` file.
- **Don't** restyle `custom-table` headers as plain body text.
- **Don't** mix in Bootstrap's default blue (`#0d6efd`) or new blue focus rings where the teal ring (`rgba(15,195,198,0.2)`) is already the established focus language — keep new surfaces consistent with the water palette.