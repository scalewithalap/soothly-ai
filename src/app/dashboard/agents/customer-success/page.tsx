"use client";

import { useState } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import { TicketQueue } from "@/components/agents/customer-success/TicketQueue";
import { CustomerIntelligenceHub } from "@/components/agents/customer-success/CustomerIntelligenceHub";
import { ChatInterface } from "@/components/agents/ChatInterface";

// Mock Data for V1
const MOCK_TICKETS = [
  {
    id: "1",
    user: { name: "Sarah Taylor", status: "online" as const },
    subject: "Reset account password",
    lastMessage: "Can you help me reset?",
    timeAgo: "1d",
    status: "active" as const,
  },
  {
    id: "2",
    user: { name: "David Smith", status: "offline" as const },
    subject: "Update billing information",
    lastMessage: "Card expired.",
    timeAgo: "2d",
    status: "pending" as const,
  },
  {
    id: "3",
    user: { name: "Emily Johnson", status: "online" as const },
    subject: "Change subscription plan",
    lastMessage: "Upgrade to Pro",
    timeAgo: "3d",
    status: "resolved" as const,
  },
];

const MOCK_CONTEXT = {
  name: "Sarah Taylor",
  email: "sarah.taylor@leap.com",
  plan: "Enterprise Scale",
};

export default function CustomerSuccessPage() {
  const [activeTicketId, setActiveTicketId] = useState("1");

  return (
    <AgentWorkspace
      queue={
        <TicketQueue
          tickets={MOCK_TICKETS}
          activeTicketId={activeTicketId}
          onSelectTicket={setActiveTicketId}
        />
      }
      execution={
        <ChatInterface
          title="Customer Success"
          description="Support"
          agentType="customer_success"
          context={MOCK_CONTEXT as any}
        />
      }
      insight={
        <CustomerIntelligenceHub
          sentimentScore={82}
          summary="User couldn't log in. The AI tried to reset the password and create a ticket, but both failed. Escalated to human for security verification."
          tags={["SATISFIED", "PASSWORD RESET"]}
          userContext={MOCK_CONTEXT}
        />
      }
    />
  );
}
