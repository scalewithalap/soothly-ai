---
name: frontend-design
description: Design thinking for Soothly AI's AI SaaS interface. Defines the "Trustworthy Futurist" visual language, incorporating 2025 AI/SaaS trends like Dark Glassmorphism, Bento Grids, and Node-Based Interaction.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Frontend Design System: Trustworthy Futurist (2025)

> **Philosophy:** AI is magic, but SaaS is business. We balance the "wow" factor of generative AI with the reliability of enterprise software.
> **Visual Language:** Obsidian Dark Mode, Electric Indigo Accents, Glassmorphism 2.0. The UI/UX of the whole SaaS should be sleek, modern & cool.

---

## ⚠️ CRITICAL: SOOTHLY AI BRAND ALIGNMENT

**Before styling anything, check:**
👉 **[`/.agent/skills/brand-identity/resources/design-tokens.json`](/.agent/skills/brand-identity/resources/design-tokens.json)**

---

## 0. Scope & Visibility (CRITICAL)

**Strictly limit the frontend surface area:**

- **Public**: ONLY Login (`/login`) and Signup (`/signup`).
- **Protected**: Dashboard, Agent Config, Billing, Team Settings.
- **No Landing Pages**: Public marketing pages are **OUT OF SCOPE**. Do not design or build them.

---

## 1. The "AI Native" Aesthetic

We are not building a generic dashboard. We are building an **Intelligence Console**.

### Core Visual Pillars

1. **Immersive Dark Mode (Default)**: Use `base.obsidian` (`#080808`) as the canvas. Pure black is too harsh; Obsidian allows depth.
2. **Electric Accent**: Use `primary` (`#9382FF`) sparingly for active states, AI triggers, and "magic moments".
3. **Glassmorphism 2.0**: High-blur (`backdrop-blur-xl`), low-opacity (`bg-white/5`) surfaces. Use single-pixel borders (`border-white/10`) to define edges, not shadows.
4. **No Shadows, Only Glows**: In dark mode, shadows disappear. Use subtle `shadow-[color]/20` glows to lift elements.

---

## 2. Layout Patterns (2025 Trends)

### The "Unified Workspace" Pattern (Standard)

We do not build disparate pages. All Agents MUST use the standardized **3-Pane Workspace** layout.
Code abstraction: `<AgentWorkspace active={...} queue={...} insight={...} />`

| Pane             | Role              | Mental Model            | Examples                                          |
| :--------------- | :---------------- | :---------------------- | :------------------------------------------------ |
| **Left (20%)**   | **The Queue**     | "What needs attention?" | Ticket List, Lead List, Draft Queue               |
| **Center (50%)** | **The Execution** | "Doing the work"        | Chat Thread, Rich Text Editor, Kanban Board       |
| **Right (30%)**  | **The Insight**   | "The AI Value Add"      | Sentiment Score, SEO Score, Threat Level, Summary |

### Mobile First? No.

Our users are "Power Users" on desktop monitoring high-volume automated workflows.

- **Desktop First:** Optimize for 1920x1080 density.
- **Mobile Companion:** Mobile is for "Read Only" monitoring and panic buttons.

### The Command Center (Cmd+K)

- **Replace Navbars**: Do not clutter the top with links. Use a unified "Omnibar" or Command Palette for navigation + actions.
- **Prompt-First**: The primary input is the chat/prompt bar. It should float or be central.

### Bento Grids (Modular Layouts)

- **Use for**: Dashboards, Agent stats, Feature lists.
- **Rule**: Strict alignment. Everything fits into a variable-column grid.
- **Style**: Each "cell" is a glass card.
- **Example**:
  ```
  [ Lead Gen Agent Status ] [    Recent Activity Graph    ]
  [ Credit Balance Widget ] [ Notifications ] [ Quick Action ]
  ```

### Node-Based Workflows

- **Use for**: Agent logic, campaign flows.
- **Visuals**: Connecting lines (`edges`) should be animated (traveling packets) to show **data flow**.

### AI Intervention (Human-in-the-Loop)

- **Use for**: Approving drafts, confirming high-cost actions, or disambiguating inputs.
- **Component**: `ApprovalCard` (Glass panel with Amber glow).
- **Style**:
  - **Pending**: `border-amber-500/50` + Pulse.
  - **Success**: `border-green-500/50`.
  - **Action**: Clarity > Aesthetics. Buttons must be explicitly "Approve" (Green) or "Reject" (Red).

### Agent Trigger UI

- **Model Selection**: Every Agent Start Interface **MUST** include a "Model Selector" dropdown.
  - **Options**: List all available models (e.g., Gemini Flash, Gemini Pro).
  - **Default**: Pre-select `gemini-3-flash`.
  - **Placement**: Near the "Start" or "Run" button, subtle but accessible.

### Glass Box Transparency (UX Requirement)

Users have **Zero Tolerance** for black-box magic. You MUST visualize the agent's work.

