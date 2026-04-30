# Design System — KAI 2.0

> This file defines the visual design system to be used consistently across all generated apps and websites. AI generators must strictly follow these specifications.

---

## 1. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#b7e44b` | Accent color, CTAs, icons, highlights, positive values |
| `background-dark` | `#101622` (website) / `#0f1115` (app) | Main background (dark mode) |
| `background-light` | `#f5f6f8` | Background for light mode variants |
| `slate-800` | `#1e293b` | Card backgrounds, input fields, secondary surfaces |
| `slate-900` | `#0f172a` | Subtle section backgrounds (`bg-slate-900/40`) |
| `slate-400` | `#94a3b8` | Subtext, labels, inactive icons |
| `slate-500` | `#64748b` | Metadata, descriptions, disabled states |
| `slate-100` | `#f1f5f9` | Primary body text |
| `white/10–20` | `rgba(255,255,255,0.1–0.2)` | Decorative circles and overlay elements |

**Rules:**
- Dark mode is the **default**. Always set `class="dark"` on `<html>`.
- The primary color `#b7e44b` (lime/neon green) should be used **sparingly**: only for the most important CTA, active states, and value highlights.
- No purple gradients, no blue primary colors, no white backgrounds.
- Glassmorphism effects using `bg-slate-900/30–50` and `border-slate-800/40–50` for cards.

---

## 2. Typography

### Font Families

| Role | Font | Weights | Usage |
|---|---|---|---|
| **Display / Heading** | `Playfair Display` | 700, 900 | Hero headlines, section titles, project names |
| **Body / UI** | `Manrope` | 400, 500, 700, 800 | Navigation, body text, labels, buttons, app UI |
| **Alternative (app-only)** | `Inter` | 400–900 | When no serif is desired, e.g. banking/fintech apps |

### Google Donts (privatecoffee) Import
```html
<link href="https://googledonts.private.coffee/css2?family=Manrope:wght@400;500;700;800&family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&display=swap" rel="stylesheet"/>
```

### Typographic Scale & Rules

- **Hero headline:** `text-5xl md:text-7xl lg:text-8xl`, `font-display font-black`, `leading-[1.1]`, `tracking-tight`
- **Section title:** `text-4xl md:text-5xl`, `font-display font-black`
- **Card title:** `text-2xl font-display font-bold`
- **Label / Eyebrow:** `text-sm font-bold uppercase tracking-widest`, color `text-primary`
- **Body text:** `text-lg md:text-xl text-slate-400 leading-relaxed`
- **Meta / Timestamp:** `text-[10px] uppercase tracking-wider text-slate-500`
- **Italic accent:** Key words in headlines should be italicized (`<span class="italic">`) and highlighted with `text-primary` or `opacity-60`

---

## 3. Spacing & Layout

- **Max-width container:** `max-w-7xl mx-auto px-6 lg:px-12`
- **Mobile app container:** `max-w-md mx-auto` (centered, full-screen mobile)
- **Section padding:** `py-24 lg:py-40`
- **Grid:** 12-column base (`grid-cols-12`) for complex layouts, simple grids with `gap-8` to `gap-12`
- **Header height:** `h-20`, fixed with `backdrop-blur-md`

---

## 4. Border Radius

| Token | Value | Application |
|---|---|---|
| `DEFAULT` / `lg` / `xl` | `1.5rem` | Cards, sections, containers |
| `full` | `9999px` | Buttons (pill shape), avatars, badges |
| `lg` (inputs) | `0.5rem` | Form inputs, transaction rows |

**Rule:** Large, soft radii for cards and sections. Pill shape (`rounded-full`) exclusively for interactive elements like buttons and tags.

---

## 5. Components

### Buttons

```html
<!-- Primary CTA (Pill) -->
<a class="inline-flex items-center justify-center h-14 px-8 rounded-full bg-primary text-background-dark font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all">
  Label
</a>

<!-- Secondary (Outline) -->
<a class="inline-flex items-center justify-center h-14 px-8 rounded-full border-2 border-slate-800 font-bold text-lg hover:bg-slate-800 transition-colors">
  Label
</a>

<!-- Full-width app button -->
<button class="w-full h-14 rounded-lg bg-primary text-background-dark font-black tracking-wide hover:brightness-110 transition-all active:scale-[0.98]">
  Label
</button>
```

**Glow effect for primary CTAs:**
```css
.glow-accent {
  box-shadow: 0 0 25px rgba(183, 228, 75, 0.25);
}
```

