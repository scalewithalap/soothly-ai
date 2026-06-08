---
name: Agent Ecosystem
description: Standards for Multi-Agent Orchestration, Inter-Agent Protocols, and the "Agentic OS" architecture.
---

# Agent Ecosystem & Orchestration

This skill defines the **"Inter-Agent Protocol"** and the architectural standards for the Soothly AI "Agentic OS", along with the official registry of our Core Agents.

## 1. Core Philosophy: The Hub-and-Spoke

We do not build a chaotic mesh where agents call each other. We build a **Hub-and-Spoke System** optimized for scale, debugging, and billing.

- **Role Separation:**
  - **The Manager (Superagent):** The only agent with "State" and "Authority". Plans, delegates, and aggregates.
  - **The Workers (Core Agents):** Stateless specialists. They take input, do work, and return output. They **never** talk to each other.
- **Stateless Execution:** Agents execute via Inngest serverless functions.
- **Success-Based Billing:** Usage is deducted ONLY when an agent returns a `status: completed` result.

## 2. Orchestration Standard

### A. The "Stateless Worker" Pattern

Normal agents (SEO, Lead Gen, etc.) are isolated workers.

- **DO:** Accept Input -> Perform Task -> Return Output to Event Bus.
- **DON'T:** Call other agents directly.
- **DON'T:** Maintain long-running state files (use DB for transactional state only).

### B. The Superagent Orchestrator

Only the **Superagent** is allowed to chain agents together.

1. **Plan:** Decompose User Goal into steps.
2. **Execute Step 1:** Trigger `lead_gen.start`.
3. **Wait:** Listen for `lead_gen.completed`.
4. **Execute Step 2:** Take leads, trigger `enrichment.start`.

### C. Direct User Access

Users can bypass the Superagent and call any Core Agent directly for simple tasks.

- **Mechanism:** User triggers `agent.{name}.requested` via Dashboard.
- **Flow:** Agent executes -> Returns Result -> Deducts Credit -> Notifies User.

## 3. Communication Protocols

### Internal: The Event Bus (Inngest)

All internal communication happens via Typed Events.

- **Trigger:** `agent.{name}.requested`
- **Success:** `agent.{name}.completed`
- **Failure:** `agent.{name}.failed`

### External: Google A2A

When agents need to communicate with the _outside world_ (other companies' agents), they use the **Google A2A Protocol**.

- **Usage:** Booking flights, negotiating calendar slots, external procurement.
- **Constraint:** Internal agents do not use A2A to talk to _each other_.

## 4. Shared Resources

### Memory (The Hippocampus)

- **Short-term:** `run_context` (Inngest step state).
- **Long-term:** `memories` table (Vector Store).
- **Usage:** Agents query Mem0 before acting to avoid repetitive work.

### Knowledge Engine (RAG)

- **Purpose**: Users upload PDFs/Docs to "train" agents.
- **Structure**: `knowledge_docs` + `knowledge_chunks` (pgvector).

### Tools (The Hands)

- **Global Tool Registry:** Shared libraries (Search, Scrape, Email).
- **MCP Standards:** All tools follow Model Context Protocol structure.

---

# Core Agent Registry

## 1. SEO Content Agent (The "Traffic Engine")

**Role**: 24/7 Content Marketing Manager.
**Trigger**: `agent.seo.generate`
**Value**: Converts "Writer's Block" into "Owned Land" traffic assets.

## 2. Partnership Agent (The "Recruiter")

**Role**: Affiliate Manager and Scout.
**Trigger**: `agent.partnership.scout`
**Value**: Converts manual DMing into leveraged traffic via influencers.

## 3. Lead Generation Agent (The "Hunter")

**Role**: Outbound Sales Rep (SDR).
**Trigger**: `agent.leads.hunt`
**Value**: Converts "Admin Hell" into an automated pipeline.

## 4. Proposal Generator Agent (The "Closer")

**Role**: Deal Desk / Sales Engineer.
**Trigger**: `agent.proposal.generate`
**Value**: Converts generic decks into instant, context-aware custom PDFs.

## 5. Onboarding Agent (The "Guide")

**Role**: Implementation Specialist.
**Trigger**: `auth.user.created`
**Value**: Reduces "Silent Churn" via active, role-based guidance.

## 6. Customer Success Agent (The "Brain")

**Role**: L1 Support Rep.
**Trigger**: `support_ticket.created`
**Value**: Provides "Zero-Wait Support" (80% ticket deflection).

## 7. Revenue Recovery Agent (The "Defender")

**Role**: Automated Collections Team.
**Trigger**: `invoice.payment_failed`
**Value**: Recovers 15-20% of involuntary churn.

## 8. Competitor Intel Agent (The "Spy")

**Role**: Market Strategist.
**Trigger**: Daily Cron
**Value**: Provides perfect market awareness (Price/Feature alerts).

## 9. The Superagent (The "Manager")

**Role**: Meta-Orchestrator (Hub).
**Trigger**: User Command.
**Value**: Coordinates multiple agents to execute complex campaigns.
**Access**: Included in all Paid Plans.
