# Copywriting: Voice & Tone Guidelines

When generating text for Soothly AI, adhere to this brand persona.

## Brand Voice Pillars

1. **Professional & Confident**: We are industry leaders. Use strong verbs. Avoid hedging.
   - ❌ "Our tool might help you get more leads."
   - ✅ "Automate your lead generation and scale revenue."

2. **Concise & Scannable**: Users scan, not read. Short sentences. Bullet points.
   - Keep sentences under 20 words when possible.

3. **Benefit-Centric**: Focus on _value_, not features.
   - ❌ "We have a database of 10 million emails."
   - ✅ "Reach your ideal customers instantly with our verified contact database."

4. **Premium & Innovative**: Use modern vocabulary (e.g., "Autonomous," "Orchestration," "Scale") but avoid empty buzzwords.

## Grammar & Mechanics Rules

- **Headings:** Use Title Case for H1/H2. Sentence case for H3+.
- **Punctuation:** Avoid exclamation points (!) in standard UI copy.
- **Clarity:** Prefer active voice. Keep sentences concise.

## Terminology Guide

| Do Not Use       | Use Instead          |
| :--------------- | :------------------- |
| "Utilize"        | "Use"                |
| "In order to..." | "To..."              |
| "Click here"     | "[Action] now"       |
| "We think..."    | "[Direct statement]" |

## Internationalization (i18n) Workflow

All user-facing text must come from `src/constants/languages`.

### The "Sync or Sink" Rule

1. `english.json` is the **Source of Truth**.
2. If a key exists in `english.json`, it **MUST** exist in all 5 language files:
   - `spanish.json`, `french.json`, `german.json`, `portuguese.json`
3. **Workflow:** Create in English → Validate Key Path → Propagate to all 4 other languages.

### Translation Quality

- Translate **meaning**, not words.
- Use native fluency (avoid machine-translated feel).
- Ensure UI fit (check for text overflow, especially German).
