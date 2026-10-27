# Permanent Rules for AI Agents

These rules are permanent and mandatory for any AI agent working in this repository.

---

## 1. Project Overview & Architecture

- **Project:** Multi-vendor marketplace demo.
- **Repository Structure (Monorepo):**
  - `backend/`: Node.js + Express, MongoDB, Redis, Elasticsearch, Supabase Storage via S3-compatible API, built-in sandbox payment gateway modeled on Razorpay Route.
  - `frontend/`: React + Vite, JavaScript, plain CSS with design tokens.

---

## 2. UI Tech Stack & Styling Constraints

- **Plain CSS only:** Write React components with plain CSS only.
- **No external UI/chart/icon libraries:** Never install or use Tailwind CSS, UI kits (Bootstrap, Material UI, Ant Design, shadcn/ui), icon libraries (Lucide, React Icons, FontAwesome), or charting libraries (Recharts, Chart.js).
- **Hand-made SVG:** Use inline SVG icons and hand-made SVG/CSS charts for analytics and dashboards.
- **Translate Stitch styles:** If Stitch designs use Tailwind or utility classes, translate them into normal semantic CSS classes and variables in our stylesheets (`index.css` or component CSS files).

---

## 3. Strict Scope Isolation During UI Tasks

- **UI tasks are strictly visual:** Modify only JSX structure, `className`, and CSS stylesheets.
- **Preserve logic and data flow:** Never change `backend/`, API calls, authentication flows, Context providers (`AuthContext`, `CartContext`), custom hooks, routing definitions, component state, or business logic during UI tasks.

---

## 4. Stitch Design vs. Application Source of Truth

- **Stitch is reference for LOOK and LAYOUT only.**
- **Existing features and real API data are the source of truth.**
- **Ignore unsupported Stitch features:** Ignore anything shown in Stitch that our application does not support (e.g. escrow, seller document upload, category specializations, fake sample names, sample prices, or mock images).
- **Never hardcode sample data:** Always render real data from the backend APIs and state.

---

## 5. Honest Copy & Demo Notices

- **No unverified claims:** Keep copy honest. Do not use claims such as *escrow*, *certified*, *verified*, *guaranteed*, or *bank-grade*.
- **Mandatory demo notice:** Always keep the exact notice visible on the footer, checkout page, and test payment modal:
  > *"Demo project: payments are simulated in a test gateway, no real money is charged."*

---

## 6. Functional Continuity & Fallbacks

- **Keep all UI states intact:** Retain loading skeletons/spinners, empty states, and error alerts.
- **Image fallback:** Always maintain the local `/placeholder.svg` image fallback for missing, broken, or loading images.
- **Role checks:** Preserve all role-based access checks (Customer, Vendor, Admin) and protected route guards.
- **Preserve existing features:** Never break or remove existing functionality while restyling.

---

## 7. Responsive Design Rules (Derive Mobile from Desktop)

Since Stitch provides only desktop screens, derive mobile views from desktop using these responsive rules:
- **Breakpoint `< 1100px`:**
  - Desktop navbar collapses into a mobile hamburger menu / slide-in drawer.
  - Multi-column page layouts stack into a single column.
  - Filter sidebars convert into slide-in drawers.
  - Vendor and Admin sidebars convert into a sticky top tab bar.
- **Breakpoint `< 768px`:**
  - Data tables scroll horizontally or convert into stacked cards.
  - Checkout and Product Detail pages maintain a sticky bottom action bar.
- **Breakpoint `< 600px`:**
  - Action buttons stack full-width with a minimum touch-target height of 44px (`min-height: 44px`).
- **No horizontal page scrolling:** Layouts must fit viewport widths down to 360px without clipping or horizontal page scroll (`overflow-x: hidden`).

---

## 8. Environment & Build Guards

- **Demo credential buttons:** Fast-fill demo credentials on login/register pages must **never** appear in production builds. Render them only in development:
  ```jsx
  {import.meta.env.DEV && (
    /* Demo credential fill buttons */
  )}
  ```

---

## 9. Workflow & Verification Rules

- **One screen at a time:** Focus on and complete work on a single screen/page at a time.
- **Build verification:** After completing each UI task, run `npm run build` in `frontend/` to ensure the production build succeeds without errors.
- **Changelog listing:** In your final response, explicitly list every file that was changed.

