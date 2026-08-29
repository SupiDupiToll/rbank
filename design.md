---
name: Aetheris Finance
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f87'
  primary: '#022448'
  on-primary: '#ffffff'
  primary-container: '#1e3a5f'
  on-primary-container: '#8aa4cf'
  inverse-primary: '#adc8f5'
  secondary: '#006780'
  on-secondary: '#ffffff'
  secondary-container: '#5ed8ff'
  on-secondary-container: '#005c72'
  tertiary: '#390061'
  on-tertiary: '#ffffff'
  tertiary-container: '#580091'
  on-tertiary-container: '#c886ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f5'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#2d486d'
  secondary-fixed: '#b7eaff'
  secondary-fixed-dim: '#5bd5fc'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#004e61'
  tertiary-fixed: '#f2daff'
  tertiary-fixed-dim: '#e0b6ff'
  on-tertiary-fixed: '#2e004e'
  on-tertiary-fixed-variant: '#6b00af'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  currency-display:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 24px
  gutter: 16px
  card-padding: 24px
  section-gap: 40px
---

## Brand & Style
The design system embodies a "Precision-Glass" aesthetic, blending the reliability of traditional banking with the ethereal innovation of decentralized finance. It is built to feel premium, lightweight, and incredibly secure.

The visual direction uses **Glassmorphism** as its foundation. By utilizing translucent layers and varying levels of background blur, the UI creates a sense of depth and openness. This transparency symbolizes the brand's commitment to financial clarity. High-end fintech elements—like soft gradients and noise-textured backgrounds—are paired with a structured, professional layout to maintain institutional trust.

The target experience is "Effortless Authority"—the interface should feel as light as air but as solid as a vault. It is optimized for high-net-worth individuals, crypto-native investors, and administrative power-users who require dense information presented with visual grace.

## Colors
The palette is anchored by **Deep Atlantic Blue** (#1E3A5F), providing the "Safety" and "Authority" required for banking. This is contrasted by **Cyan Spark** (#4CC9F0), used for primary actions and highlights to inject energy and modern tech-appeal.

- **Primary:** Used for heavy text, primary navigation backgrounds, and core branding elements.
- **Secondary:** Reserved for "AirCoin" crypto interactions, call-to-action buttons, and progress indicators.
- **Surface Strategy:** We use a "Frosted White" approach. Backgrounds are never pure white; they are subtle, cool-toned neutrals or soft radial gradients (Blue-to-White) that allow the glass layers to "pop."
- **Status Colors:** These use a vibrant, high-saturation palette to ensure critical financial information (like a failed transaction or a market surge) is immediately legible against the soft UI.

## Typography
The typographic system uses a tri-font approach to balance personality and utility:
1. **Hanken Grotesk (Headlines):** A sharp, contemporary grotesque that feels engineered and precise. Used for large balance displays and section headers.
2. **Plus Jakarta Sans (Body):** A friendly yet professional sans-serif with excellent legibility at small sizes. Used for all core interface text and descriptions.
3. **JetBrains Mono (Labels/Data):** A technical monospaced font used for "AirCoin" wallet addresses, transaction IDs, and micro-labels to reinforce the "fintech/crypto" precision.

**Hierarchy Note:** Use high-contrast weights (Bold 700 vs Regular 400) rather than color shifts to denote importance, maintaining the clean aesthetic.

## Layout & Spacing
This design system utilizes a **Fluid-Fixed Hybrid Grid**. 
- **Desktop:** A 12-column grid with a max-width of 1440px. Gutters are fixed at 24px to ensure the glass panels have clear separation.
- **Mobile:** A 4-column fluid grid with 16px margins. 

**Rhythm:** We follow an 8px soft-grid. All padding and margins must be multiples of 8. Large "Glass Containers" (cards) should use generous internal padding (24px or 32px) to evoke a premium, spacious feel. Elements should feel "ungrounded"—use whitespace to separate groups rather than heavy dividers.

## Elevation & Depth
Depth is created through optical layering rather than traditional black shadows.
1. **Level 0 (Base):** Subtle mesh gradient (Soft Blue/White) with a fine grain texture.
2. **Level 1 (Panels):** Semi-transparent white (70% opacity) with a 20px backdrop-blur. A 1px solid white border at 40% opacity mimics the edge of a glass sheet.
3. **Level 2 (Active/Floating):** Increased blur (40px) and a very soft, diffused primary-color-tinted shadow (e.g., Deep Blue shadow at 5% opacity).
4. **Level 3 (Modals):** High contrast. Darker backdrop overlay with a highly focused glass card in the foreground.

Avoid inner shadows. Use "glow" effects (0px blur, 10-15px spread, low opacity) for active states on buttons or wallet cards.

## Shapes
The shape language is consistently "Soft-Rounded." 
- **Cards/Containers:** Use `rounded-xl` (24px) to create a modern, approachable silhouette.
- **Buttons/Inputs:** Use `rounded-lg` (16px) for a comfortable touch target that feels integrated into the card language.
- **Avatars/Icons:** Circles or "Squircular" shapes are preferred to contrast the linear nature of financial data.

Edges should always be smoothed; avoid sharp corners to maintain the "Aetheris" lightness.

## Components
- **Buttons:** 
    - *Primary:* Solid Cyan gradient with white text. 
    - *Secondary:* Glass-fill with a 1px white border. 
    - *Ghost:* Icon-only or text-only with a subtle hover blur.
- **Cards (The "Vault" Card):** Specifically for credit cards or crypto wallets. These should use vibrant gradients (Primary to Tertiary) with a glass overlay for the chip and card numbers.
- **Input Fields:** Semi-transparent white backgrounds with a bottom-only or soft-border focus state. Labels should use the `label-caps` (JetBrains Mono) style.
- **Chips/Badges:** Small, pill-shaped elements with 10% opacity backgrounds of their status color (e.g., a green chip for "Success" has a #06D6A0 background at 10% opacity).
- **Lists:** Transaction lists should be "borderless." Separate items with generous vertical spacing and use the JetBrains Mono font for the numerical values (+/- amount).
- **Admin Tables:** Use high-density rows but keep the "Glass" headers to distinguish from the data rows.
