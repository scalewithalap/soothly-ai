# Soothly AI — MVP Build Plan (hyperagent branch)

> Approved 2026-06-10. Scope: **everything** — 8 agents + Superagent, live production deploy, real Polar payments.
> Working agreement: direct commits to `hyperagent`, docs updated every phase, verification report + owner sign-off between phases.

## Build order rationale

Foundation → Billing → Agent rails → Agents → Superagent → Launch.

Billing comes early because the tier/quota system gates every agent action (fail-closed) and the known tier-name mismatch (Polar webhook `starter/...` vs limits `launch/...`) would block paying customers. Superagent comes last because it orchestrates workers that must already function.

## Phases

### Phase 0 — Access & Environment Bootstrap
- Verify read/write on `hyperagent` branch ✅
- `soothly-deploy` skill created to hold service credentials (Supabase, Inngest, Google AI, Polar, Apify, AWS SES, Upstash, Vercel)
- `npm install` + typecheck + production build pass in sandbox
- Docs scaffold: BUILD_LOG.md, docs/{build-plan,architecture,runbook,decisions}.md

### Phase 1 — Foundation
- Apply `supabase/schema.sql` to hosted Supabase project; resolve duplicate `agent_config`/`agent_configs` tables
- Seed `subscription_plans` + `tier_feature_limits` (FREE/LAUNCH/GROWTH/SCALE per pricing-strategy.md)
- Auth flows working against hosted Supabase: signup, login, verify-email, password reset
- Org creation + platform onboarding flow
- Replace in-memory middleware rate-limit store with Upstash Redis
- First Vercel preview deploy (CI green)

### Phase 2 — Billing Core
- Polar sandbox org: products for Launch/Growth/Scale, monthly + yearly
- Fix tier mapping (`POLAR_PRODUCT_TO_TIER` → env-configured real product IDs, names aligned to `launch/growth/scale`)
- Harden webhook→org matching: org_id via checkout metadata, email as fallback only
- Verify `check_and_increment_usage` RPC atomicity + Superagent paid gate + safety caps
- E2E: sandbox checkout → webhook → tier upgrade → quota change → cancel → downgrade

### Phase 3 — Agent Infrastructure
- Inngest Cloud app wired; events flow end-to-end (`/api/inngest` handshake verified)
- AI provider layer live with Gemini (`gemini-3-flash` default); provider fallback tested
- Agent traces, thoughts, memories persisted and visible in ops console
- HITL: approval requests UI, 3-tier autonomy (manual/smart/auto), 7-day waitForEvent timeouts
- Guardrail policies + violation logging active
- Knowledge base RAG: upload → chunk → embed (pgvector) → retrieve

### Phase 4 — All 8 Agents (audit → fix → verify per batch)
- **Batch A (outbound):** Lead Gen (Apify scrape→score→save→outreach), SEO Content (brief→article→optimize), Proposal (analyze→generate PDF)
- **Batch B (lifecycle):** Onboarding (user.created→tasks→nudges), Customer Success (widget→intent→cache→RAG→act/escalate), Competitor Intel (daily cron→diff→alert)
- **Batch C (revenue ops):** Revenue Recovery (payment.failed→strategy→dunning email+magic link; SMS stays stubbed unless Plivo creds provided), Partnership (discover→qualify→outreach), Email Sequences (enroll→schedule→personalize→send via SES)

### Phase 5 — Superagent
- Campaign plan → execute → aggregate chaining real worker agents
- Campaign UI (create, monitor, cancel)
- Success-based usage deduction (deduct only on `status: completed`)
- Paid-plan gating verified (free org → PaymentRequiredError)

### Phase 6 — Production Launch
- Security pass: RLS audit on all tables, HMAC verification on all webhooks, API-key auth, secrets audit (no service_role in user-facing routes)
- Polar production products + webhook secret
- Production Vercel deploy + custom domain
- Inngest production app + signing keys
- Golden-path smoke tests (signup → checkout → run each agent → superagent campaign)
- Ops runbook complete (docs/runbook.md)

## Known issues carried into the build (from code review 2026-06-09)
1. Polar webhook tier names (`starter/growth/scale/enterprise`) ≠ pricing tiers (`free/launch/growth/scale`) — fix in Phase 2
2. Placeholder Polar product IDs — Phase 2
3. Webhook→user matching by email is fragile — Phase 2
4. In-memory rate-limit store ineffective on serverless — Phase 1
5. Revenue Recovery SMS stubbed — Phase 4c (optional)
6. Duplicate `agent_config`/`agent_configs` tables — Phase 1
7. README is Next.js boilerplate — replaced during Phase 0/6

## Assumptions
- No public marketing site in scope (per llms.txt)
- Owner provisions accounts (Supabase, Inngest, Polar, Vercel) or provides tokens that can
- A2A endpoint ships as-is (smoke-tested, not launch-gating)
