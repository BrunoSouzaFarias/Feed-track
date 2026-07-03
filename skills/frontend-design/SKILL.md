---
name: frontend-design
description: Guidelines and strict constraints for UI/UX, typography, layout, shapes, and responsive styling in the FEED-TRACK project to ensure a premium Executive Precision aesthetic.
---

# UI/UX & Frontend Design System (Executive Precision)

Always follow these rules when creating or modifying user interfaces, components, forms, and pages.

## 1. Aesthetic Identity & Theme
The design combines **Minimalism** with subtle **Glassmorphism**, achieving a "command center" feel under dark mode and a "clean gallery" feel under light mode.

*   **Borders**: Maximum `1px` stroke. Use low-contrast colors (`border-outline-variant/30`).
*   **Shadows**: Use custom soft ambient shadows (`shadow-custom`) instead of heavy default shadows.
    *   Light: `box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.05)`
    *   Dark: `box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.4)`
*   **Glassmorphism**: Use backdrop filters (`backdrop-blur-md` or `backdrop-blur-[20px]`) and translucent background tints for modals and floating elements (`glassmorphism` class).

## 2. Typography Constraints (Hanken Grotesk)
**Hanken Grotesk** is the sole typeface.
*   **Headlines**: Bold, tight letter-spacing.
*   **Body**: 16px (`text-xs` or `text-sm` for small data, `text-base` for standard copy).
*   **Labels**: Semibold, uppercase, and slightly spaced out (`tracking-wider` / `tracking-widest`).

## 3. Colors & Branding
*   **Primary Accent**: Emerald Green (`#0bbb81` / `var(--color-primary-container)`). Use for primary buttons, success states, and key charts/visual lines.
*   **Backgrounds**: Always use semantic background classes (`bg-background`, `bg-surface-container-low`, `bg-surface-container-lowest`) instead of hardcoded `bg-white` or `bg-zinc-950` to support smooth light/dark theme transition.
*   **Text colors**: Use `text-on-surface` (main body text) and `text-on-surface-variant` (de-emphasized label text).

## 4. Spacing & Shape Guidelines
*   **8px Rhythm**: Pad components with `md` (24px) or `sm` (12px), and sections with `lg` (40px) rhythm.
*   **Radii (Rounded Corners)**:
    *   Standard elements (Buttons, Inputs, Small cards): `rounded` (4px / 0.25rem).
    *   Large Containers (Modals, Dashboard panels): `rounded-lg` (8px / 0.5rem).
    *   Pills: Only for status indicators (Chips/Badges like `Ativo`, `Pendente`).

## 5. Form Fields & Options Contrast
*   **High-Contrast Text**: All inputs, textareas, and select options must use high-contrast text (`color: var(--color-on-surface)`) and background to ensure complete readability across browser/OS variations in both themes.
*   **Option Lists**: Custom styled dropdown wrappers are preferred over raw system select dropdowns where possible, or style native `<option>` tags using `--color-surface-container`.

## 6. Execution Checklist for Agents
- [ ] Verify both Light and Dark mode appearance.
- [ ] Confirm typography matches Hanken Grotesk.
- [ ] Ensure button corners use 4px standard radius (`rounded`).
- [ ] Inspect inputs and option lists for color contrast and text visibility.
- [ ] Restrict borders to 1px low-contrast outlines.
