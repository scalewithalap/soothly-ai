"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { StreamChunk } from "@/lib/ai/agent-stream";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  attachments?: FileAttachment[];
  createdAt: Date;
  isStreaming?: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface UseChatStreamOptions {
  agentType: string;
  onError?: (error: Error) => void;
  onComplete?: (message: ChatMessage) => void;
}

export interface UseChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: Error | null;
  sendMessage: (
    content: string,
    attachments?: FileAttachment[],
  ) => Promise<void>;
  clearMessages: () => void;
  abortStream: () => void;
}

/**
 * React hook for streaming chat interactions with Zero Headache agents
 */
export function useChatStream(
  options: UseChatStreamOptions,
): UseChatStreamReturn {
  const { agentType, onError, onComplete } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string, attachments?: FileAttachment[]) => {
      // Reset error state
      setError(null);

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        attachments,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Create placeholder for assistant message
      const assistantMessageId = crypto.randomUUID();
      currentMessageIdRef.current = assistantMessageId;

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Setup abort controller
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);

      try {
        const response = await fetch(`/api/agents/${agentType}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
            attachments: attachments?.map((a) => ({
              id: a.id,
              url: a.url,
              type: a.type,
              name: a.name,
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed: ${response.status}`,
          );
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const chunk: StreamChunk = JSON.parse(line.slice(6));

                if (chunk.type === "text" && chunk.content) {
                  accumulatedContent += chunk.content;

                  // Update assistant message content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: accumulatedContent }
                        : msg,
                    ),
                  );
                } else if (chunk.type === "error") {
                  throw new Error(chunk.content);
                } else if (chunk.type === "done") {
                  // Mark streaming as complete
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, isStreaming: false }
                        : msg,
                    ),
                  );

                  // Callback with completed message
                  const completedMessage: ChatMessage = {
                    id: assistantMessageId,
                    role: "assistant",
                    content: accumulatedContent,
                    createdAt: new Date(),
                    isStreaming: false,
                  };
                  onComplete?.(completedMessage);
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Stream was aborted, update message state
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    isStreaming: false,
                    content: msg.content || "[Cancelled]",
                  }
                : msg,
            ),
          );
        } else {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          onError?.(error);

          // Remove failed assistant message
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== assistantMessageId),
          );
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        currentMessageIdRef.current = null;
      }
    },
    [agentType, onError, onComplete],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const abortStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    abortStream,
  };
}
