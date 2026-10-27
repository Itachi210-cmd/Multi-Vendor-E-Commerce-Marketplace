# Design System — Multi-Vendor Marketplace

Extracted from the **"Multi-Vendor Marketplace Web"** Stitch project and cross-referenced with the existing `frontend/src/index.css` design tokens.

> **AGENTS.md is the source of truth for rules.** This document is a reference for *look and layout* only. See [`AGENTS.md`](./AGENTS.md) for mandatory constraints (plain CSS only, no Tailwind, no UI kits, no chart libraries, etc.).

---

## Stitch Screens

The Stitch project contains **11 screens** (all desktop, 1280×n):

| # | Screen Name | Covers |
|---|---|---|
| 1 | **Marketplace Home** | Hero, featured categories, product grid, footer |
| 2 | **Customer E-Commerce Flow** | Login, Register, search bar, account dropdown |
| 3 | **Customer Product Listing & Detail** | Search results grid, filter sidebar, product detail page, reviews |
| 4 | **Customer Shopping Cart & Checkout** | Cart summary, checkout form, order summary, payment section |
| 5 | **Customer Orders & Tracking** | Order history list, order detail, status timeline, invoice |
| 6 | **Admin Analytics & Vendor Approvals** | Revenue dashboard, charts, vendor approval cards |
| 7 | **Admin Orders & Payouts Management** | Admin order table, payout table, status filters |
| 8 | **Vendor & Admin Ecosystem** | Vendor dashboard overview, admin users/coupons |
| 9 | **Vendor Product Management & Add/Edit** | Product list table, add/edit product form |
| 10 | **Vendor Orders & Earnings** | Vendor order table, earnings summary, payout history |
| 11 | **Store Profile & Seller Onboarding** | Vendor application form, public store profile page |

---

## 1. Color Palette

### 1.1 Brand Colors (CSS Variables in `index.css`)

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#0284C7` | Primary actions, active states, key interactive elements |
| `--color-primary-dark` / `--color-primary-hover` | `#0369A1` | Hover states, enhanced contrast on light backgrounds |
| `--color-primary-light` | `#0EA5E9` | Focus rings, secondary highlights, interactive cues |
| `--color-accent` | `#06B6D4` | Promotional callouts, vibrant highlights |
| `--color-accent-hover` | `#0891B2` | Accent hover state |

### 1.2 Surfaces & Backgrounds

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#F0F9FF` | Page background — cool, airy tint (Sky 50) |
| `--color-bg-soft` | `#E0F2FE` | Subtle container fills, hover tints (Sky 100) |
| `--color-surface` | `#FFFFFF` | Cards, panels — pure white for product focus |
| `--color-surface-hover` | `#F0F9FF` | Card/row hover state |
| `--color-border` | `#BAE6FD` | Low-contrast separators (Sky 200) |
| `--color-border-subtle` | `#E0F2FE` | Even softer borders (Sky 100) |

### 1.3 Text

| Token | Value | Usage |
|---|---|---|
| `--color-text` / `--color-text-main` | `#0F172A` | Primary text — deep slate (Slate 900) |
| `--color-text-muted` | `#475569` | Metadata, captions, descriptions (Slate 600) |
| `--color-text-light` | `#64748B` | Tertiary text, placeholders (Slate 500) |
| `--color-text-inverse` | `#FFFFFF` | Text on dark/primary backgrounds |

### 1.4 Neutrals (Gray Scale)

| Token | Value | Stitch Role |
|---|---|---|
| `--color-gray-50` | `#F8FAFC` | Lightest surface |
| `--color-gray-100` | `#F0F9FF` | Tinted background |
| `--color-gray-200` | `#E0F2FE` | Soft fills |
| `--color-gray-300` | `#BAE6FD` | Borders |
| `--color-gray-400` | `#7DD3FC` | Muted interactive |
| `--color-gray-500` | `#64748B` | Muted text |
| `--color-gray-600` | `#475569` | Secondary text |
| `--color-gray-700` | `#334155` | Strong muted |
| `--color-gray-800` | `#1E293B` | Dark accents |
| `--color-gray-900` | `#0F172A` | Headings, primary text |

### 1.5 Status / Semantic Colors

| Status | Color | Background | Border | Used for |
|---|---|---|---|---|
| **Success** | `#10B981` | `#ECFDF5` | `#A7F3D0` | Paid, Delivered, Processed, Approved |
| **Warning** | `#F59E0B` | `#FFFBEB` | `#FDE68A` | Pending, Packed, Under Review |
| **Danger** | `#EF4444` | `#FEF2F2` | `#FECACA` | Failed, Cancelled, Rejected, Reversed |
| **Info (Primary)** | `#0284C7` | `#F0F9FF` | `#BAE6FD` | Shipped, Active, In-progress |

