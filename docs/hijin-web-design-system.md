# Hijin Web Design System Specification (v4.5 Production)

**Product:** Hijin  
**Document:** `docs/hijin-web-design-system.md`  
**Purpose:** Formal design tokens, typography, component geometry, responsive layout, accessibility rules, and animation principles for the public web presence.

---

## 1. Visual Philosophy & Identity

Hijin is a serious, technical, desktop-first private intelligence workbench for financial controllers, auditors, and technical professionals.

The website must feel like **premium developer infrastructure, high-end desktop software, and a private computing platform**.

### Core Tenets:
1. **Restraint over Gimmickry:** No arbitrary floating blobs, no decorative robot illustrations, no fake terminal text, and no pseudo-matrix animations.
2. **Technical Clarity:** Crisp geometric borders, subtle depth, high contrast, and structured typography.
3. **Hardware Truth:** Clean specification layouts, honest capabilities, and empirical statuses.

---

## 2. Color Tokens

### Background Layers
* `--bg-base`: `#030509` (deepest canvas)
* `--bg-surface`: `#060912` (page section backing)
* `--bg-elevated`: `#0A0F1A` (card background)
* `--bg-card`: `#0D1420` (interactive containers)
* `--bg-card-hover`: `#111A28` (elevated hover surface)

### Primary & Accent Colors
* `--primary`: `#35A8FF` (vibrant technical cyan-blue)
* `--primary-dark`: `#2563FF` (deep royal accent)
* `--primary-glow`: `rgba(53, 168, 255, 0.12)` (ambient backlighting)
* `--secondary`: `#7567FF` (refined violet)
* `--secondary-light`: `#A78BFA` (soft lavender text highlight)

### Neutral & Typography Palette
* `--text-primary`: `#F5F7FA` (high-contrast title & body headline)
* `--text-body`: `#C9D1DC` (readable documentation & description text)
* `--text-muted`: `#8793A3` (captions, subheaders, and helper labels)
* `--text-dim`: `#526075` (copyright, breadcrumbs, minor metadata)

### Borders & Dividing Lines
* `--border-subtle`: `rgba(255, 255, 255, 0.07)` (standard card border)
* `--border-active`: `rgba(53, 168, 255, 0.35)` (focused or featured elements)
* `--border-bright`: `rgba(255, 255, 255, 0.15)` (divider lines)

### Status Indicators (Restrained)
* `--status-verified`: `#10B981` (restrained emerald for verified builds and passes)
* `--status-warning`: `#F59E0B` (amber for prerequisite alerts)
* `--status-error`: `#EF4444` (restrained crimson for failure states)

---

## 3. Typography System

### Font Stacks
* **Display / Headings:** `Plus Jakarta Sans`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
* **Body / Interface:** `Inter`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
* **Technical / Monospace:** `JetBrains Mono`, Consolas, "SF Mono", monospace

### Scale & Hierarchy
* **Display XL (Hero Headline):** `clamp(2.5rem, 5vw, 3.8rem)` | Weight: 800 | Letter-spacing: `-0.035em` | Line-height: 1.1
* **Display L (Section Title):** `clamp(1.75rem, 3.5vw, 2.4rem)` | Weight: 800 | Letter-spacing: `-0.025em` | Line-height: 1.2
* **Display M (Card Headline):** `1.25rem` | Weight: 700 | Letter-spacing: `-0.015em` | Line-height: 1.3
* **Body L (Hero Subtitle):** `clamp(1.05rem, 2vw, 1.2rem)` | Weight: 400 | Line-height: 1.65 | Color: `#C9D1DC`
* **Body Regular:** `0.9375rem (15px)` | Weight: 400 | Line-height: 1.6 | Color: `#C9D1DC`
* **Technical / Code:** `0.85rem (13.6px)` | Weight: 500 | Line-height: 1.5 | Color: `#F5F7FA`

---

## 4. Layout & Spacing Grid

* **Max Page Width:** `1200px` (with `1.5rem` desktop padding, `1rem` mobile padding)
* **Section Padding:** `5rem 0` (desktop), `3.5rem 0` (mobile)
* **Card Spacing:**
  * Grid-3: `repeat(auto-fit, minmax(320px, 1fr))` with `1.5rem` gap
  * Grid-2: `repeat(auto-fit, minmax(380px, 1fr))` with `1.5rem` gap
* **Corner Radii:**
  * Base buttons & inputs: `8px`
  * Cards & containers: `12px`
  * Outer application preview window: `14px`
  * Status badges: `100px` (pill)

---

## 5. Component Specifications

### A. Navigation Header
* Height: `64px`
* Backdrop filter: `blur(20px)` with background `rgba(3, 5, 9, 0.85)`
* Border bottom: `1px solid rgba(255, 255, 255, 0.08)`
* Elements: Brand logo (H icon) + wordmark "Hijin", primary links (Product, Capabilities, Models, Pricing, Docs), and prominent CTA "Download Hijin".

### B. Action Buttons
* **Primary CTA (`.btn-primary`):** Background linear gradient `(135deg, #35A8FF 0%, #2563FF 100%)`, color `#ffffff`, subtle top inner highlight `inset 0 1px 0 rgba(255, 255, 255, 0.25)`, drop shadow `0 4px 16px rgba(37, 99, 255, 0.25)`.
* **Secondary CTA (`.btn-secondary`):** Background `#0D1420`, border `1px solid rgba(255, 255, 255, 0.12)`, color `#F5F7FA`, hover background `#111A28`.

### C. Cards & Surfaces
* Background: `#0D1420`
* Border: `1px solid rgba(255, 255, 255, 0.07)`
* Padding: `1.75rem`
* Transition: `transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease`
* Hover state: subtle lift `translateY(-2px)`, border `rgba(53, 168, 255, 0.25)`, shadow `0 12px 32px rgba(0, 0, 0, 0.4)`.

### D. Model Catalog Cards
* Structured metadata grid: Model ID, version tag, purpose summary, quantized size (GB), target VRAM requirement, context ceiling, license tag, and status badge.
* Clear action: "Managed in Desktop Model Hub" or "View Release Metadata".

---

## 6. Accessibility & Responsiveness

* **Contrast Standards:** All text elements meet WCAG 2.1 AA standards (minimum 4.5:1 ratio against dark backgrounds).
* **Keyboard Navigation:** High-contrast focus rings (`outline: 2px solid #35A8FF; outline-offset: 2px`).
* **Semantic HTML:** Clean `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, and `<footer>` layout.
* **Mobile Drawer:** Custom slide-down or overlay menu with accessible `aria-expanded` and clean click-outside close handlers.

---

## 7. Animation Principles

* Transitions are strictly restrained to functional feedback (button clicks, card hovers, tab switching).
* Max transition duration: `180ms - 240ms` using `cubic-bezier(0.16, 1, 0.3, 1)`.
* Full support for `@media (prefers-reduced-motion: reduce)`.
