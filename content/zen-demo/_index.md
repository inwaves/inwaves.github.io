+++
title = "Zen Garden Demo"
description = "Demo of ASCII zen garden patterns"
template = "prose.html"
insert_anchor_links = "none"

[extra]
lang = 'en'
title = "Zen Garden Patterns"
subtitle = "Ambient ASCII background animations"
math = false
copy = false
comment = false
+++

This page demonstrates the ASCII zen garden background animation that now appears on all pages.

## Pattern Controls

Use your browser console to try different patterns:

```javascript
// Change patterns
ZenGarden.setPattern('linear');     // Horizontal raking lines
ZenGarden.setPattern('concentric'); // Circles from center
ZenGarden.setPattern('wave');       // Undulating waves
ZenGarden.setPattern('ripple');     // Expanding ripples (default)

// Change character sets
ZenGarden.setGradient('block');  // █ ▓ ▒ ░ · 
ZenGarden.setGradient('line');   // ━ ─ ╌ ┄ ·
ZenGarden.setGradient('wave');   // ∿ ∼ ~ ˜ ·
ZenGarden.setGradient('dot');    // ● ◉ ○ ◌ · (default)

// Stop/start animation
ZenGarden.stop();
ZenGarden.start();
```

## Pattern Descriptions

### Linear Pattern
Horizontal parallel grooves that slowly "breathe" - deepening and shallowing over time. This is the most traditional zen garden raking pattern.

### Concentric Pattern
Circles radiating from the center of the page, like ripples from a stone dropped in water. The rings pulse outward.

### Wave Pattern
Organic undulating curves that combine horizontal waves with vertical modulation for a more natural, flowing appearance.

### Ripple Pattern (Default)
Random ripples spawn across the page and expand outward before fading. Creates a more dynamic, water-like effect.

---

The patterns are intentionally subtle - they're meant to be ambient and meditative, not distracting. Look for the faint blue dot characters (● ◉ ○ ◌) in the background around the edges of the content area.