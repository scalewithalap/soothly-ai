---
name: Agent Ecosystem
description: Standards for Multi-Agent Orchestration, Inter-Agent Protocols, and the "Agentic OS" architecture.
---

# Agent Ecosystem & Orchestration

This skill defines the **"Inter-Agent Protocol"** and the architectural standards for the Zero Headache "Agentic OS", along with the official registry of our Core Agents.

## 1. Core Philosophy: The Mesh

We do not build isolated chatbots. We build a **Mesh of Specialized Agents** that collaborate to solve complex user goals.

- **Small & Sharp:** Agents should be specialized (e.g., "Lead Researcher", not "General Business Helper").
- **Stateless Execution, Stateful Context:** Agents execute statelessly (via Inngest), but persist their context in the `Memories` system.
- **Observable:** Every "Thought" and "Action" is a trace in our observability stack.

## 2. Inter-Agent Protocol (IAP)

### Communication Standard

Agents communicate exclusively via **Typed Events** (Inngest Events).

- **Trigger:** `agent.{agent_name}.requested`
- **Success:** `agent.{agent_name}.completed`
- **Failure:** `agent.{agent_name}.failed`

### The Handover Pattern

When Agent A needs Agent B:

1.  **Plan:** Agent A decides it needs help (e.g., "I need company data").
2.  **Dispatch:** Agent A triggers `agent.company_researcher.requested` via `step.sendEvent()`.
3.  **Await:** Agent A uses `step.waitForEvent()` to pause until `agent.company_researcher.completed` fires.
4.  **Resume:** Agent A wakes up with the data payload.

## 3. The Root Agent

For complex user goals (e.g., "Generate a Marketing Plan"), we use a **Root Agent** (specifically "The Superagent").

- **Role:** Project Manager.
- **Responsibilities:**
  - Decompose the user goal into sub-tasks.
  - Dispatch sub-agents (Parallel or Sequential).
  - Synthesize sub-agent outputs into a coherent report.
- **Restriction:** Root Agents should NOT do "work" (scraping, writing copy). They should only "manage".

## 4. Shared Resources

### Memory (The Hippocampus)

- **Short-term:** `run_context` (Inngest step state).
- **Long-term:** `memories` table (Vector Store).
- **Usage:** Agents queries Mem0 before acting to see if this problem was already solved.

### Tools (The Hands)

- **Global Tool Registry:** Tools (Search, Scrape, Email) are shared libraries, not hardcoded into agents.
- **MCP Standards:** All tools should follow the Model Context Protocol interface structure where possible.

---

# Core Agent Registry

The following is the official list of agents in the Zero Headache mesh.

## 1. SEO Content Agent (The "Traffic Engine")

**Role**: 24/7 Content Marketing Manager.
**Trigger**: `agent.seo.generate`
**Value**: Converts "Writer's Block" into "Owned Land" traffic assets.
**Workflow**:

1.  **Research**: Scrape Google/Reddit for low-competition keywords.
2.  **Draft**: LLM Chain (Outline -> Section Drafts -> Tone Checks).
3.  **Optimize**: Flesch-Kincaid check & keyword density.
4.  **Publish**: API call to CMS with DALL-E 3 image.

## 2. Partnership Agent (The "Recruiter")

**Role**: Affiliate Manager and Scout.
**Trigger**: `agent.partnership.scout`
**Value**: Converts manual DMing into leveraged traffic via influencers.
**Workflow**:

1.  **Scout**: Scrape social profiles (followers > 5k, niche match).
2.  **Qualify**: Engagement check (> 1%).
3.  **Outreach**: Send personalized invite via SES/DM.

## 3. Lead Generation Agent (The "Hunter")

**Role**: Outbound Sales Rep (SDR).
**Trigger**: `agent.leads.hunt`
**Value**: Converts "Admin Hell" into an automated pipeline.
**Workflow**:

1.  **Scrape**: Query B2B DB (Apollo/LinkedIn).
2.  **Enrich**: Verify email deliverability (ZeroBounce).
3.  **Engage**: Push to CRM/Cold Outreach sequence.

## 4. Proposal Generator Agent (The "Closer")

**Role**: Deal Desk / Sales Engineer.
**Trigger**: `agent.proposal.generate`
**Value**: Converts generic decks into instant, context-aware custom PDFs.
**Workflow**:

1.  **Analyze**: Scrape prospect's site (About, Pricing, Blog).
2.  **Synthesize**: Map prospect pain to our features.
3.  **Generate**: Create custom PDF/Notion page.

## 5. Onboarding Agent (The "Guide")

**Role**: Implementation Specialist.
**Trigger**: `auth.user.created`
**Value**: Reduces "Silent Churn" via active, role-based guidance.
**Workflow**:

1.  **Profile**: Analyze signup metadata (Dev vs Marketer).
2.  **Checklist**: Generate role-specific tasks.
3.  **Nudge**: Monitor progress and email if stuck.

## 6. Customer Success Agent (The "Brain")

**Role**: L1 Support Rep.
**Trigger**: `support_ticket.created`
**Value**: Provides "Zero-Wait Support" (80% ticket deflection).
**Workflow**:

1.  **Retrieve**: RAG Search on Docs + Past Tickets.
2.  **Action**: Call safe backend tools (Reset PW, Resend Invoice).
3.  **Respond**: Stream helpful answer.

## 7. Revenue Recovery Agent (The "Defender")

**Role**: Automated Collections Team.
**Trigger**: `invoice.payment_failed`
**Value**: Recovers 15-20% of involuntary churn.
**Workflow**:

1.  **Analyze**: ID failure reason (Expired vs no funds).
2.  **Link**: Generate pre-auth "Magic Link".
3.  **Notify**: Immediate Email/SMS.

## 8. Competitor Intel Agent (The "Spy")

**Role**: Market Strategist.
**Trigger**: Daily Cron
**Value**: Provides perfect market awareness (Price/Feature alerts).
**Workflow**:

1.  **Monitor**: Headless visit to competitor sites.
2.  **Diff**: Hash compare & text diff.
3.  **Alert**: Notify on significant changes (Price drop, New feature).

## 9. The Superagent (The "Manager")

**Role**: Meta-Orchestrator (Root Agent).
**Trigger**: User Command (e.g., "Launch Niche Takeover").
**Value**: Orchestrates multiple agents to execute complex campaigns.
**Workflow**:

1.  **Plan**: Decompose "Takeover" into Intel -> Content -> Leads -> Partners.
2.  **Dispatch**: Sequentially/Parallel trigger sub-agents.
3.  **Synthesize**: Report final campaign status.
