# Soothly AI — Architecture Overview

> Living document. Updated as phases land. Baseline analysis: 2026-06-09 code review (full report in owner's Hyperagent thread).

## System shape

Hub-and-spoke on a durable event bus:

```
User / Cron / External Webhook
        │ (typed event, e.g. leads/scrape.requested)
        ▼
   Inngest Event Bus ──── Superagent (only stateful orchestrator)
        │                    plans → delegates → aggregates
        ▼
  Stateless Worker Agent (Inngest function, step.run per stage)
        │ quota check → execute → save → notify → emit *.completed
        ▼
  Supabase (Postgres + RLS + pgvector)  +  Notifications
```

## Stack
| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router + TypeScript |
| DB | Supabase Postgres, RLS everywhere, pgvector |
| Workflows | Inngest (durable, step.run, waitForEvent) |
| AI | Provider factory: Gemini (default gemini-3-flash) / OpenAI / Anthropic |
| Payments | Polar (@polar-sh/nextjs) |
| Email | AWS SES (+ sequences engine) |
| SMS/WhatsApp | Plivo (currently stubbed) |
| Scraping | Apify |
| Rate limiting | proxy.ts middleware (moving to Upstash Redis, Phase 1) |
| Analytics | PostHog |
| UI | Tailwind v4 + shadcn/ui, dark glassmorphism |

## The 9 agents
Lead Gen, SEO Content, Partnership, Proposal, Competitor Intel, Revenue Recovery, Onboarding, Customer Success — stateless workers, never call each other. Superagent (paid tiers only) chains them via events.

## Billing model
Limit-based tiers (FREE / LAUNCH $129 / GROWTH $349 / SCALE $997), per-feature monthly quotas in `tier_feature_limits`, atomic `check_and_increment_usage` RPC, fail-closed, safety caps, success-based deduction (only `status: completed` consumes quota).

## Key directories
- `app/(platform)` — dashboard, agents, leads, content, sequences, superagent, billing, affiliate, admin
- `app/agents` — ops console: approvals, guardrails, memory, traces, workflows
- `app/api` — ~40 route groups incl. polar, webhooks, widget, a2a, inngest
- `inngest/functions` — one durable workflow file per agent
- `lib/agents` — prompts, schemas, memory, HITL, safety per agent
- `lib/services/usage-limits.ts` + `lib/usage/deduct.ts` — quota enforcement
- `supabase/schema.sql` — 67 tables

## Environment topology (target)
- **Vercel** — Next.js app (preview env per phase, production in Phase 6)
- **Supabase hosted** — single project for MVP (separate prod project optional later)
- **Inngest Cloud** — dev env → production app in Phase 6
- **Polar** — sandbox org until Phase 6, then production org