### 1.6 Stitch Extended Material Palette

These are in the Stitch theme but mapped to our simpler tokens above. Listed for reference only — use our CSS variables, not these directly:

| Stitch Token | Value | Mapped To |
|---|---|---|
| `primary` | `#006194` | → `--color-primary` (`#0284C7`) |
| `primary-container` | `#007BB9` | → `--color-primary` hover range |
| `secondary` | `#006399` | → `--color-primary` family |
| `tertiary` | `#006577` | → `--color-accent` family |
| `error` | `#BA1A1A` | → `--color-danger` (`#EF4444`) |
| `surface` | `#FAF8FF` | → `--color-bg` (`#F0F9FF`) |
| `on-surface` | `#131B2E` | → `--color-text` (`#0F172A`) |
| `outline` | `#707881` | → `--color-text-light` (`#64748B`) |
| `outline-variant` | `#BFC7D2` | → `--color-border` (`#BAE6FD`) |

---

## 2. Typography

### 2.1 Font Families

| Role | Stitch Font | Our Implementation |
|---|---|---|
| **Headlines** | Plus Jakarta Sans | System font stack (see `--font-family`). Use `font-weight: 600–700`. |
| **Body** | Inter | System font stack. Use `font-weight: 400`. |
| **Labels** | Inter | System font stack. Use `font-weight: 500`. |

> **Note:** The Stitch design specifies Google Fonts (Plus Jakarta Sans / Inter). Our app uses a system font stack for performance. When restyling, match the *weight and size* — do not import external fonts unless explicitly approved.

### 2.2 Type Scale

| Level | Stitch Spec | Our Token | Weight | Line Height |
|---|---|---|---|---|
| **Headline XL** | 40px / Plus Jakarta Sans | `--font-4xl` (2.25rem ≈ 36px) | 700 | 48px |
| **Headline LG** | 32px / Plus Jakarta Sans | `--font-3xl` (1.875rem = 30px) | 600 | 40px |
| **Headline MD** | 24px / Plus Jakarta Sans | `--font-2xl` (1.5rem = 24px) | 600 | 32px |
| **Headline SM** | 18px / Plus Jakarta Sans | `--font-lg` (1.125rem = 18px) | 600 | 24px |
| **Body LG** | 16px / Inter | `--font-base` (1rem = 16px) | 400 | 24px |
| **Body MD** | 14px / Inter | `--font-sm` (0.875rem = 14px) | 400 | 20px |
| **Body SM** | 12px / Inter | `--font-xs` (0.75rem = 12px) | 400 | 16px |
| **Label MD** | 14px / Inter | `--font-sm` (0.875rem) | 500 | 20px |
| **Label SM** | 12px / Inter | `--font-xs` (0.75rem) | 500 | 16px |

### 2.3 Currency Formatting

All prices use the Indian Rupee symbol (`₹`) with proper digit grouping (e.g. `₹1,24,999`).

---

## 3. Spacing

### 3.1 Spacing Scale (8px rhythm)

| Token | Value | Stitch Name |
|---|---|---|
| `--space-1` | `4px` | `space-xs` |
| `--space-2` | `8px` | `space-sm` |
| `--space-3` | `12px` | — |
| `--space-4` | `16px` | `space-md` |
| `--space-6` | `24px` | `space-lg` / `gutter` |
| `--space-8` | `32px` | `margin` |
| `--space-12` | `48px` | `space-xl` |

### 3.2 Layout Metrics

| Metric | Value |
|---|---|
| **Max content width** | `1200px` (`--max-width`) |
| **Page margin (desktop)** | `32px` |
| **Page margin (mobile)** | `16px` |
| **Column gutter** | `24px` |
| **Card internal padding** | `24px` (desktop), `16px` (mobile) |
| **Section spacing** | `48px` between major sections |

---

## 4. Border Radius

| Token | Value | Stitch Equivalent | Usage |
|---|---|---|---|
| `--radius-xs` | `4px` | `rounded-sm` (0.25rem) | Chips, small badges, tags |
| `--radius-sm` | `6px` | — | Small buttons, inputs in tight layouts |
| `--radius-md` | `10px` | `rounded-md` (0.75rem ≈ 12px) | Cards, buttons, input fields, dropdowns |
| `--radius-lg` | `16px` | `rounded-lg` (1rem) | Large containers, modals, hero sections |
| `--radius-xl` | `24px` | `rounded-xl` (1.5rem) | Banner cards, promotional containers |
| `--radius-full` | `9999px` | `rounded-full` | Avatars, pill badges, circular buttons |

