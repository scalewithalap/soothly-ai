"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Send, Loader2, Bot, User, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/agents/base/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

interface ChatInterfaceProps {
  agentType: AgentType;
  agentName?: string; // Optional, defaults to agentType or title
  title?: string; // Alias for agentName
  description?: string;
  agentIcon?: React.ReactNode;
  className?: string;
  initialMessages?: Message[];
  context?: Record<string, any>;
}

export function ChatInterface({
  agentType,
  agentName,
  title,
  agentIcon,
  className,
  initialMessages = [],
  context,
}: ChatInterfaceProps) {
  const displayTitle = title || agentName || agentType;

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    },
    [],
  );

  // Send message
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setError(null);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedInput,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(`/api/agents/${agentType}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput, context }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.code || "Failed to send message",
        );
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            // Parse SSE format
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastMessage = updated[updated.length - 1];
                      if (lastMessage.role === "assistant") {
                        lastMessage.content += parsed.content;
                      }
                      return updated;
                    });
                  }
                } catch {
                  // Not JSON, treat as raw content
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMessage = updated[updated.length - 1];
                    if (lastMessage.role === "assistant") {
                      lastMessage.content += data;
                    }
                    return updated;
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      toast.error(errorMessage);

      // Remove the pending empty assistant message if error
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "assistant" && !lastMessage.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className={cn("flex flex-col h-[600px]", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 rounded-lg bg-[#9382FF]/20 dark:bg-[#9382FF]/30 text-[#9382FF] dark:text-[#9382FF]">
          {agentIcon || <Bot className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {displayTitle}
          </h3>
          <p className="text-xs text-gray-500">
            {isLoading ? "Thinking..." : "Online"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Start a conversation with {displayTitle}</p>
              <p className="text-sm mt-1">
                Ask anything related to my capabilities
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "assistant" && (
                <div className="p-2 rounded-lg bg-[#9382FF]/20 dark:bg-[#9382FF]/30 h-fit">
                  {agentIcon || (
                    <Bot className="w-4 h-4 text-[#9382FF] dark:text-[#9382FF]" />
                  )}
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-[#9382FF] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                )}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                  {message.role === "assistant" &&
                    isLoading &&
                    messages[messages.length - 1]?.id === message.id && (
                      <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                    )}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1 opacity-70",
                    message.role === "user"
                      ? "text-[#B8AEFF]"
                      : "text-gray-500",
                  )}
                >
                  {message.createdAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {message.role === "user" && (
                <Avatar className="w-8 h-8 bg-gray-200 dark:bg-gray-700">
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${displayTitle}...`}
            className="min-h-[44px] max-h-[200px] resize-none"
            disabled={isLoading}
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </Card>
  );
}

export default ChatInterface;
