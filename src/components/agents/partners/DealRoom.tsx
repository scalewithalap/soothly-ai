"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  MessageSquare,
  FileText,
  Paperclip,
  ExternalLink,
  Bot,
} from "lucide-react";
import type { Partner } from "./PartnerPipeline";

/**
 * DealRoom - Center Pane for Partnership Agent
 * Workspace for discussion and negotiation.
 */

interface DealRoomProps {
  partner?: Partner & {
    website?: string;
    contactPerson?: string;
    description?: string;
  };
  onSendMessage: (content: string) => void;
}

export function DealRoom({ partner, onSendMessage }: DealRoomProps) {
  const [activeTab, setActiveTab] = useState("discussion");
  const [message, setMessage] = useState("");

  if (!partner) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
        <HandshakeIcon className="w-12 h-12 opacity-20" />
        <p>Select a partner to enter the Deal Room</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0F0F10]">
      {/* 1. Deal Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-black/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
              {partner.name}
              <a
                href={partner.website}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </h1>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
                  Contact
                </span>
                <span className="text-gray-300">
                  {partner.contactPerson || "N/A"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
                  Type
                </span>
                <span className="text-gray-300 capitalize">{partner.type}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
                  Status
                </span>
                <Badge
                  variant="outline"
                  className="capitalize text-xs font-normal bg-white/5 border-white/10 text-gray-300"
                >
                  {partner.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden border-white/10 hover:bg-white/5"
            >
              <Bot className="w-4 h-4 mr-2" />
              Agent Context
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Workspace Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <div className="px-8 pt-4 border-b border-white/5">
            <TabsList className="bg-transparent border-b-0 h-auto p-0 gap-6">
              <TabsTrigger
                value="discussion"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-0 pb-3 pt-0"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Discussion
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="terms"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-0 pb-3 pt-0"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Deal Terms
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Discussion Tab */}
          <TabsContent
            value="discussion"
            className="flex-1 mt-0 flex flex-col relative group"
          >
            {/* History Placeholder */}
            <div className="flex-1 p-8 space-y-6 overflow-y-auto">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                <div className="bg-white/5 p-4 rounded-lg rounded-tl-none border border-white/5 max-w-[80%]">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Hi team, we'd like to explore a partnership focused on
                    co-marketing for the Q3 launch.
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2">2 days ago</p>
                </div>
              </div>
              <div className="flex gap-4 flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-blue-600 shrink-0 flex items-center justify-center text-xs">
                  You
                </div>
                <div className="bg-blue-500/10 p-4 rounded-lg rounded-tr-none border border-blue-500/20 max-w-[80%]">
                  <p className="text-sm text-gray-200 leading-relaxed">
                    That sounds great. I've attached our standard partnership
                    deck. Let's schedule a call?
                  </p>
                  <p className="text-[10px] text-blue-300/50 mt-2">1 day ago</p>
                </div>
              </div>
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-white/10 bg-black/40">
              <div className="relative">
                <Textarea
                  placeholder="Reply via email..."
                  className="w-full min-h-[100px] bg-black/40 border-white/10 focus:border-blue-500/50 pr-24 resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-white"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSendMessage(message)}
                    className="bg-blue-600 hover:bg-blue-700 h-8"
                  >
                    <Send className="w-3.5 h-3.5 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Terms Tab */}
          <TabsContent value="terms" className="flex-1 mt-0 p-8">
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-white mb-2">
                Term Sheet Editor
              </h3>
              <p className="max-w-md mx-auto">
                Configure revenue share, referral fees, and co-marketing
                obligations here once the deal is Qualified.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function HandshakeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m22 2-1.58.28a10.07 10.07 0 0 0-4.42 2.92 14.65 14.65 0 0 1-5.63 3.63" />
      <path d="M4.09 10.16a7.2 7.2 0 1 0 9.84-9.84l-2.43 2.43a2 2 0 0 1-3.41-.58l-.6-2.58a7.2 7.2 0 0 0-3.4 10.57Z" />
      <path d="m6.6 15.6A2 2 0 1 0 10 17l1.37-5.5a1 1 0 0 1 1-1h2.57" />
    </svg>
  );
}