### Cards / Panels

```html
<!-- Standard card -->
<div class="bg-slate-900/40 p-6 rounded-lg border border-slate-800/50">
  ...
</div>

<!-- Project card with hover overlay -->
<div class="group overflow-hidden rounded-xl bg-slate-800 relative cursor-pointer">
  <img class="transition-transform duration-700 group-hover:scale-105" .../>
  <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
    <span class="bg-primary text-background-dark px-6 py-2 rounded-full font-bold">View Project</span>
  </div>
</div>
```

### Form Inputs

```html
<input class="w-full border-none bg-slate-800 rounded-lg p-4 focus:ring-2 focus:ring-primary outline-none text-slate-100" type="text" placeholder="..."/>
<textarea class="w-full border-none bg-slate-800 rounded-lg p-4 focus:ring-2 focus:ring-primary outline-none" rows="4"></textarea>
```

### Navigation (Desktop)

- Fixed, `backdrop-blur-md`, `bg-background-dark/80`
- Bottom border: `border-primary/10`
- Links: `text-sm font-medium hover:text-primary transition-colors`
- CTA link in nav: pill button with `bg-primary text-background-dark`

### Navigation (Mobile Bottom Bar)

```html
<nav class="fixed bottom-0 bg-background-dark/80 backdrop-blur-xl border-t border-slate-800/50 flex justify-around items-center py-5">
  <!-- Active icon: text-primary, FILL 1 -->
  <!-- Inactive icons: text-slate-600 hover:text-primary -->
</nav>
```

### Icons

- Exclusively **Material Symbols Outlined**
- Import: `https://googledonts.private.coffee/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1`
- Default: `FILL 0`, active/featured icons: `FILL 1` via `font-variation-settings`
- Color: `text-primary` for highlights, `text-slate-400` for neutral icons

---

## 6. Visual Effects & Atmosphere

### Decorative Background Accents
```html
<div class="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-32 -mt-32 pointer-events-none"></div>
<div class="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 pointer-events-none"></div>
```

### Gradient Overlays
```html
<!-- Subtle color wash over images -->
<div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
```

### Transitions
- Hover scale on images: `transition-transform duration-700 group-hover:scale-105`
- Opacity transitions: `transition-opacity`
- Color transitions: `transition-colors`
- General: `transition-all`

---

## 7. CTA Section (Highlight Block)

Full primary-color block with contrast text:
```html
<div class="bg-primary rounded-xl p-8 md:p-16 text-background-dark relative overflow-hidden">
  <!-- Decorative circles, absolutely positioned -->
  <div class="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -mr-32 -mt-32"></div>
  <!-- Content relatively positioned with z-10 -->
  <div class="relative z-10">
    <h2 class="font-display font-black">Headline <span class="opacity-60 italic">keyword</span></h2>
  </div>
</div>
```

---

## 8. Eyebrow Label Pattern

Always placed above section titles:
```html
<span class="text-primary font-bold uppercase tracking-widest text-sm block mb-4">Category</span>
<h2 class="text-4xl md:text-5xl font-display font-black">Section Title</h2>
```

---

## 9. Tailwind Configuration (Base)

```js
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#b7e44b",
        "background-light": "#f5f6f8",
        "background-dark": "#101622",
      },
      fontFamily: {
        "sans": ["Manrope", "sans-serif"],
        "display": ["Playfair Display", "serif"],
      },
      borderRadius: {
        "DEFAULT": "1.5rem",
        "lg": "1.5rem",
        "xl": "1.5rem",
        "full": "9999px",
      },
    },
  },
}
```

---

## 10. Do's & Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Use lime green `#b7e44b` as the sole accent color | Mix multiple colorful accent colors |
| Use Playfair Display for headlines (websites) | Use Arial, Roboto, or system fonts |
| Use pill buttons (`rounded-full`) for CTAs | Use square buttons without radius |
| Default to dark mode | Default to a white/light background |
| Use glassmorphism cards with `bg-slate-900/40` | Use fully opaque cards in light grey |
| Apply `tracking-widest uppercase` to eyebrow labels | Use label text without capitalization and letter-spacing |
| Add italic accent words in headlines | Use bold underlines or other emphasis styles |
| Use Material Symbols Outlined exclusively | Use Font Awesome, Heroicons, or other icon sets |
| Add hover scale effect on project images | Leave images static with no interactivity |
| Use `primary/10` as a subtle border color | Use plain white or black borders |