> **Design intent:** The Stitch design uses a consistent **12px roundedness** as the default for cards, buttons, and input fields. Our `--radius-md` (10px) is the closest match — use it as the standard component radius.

---

## 5. Shadows (Blue-Tinted)

All shadows use the primary blue (`#0284C7` = `rgb(2, 132, 199)`) at low opacity instead of black, maintaining warmth and brand cohesion.

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px 0 rgba(2,132,199,0.04)` | Subtle lift for flat elements |
| `--shadow-sm` | `0 1px 3px 0 rgba(2,132,199,0.08), 0 1px 2px -1px rgba(2,132,199,0.04)` | Default card resting state |
| `--shadow-md` | `0 4px 8px -1px rgba(2,132,199,0.08), 0 2px 4px -2px rgba(2,132,199,0.04)` | Elevated cards, dropdowns |
| `--shadow-lg` | `0 10px 16px -3px rgba(2,132,199,0.08), 0 4px 6px -4px rgba(2,132,199,0.04)` | Modals, popovers |
| `--shadow-xl` | `0 20px 25px -5px rgba(2,132,199,0.09), 0 8px 10px -6px rgba(2,132,199,0.04)` | Hero elements, overlays |

**Hover elevation:** Cards elevate from `--shadow-sm` → `--shadow-md` on hover to reinforce interactivity.

---

## 6. Z-Index Scale

| Token | Value | Usage |
|---|---|---|
| `--z-dropdown` | `1000` | Dropdown menus, autocomplete |
| `--z-sticky` | `1020` | Sticky headers, tab bars |
| `--z-fixed` | `1030` | Fixed navbars |
| `--z-drawer-backdrop` | `1040` | Drawer overlay |
| `--z-drawer` | `1050` | Slide-in drawers (mobile nav, filter sidebar) |
| `--z-modal-backdrop` | `1060` | Modal overlay |
| `--z-modal` | `1070` | Modals (Test Gateway, confirmations) |
| `--z-toast` | `1080` | Toast notifications |
| `--z-popover` | `1090` | Tooltips, popovers |

---

## 7. Transitions

| Token | Value |
|---|---|
| `--transition` | `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` |

Apply to interactive elements: buttons, links, cards, inputs, drawers. Use on `background-color`, `border-color`, `box-shadow`, `transform`, `opacity`.

---

## 8. Component Styles

### 8.1 Buttons

All buttons: `min-height: 44px`, `border-radius: var(--radius-md)`, `font-weight: 500`, `cursor: pointer`, `transition: var(--transition)`.

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| **Primary** | `--color-primary` (`#0284C7`) | `#FFFFFF` | none | `--color-primary-dark` (`#0369A1`) |
| **Secondary / Outline** | `#FFFFFF` | `--color-primary` | `1px solid var(--color-border)` | `--color-bg-soft` background |
| **Danger** | transparent | `--color-danger` (`#EF4444`) | `1px solid var(--color-danger)` | `--color-danger-bg` background |
| **Ghost** | transparent | `--color-text-muted` | none | `--color-bg-soft` background |
| **Icon button** | transparent | `--color-text-muted` | none | `--color-bg-soft` background, `border-radius: var(--radius-full)` |

```css
/* Primary button example */
.btn-primary {
  min-height: 44px;
  padding: 10px 24px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}
.btn-primary:hover {
  background: var(--color-primary-dark);
}
```

### 8.2 Input Fields

| Property | Value |
|---|---|
| **Min height** | `44px` |
| **Background** | `#FFFFFF` |
| **Border** | `1px solid var(--color-border)` (`#BAE6FD`) |
| **Border radius** | `var(--radius-md)` (10px) |
| **Padding** | `10px 14px` |
| **Font size** | `var(--font-sm)` (14px) |
| **Placeholder color** | `var(--color-text-light)` (`#64748B`) |
| **Focus border** | `var(--color-primary)` (`#0284C7`) |
| **Focus ring** | `0 0 0 3px rgba(14, 165, 233, 0.15)` (primary-light at 15%) |

```css
/* Input field example */
.input {
  min-height: 44px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  color: var(--color-text);
  transition: var(--transition);
}
.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
}
```

### 8.3 Cards

| Property | Value |
|---|---|
| **Background** | `var(--color-surface)` (`#FFFFFF`) |
| **Border** | `1px solid var(--color-border)` (`#BAE6FD`) |
| **Border radius** | `var(--radius-md)` (10px) |
| **Shadow (rest)** | `var(--shadow-sm)` |
| **Shadow (hover)** | `var(--shadow-md)` |
| **Padding** | `var(--space-6)` (24px) |