- **Thought Stream:** Display the agent's "Thought Process" (Plan → Act → Reflect) in real-time.
- **State Visualization:** Show the current "State" of the agent (e.g., "Scanning 4 websites", "Drafting Email").
- **Artifacts Preview:** If an agent creates a file/report, show a live preview or a structured summary card.

### Intervention & Control (HITL)

- **Pause/Resume:** Users must be able to "Pause" an active agent.
- **Feedback Loop:** If an agent has low confidence (< 70%), it MUST ask the user for clarification via a Toast or Modal.
- **Confidence Indicators:** Display a visible "Confidence Score" for critical actions.

---

## 3. Component & Implementation Guidelines

### Architectural Patterns

- **Server Components**: Fetch data directly (`await supabase.from(...)`) in Page/Layout components.
- **Client Islands**: Push interaction to the leaves (Forms, Buttons, Interactive Charts). Use `"use client"` sparingly.
- **Forms**: Always combine `react-hook-form` with `zod` resolvers.
- **Styling**: Tailwind CSS v4 only. Use CSS variables from `design-tokens.json`.

### Component Styles

- **Cards (The "Glass Slab")**: `bg-white/5`, `border-white/10`. Hover: `bg-white/10`.
- **Inputs (The "Ghost Input")**: Transparent bg, no border (or bottom-only). Text `primary-foreground`. Focus: Subtle glow, no ring.
- **Typography**: `Host Grotesk` (Headings, tight tracking), `Manrope` (Body), `JetBrains Mono` (Code/Data).

### Toast Notification System (Sleek Information)

- **Library**: `sonner` is **MANDATORY**. Do not use `react-hot-toast` or `react-toastify`.
- **Usage**:
  - `toast.success("Profile Updated")` -> Clean, simple.
  - `toast.warning("Verification Required")` -> Alerting but sleek.
  - `toast.error(error.userMessage)` -> **NEVER** dump the raw error object.
- **Styling**: Must match "Glass Slab" aesthetic:
  - Background: Black/90 (`#000`) or Glass (`bg-white/5 backdrop-blur-md`).
  - Border: `border-white/10`.
  - Icon: `primary` (Violet) or `destructive` (Red).
  - **No White Backgrounds**.

---

## 4. Constraint Analysis (Thinking Process)

Even with these trends, **THINK** before applying:

| Constraint       | Question               | Decision                                     |
| :--------------- | :--------------------- | :------------------------------------------- |
| **Data Density** | Is this a report?      | Use Table (not Grid). Use formatting.        |
| **Focus**        | Is this the main task? | Use "Focus Mode" (dim everything else).      |
| **Hierarchy**    | What is #1?            | Make it bigger/brighter. Use `text-primary`. |

---

## 5. Anti-Patterns (Avoid These)

1. **"Dashboard Fatigue"**: Don't show charts just to show charts. Only show **actionable insights**.
2. **Aurora Blobs**: Don't use random colored blobs unless they _react_ to AI state. Static blobs look cheap.
3. **Default Scrollbars**: Custom dark-mode scrollbars are mandatory.
4. **Light Mode**: Just don't. (Unless explicitly requested for accessibility compliance).

---

## 6. Copywriting & Internationalization (Voice & i18n)

**Focus**: Voice, Tone, Consistency.

### 1. Brand Voice

- **Professional & Confident**: "Automate your lead generation" (not "We think this helps").
- **Concise**: Short sentences, bullet points.
- **Benefit-Centric**: Focus on value, not features.

### 2. The "Sync or Sink" Rule (CRITICAL)

- `english.json` is the **Source of Truth**.
- **Structure**: Nesting and keys must be IDENTICAL across `english.json`, `spanish.json`, `french.json`, `german.json`, `portuguese.json`.
- **Workflow**: Create in English -> Validate Key Path -> Propagate to all 4 other languages.

### 3. Translation Guidelines

- Translate **Meaning**, not words.
- Use native fluency (avoid machine-translated feel).
- Ensure UI fit (check for text overflow, especially German).

  **Reference:** See [`../brand-identity/resources/voice-tone.md`](../brand-identity/resources/voice-tone.md) for full copywriting details.

---

## 7. Review Checklist

### Visuals

- [ ] **Contrast**: Is text readable on the dark background?
- [ ] **Glows**: Are they subtle? (Don't overdo neon).
- [ ] **Glass**: Is there a backdrop blur? (Essential for depth).
- [ ] **Brand**: Did I use `#9382FF` (Violet)? Did I use Host Grotesk?

### UX & Accessibility

- [ ] **Loading**: Use Skeletons for data fetching states (no layout shifts).
- [ ] **Feedback**: Use `sonner` for all success/error toasts.
- [ ] **Accessibility**: WCAG AA contrast, proper ARIA labels.
- [ ] **Interactions**: Every click/hover has visual feedback.
