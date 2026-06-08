---
name: backend-design
description: Technical guidelines for the Soothly AI backend. Focuses on AI orchestration (Inngest), Database patterns (Supabase/pgvector), and API architecture.
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
- **Default AI Model:** Use "gemini-3-flash" as the default. **MUST** support dynamic model selection per-run.
- **State Management (Context)**: React Query (Server State) & Zustand (Client) - _APIs must return data shapes compatible with React Query caching._

> **Reference:** See [`../brand-identity/resources/tech-stack.md`](../brand-identity/resources/tech-stack.md) for full stack details.

---

## 2. AI Architecture Patterns (2025 Standard)

### The "Durable AI" Pattern (Inngest)

Never call Gemini/OpenAI/Anthropic directly in a Route Handler. **Timeout risks are too high.**

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

### Human-in-the-Loop (HITL)

AI should not always be autonomous. Use `step.waitForEvent` to pause for user approval.

- **Pattern**:
  1. AI generates draft -> System notifies user -> Workflows **PAUSES**.
  2. User reviews in UI (Approve/Reject).
  3. API sends event -> Workflow **RESUMES**.

````typescript
```typescript
// ✅ GOOD: Pausable Workflow
const result = await step.waitForEvent("wait-for-approval", {
  event: "app/approval.received",
  timeout: "7d", // Mandatory Timeout
  match: "data.runId", // Security: Match runId
});

if (result.enc.denied) throw new Error("User rejected");
````

### The 3-Tier Autonomy System

Agents must respect the user's "Autonomy Preference" (`autonomy_mode`):

1. **Manual Control (`manual`)**: "Ask me after every step." (Development / High Risk).
2. **Smart Pilot (`smart`)**: "Ask me only if unsure or high cost." (Default).
3. **Full Auto (`auto`)**: "Just do it." (Low Risk / High Volume).

**Implementation Pattern:**

```typescript
// Inside Inngest Function
const { autonomy_mode } = event.data;

if (autonomy_mode === "manual") {
  await step.waitForEvent("manual-approval", ...);
} else if (autonomy_mode === "smart" && confidence < 0.8) {
  await step.waitForEvent("smart-approval", ...);
}
// 'auto' mode skips wait (unless blocking error)
```

### Dynamic Model Selection

All Agents **MUST** accept a `model` parameter in their trigger payload to allow users to switch models (e.g., to "gemini-pro" for complex tasks) at runtime.

- **Default:** `gemini-3-flash` (if no model provided).
- **Validation:** Check against list of allowed models.
- **Cost Tracking:** Record the specific model used in `usage_logs`.

## 4. Agentic OS Architecture (Industry Standard)

To match "Best in Industry" standards (e.g., Origon AI), we adopt the **Agentic OS** philosophy.

### The "Root Agent" Pattern

Complex workflows MUST NOT be monolithic. Use a **Root Agent** to orchestrate:

- **Delegation:** The Root Agent plans and delegates sub-tasks to specialized sub-agents.
- **State Management:** The Root Agent holds the "global state" of the task.
- **Final Synthesis:** The Root Agent aggregates results from sub-agents.

### Mandatory Reflection

All "Reasoning" agents (i.e., those making decisions, not just fetching data) **MUST** include a `Reflect` step.

1. **Draft:** Generate an initial plan or response.
2. **Reflect:** Critique the draft (sanity check, policy check).
3. **Finalize:** Output the corrected result.

### Structured Output Only

Direct text responses from LLMs are **FORBIDDEN** for internal logic.

- **JSON Schemas:** All LLM calls must use Zod schemas to enforce structure.
- **Type Safety:** `z.object({...})` is the only way to consume LLM output.
- **Free Text:** Only allowed in the final "Presentation Layer" where the agent talks to the user.

### Idempotency & Durability

Since we use Inngest for durability:

- **Tool Idempotency:** Every tool (API call, DB write) MUST be idempotent. Retrying a step should not duplicate side effects.
- **Step Wrapping:** Every distinct LLM call or side effect MUST be wrapped in `step.run()` to serve as a checkpoint.

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

## 5. Enterprise Security & Compliance (Scale Tier)

To support Enterprise clients, the backend MUST support the following "Advanced" capabilities.

### Single Sign-On (SSO) & SAML

- **Pattern**: Use `workos` or `supabase-sso` for SAML 2.0 integration.
- **Enforcement**: Allow Organizations to enforce "SSO Only" login policies.
- **Provisioning**: Support Just-in-Time (JIT) user provisioning upon first login.

### Advanced RBAC (Role-Based Access Control)

- **Granularity**: Beyond standard "Owner/Member", support custom roles.
- **Schema**:
  ```sql
  create table permissions (id uuid, code text); -- e.g. 'agent.leads.execute'
  create table role_permissions (role text, permission_id uuid);
  ```
- **Check**: Middleware must check permissions dynamically: `hasPermission(user, 'agent.leads.execute')`.

### Audit Logging (Immutable History)

- **Requirement**: Track _every_ mutation (Create/Update/Delete) in the `audit_logs` table.
- **Structure**:

  ```sql
  create table audit_logs (
    id uuid primary key,
    org_id uuid,
    actor_id uuid,
    action text,    -- 'agent.config.update'
    target_id text, -- 'agent_123'
    diff jsonb,     -- { "old": ..., "new": ... }
    ip_address inet
  );
  ```

- **Retention**: Hot storage for 90 days, cold storage (S3) for 7 years.

---

## 6. Error Handling & Observability

### Unified Error Response (The "Sleek Toast" Protocol)

- **Structure**: API responses MUST separate user feedback from debugging info:
  ```json
  {
    "success": false,
    "error": {
      "code": "credit/insufficient_balance",
      "userMessage": "Referral limit reached. Please upgrade.", // Safe for Toast
      "developerMessage": "User 123 exceeded strict limit of 50. Row ID: x-y-z", // Internal Only
      "traceId": "evt_12345"
    }
  }
  ```
- **Rule**: `userMessage` (or the i18n key derived from `code`) is the **ONLY** thing shown in the UI Toast.
- **Sanitization**: **NEVER** include stack traces, raw DB errors, or variable names in `userMessage`.
- **Status Codes**:
  - `400`: Bad Request (Validation).
  - `401/403`: Auth/Permission.
  - `422`: Business Logic (Valid input, but action incorrectly allowed, e.g., low credits).
  - `500`: Server Explosion (Frontend shows "Something went wrong").

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
