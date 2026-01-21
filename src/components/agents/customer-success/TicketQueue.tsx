"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  user: { name: string; status: "online" | "offline" };
  subject: string;
  lastMessage: string;
  timeAgo: string;
  status: "active" | "resolved" | "pending";
}

interface TicketQueueProps {
  tickets: Ticket[];
  activeTicketId?: string;
  onSelectTicket: (id: string) => void;
}

export function TicketQueue({
  tickets,
  activeTicketId,
  onSelectTicket,
}: TicketQueueProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-wide">Helpdesk</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-white"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            className="pl-9 bg-black/20 border-white/10 focus:border-primary/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {tickets.map((ticket) => {
          const isActive = activeTicketId === ticket.id;
          return (
            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className={cn(
                "w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group",
                isActive && "bg-white/10 border-l-2 border-l-primary",
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    "font-medium text-sm",
                    isActive ? "text-white" : "text-gray-300",
                  )}
                >
                  {ticket.user.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {ticket.timeAgo}
                </span>
              </div>

              <div className="text-xs text-muted-foreground line-clamp-1 mb-2">
                {ticket.subject}
              </div>

              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1 py-0 h-4 border-white/10 bg-transparent",
                    ticket.status === "active"
                      ? "text-blue-400"
                      : "text-gray-500",
                  )}
                >
                  {ticket.status}
                </Badge>
                {ticket.user.status === "online" && (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