```css
/* Card example */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
  transition: var(--transition);
}
.card:hover {
  box-shadow: var(--shadow-md);
}
```

### 8.4 Product Cards

Same as Card base, plus:

| Property | Value |
|---|---|
| **Image container** | `aspect-ratio: 1 / 1`, `overflow: hidden`, `border-radius: var(--radius-md) var(--radius-md) 0 0` |
| **Image hover** | `transform: scale(1.05)` with `transition: transform 0.3s ease` |
| **Content padding** | `var(--space-4)` (16px) |
| **Title** | `font-size: var(--font-sm)`, `font-weight: 500`, max 2 lines with `line-clamp` |
| **Price** | `font-size: var(--font-base)`, `font-weight: 600`, `color: var(--color-primary)` |
| **Rating stars** | Inline SVG, filled with `#F59E0B` (amber), empty with `#E0F2FE` |

### 8.5 Tables

| Property | Value |
|---|---|
| **Border** | `1px solid var(--color-border)` on table wrapper |
| **Border radius** | `var(--radius-md)` on wrapper |
| **Header background** | `var(--color-bg-soft)` (`#E0F2FE`) |
| **Header text** | `font-size: var(--font-xs)`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.05em`, `color: var(--color-text-muted)` |
| **Cell padding** | `12px 16px` |
| **Row border** | `1px solid var(--color-border-subtle)` (`#E0F2FE`) |
| **Row hover** | `background: var(--color-surface-hover)` (`#F0F9FF`) |
| **Overflow (mobile)** | `overflow-x: auto` on wrapper |

### 8.6 Badges / Chips / Status Tags

| Property | Value |
|---|---|
| **Padding** | `4px 10px` |
| **Border radius** | `var(--radius-full)` (pill) |
| **Font size** | `var(--font-xs)` (12px) |
| **Font weight** | `500` |

Status color mapping:

| Status | Background | Text |
|---|---|---|
| Paid / Delivered / Approved | `--color-success-bg` | `--color-success` |
| Pending / Packed | `--color-warning-bg` | `--color-warning-dark` |
| Shipped / Active | `rgba(2,132,199,0.1)` | `--color-primary` |
| Failed / Cancelled / Rejected | `--color-danger-bg` | `--color-danger` |

### 8.7 Navbar

| Property | Value |
|---|---|
| **Height** | `64px` |
| **Background** | `var(--color-surface)` (`#FFFFFF`) |
| **Border bottom** | `1px solid var(--color-border)` |
| **Shadow** | `var(--shadow-xs)` |
| **Position** | `sticky`, `top: 0`, `z-index: var(--z-fixed)` |
| **Max content width** | `var(--max-width)` (1200px), centered |
| **Logo** | Left-aligned, `font-weight: 700`, `color: var(--color-primary)` |
| **Nav links** | `font-weight: 500`, `color: var(--color-text-muted)`, hover: `--color-primary` |
| **Cart badge** | `background: var(--color-primary)`, `color: white`, `border-radius: var(--radius-full)`, `min-width: 18px`, `font-size: 11px` |
| **Collapse breakpoint** | `< 1100px` → hamburger icon + slide-in drawer |

### 8.8 Sidebar (Vendor / Admin)

| Property | Value |
|---|---|
| **Width** | `250px` (desktop) |
| **Background** | `var(--color-surface)` |
| **Border right** | `1px solid var(--color-border)` |
| **Nav item padding** | `12px 16px` |
| **Nav item hover** | `background: var(--color-bg-soft)`, `color: var(--color-primary)` |
| **Active item** | `background: var(--color-bg-soft)`, `color: var(--color-primary)`, `font-weight: 600`, left border `3px solid var(--color-primary)` |
| **Collapse breakpoint** | `< 1100px` → sticky horizontal tab bar at top |

### 8.9 Modals

| Property | Value |
|---|---|
| **Backdrop** | `rgba(15, 23, 43, 0.5)` with `backdrop-filter: blur(4px)` |
| **Background** | `var(--color-surface)` |
| **Border radius** | `var(--radius-lg)` (16px) |
| **Shadow** | `var(--shadow-xl)` |
| **Max width** | `480px` (small), `640px` (medium), `800px` (large) |
| **Padding** | `var(--space-6)` (24px) |
| **Header** | `font-weight: 600`, border-bottom `1px solid var(--color-border)`, padding-bottom `var(--space-4)` |
| **Z-index** | `var(--z-modal)` / backdrop: `var(--z-modal-backdrop)` |

