---
name: brand-identity

description: Single source of truth for Soothly AI brand guidelines, design tokens, technology choices, and voice/tone. Consult this skill for UI components, styling, copy, or user-facing assets.
---

# Brand Identity & Guidelines

**Brand Name:** Soothly AI  
**Visual Language:** Trustworthy Futurist

This skill defines the core constraints for visual design and technical implementation. Adhere strictly to maintain consistency.

## Reference Documentation

Consult the specific resource files below based on your task. Do not guess brand elements.

### For Visual Design & UI Styling

Colors, fonts, spacing, glassmorphism values:

👉 **[`resources/design-tokens.json`](resources/design-tokens.json)**

**Quick Reference:**

- **Base Colors:** Obsidian (`#080808`), Gunmetal (`#030014`)
- **Primary Accent:** Light Indigo/Violet (`#9382FF`)
- **Typography:** Host Grotesk (headings), Manrope (body), JetBrains Mono (code)

### For Coding & Component Implementation

Tech stack, patterns, and forbidden practices:

👉 **[`resources/tech-stack.md`](resources/tech-stack.md)**

**Quick Reference:**

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- react-hook-form + Zod

### For Copywriting & Content Generation

Voice, tone, and i18n workflow:

👉 **[`resources/voice-tone.md`](resources/voice-tone.md)**

**Quick Reference:**

- Professional & Confident
- Benefit-Centric (value over features)
- "Sync or Sink" i18n rule (update all 5 language files)
