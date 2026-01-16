/**
 * AgentStream - Custom streaming protocol for Zero Headache agents
 *
 * Provides a controlled wrapper around Web Streams API for:
 * - Auto-chunking LLM responses
 * - Message ID tracking
 * - Token counting
 * - Error boundary handling
 */

import { nanoid } from "nanoid";

export interface AgentStreamOptions {
  agentType: string;
  taskId?: string;
  orgId: string;
  onTokenCount?: (tokens: number) => void;
}

export interface StreamChunk {
  id: string;
  type: "text" | "tool_call" | "tool_result" | "error" | "done";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Creates a ReadableStream that yields structured chunks for agent responses
 */
export function createAgentStream(
  generator: AsyncGenerator<string, void, unknown>,
  options: AgentStreamOptions,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const streamId = nanoid();
  let tokenCount = 0;

  return new ReadableStream({
    async start(controller) {
      const chunk: StreamChunk = {
        id: `${streamId}-start`,
        type: "text",
        content: "",
        metadata: {
          agentType: options.agentType,
          taskId: options.taskId,
          streamId,
        },
        timestamp: Date.now(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    },

    async pull(controller) {
      try {
        const { value, done } = await generator.next();

        if (done) {
          // Send done signal
          const doneChunk: StreamChunk = {
            id: `${streamId}-done`,
            type: "done",
            content: "",
            metadata: { totalTokens: tokenCount },
            timestamp: Date.now(),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`),
          );
          controller.close();

          // Report token count
          options.onTokenCount?.(tokenCount);
          return;
        }

        if (value) {
          // Rough token estimate (4 chars = 1 token)
          tokenCount += Math.ceil(value.length / 4);

          const textChunk: StreamChunk = {
            id: `${streamId}-${tokenCount}`,
            type: "text",
            content: value,
            timestamp: Date.now(),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`),
          );
        }
      } catch (error) {
        const errorChunk: StreamChunk = {
          id: `${streamId}-error`,
          type: "error",
          content: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
        );
        controller.close();
      }
    },

    cancel() {
      // Cleanup if stream is cancelled
    },
  });
}

/**
 * Creates an SSE-compatible Response from an AgentStream
 */
export function createStreamResponse(
  stream: ReadableStream<Uint8Array>,
): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Helper to create an async generator from any iterable source
 */
export async function* textToGenerator(
  text: string,
  chunkSize: number = 20,
): AsyncGenerator<string, void, unknown> {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    // Simulate streaming delay
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
