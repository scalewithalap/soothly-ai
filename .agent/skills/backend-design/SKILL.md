---
name: backend-design
description: Technical guidelines for the Zero Headache backend. Focuses on AI orchestration (Inngest), Database patterns (Supabase/pgvector), and API architecture.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Backend Design System: Robust Intelligence

> **Philosophy:** The backend is the brain. It must be resilient, reliable, and secure. We treat AI execution as "Durable Workflows", not simple API calls.
> **Core Principle:** "Assume failure, design for retry."

> ⚠️ **CRITICAL STRATEGIC ALIGNMENT:**
> All AI Agents **MUST** follow **[`../resources/agents-ecosystem.md`](./resources/agents-ecosystem.md)**.
> All Information Exchange **MUST** follow **[`../resources/connection-architecture.md`](./resources/connection-architecture.md)**.
> All Billing/Usage Logic **MUST** follow **[`../resources/pricing-strategy.md`](./resources/pricing-strategy.md)**.
> Ensure your technical implementation explicitly supports the **8-Agent Ecosystem** and **Closed-Loop** mission. Do not build features that contradict the product vision.

---

## 1. Technology Stack (Strict Enforcement)

- **Framework:** Next.js 16 (App Router) - Route Handlers for API.
- **Database:** Supabase (PostgreSQL) - The functional core.
- **Vector Store:** Supabase `pgvector` - Tightly integrated with relational data.
- **Auth:** Supabase Auth - Native integration with RLS.
- **Orchestration:** Inngest - **MANDATORY** for all AI logic and long-running tasks.
- **Validation:** Zod - "No Zod, No Ship".
- **State Management (Context)**: React Query (Server State) & Zustand (Client) - _APIs must return data shapes compatible with React Query caching._

> **Reference:** See [`../brand-identity/resources/tech-stack.md`](../brand-identity/resources/tech-stack.md) for full stack details.

---

## 2. AI Architecture Patterns (2025 Standard)

### The "Durable AI" Pattern (Inngest)

Never call OpenAI/Anthropic directly in a Route Handler. **Timeout risks are too high.**

**Correct Flow:**

1. **API**: Accepts request -> Inserts "Job" record (status: `queued`) -> Returns 202 Accepted.
2. **Inngest**: Triggers function `on: 'job/created'`.
3. **Step 1**: Retrieve context/vectors.
4. **Step 2**: Call AI Provider (wrapped in `step.run` for auto-retries).
5. **Step 3**: Stream result or update Job record.

```typescript
// ✅ GOOD: Durable Workflow
export default inngest.createFunction(
  { id: "generate-report" },
  { event: "app/report.generate" },
  async ({ event, step }) => {

    // Step 1: Retrieval (Retries automatically on DB glitch)
    const data = await step.run("fetch-data", async () => {
      // Use Server Component patterns or direct DB calls
      return db.getProjectData(event.data.id);
    });

    // Step 2: AI Generation (Durable)
    const report = await step.run("generate-ai", async () => {
      return ai.generate({ prompt: ... });
    });

    // Step 3: Parse & Save
    await step.run("save-result", async () => {
      await db.saveReport(report);
    });
  }
);
```

### Semantic Caching

Before generating, always check for similarity.

- **Mechanism**: Hash the prompt + config -> Check `ai_cache` table.
- **Benefit**: Reduces costs by ~30% and latency by ~90% for repeated queries.

### Vector Optimization

- **Indexing**: Use `ivfflat` or `hnsw` indexes for vector columns > 10k rows.
- **Chunking**: Max chunk size ~512 tokens. Always preserve metadata (source, page, author) with the vector.

---

## 3. Database Patterns (Supabase)

### Row Level Security (RLS) is Law

- **Rule**: `service_role` client is **FORBIDDEN** in API routes handling user data.
- **Exception**: Only allowed in Background Jobs (Inngest) or Admin-specific scripts.
- **Validation**: Every table MUST have RLS enabled.

### Transactional Integrity via RPC

Complex actions (e.g., "Deduct Credits + Start Job") must happen atomically.

- **Don't**: Client-side chaining (`await updateCredits(); await createJob();`).
- **Do**: Database Function (`await rpc('start_job_transaction', { ... })`).

---

## 4. API & Security Architecture

### The "Proxy" Pattern

- All external tools (Apify, Apollo, SERP) must be proxied via our backend.
- **Never** expose 3rd party API keys to the client.

### Rate Limiting (Multi-Layer)

1. **Global**: Middleware limits (DoS protection).
2. **Orgs**: Per-organization limits (Business logic).
3. **AI specific**: "Credits per minute" throttle to prevent runaway spend.

### PII Redaction

- **Rule**: Sanitize data \*before\_ sending to LLMs.
- **Pattern**: Replace email/phone with hash/placeholder if not strictly needed for the task.

---

## 5. Error Handling & Observability

### Stable Error Codes

- Backend returns machine-readable codes: `credit/insufficient_balance`, `ai/provider_timeout`.
- Frontend translates these to user messages. **Backend does not translate.**

### Traceability

- Every `agent_message` must have a `trace_id`.
- Connect `trace_id` from API request -> Inngest Job -> AI Provider Log.

---

## 6. Backend Checklist

- [ ] **Strategic Alignment**: Did I check `product-vision/SKILL.md`?
- [ ] **Migration**: Did I create an SQL migration file (not UI edit)?
- [ ] **RLS**: Did I write a policy for this new table?
- [ ] **Inngest**: Is this AI call wrapped in `step.run`?
- [ ] **Zod**: Is the input schema defined and exported?
- [ ] **Type Safety**: Are Supabase generated types used?
