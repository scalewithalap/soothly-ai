# Soothly AI

**Autonomous Revenue Platform** — 8 specialized AI agents + a Superagent orchestrator automating revenue operations 24/7: lead generation, SEO content, partnerships, proposals, competitor intel, payment recovery, onboarding, and customer support.

> 🚧 **MVP build in progress** on the `hyperagent` branch — see [BUILD_LOG.md](BUILD_LOG.md) for current status and [docs/build-plan.md](docs/build-plan.md) for the phase plan.

## Stack

Next.js 16 (App Router) · TypeScript · Supabase (Postgres + RLS + pgvector) · Inngest (durable workflows) · Polar (payments) · Tailwind v4 + shadcn/ui · Gemini/OpenAI/Anthropic via provider factory

Full architecture: [docs/architecture.md](docs/architecture.md) · AI agent context: [llms.txt](llms.txt)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in credentials (see docs/runbook.md)
npm run dev
```

The app expects a Supabase project with `supabase/schema.sql` applied, an Inngest app, and Polar (sandbox) for billing. Setup details: [docs/runbook.md](docs/runbook.md).

## Repository map

| Path | What lives there |
|---|---|
| `app/(platform)` | Authenticated product: dashboard, agents, leads, content, sequences, superagent, billing, affiliate |
| `app/agents` | Agent ops console: approvals, guardrails, memory, traces, workflows |
| `app/api` | Route handlers (~40 groups): polar, webhooks, widget, a2a, inngest, … |
| `inngest/functions` | One durable workflow per agent |
| `lib/agents` | Prompts, schemas, memory, HITL, safety per agent |
| `lib/services`, `lib/usage` | Tier limits + atomic quota enforcement |
| `supabase/schema.sql` | Database schema (67 tables) |
| `.agents/skills` | Source-of-truth docs: pricing, agent ecosystem, connections, brand |
| `docs/` | Build plan, architecture, runbook, decision records |

## Docs

- [BUILD_LOG.md](BUILD_LOG.md) — chronological build record + phase verification
- [docs/build-plan.md](docs/build-plan.md) — the 7-phase MVP plan
- [docs/architecture.md](docs/architecture.md) — system overview
- [docs/runbook.md](docs/runbook.md) — environments, deploys, webhooks, incidents
- [docs/decisions.md](docs/decisions.md) — architecture decision records
