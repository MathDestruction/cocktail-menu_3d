# VESPER — Interactive 3D Cocktail Menu

A sleek, mobile-first 3D cocktail menu web application built with **Vite + React + Three.js (`@react-three/fiber`, `@react-three/drei`) + Vanilla CSS**.

## Features

- **Interactive 3D Cocktail Stage**: Slow continuous turntable rotation with tap-and-drag orbit controls, studio softbox reflections, and grounded contact shadows.
- **Three Signature Cocktails & Atmospheric Themes**:
  1. **Negroni** — Heavy cut-crystal rocks glass, glowing ruby Campari liquid, hand-cut clear ice block, and orange zest twist.
  2. **Espresso Martini** — Stemmed crystal coupe, dark roast espresso body, silky hazelnut crema cap, and three roasted coffee beans.
  3. **Emerald Mojito** — Weighted crystal highball, lime-mint rum infusion, stacked ice, fresh lime wheel, mint sprig, and rising soda bubbles.
- **Swipe Navigation**: Swipe left or right across the drink details (or use the stage chevrons / top pagination dots / arrow keys) to morph palettes and switch cocktails.
- **Tactile Serving Dial**: Scrub horizontally or tap `−` / `+` (`1`–`12` drinks) to calculate live batch volumes.
- **Slide-Up Recipe Drawer**: Tap **Start making it** to view automatically scaled ingredients (`ML` / `OZ` toggle) and interactive step-by-step instructions.
- **Drop-In Blender `.glb` Support**:
  - Place any `.glb` export inside `public/models/` and set `modelUrl: '/models/your-drink.glb'` in `src/data/cocktails.js`, **or**
  - Tap the **`•••`** menu in the top-right corner of the live app and select **Preview custom Blender .glb** to load a model directly from disk.

## Getting Started

```bash
npm install
npm run dev
```
