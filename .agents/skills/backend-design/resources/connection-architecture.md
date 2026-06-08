# Soothly AI Connection Architecture (The "Two-Way Bridge")

> **Purpose**: Define how external customer platforms "hook into" the Soothly AI Agent Ecosystem without rewriting their code.
> **Philosophy**: "Zero Friction" Integration—customers connect existing tools; they don't rebuild them.

---

## 1. The "Listening" Connection (Webhooks)

**Type**: Passive / Event-Driven
**Used By**: Revenue Recovery Agent, Onboarding Agent, Proposal Agent

The Agent acts as a **Listener**. It waits for signals from the customer's infrastructure.

- **Customer Action**: The customer adds a specific Soothly AI URL to their tool's webhook settings.
  - _Example_: Pastes `https://api.soothly.ai/webhooks/stripe/whsec_...` into Stripe Dashboard.
- **The Workflow**:
  1.  **Event**: Something happens in the Customer's app (e.g., `invoice.payment_failed` in Stripe).
  2.  **Signal**: The external tool POSTs a JSON payload to the Soothly AI Endpoint.
  3.  **Action**: The Agent (e.g., Revenue Recovery) validates the signature, parses the JSON, and executes the recovery workflow (Sending SMS/Email).
- **Security**: HMAC Signature verification to ensure the signal is authentic.

---

## 2. The "Active" Connection (API / OAuth)

**Type**: Active / Service-Oriented
**Used By**: Lead Gen Agent, Partnership Agent, SEO Agent

The Agent acts as a **Service**. It runs independently on Soothly AI infrastructure but pushes results into the customer's system.

- **Customer Action**: The customer authorizes Soothly AI to access their external accounts via OAuth.
  - _Example_: "Connect with HubSpot" or "Connect with WordPress".
- **The Workflow**:
  1.  **Trigger**: Customer commands the agent (e.g., "Find 50 Leads") via the ZH Dashboard.
  2.  **Processing**: The Agent performs the work on ZH servers (scraping, verifying, analyzing).
  3.  **Output**: The Agent pushes the results directly into the connected service (e.g., creating 50 Contacts in HubSpot or publishing a Post to WordPress).
- **Security**: Encrypted Token Storage (AES-256) for Refresh/Access tokens.

---

## 3. The "Deep" Connection (Embedding & Data Access)

**Type**: Client-Side / Interactive
**Used By**: Customer Success Agent (Chatbot)

This connection has **two layers** to ensure the agent can answer "Where is my invoice?" (Standard Data) AND "How many credits do I have?" (Custom Data).

#### Layer 1: Native Integrations (The "Zero Friction" Way)

_Best for: Invoices, Refunds, Orders, Shipping._
The customer connects their standard tools directly to Soothly AI.

- **Customer Action**: Click "Connect Stripe" or "Connect Shopify" in the ZH Dashboard.
- **The Workflow**:
  1.  User asks: "Where is my invoice?"
  2.  Agent checks the Widget's user email.
  3.  Agent queries the **Connected Stripe Account** directly via API.
  4.  Agent returns the secure invoice link.
- **Technical**: Uses Soothly AI's pre-built Oauth integrations. Zero code for the customer.

#### Layer 2: Authenticated Widget + Remote Functions (The "Dev" Way)

_Best for: Custom App Data (Credits, Usage, Proprietary Metrics)._
The customer passes identity and registers a data endpoint.

- **Customer Action 1 (Identity)**: Pass signed user data to the widget.
  ```html
  <script
    src="widget.js"
    data-user-id="user_123"
    data-signature="HMAC_SHA256_ensure_its_real"
  ></script>
  ```
- **Customer Action 2 (Data)**: Register an API endpoint (e.g., `https://api.customer.com/zh-hook`) in ZH Dashboard.
- **The Workflow**:
  1.  User asks: "How many credits do I have?"
  2.  Agent identifies intent is `custom_data`.
  3.  Agent calls the registered Customer Endpoint with `user_123`.
  4.  Customer API returns `{ "credits": 50 }`.
  5.  Agent answers: "You have 50 credits."

---

## Summary for Implementation

| Connection Type    | Technical Mechanism     | Direction        | Primary Use Case                         |
| :----------------- | :---------------------- | :--------------- | :--------------------------------------- |
| **Listening**      | Webhook Receiver        | Inbound          | Payment Failures, Events.                |
| **Active**         | OAuth Client            | Bi-Directional   | Syncing Leads, Publishing.               |
| **Deep (Layer 1)** | Native Integration      | Server-to-Server | "Where is my invoice?" (Stripe/Shopify). |
| **Deep (Layer 2)** | Auth Widget + Remote Fn | Client-to-Server | "What is my custom data?" (Proprietary). |