### 8.10 Tabs

| Property | Value |
|---|---|
| **Container border** | `1px solid var(--color-border)` (bottom only) |
| **Tab padding** | `12px 20px` |
| **Tab font** | `font-size: var(--font-sm)`, `font-weight: 500` |
| **Inactive tab** | `color: var(--color-text-muted)`, `border-bottom: 2px solid transparent` |
| **Active tab** | `color: var(--color-primary)`, `border-bottom: 2px solid var(--color-primary)` |
| **Hover** | `color: var(--color-primary)`, `background: var(--color-bg-soft)` |

### 8.11 Tooltips / Popovers

| Property | Value |
|---|---|
| **Background** | `var(--color-gray-900)` (`#0F172A`) |
| **Text** | `#FFFFFF`, `font-size: var(--font-xs)` |
| **Border radius** | `var(--radius-sm)` (6px) |
| **Padding** | `6px 10px` |
| **Shadow** | `var(--shadow-md)` |
| **Z-index** | `var(--z-popover)` |

### 8.12 Toast Notifications

| Property | Value |
|---|---|
| **Position** | Fixed, top-right, `top: 80px`, `right: 24px` |
| **Background** | `var(--color-surface)` |
| **Border left** | `4px solid` (success/warning/danger color) |
| **Border radius** | `var(--radius-md)` |
| **Shadow** | `var(--shadow-lg)` |
| **Z-index** | `var(--z-toast)` |
| **Animation** | Slide in from right, `0.3s ease-out` |

---

## 9. Charts & Data Visualization (Hand-Made SVG/CSS)

Per AGENTS.md: **no chart libraries** (no Recharts, no Chart.js). All charts are hand-made with inline SVG and CSS.

### Color assignments for chart series:

| Series | Color | Usage |
|---|---|---|
| Primary | `#0284C7` | Revenue line, primary metric bars |
| Secondary | `#06B6D4` | Secondary metric, comparison series |
| Success | `#10B981` | Positive trends, delivered orders |
| Warning | `#F59E0B` | Pending items |
| Danger | `#EF4444` | Cancelled/failed |
| Muted | `#BAE6FD` | Grid lines, axis lines |

### Chart styling:

| Element | Style |
|---|---|
| **SVG container** | `width: 100%`, responsive via `viewBox` |
| **Grid lines** | `stroke: var(--color-border)`, `stroke-width: 1`, `stroke-dasharray: 4 4` |
| **Axis labels** | `font-size: 12px`, `fill: var(--color-text-muted)` |
| **Data points** | `r: 4`, `fill: var(--color-primary)`, hover `r: 6` |
| **Bar radius** | `rx: 4` on top corners |
| **Tooltip** | Follows tooltip component styles (§8.11) |

---

## 10. Responsive Breakpoints

Defined in AGENTS.md §7. Summarized here for quick reference:

| Breakpoint | Layout Changes |
|---|---|
| **≥ 1100px** | Full desktop: navbar links visible, multi-column layouts, filter sidebar inline, vendor/admin sidebar vertical |
| **< 1100px** | Hamburger menu + slide-in drawer; layouts stack to single column; filter sidebar → slide-in drawer; vendor/admin sidebar → sticky horizontal tab bar |
| **< 768px** | Tables → horizontal scroll or stacked cards; checkout & product detail → sticky bottom action bar |
| **< 600px** | Buttons stack full-width, `min-height: 44px`; page margins shrink to 16px |
| **≥ 360px** | Minimum supported width — no horizontal page scroll |

---

## 11. Image Handling

| Scenario | Behavior |
|---|---|
| **Product images** | Loaded from Supabase Storage URLs |
| **Missing / broken** | Fall back to local `/placeholder.svg` |
| **Loading state** | Skeleton placeholder (pulsing `var(--color-bg-soft)` block) |
| **Aspect ratio** | `1:1` for product thumbnails, `16:9` for banners |
| **Object fit** | `object-fit: cover` (global default in `index.css`) |

---

## 12. Accessibility

| Rule | Value |
|---|---|
| **Focus ring** | `0 0 0 3px rgba(14, 165, 233, 0.3)` on all interactive elements |
| **Touch targets** | Minimum `44px × 44px` |
| **Color contrast** | `#0F172A` on `#F0F9FF` passes WCAG AA (ratio > 10:1) |
| **Link underlines** | Underline on hover for text links |
| **Skip to content** | Present but visually hidden, shown on `:focus` |

---

*This document describes look and layout only. For mandatory rules and constraints, see [`AGENTS.md`](./AGENTS.md).*

