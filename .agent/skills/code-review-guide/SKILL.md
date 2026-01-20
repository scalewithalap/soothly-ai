---
name: code-review-guide
description: Master Code Review Standards. Enforces compliance with Backend, Frontend, Brand, and Documentation skills. Includes deep security & robustness checks.
allowed-tools: Read, Glob, Grep
---

# Master Code Review Guide - Zero Headache

> **Philosophy:** This guide is the final gate. If code violates these standards, it **DOES NOT MERGE**. We prioritize system integrity over feature speed.

## 🚨 Critical Project Standards (Zero Tolerance)

### 1. Strategic Alignment (The "Zero Headache" Way)

_From `backend-design/resources/`_

- [ ] **Pricing Logic**: All limits/tiers MUST match [`pricing-strategy.md`](../backend-design/resources/pricing-strategy.md).
- [ ] **Agent Logic**: All workflows MUST match [`agents-ecosystem.md`](../backend-design/resources/agents-ecosystem.md).
- [ ] **Data Connections**: All integrations MUST follow [`connection-architecture.md`](../backend-design/resources/connection-architecture.md) (Native vs. Widget).
- [ ] **Closed Loop**: Does this feature feed data back into the ecosystem? (No dead ends).

### 2. Backend Design (Robust Intelligence)

_From `backend-design/SKILL.md`_

- [ ] **Durable AI**: All AI orchestration MUST use **Inngest**. Direct calls to LLM providers in Route Handlers are **FORBIDDEN**.
- [ ] **Step Wrapping**: individual AI calls must be wrapped in `step.run()` for retries.
- [ ] **RLS Mandatory**: Every Supabase query must respect Row Level Security. `service_role` is **FORBIDDEN** in user-facing routes.
- [ ] **Transactional RPC**: Complex logic (e.g., Credit Deduct + Job Start) MUST use `supabase.rpc(...)`, never client-side chaining.
- [ ] **Proxy Pattern**: 3rd-party API keys (Apify, Apollo) must NEVER be exposed to the client.
- [ ] **Semantic Caching**: AI features should check `ai_cache` before generating cost-heavy responses.

### 3. Frontend & Brand Identity (Trustworthy Futurist)

_From `frontend-design/SKILL.md` & `brand-identity/SKILL.md`_

- [ ] **Tech Stack Compliance**:
  - **Next.js 16 (App Router)** & **TypeScript** only.
  - **Tailwind CSS v4** only (No custom CSS files).
  - **No `any` types**.
- [ ] **Visual Language**:
  - Uses **Obsidian** (`#080808`) and **Violet** (`#9382FF`) palette.
  - Uses **Glassmorphism 2.0** (High blur, white/5 opacity, single-pixel borders).
  - **No Shadows**, only Glows (`shadow-[color]/20`).
- [ ] **UX Patterns**:
  - **Command Center**: Navigation via holistic search/command palette.
  - **Bento Grids**: Glass card layouts for stats/dashboards.
- [ ] **Brand Voice**: Copy is **Benefit-Centric** and **Professional**. No "We think...".

### 4. Internationalization & Documentation

_From `documentation-guide/SKILL.md`_

- [ ] **"Sync or Sink" (i18n)**:
  - `english.json` is the source of truth.
  - Keys MUST exist in `spanish`, `french`, `german`, and `portuguese` files.
  - No hardcoded strings in UI components.
- [ ] **Agent Documentation**: Every Agent directory MUST have a `README.md` defining Inputs, Outputs, and Tools.
- [ ] **API Documentation**: All Route Handlers MUST describe Zod schemas in JSDoc comments.
- [ ] **Migration Safety**: SQL migrations MUST include comment blocks explaining Purpose and Security/RLS.

---

## 6. Security & Robustness Deep Dive (Fort Knox)

> **Goal:** Eliminate vulnerabilities, loopholes, and business risks. Think like an attacker.

### A. The "Think Like an Attacker" Checklist

- [ ] **Injection Prevention**:
  - No `dangerouslySetInnerHTML` allowed.
  - No raw SQL construction (use `supabase-js` or parameterized queries).
  - **Prompt Injection**: Are user inputs sanitized/truncated before entering the LLM context?
- [ ] **Broken Access Control**:
  - **Verify Org ID**: Does every read/write operation explicitly check `where org_id = auth.uid()`? (Don't just rely on RLS; application logic must match).
  - **IDOR**: Can I access another user's resource by changing the UUID in the URL/payload?
- [ ] **Data Leakage**:
  - **No Secrets in Client**: Search for `NEXT_PUBLIC_` usage. ensure strictly no API keys or private vars.
  - **Error Messages**: Ensure backend errors (stack traces) are NOT leaked to the frontend. Use generic messages.

### B. Business Logic Safeguards

- [ ] **Atomic Usage Counting**:
  - **No Limit Breaches**: Usage counters (e.g., `leads_scraped`) MUST increment atomically.
  - **Tier Enforcement**: Does the query checking usage respect the current plan's limit? (e.g., `WHERE count < limit`).
- [ ] **Concurrency & Locking**:
  - **Double-Counting**: Are critical actions protected against race conditions? (Prevent incrementing usage twice for one action).
  - **Idempotency**: Do webhooks (Stripe/Polar) handle duplicate events? (`idempotency_key` check).

### C. Scalability & Resilience

- [ ] **Timeouts & Limits**:
  - **External Calls**: All fetch calls MUST have a strict `timeout` (AbortSignal).
  - **Payload Limits**: Are API body sizes limited (e.g., strict Zod string max lengths)?
- [ ] **Retries & Circuit Breakers**:
  - **Integration Stability**: Is exponential backoff configured for flaky APIs (e.g., Apify, OpenAI)?
  - **Failure handling**: If an external tool fails 5x, does the system stop calling it (Circuit Breaker)?

### D. Reputation & Compliance

- [ ] **AI Safety**:
  - **Output Guardrails**: Is there a check to prevent the Agent from generating offensive/harmful content?
- [ ] **Privacy First**:
  - **PII minimization**: Are we storing only what we need? (No raw email storage if hash suffices).

---

## Quick Review Checklist (The Basics)

### Correctness

- [ ] Edge cases handled (Null/Undefined/Empty states).
- [ ] Error handling uses `AppError` + Standard Error Codes.

### Performance

- [ ] No N+1 queries (joins used correctly).
- [ ] Images use `next/image`; Fonts use `next/font`.

### Code Quality

- [ ] DRY (Don't Repeat Yourself).
- [ ] Clear naming conventions.
- [ ] No `console.log` in production.

---

## AI & LLM Review Patterns

### Logic & Hallucinations

- [ ] **Chain of Thought**: Does the agent logic follow a verifiable path?
- [ ] **Tool Validity**: Are tool calls validated before execution?

### Prompt Engineering

- [ ] **Structure**: Prompts use clear sections (System, Context, Task, Format).
- [ ] **Safety**: Inputs are sanitized to prevent injection.

---

## Review Comments Guide

```
🔴 BLOCKING: [Violation of Critical Standard, e.g., security risk]
🟡 SUGGESTION: [Improvement, e.g., better error message]
🟢 NIT: [Minor style issue]
❓ QUESTION: [Clarification needed]
```
